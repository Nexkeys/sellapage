// src/api-handlers/otp-send.js
// Issues a step-up OTP for a sensitive action. Phase 1 = email only (Resend).
// See Docs/OTP-Verification-Plan.md and _lib/otp.js for the security model.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, getBearerToken, parseJsonBody } from './_lib/http.js'
import { durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import {
  createEmailChallenge,
  getResendCooldown,
  isValidPurpose,
  logAudit,
  verifyRecaptcha,
} from './_lib/otp.js'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'POST,OPTIONS' })) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = getBearerToken(req)
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const body = parseJsonBody(req) || {}
  const { purpose, recaptchaToken } = body
  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''

  if (!isValidPurpose(purpose)) {
    return res.status(400).json({ error: 'invalid_purpose', message: 'Unknown action.' })
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

    // Fail closed if the pepper is missing rather than writing weak hashes.
    if (!process.env.OTP_PEPPER) {
      console.error('[otp-send] OTP_PEPPER is not configured — refusing to issue codes')
      return res.status(500).json({ error: 'otp_unavailable', message: 'Verification is temporarily unavailable.' })
    }

    // Durable (Firestore-backed) limits — memoryRateLimit is per-instance on
    // Vercel and an attacker hopping instances would bypass it.
    const [perUser, perIp] = await Promise.all([
      durableRateLimit('otp_send_uid', uid, 3, 15 * 60 * 1000),
      durableRateLimit('otp_send_ip', ip, 15, 15 * 60 * 1000),
    ])
    if (!perUser || !perIp) {
      await logAudit(db, { uid, action: 'otp_send', purpose, result: 'rate_limited', ip, userAgent })
      return tooManyRequests(res, 'Too many verification requests. Please wait a few minutes.')
    }

    // 60s resend cooldown, on top of the window limit above.
    const cooldown = await getResendCooldown(db, uid, purpose)
    if (cooldown > 0) {
      return res.status(429).json({
        error: 'cooldown',
        message: `Please wait ${cooldown}s before requesting another code.`,
        retryAfterSeconds: cooldown,
      })
    }

    // Authenticated + rate-limited already, so a missing token is allowed and
    // recorded; an INVALID token fails closed. reCAPTCHA becomes mandatory in
    // Phase 2 where registration/login are genuinely unauthenticated.
    const captcha = await verifyRecaptcha(recaptchaToken, ip)
    if (!captcha.ok) {
      await logAudit(db, { uid, action: 'otp_send', purpose, result: 'captcha_failed', ip, userAgent })
      return res.status(400).json({ error: 'captcha_failed', message: 'Verification check failed. Please try again.' })
    }

    // Destination is the account's own email, read server-side. Never taken
    // from the request body — otherwise a caller could redirect their own
    // step-up code to an inbox they control.
    let email = decoded.email || ''
    let businessName = ''
    const storeSnap = await db.collection('stores').doc(uid).get()
    if (storeSnap.exists) {
      const s = storeSnap.data()
      email = email || s.email || s.ownerEmail || ''
      businessName = s.businessName || ''
    }
    if (!email) {
      return res.status(400).json({ error: 'no_email', message: 'No email address is set on this account.' })
    }

    const result = await createEmailChallenge(db, {
      uid,
      purpose,
      email,
      businessName,
      ip,
      sessionId: body.sessionId || null,
      userAgent,
    })

    await logAudit(db, {
      uid,
      action: 'otp_send',
      purpose,
      result: 'issued',
      ip,
      userAgent,
      meta: { captcha: captcha.reason },
    })

    // Never returns the code, and never the destination in full.
    return res.status(200).json({
      success: true,
      destinationMasked: result.destinationMasked,
      expiresAt: result.expiresAt,
      resendAfterSeconds: result.resendAfterSeconds,
    })
  } catch (err) {
    console.error('[otp-send] Error:', err.message)
    return res.status(500).json({ error: 'server_error', message: 'Could not send the code. Please try again.' })
  }
}
