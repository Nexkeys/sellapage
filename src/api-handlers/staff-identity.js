// src/api-handlers/staff-identity.js
// Called once after login when the client's direct `stores/{uid}` read comes
// back empty - resolves whether this uid is an active staff member of some
// store, and if so returns the linked store id + role's tab grants so the
// dashboard can gate its nav without a second round-trip. Routed through a
// server handler (not a direct client Firestore query) deliberately: there is
// no Firestore rule permitting a client to query `staffMemberships` by uid,
// and that rule can't be added/verified from this repo (see
// Docs/Staff-Team-Accounts-Plan.md's second key finding) - firebase-admin
// here bypasses rules entirely, so no rule change is needed at all.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const db = getAdminDb()

    const snap = await db.collection('staffMemberships').where('staffUid', '==', decoded.uid).get()
    const membership = snap.docs.find((d) => d.data().active === true)
    if (!membership) {
      return res.status(200).json({ success: true, isStaff: false })
    }
    const data = membership.data()

    const [storeSnap, roleSnap] = await Promise.all([
      db.collection('stores').doc(data.storeId).get(),
      db.collection('stores').doc(data.storeId).collection('staffRoles').doc(data.roleId).get(),
    ])

    if (!storeSnap.exists) {
      return res.status(200).json({ success: true, isStaff: false })
    }
    if (storeSnap.data().plan !== 'premium') {
      // Downgrade lock - lazy-enforced, matches this codebase's existing style.
      return res.status(200).json({ success: true, isStaff: false, lockedReason: 'store_downgraded' })
    }

    return res.status(200).json({
      success: true,
      isStaff: true,
      storeId: data.storeId,
      membershipId: membership.id,
      staffName: data.name,
      staffEmail: data.email,
      roleId: data.roleId,
      roleName: roleSnap.exists ? roleSnap.data().name : 'Staff',
      tabs: roleSnap.exists ? (roleSnap.data().tabs || []) : [],
    })
  } catch (err) {
    console.error('[staff-identity] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
