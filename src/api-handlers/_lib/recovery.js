// src/api-handlers/_lib/recovery.js
// Account recovery for vendors who have lost access to their account email.
//
// WHY THIS EXISTS: Phase 2 of the OTP plan gates login behind an emailed code.
// Without a recovery path, a vendor who loses their inbox loses their store
// permanently - including a paying one. Docs/OTP-Verification-Plan.md Part H
// lists this as a hard blocker on Phase 2, so it ships FIRST.
//
// THREAT MODEL - this flow can hand over an account, so it is deliberately the
// most conservative code in the repo:
//   - Requests are PUBLIC (a locked-out user cannot authenticate) and therefore
//     rate limited, and the response is always identical so the endpoint cannot
//     be used to enumerate which stores or emails exist.
//   - A request alone grants NOTHING. Only an authenticated admin, after
//     out-of-band identity checks, can issue a recovery token.
//   - Tokens are 32 random bytes, stored only as HMAC(token, OTP_PEPPER), are
//     single-use, and expire in 30 minutes.
//   - Both the OLD email and the store's WhatsApp are notified on approval and
//     on completion, so a legitimate owner can raise an alarm even if an
//     attacker somehow got the request approved.
//   - Every state change is written to auditLogs with the acting admin's uid.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'

export const RECOVERY_COLLECTION = 'recoveryRequests'
export const RECOVERY_TOKEN_TTL_MS = 30 * 60 * 1000

export const RECOVERY_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  // Someone submitted the form but the identifier matched no store - almost
  // always a typo. Recorded so an admin can SEE the attempt and the exact text
  // typed, instead of the vendor insisting they submitted while the tab sits
  // empty. Without this the anti-enumeration response hides real failures.
  NO_MATCH: 'no_match',
}

/** 32 bytes, URL-safe. Far beyond guessing range, unlike a 6-digit OTP. */
export function generateRecoveryToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashRecoveryToken(token) {
  const pepper = process.env.OTP_PEPPER
  if (!pepper) throw new Error('OTP_PEPPER is not configured')
  return crypto.createHmac('sha256', pepper).update(String(token)).digest('hex')
}

export function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a), 'hex')
  const bufB = Buffer.from(String(b), 'hex')
  if (bufA.length !== bufB.length || bufA.length === 0) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export function maskEmail(email) {
  const value = String(email || '')
  const [local, domain] = value.split('@')
  if (!local || !domain) return ''
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`
}

/**
 * Finds the store a recovery request refers to, by handle or email.
 * Returns null when nothing matches - callers MUST still return the same
 * generic response either way, or this becomes an enumeration oracle.
 */
export async function findStoreForRecovery(db, { identifier }) {
  const input = String(identifier || '').trim()
  if (!input) return null

  // Vendors paste their store LINK, not the bare handle - "Your store link or
  // account email" invites exactly that. Matching only the bare handle meant
  // "sellapage.com.ng/denvermall" silently missed, and because the response is
  // intentionally generic to prevent enumeration, the miss was invisible: the
  // vendor saw "request received" and no request was ever created.
  // Strip protocol, www, any host, query/hash, and slashes down to the slug.
  const raw = input.includes('@')
    ? input // emails must not be path-stripped
    : (input
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split(/[?#]/)[0]
        .split('/')
        .filter(Boolean)
        .pop() || input)

  const lower = raw.toLowerCase()

  // Firestore equality is case-SENSITIVE with no normalised lowercase field on
  // /stores, and it cannot do fuzzy matching at all. Recovery is used by people
  // who are already locked out and stressed, and typos are the norm - a real
  // request was lost to `funlola.1999gmail.com` (a missing "@"). Every miss is
  // invisible to the vendor because the response is intentionally generic, so
  // the candidate list is deliberately generous.
  // Single-field equality queries only: no composite index required.
  const candidates = new Set([raw, lower])

  // Spaces: "funmi stores" -> "funmistores"
  const despaced = lower.replace(/\s+/g, '')
  if (despaced) candidates.add(despaced)

  // Missing "@": "funlola.1999gmail.com" -> "funlola.1999@gmail.com".
  // Only reconstructed for well-known mail hosts, so ordinary store handles are
  // never mangled into fake addresses.
  if (!lower.includes('@')) {
    for (const host of ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.co.uk']) {
      if (lower.endsWith(host) && lower.length > host.length) {
        candidates.add(`${lower.slice(0, -host.length)}@${host}`)
      }
    }
  }

  for (const field of ['storeName', 'email']) {
    for (const value of candidates) {
      if (!value) continue
      const snap = await db.collection('stores').where(field, '==', value).limit(1).get()
      if (!snap.empty) {
        const doc = snap.docs[0]
        return { id: doc.id, ...doc.data() }
      }
    }
  }

  return null
}

/**
 * Consumes a recovery token. Returns { ok, request } or { ok:false, error }.
 * Transactional so a token cannot be redeemed twice concurrently.
 */
export async function consumeRecoveryToken(db, rawToken) {
  if (!rawToken) return { ok: false, error: 'invalid_token' }

  let tokenHash
  try {
    tokenHash = hashRecoveryToken(rawToken)
  } catch {
    return { ok: false, error: 'not_configured' }
  }

  // Look up by hash - the raw token is never stored, so this is the only handle.
  const snap = await db
    .collection(RECOVERY_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .limit(1)
    .get()

  if (snap.empty) return { ok: false, error: 'invalid_token' }

  const ref = snap.docs[0].ref

  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref)
    if (!fresh.exists) return { ok: false, error: 'invalid_token' }
    const data = fresh.data()

    if (data.status !== RECOVERY_STATUS.APPROVED) return { ok: false, error: 'not_approved' }
    if (data.tokenUsedAt) return { ok: false, error: 'already_used' }
    if (!data.tokenExpiresAt || Date.now() > data.tokenExpiresAt) {
      tx.update(ref, { status: RECOVERY_STATUS.EXPIRED })
      return { ok: false, error: 'expired' }
    }
    if (!safeEqualHex(data.tokenHash, tokenHash)) return { ok: false, error: 'invalid_token' }

    tx.update(ref, {
      tokenUsedAt: Date.now(),
      status: RECOVERY_STATUS.COMPLETED,
      completedAt: FieldValue.serverTimestamp(),
    })

    return { ok: true, request: { id: ref.id, ...data } }
  })
}

export function recoveryErrorMessage(error) {
  switch (error) {
    case 'invalid_token': return 'This recovery link is not valid. Request a new one.'
    case 'expired': return 'This recovery link has expired. Request a new one.'
    case 'already_used': return 'This recovery link has already been used.'
    case 'not_approved': return 'This request has not been approved yet.'
    case 'not_configured': return 'Recovery is temporarily unavailable.'
    default: return 'Recovery failed. Please contact support.'
  }
}
