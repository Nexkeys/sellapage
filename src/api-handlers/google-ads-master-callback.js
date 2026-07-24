import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

  const { code, error: authError } = req.query
  const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'

  if (authError) {
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent('Master account auth failed: ' + authError)}`)
  }

  if (!code) {
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent('Missing authorization code')}`)
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
        ? 'Authorization expired. Please try again.'
        : 'Could not complete Google authentication.'
      return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent(msg)}`)
    }

    const refreshToken = tokenData.refresh_token
    // The operating customer for campaign/budget creation must be a serving (client) account, not
    // the manager account itself — Google Ads does not allow a manager account to directly hold
    // campaigns. GOOGLE_ADS_MCC_ID (589-787-5835) stays the manager, used only for the
    // login-customer-id header elsewhere; this is the serving account linked underneath it.
    const customerId = process.env.GOOGLE_ADS_MASTER_SERVING_ID || '9738549037'

    await db.collection('platformSettings').doc('googleAdsMaster').set({
      refreshToken,
      customerId,
      connectedAt: new Date().toISOString(),
    }, { merge: true })

    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=master-connected`)
  } catch (err) {
    console.error('[google-ads-master-callback] Error:', err)
    return res.redirect(`${appUrl}/dashboard?tab=google-ads&google-ads=error&message=${encodeURIComponent('Something went wrong. Please try again.')}`)
  }
}
