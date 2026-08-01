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

    const uid = (req.query.storeId || decodedToken.uid)
    if (uid !== decodedToken.uid) {
      const access = await resolveStoreAccess(decodedToken.uid, uid, 'referral-program', false)
      if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })
    }

    const snapshot = await db
      .collection('withdrawal_requests')
      .where('userId', '==', uid)
      .limit(50)
      .get()

    const withdrawals = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

    return res.status(200).json({
      success: true,
      withdrawals,
    })
  } catch (err) {
    console.error('[referral-withdrawals] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
