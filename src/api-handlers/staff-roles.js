// src/api-handlers/staff-roles.js
// Owner-only role management (Role Builder). Staff members never call this -
// role/staff administration stays owner-only regardless of any role's tab grants.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { OWNER_ONLY_TABS, PRESET_ROLES, MAX_STAFF_ROLES } from '../utils/staffRoles.js'

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

function sanitizeTabs(tabs) {
  if (!Array.isArray(tabs)) return []
  return tabs
    .filter((t) => t && typeof t.tabId === 'string' && !OWNER_ONLY_TABS.includes(t.tabId))
    .map((t) => ({ tabId: t.tabId, access: t.access === 'write' ? 'write' : 'read' }))
}

export default async function handler(req, res) {
  const ownerUid = await verifyOwner(req)
  if (!ownerUid) return res.status(401).json({ error: 'Unauthorized' })

  const db = getAdminDb()
  const rolesRef = db.collection('stores').doc(ownerUid).collection('staffRoles')
  const action = req.query.action || 'list'

  try {
    if (action === 'list' && req.method === 'GET') {
      let snap = await rolesRef.get()
      if (snap.empty) {
        const batch = db.batch()
        PRESET_ROLES.forEach((preset) => {
          const ref = rolesRef.doc()
          batch.set(ref, { ...preset, createdAt: new Date(), updatedAt: new Date() })
        })
        await batch.commit()
        snap = await rolesRef.get()
      }
      const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      return res.status(200).json({ success: true, roles })
    }

    if (action === 'create' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { name, tabs } = body
      if (!name || !name.trim()) return res.status(400).json({ error: 'Role name is required' })

      const existing = await rolesRef.get()
      if (existing.size >= MAX_STAFF_ROLES) {
        return res.status(400).json({ error: `Maximum of ${MAX_STAFF_ROLES} roles per store.` })
      }

      const ref = rolesRef.doc()
      const roleDoc = {
        name: name.trim(),
        isPreset: false,
        tabs: sanitizeTabs(tabs),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await ref.set(roleDoc)
      return res.status(200).json({ success: true, role: { id: ref.id, ...roleDoc } })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { roleId, name, tabs } = body
      if (!roleId) return res.status(400).json({ error: 'roleId is required' })

      const ref = rolesRef.doc(roleId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Role not found' })

      const update = { updatedAt: new Date() }
      if (typeof name === 'string' && name.trim()) update.name = name.trim()
      if (tabs !== undefined) update.tabs = sanitizeTabs(tabs)
      await ref.update(update)
      return res.status(200).json({ success: true })
    }

    if (action === 'delete' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { roleId } = body
      if (!roleId) return res.status(400).json({ error: 'roleId is required' })

      // Single-field query (storeId only) filtered in memory for roleId+active -
      // avoids requiring a composite index; a store's staff count is capped
      // small (MAX_ACTIVE_STAFF) so this stays cheap.
      const inUse = await db.collection('staffMemberships')
        .where('storeId', '==', ownerUid)
        .get()
      const activeCount = inUse.docs.filter((d) => d.data().active === true && d.data().roleId === roleId).length
      if (activeCount > 0) {
        return res.status(400).json({ error: `${activeCount} active staff member${activeCount === 1 ? ' is' : 's are'} on this role - reassign or remove them first.` })
      }

      await rolesRef.doc(roleId).delete()
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[staff-roles] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
