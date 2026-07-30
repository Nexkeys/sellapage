import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

// Free/Starter vendors can generate unlimited receipts, but only the plain
// fields — everything branding-related silently drops for them here too
// (defense in depth; the UI already hides these fields for Free/Starter).
function sanitizeForPlan(payload, plan) {
  if (plan === 'growth' || plan === 'pro' || plan === 'premium') return payload
  return {
    ...payload,
    templateId: null,
    primaryColor: null,
    secondaryColor: null,
    fontFamily: null,
    stampType: null,
    stampUrl: null,
    stampPosition: null,
    qrCodeEnabled: false,
    qrCodeUrl: null,
    qrCodePosition: null,
    logoUrl: null,
    logoPosition: null,
    customFields: [],
  }
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

  const { storeId, receipt } = req.body
  if (!storeId || !receipt) {
    return res.status(400).json({ error: 'Missing required fields: storeId, receipt' })
  }
  if (!receipt.customerName || !Array.isArray(receipt.items) || receipt.items.length === 0) {
    return res.status(400).json({ error: 'A receipt needs at least a customer name and one line item.' })
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

    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const storeData = storeSnap.data() || {}
    const plan = storeData.hasPremiumFeatures ? 'premium' : storeData.hasProFeatures ? 'pro' : storeData.hasGrowthFeatures ? 'growth' : (storeData.plan || 'starter')

    const counterRef = storeRef.collection('meta').doc('receiptCounter')
    const receiptRef = storeRef.collection('receipts').doc()

    const receiptNumber = await db.runTransaction(async (t) => {
      const counterSnap = await t.get(counterRef)
      const nextValue = (counterSnap.exists ? Number(counterSnap.data()?.value) || 0 : 0) + 1
      t.set(counterRef, { value: nextValue }, { merge: true })

      const nowIso = new Date().toISOString()
      const basePayload = {
        receiptNumber: `RCP-${String(nextValue).padStart(5, '0')}`,

        vendorName: storeData.businessName || '',
        vendorAddress: receipt.vendorAddress || storeData.address || '',
        vendorPhone: storeData.whatsappNumber || '',
        vendorEmail: storeData.email || '',

        customerName: receipt.customerName.trim(),
        customerPhone: receipt.customerPhone || '',
        customerEmail: receipt.customerEmail || '',

        items: receipt.items.map((item) => ({
          label: item.label || '',
          qty: Number(item.qty) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.qty || 1) * Number(item.unitPrice || 0),
        })),

        subtotal: Number(receipt.subtotal) || 0,
        discount: Number(receipt.discount) || 0,
        tax: Number(receipt.tax) || 0,
        total: Number(receipt.total) || 0,
        amountPaid: Number(receipt.amountPaid) || 0,
        balanceDue: Number(receipt.balanceDue) || 0,

        paymentMethod: receipt.paymentMethod || 'Cash',
        status: receipt.status || 'Paid',
        notes: receipt.notes || '',
        date: receipt.date || nowIso.split('T')[0],

        templateId: receipt.templateId || 'template-1',
        primaryColor: receipt.primaryColor || '#22c55e',
        secondaryColor: receipt.secondaryColor || '#0f172a',
        fontFamily: receipt.fontFamily || 'Helvetica',

        stampType: receipt.stampType || null,
        stampUrl: receipt.stampUrl || null,
        stampPosition: receipt.stampPosition || 'bottom-right',

        qrCodeEnabled: !!receipt.qrCodeEnabled,
        qrCodeUrl: receipt.qrCodeUrl || null,
        qrCodePosition: receipt.qrCodePosition || 'bottom-left',

        logoUrl: receipt.logoUrl || storeData.logoUrl || null,
        logoPosition: receipt.logoPosition || 'top-center',

        customFields: Array.isArray(receipt.customFields) ? receipt.customFields.slice(0, 20) : [],

        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: decodedToken.uid,
        createdByName: storeData.businessName || 'Vendor',
        editedAt: null,
        editedBy: null,
        editedByName: null,
      }

      t.set(receiptRef, sanitizeForPlan(basePayload, plan))
      return basePayload.receiptNumber
    })

    const savedSnap = await receiptRef.get()
    return res.status(200).json({ id: receiptRef.id, receiptNumber, ...savedSnap.data() })
  } catch (err) {
    console.error('[receipt-create] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
