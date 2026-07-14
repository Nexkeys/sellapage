import { getAdminDb } from './_lib/firebase-admin.js'
import { getAdminAuth } from './_lib/firebase-admin.js'

const SERVICE_CHARGE_RATE = 0.10

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    storeId,
    campaignName,
    campaignType,
    budgetAmount,
    targeting,
  } = req.body

  if (!storeId || !campaignName || !budgetAmount) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, campaignName, budgetAmount',
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

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    if (storeDoc.data().ownerId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const email = storeDoc.data().email
    if (!email) {
      return res.status(400).json({ error: 'Store has no email address on file' })
    }

    const budget = Number(budgetAmount)
    if (isNaN(budget) || budget < 100) {
      return res.status(400).json({ error: 'Budget must be at least ₦100' })
    }

    const serviceCharge = Math.round(budget * SERVICE_CHARGE_RATE)
    const total = budget + serviceCharge
    const amountKobo = Math.round(total * 100)

    const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        callback_url: `${appUrl}/dashboard?ads-payment=pending&tab=google-ads`,
        metadata: {
          transactionType: 'ads-payment',
          storeId,
          campaignName,
          campaignType: campaignType || 'SEARCH',
          budgetAmount: budget,
          serviceCharge,
          total,
          targeting: JSON.stringify(targeting || {}),
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return res.status(502).json({
        error: paystackData.message || 'Paystack transaction initialization failed',
      })
    }

    return res.status(200).json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    })
  } catch (err) {
    console.error('[ads-payment-initialize] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
