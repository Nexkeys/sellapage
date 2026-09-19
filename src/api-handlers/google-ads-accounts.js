//src/api-handlers/google-ads-accounts.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAccessToken, listAccessibleCustomers, getCustomer } from './_lib/google-ads-client.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { getGoogleAdsRefreshToken } from './_lib/store-secrets.js'

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

  const { storeId, action = 'list', customerId: selectedId } = req.body || {}
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
    // Listing is a read. Switching changes which account every Google Ads
    // call for this store uses, so it needs write access to the tab.
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'google-ads', action === 'select')
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const refreshToken = await getGoogleAdsRefreshToken(db, storeId)
    if (!refreshToken) {
      return res.status(400).json({ error: 'Google Ads not connected' })
    }

    const accessToken = await getAccessToken(refreshToken)
    const customerNames = await listAccessibleCustomers(accessToken)

    // Connecting always picked the first account Google lists. A vendor with
    // more than one Ads account under the same Google login could land on one
    // that does not hold their campaigns, with no way to change it. This lets
    // them pick, but only an account their own Google login can reach.
    if (action === 'select') {
      const wanted = String(selectedId || '').replace(/-/g, '')
      if (!/^\d{6,12}$/.test(wanted)) {
        return res.status(400).json({ error: 'Pick an account from the list.' })
      }
      if (!customerNames.some((n) => n.split('/').pop() === wanted)) {
        return res.status(403).json({ error: 'That account is not available on your Google login.' })
      }

      let info = null
      try {
        info = await getCustomer(accessToken, wanted)
      } catch (infoErr) {
        console.warn('[google-ads-accounts] getCustomer failed on select:', infoErr.message)
        return res.status(502).json({ error: 'Google could not open that account. It may be cancelled or suspended.' })
      }
      // A manager account only manages other accounts. It holds no campaigns
      // of its own, so every campaign and report call would fail on it.
      if (info?.manager) {
        return res.status(400).json({ error: 'That is a manager account, which cannot hold campaigns. Pick one of the accounts it manages.' })
      }

      await db.collection('stores').doc(storeId).update({
        googleAdsCustomerId: wanted,
        googleAdsAccountName: info?.descriptiveName || null,
        googleAdsCurrency: info?.currencyCode || null,
        googleAdsTimezone: info?.timeZone || null,
      })
      return res.status(200).json({ success: true, customerId: wanted })
    }

    if (action !== 'list') {
      return res.status(400).json({ error: 'Invalid action' })
    }

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
          manager: Boolean(info?.manager),
        })
      } catch {
        accounts.push({ id: customerId, name: customerId })
      }
    }

    return res.status(200).json({
      accounts,
      currentId: String(storeDoc.data().googleAdsCustomerId || ''),
    })
  } catch (err) {
    console.error('[google-ads-accounts] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
