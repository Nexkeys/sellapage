import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { setReferralBank } from './_lib/store-secrets.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('[referral-bank-save] PAYSTACK_SECRET_KEY is not set')
    return res.status(500).json({
      error: 'payment_not_configured',
      message: 'Bank verification is not available right now. Please contact support.',
    })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { bankName, bankCode, accountNumber } = body || {}
  if (!bankName || !bankCode || !accountNumber) {
    return res.status(400).json({
      error: 'missing_fields',
      message: 'Please select a bank and enter your account number.',
    })
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    return res.status(400).json({
      error: 'invalid_account_number',
      message: 'Account number must be exactly 10 digits.',
    })
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

    const resolveUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    console.log(`[referral-bank-save] Resolving account: bank=${bankName} code=${bankCode} number=${accountNumber}`)

    const resolveRes = await fetch(resolveUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const resolveData = await resolveRes.json()
    console.log(`[referral-bank-save] Paystack response: status=${resolveRes.ok} payload=`, JSON.stringify(resolveData))

    if (resolveRes.status === 401 || resolveRes.status === 403) {
      console.error('[referral-bank-save] Paystack auth failed. Status:', resolveRes.status)
      return res.status(500).json({
        error: 'paystack_auth_failed',
        message: 'Bank verification is temporarily unavailable. Please try again later.',
      })
    }

    if (!resolveRes.ok || resolveData.status === false) {
      const psMsg = resolveData.message || ''
      const psCode = resolveData.code || ''
      const lowerMsg = psMsg.toLowerCase()

      if (psCode === 'invalid_bank_code' || (lowerMsg.includes('bank') && lowerMsg.includes('invalid'))) {
        return res.status(400).json({
          error: 'invalid_bank',
          message: 'This bank could not be recognized. Please re-select your bank from the list.',
        })
      }

      if (psCode === 'invalid_account' || lowerMsg.includes('account') && (lowerMsg.includes('not found') || lowerMsg.includes('does not exist') || lowerMsg.includes('could not resolve'))) {
        return res.status(400).json({
          error: 'account_not_found',
          message: `This account number doesn't exist at ${bankName}. Please double-check your account number.`,
        })
      }

      if (lowerMsg.includes('bank') && lowerMsg.includes('not recognized')) {
        return res.status(400).json({
          error: 'invalid_bank',
          message: 'This bank could not be recognized. Please re-select your bank from the list.',
        })
      }

      return res.status(400).json({
        error: 'resolve_failed',
        message: 'Could not verify this account. Please check your bank and account number, then try again.',
      })
    }

    const accountName = resolveData.data?.account_name
    if (!accountName) {
      console.error('[referral-bank-save] No account_name in response:', JSON.stringify(resolveData))
      return res.status(400).json({
        error: 'no_account_name',
        message: 'Could not retrieve the account holder name. Please try again.',
      })
    }

    // Full account number + bank code go to stores/{uid}/private/referralBank
    // (server-only). Only the masked number and display fields land on the
    // world-readable store doc.
    const publicFields = await setReferralBank(db, uid, {
      bankName,
      bankCode,
      accountNumber,
      accountName,
    })
    await db.collection('stores').doc(uid).update(publicFields)

    console.log(`[referral-bank-save] Bank saved successfully for uid=${uid}: ${bankName} - ${accountName}`)

    return res.status(200).json({
      success: true,
      accountName,
    })
  } catch (err) {
    console.error('[referral-bank-save] Unexpected error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong. Please try again.',
    })
  }
}
