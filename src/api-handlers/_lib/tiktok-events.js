// src/api-handlers/_lib/tiktok-events.js
// TikTok Events API client (server-side conversion tracking).
//
// WHY THIS EXISTS ALONGSIDE THE BROWSER PIXEL
// The browser pixel (src/utils/tiktokPixel.js) is blocked constantly: ad
// blockers, in-app browsers, iOS tracking prevention, and a customer who closes
// the tab the instant Paystack redirects. A purchase that TikTok never hears
// about is a purchase its algorithm cannot learn from, so the vendor keeps
// paying to reach people who only scroll.
//
// This fires the same CompletePayment from the server, at the one moment the
// money is genuinely confirmed: inside the Paystack webhook. Both events carry
// the SAME event_id (the Paystack reference), and TikTok deduplicates on it for
// 48 hours, so the pair collapses into one conversion rather than doubling the
// vendor's reported revenue.
//
// PRIVACY, DELIBERATELY
// TikTok's API accepts email and phone in clear text and hashes them itself.
// We hash before sending anyway. Sending a Nigerian customer's raw email and
// phone number to a third party when SHA-256 is one line away is not a
// defensible trade, and NDPA 2023 responsibility for that customer's data sits
// with Sellapage, not with the vendor who ticked a box. Hashed identifiers
// still let TikTok match a known user; they just cannot be read back.
//
// The access token is a real secret and lives in stores/{id}/private/tiktokAds
// (see _lib/store-secrets.js), never on the world-readable store document.
//
// Nothing in here ever throws. A tracking failure must not roll back, retry, or
// even slow down a confirmed order.
import crypto from 'crypto'

const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

// Kept short on purpose. This runs inside the Paystack webhook, which must
// answer 200 quickly or Paystack retries the whole delivery.
const CALL_TIMEOUT_MS = 8000

/** TikTok pixel ids are 20 uppercase alphanumerics. Same check as the client. */
function isValidPixelId(id) {
  return /^[A-Z0-9]{20}$/.test(String(id || '').trim().toUpperCase())
}

/** SHA-256 hex, TikTok's expected format for hashed identifiers. */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

/**
 * Email must be lowercased and trimmed BEFORE hashing, otherwise the same
 * person hashes to two different values and never matches a TikTok user.
 */
function hashEmail(email) {
  const clean = String(email || '').trim().toLowerCase()
  if (!clean || !clean.includes('@')) return undefined
  return sha256(clean)
}

/**
 * Phone must be E.164 before hashing, for the same matching reason.
 * Nigerian numbers arrive as 0803..., 234803... or +234803... across the
 * codebase, mirroring the normalisation already used for Sendbox and Termii.
 */
function hashPhone(phone) {
  let digits = String(phone || '').replace(/[^\d+]/g, '')
  if (!digits) return undefined
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('0')) digits = `234${digits.slice(1)}`
  else if (!digits.startsWith('234') && digits.length <= 10) digits = `234${digits}`
  if (digits.length < 11) return undefined
  return sha256(`+${digits}`)
}

/**
 * Sends one CompletePayment to the vendor's own TikTok pixel.
 *
 * Returns { sent: boolean, reason?: string }. Callers should not branch on it
 * beyond logging: there is no recovery worth attempting inside a webhook.
 *
 * Exits before any network call when the store has no pixel or no token, so a
 * vendor who never set this up pays nothing at all.
 */
export async function sendTikTokPurchase({
  pixelId,
  accessToken,
  eventId,
  value,
  currency = 'NGN',
  contents = [],
  email,
  phone,
  pageUrl,
  ip,
  userAgent,
}) {
  try {
    const id = String(pixelId || '').trim().toUpperCase()
    const token = String(accessToken || '').trim()
    if (!isValidPixelId(id)) return { sent: false, reason: 'no_pixel' }
    if (!token) return { sent: false, reason: 'no_token' }
    if (!eventId) return { sent: false, reason: 'no_event_id' }

    const user = {}
    const em = hashEmail(email)
    const ph = hashPhone(phone)
    if (em) user.email = em
    if (ph) user.phone = ph
    // ip and user_agent are not hashed: TikTok expects them raw, and they carry
    // no more than the request itself already did.
    if (ip) user.ip = String(ip)
    if (userAgent) user.user_agent = String(userAgent)

    const body = {
      event_source: 'web',
      event_source_id: id,
      data: [
        {
          event: 'CompletePayment',
          // Seconds, not milliseconds. TikTok silently rejects an event that
          // looks like it happened 55,000 years from now.
          event_time: Math.floor(Date.now() / 1000),
          event_id: String(eventId),
          user,
          properties: {
            currency,
            value: Number(value) || 0,
            contents: (contents || []).map((c) => ({
              content_id: String(c.content_id ?? c.id ?? ''),
              content_type: 'product',
              content_name: String(c.content_name ?? c.name ?? ''),
              quantity: Number(c.quantity) || 1,
              price: Number(c.price) || 0,
            })),
          },
          ...(pageUrl ? { page: { url: String(pageUrl) } } : {}),
        },
      ],
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })

    const json = await res.json().catch(() => null)

    // TikTok answers 200 with a non-zero `code` on a business error, so the
    // HTTP status alone is not the success signal.
    if (!res.ok || (json && json.code !== 0)) {
      // Logs the code and message ONLY. Never the token, never the body, which
      // holds hashed customer identifiers.
      console.error(
        '[tiktok-events] CompletePayment rejected',
        { status: res.status, code: json?.code, message: json?.message },
      )
      return { sent: false, reason: 'rejected' }
    }

    return { sent: true }
  } catch (err) {
    // Includes the AbortSignal timeout. A slow TikTok must never hold up a
    // webhook that Paystack is waiting on.
    console.error('[tiktok-events] CompletePayment failed:', err?.name || err?.message || 'unknown')
    return { sent: false, reason: 'error' }
  }
}
