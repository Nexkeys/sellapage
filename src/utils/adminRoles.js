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
  directory: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.OPERATIONS],
  referrals: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.FINANCE],
  withdrawals: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.FINANCE],
}

export async function getAdminRole(uid) {
  console.log('[getAdminRole] Called with uid:', uid)
  console.log('[getAdminRole] db type:', typeof db, db?.app?.name || 'unknown')
  try {
    const ref = doc(db, 'admins', uid)
    console.log('[getAdminRole] Document path:', ref.path)
    const snap = await getDoc(ref)
    console.log('[getAdminRole] snap.exists():', snap.exists())
    if (snap.exists()) {
      console.log('[getAdminRole] snap.data():', JSON.stringify(snap.data()))
    }
    if (!snap.exists()) {
      console.warn('[getAdminRole] Document NOT found at path:', ref.path)
      return null
    }
    const data = snap.data()
    if (data.active === false) {
      console.warn('[getAdminRole] Document found but active=false')
      return null
    }
    console.log('[getAdminRole] Role resolved:', data.role)
    return data.role || null
  } catch (err) {
    console.error('[getAdminRole] Error:', err.code, err.message, err)
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
