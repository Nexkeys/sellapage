import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid referral code' })
  }

  const normalizedCode = code.trim().toUpperCase()

  try {
    const db = getAdminDb()
    const snapshot = await db
      .collection('stores')
      .where('referralCode', '==', normalizedCode)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid referral code' })
    }

    const referrerDoc = snapshot.docs[0]

    return res.status(200).json({
      success: true,
      referrerId: referrerDoc.id,
      storeName: referrerDoc.data().storeName || null,
      slug: referrerDoc.data().slug || null,
    })
  } catch (err) {
    console.error('[referral-resolve-code] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
