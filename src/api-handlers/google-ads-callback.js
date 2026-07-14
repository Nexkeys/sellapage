//src/api-handlers/google-ads-callback.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAccessToken, listAccessibleCustomers, getCustomer } from './_lib/google-ads-client.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}
const db = getFirestore()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state: storeId, error: authError } = req.query

  const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'

  if (authError) {
    return res.redirect(`${appUrl}/dashboard?google-ads=error&message=${encodeURIComponent(authError)}`)
  }

  if (!code || !storeId) {
    return res.redirect(`${appUrl}/dashboard?google-ads=error&message=${encodeURIComponent('Missing authorization code')}`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.refresh_token) {
      return res.redirect(`${appUrl}/dashboard?google-ads=error&message=${encodeURIComponent(tokenData.error || 'Failed to exchange code')}`)
    }

    const accessToken = await getAccessToken(tokenData.refresh_token)
    const customerNames = await listAccessibleCustomers(accessToken)

    let accountInfo = null
    if (customerNames.length > 0) {
      const firstCustomer = customerNames[0]
      const customerId = firstCustomer.split('/').pop()
      accountInfo = await getCustomer(accessToken, customerId)
    }

    await db.collection('stores').doc(storeId).update({
      googleAdsConnected: true,
      googleAdsRefreshToken: tokenData.refresh_token,
      googleAdsCustomerId: accountInfo?.id || null,
      googleAdsAccountName: accountInfo?.descriptiveName || null,
      googleAdsCurrency: accountInfo?.currencyCode || null,
      googleAdsTimezone: accountInfo?.timeZone || null,
      googleAdsConnectedAt: new Date().toISOString(),
    })

    return res.redirect(`${appUrl}/dashboard?google-ads=connected`)
  } catch (err) {
    console.error('[google-ads-callback] Error:', err)
    return res.redirect(`${appUrl}/dashboard?google-ads=error&message=${encodeURIComponent('Internal error during connection')}`)
  }
}
