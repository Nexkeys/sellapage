// src/api-handlers/_lib/whatsapp.js
// Thin client for the WhatsApp Cloud API (Meta), hosted by Meta.
//
// WHY THIS EXISTS AND WHAT IT IS NOT
// Sellapage's customer-facing WhatsApp features are wa.me deep links: the vendor
// presses send from their own phone, nothing passes through us, and no Meta
// approval is involved (see components/dashboard/WhatsAppReminderModal.jsx).
// That stays exactly as it is.
//
// This file is the OTHER path: real Cloud API calls made by Sellapage's own
// server, from Sellapage's own WhatsApp Business number. It is admin-only today.
// It exists so the platform can send transactional notifications (order
// confirmed, payout sent) without depending on a human pressing send, and it is
// the code Meta App Review is shown when granting whatsapp_business_messaging
// and whatsapp_business_management.
//
// SECRETS
// WHATSAPP_ACCESS_TOKEN can send messages and spend money. It is read from the
// environment server-side only. It is never returned in a response, never
// logged, and must never be given a VITE_ prefix - Vite inlines those into the
// public browser bundle, which is exactly how the old admin token leaked.
//
// TOKENS EXPIRE
// The temporary tokens Meta hands out on the API Setup page last about 24 hours.
// A 190 / OAuthException from Meta means "generate a new token", not "the code
// broke". That distinction is surfaced to the admin UI rather than swallowed,
// because it is otherwise indistinguishable from an outage.

const GRAPH_VERSION = 'v25.0'
const TIMEOUT_MS = 10000

export function whatsappConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: process.env.WHATSAPP_WABA_ID || '',
  }
}

export function isConfigured() {
  const c = whatsappConfig()
  return Boolean(c.token && c.phoneNumberId && c.wabaId)
}

/**
 * Reports which variables are missing, without revealing any of their values.
 * Used by the health panel so a misconfiguration names itself instead of
 * appearing as a generic failure.
 */
export function missingConfig() {
  const c = whatsappConfig()
  const missing = []
  if (!c.token) missing.push('WHATSAPP_ACCESS_TOKEN')
  if (!c.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID')
  if (!c.wabaId) missing.push('WHATSAPP_WABA_ID')
  return missing
}

/**
 * Nigerian numbers arrive in several shapes. The Cloud API wants an
 * international number, digits only, no plus and no separators.
 *
 * Kept deliberately identical in behaviour to toWaNumber() in the reminder
 * modal so a number that works for a deep link also works here.
 */
export function toE164Digits(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('234') && d.length === 13) return d
  if (d.startsWith('0') && d.length === 11) return `234${d.slice(1)}`
  if (d.length === 10) return `234${d}`
  return d.length >= 11 ? d : null
}

/**
 * One place where every Graph call is made, so timeout, error shape and the
 * "never leak the token" rule are enforced once rather than per caller.
 *
 * Always resolves. Callers branch on `ok`, never on a thrown error.
 */
async function graph(path, { method = 'GET', body = null } = {}) {
  const { token } = whatsappConfig()
  if (!token) return { ok: false, error: 'not_configured' }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const data = await res.json().catch(() => null)
    if (res.ok) return { ok: true, data }

    // Meta nests the useful part under `error`. Code 190 is specifically an
    // expired or revoked token, which is a routine operational event here.
    const err = data?.error || {}
    return {
      ok: false,
      error: err.code === 190 ? 'token_expired' : 'meta_error',
      status: res.status,
      metaCode: err.code ?? null,
      metaMessage: err.error_user_msg || err.message || 'Unknown error from Meta',
    }
  } catch (e) {
    // AbortSignal.timeout rejects with a TimeoutError; treat it the same as any
    // other unreachable-network case from the admin's point of view.
    return { ok: false, error: 'unreachable', metaMessage: e.message }
  }
}

/** Lists the message templates on the WABA. Read-only. */
export async function listTemplates(limit = 25) {
  const { wabaId } = whatsappConfig()
  if (!wabaId) return { ok: false, error: 'not_configured' }
  return graph(`${wabaId}/message_templates?limit=${encodeURIComponent(limit)}`)
}

/**
 * Creates a message template. Meta reviews it; a fresh template comes back
 * PENDING and flips to APPROVED on their side, usually within hours.
 *
 * Template names are lowercase, digits and underscores only - Meta rejects
 * anything else, so the name is normalised here rather than bounced back.
 */
export async function createTemplate({ name, body, category = 'UTILITY', language = 'en_US' }) {
  const { wabaId } = whatsappConfig()
  if (!wabaId) return { ok: false, error: 'not_configured' }

  const safeName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512)

  if (!safeName) return { ok: false, error: 'invalid_name' }
  if (!String(body || '').trim()) return { ok: false, error: 'invalid_body' }

  return graph(`${wabaId}/message_templates`, {
    method: 'POST',
    body: {
      name: safeName,
      language,
      category,
      components: [{ type: 'BODY', text: String(body).trim() }],
    },
  })
}

/**
 * Sends an approved template to a number.
 *
 * Template rather than free-form text on purpose: outside a 24 hour customer
 * service window, Meta only permits templates, and every send Sellapage makes
 * is a notification the customer was not already in a conversation about.
 */
export async function sendTemplate({ to, template, language = 'en_US', bodyParams = [] }) {
  const { phoneNumberId } = whatsappConfig()
  if (!phoneNumberId) return { ok: false, error: 'not_configured' }

  const digits = toE164Digits(to)
  if (!digits) return { ok: false, error: 'invalid_number' }
  if (!template) return { ok: false, error: 'invalid_template' }

  // A template whose body contains {{1}} is rejected with Meta error 132012
  // unless a matching parameter list is sent, and one with no placeholders is
  // rejected by the same code if parameters ARE sent. So the components array
  // is included only when there is something to put in it.
  const params = (Array.isArray(bodyParams) ? bodyParams : [])
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)

  const templateObj = { name: template, language: { code: language } }
  if (params.length) {
    templateObj.components = [{
      type: 'body',
      parameters: params.map((text) => ({ type: 'text', text })),
    }]
  }

  return graph(`${phoneNumberId}/messages`, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to: digits,
      type: 'template',
      template: templateObj,
    },
  })
}

/**
 * How many {{n}} placeholders a template's BODY carries.
 *
 * Meta does not report this as a number, so it is counted from the body text.
 * The UI uses it to show the right number of inputs rather than letting an
 * admin discover the requirement from a 132012 rejection.
 */
export function countBodyParams(template) {
  const body = (template?.components || []).find((c) => c.type === 'BODY')
  const matches = String(body?.text || '').match(/\{\{\s*\d+\s*\}\}/g)
  if (!matches) return 0
  // {{1}} may legitimately appear more than once; the count Meta wants is the
  // highest index, not the number of occurrences.
  return Math.max(...matches.map((m) => parseInt(m.replace(/\D/g, ''), 10) || 0))
}
