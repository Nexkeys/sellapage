// src/api-handlers/ops-insights.js
//
// Read-only numbers for the Sellapage Ops console. Every answer is limited to
// the tabs the signed-in person can open.
//
//   GET ?action=attention          what is waiting for a person (any session)
//   GET ?action=away               what happened since this person was last here
//   GET ?action=pulse              Platform Pulse: metrics, sparklines, feed (health)
//   GET ?action=growth[&fresh=1]   the CEO's funnel, segments, channels (growth)
//   GET ?action=segment&id=&q=&page=&limit=&sort=[&format=csv]  merchant lists
//                                  (growth or outreach)
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyOpsRequest, writeAudit, auditIdBound, COL } from './_lib/ops.js'
import { opsCanOpen } from '../utils/opsAccess.js'
import { HEARD_ABOUT_SOURCES } from '../utils/heardAbout.js'
import { getMerchantFacts, SEGMENTS, factRow } from './_lib/ops-facts.js'

const DAY = 24 * 60 * 60 * 1000
const fail = (res, status, error, message) => res.status(status).json({ success: false, error, message })
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0)
const median = (arr) => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const countOf = async (q) => {
  try { return (await q.count().get()).data().count } catch { return 0 }
}
const SOURCE_LABEL = Object.fromEntries([...HEARD_ABOUT_SOURCES.map((s) => [s.id, s.label]), ['unknown', 'Not asked (signed up before Oct 2026)']])

// What can be waiting for a person, by tab.
function attentionQueries(db) {
  return {
    recovery: { title: 'Account recovery requests', q: () => db.collection('recoveryRequests').where('status', '==', 'pending'), unit: 'waiting for a decision' },
    withdrawals: { title: 'Payout requests', q: () => db.collection('withdrawal_requests').where('status', '==', 'pending'), unit: 'waiting to be paid' },
    cac: { title: 'CAC registration requests', q: () => db.collection('cacRequests').where('status', 'in', ['new', 'pending']), unit: 'new' },
    tickets: { title: 'Support tickets', q: () => db.collection('supportMessages').where('status', 'in', ['open', 'in_progress']), unit: 'open' },
    reports: { title: 'Store reports', q: () => db.collection('storeReports').where('status', '==', 'pending'), unit: 'not reviewed' },
    jobs: { title: 'Job listings', q: () => db.collection('jobListings').where('status', '==', 'pending'), unit: 'to approve' },
    domains: { title: 'Custom domains', q: () => db.collection('stores').where('domainStatus', 'in', ['pending', 'failed']), unit: 'not working yet' },
    marketplace: { title: 'Supplier applications', q: () => db.collection('stores').where('supplierStatus', '==', 'pending'), unit: 'to decide' },
    admins: { title: 'Authenticator resets', q: () => db.collection(COL.resets).where('status', '==', 'pending'), unit: 'to approve' },
  }
}

// New things since a moment, by tab (for "while you were away").
function sinceQueries(db, since) {
  const d = new Date(since)
  return {
    directory: { label: (n) => `${n} new store${n === 1 ? '' : 's'} signed up`, q: () => db.collection('stores').where('createdAt', '>', d) },
    tickets: { label: (n) => `${n} new support ticket${n === 1 ? '' : 's'}`, q: () => db.collection('supportMessages').where('createdAt', '>', d) },
    cac: { label: (n) => `${n} new CAC request${n === 1 ? '' : 's'}`, q: () => db.collection('cacRequests').where('createdAt', '>', d) },
    withdrawals: { label: (n) => `${n} new payout request${n === 1 ? '' : 's'}`, q: () => db.collection('withdrawal_requests').where('createdAt', '>', d.toISOString()) },
    recovery: { label: (n) => `${n} new recovery request${n === 1 ? '' : 's'}`, q: () => db.collection('recoveryRequests').where('createdAtMs', '>', since) },
    reports: { label: (n) => `${n} store${n === 1 ? '' : 's'} reported`, q: () => db.collection('storeReports').where('createdAt', '>', d) },
    jobs: { label: (n) => `${n} new job listing${n === 1 ? '' : 's'}`, q: () => db.collection('jobListings').where('createdAt', '>', d) },
  }
}

function dailySeries(facts, days, pick) {
  const out = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const from = start.getTime() - i * DAY
    out.push({ day: new Date(from).toISOString().slice(0, 10), n: 0, from })
  }
  for (const f of facts.values()) {
    const at = pick(f)
    if (!at) continue
    const idx = out.findIndex((b) => at >= b.from && at < b.from + DAY)
    if (idx >= 0) out[idx].n += 1
  }
  return out.map(({ day, n }) => ({ day, n }))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return fail(res, 405, 'method', 'Method not allowed.')
  const action = String(req.query?.action || '')
  const needTab = { pulse: 'health', growth: 'growth' }[action] || null
  const v = await verifyOpsRequest(req, needTab)
  if (!v.ok) {
    req.__opsDenied = { reason: v.reason, uid: v.uid || null, staff: v.staff || null, quiet: v.quiet === true }
    const gone = /^(session_|staff_|no_|bad_token)/.test(v.reason)
    return fail(res, gone ? 401 : 403, gone ? 'session_ended' : v.reason, 'Not allowed.')
  }
  const me = v.staff
  const can = (tab) => opsCanOpen(me, tab)
  const db = getAdminDb()

  try {
    if (action === 'attention') {
      const all = attentionQueries(db)
      const tabs = Object.keys(all).filter(can)
      const counts = await Promise.all(tabs.map((t) => countOf(all[t].q())))
      const items = tabs.map((t, i) => ({ tab: t, title: all[t].title, count: counts[i], detail: `${counts[i]} ${all[t].unit}` })).filter((x) => x.count > 0)
      return res.status(200).json({ success: true, items, total: items.reduce((n, x) => n + x.count, 0) })
    }

    if (action === 'away') {
      const since = Number(me.previousSeenAt) || 0
      if (!since) return res.status(200).json({ success: true, since: 0, total: 0, items: [], team: [] })
      const q = sinceQueries(db, since)
      const tabs = Object.keys(q).filter(can)
      const counts = await Promise.all(tabs.map((t) => countOf(q[t].q())))
      const items = tabs.map((t, i) => ({ tab: t, count: counts[i], label: q[t].label(counts[i]) })).filter((x) => x.count > 0)
      // What the rest of the team did in the tabs this person can see.
      const snap = await db.collection(COL.audit).orderBy('__name__').endAt(`${auditIdBound(since)}~`).limit(300).get()
      const team = snap.docs.map((d) => d.data())
        .filter((r) => r.uid !== me.uid && r.at > since && r.result === 'ok' && (me.isSuper || (r.tab && can(r.tab))) && !String(r.action).startsWith('ops.log'))
      const teamCount = team.length
      if (teamCount) items.push({ tab: can('activity') ? 'activity' : null, count: teamCount, label: `${teamCount} change${teamCount === 1 ? '' : 's'} by the team` })
      return res.status(200).json({
        success: true, since, items,
        total: items.reduce((n, x) => n + x.count, 0),
        team: team.slice(0, 6).map((r) => ({ at: r.at, name: r.name, title: r.title, summary: r.summary, action: r.action, tab: r.tab })),
      })
    }

    if (action === 'pulse') {
      const { facts, revenue30 } = await getMerchantFacts()
      const list = [...facts.values()]
      const now = Date.now()
      const signups = dailySeries(facts, 30, (f) => f.createdAt)
      const activeSeries = dailySeries(facts, 30, (f) => f.lastActiveAt)
      const recentStores = list.filter((f) => f.createdAt).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
      const auditSnap = await db.collection(COL.audit).orderBy('__name__').limit(40).get()
      const audit = auditSnap.docs.map((d) => d.data()).filter((r) => r.result === 'ok' && (me.isSuper || (r.tab && can(r.tab)))).slice(0, 10)
      const feed = [
        ...recentStores.map((f) => ({ at: f.createdAt, kind: 'store', title: 'New merchant registered', detail: f.name, ref: f.slug })),
        ...audit.map((r) => ({ at: r.at, kind: 'team', title: r.summary || r.action, detail: `${r.name}${r.title ? `, ${r.title}` : ''}` })),
      ].sort((a, b) => b.at - a.at).slice(0, 12)
      return res.status(200).json({
        success: true,
        totals: {
          stores: list.length,
          paying: list.filter((f) => f.paid).length,
          premium: list.filter((f) => f.paid && f.plan === 'premium').length,
          products: list.reduce((n, f) => n + f.products, 0),
          active30: list.filter((f) => f.active30).length,
          active7: list.filter((f) => f.active7).length,
          newThisWeek: list.filter((f) => f.createdAt && now - f.createdAt <= 7 * DAY).length,
          interactions30: list.reduce((n, f) => n + f.leads30 + f.orders30 + f.bookings30, 0),
          revenue30: can('revenue') ? revenue30 : null,
        },
        series: { signups, active: activeSeries },
        feed,
      })
    }

    if (action === 'growth') {
      const fresh = req.query?.fresh === '1'
      const { facts, revenue30, revenueByMonth, builtAt } = await getMerchantFacts({ fresh })
      const list = [...facts.values()]
      const total = list.length
      const now = Date.now()

      // The funnel is strict: each stage counts merchants who reached it AND
      // every stage before it, so it only ever narrows.
      const stages = [
        // Her plan's funnel: Registered, products, complete, shared, first
        // customer, returning. ("Set up" is not a stage: plenty of merchants
        // add products before a logo. It is reported separately below.)
        { id: 'registered', label: 'Signed up', test: () => true },
        { id: 'products', label: 'Added products', test: (f) => f.hasProducts },
        { id: 'complete', label: 'Store complete', test: (f) => f.complete },
        { id: 'shared', label: 'Shared the store', test: (f) => f.shared },
        { id: 'interaction', label: 'First enquiry or order', test: (f) => f.interacted },
        { id: 'returning', label: 'Came back again', test: (f) => f.returning },
      ]
      let pool = list
      const funnel = stages.map((s) => {
        pool = pool.filter(s.test)
        return { id: s.id, label: s.label, n: pool.length, any: list.filter(s.test).length }
      })

      const segments = SEGMENTS.map((s) => ({ ...s, n: list.filter((f) => f.segment === s.id).length }))

      const sources = {}
      for (const f of list) {
        const k = f.source || 'unknown'
        const r = (sources[k] ||= { id: k, label: SOURCE_LABEL[k] || k, signups: 0, products: 0, complete: 0, shared: 0, interacted: 0, activated: 0, paid: 0, active30: 0 })
        r.signups += 1
        if (f.hasProducts) r.products += 1
        if (f.complete) r.complete += 1
        if (f.shared) r.shared += 1
        if (f.interacted) r.interacted += 1
        if (f.activated) r.activated += 1
        if (f.paid) r.paid += 1
        if (f.active30) r.active30 += 1
      }
      const channels = Object.values(sources).sort((a, b) => b.signups - a.signups)
        .map((r) => ({ ...r, activationRate: pct(r.activated, r.signups), productRate: pct(r.products, r.signups), paidRate: pct(r.paid, r.signups) }))

      // Weekly cohorts for the last 12 weeks.
      const weekStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime() }
      const thisWeek = weekStart(now)
      const cohorts = Array.from({ length: 12 }, (_, i) => {
        const from = thisWeek - (11 - i) * 7 * DAY
        const members = list.filter((f) => f.createdAt >= from && f.createdAt < from + 7 * DAY)
        return {
          week: new Date(from).toISOString().slice(0, 10),
          signups: members.length,
          products: pct(members.filter((f) => f.hasProducts).length, members.length),
          shared: pct(members.filter((f) => f.shared).length, members.length),
          activated: pct(members.filter((f) => f.activated).length, members.length),
        }
      })

      const activated = list.filter((f) => f.activated)
      const timeToActivation = median(activated.filter((f) => f.createdAt && f.firstInteractionAt > f.createdAt).map((f) => (f.firstInteractionAt - f.createdAt) / DAY))
      const old = list.filter((f) => f.createdAt && now - f.createdAt > 30 * DAY)
      const mam = list.filter((f) => f.active30).length
      const wam = list.filter((f) => f.active7).length
      const paid = list.filter((f) => f.paid).length

      const categories = {}
      for (const f of list) {
        const k = f.category || 'Not chosen'
        const r = (categories[k] ||= { label: k, signups: 0, activated: 0 })
        r.signups += 1
        if (f.activated) r.activated += 1
      }

      return res.status(200).json({
        success: true,
        builtAt,
        kpis: {
          merchants: total,
          activationRate: pct(activated.length, total),
          activated: activated.length,
          timeToActivationDays: timeToActivation == null ? null : Math.round(timeToActivation * 10) / 10,
          wam,
          mam,
          retention30: pct(old.filter((f) => f.active30).length, old.length),
          retentionBase: old.length,
          completionRate: pct(list.filter((f) => f.complete).length, total),
          setUpRate: pct(list.filter((f) => f.setUp).length, total),
          shareRate: pct(list.filter((f) => f.shared).length, total),
          sharedTracked: list.filter((f) => f.sharedTracked).length,
          firstInteractionRate: pct(list.filter((f) => f.interacted).length, total),
          leads30: list.reduce((n, f) => n + f.leads30, 0),
          orders30: list.reduce((n, f) => n + f.orders30, 0),
          bookings30: list.reduce((n, f) => n + f.bookings30, 0),
          storesWithInteraction: list.filter((f) => f.interacted).length,
          paid,
          paidConversion: pct(paid, total),
          revenue30: can('revenue') || me.isSuper ? revenue30 : null,
          revenuePerActive: can('revenue') || me.isSuper ? (mam ? Math.round(revenue30 / mam) : 0) : null,
        },
        funnel,
        segments,
        channels,
        cohorts,
        signups: dailySeries(facts, 90, (f) => f.createdAt),
        revenueByMonth: can('revenue') || me.isSuper ? revenueByMonth : null,
        categories: Object.values(categories).sort((a, b) => b.signups - a.signups).slice(0, 10),
      })
    }

    if (action === 'segment') {
      if (!can('growth') && !can('outreach')) return fail(res, 403, 'tab_not_allowed', 'Not allowed.')
      const { facts } = await getMerchantFacts()
      const id = String(req.query?.id || 'all')
      const qText = String(req.query?.q || '').trim().toLowerCase()
      const stage = { set_up: 'setUp', products: 'hasProducts', complete: 'complete', shared: 'shared', interaction: 'interacted', returning: 'returning', activated: 'activated' }[id]
      let rows = [...facts.values()].filter((f) => (id === 'all' ? true : stage ? f[stage] : f.segment === id || f.source === id))
      if (qText) rows = rows.filter((f) => `${f.name} ${f.slug} ${f.email} ${f.phone} ${f.owner}`.toLowerCase().includes(qText))
      const sort = String(req.query?.sort || 'newest')
      rows.sort((a, b) => (sort === 'oldest' ? a.createdAt - b.createdAt : sort === 'quiet' ? (a.lastActiveAt || 0) - (b.lastActiveAt || 0) : sort === 'visits' ? b.visits - a.visits : b.createdAt - a.createdAt))
      if (req.query?.format === 'csv') {
        const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`
        const date = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '')
        const csv = ['Store,Link,Owner,Email,Phone,Signed up,Products,Complete,Shared,Visits,Enquiries,Orders,Last sign-in,Plan,Channel,Segment']
          .concat(rows.map((f) => [f.name, f.slug, f.owner, f.email, f.phone, date(f.createdAt), f.products, f.complete ? 'yes' : 'no', f.shared ? 'yes' : 'no', f.visits, f.leads, f.orders, date(f.lastActiveAt), f.paid ? f.plan : 'free', SOURCE_LABEL[f.source] || f.source, f.segment].map(esc).join(','))).join('\n')
        await writeAudit(db, { uid: me.uid, name: me.name, title: me.title, sessionId: v.sessionId, req, tab: can('growth') ? 'growth' : 'outreach', action: 'growth.export', summary: `Exported ${rows.length} merchants (${id})` })
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        return res.status(200).send(csv)
      }
      const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 5), 100)
      const page = Math.max(1, Number(req.query?.page) || 1)
      return res.status(200).json({ success: true, total: rows.length, page, limit, rows: rows.slice((page - 1) * limit, page * limit).map(factRow) })
    }

    return fail(res, 400, 'invalid_action', 'Invalid request.')
  } catch (err) {
    console.error('[ops-insights]', err.message)
    return fail(res, 500, 'server_error', 'Could not load these numbers. Try again.')
  }
}
