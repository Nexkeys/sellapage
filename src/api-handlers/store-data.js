// src/api-handlers/store-data.js
// Read-only listing endpoint for staff callers. Products/Categories/Services/
// Orders/Bookings/Ledger/Customers/Discounts/Leads are all normally read via
// direct client Firestore SDK calls, gated by live rules requiring
// `request.auth.uid == storeId` — true for the owner, never true for staff
// (a different Firebase Auth uid). That silently denies every staff read,
// rendering as empty lists rather than an error. This endpoint uses
// firebase-admin (bypasses rules) + resolveStoreAccess to restore staff
// visibility without touching the owner's existing direct-Firestore path at
// all — client code only calls this when `auth.currentUser.uid !== storeId`.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

const SUBCOLLECTION_TYPES = {
  orders: 'orders',
  bookings: 'bookings',
  ledger: 'ledger',
  customers: 'customers',
  discounts: 'discounts',
  products: 'products',
  categories: 'categories',
  services: 'services',
}

function serializeDoc(doc) {
  const data = doc.data()
  const out = { id: doc.id }
  for (const [key, value] of Object.entries(data)) {
    out[key] = value?.toDate?.() ? value.toDate().toISOString() : value
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const { type, storeId } = req.query
  if (!type || !storeId) return res.status(400).json({ error: 'type and storeId are required' })

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const db = getAdminDb()

    if (type === 'leads') {
      const access = await resolveStoreAccess(decoded.uid, storeId, 'leads', false)
      if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })
      const snap = await db.collection('leads').where('storeId', '==', storeId).get()
      return res.status(200).json({ success: true, items: snap.docs.map(serializeDoc) })
    }

    if (type === 'analytics') {
      const access = await resolveStoreAccess(decoded.uid, storeId, 'analytics', false)
      if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })
      const snap = await db.collection('stores').doc(storeId).collection('analytics').doc('storeSummary').get()
      return res.status(200).json({ success: true, doc: snap.exists ? serializeDoc(snap) : null })
    }

    const collectionName = SUBCOLLECTION_TYPES[type]
    if (!collectionName) return res.status(400).json({ error: 'Invalid type' })

    const access = await resolveStoreAccess(decoded.uid, storeId, type, false)
    if (!access.allowed) {
      // A role simply not granted this tab is expected — the nav hides it
      // anyway — so return an empty list rather than an error.
      if (access.reason === 'tab_not_granted' || access.reason === 'read_only') {
        return res.status(200).json({ success: true, items: [] })
      }
      // Anything else (notably not_a_staff_member) means the caller should
      // never have been routed here at all. Fail LOUDLY: returning an empty
      // 200 for this case once made a client-side routing bug invisible —
      // signed-in visitors silently saw every public storefront as empty,
      // with nothing in the browser console or the Vercel logs to show why.
      console.warn(`[store-data] denied uid=${decoded.uid} store=${storeId} type=${type} reason=${access.reason}`)
      return res.status(403).json({ error: 'Forbidden', reason: access.reason })
    }

    const snap = await db.collection('stores').doc(storeId).collection(collectionName).get()
    return res.status(200).json({ success: true, items: snap.docs.map(serializeDoc) })
  } catch (err) {
    console.error('[store-data] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
