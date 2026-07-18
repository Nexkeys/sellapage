import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const VALID_ROLES = ['super_admin', 'finance', 'support', 'operations', 'marketing']

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') return res.status(204).end()
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

    const adminToken = req.headers['x-admin-token']
    if (!process.env.ADMIN_SECRET_TOKEN) return res.status(403).json({ error: 'Missing ADMIN_SECRET_TOKEN' })
    if (!adminToken) return res.status(403).json({ error: 'Missing x-admin-token header' })
    if (adminToken !== process.env.ADMIN_SECRET_TOKEN) return res.status(403).json({ error: 'Token mismatch' })

    const db = getAdminDb()
    const action = (req.query.action || 'list')

    if (action === 'list') {
      const snap = await db.collection('admins').get()
      const admins = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        assignedAt: d.data().assignedAt?.toDate?.()?.toISOString() || null,
      }))
      return res.status(200).json({ admins })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { uid, role, active } = body
      if (!uid || !uid.trim()) return res.status(400).json({ error: 'Missing uid' })

      const cleanUid = uid.trim()
      const docRef = db.collection('admins').doc(cleanUid)
      const docSnap = await docRef.get()

      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Admin not found. Add them first.' })
      }

      const update = {}
      if (role !== undefined) {
        if (!VALID_ROLES.includes(role)) {
          return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
        }
        update.role = role
      }
      if (active !== undefined) {
        update.active = active === true || active === 'true'
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' })
      }

      await docRef.update(update)
      return res.status(200).json({ success: true, uid: cleanUid, updated: update })
    }

    if (action === 'add' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { uid, role } = body
      if (!uid || !uid.trim()) return res.status(400).json({ error: 'Missing uid' })
      if (!role) return res.status(400).json({ error: 'Missing role' })
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
      }

      const cleanUid = uid.trim()
      const docRef = db.collection('admins').doc(cleanUid)
      const docSnap = await docRef.get()

      if (docSnap.exists) {
        return res.status(409).json({ error: 'Admin already exists. Use update to change their role.' })
      }

      await docRef.set({
        role,
        assignedBy: 'manual',
        assignedAt: new Date(),
        active: true,
      })
      return res.status(200).json({ success: true, uid: cleanUid, role })
    }

    if (action === 'create-user' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { email, password, role, displayName } = body
      if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' })
      if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
      if (!role) return res.status(400).json({ error: 'Role is required' })
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
      }

      const auth = getAdminAuth()
      let userRecord
      try {
        userRecord = await auth.createUser({
          email: email.trim(),
          password,
          displayName: displayName || '',
        })
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'An account with this email already exists.' })
        }
        return res.status(500).json({ error: `Failed to create user: ${authErr.message}` })
      }

      const uid = userRecord.uid
      await db.collection('admins').doc(uid).set({
        role,
        email: email.trim(),
        displayName: displayName || '',
        assignedBy: 'panel',
        assignedAt: new Date(),
        active: true,
      })

      return res.status(200).json({ success: true, uid, email: email.trim(), role })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('admin-manage error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
