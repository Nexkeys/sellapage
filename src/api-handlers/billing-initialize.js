//sellapage/api/billing-initialize.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

const PRICE_MATRIX = {
  growth: { monthly: 500000, quarterly: 1350000, biannual: 2550000, annual: 4800000 },
  pro: { monthly: 1200000, quarterly: 3240000, biannual: 6120000, annual: 11520000 },
  premium: { monthly: 2500000, quarterly: 6750000, biannual: 12750000, annual: 24000000 },
}

const VALID_PERIODS = ['monthly', 'quarterly', 'biannual', 'annual']

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    applyCorsOrigin(req, res)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Free-tier protection: on Spark, quota exhaustion is an outage, not a bill.
    if (!memoryRateLimit('billing-initialize', clientKey(req), 10, 60000)) {
      return tooManyRequests(res)
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, plan, billingPeriod = 'monthly' } = body

    if (!storeId || !plan) {
      return res.status(400).json({ error: 'Missing required fields: storeId, plan' })
    }

    if (!['growth', 'pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "growth", "pro", or "premium"' })
    }

    if (!VALID_PERIODS.includes(billingPeriod)) {
      return res.status(400).json({ error: 'Invalid billingPeriod. Must be "monthly", "quarterly", "biannual", or "annual"' })
    }

    let storeDoc
    try {
      storeDoc = await db.collection('stores').doc(storeId).get()
    } catch (err) {
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

    const amount = PRICE_MATRIX[plan][billingPeriod]

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
          amount,
          callback_url: 'https://sellapage.com.ng/billing/callback',
          metadata: {
            storeId,
            plan,
            billingPeriod,
            type: 'subscription',
            app: 'sellapage',
          },
        }),
      })
    } catch (err) {
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
    })
  } catch (err) {
    console.error('Handler error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
