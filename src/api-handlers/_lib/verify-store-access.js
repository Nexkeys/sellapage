// src/api-handlers/_lib/verify-store-access.js
// Shared authorization primitive for vendor-facing handlers. Standing
// convention (see Changelog-README.md): every new vendor-facing handler
// should authorize via resolveStoreAccess() instead of a raw
// `decodedToken.uid !== storeId` check, so it's staff-capable from day one.
import { getAdminDb } from './firebase-admin.js'
import { OWNER_ONLY_TABS } from '../../utils/staffRoles.js'

// Single-field equality query (staffUid) - deliberately avoids a composite
// index (staffUid + active) given this codebase's history of missing-index
// production errors. Result set is small (bounded by how many stores one
// person has ever worked for), filtered in memory instead.
async function findActiveMembership(db, callerUid, storeId) {
  const snap = await db.collection('staffMemberships').where('staffUid', '==', callerUid).get()
  const doc = snap.docs.find((d) => {
    const data = d.data()
    return data.active === true && data.storeId === storeId
  })
  return doc ? { id: doc.id, ...doc.data() } : null
}

/**
 * Staff exist only while the store is on Premium.
 *
 * staff-invites.js refuses to invite below Premium and staff-identity.js
 * refuses to load the dashboard for a downgraded store, but nothing re-checked
 * the plan once a staff member was signed in, so their token kept working
 * against every staff-capable API after the owner stopped paying for Team, and
 * (since 2026-09-23) they would have kept receiving store emails and push.
 *
 * Checked here because both resolvers below funnel through it, so one read
 * closes the API, the emails and the notifications together. Owners never
 * reach this: they return before it.
 *
 * Costs one store read per STAFF request. Deliberately not denormalised onto
 * the membership: a copy of the plan would still say "premium" the day after a
 * downgrade, which is the exact moment this matters.
 */
async function storeHasTeam(db, storeId) {
  const snap = await db.collection('stores').doc(storeId).get()
  if (!snap.exists) return false
  const store = snap.data() || {}
  return (store.hasPremiumFeatures ?? store.plan === 'premium') === true
}

/**
 * Resolves whether callerUid may act on requestedStoreId for a given tab,
 * and at what access level. Returns:
 *   { allowed: true, role: 'owner' }
 *   { allowed: true, role: roleName, roleId, staffName, staffUid }
 *   { allowed: false, reason: '...' }
 */
export async function resolveStoreAccess(callerUid, requestedStoreId, tabId, needsWrite = false) {
  if (!callerUid || !requestedStoreId) return { allowed: false, reason: 'missing_ids' }

  if (callerUid === requestedStoreId) {
    return { allowed: true, role: 'owner' }
  }

  const db = getAdminDb()
  const membership = await findActiveMembership(db, callerUid, requestedStoreId)
  if (!membership) return { allowed: false, reason: 'not_a_staff_member' }

  // Team is a Premium feature: a downgraded store has no staff.
  if (!(await storeHasTeam(db, requestedStoreId))) {
    return { allowed: false, reason: 'store_downgraded' }
  }

  if (tabId && OWNER_ONLY_TABS.includes(tabId)) {
    return { allowed: false, reason: 'owner_only_tab' }
  }

  if (!tabId) {
    // Store-level-only check (no specific tab) - used for things like
    // session register/heartbeat/revoke that any active staff member needs
    // regardless of role.
    return { allowed: true, role: membership.roleId, staffName: membership.name, staffUid: callerUid, membership }
  }

  const roleSnap = await db.collection('stores').doc(requestedStoreId).collection('staffRoles').doc(membership.roleId).get()
  if (!roleSnap.exists) return { allowed: false, reason: 'role_not_found' }
  const roleData = roleSnap.data()
  const entry = (roleData.tabs || []).find((t) => t.tabId === tabId)
  if (!entry) return { allowed: false, reason: 'tab_not_granted' }
  if (needsWrite && entry.access !== 'write') return { allowed: false, reason: 'read_only' }

  return { allowed: true, role: roleData.name, roleId: membership.roleId, staffName: membership.name, staffUid: callerUid, membership }
}

/**
 * Lighter helper for handlers that only need "which store does this uid
 * act on" without a specific tab check (e.g. sessions.js, which every
 * active staff member needs regardless of role).
 */
export async function resolveCallerStoreId(callerUid) {
  if (!callerUid) return null
  const db = getAdminDb()
  const storeSnap = await db.collection('stores').doc(callerUid).get()
  if (storeSnap.exists) return { storeId: callerUid, role: 'owner' }

  const snap = await db.collection('staffMemberships').where('staffUid', '==', callerUid).get()
  const doc = snap.docs.find((d) => d.data().active === true)
  if (!doc) return null
  const data = doc.data()
  // Same Premium rule as resolveStoreAccess. Without it a staff member of a
  // downgraded store would still register devices, read the bell and change
  // notification settings through the handlers that use this resolver.
  if (!(await storeHasTeam(db, data.storeId))) return null
  return { storeId: data.storeId, role: data.roleId, staffName: data.name, staffUid: callerUid }
}
