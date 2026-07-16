import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
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

    const uid = decodedToken.uid
    const storeSnap = await db.collection('stores').doc(uid).get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeSnap.data()

    const rewardsSnap = await db
      .collection('referralRewards')
      .where('referrerId', '==', uid)
      .limit(50)
      .get()

    const recentReferrals = rewardsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 20)

    return res.status(200).json({
      success: true,
      stats: {
        totalClicks: storeData.referralTotalClicks || 0,
        totalSignups: storeData.referralTotalSignups || 0,
        totalPaid: storeData.referralTotalPaid || 0,
        referralPending: storeData.referralPending || 0,
        referralAvailable: storeData.referralAvailable || 0,
        referralWithdrawn: storeData.referralWithdrawn || 0,
        referralTotalEarned: storeData.referralTotalEarned || 0,
      },
      recentReferrals,
    })
  } catch (err) {
    console.error('[referral-stats] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
