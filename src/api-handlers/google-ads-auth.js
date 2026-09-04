//src/api-handlers/google-ads-auth.js
import crypto from 'crypto'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'

// The OAuth `state` parameter previously carried the raw storeId, taken from a
// query string on an unauthenticated endpoint. Store IDs are public (the stores
// collection is world-readable), so anyone could start a flow for any store -
// and google-ads-callback.js wrote the resulting refresh token to whatever
// store `state` named. A victim clicking a crafted link would hand their
// Google Ads refresh token to the attacker's store, giving persistent access to
// read their campaigns and spend their ad budget.
//
// `state` is now an unguessable single-use nonce, bound server-side to the
// authenticated caller's store.
const STATE_TTL_MS = 10 * 60 * 1000

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authenticate the initiator. storeId is derived from the verified token -
  // never from the query string.
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim())
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  const storeId = decoded.uid

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google Ads OAuth not configured' })
  }

  const state = crypto.randomBytes(32).toString('hex')
  await getAdminDb().collection('oauthStates').doc(state).set({
    storeId,
    provider: 'google-ads',
    createdAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL_MS,
    consumed: false,
  })

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  // Returns JSON rather than a 302: the request now carries a bearer token, so
  // it can't be a plain <a href> navigation. The client navigates to authUrl.
  return res.status(200).json({ authUrl: authUrl.toString() })
}
