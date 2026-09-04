// src/api-handlers/_lib/verify-admin.js
// Shared authorization primitive for the admin panel.
//
// WHY THIS EXISTS
// Admin endpoints used to authenticate on a single static shared secret sent as
// `x-admin-token`, read client-side from `import.meta.env.VITE_ADMIN_SECRET_TOKEN`.
// Vite inlines every VITE_-prefixed variable into the production bundle, so that
// secret shipped to every visitor's browser - anyone could read it from DevTools
// and call admin-manage?action=create-user to mint themselves a super_admin.
// It also meant admin sub-roles were enforced only in the UI (any admin could
// call any endpoint) and that audit fields like `approvedBy` were self-asserted
// in the request body rather than derived from a verified identity.
//
// This verifies the *human*: a real Firebase ID token, an active admins/{uid}
// document, and a role that actually grants the tab being used.
import { getAdminAuth, getAdminDb } from './firebase-admin.js'

// Mirrors TAB_ACCESS in src/utils/adminRoles.js. Keep the two in sync - the
// client copy decides which tabs render, this copy decides what is permitted.
// If they drift, the client one is cosmetic and this one wins.
const TAB_ACCESS = {
  health:         ['super_admin'],
  directory:      ['super_admin', 'operations', 'marketing'],
  referrals:      ['super_admin', 'finance'],
  withdrawals:    ['super_admin', 'finance'],
  admins:         ['super_admin'],
  // Approving a recovery request can reset an account's email AND password -
  // account-takeover capability, so super_admin only, never support.
  recovery:       ['super_admin'],
  cac:            ['super_admin', 'operations'],
  domains:        ['super_admin', 'operations'],
  flags:          ['super_admin'],
  announcements:  ['super_admin'],
  tickets:        ['super_admin', 'support'],
  analytics:      ['super_admin', 'marketing'],
  revenue:        ['super_admin', 'finance'],
  'sella-ai':     ['super_admin'],
  reports:        ['super_admin', 'support'],
  jobs:           ['super_admin', 'operations'],
  blog:           ['super_admin', 'marketing'],
  reviews:        ['super_admin', 'marketing'],
}

/**
 * MIGRATION SHIM - remove once the admin frontend ships Bearer tokens.
 *
 * While true, a valid legacy `x-admin-token` is still accepted so the server can
 * be deployed before the client without locking admins out. It grants
 * super_admin (matching the old behaviour, where the token granted everything).
 *
 * TO COMPLETE THE FIX:
 *   1. Deploy this file + handlers (both auth paths live).
 *   2. Deploy the frontend sending `Authorization: Bearer <idToken>`.
 *   3. Set ALLOW_LEGACY_ADMIN_TOKEN = false, redeploy, and rotate
 *      ADMIN_SECRET_TOKEN in Vercel. Until step 3 the leaked token still works.
 */
const ALLOW_LEGACY_ADMIN_TOKEN = false

/**
 * Verifies the caller is an active platform admin, and - when `requiredTab` is
 * given - that their role grants that tab.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string|null} requiredTab  tab id from TAB_ACCESS, or null for any admin
 * @returns {Promise<{uid: string, role: string, legacy?: boolean}|null>}
 */
export async function verifyAdmin(req, requiredTab = null) {
  const header = req.headers.authorization || ''

  if (header.startsWith('Bearer ')) {
    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim())
    } catch {
      return null
    }

    const snap = await getAdminDb().collection('admins').doc(decoded.uid).get()
    if (!snap.exists) return null

    const data = snap.data() || {}
    if (data.active === false) return null

    const role = data.role
    if (!role) return null
    if (requiredTab && !roleGrants(role, requiredTab)) return null

    return { uid: decoded.uid, role }
  }

  if (ALLOW_LEGACY_ADMIN_TOKEN) {
    const legacyToken = req.headers['x-admin-token']
    const expected = process.env.ADMIN_SECRET_TOKEN
    if (expected && legacyToken && safeEqual(String(legacyToken), expected)) {
      console.warn('[verify-admin] legacy x-admin-token accepted - migrate this caller to a Bearer ID token')
      return { uid: 'legacy-token', role: 'super_admin', legacy: true }
    }
  }

  return null
}

export function roleGrants(role, tab) {
  const allowed = TAB_ACCESS[tab]
  if (!allowed) return false
  return allowed.includes(role)
}

// Constant-time comparison so the legacy token can't be recovered by timing the
// response. Length is compared first because timingSafeEqual throws on mismatch.
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
