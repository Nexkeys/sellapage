import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const adminToken = req.headers['x-admin-token']
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const snap = await db.collection('featureFlags').get()
      const flags = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      })).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

      return res.status(200).json({ success: true, flags })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { flagId, enabled, description } = body
      if (!flagId) return res.status(400).json({ error: 'Missing flagId' })

      const docRef = db.collection('featureFlags').doc(flagId)
      const docSnap = await docRef.get()

      if (!docSnap.exists) {
        await docRef.set({
          flagId,
          enabled: enabled === true,
          description: description || '',
          updatedAt: new Date(),
          createdAt: new Date(),
        })
        return res.status(200).json({ success: true, flagId, created: true })
      }

      const update = { updatedAt: new Date() }
      if (enabled !== undefined) update.enabled = enabled === true
      if (description !== undefined) update.description = description

      await docRef.update(update)
      return res.status(200).json({ success: true, flagId, updated: update })
    }

    if (action === 'delete' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { flagId } = body
      if (!flagId) return res.status(400).json({ error: 'Missing flagId' })

      await db.collection('featureFlags').doc(flagId).delete()
      return res.status(200).json({ success: true, message: `Flag ${flagId} deleted` })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-flags] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
