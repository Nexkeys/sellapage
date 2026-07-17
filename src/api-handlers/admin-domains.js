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

      const snap = await db.collection('stores')
        .where('customDomain', '!=', null)
        .limit(500)
        .get()

      let stores = snap.docs
        .map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            storeName: d.storeName || d.handle || doc.id,
            handle: d.handle || '',
            customDomain: d.customDomain || '',
            domainStatus: d.domainStatus || 'pending',
            domainVerifiedAt: d.domainVerifiedAt?.toDate?.()?.toISOString() || null,
            dnsConfigured: d.dnsConfigured || false,
          }
        })
        .sort((a, b) => {
          const order = { verified: 0, pending: 1, failed: 2 }
          return (order[a.domainStatus] ?? 3) - (order[b.domainStatus] ?? 3)
        })

      const allStoresSnap = await db.collection('stores').limit(1).get()
      const totalAllSnap = await db.collection('stores').count().get()
      const totalCustomDomains = stores.length

      const total = stores.length
      const offset = (page - 1) * limit
      const paged = stores.slice(offset, offset + limit)

      return res.status(200).json({
        success: true,
        stores: paged,
        stats: {
          total: totalCustomDomains,
          totalStores: totalAllSnap.data().count,
          verified: stores.filter(s => s.domainStatus === 'verified').length,
          pending: stores.filter(s => s.domainStatus === 'pending').length,
          failed: stores.filter(s => s.domainStatus === 'failed').length,
        },
        page, limit, total,
      })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId, domainStatus } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      if (!['verified', 'pending', 'failed'].includes(domainStatus)) {
        return res.status(400).json({ error: 'Invalid domainStatus' })
      }

      const updateData = { domainStatus }
      if (domainStatus === 'verified') {
        updateData.domainVerifiedAt = new Date()
      }

      await db.collection('stores').doc(storeId).update(updateData)
      return res.status(200).json({ success: true, storeId, updated: updateData })
    }

    if (action === 'remove' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

      await db.collection('stores').doc(storeId).update({
        customDomain: null,
        domainStatus: null,
        domainVerifiedAt: null,
        dnsConfigured: false,
      })
      return res.status(200).json({ success: true, message: 'Domain removed' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-domains] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
