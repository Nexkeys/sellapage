//sellapage/api/billing-initialize.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

const PLAN_AMOUNTS = {
  growth: 500000,
  pro: 1200000,
  premium: 2500000,
}

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, plan } = body

    if (!storeId || !plan) {
      return res.status(400).json({ error: 'Missing required fields: storeId, plan' })
    }

    if (!['growth', 'pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "growth", "pro", or "premium"' })
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

    const amount = PLAN_AMOUNTS[plan]

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
