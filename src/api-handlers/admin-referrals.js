import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdmin } from './_lib/verify-admin.js'

export default async function handler(req, res) {
  const admin = await verifyAdmin(req, 'referrals')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const action = req.query.action || 'list'

  try {
    const db = getAdminDb()

    if (action === 'stats') {
      const rewardsSnap = await db.collection('referralRewards').get()
      const withdrawalsSnap = await db.collection('withdrawal_requests').get()

      // Legacy fields kept for any records predating the "available" reward
      // model (rewards are now created immediately-available, never 'paid'
      // or 'pending' on the referralRewards doc itself). Real payout truth
      // lives on withdrawal_requests below.
      let totalRewardsPaid = 0
      let totalPending = 0
      let totalRewardsEarned = 0
      const planBreakdown = { growth: 0, pro: 0, premium: 0 }

      const referrerTotals = {}
      rewardsSnap.docs.forEach(doc => {
        const d = doc.data()
        totalRewardsEarned += d.rewardAmount || 0
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
      let totalPaidOut = 0
      let totalPendingPayoutAmount = 0

      withdrawalsSnap.docs.forEach(doc => {
        const d = doc.data()
        if (d.status === 'pending') {
          pendingWithdrawals++
          totalWithdrawalAmount += d.amount || 0
          totalPendingPayoutAmount += d.amount || 0
        }
        if (d.status === 'completed') {
          completedWithdrawals++
          totalPaidOut += d.amount || 0
        }
      })

      return res.status(200).json({
        success: true,
        stats: {
          totalReferrals: rewardsSnap.size,
          totalRewardsEarned,
          totalRewardsPaid,
          totalPending,
          totalPaidOut,
          totalPendingPayoutAmount,
          pendingWithdrawals,
          completedWithdrawals,
          totalWithdrawalAmount,
          planBreakdown,
          highestEarner,
        },
      })
    }

    if (action === 'referrers') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      const rewardsSnap = await db.collection('referralRewards').get()
      const withdrawalsSnap = await db.collection('withdrawal_requests').get()

      const referrerGroups = {}
      rewardsSnap.docs.forEach(doc => {
        const d = doc.data()
        const refId = d.referrerId || d.referrerUserId
        if (!refId) return
        if (!referrerGroups[refId]) {
          referrerGroups[refId] = { referrerId: refId, totalReferrals: 0, totalEarned: 0, referredVendors: [] }
        }
        referrerGroups[refId].totalReferrals++
        referrerGroups[refId].totalEarned += d.rewardAmount || 0
        referrerGroups[refId].referredVendors.push({
          referredUserId: d.referredUserId || null,
          plan: d.plan || '',
          rewardAmount: d.rewardAmount || 0,
          status: d.status || '',
          createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
        })
      })

      const withdrawalTotals = {}
      withdrawalsSnap.docs.forEach(doc => {
        const d = doc.data()
        if (!d.userId) return
        if (!withdrawalTotals[d.userId]) withdrawalTotals[d.userId] = { pendingPayoutAmount: 0, paidOutAmount: 0 }
        if (d.status === 'pending') withdrawalTotals[d.userId].pendingPayoutAmount += d.amount || 0
        if (d.status === 'completed') withdrawalTotals[d.userId].paidOutAmount += d.amount || 0
      })

      const allReferrers = Object.values(referrerGroups)
        .map(r => ({
          ...r,
          pendingPayoutAmount: withdrawalTotals[r.referrerId]?.pendingPayoutAmount || 0,
          paidOutAmount: withdrawalTotals[r.referrerId]?.paidOutAmount || 0,
        }))
        .sort((a, b) => b.totalEarned - a.totalEarned)

      const total = allReferrers.length
      const offset = (page - 1) * limit
      const pageReferrers = allReferrers.slice(offset, offset + limit)

      const storeIds = new Set()
      pageReferrers.forEach(r => {
        storeIds.add(r.referrerId)
        r.referredVendors.forEach(v => { if (v.referredUserId) storeIds.add(v.referredUserId) })
      })

      const storeMap = {}
      if (storeIds.size) {
        const storeDocs = await Promise.all(
          [...storeIds].map(id => db.collection('stores').doc(id).get())
        )
        storeDocs.forEach(doc => {
          if (doc.exists) {
            const d = doc.data()
            storeMap[doc.id] = {
              storeName: d.storeName || d.handle || '',
              referralCode: d.referralCode || '',
              email: d.email || d.ownerEmail || '',
              whatsappNumber: d.whatsappNumber || '',
              referralAvailable: d.referralAvailable || 0,
            }
          }
        })
      }

      const enrichedReferrers = pageReferrers.map(r => ({
        referrerId: r.referrerId,
        storeName: storeMap[r.referrerId]?.storeName || 'Unknown',
        referralCode: storeMap[r.referrerId]?.referralCode || '',
        email: storeMap[r.referrerId]?.email || '',
        whatsappNumber: storeMap[r.referrerId]?.whatsappNumber || '',
        totalReferrals: r.totalReferrals,
        totalEarned: r.totalEarned,
        availableBalance: storeMap[r.referrerId]?.referralAvailable || 0,
        pendingPayoutAmount: r.pendingPayoutAmount,
        paidOutAmount: r.paidOutAmount,
        referredVendors: r.referredVendors.map(v => ({
          storeName: v.referredUserId ? (storeMap[v.referredUserId]?.storeName || 'Unknown') : 'Unknown',
          plan: v.plan,
          rewardAmount: v.rewardAmount,
          status: v.status,
          createdAt: v.createdAt,
        })).sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)),
      }))

      return res.status(200).json({ success: true, referrers: enrichedReferrers, page, limit, total })
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
      // `adminUid` is deliberately NOT read from the body any more. It used to
      // be self-asserted, so any admin could attribute an approval to a
      // colleague - and with the old shared token there was no way to tell who
      // really acted. It now comes from the verified identity.
      const { withdrawalId, status, note } = body
      if (!withdrawalId || !['completed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid parameters' })
      }

      const withdrawalRef = db.collection('withdrawal_requests').doc(withdrawalId)

      // Transactional: the old code read the withdrawal, checked its status,
      // then committed a batch - a check-then-act window in which two admins
      // clicking Approve at once could both pass the `pending` guard and both
      // refund the balance on rejection.
      let withdrawalData
      try {
        withdrawalData = await db.runTransaction(async (tx) => {
          const snap = await tx.get(withdrawalRef)
          if (!snap.exists) throw new Error('not_found')

          const data = snap.data()
          if (data.status !== 'pending') throw new Error('already_processed')

          const updateFields = {
            status,
            processedAt: new Date(),
            approvedBy: admin.uid,
            approvedByRole: admin.role,
            approvedAt: new Date(),
            note: note || '',
          }
          if (status === 'completed') {
            updateFields.paidAt = new Date()
          }

          tx.update(withdrawalRef, updateFields)

          if (status === 'rejected') {
            // Reverse the request-time balance move: the vendor handler did
            // referralAvailable -= amount and referralWithdrawn += amount when the
            // request was created, so a rejection must restore BOTH (increment, not
            // overwrite - the old code hard-set referralAvailable = amount, which
            // clobbered any other available balance and never restored referralWithdrawn).
            const storeRef = db.collection('stores').doc(data.userId)
            tx.update(storeRef, {
              referralAvailable: FieldValue.increment(data.amount || 0),
              referralWithdrawn: FieldValue.increment(-(data.amount || 0)),
            })
          }

          return data
        })
      } catch (txErr) {
        if (txErr.message === 'not_found') {
          return res.status(404).json({ error: 'Withdrawal not found' })
        }
        if (txErr.message === 'already_processed') {
          return res.status(400).json({ error: 'Withdrawal already processed' })
        }
        throw txErr
      }

      // Notify the vendor on BOTH outcomes (previously only 'completed' emailed).
      let emailSent = false
      try {
        const storeSnap = await db.collection('stores').doc(withdrawalData.userId).get()
        if (storeSnap.exists) {
          const storeData = storeSnap.data()
          const recipientEmail = storeData.email || storeData.ownerEmail
          if (recipientEmail) {
            const amountNaira = ((withdrawalData.amount || 0) / 100).toLocaleString()
            const greetName = storeData.storeName || storeData.businessName || 'there'
            if (status === 'completed') {
              await sendEmail(
                recipientEmail,
                `Sellapage - Payout Confirmed ₦${amountNaira}`,
                `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #16a34a;">Payout Confirmed</h2>
                    <p>Hi ${greetName},</p>
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
            } else {
              // rejected
              await sendEmail(
                recipientEmail,
                `Sellapage - Withdrawal Request Update`,
                `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Withdrawal Not Processed</h2>
                    <p>Hi ${greetName},</p>
                    <p>Your referral withdrawal request of <strong>₦${amountNaira}</strong> could not be processed at this time.</p>
                    ${note ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; color: #991b1b;">${note}</div>` : ''}
                    <p><strong>₦${amountNaira} has been returned to your available referral balance</strong>, so you can request a payout again anytime.</p>
                    <p style="color: #6b7280; font-size: 13px;">If you have questions, contact support.</p>
                  </div>`
              )
            }
            emailSent = true
          }
        }
      } catch (emailErr) {
        console.error('[admin-referrals] Email send failed:', emailErr.message)
      }

      await withdrawalRef.update({ emailSent })

      return res.status(200).json({ success: true, message: `Withdrawal ${status}`, emailSent })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-referrals] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
