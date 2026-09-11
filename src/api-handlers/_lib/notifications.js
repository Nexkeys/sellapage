// src/api-handlers/_lib/notifications.js
//
// The per-vendor notification feed that sits behind the bell in the mobile app.
//
// WHY: before this, no event anywhere wrote a record whose purpose was being a
// notification. Orders, bookings, reviews and subscriptions each fired a push
// and left a DOMAIN record behind (an order, a review), but a push that is not
// persisted cannot appear in a bell afterwards, and several events (courier
// movement in particular) left nothing at all.
//
// Records live at stores/{storeId}/notifications/{id}, written only through the
// Admin SDK. Rules give the owner read and deny client writes; staff read
// through an authenticated handler, because rules gate subcollections on
// `uid == storeId` and a staff uid never matches.
//
// Broadcasts are NOT written here. A platform message to a thousand vendors
// would be a thousand documents for one piece of text; those live once in
// `broadcasts` and are merged into the feed at read time.
import { FieldValue } from 'firebase-admin/firestore'
import { sendPushToStore } from './push-devices.js'

export const NOTIFICATIONS = 'notifications'

// Every push in the system carries data.type, and the app switches on it to
// decide where a tap goes. Kept here as the single list so a new sender cannot
// invent a value the app has never heard of.
export const NOTIFICATION_TYPES = [
  'new_order',
  'new_booking',
  'order_delivered',
  'booking_completed',
  'delivery_update',
  'new_review',
  'subscription',
  'security_alert',
  'broadcast',
]

/**
 * Writes one feed record. Never throws.
 *
 * Every call site is inside a payment webhook or a status update that has
 * already committed money or state by the time it runs. A feed write failing
 * must not turn a successful order into a 500 and a Paystack retry.
 */
export async function recordNotification(db, storeId, { type, title, body, data = {} }) {
  if (!storeId || !type) return null

  try {
    const ref = await db
      .collection('stores')
      .doc(storeId)
      .collection(NOTIFICATIONS)
      .add({
        type,
        title: String(title || '').slice(0, 120),
        body: String(body || '').slice(0, 400),
        // Stored as given rather than stringified. The push payload needs
        // strings because FCM demands them; a Firestore document does not, and
        // the app reads ids back out of here to route a tap.
        data: data || {},
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
    return ref.id
  } catch (err) {
    console.error('[notifications] record failed:', err?.message || err)
    return null
  }
}

/**
 * Push the store's devices AND leave a record, which is what almost every
 * caller actually wants. Returns the push result for logging.
 *
 * Both halves swallow their own errors, so this is safe to call without a
 * try/catch, though existing sites already have one.
 */
export async function notifyStore(db, storeId, { type, title, body, data = {} }) {
  const [push, notificationId] = await Promise.all([
    sendPushToStore(storeId, { title, body, data: { ...data, type } }),
    recordNotification(db, storeId, { type, title, body, data }),
  ])

  return { ...push, notificationId }
}
