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

export async function registerSession(idToken) {
  const sessionId = getSessionId()
  try {
    await fetch('/api/sessions?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ sessionId }),
    })
  } catch (err) {
    console.error('Failed to register session:', err)
  }
  return sessionId
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
    return !!data.revoked
  } catch {
    return false
  }
}
