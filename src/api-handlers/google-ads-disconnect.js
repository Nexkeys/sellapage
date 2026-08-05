import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { clearGoogleAdsRefreshToken } from './_lib/store-secrets.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}
const db = getFirestore()
const auth = getAuth()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId } = req.body
  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }

  try {
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'google-ads', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await clearGoogleAdsRefreshToken(db, storeId)
    await db.collection('stores').doc(storeId).update({
      googleAdsConnected: false,
      googleAdsCustomerId: null,
      googleAdsAccountName: null,
      googleAdsCurrency: null,
      googleAdsTimezone: null,
      googleAdsConnectedAt: null,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[google-ads-disconnect] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
