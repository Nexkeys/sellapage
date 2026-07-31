//src/api-handlers/sessions.js/
import { randomUUID } from 'crypto'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'

function parseUserAgent(ua = '') {
  let os = 'Unknown OS'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Unknown Browser'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera'
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/crios\//i.test(ua)) browser = 'Chrome'
  else if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) browser = 'Firefox'
  else if (/chrome\//i.test(ua)) browser = 'Chrome'
  else if (/safari\//i.test(ua) && /version\//i.test(ua)) browser = 'Safari'

  let deviceType = 'Desktop'
  if (/ipad|tablet/i.test(ua)) deviceType = 'Tablet'
  else if (/mobi|iphone|android/i.test(ua)) deviceType = 'Mobile'

  return { os, browser, deviceType }
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

async function lookupLocation(ip) {
  const isPrivate = !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')
  if (isPrivate) return { city: '', region: '', country: '' }
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) return { city: '', region: '', country: '' }
    const data = await r.json()
    return { city: data.city || '', region: data.region || '', country: data.country_name || '' }
  } catch {
    return { city: '', region: '', country: '' }
  }
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split('Bearer ')[1]
  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const decoded = await verifyAuth(req)
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' })

  const access = await resolveCallerStoreId(decoded.uid)
  if (!access) return res.status(403).json({ error: 'No store access' })
  const { storeId, role, staffName } = access
  const actorLabel = role === 'owner' ? 'Vendor' : `Staff: ${staffName || 'Unknown'}`

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'
    const sessionsRef = db.collection('stores').doc(storeId).collection('sessions')

    if (action === 'list' && req.method === 'GET') {
      // Self-service view — only the caller's own sessions, whether owner or
      // staff (a staff member's "log out this device" screen shouldn't be
      // able to see the owner's or other staff's devices).
      const snap = await sessionsRef.orderBy('lastActiveAt', 'desc').limit(100).get()
      const sessions = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
          lastActiveAt: doc.data().lastActiveAt?.toDate?.()?.toISOString() || null,
        }))
        .filter(s => !s.revoked && (s.actorUid ? s.actorUid === decoded.uid : role === 'owner'))

      return res.status(200).json({ success: true, sessions })
    }

    if (action === 'list-all' && req.method === 'GET') {
      // Owner-only cross-staff overview, for the Team tab ("who's logged in
      // where"). Not exposed to staff regardless of role.
      if (role !== 'owner') return res.status(403).json({ error: 'Owner only' })
      const snap = await sessionsRef.orderBy('lastActiveAt', 'desc').limit(100).get()
      const sessions = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
          lastActiveAt: doc.data().lastActiveAt?.toDate?.()?.toISOString() || null,
        }))
        .filter(s => !s.revoked)

      return res.status(200).json({ success: true, sessions })
    }

    if (action === 'register' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const sessionId = body.sessionId || randomUUID()
      const ua = req.headers['user-agent'] || ''
      const ip = getClientIp(req)
      const { os, browser, deviceType } = parseUserAgent(ua)
      const location = await lookupLocation(ip)

      await sessionsRef.doc(sessionId).set({
        os,
        browser,
        deviceType,
        ip,
        city: location.city,
        region: location.region,
        country: location.country,
        userAgent: ua,
        actorUid: decoded.uid,
        actorLabel,
        revoked: false,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      })

      return res.status(200).json({ success: true, sessionId })
    }

    if (action === 'heartbeat' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { sessionId } = body
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

      const docRef = sessionsRef.doc(sessionId)
      const snap = await docRef.get()
      if (!snap.exists) return res.status(200).json({ success: true, revoked: true })

      const data = snap.data()
      if (data.revoked) return res.status(200).json({ success: true, revoked: true })

      await docRef.update({ lastActiveAt: new Date() })
      return res.status(200).json({ success: true, revoked: false })
    }

    if (action === 'revoke' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { sessionId } = body
      if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

      const targetRef = sessionsRef.doc(sessionId)
      const targetSnap = await targetRef.get()
      if (!targetSnap.exists) return res.status(404).json({ error: 'Session not found' })
      const target = targetSnap.data()
      // Self-revoke always allowed; the owner may additionally revoke any
      // session on their own store (staff removal already does this via
      // staff-manage.js, this covers ad-hoc owner-initiated revokes too).
      if (target.actorUid !== decoded.uid && role !== 'owner') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      await targetRef.update({ revoked: true, revokedAt: new Date() })
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[sessions] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
