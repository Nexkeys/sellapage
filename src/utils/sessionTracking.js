//src/utils/sessionTracking.js/
const SESSION_ID_KEY = 'sellapage_session_id'

export function getSessionId() {
  let id = localStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, id)
  }
  return id
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_ID_KEY)
}

// Returns { sessionId, otpRequired, otpReason }. Callers that predate Phase 2
// destructure nothing and are unaffected; `sessionId` is still available on the
// returned object for anything that wants it.
export async function registerSession(idToken) {
  const sessionId = getSessionId()
  try {
    const res = await fetch('/api/sessions?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json().catch(() => ({}))
    // 423 = account locked. This MUST be propagated: it was previously dropped
    // here, so the caller navigated to the dashboard despite the server having
    // refused the session — the lockout bypass.
    if (res.status === 423 || data.error === 'account_locked') {
      return { sessionId, otpRequired: false, otpReason: null, locked: true }
    }
    return { sessionId, otpRequired: !!data.otpRequired, otpReason: data.otpReason || null, locked: false }
  } catch (err) {
    console.error('Failed to register session:', err)
    // Fail open on NETWORK errors only — an outage must not block sign-in.
    // A definite 423 above is never treated as an outage.
    return { sessionId, otpRequired: false, otpReason: null, locked: false }
  }
}

/** Marks this device trusted after a login OTP has been verified. */
export async function confirmLoginOtp(idToken) {
  const sessionId = getSessionId()
  try {
    const res = await fetch('/api/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ sessionId }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendHeartbeat(idToken) {
  const sessionId = getSessionId()
  try {
    const res = await fetch('/api/sessions?action=heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    // `revoked` keeps its original meaning (force logout). `otpPending` is
    // reported separately so an abandoned login challenge can be re-shown
    // rather than silently leaving an unverified session running.
    return { revoked: !!data.revoked, otpPending: !!data.otpPending }
  } catch {
    return { revoked: false, otpPending: false }
  }
}
