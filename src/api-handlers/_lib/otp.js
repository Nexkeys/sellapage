// src/api-handlers/_lib/otp.js
// Step-up ("Phase 1") OTP: a fresh emailed code required immediately before a
// small set of high-impact, rarely-performed actions. See
// Docs/OTP-Verification-Plan.md for why this - and NOT an OTP on every login -
// is where the security value is.
//
// SECURITY MODEL
// - Codes are never stored. We keep HMAC-SHA256(code, OTP_PEPPER + salt).
//   A 6-digit code is only 10^6 possibilities, so a plain hash would fall to
//   an offline sweep the moment a Firestore export leaked; the server-side
//   pepper is what makes a leaked export useless on its own.
// - Every challenge is bound to uid + purpose. A code issued for one action can
//   never be redeemed against another, even by the account that requested it.
// - Two-stage single use: `otp-verify` sets consumedAt, then the action handler
//   burns it with redeemedAt. A verified challenge authorises exactly one
//   action, once.
// - Comparison is constant-time (crypto.timingSafeEqual).
//
// Deliberately NOT covered here (per the plan): anything bank- or
// money-related, login, and registration. Those are separate phases/decisions.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { sendEmail, escapeHtml } from './send-email.js'

export const OTP_PURPOSES = {
  STORE_DELETE: 'store_delete',
  STAFF_INVITE: 'staff_invite',
  STAFF_ROLE_CHANGE: 'staff_role_change',
  STAFF_REMOVE: 'staff_remove',
  // Phase 3 - SMS channel. Deliberately NOT tied to any bank/payout flow.
  PHONE_VERIFY: 'phone_verify',
  // Phase 2 - new-device / country-change / stale-verification login challenge.
  LOGIN: 'login',
}

/** Purposes that go over SMS rather than email. */
export const SMS_PURPOSES = new Set([OTP_PURPOSES.PHONE_VERIFY])

const VALID_PURPOSES = new Set(Object.values(OTP_PURPOSES))

// Human-readable labels used in the email body and audit log.
const PURPOSE_LABELS = {
  [OTP_PURPOSES.STORE_DELETE]: 'permanently delete your store',
  [OTP_PURPOSES.STAFF_INVITE]: 'invite a new staff member',
  [OTP_PURPOSES.STAFF_ROLE_CHANGE]: "change a staff member's role",
  [OTP_PURPOSES.STAFF_REMOVE]: 'remove a staff member',
  [OTP_PURPOSES.PHONE_VERIFY]: 'verify your phone number',
  [OTP_PURPOSES.LOGIN]: 'sign in from this device',
}

export function purposeLabel(purpose) {
  return PURPOSE_LABELS[purpose] || 'confirm a sensitive action'
}

export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds
export const OTP_MAX_ATTEMPTS = 5
// How long a verified challenge stays usable before the action must be redone.
export const OTP_PROOF_TTL_MS = 10 * 60 * 1000

const COLLECTION = 'otpChallenges'
const AUDIT_COLLECTION = 'auditLogs'

export function isValidPurpose(purpose) {
  return VALID_PURPOSES.has(purpose)
}

/** 6-digit code from a CSPRNG. Math.random() is not acceptable here. */
function generateCode() {
  // rejection-free: 0..999999 mapped from 4 random bytes, modulo bias is
  // negligible at this range but we mask to keep it uniform anyway.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

function hashCode(code, salt) {
  const pepper = process.env.OTP_PEPPER
  if (!pepper) {
    // Fail closed. Running without a pepper would silently downgrade every
    // stored hash to offline-brute-forceable.
    throw new Error('OTP_PEPPER is not configured')
  }
  return crypto.createHmac('sha256', pepper + salt).update(String(code)).digest('hex')
}

function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a), 'hex')
  const bufB = Buffer.from(String(b), 'hex')
  if (bufA.length !== bufB.length || bufA.length === 0) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function maskEmail(email) {
  const value = String(email || '')
  const [local, domain] = value.split('@')
  if (!local || !domain) return ''
  const head = local.slice(0, 1)
  return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`
}

/**
 * Append-only audit trail. Never throws - a logging failure must not block or
 * roll back the action it is describing.
 */
export async function logAudit(db, { uid, action, purpose, result, ip, userAgent, meta }) {
  try {
    await db.collection(AUDIT_COLLECTION).add({
      uid: uid || null,
      action,
      purpose: purpose || null,
      result, // 'issued' | 'verified' | 'failed' | 'redeemed' | 'rate_limited' | ...
      ip: ip || null,
      userAgent: (userAgent || '').slice(0, 300),
      meta: meta || null,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('[otp] audit write failed:', err.message)
  }
}

/**
 * Google reCAPTCHA verification. Returns { ok, reason }.
 * Phase 1 calls this only when the client supplies a token: these endpoints are
 * already behind Firebase auth + durable rate limiting, so a missing token is
 * allowed but recorded. An INVALID token always fails closed. reCAPTCHA becomes
 * mandatory in Phase 2, where registration/login are genuinely unauthenticated.
 */
export async function verifyRecaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) return { ok: true, reason: 'not_configured' }
  if (!token) return { ok: true, reason: 'no_token' }
  try {
    const params = new URLSearchParams({ secret, response: token })
    if (ip) params.set('remoteip', ip)
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return data.success ? { ok: true, reason: 'verified' } : { ok: false, reason: 'invalid_token' }
  } catch (err) {
    // Network/timeout: don't hard-fail an authenticated user's action on
    // Google being unreachable. Rate limiting still applies.
    console.error('[otp] recaptcha verify failed:', err.message)
    return { ok: true, reason: 'verify_unavailable' }
  }
}

/**
 * Deterministic doc id: exactly one live challenge per uid+purpose.
 *
 * This is a deliberate design choice, not a shortcut. It means:
 *  - "resend invalidates the previous code" is structural, not a cleanup step
 *    that could be missed - a resend overwrites the only record that exists.
 *  - Every lookup is a direct document GET. No multi-field queries anywhere in
 *    this module, so it needs ZERO composite indexes. Missing composite indexes
 *    have caused production outages in this codebase before; this avoids the
 *    class of failure entirely rather than documenting it.
 * Historical records live in auditLogs, which is what history is actually for.
 */
function challengeId(uid, purpose) {
  return `${uid}_${purpose}`
}

/**
 * Seconds remaining before this uid+purpose may request another code, or 0.
 * Single document read - no query, no index.
 */
export async function getResendCooldown(db, uid, purpose) {
  const snap = await db.collection(COLLECTION).doc(challengeId(uid, purpose)).get()
  if (!snap.exists) return 0
  const last = snap.data().createdAtMs || 0
  const elapsed = Date.now() - last
  return elapsed >= OTP_RESEND_COOLDOWN_MS ? 0 : Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000)
}

/**
 * Issues a challenge and emails the code. Any earlier unconsumed challenge for
 * the same uid+purpose is invalidated first - resending must not leave two live
 * codes, which would otherwise double an attacker's guessing surface.
 */
export async function createEmailChallenge(db, { uid, purpose, email, businessName, ip, sessionId, userAgent }) {
  if (!isValidPurpose(purpose)) throw new Error('invalid_purpose')
  if (!email) throw new Error('no_destination')

  const code = generateCode()
  const salt = crypto.randomBytes(16).toString('hex')
  const now = Date.now()

  // Overwrite in place - this IS the invalidation of any previous code for this
  // uid+purpose (see challengeId above). No stale second code can survive.
  const ref = db.collection(COLLECTION).doc(challengeId(uid, purpose))
  await ref.set({
    uid,
    purpose,
    channel: 'email',
    destinationMasked: maskEmail(email),
    codeHash: hashCode(code, salt),
    salt,
    // Reserved for Phase 3 (Termii SMS): that flow stores Termii's pinId here
    // instead of codeHash, but keeps identical uid/purpose/session binding so a
    // pinId issued for one purpose can never be replayed against another.
    termiiPinId: null,
    expiresAt: now + OTP_TTL_MS,
    createdAtMs: now,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    consumedAt: null,
    redeemedAt: null,
    invalidatedAt: null,
    ip: ip || null,
    sessionId: sessionId || null,
    userAgent: (userAgent || '').slice(0, 300),
    createdAt: FieldValue.serverTimestamp(),
  })

  const label = PURPOSE_LABELS[purpose] || 'confirm a sensitive action'
  await sendEmail(
    email,
    `Your Sellapage verification code: ${code}`,
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 20px;font-size:22px;font-weight:800;color:#16a34a;letter-spacing:-0.02em;">sellapage</p>
      <p style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:600;">Hi ${escapeHtml(businessName || 'there')},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
        Use this code to ${escapeHtml(label)}. It expires in 10 minutes and can only be used once.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
        <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:8px;color:#14532d;">${code}</p>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
        <strong>If you did not request this, do not share this code.</strong> Someone may have your password - change it immediately.
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Sellapage will never ask you for this code by phone, WhatsApp or email.</p>
    </div>`,
  )

  return {
    challengeId: ref.id,
    destinationMasked: maskEmail(email),
    expiresAt: now + OTP_TTL_MS,
    resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
  }
}

/**
 * Validates a submitted code. Returns { ok, error, remainingAttempts }.
 * On success the challenge is marked consumed; the action handler must then
 * call redeemProof() to burn it.
 */
export async function verifyChallenge(db, { code, uid, purpose }) {
  if (!code) return { ok: false, error: 'missing_fields' }
  if (!isValidPurpose(purpose)) return { ok: false, error: 'invalid_purpose' }

  // Derived server-side from the authenticated uid - never taken from the
  // request body, so a caller cannot point verification at another record.
  const ref = db.collection(COLLECTION).doc(challengeId(uid, purpose))

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { ok: false, error: 'not_found' }
    const c = snap.data()

    // Bind to the caller and the exact action. Both must match; a code issued
    // for one purpose is never valid for another.
    if (c.uid !== uid) return { ok: false, error: 'not_found' }
    if (c.purpose !== purpose) return { ok: false, error: 'purpose_mismatch' }
    if (c.consumedAt) return { ok: false, error: 'already_used' }
    if (Date.now() > (c.expiresAt || 0)) return { ok: false, error: 'expired' }
    if ((c.attempts || 0) >= (c.maxAttempts || OTP_MAX_ATTEMPTS)) return { ok: false, error: 'too_many_attempts' }

    const expected = c.codeHash
    const actual = hashCode(String(code).trim(), c.salt)

    if (!safeEqualHex(expected, actual)) {
      const attempts = (c.attempts || 0) + 1
      const burned = attempts >= (c.maxAttempts || OTP_MAX_ATTEMPTS)
      tx.update(ref, {
        attempts,
        // Burn the challenge outright once attempts are exhausted, so it can't
        // be ground down further.
        ...(burned ? { consumedAt: Date.now(), invalidatedAt: Date.now() } : {}),
      })
      return {
        ok: false,
        error: burned ? 'too_many_attempts' : 'invalid_code',
        remainingAttempts: Math.max((c.maxAttempts || OTP_MAX_ATTEMPTS) - attempts, 0),
      }
    }

    tx.update(ref, { consumedAt: Date.now(), attempts: (c.attempts || 0) + 1 })
    return { ok: true }
  })
}

/**
 * Called by the action handler itself. Confirms a challenge was verified, for
 * THIS uid and THIS purpose, recently - then burns it so one verification can
 * authorise exactly one action.
 *
 * This is the actual enforcement point: a client-side OTP screen proves
 * nothing, because the Firebase ID token is already valid on its own.
 */
export async function redeemProof(db, { uid, purpose }) {
  if (!isValidPurpose(purpose)) return { ok: false, error: 'invalid_purpose' }

  // Derived from the authenticated uid, same as verifyChallenge.
  const ref = db.collection(COLLECTION).doc(challengeId(uid, purpose))

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { ok: false, error: 'otp_required' }
    const c = snap.data()

    if (c.uid !== uid) return { ok: false, error: 'otp_required' }
    if (c.purpose !== purpose) return { ok: false, error: 'purpose_mismatch' }
    if (!c.consumedAt) return { ok: false, error: 'otp_not_verified' }
    if (c.redeemedAt) return { ok: false, error: 'otp_already_used' }
    if (c.invalidatedAt) return { ok: false, error: 'otp_required' }
    if (Date.now() - c.consumedAt > OTP_PROOF_TTL_MS) return { ok: false, error: 'otp_expired' }

    tx.update(ref, { redeemedAt: Date.now() })
    return { ok: true }
  })
}

/** Maps an internal error code to a message safe to show a user. */
export function otpErrorMessage(error) {
  switch (error) {
    case 'invalid_code': return 'That code is not correct. Please check and try again.'
    case 'expired': return 'That code has expired. Request a new one.'
    case 'too_many_attempts': return 'Too many incorrect attempts. Request a new code.'
    case 'already_used': return 'That code has already been used. Request a new one.'
    case 'otp_not_verified': return 'Please verify the code before continuing.'
    case 'otp_already_used': return 'That verification was already used. Start again.'
    case 'otp_expired': return 'Your verification expired. Please start again.'
    case 'otp_required': return 'This action needs email verification.'
    case 'purpose_mismatch': return 'This code was issued for a different action.'
    default: return 'Verification failed. Please try again.'
  }
}

// ---------------------------------------------------------------------------
// SMS channel (Phase 3 - Termii)
//
// Termii generates and holds the PIN, enforcing attempts and TTL on their side
// (see _lib/termii.js). We therefore store their `pinId` instead of a codeHash,
// but keep the SAME uid + purpose + session binding as the email channel:
// Termii verifies THE CODE, only we can verify THE CONTEXT. Without this a
// pinId issued for phone_verify could be replayed against another purpose.
//
// Everything else - deterministic doc id, single-use consume/redeem, resend
// cooldown, audit logging - is shared with the email flow unchanged.
// ---------------------------------------------------------------------------

/**
 * Creates an SMS challenge by asking Termii to send a PIN, then records the
 * returned pinId against uid+purpose.
 * @returns {{ok:true,destinationMasked,expiresAt,resendAfterSeconds}|{ok:false,error,message}}
 */
export async function createSmsChallenge(db, { uid, purpose, phone, ip, sessionId, userAgent }) {
  if (!isValidPurpose(purpose)) return { ok: false, error: 'invalid_purpose' }
  if (!SMS_PURPOSES.has(purpose)) return { ok: false, error: 'not_an_sms_purpose' }

  // Imported lazily so the email flow never pays for the Termii module and a
  // misconfigured SMS setup cannot break Phase 1.
  const { sendSmsOtp, normalisePhone, maskPhone } = await import('./termii.js')

  const normalised = normalisePhone(phone)
  if (!normalised) {
    return { ok: false, error: 'invalid_phone', message: 'Enter a valid Nigerian phone number.' }
  }

  const sent = await sendSmsOtp({ to: normalised, purposeLabel: purposeLabel(purpose) })
  if (!sent.ok) return { ok: false, error: sent.error, message: sent.message }

  const now = Date.now()
  const ttlMs = (sent.ttlMinutes || 5) * 60 * 1000

  await db.collection(COLLECTION).doc(`${uid}_${purpose}`).set({
    uid,
    purpose,
    channel: 'sms',
    destinationMasked: maskPhone(normalised),
    // Termii holds the code; we hold the context. No codeHash for SMS.
    codeHash: null,
    salt: null,
    termiiPinId: sent.pinId,
    // The number being proven - read back on redeem so a caller cannot verify
    // one number then attach a different one to their account.
    pendingPhone: normalised,
    expiresAt: now + ttlMs,
    createdAtMs: now,
    attempts: 0,
    maxAttempts: sent.attempts || 3,
    consumedAt: null,
    redeemedAt: null,
    invalidatedAt: null,
    ip: ip || null,
    sessionId: sessionId || null,
    userAgent: (userAgent || '').slice(0, 300),
    createdAt: FieldValue.serverTimestamp(),
  })

  return {
    ok: true,
    destinationMasked: maskPhone(normalised),
    expiresAt: now + ttlMs,
    resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
  }
}

/**
 * Verifies an SMS code with Termii, then marks our challenge consumed.
 * Context checks (uid, purpose, expiry, single-use) happen HERE before the code
 * is ever sent to Termii.
 */
export async function verifySmsChallenge(db, { code, uid, purpose }) {
  if (!code) return { ok: false, error: 'missing_fields' }
  if (!isValidPurpose(purpose) || !SMS_PURPOSES.has(purpose)) {
    return { ok: false, error: 'invalid_purpose' }
  }

  const ref = db.collection(COLLECTION).doc(`${uid}_${purpose}`)
  const snap = await ref.get()
  if (!snap.exists) return { ok: false, error: 'not_found' }

  const c = snap.data()
  if (c.uid !== uid) return { ok: false, error: 'not_found' }
  if (c.purpose !== purpose) return { ok: false, error: 'purpose_mismatch' }
  if (c.channel !== 'sms' || !c.termiiPinId) return { ok: false, error: 'not_found' }
  if (c.consumedAt) return { ok: false, error: 'already_used' }
  if (Date.now() > (c.expiresAt || 0)) return { ok: false, error: 'expired' }
  if ((c.attempts || 0) >= (c.maxAttempts || 3)) return { ok: false, error: 'too_many_attempts' }

  const { verifySmsOtp } = await import('./termii.js')
  const result = await verifySmsOtp({ pinId: c.termiiPinId, pin: code })

  if (!result.ok) {
    // A Termii outage must not burn one of the vendor's limited attempts.
    if (result.error === 'unreachable') {
      return { ok: false, error: 'unreachable', message: 'Could not reach the SMS provider. Try again shortly.' }
    }
    const attempts = (c.attempts || 0) + 1
    const burned = attempts >= (c.maxAttempts || 3)
    await ref.update({
      attempts,
      ...(burned ? { consumedAt: Date.now(), invalidatedAt: Date.now() } : {}),
    })
    return {
      ok: false,
      error: burned ? 'too_many_attempts' : 'invalid_code',
      remainingAttempts: Math.max((c.maxAttempts || 3) - attempts, 0),
    }
  }

  await ref.update({ consumedAt: Date.now(), attempts: (c.attempts || 0) + 1 })
  return { ok: true, phone: c.pendingPhone || null }
}

/**
 * Redeem variant that returns the challenge payload, so a handler can read the
 * server-recorded pendingPhone rather than trusting a number from the request.
 */
export async function redeemProofWithData(db, { uid, purpose }) {
  if (!isValidPurpose(purpose)) return { ok: false, error: 'invalid_purpose' }
  const ref = db.collection(COLLECTION).doc(`${uid}_${purpose}`)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { ok: false, error: 'otp_required' }
    const c = snap.data()

    if (c.uid !== uid) return { ok: false, error: 'otp_required' }
    if (c.purpose !== purpose) return { ok: false, error: 'purpose_mismatch' }
    if (!c.consumedAt) return { ok: false, error: 'otp_not_verified' }
    if (c.redeemedAt) return { ok: false, error: 'otp_already_used' }
    if (c.invalidatedAt) return { ok: false, error: 'otp_required' }
    if (Date.now() - c.consumedAt > OTP_PROOF_TTL_MS) return { ok: false, error: 'otp_expired' }

    tx.update(ref, { redeemedAt: Date.now() })
    return { ok: true, data: c }
  })
}
