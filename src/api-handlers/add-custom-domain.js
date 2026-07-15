import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

function isValidDomain(domain) {
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/
  return domainRegex.test(domain)
}

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

  const cleanDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '')

  if (!isValidDomain(cleanDomain)) {
    return res.status(400).json({
      error: 'invalid_domain',
      message: 'Please enter a valid domain like shop.yourbrand.com — no http:// or trailing slashes.',
    })
  }

  if (cleanDomain === 'sellapage.com.ng' || cleanDomain.endsWith('.sellapage.com.ng')) {
    return res.status(400).json({
      error: 'reserved_domain',
      message: 'You cannot use a Sellapage domain as your custom domain.',
    })
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

    const existingQuery = await db
      .collection('stores')
      .where('customDomain', '==', cleanDomain)
      .limit(1)
      .get()

    if (!existingQuery.empty && existingQuery.docs[0].id !== storeId) {
      return res.status(409).json({
        error: 'domain_taken',
        message: 'This domain is already connected to another Sellapage store.',
      })
    }

    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: cleanDomain }),
      }
    )

    const vercelData = await vercelRes.json()

    if (!vercelRes.ok) {
      console.error('[add-custom-domain] Vercel error:', vercelData)

      if (vercelData?.error?.code === 'domain_already_in_use') {
        return res.status(409).json({
          error: 'domain_taken',
          message: 'This domain is already connected to another Sellapage store.',
        })
      }

      return res.status(400).json({
        error: 'vercel_error',
        message: "We couldn't add your domain. Please check the domain is correct and try again.",
      })
    }

    await db.collection('stores').doc(storeId).update({
      customDomain: cleanDomain,
      customDomainStatus: 'pending',
      customDomainAddedAt: new Date().toISOString(),
    })

    const isApex = vercelData.name === vercelData.apexName
    const dnsType = isApex ? 'A' : 'CNAME'
    const dnsTarget = isApex ? '216.198.79.1' : 'cname.vercel-dns.com'
    const dnsName = isApex ? '@' : vercelData.name.split('.')[0]

    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      status: 'pending',
      dnsType,
      dnsName,
      dnsTarget,
    })
  } catch (err) {
    console.error('[add-custom-domain] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong on our end. Please try again or contact support.',
    })
  }
}
