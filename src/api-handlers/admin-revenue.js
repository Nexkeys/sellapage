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

  const secretKey = process.env.PAYSTACK_SECRET_KEY

  try {
    const db = getAdminDb()
    const action = req.query.action || 'platform'

    if (action === 'platform') {
      let balance = { balance: 0, currency: 'NGN' }
      let totals = { total_transactions: 0, total_volume: 0 }

      if (secretKey) {
        try {
          const [balRes, totRes] = await Promise.all([
            fetch('https://api.paystack.co/balance', { headers: { Authorization: `Bearer ${secretKey}` } }),
            fetch('https://api.paystack.co/transaction/totals', { headers: { Authorization: `Bearer ${secretKey}` } }),
          ])
          if (balRes.ok) {
            const balData = await balRes.json()
            const ngn = (balData.data || []).find(b => b.currency === 'NGN')
            if (ngn) balance = { balance: ngn.balance, currency: 'NGN' }
          }
          if (totRes.ok) {
            const totData = await totRes.json()
            totals = {
              total_transactions: totData.data?.total_transactions || 0,
              total_volume: totData.data?.total_volume || 0,
            }
          }
        } catch (e) {
          console.error('[admin-revenue] Paystack API error:', e.message)
        }
      }

      return res.status(200).json({
        success: true,
        platform: {
          balance: balance.balance,
          balanceFormatted: `NGN ${(balance.balance / 100).toLocaleString()}`,
          totalTransactions: totals.total_transactions,
          totalVolume: totals.total_volume,
          totalVolumeFormatted: `NGN ${(totals.total_volume / 100).toLocaleString()}`,
          hasApiKey: !!secretKey,
        },
      })
    }

    if (action === 'transactions') {
      if (!secretKey) {
        return res.status(200).json({ success: true, transactions: [], hasApiKey: false })
      }

      const from = req.query.from || ''
      const to = req.query.to || ''
      const page = parseInt(req.query.page) || 1
      const perPage = parseInt(req.query.limit) || 50

      let url = `https://api.paystack.co/transaction?page=${page}&perPage=${perPage}&status=success`
      if (from) url += `&from=${from}`
      if (to) url += `&to=${to}`

      const response = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } })
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch transactions' })
      }

      const data = await response.json()
      const transactions = (data.data || []).map(t => ({
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        fees: t.fes || 0,
        customer: t.customer?.email || '',
        paidAt: t.paid_at || t.createdAt,
        channel: t.channel || '',
        status: t.status || '',
        subaccount: t.subaccount?.subaccount_code || '',
      }))

      return res.status(200).json({
        success: true,
        transactions,
        meta: data.meta || {},
        hasApiKey: true,
      })
    }

    if (action === 'store-revenue') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20

      const storesSnap = await db.collection('stores').limit(500).get()

      const storeRevenues = []
      for (const doc of storesSnap.docs) {
        const d = doc.data()
        let totalRevenue = 0
        let totalOrders = 0
        try {
          const ordersSnap = await db.collection('stores').doc(doc.id).collection('orders')
            .where('status', 'in', ['paid', 'delivered', 'completed'])
            .limit(500)
            .get()
          ordersSnap.docs.forEach(o => {
            const od = o.data()
            totalRevenue += od.amount || od.total || 0
            totalOrders++
          })
        } catch {}

        if (totalOrders > 0) {
          storeRevenues.push({
            id: doc.id,
            storeName: d.storeName || d.handle || '',
            handle: d.handle || '',
            email: d.email || d.ownerEmail || '',
            whatsappNumber: d.whatsappNumber || '',
            plan: d.plan || 'starter',
            totalOrders,
            totalRevenue,
            totalRevenueFormatted: `NGN ${(totalRevenue / 100).toLocaleString()}`,
          })
        }
      }

      storeRevenues.sort((a, b) => b.totalRevenue - a.totalRevenue)

      const total = storeRevenues.length
      const offset = (page - 1) * limit
      const paged = storeRevenues.slice(offset, offset + limit)

      return res.status(200).json({
        success: true,
        stores: paged,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-revenue] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
