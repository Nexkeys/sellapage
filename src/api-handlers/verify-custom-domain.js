import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, domain } = req.body

  if (!storeId || !domain) {
    return res.status(400).json({ error: 'Missing required fields: storeId, domain' })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    const vercelData = await vercelRes.json()

    if (!vercelRes.ok) {
      return res.status(400).json({
        error: 'not_found',
        message: 'Domain not found on our servers. Please try adding it again.',
      })
    }

    const verified = vercelData?.verified === true

    const isApex = vercelData.name === vercelData.apexName
    const dnsType = isApex ? 'A' : 'CNAME'
    const dnsTarget = isApex ? '216.198.79.1' : 'cname.vercel-dns.com'
    const dnsName = isApex ? '@' : vercelData.name.split('.')[0]

    let status = 'pending'
    let userMessage = ''

    if (verified) {
      status = 'active'
      userMessage = 'Your domain is verified and active.'
      await db.collection('stores').doc(storeId).update({
        customDomainStatus: 'active',
      })
    } else {
      status = 'dns_error'
      userMessage = dnsType === 'A'
        ? `Your A record is not set correctly. In your DNS provider, add an A record with Host/Name: @ pointing to ${dnsTarget}. This can take up to 48 hours to propagate.`
        : `Your CNAME record is not set correctly. In your DNS provider, add a CNAME record with Host/Name: ${dnsName} pointing to ${dnsTarget}. This can take up to 48 hours to propagate.`
    }

    return res.status(200).json({
      success: true,
      verified,
      status,
      message: userMessage,
      dnsType,
      dnsName,
      dnsTarget,
      raw: vercelData,
    })
  } catch (err) {
    console.error('[verify-custom-domain] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong verifying your domain. Please try again.',
    })
  }
}
