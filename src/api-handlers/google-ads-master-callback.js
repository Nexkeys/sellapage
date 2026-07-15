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
        redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI,
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
    const customerId = process.env.GOOGLE_ADS_MCC_ID || '5897875835'

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
