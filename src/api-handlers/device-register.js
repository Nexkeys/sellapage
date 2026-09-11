// src/api-handlers/device-register.js
//
// Registers one app install's FCM token. Called twice in a normal lifecycle:
//
//   1. FIRST OPEN, unauthenticated. There is no session yet, so the row is
//      stored with storeId null. This is what makes it possible to ask for
//      notification permission before login at all; with tokens living on
//      stores/{storeId} there was nowhere to put one.
//   2. AFTER SIGN-IN, authenticated. Same token, same installId, now linked to
//      the caller's store.
//
// storeId is NEVER read from the request body. It is derived from a verified
// Firebase id token or it stays null. Accepting it from the client would let
// anyone subscribe their own handset to another vendor's order notifications,
// which is the whole security question this endpoint turns on.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import { registerDevice } from './_lib/push-devices.js'
import { durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

const PLATFORMS = new Set(['android', 'ios'])

// An FCM registration token is ~160 chars. The bounds reject junk without
// being so tight that a future token format breaks registration.
const TOKEN_MIN = 32
const TOKEN_MAX = 4096

export default async function handler(req, res) {
  // Open CORS matches the other app-facing handlers (notify, sessions,
  // store-data). React Native sends no Origin header and is not subject to
  // CORS, so the allowlist in _lib/http.js would gate nothing here.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const token = String(body.token || '').trim()
  const platform = String(body.platform || '').trim().toLowerCase()
  const installId = String(body.installId || '').trim()
  const appVersion = String(body.appVersion || '').trim().slice(0, 32)

  if (token.length < TOKEN_MIN || token.length > TOKEN_MAX) {
    return res.status(400).json({ error: 'Invalid token' })
  }
  if (!PLATFORMS.has(platform)) {
    return res.status(400).json({ error: 'Invalid platform' })
  }
  if (!installId || installId.length > 128) {
    return res.status(400).json({ error: 'Invalid installId' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  // The unauthenticated path is the exposed one, so it is limited per IP.
  // Durable rather than in-memory: Vercel spins up many instances and an
  // in-memory counter would reset constantly, which is the difference between
  // a limit and the appearance of one.
  const limitKey = idToken ? `uid:${idToken.slice(-24)}` : `ip:${clientKey(req)}`
  const allowed = await durableRateLimit('device-register', limitKey, 30, 3600000)
  if (!allowed) return tooManyRequests(res)

  try {
    let storeId = null
    let linkedUid = null
    let plan = null
    let vendorType = null

    if (idToken) {
      let decoded
      try {
        decoded = await getAdminAuth().verifyIdToken(idToken)
      } catch {
        // A stale token is not a reason to lose the registration. The device is
        // still real and should still receive platform broadcasts, so this
        // degrades to the unauthenticated case rather than rejecting.
        decoded = null
      }

      if (decoded) {
        // resolveCallerStoreId, not resolveStoreAccess: the store id is the
        // thing being DERIVED here, and this resolver handles owner and active
        // staff without one being supplied.
        const access = await resolveCallerStoreId(decoded.uid)
        if (access) {
          storeId = access.storeId
          linkedUid = decoded.uid

          // Denormalised for broadcast filtering. See push-devices.js for why
          // this is copied rather than joined at send time.
          const storeSnap = await getAdminDb().collection('stores').doc(storeId).get()
          const store = storeSnap.data() || {}
          plan = store.plan || 'starter'
          vendorType = store.vendorType || 'products'
        }
      }
    }

    const deviceId = await registerDevice({
      token,
      platform,
      installId,
      appVersion,
      storeId,
      linkedUid,
      plan,
      vendorType,
    })

    return res.status(200).json({ ok: true, deviceId, linked: Boolean(storeId) })
  } catch (err) {
    console.error('[device-register] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
