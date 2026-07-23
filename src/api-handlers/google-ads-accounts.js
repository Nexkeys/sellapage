//src/api-handlers/google-ads-accounts.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAccessToken, listAccessibleCustomers, getCustomer } from './_lib/google-ads-client.js'

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
    if (storeDoc.data().ownerId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const refreshToken = storeDoc.data().googleAdsRefreshToken
    if (!refreshToken) {
      return res.status(400).json({ error: 'Google Ads not connected' })
    }

    const accessToken = await getAccessToken(refreshToken)
    const customerNames = await listAccessibleCustomers(accessToken)

    const accounts = []
    for (const name of customerNames) {
      const customerId = name.split('/').pop()
      try {
        const info = await getCustomer(accessToken, customerId)
        accounts.push({
          id: customerId,
          name: info?.descriptiveName || customerId,
          currency: info?.currencyCode || 'USD',
          timezone: info?.timeZone || 'Africa/Lagos',
        })
      } catch {
        accounts.push({ id: customerId, name: customerId })
      }
    }

    return res.status(200).json({ accounts })
  } catch (err) {
    console.error('[google-ads-accounts] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
