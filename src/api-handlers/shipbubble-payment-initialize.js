//src/api-handlers/shipbubble-payment-initialize.js/
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'

const SELLAPAGE_SERVICE_CHARGE = 25000 // ₦250 in kobo

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.replace('Bearer ', '').trim()
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const auth = getAdminAuth()
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, orderId, courierName, shippingFee, requestToken, courierId, serviceCode } = body

    if (!storeId || !orderId || !courierName || shippingFee == null || !requestToken || !courierId || !serviceCode) {
      return res.status(400).json({
        error: 'Missing required fields: storeId, orderId, courierName, shippingFee, requestToken, courierId, serviceCode',
      })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const db = getAdminDb()
    let storeDoc
    try {
      storeDoc = await db.collection('stores').doc(storeId).get()
    } catch {
      return res.status(500).json({ error: 'Failed to fetch store from Firestore' })
    }

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = storeDoc.data()
    const email = store.email

    if (!email) {
      return res.status(400).json({ error: 'Store has no email address on file' })
    }

    const shippingFeeKobo = Math.round(Number(shippingFee) * 100)
    if (Number.isNaN(shippingFeeKobo) || shippingFeeKobo <= 0) {
      return res.status(400).json({ error: 'shippingFee must be a positive number in Naira' })
    }

    const totalAmount = shippingFeeKobo + SELLAPAGE_SERVICE_CHARGE

    let paystackResponse
    try {
      paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: totalAmount,
          callback_url: 'https://sellapage.com.ng/dashboard?activeTab=orders&shipment=pending',
          metadata: {
            storeId,
            orderId,
            requestToken,
            courierId,
            serviceCode,
            shippingFee: Number(shippingFee),
            type: 'shipment_payment',
            app: 'sellapage',
          },
        }),
      })
    } catch {
      return res.status(502).json({ error: 'Failed to reach Paystack API' })
    }

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status) {
      return res.status(502).json({
        error: paystackData.message || 'Paystack transaction initialization failed',
      })
    }

    return res.status(200).json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      totalAmount: totalAmount / 100,
      shippingFee: Number(shippingFee),
      serviceCharge: 250,
    })
  } catch (err) {
    console.error('[shipbubble-payment-initialize] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
