import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SP-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
    const storeRef = db.collection('stores').doc(uid)
    const storeSnap = await storeRef.get()

    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeSnap.data()

    if (storeData.referralCode) {
      return res.status(200).json({
        success: true,
        referralCode: storeData.referralCode,
        existing: true,
      })
    }

    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db
        .collection('stores')
        .where('referralCode', '==', code)
        .limit(1)
        .get()
      if (existing.empty) break
      code = generateCode()
      attempts++
    }

    await storeRef.update({
      referralCode: code,
      referralPending: storeData.referralPending || 0,
      referralAvailable: storeData.referralAvailable || 0,
      referralWithdrawn: storeData.referralWithdrawn || 0,
      referralTotalEarned: storeData.referralTotalEarned || 0,
      referralTotalClicks: storeData.referralTotalClicks || 0,
      referralTotalSignups: storeData.referralTotalSignups || 0,
      referralTotalPaid: storeData.referralTotalPaid || 0,
      referralBankName: storeData.referralBankName || null,
      referralBankAccountName: storeData.referralBankAccountName || null,
      referralBankAccountMasked: storeData.referralBankAccountMasked || null,
      referralBankVerified: storeData.referralBankVerified || false,
      // Deliberately NOT re-writing referralBankAccount/-Code here: those now
      // live in stores/{uid}/private/referralBank, and echoing a stale copy
      // back onto this world-readable doc would undo the migration.
    })

    return res.status(200).json({
      success: true,
      referralCode: code,
      existing: false,
    })
  } catch (err) {
    console.error('[referral-generate-code] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong generating your referral code.',
    })
  }
}
