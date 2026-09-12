// src/api-handlers/_lib/notification-access.js
//
// Decides which PEOPLE linked to a store may receive a given notification.
//
// WHY THIS EXISTS
// A store's devices belong to the owner AND to staff. Before this module every
// linked device received every store notification, so a staff member whose role
// granted nothing but Products still got new_order pushes carrying customer
// names and amounts, and loyalty_earned pushes carrying the customer's loyalty
// code, which firestore.rules describes as a bearer token for money. A staff
// member deactivated by the owner also kept receiving everything until they
// happened to sign out. The same leak existed in the /api/notifications feed.
//
// THE RULE
// Staff are notified about exactly the tabs the dashboard shows them, no more.
// That is enforced with canStaffAccessTab from src/utils/staffRoles.js, the SAME
// function DashboardLayout.jsx uses to hide tabs from staff, so the two can never
// disagree about what a role can see.
//
// The owner (uid === storeId) receives everything, subject only to the plan gate
// in notifications.js, which is about the store's plan and is separate.
import { getAdminDb } from './firebase-admin.js'
import { resolveStoreAccess } from './verify-store-access.js'
import { canStaffAccessTab } from '../../utils/staffRoles.js'

/**
 * Notification type -> dashboard tab ids that justify a STAFF member seeing it.
 * A staff member qualifies if their role grants ANY listed tab.
 *
 * Tab ids are the dashboard ids stored on staff roles by the Role Builder
 * (ASSIGNABLE_TAB_LABELS in src/components/dashboard/TeamTab.jsx). Not invented.
 *
 * Three entries name tabs the Role Builder does NOT offer, so no staff role can
 * ever hold them, which makes those types owner-only in practice. That is
 * intentional and matches each tab's own handler:
 *   loyalty    loyalty-vendor.js gates on 'loyalty'
 *   reminders  reminders.js gates on 'reminders'; the CREATOR of a reminder is
 *              reached separately through `allowUids`, see reminders-cron.js
 *   abandoned  the Abandoned tab is hidden from staff by the dashboard. NOTE the
 *              abandoned-checkout-vendor.js and -send.js API handlers gate on
 *              'orders' instead, so Orders staff can read that data through the
 *              API despite the hidden tab. Recorded, not changed here; this map
 *              follows the stricter dashboard rule.
 *
 * delivery_update lists two tabs because the courier status is visible in both:
 * the Delivery tab's handlers gate on 'delivery', and OrdersTab.jsx renders the
 * courier-only in_transit status directly on the order.
 *
 * ANY TYPE NOT LISTED IS OWNER-ONLY. team_joined, subscription, plan_expiring,
 * plan_downgraded, referral_signup, referral_upgrade and security_alert are all
 * account or money events, and team, billing and referral-program are in
 * OWNER_ONLY_TABS. Default-deny also means a type added later without an entry
 * here fails safe rather than reaching every staff handset.
 */
export const TYPE_TABS = {
  new_order: ['orders'],
  order_delivered: ['orders'],
  delivery_update: ['delivery', 'orders'],
  new_booking: ['bookings'],
  booking_completed: ['bookings'],
  new_review: ['reviews'],
  discount_used: ['discounts'],
  new_lead: ['leads'],
  job_status: ['job-listings'],
  domain_verified: ['custom-domain'],
  cac_status: ['cac-verification'],
  loyalty_earned: ['loyalty'],
  abandoned_checkout: ['abandoned'],
  reminder: ['reminders'],
}

/**
 * Resolves who `uid` is relative to `storeId`, once.
 *
 * @returns {Promise<null | {owner: true, uid: string} | {owner: false, uid: string, role: {tabs: Array}}>}
 *   null means this person must receive nothing: no uid, not the owner, not an
 *   ACTIVE staff member of this store, or their role document is gone.
 */
export async function loadRecipient(storeId, uid) {
  if (!storeId || !uid) return null
  if (uid === storeId) return { owner: true, uid }

  // Store-level check with no tab: returns the membership's roleId for an ACTIVE
  // member and allowed:false for anyone else, deactivated staff included.
  const access = await resolveStoreAccess(uid, storeId, null)
  if (!access.allowed || !access.role) return null

  // Same document resolveStoreAccess reads for a tab check.
  const roleSnap = await getAdminDb()
    .collection('stores')
    .doc(storeId)
    .collection('staffRoles')
    .doc(String(access.role))
    .get()

  if (!roleSnap.exists) return null
  return { owner: false, uid, role: { tabs: roleSnap.data()?.tabs || [] } }
}

/**
 * Whether a resolved recipient may receive a notification of `type`.
 *
 * `allowUids` admits specific people regardless of tab, used for reminders so
 * the person who asked for one receives it. It never admits anyone who is not
 * an active member: loadRecipient has already returned null for them.
 */
export function recipientMayReceive(recipient, type, allowUids = []) {
  if (!recipient) return false
  if (recipient.owner) return true
  if (allowUids.includes(recipient.uid)) return true

  const tabs = TYPE_TABS[type]
  if (!tabs) return false
  return tabs.some((tab) => canStaffAccessTab(recipient.role, tab))
}

/**
 * Narrows a store's linked devices to the ones whose person may receive `type`.
 *
 * Each distinct linkedUid is resolved once per send, so a store with one owner
 * and a few staff costs a handful of reads regardless of how many devices each
 * person has. A failure resolving one person withholds only that person's
 * devices; it must never stop the owner being notified.
 */
export async function filterDevicesForType(storeId, devices, type, allowUids = []) {
  const recipients = new Map()
  const allowed = []

  for (const device of devices) {
    const uid = device.linkedUid || null

    if (!recipients.has(uid)) {
      let recipient = null
      try {
        recipient = await loadRecipient(storeId, uid)
      } catch (err) {
        console.error(`[notification-access] could not resolve ${uid} for ${storeId}:`, err?.message || err)
      }
      recipients.set(uid, recipient)
    }

    if (recipientMayReceive(recipients.get(uid), type, allowUids)) allowed.push(device)
  }

  return allowed
}
