// src/api-handlers/order-track.js
//
// Public order tracking lookup.
//
//   GET /api/order-track?slug=<store>&id=<orderId>
//
// WHY THIS RUNS SERVER SIDE
// Orders and bookings are owner-read-only in firestore.rules and must stay that
// way. Rather than open them to the public, the lookup runs here on the Admin
// SDK and returns a hand-picked set of tracking fields. The customer's own
// address, phone, email, the Paystack reference and the vendor's internal notes
// never leave the server.
//
// WHY AN ID ALONE IS ENOUGH
// Order ids are Firestore auto ids: 20 random characters, roughly 119 bits of
// entropy. That is not a sequential reference number a stranger can walk, it is
// effectively a secret token, so holding it is the authorisation. Demanding a
// phone number as well would only punish the customer who ordered three times
// from the same shop and got three different ids.
//
// NOTHING HERE MUTATES. This endpoint reads.

import { getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { isTrackingLive } from '../utils/storeDesign.js'

/** Only the fields a customer needs to see about their own order. */
function publicOrder(id, d, cfg) {
  const items = Array.isArray(d.cartItems)
    ? d.cartItems.map((i) => ({
        name: String(i?.name || 'Item').slice(0, 120),
        quantity: Number(i?.quantity) || 1,
      }))
    : []

  return {
    id,
    kind: 'order',
    status: String(d.status || 'pending').toLowerCase(),
    placedAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
    // First name only. Enough to confirm the customer has the right order,
    // without publishing a full name to anyone holding the link.
    firstName: String(d.customerName || '').trim().split(/\s+/)[0] || '',
    items: cfg.showItems ? items : [],
    itemsSummary: cfg.showItems && !items.length ? String(d.items || '').slice(0, 300) : '',
    total: cfg.showTotal ? Number(d.grandTotal ?? d.total) || null : null,
    courier: String(d.courierName || '').slice(0, 60),
    trackingCode: String(
      d.courierTrackingCode || d.sendboxTrackingId || d.SendboxTrackingId || d.topshipTrackingId || '',
    ).slice(0, 60),
    // The vendor's own waybill link is safe to pass on; it is the courier's.
    trackingUrl: /^https?:\/\//.test(d.courierTrackingUrl || d.topshipTrackingUrl || '')
      ? d.courierTrackingUrl || d.topshipTrackingUrl
      : '',
    history: (Array.isArray(d.statusLog) ? d.statusLog : [])
      .map((e) => ({
        status: String(e?.status || '').toLowerCase(),
        at: e?.changedAt || null,
      }))
      .filter((e) => e.status)
      .slice(-12),
  }
}

function publicBooking(id, d, cfg) {
  return {
    id,
    kind: 'booking',
    status: String(d.status || 'pending').toLowerCase(),
    placedAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
    firstName: String(d.customerName || '').trim().split(/\s+/)[0] || '',
    serviceName: cfg.showItems ? String(d.serviceName || '').slice(0, 120) : '',
    bookingDate: String(d.bookingDate || '').slice(0, 40),
    bookingTime: String(d.bookingTime || '').slice(0, 40),
    total: cfg.showTotal ? Number(d.grandTotal ?? d.servicePrice) || null : null,
    items: [],
    history: (Array.isArray(d.statusLog) ? d.statusLog : [])
      .map((e) => ({
        status: String(e?.status || '').toLowerCase(),
        at: e?.changedAt || null,
      }))
      .filter((e) => e.status)
      .slice(-12),
  }
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const slug = String(req.query.slug || '').trim().toLowerCase()
  const rawId = String(req.query.id || '').trim()

  if (!slug) return res.status(400).json({ error: 'Missing store' })

  // Firestore ids are a bounded character set. Rejecting anything else keeps a
  // malformed id from ever reaching a document path.
  const id = rawId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128)
  if (!id) return res.status(400).json({ error: 'missing_id', message: 'Enter your order ID.' })

  try {
    const db = getAdminDb()

    const storeSnap = await db.collection('stores').where('storeName', '==', slug).limit(1).get()
    if (storeSnap.empty) return res.status(404).json({ error: 'store_not_found' })

    const storeDoc = storeSnap.docs[0]
    const store = { id: storeDoc.id, ...storeDoc.data() }

    // Same two keys as every other part of the design: the plan must allow it
    // and the vendor must have switched this page on.
    if (!isTrackingLive(store)) return res.status(404).json({ error: 'tracking_off' })

    const cfg = store.storeDesign?.tracking || {}
    const storeRef = storeDoc.ref

    const orderSnap = await storeRef.collection('orders').doc(id).get()
    if (orderSnap.exists) {
      return res.status(200).json({ success: true, record: publicOrder(orderSnap.id, orderSnap.data(), cfg) })
    }

    const bookingSnap = await storeRef.collection('bookings').doc(id).get()
    if (bookingSnap.exists) {
      return res.status(200).json({ success: true, record: publicBooking(bookingSnap.id, bookingSnap.data(), cfg) })
    }

    // Deliberately the same response whether the id is malformed or simply not
    // this vendor's, so the endpoint cannot be used to confirm that an id
    // exists somewhere else on the platform.
    return res.status(404).json({ error: 'not_found' })
  } catch (err) {
    console.error('[order-track] error:', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
