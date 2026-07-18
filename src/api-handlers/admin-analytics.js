import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const adminToken = req.headers['x-admin-token']
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()
    const action = req.query.action || 'overview'

    if (action === 'overview') {
      const [totalStoresSnap, premiumStoresSnap, leadsSnap, supportSnap, productsSnap] = await Promise.all([
        db.collection('stores').count().get(),
        db.collection('stores').where('plan', '!=', 'starter').count().get(),
        db.collection('leads').count().get(),
        db.collection('supportMessages').where('status', 'in', ['open', 'in_progress']).count().get(),
        db.collectionGroup('products').count().get(),
      ])

      return res.status(200).json({
        success: true,
        analytics: {
          totalStores: totalStoresSnap.data().count,
          paidStores: premiumStoresSnap.data().count,
          totalLeads: leadsSnap.data().count,
          totalProducts: productsSnap.data().count,
          openTickets: supportSnap.data().count,
        },
      })
    }

    if (action === 'top-stores') {
      const limit = parseInt(req.query.limit) || 10
      const analyticsSnap = await db.collectionGroup('analytics').limit(500).get()

      const storeAnalytics = {}
      analyticsSnap.docs.forEach(doc => {
        const path = doc.ref.path
        const parts = path.split('/')
        const storeId = parts[1]
        const d = doc.data()
        if (!storeAnalytics[storeId]) {
          storeAnalytics[storeId] = { totalViews: 0, totalClicks: 0, engagedViews: 0 }
        }
        storeAnalytics[storeId].totalViews += d.totalViews || 0
        storeAnalytics[storeId].totalClicks += d.totalClicks || 0
        storeAnalytics[storeId].engagedViews += d.engagedViews || 0
      })

      const storeIds = Object.keys(storeAnalytics)
      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, stores: [] })
      }

      const storeDocs = await Promise.all(
        storeIds.map(id => db.collection('stores').doc(id).get().then(snap => ({ id, ...snap.data(), exists: snap.exists })))
      )

      const enriched = storeDocs
        .filter(s => s.exists)
        .map(s => {
          const analytics = storeAnalytics[s.id] || { totalViews: 0, totalClicks: 0, engagedViews: 0 }
          return {
            id: s.id,
            storeName: s.storeName || s.handle || '',
            handle: s.handle || '',
            email: s.email || s.ownerEmail || '',
            whatsappNumber: s.whatsappNumber || '',
            plan: s.plan || 'starter',
            totalViews: analytics.totalViews,
            totalClicks: analytics.totalClicks,
            engagedViews: analytics.engagedViews,
            engagementRate: analytics.totalViews > 0 ? Math.round((analytics.engagedViews / analytics.totalViews) * 100) : 0,
          }
        })
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, limit)

      return res.status(200).json({ success: true, stores: enriched })
    }

    if (action === 'signups') {
      const days = parseInt(req.query.days) || 30
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)

      const snap = await db.collection('stores')
        .where('createdAt', '>=', cutoff)
        .limit(1000)
        .get()

      const byDay = {}
      snap.docs.forEach(doc => {
        const d = doc.data()
        const date = d.createdAt?.toDate?.() || new Date(d.createdAt)
        if (!isNaN(date.getTime())) {
          const key = date.toISOString().split('T')[0]
          byDay[key] = (byDay[key] || 0) + 1
        }
      })

      const series = Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return res.status(200).json({ success: true, series, total: snap.size })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-analytics] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
