// src/api-handlers/cac-request.js
// A vendor asking Sellapage to help them register a business with the CAC.
//
// This is a REQUEST, not a registration. Nothing here talks to the CAC. The
// vendor tells us what they want and how to reach them, and a human replies by
// WhatsApp or email from the admin panel. Pricing is handled in that reply,
// because it depends on the entity type and CAC's own fees, which change.
//
// Deliberately available on EVERY plan. CAC verification is Pro-gated, but the
// vendors who have no CAC at all are overwhelmingly on Starter and Growth.
// Gating the help behind Pro would hide it from almost everyone who needs it.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

const ENTITY_TYPES = ['business-name', 'limited-company', 'incorporated-trustees', 'not-sure']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const idToken = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeId = decoded.uid

    // GET: does this store already have an open request? Drives the UI so a
    // vendor sees "we have your request" instead of a form they already filled.
    if (req.method === 'GET') {
      const snap = await db
        .collection('cacRequests')
        .where('storeId', '==', storeId)
        .limit(5)
        .get()

      const open = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status !== 'closed' && r.status !== 'completed')
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0]

      return res.status(200).json({
        success: true,
        request: open
          ? {
              entityType: open.entityType,
              status: open.status,
              createdAt: open.createdAt?.toDate?.()?.toISOString() || null,
            }
          : null,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (!memoryRateLimit('cac-request', clientKey(req), 5, 3600000)) {
      return tooManyRequests(res)
    }

    let body = {}
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const entityType = String(body.entityType || '').trim()
    const contactEmail = String(body.contactEmail || '').trim().toLowerCase()
    const contactPhone = String(body.contactPhone || '').trim()
    const proposedName = String(body.proposedName || '').trim().slice(0, 200)
    const notes = String(body.notes || '').trim().slice(0, 1000)

    if (!ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ error: 'Please choose what you want to register.' })
    }
    if (!contactEmail || !contactEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    if (contactPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() || {}

    // One open request at a time. Without this a vendor who hears nothing back
    // for a day submits four more, and the admin list fills with duplicates of
    // the same person.
    const existing = await db
      .collection('cacRequests')
      .where('storeId', '==', storeId)
      .limit(10)
      .get()

    const hasOpen = existing.docs.some((d) => {
      const st = d.data().status
      return st !== 'closed' && st !== 'completed'
    })
    if (hasOpen) {
      return res.status(400).json({
        error: 'already_open',
        message: 'You already have a request with us. We will reach out shortly.',
      })
    }

    await db.collection('cacRequests').add({
      storeId,
      storeName: store.storeName || '',
      businessName: store.businessName || '',
      entityType,
      proposedName,
      contactEmail,
      contactPhone,
      notes,
      status: 'new',
      createdAt: new Date(),
      contactedAt: null,
      contactedBy: null,
    })

    return res.status(200).json({
      success: true,
      message: 'Request received. We will contact you shortly.',
    })
  } catch (err) {
    console.error('[cac-request] error', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
