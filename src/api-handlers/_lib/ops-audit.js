// src/api-handlers/_lib/ops-audit.js
//
// Wraps every admin endpoint (from the router) so that:
//   1. every change a staff member makes (any non-GET request that got past
//      verifyAdmin) lands in the Activity Log with who, what, which record,
//      the result, the IP and the device, without touching the 25+ handlers;
//   2. a refused request tells the console WHY (session ended, code needed,
//      tab not allowed) instead of a bare "Forbidden", so it can react.
//
// The response is held until the log entry is written, then sent: work done
// after a serverless response is not guaranteed to finish.
import { getAdminDb } from './firebase-admin.js'
import { writeAudit } from './ops.js'
import { opsTab } from '../../utils/opsAccess.js'

const DENY_SUMMARY = {
  tab_not_allowed: (t) => `Tried to use ${t} without access`,
  step_up_required: (t) => `Asked to confirm with the authenticator before a sensitive action in ${t}`,
  session_idle: () => 'Used a session that had timed out (idle)',
  session_expired: () => 'Used a session that had passed 12 hours',
  staff_paused: () => 'Tried to work while paused',
  staff_deleted: () => 'Tried to work after being removed',
}

const SECRET_KEY_RE = /pass|token|secret|code|otp|key|authorization/i
const TARGET_KEYS = ['storeId', 'uid', 'requestId', 'withdrawalId', 'ticketId', 'reportId', 'jobId', 'announcementId', 'campaignId', 'applicationId', 'postId', 'reviewId', 'partnerId', 'domain', 'email', 'id']

// Endpoint name -> the tab it belongs to, for the log.
const ENDPOINT_TAB = {
  'admin-health': 'directory', 'admin-referrals': 'referrals', 'admin-recovery': 'recovery', 'admin-cac': 'cac',
  'admin-domains': 'domains', 'admin-announcements': 'announcements', 'admin-push': 'push', 'admin-sms': 'sms',
  'admin-email': 'email', 'admin-tickets': 'tickets', 'admin-analytics': 'analytics', 'admin-revenue': 'revenue',
  'admin-trials': 'trials', 'admin-firestore-usage': 'usage', 'admin-sella-ai': 'sella-ai', 'admin-ai-describe': 'ai-describe',
  'admin-reports': 'reports', 'admin-jobs': 'jobs', 'blog-admin': 'blog', 'platform-reviews-admin': 'reviews',
  'admin-partners': 'partners', 'admin-newsletter': 'newsletter', 'admin-marketplace': 'marketplace', 'admin-flags': 'health',
  'admin-termii': 'health', 'admin-manage': 'admins',
}

const DENY_MESSAGES = {
  step_up_required: 'Confirm with your authenticator code to do this.',
  tab_not_allowed: 'You do not have access to this. Ask a super admin.',
  session_idle: 'You were signed out after 30 minutes without activity.',
  session_expired: 'Your 12-hour session has ended. Sign in again.',
  session_ended: 'Your session has ended. Sign in again.',
  staff_paused: 'Your access is paused. Speak to a super admin.',
  staff_deleted: 'Your access has been removed.',
}

export const isAuditedEndpoint = (endpoint) => endpoint.startsWith('admin-') || endpoint === 'blog-admin' || endpoint === 'platform-reviews-admin' || endpoint === 'ops-team'

function sanitize(value, depth = 0) {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.length > 160 ? `${value.slice(0, 157)}...` : value
  if (depth > 2) return '[...]'
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => sanitize(v, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value).slice(0, 25)) out[k] = SECRET_KEY_RE.test(k) ? '[hidden]' : sanitize(v, depth + 1)
    return out
  }
  return String(value)
}

function readBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return {}
  }
}

export async function withAdminAudit(req, res, endpoint, run) {
  const originalEnd = res.end.bind(res)
  let held = null
  res.end = (...args) => { held = args; return res }

  try {
    await run()
  } finally {
    res.end = originalEnd
    const method = String(req.method || 'GET').toUpperCase()
    const denied = req.__opsDenied
    const staff = req.__ops
    const db = getAdminDb()
    const action = String(req.query?.action || '')
    const tab = ENDPOINT_TAB[endpoint] || null

    if (denied && !denied.quiet && denied.reason !== 'no_session') {
      await writeAudit(db, {
        uid: denied.uid, name: denied.staff?.name || '', title: denied.staff?.title || '', req, tab, result: 'denied',
        action: 'ops.denied',
        summary: (DENY_SUMMARY[denied.reason] || ((t) => `Request to ${t} refused (${denied.reason})`))(opsTab(tab)?.label || endpoint) + (action ? ` (${action.replace(/[-_]/g, ' ')})` : ''),
      })
    } else if (staff && method !== 'GET' && method !== 'OPTIONS' && endpoint !== 'ops-team') {
      const body = readBody(req)
      const key = TARGET_KEYS.find((k) => body?.[k] != null && typeof body[k] !== 'object')
      const ok = res.statusCode < 400
      await writeAudit(db, {
        uid: staff.uid, name: staff.name || '', title: staff.title || (staff.legacy ? 'Legacy admin' : ''), req, tab,
        sessionId: staff.sessionId || null, result: ok ? 'ok' : 'failed',
        action: `${tab || endpoint}.${action || method.toLowerCase()}`,
        target: key ? { type: key, id: String(body[key]).slice(0, 120), label: String(body.businessName || body.name || body.title || '').slice(0, 120) } : null,
        summary: `${opsTab(tab)?.label || endpoint}: ${action ? action.replace(/[-_]/g, ' ') : method.toLowerCase()}${key ? ` (${key} ${String(body[key]).slice(0, 40)})` : ''}${ok ? '' : ` failed (${res.statusCode})`}`,
        changes: { request: sanitize(body) },
      })
    }

    // Swap a bare "Forbidden" for the precise reason, so the console can ask
    // for a code, sign the person out, or hide a tab.
    // Unknown or mismatched sessions and bad tokens all read as "ended".
    const code = denied && (DENY_MESSAGES[denied.reason] !== undefined ? denied.reason
      : /^(session_|no_token|bad_token)/.test(denied.reason) ? 'session_ended' : null)
    if (denied && held && code) {
      res.statusCode = code === 'step_up_required' || code === 'tab_not_allowed' ? 403 : 401
      const text = JSON.stringify({ success: false, error: code, message: DENY_MESSAGES[code] })
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Content-Length', Buffer.byteLength(text))
        held = [text]
      }
    }
    if (held) originalEnd(...held)
  }
}
