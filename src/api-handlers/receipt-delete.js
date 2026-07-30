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

  const { storeId, receiptId } = req.body
  if (!storeId || !receiptId) {
    return res.status(400).json({ error: 'Missing required fields: storeId, receiptId' })
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

    const receiptRef = db.collection('stores').doc(storeId).collection('receipts').doc(receiptId)
    const receiptSnap = await receiptRef.get()
    if (!receiptSnap.exists) {
      return res.status(404).json({ error: 'Receipt not found' })
    }

    await receiptRef.delete()
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[receipt-delete] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
