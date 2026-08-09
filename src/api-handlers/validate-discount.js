//src/api-handlers/validate-discount.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

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

    // Free-tier protection: on Spark, quota exhaustion is an outage, not a bill.
    if (!memoryRateLimit('validate-discount', clientKey(req), 20, 60000)) {
      return tooManyRequests(res)
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, code } = body
    const normalizedCode = code?.trim().toUpperCase()

    if (!storeId || !normalizedCode) {
      return res.status(400).json({ error: 'storeId and code are required' })
    }

    const discountSnap = await db
      .collection('stores')
      .doc(storeId)
      .collection('discounts')
      .where('code', '==', normalizedCode)
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (discountSnap.empty) {
      return res.status(404).json({ error: 'Invalid or inactive promo code' })
    }

    const discountDoc = discountSnap.docs[0]
    const discount = discountDoc.data() || {}
    const {
      type,
      value,
      expiryDate,
      usageLimit,
      usageCount = 0,
    } = discount

    if (expiryDate && typeof expiryDate.toMillis === 'function' && expiryDate.toMillis() < Date.now()) {
      return res.status(400).json({ error: 'This promo code has expired' })
    }

    if (usageLimit != null && Number(usageCount) >= Number(usageLimit)) {
      return res.status(400).json({ error: 'This promo code has reached its usage limit' })
    }

    return res.status(200).json({
      discountId: discountDoc.id,
      type,
      value,
      code: normalizedCode,
    })
  } catch (error) {
    console.error('[validate-discount] Failed to validate discount', error)
    return res.status(500).json({ error: 'Failed to validate promo code' })
  }
}
