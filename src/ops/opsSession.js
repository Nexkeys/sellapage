// src/ops/opsSession.js
//
// The browser half of an Ops session. The server holds the real session
// (opsSessions); this keeps its token, sends it with every console request,
// and turns the server's refusals into actions:
//   step_up_required -> ask for the authenticator code, then retry once
//   session_* / staff_* (401) -> sign out and explain why
//   tab_not_allowed -> refresh the menu (a tab was revoked mid-session)
//
// The console's existing tabs call fetch() directly with headers from
// `opsHeaders`, so the reactions are installed as a thin wrapper around
// window.fetch for /api/ calls only (ops-auth itself is left alone).
import { auth } from '../firebase/config'

const KEY = 'sellapage_ops_session'

export function getOpsSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s?.token || Date.now() > s.expiresAt) return null
    return s
  } catch {
    return null
  }
}

export function saveOpsSession({ token, expiresAt, idleMs }) {
  try { localStorage.setItem(KEY, JSON.stringify({ token, expiresAt, idleMs })) } catch { /* private mode: lasts for this page only */ }
}

export function clearOpsSession() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

export async function opsHeaders() {
  const s = getOpsSession()
  const t = await auth.currentUser?.getIdToken().catch(() => null)
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(s ? { 'X-Ops-Session': s.token } : {}),
  }
}

/** JSON helper for the ops endpoints. Never throws. */
export async function opsJson(path, { method = 'GET', body, headers = true } = {}) {
  try {
    const res = await fetch(path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(headers ? await opsHeaders() : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok && data.success !== false, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { message: 'Network error. Check your connection and try again.' } }
  }
}

let installed = false
let handlers = { onStepUp: async () => false, onSessionEnded: () => {}, onTabRevoked: () => {} }

export function setOpsFetchHandlers(next) {
  handlers = { ...handlers, ...next }
}

export function installOpsFetchGuard() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    const res = await original(input, init)
    const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`)
    if (!isApi || url.includes('/api/ops-auth') || (res.status !== 401 && res.status !== 403)) return res
    const data = await res.clone().json().catch(() => null)
    const code = String(data?.error || '')
    if (code === 'step_up_required') {
      const ok = await handlers.onStepUp()
      // A fresh copy of the headers: the ID token may have been refreshed.
      return ok ? original(input, { ...init, headers: { ...(init?.headers || {}), ...(await opsHeaders()) } }) : res
    }
    if (res.status === 401 && (code.startsWith('session_') || code.startsWith('staff_'))) handlers.onSessionEnded(code)
    else if (code === 'tab_not_allowed') handlers.onTabRevoked()
    return res
  }
}
