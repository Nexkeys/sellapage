// src/api-handlers/_lib/team-activity.js
//
// Tells the owner what a staff member just changed: the `team_activity`
// notification. Shared by every handler where a staff write is committed on
// the server: store-write.js (products, services, categories, discounts,
// ledger) and update-order-status.js / update-booking-status.js.
//
// Owner writes are silent by design. Telling someone what they just did
// themselves is noise.
//
// THROTTLED: one PUSH per staff member per window. Somebody editing twenty
// products, or moving twenty orders to dispatched, in one sitting is one
// afternoon of work, not twenty interruptions, and an owner who gets twenty
// buzzes turns notifications off and loses the order alerts too. The BELL
// RECORD is written every single time, so the full list is there when they
// look. The clock lives at stores/{id}/meta/teamActivity, server-only in
// firestore.rules.
import { notifyStore, recordNotification } from './notifications.js'

export const TEAM_ACTIVITY_PUSH_EVERY_MS = 15 * 60 * 1000
const ACTIVITY_META_DOC = 'teamActivity'

/**
 * @param access  the resolveStoreAccess result for the caller
 * @param tab     dashboard tab id the change belongs to (data.tab)
 * @param action  short verb for data.action, e.g. 'update' or 'status'
 * @param body    the sentence the owner reads, WITHOUT the staff name
 *
 * Never throws: the write has already committed by the time this runs, and a
 * notification failure must never turn a saved change into a 500.
 */
export async function announceTeamActivity(db, storeId, access, { tab, action, body }) {
  if (!access || access.role === 'owner') return

  try {
    const staffName = access.staffName || 'A staff member'
    const payload = {
      type: 'team_activity',
      title: 'Team activity',
      body: `${staffName} ${body}`,
      data: { staffName, tab, action },
    }

    const metaRef = db.collection('stores').doc(storeId).collection('meta').doc(ACTIVITY_META_DOC)
    const snap = await metaRef.get()
    const lastPushAt = Number(snap.data()?.[access.staffUid]?.lastPushAt || 0)

    if (Date.now() - lastPushAt < TEAM_ACTIVITY_PUSH_EVERY_MS) {
      // Inside the window: record only, no buzz. recordNotification skips the
      // plan gate, which is safe because Team is Premium-only, so a store with
      // any staff member at all is already Premium.
      await recordNotification(db, storeId, payload)
      return
    }

    await notifyStore(db, storeId, payload)
    await metaRef.set({ [access.staffUid]: { lastPushAt: Date.now() } }, { merge: true })
  } catch (err) {
    console.error('[team-activity] notify failed:', err?.message || err)
  }
}
