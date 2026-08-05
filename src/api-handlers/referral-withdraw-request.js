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

  // No minimum withdrawal — a vendor can withdraw any positive amount up to their
  // available balance (validated below against referralAvailable).
  const { amount } = req.body
  if (!amount || typeof amount !== 'number' || amount <= 0) {
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

    const storeData = storeSnap.data()

    if (!storeData.referralBankVerified) {
      return res.status(400).json({
        error: 'bank_not_setup',
        message: 'Please set up your bank account first.',
      })
    }

    const available = storeData.referralAvailable || 0
    if (amount > available) {
      return res.status(400).json({
        error: 'insufficient_balance',
        message: `Insufficient balance. Available: ₦${(available / 100).toLocaleString('en-NG')}`,
      })
    }

    const pendingSnap = await db
      .collection('withdrawal_requests')
      .where('userId', '==', uid)
      .where('status', 'in', ['pending', 'processing'])
      .limit(1)
      .get()

    if (!pendingSnap.empty) {
      return res.status(400).json({
        error: 'pending_withdrawal',
        message: 'You already have a pending withdrawal request.',
      })
    }

    // Full account number lives in stores/{uid}/private/referralBank — read it
    // server-side and denormalize onto the request so the admin can actually
    // pay it. withdrawal_requests has no client-readable rule, so it stays safe.
    const bank = await getReferralBank(db, uid)
    if (!bank.accountNumber) {
      return res.status(400).json({
        error: 'bank_not_setup',
        message: 'Please set up your bank account first.',
      })
    }

    await db.collection('withdrawal_requests').add({
      userId: uid,
      storeName: storeData.businessName || '',
      amount,
      bankName: bank.bankName,
      bankAccount: bank.accountNumber,
      bankAccountName: bank.accountName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    await storeRef.update({
      referralAvailable: available - amount,
      referralWithdrawn: (storeData.referralWithdrawn || 0) + amount,
    })

    return res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted. You will receive payment within 3 business days.',
    })
  } catch (err) {
    console.error('[referral-withdraw-request] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
