import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

// Receipts are editable after generation (not locked like invoices), per plan.
const EDITABLE_FIELDS = [
  'customerName', 'customerPhone', 'customerEmail',
  'items', 'subtotal', 'discount', 'tax', 'total', 'amountPaid', 'balanceDue',
  'paymentMethod', 'status', 'notes', 'date',
  'templateId', 'primaryColor', 'secondaryColor', 'fontFamily',
  'stampType', 'stampUrl', 'stampPosition',
  'qrCodeEnabled', 'qrCodeUrl', 'qrCodePosition',
  'logoUrl', 'logoPosition',
  'customFields',
  'vendorAddress',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, receiptId, updates } = req.body
  if (!storeId || !receiptId || !updates) {
    return res.status(400).json({ error: 'Missing required fields: storeId, receiptId, updates' })
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

    const storeSnap = await db.collection('stores').doc(storeId).get()
    const storeData = storeSnap.data() || {}

    const payload = {}
    for (const key of EDITABLE_FIELDS) {
      if (key in updates) payload[key] = updates[key]
    }
    if (Array.isArray(payload.items)) {
      payload.items = payload.items.map((item) => ({
        label: item.label || '',
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.qty || 1) * Number(item.unitPrice || 0),
      }))
    }

    const nowIso = new Date().toISOString()
    payload.updatedAt = nowIso
    payload.editedAt = nowIso
    payload.editedBy = decodedToken.uid
    payload.editedByName = storeData.businessName || 'Vendor'

    await receiptRef.update(payload)
    const updatedSnap = await receiptRef.get()
    return res.status(200).json({ id: receiptRef.id, ...updatedSnap.data() })
  } catch (err) {
    console.error('[receipt-update] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
