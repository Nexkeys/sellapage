import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { bankName, bankCode, accountNumber } = req.body
  if (!bankName || !bankCode || !accountNumber) {
    return res.status(400).json({ error: 'Missing bank name, code, or account number' })
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    return res.status(400).json({ error: 'Account number must be exactly 10 digits' })
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

    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const resolveData = await resolveRes.json()
    if (!resolveData.status || !resolveData.data?.account_name) {
      return res.status(400).json({
        error: 'account_not_found',
        message: 'Could not verify account. Please check your bank and account number.',
      })
    }

    await db.collection('stores').doc(uid).update({
      referralBankName: bankName,
      referralBankCode: bankCode,
      referralBankAccount: accountNumber,
      referralBankAccountName: resolveData.data.account_name,
      referralBankVerified: true,
    })

    return res.status(200).json({
      success: true,
      accountName: resolveData.data.account_name,
    })
  } catch (err) {
    console.error('[referral-bank-save] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
