import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

const PLAN_ORDER = { premium: 0, pro: 1, growth: 2, starter: 3 }

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'tickets')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const statusFilter = req.query.status || 'all'

      let query = db.collection('supportMessages')
      if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter)
      }

      const snap = await query.limit(500).get()

      const tickets = snap.docs
        .map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            storeId: d.storeId || '',
            storeName: d.storeName || '',
            businessName: d.businessName || '',
            email: d.email || '',
            whatsappNumber: d.whatsappNumber || '',
            plan: d.plan || 'starter',
            category: d.category || 'general',
            message: d.message || '',
            status: d.status || 'open',
            assignedTo: d.assignedTo || '',
            createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
            resolvedAt: d.resolvedAt?.toDate?.()?.toISOString() || null,
          }
        })
        .sort((a, b) => {
          const planA = PLAN_ORDER[a.plan] ?? 4
          const planB = PLAN_ORDER[b.plan] ?? 4
          if (planA !== planB) return planA - planB
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })

      const total = tickets.length
      const offset = (page - 1) * limit
      const paged = tickets.slice(offset, offset + limit)

      const stats = {
        total: snap.size,
        open: tickets.filter(t => t.status === 'open' || !t.status).length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
      }

      return res.status(200).json({ success: true, tickets: paged, stats, page, limit, total })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { ticketId, status, assignTo } = body
      if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' })

      const updateData = { updatedAt: new Date() }
      if (status) {
        updateData.status = status
        if (status === 'resolved') updateData.resolvedAt = new Date()
      }
      if (assignTo !== undefined) updateData.assignedTo = assignTo

      await db.collection('supportMessages').doc(ticketId).update(updateData)
      return res.status(200).json({ success: true, ticketId, updated: updateData })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-tickets] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
