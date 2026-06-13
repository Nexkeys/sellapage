import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { sendEmail } from './_lib/send-email.js'
import { sendPush } from './_lib/send-push.js'

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
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const { token, rating, reviewText } = body || {}
    if (!token) {
      return res.status(400).json({ error: 'Review token is required' })
    }

    // Find order by review token using collectionGroup
    const ordersQuery = await db.collectionGroup('orders').where('reviewToken', '==', token).limit(1).get()
    if (ordersQuery.empty) {
      return res.status(404).json({ error: 'Invalid or expired review link' })
    }

    const orderDoc = ordersQuery.docs[0]
    const orderData = orderDoc.data() || {}

    if (orderData.reviewTokenUsed === true) {
      return res.status(400).json({ error: 'This review link has already been used' })
    }

    const numericRating = Number(rating)
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const storeId = orderData.storeId
    const itemId = orderData.itemId || ''
    const itemType = orderData.itemType || 'product'
    const itemName = orderData.itemName || ''
    const customerName = orderData.customerName || ''

    if (!storeId || !itemId) {
      return res.status(400).json({ error: 'Associated order missing item or store information' })
    }

    const cleanedReviewText = (typeof reviewText === 'string' ? reviewText.trim().slice(0, 500) : '')

    // Parent document reference
    const parentRef = db.collection('stores').doc(storeId).collection(itemType === 'service' ? 'services' : 'products').doc(itemId)

    // Add review
    const reviewsCol = parentRef.collection('reviews')
    await reviewsCol.add({
      rating: numericRating,
      reviewText: cleanedReviewText,
      customerName,
      orderId: orderDoc.id,
      createdAt: Timestamp.now(),
    })

    // Recompute aggregates
    const reviewsSnap = await reviewsCol.get()
    const reviewDocs = reviewsSnap.docs
    const reviewCount = reviewDocs.length
    let sum = 0
    reviewDocs.forEach(d => { const r = d.data()?.rating; if (Number.isFinite(r)) sum += Number(r) })
    const avg = reviewCount > 0 ? Number((sum / reviewCount).toFixed(1)) : 0

    await parentRef.update({ avgRating: avg, reviewCount })

    // Mark order token as used
    await orderDoc.ref.update({ reviewTokenUsed: true, reviewSubmitted: true })

    // Notify vendor (best-effort)
    try {
      const storeSnap = await db.collection('stores').doc(storeId).get()
      const storeData = storeSnap.data() || {}
      const emailTo = storeData.email
      const fcm = storeData.fcmToken
      const subject = `New ${numericRating}-star review on ${itemName || 'your item'}`
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
          <div style="background:#16a34a;padding:18px;color:#fff;font-weight:700;">${storeData.businessName || 'Sellapage'}</div>
          <div style="padding:20px;background:#fff;color:#111827;">
            <h2 style="margin:0 0 12px 0;">A customer left you a review</h2>
            <p style="margin:0 0 8px 0;"><strong>${customerName || 'A customer'}</strong></p>
            <p style="margin:0 0 8px 0;">${'★'.repeat(Math.max(0, Math.min(5, Math.round(numericRating))))}</p>
            <p style="color:#6b7280;margin:0 0 12px 0;">${cleanedReviewText || ''}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
            <p style="color:#9ca3af;font-size:12px;">This review was submitted via Sellapage.</p>
          </div>
        </div>
      `

      const pushTitle = `New ${numericRating}★ Review`
      const pushBody = `${customerName || 'A customer'} reviewed ${itemName || 'your item'}: ${cleanedReviewText || 'No written review'}`

      await Promise.all([
        emailTo ? sendEmail(emailTo, subject, html) : Promise.resolve(),
        fcm ? sendPush(fcm, pushTitle, pushBody, { itemId, storeId }) : Promise.resolve(),
      ]).catch(err => console.error('[Notify] partial failure', err))
    } catch (err) {
      console.error('[Notify] failed', err)
    }

    return res.status(200).json({ success: true, message: 'Review submitted successfully' })
  } catch (err) {
    console.error('[submit-review] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
