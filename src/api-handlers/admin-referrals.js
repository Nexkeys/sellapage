import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  const adminToken = req.headers['x-admin-token']

  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const action = req.query.action || 'list'

  try {
    const db = getAdminDb()

    if (action === 'stats') {
      const rewardsSnap = await db.collection('referralRewards').get()
      const withdrawalsSnap = await db.collection('withdrawal_requests').get()

      let totalRewardsPaid = 0
      let totalPending = 0
      let totalAvailable = 0
      let totalWithdrawn = 0
      const planBreakdown = { growth: 0, pro: 0, premium: 0 }

      rewardsSnap.docs.forEach(doc => {
        const d = doc.data()
        if (d.status === 'paid') totalRewardsPaid += d.rewardAmount || 0
        if (d.status === 'pending') totalPending += d.rewardAmount || 0
        if (planBreakdown[d.plan] !== undefined) planBreakdown[d.plan]++
      })

      let pendingWithdrawals = 0
      let completedWithdrawals = 0
      let totalWithdrawalAmount = 0

      withdrawalsSnap.docs.forEach(doc => {
        const d = doc.data()
        if (d.status === 'pending') {
          pendingWithdrawals++
          totalWithdrawalAmount += d.amount || 0
        }
        if (d.status === 'completed') completedWithdrawals++
      })

      return res.status(200).json({
        success: true,
        stats: {
          totalReferrals: rewardsSnap.size,
          totalRewardsPaid,
          totalPending,
          pendingWithdrawals,
          completedWithdrawals,
          totalWithdrawalAmount,
          planBreakdown,
        },
      })
    }

    if (action === 'rewards') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit

      const snap = await db
        .collection('referralRewards')
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get()

      const rewards = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }))

      return res.status(200).json({ success: true, rewards, page, limit })
    }

    if (action === 'withdrawals') {
      const statusFilter = req.query.status || 'all'
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit

      let query = db.collection('withdrawal_requests').orderBy('createdAt', 'desc')
      if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter)
      }

      const snap = await query.offset(offset).limit(limit).get()
      const withdrawals = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      return res.status(200).json({ success: true, withdrawals, page, limit })
    }

    if (action === 'process-withdrawal' && req.method === 'POST') {
      const { withdrawalId, status, note } = req.body
      if (!withdrawalId || !['completed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid parameters' })
      }

      const withdrawalRef = db.collection('withdrawal_requests').doc(withdrawalId)
      const withdrawalSnap = await withdrawalRef.get()

      if (!withdrawalSnap.exists) {
        return res.status(404).json({ error: 'Withdrawal not found' })
      }

      const withdrawalData = withdrawalSnap.data()
      if (withdrawalData.status !== 'pending') {
        return res.status(400).json({ error: 'Withdrawal already processed' })
      }

      const batch = db.batch()

      batch.update(withdrawalRef, {
        status,
        processedAt: new Date().toISOString(),
        processedBy: 'admin',
        note: note || '',
      })

      if (status === 'rejected') {
        const storeRef = db.collection('stores').doc(withdrawalData.userId)
        batch.update(storeRef, {
          referralAvailable: (withdrawalData.amount || 0),
        })
      }

      await batch.commit()

      return res.status(200).json({ success: true, message: `Withdrawal ${status}` })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-referrals] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
