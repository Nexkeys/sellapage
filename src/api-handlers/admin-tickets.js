import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'

const PLAN_ORDER = { premium: 0, pro: 1, growth: 2, starter: 3 }
const REPLY_MAX = 4000
const iso = (v) => v?.toDate?.()?.toISOString?.() || (typeof v === 'string' ? v : null)

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

      const col = db.collection('supportMessages')
      let query = col
      if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter)
      }

      // The tiles count the whole inbox, whatever filter is picked. Three
      // count queries cost one read each, against reading every ticket.
      const [snap, allCount, progressCount, resolvedCount] = await Promise.all([
        query.limit(500).get(),
        col.count().get(),
        col.where('status', '==', 'in_progress').count().get(),
        col.where('status', '==', 'resolved').count().get(),
      ])
      const search = String(req.query.search || '').trim().toLowerCase()

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
            replies: Array.isArray(d.replies) ? d.replies.map((r) => ({ ...r, at: iso(r.at) })) : [],
          }
        })
        .filter((t) => !search || [t.message, t.storeName, t.businessName, t.email, t.whatsappNumber, t.category]
          .some((v) => String(v || '').toLowerCase().includes(search)))
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

      const all = allCount.data().count
      const inProgress = progressCount.data().count
      const resolved = resolvedCount.data().count
      const stats = {
        total: all,
        open: Math.max(all - inProgress - resolved, 0),
        inProgress,
        resolved,
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

    // Answer a ticket by email from support@, kept on the ticket so the next
    // person to open it sees what was said. Vendors reply to the email.
    if (action === 'reply' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {} } catch {}
      const ticketId = String(body.ticketId || '')
      const message = String(body.message || '').trim().slice(0, REPLY_MAX)
      if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' })
      if (message.length < 2) return res.status(400).json({ error: 'Write a reply first.' })

      const ref = db.collection('supportMessages').doc(ticketId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Ticket not found' })
      const t = snap.data() || {}
      let to = String(t.email || '').trim()
      if (!to && t.storeId) {
        const store = await db.collection('stores').doc(t.storeId).get()
        to = String(store.data()?.email || store.data()?.ownerEmail || '').trim()
      }
      if (!to) return res.status(400).json({ error: 'This ticket has no email address to reply to. Use WhatsApp instead.' })

      const name = t.businessName || t.storeName || 'there'
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;line-height:1.6;">
          <p>Hello ${escapeHtml(name)},</p>
          <div style="white-space:pre-wrap;">${escapeHtml(message)}</div>
          <div style="margin:20px 0;padding:12px;background:#f9fafb;border-left:3px solid #16a34a;color:#6b7280;font-size:13px;">
            <strong>Your message</strong><br/>${escapeHtml(String(t.message || '').slice(0, 1200))}
          </div>
          <p style="font-size:13px;color:#6b7280;">Reply to this email if you need anything else.<br/>${escapeHtml(admin.name || 'The Sellapage team')}, Sellapage Support</p>
        </div>`
      const emailed = await sendEmail(to, 'Re: your message to Sellapage support', html, { sender: 'support' })
      if (!emailed) return res.status(502).json({ error: 'The email could not be sent. Try again, or reply on WhatsApp.' })

      const reply = { at: new Date(), by: admin.uid, byName: admin.name || '', message, channel: 'email' }
      const replies = Array.isArray(t.replies) ? t.replies.slice(-19) : []
      const update = { replies: [...replies, reply], updatedAt: new Date(), lastReplyAt: new Date() }
      if (!t.status || t.status === 'open') update.status = 'in_progress'
      await ref.update(update)
      return res.status(200).json({ success: true, ticketId, emailed: true, status: update.status || t.status })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-tickets] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
