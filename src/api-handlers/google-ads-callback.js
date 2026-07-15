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
    const message = authError === 'access_blocked'
      ? 'Google denied access. Please try again.'
      : `Connection failed: ${authError}`
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent(message)}`)
  }

  if (!code || !storeId) {
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent('Missing authorization code. Please try connecting again.')}`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        redirect_uri: 'https://www.sellapage.com.ng/api/google-ads-master-callback',
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.refresh_token) {
      const msg = tokenData.error === 'invalid_grant'
        ? 'Authorization expired. Please try connecting again.'
        : 'Could not complete Google authentication. Please try again.'
      return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent(msg)}`)
    }

    await db.collection('stores').doc(storeId).update({
      googleAdsConnected: true,
      googleAdsRefreshToken: tokenData.refresh_token,
      googleAdsConnectedAt: new Date().toISOString(),
    })

    let accountInfo = null
    try {
      const accessToken = await getAccessToken(tokenData.refresh_token)
      const customerNames = await listAccessibleCustomers(accessToken)

      if (customerNames.length > 0) {
        const firstCustomer = customerNames[0]
        const customerId = firstCustomer.split('/').pop()
        accountInfo = await getCustomer(accessToken, customerId)
      }
    } catch (infoErr) {
      console.warn('[google-ads-callback] Could not fetch account details (non-fatal):', infoErr.message)
    }

    if (accountInfo) {
      await db.collection('stores').doc(storeId).update({
        googleAdsCustomerId: accountInfo.id || null,
        googleAdsAccountName: accountInfo.descriptiveName || null,
        googleAdsCurrency: accountInfo.currencyCode || null,
        googleAdsTimezone: accountInfo.timeZone || null,
      })
    }

    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=connected`)
  } catch (err) {
    console.error('[google-ads-callback] Unexpected error:', err)
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent('Something went wrong. Please try connecting again.')}`)
  }
}
