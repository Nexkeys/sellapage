import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'

export default async function handler(req, res) {
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
      const planBreakdown = { growth: 0, pro: 0, premium: 0 }

      const referrerTotals = {}
      rewardsSnap.docs.forEach(doc => {
        const d = doc.data()
        if (d.status === 'paid') totalRewardsPaid += d.rewardAmount || 0
        if (d.status === 'pending') totalPending += d.rewardAmount || 0
        if (planBreakdown[d.plan] !== undefined) planBreakdown[d.plan]++
        const refId = d.referrerId || d.referrerUserId
        if (refId) {
          if (!referrerTotals[refId]) referrerTotals[refId] = { totalEarned: 0, totalReferrals: 0 }
          referrerTotals[refId].totalEarned += d.rewardAmount || 0
          referrerTotals[refId].totalReferrals++
        }
      })

      let highestEarner = null
      let maxEarned = 0
      for (const [refId, data] of Object.entries(referrerTotals)) {
        if (data.totalEarned > maxEarned) {
          maxEarned = data.totalEarned
          highestEarner = { refId, ...data }
        }
      }
      if (highestEarner) {
        try {
          const storeSnap = await db.collection('stores').doc(highestEarner.refId).get()
          if (storeSnap.exists) {
            const sd = storeSnap.data()
            highestEarner.storeName = sd.storeName || sd.handle || ''
            highestEarner.whatsappNumber = sd.whatsappNumber || ''
            highestEarner.email = sd.email || sd.ownerEmail || ''
          }
        } catch {}
        highestEarner.totalEarnedFormatted = `NGN ${(highestEarner.totalEarned / 100).toLocaleString()}`
      }

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
          highestEarner,
        },
      })
    }

    if (action === 'rewards') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20

      const snap = await db
        .collection('referralRewards')
        .limit(200)
        .get()

      const rewards = snap.docs
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

      const enrichedRewards = await Promise.all(
        rewards.map(async (r) => {
          let referredStoreName = r.referredUserId || 'Unknown'
          try {
            if (r.referredUserId) {
              const storeSnap = await db.collection('stores').doc(r.referredUserId).get()
              if (storeSnap.exists) {
                referredStoreName = storeSnap.data().storeName || storeSnap.data().handle || r.referredUserId
              }
            }
          } catch {}
          return { ...r, referredStoreName }
        })
      )

      const offset = (page - 1) * limit
      const paged = enrichedRewards.slice(offset, offset + limit)

      return res.status(200).json({ success: true, rewards: paged, page, limit, total: enrichedRewards.length })
    }

    if (action === 'withdrawals') {
      const statusFilter = req.query.status || 'all'
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20

      let query = db.collection('withdrawal_requests')
      if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter)
      }

      const snap = await query.limit(200).get()
      const withdrawals = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })

      const offset = (page - 1) * limit
      const paged = withdrawals.slice(offset, offset + limit)

      return res.status(200).json({ success: true, withdrawals: paged, page, limit, total: withdrawals.length })
    }

    if (action === 'process-withdrawal' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch {}
      const { withdrawalId, status, note, adminUid } = body
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

      const updateFields = {
        status,
        processedAt: new Date(),
        approvedBy: adminUid || 'admin',
        approvedAt: new Date(),
        note: note || '',
      }

      if (status === 'completed') {
        updateFields.paidAt = new Date()
      }

      const batch = db.batch()
      batch.update(withdrawalRef, updateFields)

      if (status === 'rejected') {
        const storeRef = db.collection('stores').doc(withdrawalData.userId)
        batch.update(storeRef, {
          referralAvailable: (withdrawalData.amount || 0),
        })
      }

      await batch.commit()

      let emailSent = false
      if (status === 'completed') {
        try {
          const storeSnap = await db.collection('stores').doc(withdrawalData.userId).get()
          if (storeSnap.exists) {
            const storeData = storeSnap.data()
            const recipientEmail = storeData.email || storeData.ownerEmail
            if (recipientEmail) {
              const amountNaira = ((withdrawalData.amount || 0) / 100).toLocaleString()
              await sendEmail(
                recipientEmail,
                `Sellapage - Payout Confirmed ₦${amountNaira}`,
                `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #16a34a;">Payout Confirmed</h2>
                    <p>Hi ${storeData.storeName || 'there'},</p>
                    <p>Your referral withdrawal request has been processed successfully.</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="margin: 4px 0;"><strong>Amount:</strong> ₦${amountNaira}</p>
                      <p style="margin: 4px 0;"><strong>Bank:</strong> ${withdrawalData.bankName || 'N/A'}</p>
                      <p style="margin: 4px 0;"><strong>Account:</strong> ${withdrawalData.bankAccount || 'N/A'}</p>
                      <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-NG')}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 13px;">If you have questions, contact support.</p>
                  </div>`
              )
              emailSent = true
            }
          }
        } catch (emailErr) {
          console.error('[admin-referrals] Email send failed:', emailErr.message)
        }

        await withdrawalRef.update({ emailSent })
      }

      return res.status(200).json({ success: true, message: `Withdrawal ${status}`, emailSent })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-referrals] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
