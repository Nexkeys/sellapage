// src/api-handlers/_lib/termii.js
// Termii SMS OTP client (Phase 3). Endpoints verified against
// Docs/TERMII_API_DOCS.md:
//   POST /api/sms/otp/send    (:1106) -> generates AND sends a PIN, returns pinId
//   POST /api/sms/otp/verify  (:1324) -> { pinId, verified: "True"|"False", msisdn }
//   GET  /api/sender-id       (:115)  -> [{ sender_id, status, country, ... }]
//
// WHY TERMII GENERATES THE PIN: their Token product enforces pin_attempts and
// pin_time_to_live server-side, so for SMS we store their `pinId` rather than a
// hash of our own code. We still keep our own otpChallenges record binding that
// pinId to uid + purpose + session — Termii verifies THE CODE, only we can
// verify THE CONTEXT. Without that binding a pinId issued for phone_verify
// could be replayed against another purpose.
//
// GRACEFUL DEGRADATION: SMS is only usable once Termii approves an alphanumeric
// sender ID. Until then every call returns a structured "unavailable" result so
// the feature stays dormant instead of throwing at vendors.

const OTP_LENGTH = 6
const OTP_TTL_MINUTES = 5
const OTP_ATTEMPTS = 3

function base() {
  return (process.env.TERMII_BASE_URL || 'https://v4.api.termii.com').replace(/\/+$/, '')
}

/**
 * Termii sender IDs are short alphanumeric NAMES ("Sellapage"), max 11 chars —
 * see the sample responses at Docs/TERMII_API_DOCS.md:110-200 ("Tommy",
 * "WisdomTooth"). A UUID in this variable is almost certainly the application
 * reference from the submission form rather than the sender ID itself, and
 * would be rejected at send time. Detect it in config rather than at 2am.
 */
export function validateSenderId(value) {
  const v = String(value || '').trim()
  if (!v) return { valid: false, reason: 'missing' }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    return { valid: false, reason: 'looks_like_uuid', value: v }
  }
  if (v.length > 11) return { valid: false, reason: 'too_long', value: v }
  if (!/^[A-Za-z0-9 ]+$/.test(v)) return { valid: false, reason: 'invalid_characters', value: v }
  return { valid: true, value: v }
}

/**
 * Normalises a Nigerian number to Termii's expected international format:
 * digits only, country code, no '+' or spaces (e.g. 2348012345678).
 */
export function normalisePhone(input) {
  let digits = String(input || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('234')) {
    // already international
  } else if (digits.startsWith('0')) {
    digits = '234' + digits.slice(1)
  } else if (digits.length === 10) {
    digits = '234' + digits
  }
  // NG mobile numbers are 13 digits in international form (234 + 10).
  if (digits.length < 11 || digits.length > 15) return null
  return digits
}

export function maskPhone(input) {
  const d = String(input || '').replace(/\D/g, '')
  if (d.length < 4) return ''
  return `••• ••• ${d.slice(-4)}`
}

async function termiiPost(path, payload) {
  const key = process.env.TERMII_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  try {
    const res = await fetch(`${base()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, api_key: key }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      // Never log the payload — it contains the destination number.
      console.error(`[termii] ${path} HTTP ${res.status}: ${data?.message || 'error'}`)
      return { ok: false, error: 'termii_error', status: res.status, message: data?.message, data }
    }
    return { ok: true, data }
  } catch (err) {
    console.error(`[termii] ${path} unreachable: ${err.message}`)
    return { ok: false, error: 'unreachable' }
  }
}

export async function fetchSenderIds() {
  const key = process.env.TERMII_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  try {
    const res = await fetch(`${base()}/api/sender-id?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: 'termii_error', status: res.status }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: 'unreachable', message: err.message }
  }
}

/**
 * Is SMS actually usable right now? Config-only (no network call) so it is
 * cheap enough to gate every request. Returns a structured reason so the UI can
 * say something honest rather than failing opaquely.
 */
export function getSmsConfigStatus() {
  if (!process.env.TERMII_API_KEY) {
    return { available: false, reason: 'not_configured', message: 'SMS is not configured.' }
  }
  const sender = validateSenderId(process.env.TERMII_SENDER_ID)
  if (!sender.valid) {
    return {
      available: false,
      reason: `sender_id_${sender.reason}`,
      message: 'Phone verification is not available yet.',
      senderIdIssue: sender.reason,
    }
  }
  return { available: true, senderId: sender.value }
}

/**
 * Sends an OTP. Termii generates the PIN; we only ever hold the returned pinId.
 * @returns {{ok:true,pinId:string}|{ok:false,error:string,message?:string}}
 */
export async function sendSmsOtp({ to, purposeLabel }) {
  const status = getSmsConfigStatus()
  if (!status.available) return { ok: false, error: status.reason, message: status.message }

  const phone = normalisePhone(to)
  if (!phone) return { ok: false, error: 'invalid_phone', message: 'That phone number is not valid.' }

  const placeholder = '< 123456 >'
  const result = await termiiPost('/api/sms/otp/send', {
    message_type: 'NUMERIC',
    to: phone,
    from: status.senderId,
    channel: 'dnd', // NG numbers are widely DND-registered; 'generic' silently drops for them
    pin_attempts: OTP_ATTEMPTS,
    pin_time_to_live: OTP_TTL_MINUTES,
    pin_length: OTP_LENGTH,
    pin_placeholder: placeholder,
    message_text: `Your Sellapage code to ${purposeLabel || 'verify your phone'} is ${placeholder}. It expires in ${OTP_TTL_MINUTES} minutes. Never share it.`,
    pin_type: 'NUMERIC',
  })

  if (!result.ok) {
    // Sender ID rejection is the expected failure until Termii approves it.
    const msg = String(result.message || '').toLowerCase()
    if (msg.includes('sender')) {
      return { ok: false, error: 'sender_id_unapproved', message: 'Phone verification is not available yet.' }
    }
    if (msg.includes('balance') || msg.includes('insufficient')) {
      return { ok: false, error: 'insufficient_balance', message: 'Phone verification is temporarily unavailable.' }
    }
    return { ok: false, error: result.error, message: 'Could not send the code. Please try again.' }
  }

  const pinId = result.data?.pinId || result.data?.pin_id
  if (!pinId) return { ok: false, error: 'no_pin_id', message: 'Could not send the code. Please try again.' }

  return { ok: true, pinId, ttlMinutes: OTP_TTL_MINUTES, attempts: OTP_ATTEMPTS }
}

/**
 * Verifies a code against a pinId. Termii returns `verified` as the STRING
 * "True"/"False" (Docs:1324) — compare loosely and case-insensitively rather
 * than truthiness, or a "False" string would read as verified.
 */
export async function verifySmsOtp({ pinId, pin }) {
  if (!pinId || !pin) return { ok: false, error: 'missing_fields' }

  const result = await termiiPost('/api/sms/otp/verify', { pin_id: pinId, pin: String(pin).trim() })
  if (!result.ok) {
    return { ok: false, error: result.error === 'unreachable' ? 'unreachable' : 'invalid_code' }
  }

  const verified = String(result.data?.verified ?? '').toLowerCase() === 'true'
  return verified ? { ok: true } : { ok: false, error: 'invalid_code' }
}
