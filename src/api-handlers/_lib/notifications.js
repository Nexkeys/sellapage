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
  'new_lead',
  'abandoned_checkout',
  'discount_used',
  'loyalty_earned',
  'referral_signup',
  'referral_upgrade',
  'job_status',
  'domain_verified',
  'cac_status',
  'team_joined',
  'subscription',
  'plan_expiring',
  'plan_downgraded',
  'security_alert',
  'broadcast',
  'reminder',
]

const PLAN_RANK = { starter: 0, growth: 1, pro: 2, premium: 3 }

/**
 * Minimum plan that may RECEIVE each notification type.
 *
 * NOT INVENTED. Every entry is derived from the tab gate the vendor already
 * lives under in src/components/dashboard/DashboardLayout.jsx, so a vendor is
 * never notified about a screen they cannot open. If the tab gates move, move
 * these with them.
 *
 *   Pro and above     orders, bookings, delivery, payouts, customers,
 *                     reviews, discounts (searchableTabs, effectiveIsPro)
 *                     plus custom-domain and cac-verification, which are in the
 *                     nav for everyone but paywall internally on `if (!isPro)`
 *   Growth and above  analytics
 *   Premium only      team, loyalty, abandoned, meta-pixel, tiktok-pixel,
 *                     store-design
 *
 * Anything absent from this map is ungated, which is the correct default for
 * account-level events: a starter vendor must still hear that their plan
 * changed, that a referral signed up, or that someone signed into their account.
 */
const TYPE_MIN_PLAN = {
  new_order: 'pro',
  order_delivered: 'pro',
  new_booking: 'pro',
  booking_completed: 'pro',
  delivery_update: 'pro',
  new_review: 'pro',
  discount_used: 'pro',
  domain_verified: 'pro',
  cac_status: 'pro',
  abandoned_checkout: 'premium',
  loyalty_earned: 'premium',
  team_joined: 'premium',
}

/**
 * Whether a store on `plan` is entitled to a notification of `type`.
 *
 * Exported because the scheduled digests need the same answer without going
 * through notifyStore.
 */
export function planAllowsNotification(type, plan) {
  const required = TYPE_MIN_PLAN[type]
  if (!required) return true
  return (PLAN_RANK[plan] ?? 0) >= PLAN_RANK[required]
}

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
 * Never throws. Most call sites are payment webhooks or status writes that have
 * already committed real state by the time this runs, so a notification failure
 * must not become a 500 and a provider retry.
 *
 * PLAN GATE: skipped entirely when the store's plan is below the type's
 * minimum. Both halves are skipped, not just the push. Writing a record a
 * starter vendor can never act on would put an unread badge on their bell
 * pointing at a tab that is not in their nav.
 *
 * Pass `store` when the caller already has the document in hand, which most do.
 * It only avoids a re-read; the gate is applied either way.
 */
export async function notifyStore(db, storeId, { type, title, body, data = {} }, store = null, { allowUids = [] } = {}) {
  if (!storeId || !type) return { sent: 0, failed: 0, pruned: 0, skipped: 'missing_args' }

  try {
    let plan = store?.plan

    if (plan === undefined && TYPE_IS_GATED.has(type)) {
      const snap = await db.collection('stores').doc(storeId).get()
      plan = snap.data()?.plan
    }

    if (!planAllowsNotification(type, plan || 'starter')) {
      return { sent: 0, failed: 0, pruned: 0, skipped: 'plan' }
    }

    // `allowUids` reaches specific people regardless of their role's tabs, for
    // events that belong to a person rather than a tab (reminders). Staff
    // filtering for everything else happens inside sendPushToStore. The record
    // is store-wide; /api/notifications applies the same rule when reading it.
    const [push, notificationId] = await Promise.all([
      sendPushToStore(storeId, { title, body, data: { ...data, type } }, { allowUids }),
      recordNotification(db, storeId, { type, title, body, data }),
    ])

    return { ...push, notificationId }
  } catch (err) {
    console.error('[notifications] notifyStore failed:', err?.message || err)
    return { sent: 0, failed: 0, pruned: 0, skipped: 'error' }
  }
}

// Only gated types need the store read when the caller did not supply one.
const TYPE_IS_GATED = new Set(Object.keys(TYPE_MIN_PLAN))
