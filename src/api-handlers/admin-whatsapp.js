// src/api-handlers/admin-whatsapp.js
// Admin-only console for Sellapage's own WhatsApp Business number.
//
// Everything here runs through _lib/whatsapp.js, so the access token stays on
// the server. The browser sends an action and a phone number; it never sees,
// and never needs, a Meta credential.
//
// Gated on the 'health' tab (super_admin only, per _lib/verify-admin.js). This
// endpoint can send real WhatsApp messages that cost real money, so it is not
// something operations or support should reach.
//
// Rate limited on top of that. An admin account is a small blast radius but not
// a zero one, and a loop against Meta's send endpoint is billable.
import { applyCors } from './_lib/http.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import {
  isConfigured, missingConfig, whatsappConfig,
  listTemplates, createTemplate, sendTemplate, countBodyParams,
} from './_lib/whatsapp.js'

/**
 * Maps a client result from _lib/whatsapp.js onto an HTTP response.
 *
 * A template Meta REFUSES (wrong parameters, not approved, recipient has no
 * WhatsApp) is a business outcome, not a server fault. Those come back 200 with
 * `success: false`, so the browser console stays clean and a genuine 5xx in the
 * Vercel log still means something is actually broken. Only transport failure
 * and an expired token get a non-2xx status.
 */
function respond(res, result) {
  if (result.ok) return res.status(200).json({ success: true, data: result.data })

  const status = result.error === 'unreachable' ? 503
    : result.error === 'token_expired' ? 401
    : 200

  return res.status(status).json({
    success: false,
    error: result.error,
    // Meta's own wording is the most useful thing an admin can be shown here -
    // it names the actual rejection reason (unapproved template, number not on
    // WhatsApp, expired token) far better than anything invented locally.
    message: result.metaMessage || null,
    metaCode: result.metaCode ?? null,
  })
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  // applyCors only sets headers; it does not answer the preflight itself.
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'health')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const action = req.query.action || 'status'

  // 'status' is a pure config read with no outbound call, so it is left out of
  // the limiter - the health panel polls it.
  if (action === 'status') {
    const cfg = whatsappConfig()
    return res.status(200).json({
      success: true,
      configured: isConfigured(),
      missing: missingConfig(),
      // Identifiers, not secrets: these appear in Meta's own dashboard and are
      // needed to tell one environment's WABA from another's. The token is
      // never included in any shape.
      phoneNumberId: cfg.phoneNumberId || null,
      wabaId: cfg.wabaId || null,
    })
  }

  if (!isConfigured()) {
    return res.status(200).json({
      success: false,
      error: 'not_configured',
      missing: missingConfig(),
      message: 'WhatsApp is not configured on this environment.',
    })
  }

  if (action === 'templates') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const result = await listTemplates(25)

    // Annotate each template with how many {{n}} values it needs. Counting it
    // here keeps the browser out of _lib/whatsapp.js, which reads process.env
    // and has no business being bundled for the client.
    if (result.ok && Array.isArray(result.data?.data)) {
      result.data.data = result.data.data.map((t) => ({
        ...t,
        paramCount: countBodyParams(t),
      }))
    }
    return respond(res, result)
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (action === 'create-template') {
    if (!memoryRateLimit('wa-create-template', clientKey(req), 10, 3600000)) {
      return tooManyRequests(res)
    }
    const result = await createTemplate({
      name: body.name,
      body: body.body,
      category: body.category === 'MARKETING' ? 'MARKETING' : 'UTILITY',
    })
    if (result.ok) console.log(`[admin-whatsapp] template created by ${admin.uid}`)
    return respond(res, result)
  }

  if (action === 'send') {
    // Tighter than template creation: this one costs money per call.
    if (!memoryRateLimit('wa-send', clientKey(req), 20, 3600000)) {
      return tooManyRequests(res)
    }
    const result = await sendTemplate({
      to: body.to,
      template: body.template,
      // Templates carrying {{1}} are refused with error 132012 unless a matching
      // parameter is supplied. Optional, because a plain notification has none.
      bodyParams: Array.isArray(body.bodyParams) ? body.bodyParams : [],
    })
    if (result.ok) {
      // The number is intentionally not logged. Who sent it and which template
      // is enough for an audit trail; the recipient is customer data.
      console.log(`[admin-whatsapp] template "${body.template}" sent by ${admin.uid}`)
    }
    return respond(res, result)
  }

  return res.status(400).json({ error: 'Unknown action' })
}
