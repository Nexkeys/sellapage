import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore'
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
  console.log('[getAdminRole] uid:', uid)
  console.log('[getAdminRole] projectId:', db.app.options.projectId)
  try {
    const adminsCol = collection(db, 'admins')
    const listSnap = await getDocs(query(adminsCol, limit(10)))
    console.log('[getAdminRole] Collection doc count:', listSnap.docs.length)
    listSnap.docs.forEach((d, i) => {
      console.log('[getAdminRole] Doc[' + i + '] id:', JSON.stringify(d.id), 'len:', d.id.length)
      console.log('[getAdminRole] Doc[' + i + '] data:', JSON.stringify(d.data()))
      console.log('[getAdminRole] Doc[' + i + '] id===uid:', d.id === uid)
      console.log('[getAdminRole] Doc[' + i + '] charCodes:', Array.from(d.id).map(c => c.charCodeAt(0)))
    })

    console.log('[getAdminRole] Query uid charCodes:', Array.from(uid).map(c => c.charCodeAt(0)))

    const ref = doc(db, 'admins', uid)
    const snap = await getDoc(ref)
    console.log('[getAdminRole] getDoc.exists():', snap.exists())

    if (snap.exists()) {
      return snap.data().role || null
    }

    const snap2 = await getDoc(doc(db, 'admins', uid), { source: 'server' })
    console.log('[getAdminRole] getDoc(server).exists():', snap2.exists())
    if (snap2.exists()) {
      return snap2.data().role || null
    }

    console.warn('[getAdminRole] Document NOT found after both cache and server')
    return null
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