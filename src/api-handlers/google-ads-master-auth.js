export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const redirectUri = 'https://www.sellapage.com.ng/api/google-ads-master-callback'

  if (!clientId) {
    return res.status(500).json({ error: 'Google Ads OAuth not configured' })
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', 'master')

  return res.redirect(302, authUrl.toString())
}
