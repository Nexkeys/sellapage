// src/api-handlers/login-attempt.js
// Public endpoint the login form calls to record a failed sign-in and to check
// whether an account is locked. Unauthenticated by necessity — a failed login
// has no token — so it is rate limited and never confirms whether an account
// exists (see the `status` action).
import { getAdminDb } from './_lib/firebase-admin.js'
import { applyCors, parseJsonBody } from './_lib/http.js'
import { durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { logAudit, verifyRecaptcha } from './_lib/otp.js'
import {
  recordFailedAttempt,
  getLockState,
  clearAttempts,
  MAX_LOGIN_ATTEMPTS,
} from './_lib/login-lockout.js'

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'POST,OPTIONS' })) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''
  const action = req.query.action || 'record'
  const { email, recaptchaToken } = parseJsonBody(req) || {}

  if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid_input' })

  // Pre-signup human check. Called by the register form BEFORE Firebase, so a
  // scripted form-filler is stopped here. An INVALID token fails closed; a
  // MISSING one is allowed and recorded, so a blocked reCAPTCHA never stops a
  // real vendor registering.
  if (action === 'verify-human') {
    const captcha = await verifyRecaptcha(recaptchaToken, clientKey(req))
    if (!captcha.ok) {
      return res.status(400).json({
        success: false,
        error: 'captcha_failed',
        message: "We couldn't verify that you're human. Please refresh and try again.",
      })
    }
    return res.status(200).json({ success: true, reason: captcha.reason })
  }

  try {
    const db = getAdminDb()

    // Stops this endpoint itself being used to lock arbitrary accounts at
    // scale, or as an oracle for probing which addresses exist.
    const allowed = await durableRateLimit('login_attempt_ip', ip, 30, 15 * 60 * 1000)
    if (!allowed) return tooManyRequests(res, 'Too many attempts. Please wait a few minutes.')

    if (action === 'status') {
      const state = await getLockState(db, email)
      // Only ever reports the lock, never whether the account exists — an
      // unknown address returns the same shape as an unlocked one.
      return res.status(200).json({ success: true, locked: state.locked })
    }

    if (action === 'clear') {
      // Called after a SUCCESSFUL sign-in. Safe to expose: knowing the correct
      // password is the proof, and a locked account cannot sign in anyway.
      await clearAttempts(db, email)
      return res.status(200).json({ success: true })
    }

    // default: record a failure
    const result = await recordFailedAttempt(db, { email, ip, userAgent })

    if (result.locked) {
      await logAudit(db, {
        uid: null,
        action: 'login_lockout',
        result: 'locked',
        ip,
        userAgent,
        meta: { attempts: result.attempts },
      })
    }

    return res.status(200).json({
      success: true,
      attempts: result.attempts,
      remaining: result.remaining,
      locked: result.locked,
      warn: result.warn,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
    })
  } catch (err) {
    console.error('[login-attempt] Error:', err.message)
    // Fail open — this must never be the reason someone cannot sign in.
    return res.status(200).json({ success: false, locked: false })
  }
}
