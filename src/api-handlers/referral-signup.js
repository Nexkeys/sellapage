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

  try {
    const auth = getAdminAuth()
    await auth.verifyIdToken(token)
  } catch (err) {
    console.error('[referral-signup] Token verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { referrerId } = req.body
  if (!referrerId || typeof referrerId !== 'string') {
    return res.status(400).json({ error: 'Missing referrerId' })
  }

  try {
    const db = getAdminDb()
    const referrerRef = db.collection('stores').doc(referrerId)
    const referrerSnap = await referrerRef.get()

    if (!referrerSnap.exists) {
      return res.status(404).json({ error: 'Referrer store not found' })
    }

    await referrerRef.update({
      referralTotalSignups: FieldValue.increment(1),
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[referral-signup] Error:', err)
    return res.status(500).json({ error: 'Failed to update referral count' })
  }
}
