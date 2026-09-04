import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

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

    // storeId defaults to the caller's own uid (unchanged behavior for owners
    // calling this without the param); an explicit storeId lets a staff
    // member with referral-program access view their store's stats.
    const uid = (req.query.storeId || decodedToken.uid)
    if (uid !== decodedToken.uid) {
      const access = await resolveStoreAccess(decodedToken.uid, uid, 'referral-program', false)
      if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })
    }
    const storeRef = db.collection('stores').doc(uid)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    let storeData = storeSnap.data()

    // Lazy sweep: referral earnings are now immediately available (no holding period),
    // but the old webhook stranded earnings in `referralPending` with no release
    // mechanism. Heal that on read - atomically move any leftover pending balance into
    // available. Idempotent: once referralPending is 0 this never runs again.
    if ((storeData.referralPending || 0) > 0) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(storeRef)
          const d = fresh.data() || {}
          const stranded = d.referralPending || 0
          if (stranded > 0) {
            tx.update(storeRef, {
              referralAvailable: (d.referralAvailable || 0) + stranded,
              referralPending: 0,
            })
          }
        })
        const refreshed = await storeRef.get()
        storeData = refreshed.data()
      } catch (sweepErr) {
        console.error('[referral-stats] pending sweep failed:', sweepErr)
        // Non-fatal - fall through and return the un-swept snapshot.
      }
    }

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
