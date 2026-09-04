// src/api-handlers/otp-verify.js
// Verifies a step-up OTP. On success the challenge is marked consumed; the
// action handler then burns it via redeemProof(). Verifying alone authorises
// nothing - see _lib/otp.js.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, getBearerToken, parseJsonBody } from './_lib/http.js'
import { durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import {
  verifyChallenge,
  verifySmsChallenge,
  isValidPurpose,
  logAudit,
  otpErrorMessage,
  SMS_PURPOSES,
} from './_lib/otp.js'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'POST,OPTIONS' })) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = getBearerToken(req)
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const body = parseJsonBody(req) || {}
  const { purpose, code } = body
  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''

  if (!isValidPurpose(purpose)) {
    return res.status(400).json({ error: 'invalid_purpose', message: 'Unknown action.' })
  }
  if (!code || !/^\d{6}$/.test(String(code).trim())) {
    return res.status(400).json({ error: 'invalid_code', message: otpErrorMessage('invalid_code') })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
    }
    const uid = decoded.uid

    // Guards against distributed guessing across many challenges, on top of the
    // per-challenge attempt counter enforced inside verifyChallenge().
    const [perUser, perIp] = await Promise.all([
      durableRateLimit('otp_verify_uid', uid, 10, 15 * 60 * 1000),
      durableRateLimit('otp_verify_ip', ip, 30, 15 * 60 * 1000),
    ])
    if (!perUser || !perIp) {
      await logAudit(db, { uid, action: 'otp_verify', purpose, result: 'rate_limited', ip, userAgent })
      return tooManyRequests(res, 'Too many attempts. Please wait a few minutes.')
    }

    // SMS codes are verified by Termii against the stored pinId; email codes
    // against our own HMAC. Both apply identical uid/purpose/expiry/single-use
    // context checks BEFORE the code is checked at all.
    const result = SMS_PURPOSES.has(purpose)
      ? await verifySmsChallenge(db, { code: String(code).trim(), uid, purpose })
      : await verifyChallenge(db, { code: String(code).trim(), uid, purpose })

    if (!result.ok) {
      await logAudit(db, {
        uid,
        action: 'otp_verify',
        purpose,
        result: 'failed',
        ip,
        userAgent,
        meta: { reason: result.error },
      })
      return res.status(400).json({
        error: result.error,
        message: otpErrorMessage(result.error),
        ...(typeof result.remainingAttempts === 'number'
          ? { remainingAttempts: result.remainingAttempts }
          : {}),
      })
    }

    await logAudit(db, { uid, action: 'otp_verify', purpose, result: 'verified', ip, userAgent })

    // No token is handed back: the action handler re-derives and burns the
    // challenge from the authenticated uid + purpose, so there is nothing here
    // worth stealing.
    return res.status(200).json({ success: true, verified: true })
  } catch (err) {
    console.error('[otp-verify] Error:', err.message)
    return res.status(500).json({ error: 'server_error', message: 'Verification failed. Please try again.' })
  }
}
