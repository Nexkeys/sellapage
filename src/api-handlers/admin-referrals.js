import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdmin } from './_lib/verify-admin.js'

// The payout queue lives in this file but is its own tab ("Payouts"). Checking
// it against 'referrals' meant someone given only Payouts could not open it,
// someone given only Referrals could approve money, and approving a payout
// never asked for the authenticator code (sudo mode is keyed by tab).
const PAYOUT_ACTIONS = new Set(['withdrawals', 'process-withdrawal'])
const referralsTabFor = (action) => (PAYOUT_ACTIONS.has(String(action || '')) ? 'withdrawals' : 'referrals')

// ── The referral network, from the stores themselves ─────────────────────────
// A store that signed up with a code carries `referredBy` (the referrer's store
// id) from the moment it is created (signup-phone.js). referralRewards only
// exist once a referred store PAYS, so building the network from rewards hid
// every referred store still on the free plan. Stats and the leaderboard now
// come from `referredBy`; rewards and withdrawals add the money.
//
// One read per store (only the fields below), shared by stats and referrers
// for a minute per instance: the tab asks for both at once.
const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const ms = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v._seconds) return v._seconds * 1000
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}
function paidNow(d, now) {
  const plan = String(d.plan || '').toLowerCase()
  if (!PAID_PLANS.has(plan) || d.planStatus === 'expired') return false
  const end = ms(d.planEndDate)
  if (!end) return true
  return now <= (ms(d.graceUntil) || end + 2 * 24 * 60 * 60 * 1000)
}
let networkCache = { at: 0, data: null }
async function readNetwork(db, fresh = false) {
  if (!fresh && networkCache.data && Date.now() - networkCache.at < 60 * 1000) return networkCache.data
  const [storesSnap, rewardsSnap, withdrawalsSnap] = await Promise.all([
    db.collection('stores').select('referredBy', 'referralCode', 'businessName', 'storeName', 'plan', 'planStatus', 'planEndDate', 'graceUntil',
      'createdAt', 'email', 'whatsappNumber', 'referralAvailable', 'referralTotalEarned', 'referralCreditedToReferrer').get(),
    db.collection('referralRewards').get(),
    db.collection('withdrawal_requests').get(),
  ])
  const now = Date.now()
  const stores = new Map(storesSnap.docs.map((d) => [d.id, d.data()]))
  const groups = new Map()
  const group = (id) => {
    if (!groups.has(id)) groups.set(id, { referrerId: id, referred: [], totalEarned: 0, rewards: 0, pendingPayoutAmount: 0, paidOutAmount: 0 })
    return groups.get(id)
  }
  let referredTotal = 0
  let referredPaying = 0
  let referredEverPaid = 0
  const planNow = { growth: 0, pro: 0, premium: 0 }
  for (const [id, d] of stores) {
    if (!d.referredBy) continue
    referredTotal += 1
    const paying = paidNow(d, now)
    const plan = String(d.plan || 'starter').toLowerCase()
    if (paying) { referredPaying += 1; if (planNow[plan] !== undefined) planNow[plan] += 1 }
    if (Number(d.referralCreditedToReferrer) > 0) referredEverPaid += 1
    group(String(d.referredBy)).referred.push({
      storeId: id, storeName: d.businessName || d.storeName || 'Unnamed store', slug: d.storeName || '',
      plan, paying, everPaid: Number(d.referralCreditedToReferrer) > 0, createdAt: ms(d.createdAt) || null, rewardAmount: 0,
    })
  }
  const rewardsByReferred = {}
  let totalRewardsEarned = 0
  const rewardPlans = { growth: 0, pro: 0, premium: 0 }
  rewardsSnap.docs.forEach((doc) => {
    const r = doc.data()
    const refId = r.referrerId || r.referrerUserId
    totalRewardsEarned += r.rewardAmount || 0
    if (rewardPlans[r.plan] !== undefined) rewardPlans[r.plan] += 1
    if (!refId) return
    const g = group(String(refId))
    g.totalEarned += r.rewardAmount || 0
    g.rewards += 1
    if (r.referredUserId) rewardsByReferred[r.referredUserId] = (rewardsByReferred[r.referredUserId] || 0) + (r.rewardAmount || 0)
  })
  let pendingWithdrawals = 0
  let totalPendingPayoutAmount = 0
  let totalPaidOut = 0
  let completedWithdrawals = 0
  withdrawalsSnap.docs.forEach((doc) => {
    const w = doc.data()
    if (w.status === 'pending') { pendingWithdrawals += 1; totalPendingPayoutAmount += w.amount || 0 }
    if (w.status === 'completed') { completedWithdrawals += 1; totalPaidOut += w.amount || 0 }
    if (!w.userId || !groups.has(String(w.userId))) return
    const g = groups.get(String(w.userId))
    if (w.status === 'pending') g.pendingPayoutAmount += w.amount || 0
    if (w.status === 'completed') g.paidOutAmount += w.amount || 0
  })
  const referrers = [...groups.values()].filter((g) => g.referred.length || g.rewards).map((g) => {
    const s = stores.get(g.referrerId) || {}
    g.referred.forEach((v) => { v.rewardAmount = rewardsByReferred[v.storeId] || 0 })
    g.referred.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return {
      referrerId: g.referrerId,
      storeName: s.businessName || s.storeName || 'A store that no longer exists',
      slug: s.storeName || '',
      referralCode: s.referralCode || '',
      email: s.email || '',
      whatsappNumber: s.whatsappNumber || '',
      plan: String(s.plan || 'starter').toLowerCase(),
      totalReferrals: g.referred.length,
      paying: g.referred.filter((v) => v.paying).length,
      free: g.referred.filter((v) => !v.paying).length,
      totalEarned: g.totalEarned,
      availableBalance: s.referralAvailable || 0,
      pendingPayoutAmount: g.pendingPayoutAmount,
      paidOutAmount: g.paidOutAmount,
      lastReferralAt: g.referred[0]?.createdAt || null,
      referredVendors: g.referred,
    }
  })
  const data = {
    referrers,
    stats: {
      // Every store that signed up with a code, free or paying.
      totalReferrals: referredTotal,
      referredPaying,
      referredFree: referredTotal - referredPaying,
      referredEverPaid,
      conversionRate: referredTotal ? Math.round((referredEverPaid / referredTotal) * 1000) / 10 : 0,
      referrers: referrers.length,
      totalRewardsEarned,
      totalPaidOut,
      totalPendingPayoutAmount,
      pendingWithdrawals,
      completedWithdrawals,
      // Plans the referred stores are paying for right now.
      planBreakdown: planNow,
      // Kept for anything that read the old meaning (rewards per plan).
      rewardPlanBreakdown: rewardPlans,
    },
  }
  networkCache = { at: Date.now(), data }
  return data
}

export default async function handler(req, res) {
  const action = req.query.action || 'list'
  const admin = await verifyAdmin(req, referralsTabFor(action))
  if (!admin) return res.status(403).json({ error: 'Forbidden' })


  try {
    const db = getAdminDb()

    if (action === 'stats') {
      const net = await readNetwork(db, req.query.fresh === '1')
      return res.status(200).json({ success: true, stats: net.stats })
    }

    if (action === 'referrers') {
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50)
      const net = await readNetwork(db, req.query.fresh === '1')
      const q = String(req.query.search || '').trim().toLowerCase()
      const show = String(req.query.show || 'all')
      let rows = net.referrers
      if (q) rows = rows.filter((r) => [r.storeName, r.slug, r.referralCode, r.email].some((v) => String(v || '').toLowerCase().includes(q)))
      if (show === 'paying') rows = rows.filter((r) => r.paying > 0)
      else if (show === 'free_only') rows = rows.filter((r) => r.paying === 0)
      const sort = String(req.query.sort || 'referred')
      const by = {
        referred: (a, b) => b.totalReferrals - a.totalReferrals || b.paying - a.paying || b.totalEarned - a.totalEarned,
        paying: (a, b) => b.paying - a.paying || b.totalReferrals - a.totalReferrals,
        earned: (a, b) => b.totalEarned - a.totalEarned || b.totalReferrals - a.totalReferrals,
        recent: (a, b) => (b.lastReferralAt || 0) - (a.lastReferralAt || 0),
      }[sort] || ((a, b) => b.totalReferrals - a.totalReferrals)
      rows = rows.slice().sort(by)
      const offset = (page - 1) * limit
      return res.status(200).json({ success: true, referrers: rows.slice(offset, offset + limit), page, limit, total: rows.length })
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

      networkCache = { at: 0, data: null }
      return res.status(200).json({ success: true, message: `Withdrawal ${status}`, emailSent })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-referrals] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
