import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split('Bearer ')[1]

  // The decoded token used to be discarded, so this handler never learned who
  // the caller was: any authenticated user could increment any store's signup
  // counter, without limit and repeatedly.
  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(token)
  } catch (err) {
    console.error('[referral-signup] Token verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { referrerId } = req.body
  if (!referrerId || typeof referrerId !== 'string') {
    return res.status(400).json({ error: 'Missing referrerId' })
  }

  if (referrerId === decoded.uid) {
    return res.status(400).json({ error: 'Cannot refer yourself' })
  }

  try {
    const db = getAdminDb()
    const referrerRef = db.collection('stores').doc(referrerId)

    // One signup credit per referred user, ever - enforced by using the
    // referred user's uid as the attribution document ID, which makes a repeat
    // call a no-op rather than another increment.
    const attributionRef = db.collection('referralAttributions').doc(decoded.uid)

    const credited = await db.runTransaction(async (tx) => {
      const existing = await tx.get(attributionRef)
      if (existing.exists) return false

      const referrerSnap = await tx.get(referrerRef)
      if (!referrerSnap.exists) throw new Error('referrer_not_found')

      tx.set(attributionRef, {
        referrerId,
        at: FieldValue.serverTimestamp(),
      })
      tx.update(referrerRef, {
        referralTotalSignups: FieldValue.increment(1),
      })
      return true
    })

    return res.status(200).json({ success: true, credited })
  } catch (err) {
    if (err.message === 'referrer_not_found') {
      return res.status(404).json({ error: 'Referrer store not found' })
    }
    console.error('[referral-signup] Error:', err)
    return res.status(500).json({ error: 'Failed to update referral count' })
  }
}
