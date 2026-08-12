import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  FINANCE: 'finance',
  SUPPORT: 'support',
  OPERATIONS: 'operations',
  MARKETING: 'marketing',
}

const TAB_ACCESS = {
  health: [ADMIN_ROLES.SUPER_ADMIN],
  directory: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS, ADMIN_ROLES.MARKETING],
  referrals: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.FINANCE],
  withdrawals: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.FINANCE],
  admins: [ADMIN_ROLES.SUPER_ADMIN],
  // Approving a recovery request can change an account's email AND password —
  // account-takeover capability. Super admin only, never a support role.
  recovery: [ADMIN_ROLES.SUPER_ADMIN],
  cac: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS],
  domains: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS],
  flags: [ADMIN_ROLES.SUPER_ADMIN],
  announcements: [ADMIN_ROLES.SUPER_ADMIN],
  tickets: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUPPORT],
  analytics: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.MARKETING],
  revenue: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.FINANCE],
  'sella-ai': [ADMIN_ROLES.SUPER_ADMIN],
  reports: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUPPORT],
  jobs: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS],
  blog: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.MARKETING],
  reviews: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.MARKETING],
}

export async function getAdminRole(uid) {
  const cleanUid = (uid || '').trim()
  if (!cleanUid) return null
  try {
    const snap = await getDoc(doc(db, 'admins', cleanUid))
    if (!snap.exists()) return null
    const data = snap.data()
    if (data.active === false) return null
    return data.role || null
  } catch (err) {
    console.error('[getAdminRole] Error:', err.code, err.message)
    return null
  }
}

export function canAccessTab(role, tab) {
  if (!role) return false
  const allowed = TAB_ACCESS[tab]
  if (!allowed) return false
  return allowed.includes(role)
}

export function getRoleLabel(role) {
  const labels = {
    [ADMIN_ROLES.SUPER_ADMIN]: 'Super Admin',
    [ADMIN_ROLES.FINANCE]: 'Finance Admin',
    [ADMIN_ROLES.SUPPORT]: 'Support Admin',
    [ADMIN_ROLES.OPERATIONS]: 'Operations Admin',
    [ADMIN_ROLES.MARKETING]: 'Marketing Admin',
  }
  return labels[role] || role
}