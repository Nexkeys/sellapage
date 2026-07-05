//src/api-handlers/shipbubble-payment-verify.js/
import { getAdminAuth } from './_lib/firebase-admin.js'

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
    try {
      await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { reference, storeId } = body

    if (!reference || !storeId) {
      return res.status(400).json({ error: 'Missing required fields: reference, storeId' })
    }

    let paystackResponse
    try {
      paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      })
    } catch {
      return res.status(502).json({ error: 'Failed to reach Paystack API' })
    }

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status) {
      return res.status(502).json({
        error: paystackData.message || 'Failed to verify transaction',
      })
    }

    const data = paystackData.data

    if (data.status !== 'success') {
      return res.status(400).json({ error: 'Payment was not successful' })
    }

    if (data.metadata?.type !== 'shipment_payment') {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }

    if (data.metadata?.storeId !== storeId) {
      return res.status(400).json({ error: 'Store ID mismatch' })
    }

    return res.status(200).json({
      success: true,
      requestToken: data.metadata.requestToken,
      courierId: data.metadata.courierId,
      serviceCode: data.metadata.serviceCode,
      orderId: data.metadata.orderId,
      shippingFee: data.metadata.shippingFee,
      amountPaid: data.amount / 100,
    })
  } catch (err) {
    console.error('[shipbubble-payment-verify] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
