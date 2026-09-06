// src/api-handlers/abandoned-checkout-vendor.js
// Read only list of a store's abandoned checkouts, for the Orders tab.
//
// These documents hold customer name, email, phone and basket contents, and the
// collection is denied to clients in firestore.rules, so this handler is the
// only way a vendor sees them. Authenticated, Premium gated, and read only:
// there is deliberately no action here that edits or deletes a record.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { sweepExpired } from './_lib/abandoned-checkout.js'

const PAGE_SIZE = 20

/** Mirrors the gate in sella-ai.js:357 and _lib/loyalty.js. */
function isPremiumStore(storeData) {
  return (storeData?.hasPremiumFeatures ?? (storeData?.plan === 'premium')) === true
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const storeId = req.query.storeId
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Scoped to the orders tab, since that is where this surfaces. Read only.
    const access = await resolveStoreAccess(decoded.uid, storeId, 'orders', false)
    if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    if (!isPremiumStore(storeSnap.data() || {})) {
      return res.status(403).json({ error: 'premium_required' })
    }

    // 30 day retention, swept lazily rather than by a cron. This is the
    // deterministic half; recordCheckoutAttempt runs it occasionally too, which
    // catches stores whose vendor never opens this tab. Fire and forget: a
    // failed sweep must never stop a vendor seeing their list.
    sweepExpired(db, storeId)

    // Single field ordering, no composite index. Records are capped by the
    // 30 day retention sweep, so a store's collection stays small enough to
    // sort and page in memory, the same approach admin-referrals.js uses.
    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection('abandonedCheckouts')
      .get()

    const all = snap.docs.map((doc) => {
      const d = doc.data()
      const items = Array.isArray(d.cartItems) ? d.cartItems : []
      return {
        reference: doc.id,
        customerName: d.customerName || '',
        customerEmail: d.customerEmail || '',
        customerPhone: d.customerPhone || '',
        itemSummary: items.length
          ? items.map((i) => `${i.name} x${i.quantity}`).join(', ')
          : (d.kind === 'booking' ? 'Service booking' : ''),
        itemCount: items.reduce((n, i) => n + (Number(i.quantity) || 0), 0),
        grandTotal: Number(d.grandTotal) || 0,
        kind: d.kind || 'product',
        recovered: !!d.recoveredAt,
        reminderSent: d.reminderSent === true,
        whatsappClickedAt: d.whatsappClickedAt?.toDate?.()?.toISOString() || null,
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        recoveredAt: d.recoveredAt?.toDate?.()?.toISOString() || null,
      }
    })

    all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const start = (page - 1) * PAGE_SIZE

    // Recovery rate is the number a vendor actually cares about, and the lost
    // value is what makes them act on it.
    const recovered = all.filter((c) => c.recovered)
    const lost = all.filter((c) => !c.recovered)

    return res.status(200).json({
      success: true,
      checkouts: all.slice(start, start + PAGE_SIZE),
      total: all.length,
      page,
      totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
      summary: {
        abandoned: all.length,
        recovered: recovered.length,
        recoveredValue: recovered.reduce((n, c) => n + c.grandTotal, 0),
        lostValue: lost.reduce((n, c) => n + c.grandTotal, 0),
      },
    })
  } catch (err) {
    console.error('[abandoned-checkout-vendor] error', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
