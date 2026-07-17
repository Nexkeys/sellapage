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
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const statusFilter = req.query.status || 'all'

      const snap = await db.collection('stores').limit(500).get()
      let stores = snap.docs
        .map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            storeName: d.storeName || d.handle || doc.id,
            handle: d.handle || '',
            ownerName: d.ownerName || d.storeName || '',
            cacStatus: d.cacStatus || 'not_submitted',
            cacVerified: d.cacVerified || false,
            cacAttempts: d.cacAttempts || 0,
            cacVerifiedAt: d.cacVerifiedAt?.toDate?.()?.toISOString() || null,
            cacRejectedAt: d.cacRejectedAt?.toDate?.()?.toISOString() || null,
            cacRejectionReason: d.cacRejectionReason || '',
            cacDocType: d.cacDocType || '',
          }
        })
        .filter(s => {
          if (statusFilter === 'all') return true
          if (statusFilter === 'verified') return s.cacVerified === true
          if (statusFilter === 'not_submitted') return s.cacStatus === 'not_submitted' || s.cacStatus === 'pending'
          return s.cacStatus === statusFilter
        })
        .sort((a, b) => {
          const order = { pending: 0, submitted: 1, verified: 2, rejected: 3, not_submitted: 4 }
          return (order[a.cacStatus] ?? 5) - (order[b.cacStatus] ?? 5)
        })

      const total = stores.length
      const offset = (page - 1) * limit
      const paged = stores.slice(offset, offset + limit)

      const stats = {
        total: stores.length,
        verified: stores.filter(s => s.cacVerified).length,
        pending: stores.filter(s => s.cacStatus === 'pending' || s.cacStatus === 'submitted').length,
        rejected: stores.filter(s => s.cacStatus === 'rejected').length,
        notSubmitted: stores.filter(s => s.cacStatus === 'not_submitted').length,
      }

      return res.status(200).json({ success: true, stores: paged, stats, page, limit, total })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId, status, reason } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      if (!['verified', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const updateData = { cacStatus: status }
      if (status === 'verified') {
        updateData.cacVerified = true
        updateData.cacVerifiedAt = new Date()
        updateData.cacRejectionReason = ''
      } else if (status === 'rejected') {
        updateData.cacVerified = false
        updateData.cacRejectedAt = new Date()
        updateData.cacRejectionReason = reason || 'Rejected by admin'
      } else {
        updateData.cacVerified = false
        updateData.cacRejectionReason = ''
      }

      await db.collection('stores').doc(storeId).update(updateData)
      return res.status(200).json({ success: true, storeId, updated: updateData })
    }

    if (action === 'retry-verify' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

      await db.collection('stores').doc(storeId).update({
        cacStatus: 'not_submitted',
        cacVerified: false,
        cacRejectionReason: '',
        cacAttempts: 0,
      })
      return res.status(200).json({ success: true, message: 'CAC verification reset' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-cac] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
