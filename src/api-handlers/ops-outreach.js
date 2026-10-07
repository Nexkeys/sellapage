// src/api-handlers/ops-outreach.js
//
// The Outreach Tracker tab of the Sellapage Ops console. Reaching out to
// merchants (reactivation) and to prospects who have not signed up (direct
// acquisition), and measuring what happens next:
//   Contacted -> Responded -> Came back / Signed up -> Store complete ->
//   Shared -> First enquiry or order
// The last steps are worked out from the merchant fact sheet (ops-facts.js),
// so nobody has to update them by hand: a merchant who signs in, adds
// products, shares or gets a customer after being contacted shows it here.
//
//   GET  ?action=list&status=&angle=&channel=&owner=&q=&page=&limit=
//   GET  ?action=stats
//   POST ?action=add-merchants { storeIds, angle, channel }
//   POST ?action=add-prospect  { name, business, phone, email, handle, channel, angle, note }
//   POST ?action=update        { id, status?, angle?, channel?, ownerUid?, note? }
//   POST ?action=archive       { id }
import { getAdminDb } from './_lib/firebase-admin.js'
import { parseJsonBody } from './_lib/http.js'
import { verifyOpsRequest, writeAudit, loadStaff } from './_lib/ops.js'
import { getMerchantFacts, normPhone } from './_lib/ops-facts.js'

export const OUTREACH_COLLECTION = 'opsOutreach'
const STATUSES = ['to_contact', 'contacted', 'no_answer', 'responded', 'interested', 'not_interested']
const RESPONDED = new Set(['responded', 'interested', 'not_interested'])
const CHANNELS = ['whatsapp', 'instagram', 'tiktok', 'call', 'sms', 'email', 'community', 'in_person', 'other']
const ANGLES = ['storefront', 'orders', 'presence', 'reactivation', 'referral', 'other']
const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const fail = (res, status, error, message) => res.status(status).json({ success: false, error, message })
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback)

function matchStore(rec, facts, byPhone, byEmail, bySlug) {
  if (rec.storeId) return facts.get(rec.storeId) || null
  const phone = normPhone(rec.phone)
  const f = (phone && byPhone.get(phone)) || (rec.email && byEmail.get(String(rec.email).toLowerCase())) || (rec.handle && bySlug.get(String(rec.handle).toLowerCase().replace(/^@/, '')))
  // A prospect only counts as signed up if the store is newer than the record.
  return f && f.createdAt >= (rec.createdAt || 0) - 60 * 60 * 1000 ? f : null
}

function outcomesFor(rec, f) {
  const since = rec.contactedAt || rec.createdAt || 0
  if (!f) return { signedUp: false, returned: false, completed: false, shared: false, interaction: false }
  const b = rec.baseline || {}
  return {
    signedUp: rec.kind === 'prospect',
    returned: !!f.lastActiveAt && f.lastActiveAt > since,
    completed: f.complete && (rec.kind === 'prospect' || !b.complete),
    shared: (f.lastSharedAt && f.lastSharedAt > since) || (f.shared && rec.kind === 'merchant' && !b.shared) || (rec.kind === 'prospect' && f.shared),
    interaction: !!f.lastInteractionAt && f.lastInteractionAt > since,
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const action = String(req.query?.action || 'list')
  const v = await verifyOpsRequest(req, 'outreach')
  if (!v.ok) {
    req.__opsDenied = { reason: v.reason, uid: v.uid || null, staff: v.staff || null, quiet: v.quiet === true }
    const gone = /^(session_|staff_|no_|bad_token)/.test(v.reason)
    return fail(res, gone ? 401 : 403, gone ? 'session_ended' : v.reason, 'Not allowed.')
  }
  const me = v.staff
  const db = getAdminDb()
  const col = db.collection(OUTREACH_COLLECTION)
  let body = {}
  if (req.method === 'POST') {
    try { body = parseJsonBody(req) || {} } catch { return fail(res, 400, 'invalid_json', 'Invalid request.') }
  }
  const log = (entry) => writeAudit(db, { uid: me.uid, name: me.name, title: me.title, sessionId: v.sessionId, req, tab: 'outreach', ...entry })

  try {
    if (req.method === 'GET' && (action === 'list' || action === 'stats')) {
      const [snap, { facts }] = await Promise.all([col.get(), getMerchantFacts()])
      const byPhone = new Map()
      const byEmail = new Map()
      const bySlug = new Map()
      for (const f of facts.values()) {
        if (f.phone) byPhone.set(normPhone(f.phone), f)
        if (f.email) byEmail.set(f.email.toLowerCase(), f)
        if (f.slug) bySlug.set(f.slug.toLowerCase(), f)
      }
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => !r.archived).map((r) => {
        const f = matchStore(r, facts, byPhone, byEmail, bySlug)
        return { ...r, store: f ? { id: f.id, name: f.name, slug: f.slug, products: f.products, complete: f.complete, shared: f.shared, visits: f.visits, lastActiveAt: f.lastActiveAt, interactions: f.interactions, segment: f.segment } : null, outcome: outcomesFor(r, f) }
      })

      if (action === 'stats') {
        const group = (key, values) => values.map((val) => {
          const g = rows.filter((r) => r[key] === val && r.status !== 'to_contact')
          const prospects = g.filter((r) => r.kind === 'prospect')
          return {
            id: val, contacted: g.length,
            responded: g.filter((r) => RESPONDED.has(r.status)).length,
            signedUp: prospects.filter((r) => r.outcome.signedUp).length, prospects: prospects.length,
            returned: g.filter((r) => r.kind === 'merchant' && r.outcome.returned).length,
            completed: g.filter((r) => r.outcome.completed).length,
            shared: g.filter((r) => r.outcome.shared).length,
            interaction: g.filter((r) => r.outcome.interaction).length,
          }
        }).filter((x) => x.contacted > 0)
        const contacted = rows.filter((r) => r.status !== 'to_contact')
        const weeks = Array.from({ length: 8 }, (_, i) => {
          const end = Date.now() - (7 - i) * 7 * 864e5
          const start = end - 7 * 864e5
          return { week: new Date(start).toISOString().slice(0, 10), contacted: contacted.filter((r) => r.contactedAt >= start && r.contactedAt < end).length, responded: contacted.filter((r) => r.respondedAt >= start && r.respondedAt < end).length }
        })
        const people = {}
        for (const r of contacted) {
          const k = r.ownerUid || r.createdBy || 'unknown'
          const p = (people[k] ||= { uid: k, name: r.ownerName || r.createdByName || 'Unknown', contacted: 0, responded: 0, wins: 0 })
          p.contacted += 1
          if (RESPONDED.has(r.status)) p.responded += 1
          if (r.outcome.interaction || r.outcome.completed || r.outcome.signedUp) p.wins += 1
        }
        return res.status(200).json({
          success: true,
          totals: {
            onBoard: rows.length,
            toContact: rows.filter((r) => r.status === 'to_contact').length,
            contacted: contacted.length,
            responded: contacted.filter((r) => RESPONDED.has(r.status)).length,
            interested: contacted.filter((r) => r.status === 'interested').length,
            returned: contacted.filter((r) => r.kind === 'merchant' && r.outcome.returned).length,
            signedUp: contacted.filter((r) => r.kind === 'prospect' && r.outcome.signedUp).length,
            completed: contacted.filter((r) => r.outcome.completed).length,
            shared: contacted.filter((r) => r.outcome.shared).length,
            interaction: contacted.filter((r) => r.outcome.interaction).length,
          },
          byAngle: group('angle', ANGLES),
          byChannel: group('channel', CHANNELS),
          weeks,
          people: Object.values(people).sort((a, b) => b.contacted - a.contacted),
        })
      }

      const q = req.query || {}
      const needle = String(q.q || '').trim().toLowerCase()
      let list = rows
      if (q.status) list = list.filter((r) => r.status === q.status)
      if (q.angle) list = list.filter((r) => r.angle === q.angle)
      if (q.channel) list = list.filter((r) => r.channel === q.channel)
      if (q.kind) list = list.filter((r) => r.kind === q.kind)
      if (q.owner === 'me') list = list.filter((r) => (r.ownerUid || r.createdBy) === me.uid)
      if (needle) list = list.filter((r) => `${r.name} ${r.business} ${r.phone} ${r.email} ${r.handle} ${r.store?.name || ''}`.toLowerCase().includes(needle))
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      const limit = Math.min(Math.max(Number(q.limit) || 15, 5), 50)
      const page = Math.max(1, Number(q.page) || 1)
      const counts = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]))
      return res.status(200).json({ success: true, total: list.length, page, limit, counts, rows: list.slice((page - 1) * limit, page * limit) })
    }

    if (req.method !== 'POST') return fail(res, 405, 'method', 'Method not allowed.')
    const now = Date.now()

    if (action === 'add-merchants') {
      const ids = Array.isArray(body.storeIds) ? [...new Set(body.storeIds.map(String))].slice(0, 200) : []
      if (!ids.length) return fail(res, 400, 'empty', 'Pick at least one merchant.')
      const { facts } = await getMerchantFacts()
      const existing = await col.where('kind', '==', 'merchant').get()
      const open = new Set(existing.docs.filter((d) => !d.get('archived')).map((d) => d.get('storeId')))
      const angle = pick(body.angle, ANGLES, 'reactivation')
      const channel = pick(body.channel, CHANNELS, 'whatsapp')
      let added = 0
      const batch = db.batch()
      for (const id of ids) {
        const f = facts.get(id)
        if (!f || open.has(id)) continue
        batch.set(col.doc(), {
          kind: 'merchant', storeId: id, name: f.owner || f.name, business: f.name, phone: f.phone, email: f.email, handle: f.slug,
          channel, angle, status: 'to_contact', segmentAtContact: f.segment, notes: [],
          baseline: { products: f.products, complete: f.complete, shared: f.shared, interactions: f.interactions, lastActiveAt: f.lastActiveAt },
          ownerUid: me.uid, ownerName: me.name, createdAt: now, createdBy: me.uid, createdByName: me.name, updatedAt: now, contactedAt: null, respondedAt: null, archived: false,
        })
        added += 1
      }
      if (added) await batch.commit()
      await log({ action: 'outreach.contact', summary: `Added ${added} merchant${added === 1 ? '' : 's'} to the outreach board (${angle})` })
      return res.status(200).json({ success: true, added, skipped: ids.length - added })
    }

    if (action === 'add-prospect') {
      const name = clean(body.name, 80)
      const business = clean(body.business, 120)
      if (!name && !business) return fail(res, 400, 'name', 'Enter a name or a business.')
      const phone = clean(body.phone, 30)
      const email = clean(body.email, 200).toLowerCase()
      const handle = clean(body.handle, 80).replace(/^@/, '')
      if (!phone && !email && !handle) return fail(res, 400, 'contact', 'Add a phone, email or social handle so we can match them when they sign up.')
      const note = clean(body.note, 1000)
      const ref = await col.add({
        kind: 'prospect', storeId: null, name, business, phone, email, handle,
        channel: pick(body.channel, CHANNELS, 'whatsapp'), angle: pick(body.angle, ANGLES, 'storefront'),
        status: body.contacted ? 'contacted' : 'to_contact', notes: note ? [{ at: now, by: me.uid, byName: me.name, text: note }] : [],
        ownerUid: me.uid, ownerName: me.name, createdAt: now, createdBy: me.uid, createdByName: me.name, updatedAt: now,
        contactedAt: body.contacted ? now : null, respondedAt: null, archived: false, baseline: null,
      })
      await log({ action: 'outreach.prospect', target: { type: 'prospect', id: ref.id, label: business || name }, summary: `Added prospect ${business || name}` })
      return res.status(200).json({ success: true, id: ref.id })
    }

    if (action === 'update' || action === 'archive') {
      const ref = col.doc(String(body.id || ''))
      const snap = await ref.get()
      if (!snap.exists) return fail(res, 404, 'not_found', 'That contact no longer exists.')
      const r = snap.data()
      if (action === 'archive') {
        await ref.update({ archived: true, updatedAt: now })
        await log({ action: 'outreach.update', target: { type: r.kind, id: ref.id, label: r.business || r.name }, summary: `Removed ${r.business || r.name} from the board` })
        return res.status(200).json({ success: true })
      }
      const update = { updatedAt: now }
      const bits = []
      if (body.status !== undefined) {
        const status = pick(body.status, STATUSES, r.status)
        if (status !== r.status) {
          update.status = status
          bits.push(`status ${String(r.status).replace('_', ' ')} to ${status.replace('_', ' ')}`)
          if (status !== 'to_contact' && !r.contactedAt) update.contactedAt = now
          if (RESPONDED.has(status) && !r.respondedAt) update.respondedAt = now
          // Contacting a merchant fixes the "before" picture outcomes compare to.
          if (status === 'contacted' && r.kind === 'merchant' && !r.contactedAt) {
            const { facts } = await getMerchantFacts()
            const f = facts.get(r.storeId)
            if (f) update.baseline = { products: f.products, complete: f.complete, shared: f.shared, interactions: f.interactions, lastActiveAt: f.lastActiveAt }
          }
        }
      }
      if (body.angle !== undefined) update.angle = pick(body.angle, ANGLES, r.angle)
      if (body.channel !== undefined) update.channel = pick(body.channel, CHANNELS, r.channel)
      if (body.ownerUid !== undefined) {
        const owner = body.ownerUid ? await loadStaff(db, String(body.ownerUid)) : null
        if (owner && owner.status === 'active') { update.ownerUid = owner.uid; update.ownerName = owner.name; bits.push(`assigned to ${owner.name}`) }
      }
      const note = clean(body.note, 1000)
      if (note) {
        update.notes = [...(r.notes || []), { at: now, by: me.uid, byName: me.name, text: note }].slice(-50)
        bits.push('added a note')
      }
      await ref.update(update)
      await log({ action: 'outreach.update', target: { type: r.kind, id: ref.id, label: r.business || r.name }, summary: `${r.business || r.name}: ${bits.join('; ') || 'updated'}` })
      return res.status(200).json({ success: true })
    }

    return fail(res, 400, 'invalid_action', 'Invalid request.')
  } catch (err) {
    console.error('[ops-outreach]', err.message)
    return fail(res, 500, 'server_error', 'Something went wrong. Please try again.')
  }
}
