// src/api-handlers/admin-email.js
//
// Admin > Email Broadcast. Campaigns are drafted, previewed, tested, sent in
// chunks ("the next N who have not had it"), scheduled, duplicated and
// deleted from here. The engine is _lib/email-broadcast.js.
//
// Super admin and marketing, matching Push Broadcast: it reaches every user's
// inbox and cannot be recalled once delivered.
//
// Actions
//   GET  list                         campaigns, newest first, without bodies
//   GET  get&id=                      one campaign, with html and design data
//   GET  quota                        today's Resend usage and what may be sent
//   POST save      { id?, ...fields } create or update a draft
//   POST delete    { id }             campaign and its recipient log
//   POST duplicate { id }             a fresh draft copy (the "reuse" option)
//   POST audience  { audience, id? }  eligible, suppressed, already sent, pending
//   POST test      { id, to[] }       up to 5 test copies
//   POST send      { id, count }      send to the next `count` now
//   POST schedule  { id, scheduledAt, count }
//   POST unschedule { id }
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors } from './_lib/http.js'
import {
  BROADCAST_SENDERS,
  CAMPAIGNS,
  normaliseAudience,
  pendingRecipients,
  quotaStatus,
  sendNextChunk,
  sendTest,
} from './_lib/email-broadcast.js'

const MAX_HTML = 700 * 1024
const MAX_PROJECT = 250 * 1024
const MAX_SEND = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function parseBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return null
  }
}

const iso = (v) => (v?.toDate?.() ? v.toDate().toISOString() : v || null)

function summary(id, c) {
  return {
    id,
    name: c.name || 'Untitled',
    subject: c.subject || '',
    sender: c.sender || 'info',
    status: c.status || 'draft',
    audience: normaliseAudience(c.audience),
    counts: { sent: c.counts?.sent || 0, failed: c.counts?.failed || 0 },
    scheduledAt: c.scheduledAt || null,
    scheduledCount: c.scheduledCount || null,
    lastScheduleNote: c.lastScheduleNote || null,
    lastSentAt: c.lastSentAt || null,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  }
}

/** Only the fields an admin may set, cleaned. */
function cleanFields(body) {
  const out = {}
  if (body.name !== undefined) out.name = String(body.name).trim().slice(0, 120) || 'Untitled'
  if (body.subject !== undefined) out.subject = String(body.subject).trim().slice(0, 200)
  if (body.preheader !== undefined) out.preheader = String(body.preheader).trim().slice(0, 200)
  if (body.sender !== undefined) out.sender = BROADCAST_SENDERS.includes(body.sender) ? body.sender : 'info'
  if (body.audience !== undefined) out.audience = normaliseAudience(body.audience)
  if (body.html !== undefined) {
    const html = String(body.html)
    if (html.length > MAX_HTML) throw new Error('The email is too large. Use image links rather than pasted images.')
    out.html = html
  }
  if (body.projectData !== undefined) {
    const project = typeof body.projectData === 'string' ? body.projectData : JSON.stringify(body.projectData || null)
    if (project.length > MAX_PROJECT) throw new Error('The design is too large to save.')
    out.projectData = project
  }
  return out
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'email')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const db = getAdminDb()
  const col = db.collection(CAMPAIGNS)
  const action = req.query.action || 'list'
  const actor = admin.email || admin.uid || 'admin'

  try {
    if (req.method === 'GET') {
      if (action === 'list') {
        const snap = await col.orderBy('updatedAt', 'desc').limit(100)
          .select('name', 'subject', 'sender', 'status', 'audience', 'counts', 'scheduledAt', 'scheduledCount', 'lastScheduleNote', 'lastSentAt', 'createdAt', 'updatedAt')
          .get()
        return res.status(200).json({ success: true, campaigns: snap.docs.map((d) => summary(d.id, d.data())) })
      }
      if (action === 'get') {
        const snap = await col.doc(String(req.query.id || '')).get()
        if (!snap.exists) return res.status(404).json({ error: 'Campaign not found' })
        const c = snap.data()
        return res.status(200).json({
          success: true,
          campaign: { ...summary(snap.id, c), preheader: c.preheader || '', html: c.html || '', projectData: c.projectData || null, history: c.history || [] },
        })
      }
      if (action === 'quota') {
        return res.status(200).json({ success: true, quota: await quotaStatus(db) })
      }
      return res.status(400).json({ error: 'Invalid action' })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Invalid JSON body' })

    if (action === 'save') {
      let fields
      try { fields = cleanFields(body) } catch (err) { return res.status(400).json({ error: err.message }) }
      const now = FieldValue.serverTimestamp()
      if (body.id) {
        const ref = col.doc(String(body.id))
        const snap = await ref.get()
        if (!snap.exists) return res.status(404).json({ error: 'Campaign not found' })
        await ref.update({ ...fields, updatedAt: now, updatedBy: actor })
        return res.status(200).json({ success: true, id: ref.id })
      }
      const ref = await col.add({
        name: 'Untitled', subject: '', preheader: '', html: '', projectData: null, sender: 'info',
        audience: normaliseAudience({}), status: 'draft', counts: { sent: 0, failed: 0 },
        ...fields, createdAt: now, updatedAt: now, createdBy: actor,
      })
      return res.status(200).json({ success: true, id: ref.id })
    }

    const id = String(body.id || '')
    const ref = id ? col.doc(id) : null

    if (action === 'audience') {
      const audience = normaliseAudience(body.audience)
      const target = ref || col.doc('__preview__')
      const counts = await pendingRecipients(db, target, audience)
      return res.status(200).json({
        success: true,
        eligible: counts.eligible,
        suppressed: counts.suppressed,
        alreadySent: counts.alreadySent,
        pending: counts.pending.length,
        byKind: counts.pending.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] || 0) + 1 }), {}),
      })
    }

    if (!ref) return res.status(400).json({ error: 'Missing id' })
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Campaign not found' })
    const campaign = snap.data()

    if (action === 'delete') {
      if (campaign.sendingLockAt && Date.now() - campaign.sendingLockAt < 120000) {
        return res.status(409).json({ error: 'This campaign is sending right now. Try again in a minute.' })
      }
      // The recipient log first, in pages, then the campaign itself.
      for (;;) {
        const page = await ref.collection('recipients').limit(400).get()
        if (page.empty) break
        const batch = db.batch()
        page.docs.forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
      await ref.delete()
      console.log(`[admin-email] campaign ${id} deleted by ${actor}`)
      return res.status(200).json({ success: true })
    }

    if (action === 'duplicate') {
      const now = FieldValue.serverTimestamp()
      const copy = await col.add({
        name: `${campaign.name || 'Untitled'} (copy)`.slice(0, 120),
        subject: campaign.subject || '', preheader: campaign.preheader || '',
        html: campaign.html || '', projectData: campaign.projectData || null,
        sender: campaign.sender || 'info', audience: normaliseAudience(campaign.audience),
        status: 'draft', counts: { sent: 0, failed: 0 },
        createdAt: now, updatedAt: now, createdBy: actor, duplicatedFrom: id,
      })
      return res.status(200).json({ success: true, id: copy.id })
    }

    if (action === 'test') {
      const to = (Array.isArray(body.to) ? body.to : [body.to])
        .map((e) => String(e || '').trim()).filter((e) => EMAIL_RE.test(e)).slice(0, 5)
      if (!to.length) return res.status(400).json({ error: 'Enter at least one valid email address.' })
      if (!campaign.subject || !campaign.html) return res.status(400).json({ error: 'Save a subject and content first.' })
      const results = await sendTest(db, campaign, to)
      return res.status(200).json({ success: results.every((r) => r.ok), results })
    }

    if (action === 'send') {
      const count = Math.floor(Number(body.count))
      if (!Number.isFinite(count) || count < 1 || count > MAX_SEND) {
        return res.status(400).json({ error: `Choose between 1 and ${MAX_SEND} recipients.` })
      }
      if (campaign.status === 'scheduled') {
        return res.status(409).json({ error: 'This campaign is scheduled. Unschedule it first to send now.' })
      }
      const result = await sendNextChunk(db, id, count, { trigger: 'manual', actor })
      return res.status(result.ok || result.sent ? 200 : 400).json({ success: result.ok, ...result })
    }

    if (action === 'schedule') {
      const at = typeof body.scheduledAt === 'number' ? body.scheduledAt : Date.parse(body.scheduledAt)
      const count = Math.floor(Number(body.count))
      if (!Number.isFinite(at) || at < Date.now() + 60 * 1000) {
        return res.status(400).json({ error: 'Pick a time at least a minute from now.' })
      }
      if (!Number.isFinite(count) || count < 1 || count > MAX_SEND) {
        return res.status(400).json({ error: `Choose between 1 and ${MAX_SEND} recipients.` })
      }
      if (!campaign.subject || !campaign.html) return res.status(400).json({ error: 'Save a subject and content first.' })
      await ref.update({
        status: 'scheduled',
        statusBeforeSchedule: campaign.status === 'scheduled' ? campaign.statusBeforeSchedule || 'draft' : campaign.status || 'draft',
        scheduledAt: at,
        scheduledCount: count,
        lastScheduleNote: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return res.status(200).json({ success: true })
    }

    if (action === 'unschedule') {
      if (campaign.status !== 'scheduled') return res.status(400).json({ error: 'This campaign is not scheduled.' })
      await ref.update({
        status: campaign.statusBeforeSchedule || 'draft',
        scheduledAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-email] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
