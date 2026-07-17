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
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      const monthAgo = new Date(now)
      monthAgo.setMonth(now.getMonth() - 1)

      const [totalStoresSnap, premiumStoresSnap, leadsSnap, recentStoresSnap, recentLeadsSnap, supportSnap, withdrawalsSnap] = await Promise.all([
        db.collection('stores').count().get(),
        db.collection('stores').where('plan', '!=', 'free').count().get(),
        db.collection('leads').count().get(),
        db.collection('stores').where('createdAt', '>=', weekAgo).count().get(),
        db.collection('leads').where('createdAt', '>=', weekAgo).count().get(),
        db.collection('supportMessages').where('status', 'in', ['open', 'in_progress']).count().get(),
        db.collection('withdrawal_requests').where('status', '==', 'pending').count().get(),
      ])

      const signupsTodaySnap = await db.collection('stores').where('createdAt', '>=', today).count().get()

      return res.status(200).json({
        success: true,
        analytics: {
          totalStores: totalStoresSnap.data().count,
          premiumStores: premiumStoresSnap.data().count,
          totalLeads: leadsSnap.data().count,
          signupsThisWeek: recentStoresSnap.data().count,
          signupsThisMonth: recentStoresSnap.data().count,
          signupsToday: signupsTodaySnap.data().count,
          leadsThisWeek: recentLeadsSnap.data().count,
          openTickets: supportSnap.data().count,
          pendingWithdrawals: withdrawalsSnap.data().count,
          conversionRate: totalStoresSnap.data().count > 0
            ? Math.round((premiumStoresSnap.data().count / totalStoresSnap.data().count) * 100)
            : 0,
        },
      })
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

    if (action === 'orders') {
      const days = parseInt(req.query.days) || 30
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)

      const allOrdersSnap = await db.collection('orders').limit(1000).get()

      let totalOrders = 0
      let totalRevenue = 0
      let paidOrders = 0
      let deliveredOrders = 0

      allOrdersSnap.docs.forEach(doc => {
        const d = doc.data()
        const date = d.createdAt?.toDate?.() || new Date(d.createdAt)
        if (!isNaN(date.getTime()) && date >= cutoff) {
          totalOrders++
          if (d.status === 'paid' || d.status === 'delivered' || d.status === 'completed') {
            paidOrders++
            totalRevenue += d.amount || d.total || 0
          }
          if (d.status === 'delivered' || d.status === 'completed') {
            deliveredOrders++
          }
        }
      })

      return res.status(200).json({
        success: true,
        orders: {
          total: totalOrders,
          paid: paidOrders,
          delivered: deliveredOrders,
          revenue: totalRevenue,
          period: `${days} days`,
        },
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-analytics] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
