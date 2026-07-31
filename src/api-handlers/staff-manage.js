// src/api-handlers/staff-manage.js
// Owner-only staff administration: list active staff, reassign role, remove
// (deactivate + revoke their active sessions on this store).
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'

async function verifyOwner(req) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return null
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    return decoded.uid
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const ownerUid = await verifyOwner(req)
  if (!ownerUid) return res.status(401).json({ error: 'Unauthorized' })

  const db = getAdminDb()
  const action = req.query.action || 'list'

  try {
    if (action === 'list' && req.method === 'GET') {
      const snap = await db.collection('staffMemberships').where('storeId', '==', ownerUid).get()
      const staff = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.active === true)
        .map((s) => ({
          id: s.id,
          staffUid: s.staffUid,
          name: s.name,
          email: s.email,
          roleId: s.roleId,
          createdAt: s.createdAt?.toDate?.()?.toISOString() || null,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return res.status(200).json({ success: true, staff })
    }

    if (action === 'update-role' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { membershipId, roleId } = body
      if (!membershipId || !roleId) return res.status(400).json({ error: 'membershipId and roleId are required' })

      const ref = db.collection('staffMemberships').doc(membershipId)
      const snap = await ref.get()
      if (!snap.exists || snap.data().storeId !== ownerUid) {
        return res.status(404).json({ error: 'Staff member not found' })
      }
      const roleSnap = await db.collection('stores').doc(ownerUid).collection('staffRoles').doc(roleId).get()
      if (!roleSnap.exists) return res.status(404).json({ error: 'Role not found' })

      await ref.update({ roleId })
      return res.status(200).json({ success: true })
    }

    if (action === 'remove' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { membershipId } = body
      if (!membershipId) return res.status(400).json({ error: 'membershipId is required' })

      const ref = db.collection('staffMemberships').doc(membershipId)
      const snap = await ref.get()
      if (!snap.exists || snap.data().storeId !== ownerUid) {
        return res.status(404).json({ error: 'Staff member not found' })
      }
      const staffUid = snap.data().staffUid

      await ref.update({ active: false, deactivatedAt: new Date() })

      // Revoke any of this staff member's active sessions on this store —
      // reuses the sessions collection sessions.js already reads/writes,
      // now that it's tagged with actorUid at register time.
      const sessionsSnap = await db.collection('stores').doc(ownerUid).collection('sessions')
        .where('actorUid', '==', staffUid).get()
      if (!sessionsSnap.empty) {
        const batch = db.batch()
        sessionsSnap.docs.forEach((d) => {
          if (!d.data().revoked) batch.update(d.ref, { revoked: true, revokedAt: new Date() })
        })
        await batch.commit()
      }

      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[staff-manage] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
