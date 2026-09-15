// src/api-handlers/admin-partners.js
//
// Admin side of the Investors & Partners page: list, triage and delete the
// enquiries /api/partner-enquiry stores.
//
// Super admin only (see TAB_ACCESS in _lib/verify-admin.js). These records are
// people's names, emails and phone numbers attached to investment intentions,
// which is more sensitive than anything the support or marketing roles need.
// Delete exists because the NDPA gives a person the right to have their data
// erased, and the page promises they can ask.

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { ENQUIRY_STATUSES, INTEREST_OPTIONS } from '../utils/partnerEnquiry.js'
import { DEFAULT_TRACTION, validateTraction, hasTractionErrors } from '../utils/partnersContent.js'

// Traction figures for the public page. Read by /api/partners-content.
const CONTENT_DOC = 'partnersPage'

const STATUS_IDS = ENQUIRY_STATUSES.map((s) => s.id)
const INTEREST_IDS = INTEREST_OPTIONS.map((o) => o.id)
const CLOSED = ['closed', 'not_a_fit']
const MAX_NOTES = 2000

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

  const admin = await verifyAdmin(req, 'partners')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const col = db.collection('partnerEnquiries')
    const action = req.query.action || 'list'

    if (action === 'list') {
      const status = String(req.query.status || 'open')
      const interest = String(req.query.interest || 'all')
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)

      // Enquiries arrive in the tens, not thousands, so one bounded read and
      // in-memory filtering keeps every count exact without composite indexes.
      const snap = await col.orderBy('createdAt', 'desc').limit(1000).get()
      const all = snap.docs.map((d) => {
        const r = d.data()
        return {
          id: d.id,
          interest: r.interest || '',
          fullName: r.fullName || '',
          email: r.email || '',
          phone: r.phone || '',
          organisation: r.organisation || '',
          investorType: r.investorType || '',
          ticketSize: r.ticketSize || '',
          link: r.link || '',
          source: r.source || '',
          message: r.message || '',
          status: STATUS_IDS.includes(r.status) ? r.status : 'new',
          adminNotes: r.adminNotes || '',
          consentAt: iso(r.consent?.at),
          createdAt: iso(r.createdAt),
          updatedAt: iso(r.updatedAt),
        }
      })

      const isOpen = (r) => !CLOSED.includes(r.status)
      const byStatus = all.filter((r) =>
        status === 'all' ? true : status === 'open' ? isOpen(r) : r.status === status,
      )
      const filtered = interest === 'all' ? byStatus : byStatus.filter((r) => r.interest === interest)

      const counts = { open: all.filter(isOpen).length, all: all.length }
      for (const s of STATUS_IDS) counts[s] = all.filter((r) => r.status === s).length

      // Interest counts follow the status filter, so the chips always add up
      // to what is on screen.
      const interestCounts = { all: byStatus.length }
      for (const i of INTEREST_IDS) interestCounts[i] = byStatus.filter((r) => r.interest === i).length

      return res.status(200).json({
        success: true,
        items: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        counts,
        interestCounts,
      })
    }

    if (action === 'update' && req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Invalid JSON body' })
      const id = String(body.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })

      const update = {}
      if (body.status !== undefined) {
        if (!STATUS_IDS.includes(body.status)) return res.status(400).json({ error: 'Invalid status' })
        update.status = body.status
        // Attribution from the verified admin, never from the request body.
        update.statusChangedBy = admin.uid
      }
      if (body.adminNotes !== undefined) {
        update.adminNotes = String(body.adminNotes).slice(0, MAX_NOTES)
      }
      if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' })

      const ref = col.doc(id)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Enquiry not found' })

      await ref.update({ ...update, updatedAt: new Date() })
      return res.status(200).json({ success: true })
    }

    if (action === 'delete' && req.method === 'POST') {
      if (admin.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Invalid JSON body' })
      const id = String(body.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })

      const ref = col.doc(id)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Enquiry not found' })

      await ref.delete()
      console.log(`[admin-partners] enquiry ${id} deleted by ${admin.uid}`)
      return res.status(200).json({ success: true })
    }

    if (action === 'get-content') {
      const snap = await db.collection('platformSettings').doc(CONTENT_DOC).get()
      const data = snap.exists ? snap.data() : null
      return res.status(200).json({
        success: true,
        traction: data?.traction || DEFAULT_TRACTION,
        saved: !!data?.traction,
        updatedAt: iso(data?.updatedAt),
      })
    }

    if (action === 'save-content' && req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Invalid JSON body' })
      const { value, errors } = validateTraction(body.traction || {})
      if (hasTractionErrors(errors)) {
        return res.status(400).json({ error: 'validation', errors, message: 'Some figures are incomplete. Fix the highlighted fields.' })
      }
      const now = new Date()
      await db.collection('platformSettings').doc(CONTENT_DOC).set(
        { traction: value, updatedAt: now, updatedBy: admin.uid },
        { merge: true },
      )
      return res.status(200).json({ success: true, traction: value, updatedAt: now.toISOString() })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-partners] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
