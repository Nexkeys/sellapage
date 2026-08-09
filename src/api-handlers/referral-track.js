import { getAdminDb } from './_lib/firebase-admin.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Free-tier protection: on Spark, quota exhaustion is an outage, not a bill.
  if (!memoryRateLimit('referral-track', clientKey(req), 10, 60000)) {
    return tooManyRequests(res)
  }

  const { code } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid referral code' })
  }

  const normalizedCode = code.trim().toUpperCase()

  try {
    const db = getAdminDb()
    const storesRef = db.collection('stores')
    const snapshot = await storesRef.where('referralCode', '==', normalizedCode).limit(1).get()

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid referral code' })
    }

    const referrerDoc = snapshot.docs[0]
    const referrerId = referrerDoc.id
    const referrerData = referrerDoc.data()

    await referrerDoc.ref.update({
      referralTotalClicks: (referrerData.referralTotalClicks || 0) + 1,
    })

    return res.status(200).json({
      success: true,
      referrerId,
      storeSlug: referrerData.slug || null,
    })
  } catch (err) {
    console.error('[referral-track] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
