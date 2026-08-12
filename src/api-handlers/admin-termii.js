// src/api-handlers/admin-termii.js
// Operations Console monitoring for Termii. Endpoints verified against
// Docs/TERMII_API_DOCS.md:
//   GET /api/get-balance?api_key=   (:1589) -> { application, balance, currency, user }
//   GET /api/sender-id?api_key=     (:115)  -> approved sender IDs + status
//
// Independent of the OTP phases: worth having BEFORE any SMS ships, because an
// empty Termii wallet makes phone verification fail for every vendor with no
// obvious cause — exactly the kind of silent failure that has cost real hours
// on this codebase before.
//
// TERMII_API_KEY is read server-side only and is never echoed back to the
// browser in any response.
import { applyCors } from './_lib/http.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { validateSenderId } from './_lib/termii.js'

// Below this, phone verification is at risk of failing outright.
const LOW_BALANCE_THRESHOLD_NGN = 2000

function termiiBase() {
  const base = process.env.TERMII_BASE_URL || 'https://api.ng.termii.com'
  return base.replace(/\/+$/, '')
}

async function termiiGet(path) {
  const key = process.env.TERMII_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  const sep = path.includes('?') ? '&' : '?'
  try {
    const res = await fetch(`${termiiBase()}${path}${sep}api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: 'termii_error', status: res.status, data }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: 'unreachable', message: err.message }
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // 'health' — the System Health tab, where infra status already lives.
  const admin = await verifyAdmin(req, 'health')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  if (!process.env.TERMII_API_KEY) {
    return res.status(200).json({
      success: true,
      configured: false,
      message: 'TERMII_API_KEY is not set on this environment.',
    })
  }

  const action = req.query.action || 'status'

  try {
    if (action === 'sender-ids') {
      const result = await termiiGet('/api/sender-id')
      if (!result.ok) {
        return res.status(502).json({ success: false, error: result.error, message: 'Could not reach Termii.' })
      }
      return res.status(200).json({ success: true, configured: true, senderIds: result.data })
    }

    // default: balance + sender IDs together, for a single dashboard card
    const [balanceRes, senderRes] = await Promise.all([
      termiiGet('/api/get-balance'),
      termiiGet('/api/sender-id'),
    ])

    if (!balanceRes.ok) {
      return res.status(502).json({
        success: false,
        configured: true,
        error: balanceRes.error,
        message: 'Could not reach Termii to read the wallet balance.',
      })
    }

    const balance = Number(balanceRes.data?.balance ?? 0)
    const currency = balanceRes.data?.currency || 'NGN'

    // Config-level check on TERMII_SENDER_ID. Termii's `from` must be the short
    // alphanumeric sender NAME ("Sellapage"), not the UUID the application form
    // returns — see validateSenderId(). Catching this here beats discovering it
    // as silent send failures the day approval lands. The value itself is only
    // echoed when it is INVALID, so a working sender ID is never disclosed.
    const senderCheck = validateSenderId(process.env.TERMII_SENDER_ID)

    // Termii lists pending sender IDs too (Docs:110-200 shows status "pending"),
    // so surface both counts rather than implying any entry means "approved".
    const entries = Array.isArray(senderRes.ok ? senderRes.data?.content : null)
      ? senderRes.data.content
      : []
    const approvedCount = entries.filter(e => String(e.status || '').toLowerCase() === 'active').length

    return res.status(200).json({
      success: true,
      configured: true,
      balance,
      currency,
      application: balanceRes.data?.application || '',
      lowBalance: balance < LOW_BALANCE_THRESHOLD_NGN,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD_NGN,
      senderIdConfigured: !!process.env.TERMII_SENDER_ID,
      senderIdValid: senderCheck.valid,
      senderIdIssue: senderCheck.valid ? null : senderCheck.reason,
      senderIdValue: senderCheck.valid ? null : (senderCheck.value || null),
      senderIdApprovedCount: approvedCount,
      // True only when config AND approval are both in place.
      smsReady: senderCheck.valid && approvedCount > 0,
      // Non-fatal: a sender-ID lookup failure shouldn't hide the balance.
      senderIds: senderRes.ok ? senderRes.data : null,
      senderIdsError: senderRes.ok ? null : senderRes.error,
    })
  } catch (err) {
    console.error('[admin-termii] Error:', err.message)
    return res.status(500).json({ success: false, error: 'server_error' })
  }
}
