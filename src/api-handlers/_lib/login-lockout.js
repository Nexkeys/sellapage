// src/api-handlers/_lib/login-lockout.js
// Account lockout after repeated failed sign-ins. Wrong password 5 times ->
// the account locks and the only way back is /account-recovery, which a super
// admin reviews (admin-recovery.js).
//
// SCOPE, honestly stated: signInWithEmailAndPassword runs in the BROWSER
// against Firebase directly, so this counter cannot see an attacker who scripts
// Firebase's API rather than using our form. Firebase's own built-in throttling
// (auth/too-many-requests) covers that case. What this adds is an ACCOUNT-level
// lock - Firebase's protection is per-IP and temporary, and never tells the
// owner anything. This does: it stops the account being usable, and it leaves a
// trail the vendor and an admin can both see.
//
// The lock is enforced where it actually bites: session registration. Even if a
// caller obtains a valid Firebase token, a locked account cannot start a usable
// dashboard session.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'

export const MAX_LOGIN_ATTEMPTS = 5
export const WARN_AFTER_ATTEMPTS = 3
// Attempts decay, so a genuine user who mistypes twice today isn't one slip
// away from a lockout next week.
export const ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const COLLECTION = 'loginAttempts'

/**
 * Email is hashed with the pepper before use as a doc id, so this collection
 * never becomes a harvestable list of registered addresses, and the doc id
 * cannot be reversed if an export leaks.
 */
function attemptKey(email) {
  const pepper = process.env.OTP_PEPPER || ''
  return crypto
    .createHmac('sha256', pepper + 'login-attempts')
    .update(String(email || '').trim().toLowerCase())
    .digest('hex')
    .slice(0, 40)
}

/**
 * Records a failed sign-in.
 * @returns {{attempts:number, remaining:number, locked:boolean, warn:boolean}}
 */
export async function recordFailedAttempt(db, { email, ip, userAgent }) {
  const ref = db.collection(COLLECTION).doc(attemptKey(email))

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = Date.now()
    const prev = snap.exists ? snap.data() : null

    // Expired window -> start counting again.
    const withinWindow = prev && now - (prev.firstAttemptAt || 0) < ATTEMPT_WINDOW_MS
    const attempts = (withinWindow ? prev.attempts || 0 : 0) + 1
    const locked = attempts >= MAX_LOGIN_ATTEMPTS

    tx.set(ref, {
      attempts,
      firstAttemptAt: withinWindow ? prev.firstAttemptAt : now,
      lastAttemptAt: now,
      locked,
      lockedAt: locked ? (prev?.lockedAt || now) : null,
      lastIp: ip || null,
      lastUserAgent: (userAgent || '').slice(0, 300),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return {
      attempts,
      remaining: Math.max(MAX_LOGIN_ATTEMPTS - attempts, 0),
      locked,
      warn: attempts >= WARN_AFTER_ATTEMPTS && !locked,
    }
  })
}

/** @returns {{locked:boolean, attempts:number, lockedAt:number|null}} */
export async function getLockState(db, email) {
  try {
    const snap = await db.collection(COLLECTION).doc(attemptKey(email)).get()
    if (!snap.exists) return { locked: false, attempts: 0, lockedAt: null }
    const d = snap.data()

    // A lock does NOT decay - only recovery or a successful sign-in clears it.
    // Letting it expire on its own would defeat the point.
    if (d.locked) return { locked: true, attempts: d.attempts || 0, lockedAt: d.lockedAt || null }

    const stale = Date.now() - (d.firstAttemptAt || 0) >= ATTEMPT_WINDOW_MS
    return { locked: false, attempts: stale ? 0 : (d.attempts || 0), lockedAt: null }
  } catch {
    // Fail open: a Firestore blip must not lock every vendor out.
    return { locked: false, attempts: 0, lockedAt: null }
  }
}

/** Clears the counter and any lock. Called on successful sign-in and on recovery. */
export async function clearAttempts(db, email) {
  try {
    await db.collection(COLLECTION).doc(attemptKey(email)).delete()
  } catch (err) {
    console.error('[login-lockout] clear failed:', err.message)
  }
}
