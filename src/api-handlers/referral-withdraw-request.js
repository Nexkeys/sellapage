import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { getReferralBank } from './_lib/store-secrets.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // No minimum withdrawal - a vendor can withdraw any positive amount up to their
  // available balance (validated below against referralAvailable).
  // Must be a whole number of kobo: floats let a caller probe rounding behaviour,
  // and an unbounded value could overflow downstream formatting.
  const { amount } = req.body
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' })
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
    const storeRef = db.collection('stores').doc(uid)
    const storeSnap = await storeRef.get()

    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    // Full account number lives in stores/{uid}/private/referralBank - read it
    // server-side and denormalize onto the request so the admin can actually
    // pay it. withdrawal_requests has no client-readable rule, so it stays safe.
    // Read before the transaction: it's not a consistency-critical value, and
    // Firestore transactions require all reads to precede all writes.
    const bank = await getReferralBank(db, uid)
    if (!bank.accountNumber) {
      return res.status(400).json({
        error: 'bank_not_setup',
        message: 'Please set up your bank account first.',
      })
    }

    const withdrawalRef = db.collection('withdrawal_requests').doc()

    // The balance check and the balance mutation MUST be atomic. Previously
    // these were separate operations, so N concurrent requests could each read
    // the same balance, each pass the check, and each create a payable request
    // while the balance decremented only once - a straightforward double-spend.
    try {
      await db.runTransaction(async (tx) => {
        // ---- all reads first ----
        const freshStore = await tx.get(storeRef)
        if (!freshStore.exists) throw new Error('store_not_found')

        const data = freshStore.data()
        if (!data.referralBankVerified) throw new Error('bank_not_setup')

        const available = data.referralAvailable || 0
        if (amount > available) {
          const err = new Error('insufficient_balance')
          err.available = available
          throw err
        }

        const pendingSnap = await tx.get(
          db.collection('withdrawal_requests')
            .where('userId', '==', uid)
            .where('status', 'in', ['pending', 'processing'])
            .limit(1),
        )
        if (!pendingSnap.empty) throw new Error('pending_withdrawal')

        // ---- then all writes ----
        tx.set(withdrawalRef, {
          userId: uid,
          storeName: data.businessName || '',
          amount,
          bankName: bank.bankName,
          bankAccount: bank.accountNumber,
          bankAccountName: bank.accountName,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })

        // increment() rather than a computed value, so concurrent updates to
        // other referral fields can't clobber each other.
        tx.update(storeRef, {
          referralAvailable: FieldValue.increment(-amount),
          referralWithdrawn: FieldValue.increment(amount),
        })
      })
    } catch (txErr) {
      if (txErr.message === 'store_not_found') {
        return res.status(404).json({ error: 'Store not found' })
      }
      if (txErr.message === 'bank_not_setup') {
        return res.status(400).json({
          error: 'bank_not_setup',
          message: 'Please set up your bank account first.',
        })
      }
      if (txErr.message === 'insufficient_balance') {
        return res.status(400).json({
          error: 'insufficient_balance',
          message: `Insufficient balance. Available: ₦${((txErr.available || 0) / 100).toLocaleString('en-NG')}`,
        })
      }
      if (txErr.message === 'pending_withdrawal') {
        return res.status(400).json({
          error: 'pending_withdrawal',
          message: 'You already have a pending withdrawal request.',
        })
      }
      throw txErr
    }

    return res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted. You will receive payment within 3 business days.',
    })
  } catch (err) {
    console.error('[referral-withdraw-request] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
