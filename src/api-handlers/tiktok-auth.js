// src/api-handlers/tiktok-auth.js
// Starts the TikTok Login Kit OAuth flow for a vendor connecting their own
// TikTok account.
//
// SECURITY: the `state` parameter is an unguessable single-use nonce bound
// server-side to the authenticated caller's store. It is NEVER the store id.
//
// That distinction is the whole finding of C-04 in Docs/Security-Reviews.MD:
// the Google Ads flow originally used a raw storeId as `state` on an
// unauthenticated endpoint. Store ids are public (the stores collection is
// world-readable), so anyone could start a flow naming any store, and the
// callback would write the resulting token to whatever store `state` named. A
// victim clicking a crafted link handed their account to the attacker. This
// endpoint is authenticated and derives the store from the verified token, so
// that class of attack does not exist here.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import {
  buildAuthorizeUrl, newState, isTikTokConfigured, missingTikTokConfig,
} from './_lib/tiktok-client.js'

const STATE_TTL_MS = 10 * 60 * 1000
const TIKTOK_PLANS = new Set(['premium'])
const TAB_ID = 'tiktok-pixel'

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,OPTIONS' })
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!isTikTokConfigured()) {
    return res.status(503).json({
      error: 'not_configured',
      message: `TikTok is not set up on the server yet. Missing: ${missingTikTokConfig().join(', ')}.`,
    })
  }

  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim())
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const storeId = String(req.query.storeId || decoded.uid)

  // Standing convention: authorize through resolveStoreAccess, never a raw
  // uid === storeId comparison.
  const access = await resolveStoreAccess(decoded.uid, storeId, TAB_ID, true)
  if (!access.allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this store.' })
  }

  const db = getAdminDb()
  const snap = await db.collection('stores').doc(storeId).get()
  if (!snap.exists) return res.status(404).json({ error: 'Store not found' })

  const plan = String(snap.data().plan || 'starter').toLowerCase()
  if (!TIKTOK_PLANS.has(plan)) {
    return res.status(403).json({
      error: 'plan_required',
      message: 'Connecting a TikTok account is a Premium feature.',
    })
  }

  const state = newState()
  await db.collection('oauthStates').doc(state).set({
    storeId,
    provider: 'tiktok',
    createdAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL_MS,
    consumed: false,
  })

  // Returns JSON rather than a 302: the request carries a bearer token, so it
  // cannot be a plain <a href> navigation. The client navigates to authUrl.
  return res.status(200).json({ authUrl: buildAuthorizeUrl({ state }) })
}
