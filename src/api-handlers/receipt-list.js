import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

// Returns the full receipt history for a store — client handles search and
// pagination in-memory, matching the convention already used for Orders,
// Bookings, Ledger, and Payouts in this app (no cursor-based pagination
// infrastructure needed at this data scale).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId } = req.query
  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
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
    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection('receipts')
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get()

    const receipts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return res.status(200).json({ receipts })
  } catch (err) {
    console.error('[receipt-list] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
