// src/api-handlers/partner-enquiry.js
//
// Public, unauthenticated. Receives the enquiry form on /partners (investors,
// strategic partners, distribution partners, co-founders), stores it for the
// admin panel and emails the founder.
//
// ABUSE MODEL
// An open form that writes to Firestore and sends email is a target for spam,
// for burning the Spark plan's daily write quota, and for using our auto-reply
// to bomb a stranger's inbox. Layered, cheapest first:
//   1. Honeypot field and a minimum fill time. Bots that trip either get the
//      same 200 a person gets, so there is nothing to learn from the response.
//   2. In-memory limit per IP (free).
//   3. Durable limits per IP and globally per day (1 read + 1 write each).
//   4. One enquiry per email address per 24 hours, which also caps how often
//      any single inbox can receive the auto-reply.
//
// DATA
// Stores only what the form asks for, plus the consent wording and time. No IP
// address or user agent is kept: the NDPA asks for data minimisation, and
// nothing here needs them once the rate limit has run.

import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { memoryRateLimit, durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import {
  validateEnquiry,
  labelFor,
  INTEREST_OPTIONS,
  INVESTOR_TYPES,
  TICKET_SIZES,
  SOURCES,
  CONSENT_TEXT,
} from '../utils/partnerEnquiry.js'

const DAY_MS = 24 * 60 * 60 * 1000
// Nobody reads the page and fills six fields in under three seconds.
const MIN_FILL_MS = 3000

const notifyAddress = () => process.env.PARTNERS_NOTIFY_EMAIL || 'sellapage.ng@gmail.com'
const appUrl = () => process.env.APP_URL || 'https://www.sellapage.com.ng'

// Resend takes JSON, so header injection is not possible, but a subject line
// with a newline in it still renders badly in most mail clients.
const oneLine = (v) => String(v || '').replace(/[\r\n]+/g, ' ').trim()

function row(label, value) {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;width:150px;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;">${value}</td>
    </tr>`
}

function founderEmail(v) {
  const interest = labelFor(INTEREST_OPTIONS, v.interest)
  const link = v.link
    ? `<a href="${escapeHtml(v.link)}" style="color:#16a34a;">${escapeHtml(v.link)}</a>`
    : ''
  return `
    <div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;">
      <div style="background:#16a34a;padding:24px;">
        <h1 style="color:#fff;font-size:20px;margin:0;font-weight:bold;">New ${escapeHtml(interest.toLowerCase())} enquiry</h1>
      </div>
      <div style="padding:28px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row('Name', escapeHtml(v.fullName))}
          ${row('Email', `<a href="mailto:${escapeHtml(v.email)}" style="color:#16a34a;">${escapeHtml(v.email)}</a>`)}
          ${row('Phone', escapeHtml(v.phone))}
          ${row('Organisation', escapeHtml(v.organisation))}
          ${row('Interested as', escapeHtml(interest))}
          ${row('Investor type', escapeHtml(labelFor(INVESTOR_TYPES, v.investorType)))}
          ${row('Typical size', escapeHtml(labelFor(TICKET_SIZES, v.ticketSize)))}
          ${row('Link', link)}
          ${row('Heard via', escapeHtml(labelFor(SOURCES, v.source)))}
        </table>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(v.message)}</p>
        </div>
        <a href="${appUrl()}/admin" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Open in admin panel</a>
      </div>
    </div>`
}

function confirmationEmail(v) {
  const firstName = v.fullName.split(/\s+/)[0]
  return `
    <div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;">
      <div style="background:#16a34a;padding:24px;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:bold;">Sellapage</h1>
      </div>
      <div style="padding:32px;color:#111827;">
        <h2 style="font-size:20px;margin:0 0 12px 0;">Thank you, ${escapeHtml(firstName)}</h2>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          We have received your message through the Investors &amp; Partners page. It goes straight to the
          founder, who reads every submission personally and will get back to you by email or WhatsApp.
        </p>
        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          If you did not send this, you can ignore this email. To have your details deleted, reply to
          sellapage.ng@gmail.com.
        </p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;color:#6b7280;font-size:12px;">
        Sellapage · sellapage.com.ng
      </div>
    </div>`
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = {}
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'invalid_json', message: 'Invalid request.' })
  }

  // 1. Bot traps. Same response as a real success.
  const elapsed = Number(body.elapsedMs)
  const trapped = String(body.hp || '').trim() !== ''
  const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS
  if (trapped || tooFast) return res.status(200).json({ success: true })

  // 2. Free per-instance limit.
  const ip = clientKey(req)
  if (!memoryRateLimit('partner-enquiry', ip, 5, 60 * 60 * 1000)) {
    return tooManyRequests(res, 'Too many submissions from this connection. Please try again later.')
  }

  // Validated before any database cost is spent.
  const { value, errors } = validateEnquiry(body)
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'validation', errors, message: Object.values(errors)[0] })
  }

  try {
    // 3. Durable limits.
    const [perIp, global] = await Promise.all([
      durableRateLimit('partner_enquiry_ip', ip, 5, DAY_MS),
      durableRateLimit('partner_enquiry_global', 'all', 200, DAY_MS),
    ])
    if (!perIp || !global) {
      return tooManyRequests(res, 'Too many submissions right now. Please try again later.')
    }

    const db = getAdminDb()
    const col = db.collection('partnerEnquiries')

    // 4. One per email per day. Reported as success: the person's message is
    //    already with us, and saying "duplicate" would confirm to a stranger
    //    that a given email address has contacted Sellapage.
    const recent = await col.where('email', '==', value.email).limit(20).get()
    const cutoff = Date.now() - DAY_MS
    const duplicate = recent.docs.some((d) => (d.get('createdAt')?.toMillis?.() || 0) > cutoff)
    if (duplicate) return res.status(200).json({ success: true })

    const now = new Date()
    const { consent, ...fields } = value
    await col.add({
      ...fields,
      consent: { given: consent, text: CONSENT_TEXT, at: now },
      status: 'new',
      adminNotes: '',
      statusChangedBy: null,
      createdAt: now,
      updatedAt: now,
    })

    // sendEmail never throws. The enquiry is already saved, so a mail outage
    // costs a notification, never the enquiry itself.
    const interest = labelFor(INTEREST_OPTIONS, value.interest)
    await Promise.allSettled([
      sendEmail(
        notifyAddress(),
        oneLine(`New ${interest.toLowerCase()} enquiry: ${value.fullName}${value.organisation ? `, ${value.organisation}` : ''}`),
        founderEmail(value),
      ),
      sendEmail(value.email, 'We received your message | Sellapage', confirmationEmail(value)),
    ])

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[partner-enquiry] error', err)
    return res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.' })
  }
}
