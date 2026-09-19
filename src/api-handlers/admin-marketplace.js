// src/api-handlers/admin-marketplace.js
//
// Admin side of the dropshipping marketplace. Phase 0: the waitlist.
//
//   GET  ?action=waitlist   one merged list: public sign ups (marketplaceWaitlist)
//                           + stores that ticked supply/dropship
//                           (stores.marketplaceInterest), with each store's
//                           readiness so the admin can see who is close to
//                           being able to supply at launch
//   GET  ?action=export     every email on that list
//   POST ?action=delete     { id } removes a PUBLIC sign up (a store's
//                           interest is the vendor's own setting)
//
// Phase 1 adds supplier applications and approvals to this same handler.
// Tab `marketplace`: super_admin and operations (Docs/Dropshipping-Marketplace-Plan.md, Part F).

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors, parseJsonBody } from './_lib/http.js'
import { readInterest, roleFromInterest, readiness } from '../utils/marketplace.js'

const iso = (v) => {
  if (typeof v === 'string') return v
  const d = v?.toDate?.() || (v instanceof Date ? v : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

function storeRow(id, s) {
  const role = roleFromInterest(readInterest(s))
  const supplierChecks = readiness(s, 'supply').filter((i) => !i.pending)
  return {
    id: `store:${id}`,
    kind: 'store',
    storeId: id,
    name: s.businessName || '',
    storeName: s.storeName || '',
    email: s.email || '',
    phone: s.whatsappNumber || '',
    role,
    plan: String(s.plan || 'starter').toLowerCase(),
    checks: Object.fromEntries(supplierChecks.map((i) => [i.key, i.done])),
    // Everything a supplier needs today except the launch-time video.
    supplierReady: supplierChecks.every((i) => i.done),
    createdAt: iso(s.createdAt),
  }
}

async function loadAll(db) {
  const [pub, supply, dropship] = await Promise.all([
    db.collection('marketplaceWaitlist').orderBy('createdAt', 'desc').limit(5000).get(),
    db.collection('stores').where('marketplaceInterest.supply', '==', true).limit(5000).get(),
    db.collection('stores').where('marketplaceInterest.dropship', '==', true).limit(5000).get(),
  ])

  const stores = new Map()
  for (const d of [...supply.docs, ...dropship.docs]) stores.set(d.id, storeRow(d.id, d.data()))

  const people = pub.docs.map((d) => {
    const r = d.data()
    return {
      id: `page:${d.id}`,
      kind: 'page',
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      sells: r.sells || '',
      role: r.role || 'supply',
      createdAt: iso(r.createdAt),
    }
  })

  // Stores first (they can act on it soonest), then public sign ups, newest first.
  const byDate = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  return [...[...stores.values()].sort(byDate), ...people.sort(byDate)]
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'marketplace')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'waitlist'

    if (action === 'waitlist' || action === 'export') {
      const all = await loadAll(db)

      if (action === 'export') {
        const emails = [...new Set(all.map((r) => r.email.toLowerCase()).filter(Boolean))]
        return res.status(200).json({ success: true, emails })
      }

      const counts = {
        all: all.length,
        supply: all.filter((r) => r.role === 'supply' || r.role === 'both').length,
        dropship: all.filter((r) => r.role === 'dropship' || r.role === 'both').length,
        stores: all.filter((r) => r.kind === 'store').length,
        page: all.filter((r) => r.kind === 'page').length,
        supplierReady: all.filter((r) => r.kind === 'store' && r.supplierReady && (r.role === 'supply' || r.role === 'both')).length,
      }

      const role = ['supply', 'dropship'].includes(req.query.role) ? req.query.role : null
      const search = String(req.query.search || '').trim().toLowerCase()
      const filtered = all.filter((r) => {
        if (role && r.role !== role && r.role !== 'both') return false
        if (!search) return true
        return [r.name, r.email, r.storeName, r.phone, r.sells].some((v) => String(v || '').toLowerCase().includes(search))
      })

      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
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
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      const id = String(body.id || '')
      if (!id.startsWith('page:')) {
        return res.status(400).json({ error: 'Only public sign ups can be removed here. A store changes its own interest in Settings.' })
      }
      await db.collection('marketplaceWaitlist').doc(id.slice(5)).delete()
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-marketplace] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
