// src/api-handlers/_lib/store-counters.js
//
// Server-side analytics counters for things that are only real once money has
// moved: an order received, a booking received.
//
// WHY THESE ARE NOT WRITTEN FROM THE BROWSER
// Everything else a storefront counts is a signal - a view, a tap, a request -
// and a visitor inflating their own click count hurts nobody but the vendor's
// curiosity. An ORDER count is different: a vendor reads it as "how many sales
// did I get", so it has to come from the same place the order document does,
// after Paystack has confirmed payment, behind the same idempotency check. The
// Admin SDK bypasses rules, and the client-writable allowlist in
// firestore.rules deliberately does NOT include these fields.
//
// NOTHING HERE THROWS. A counter that fails to write must never turn a
// successful checkout into an error the customer sees.

import { FieldValue } from 'firebase-admin/firestore'

/**
 * The Lagos calendar day, matching src/utils/analytics.js exactly.
 *
 * Both sides have to agree or the dashboard would show a day's orders filed
 * under a different date than that day's views. Nigeria is UTC+1 with no
 * daylight saving.
 */
export function storeDay(d = new Date()) {
  try {
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(d)
      .reduce((a, x) => {
        a[x.type] = x.value
        return a
      }, {})
    if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`
  } catch {
    // Fall through to the fixed offset below.
  }
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Adds one to an all-time counter and to the same counter for today.
 *
 *   kind: 'order' | 'booking'
 */
export async function recordSale(db, storeId, kind) {
  if (!db || !storeId) return
  const summaryField = kind === 'booking' ? 'totalBookings' : 'totalOrders'
  const dailyField = kind === 'booking' ? 'bookings' : 'orders'
  const day = storeDay()
  const now = new Date()

  try {
    await Promise.all([
      db
        .collection('stores')
        .doc(storeId)
        .collection('analytics')
        .doc('storeSummary')
        .set({ [summaryField]: FieldValue.increment(1), updatedAt: now }, { merge: true }),
      db
        .collection('stores')
        .doc(storeId)
        .collection('analyticsDaily')
        .doc(day)
        .set({ date: day, [dailyField]: FieldValue.increment(1), updatedAt: now }, { merge: true }),
    ])
  } catch (err) {
    console.error(`[store-counters] ${kind} counter failed store=${storeId}:`, err?.message || err)
  }
}
