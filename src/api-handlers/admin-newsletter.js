// src/api-handlers/admin-newsletter.js
//
// The admin side of the footer's "Get free tips" box: who asked to receive the
// emails, when, and from where.
//
// Super admin and marketing, matching the blog and reviews tabs: this is a
// mailing list, which is marketing's job, and it holds no money and no
// credentials. Delete is here because a person can ask to be taken off a list,
// and someone has to be able to do it.

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

const iso = (v) => v?.toDate?.()?.toISOString?.() || null

function parseBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'newsletter')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const col = db.collection('newsletterSubscribers')
    const action = req.query.action || 'list'

    if (action === 'list' || action === 'export') {
      // A mailing list is read whole: the counts have to be exact and the
      // export has to be everything, not a page of it.
      const snap = await col.orderBy('createdAt', 'desc').limit(5000).get()
      const all = snap.docs.map((d) => {
        const r = d.data()
        return {
          id: d.id,
          email: r.email || '',
          source: r.source || 'other',
          status: r.status || 'subscribed',
          createdAt: iso(r.createdAt),
          lastSeenAt: iso(r.lastSeenAt),
        }
      })

      if (action === 'export') {
        return res.status(200).json({ success: true, emails: all.map((r) => r.email).filter(Boolean) })
      }

      const search = String(req.query.search || '').trim().toLowerCase()
      const filtered = search ? all.filter((r) => r.email.includes(search)) : all

      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)

      const counts = { all: all.length }
      for (const r of all) counts[r.source] = (counts[r.source] || 0) + 1

      return res.status(200).json({
        success: true,
        items: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        counts,
      })
    }

    if (action === 'delete' && req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Invalid JSON body' })
      const id = String(body.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })

      const ref = col.doc(id)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Subscriber not found' })

      await ref.delete()
      console.log(`[admin-newsletter] ${id} removed by ${admin.uid}`)
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-newsletter] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
