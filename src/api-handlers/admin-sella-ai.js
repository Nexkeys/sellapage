// src/api-handlers/admin-sella-ai.js
// The Ops console's Sella AI tab: who uses Sella, when, for what, and at what
// real cost, the way an AI provider's usage page does it.
//
//   GET ?action=usage            overview: today, this month, all time, every
//                                day and every month on record, and one row per
//                                store that ever used Sella
//   GET ?action=log&storeId=&kind=&from=&to=&cursor=&limit=
//                                every charged request, newest first
//                                (sellaUsageLog, written by _lib/sella-credits.js
//                                from 2026-10-07; older history is the daily and
//                                monthly totals only)
//   GET ?action=store&storeId=   one store: months, days, recent requests
//
// Sources (all server-only):
//   stores/{id}/sellaCredits/{YYYY-MM}  credits used, real cost, requests, by kind
//   stores/{id}/sellaCredits/topup      bought credits left
//   stores/{id}/sellaAiUsage/{day}      chat turns that day (`count`); credits,
//                                       cost and kinds for every request since
//                                       the log started
//   sellaUsageLog                       one record per charged request
// The overview reads one document per store per day and per month of use, so
// it is cached for a minute per instance.

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { monthKey, MONTHLY_CREDITS, NAIRA_PER_CREDIT, NGN_PER_USD, USAGE_LOG, usageLogBound, getBalance, kindsOf } from './_lib/sella-credits.js'

// Mirrors DAILY_LIMIT in sella-ai.js. Vendors are metered in monthly credits
// (_lib/sella-credits.js); this daily cap is only an abuse guard.
const DAILY_GUARD = 300
const MAX_USAGE_DOCS = 20000
const MAX_CREDIT_DOCS = 10000
const DAY = 24 * 60 * 60 * 1000

const lagosDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const round = (n) => Math.round((Number(n) || 0) * 100) / 100
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const storeOf = (doc) => doc.ref.path.split('/')[1]

async function storeNames(db, ids) {
  const out = {}
  const list = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < list.length; i += 100) {
    const refs = list.slice(i, i + 100).map((id) => db.collection('stores').doc(id))
    const snaps = await db.getAll(...refs, { fieldMask: ['businessName', 'storeName', 'plan', 'sellaStaffAccess'] })
    snaps.forEach((s) => {
      const d = s.exists ? s.data() || {} : {}
      out[s.id] = { name: d.businessName || d.storeName || 'A store that no longer exists', slug: d.storeName || '', plan: d.plan || 'starter', staffAccess: d.sellaStaffAccess === true, exists: s.exists }
    })
  }
  return out
}

let overviewCache = { at: 0, data: null }

async function overview(db, fresh) {
  if (!fresh && overviewCache.data && Date.now() - overviewCache.at < 60 * 1000) return overviewCache.data
  const now = Date.now()
  const today = lagosDay(new Date(now))
  const month = monthKey()
  const since7 = lagosDay(new Date(now - 6 * DAY))
  const since30 = lagosDay(new Date(now - 29 * DAY))

  const [usageSnap, creditSnap] = await Promise.all([
    db.collectionGroup('sellaAiUsage').limit(MAX_USAGE_DOCS).get(),
    db.collectionGroup('sellaCredits').limit(MAX_CREDIT_DOCS).get(),
  ])

  const stores = {}
  const row = (id) => (stores[id] ||= {
    storeId: id, today: 0, todayCredits: 0, last7: 0, last30: 0, allTimeRequests: 0, allTimeTurns: 0, allTimeCredits: 0, allTimeUsd: 0,
    monthCredits: 0, monthRequests: 0, monthUsd: 0, topupLeft: 0, firstDay: '', lastDay: '', lastAt: 0, daysActive: 0, monthsActive: 0, byKind: {},
  })

  // ── days ────────────────────────────────────────────────────────────────
  const days = {}
  usageSnap.docs.forEach((doc) => {
    const id = storeOf(doc)
    const date = doc.id
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const d = doc.data() || {}
    const turns = Math.max(0, num(d.count))
    const charged = num(d.charged)
    const credits = num(d.credits)
    const r = row(id)
    r.allTimeTurns += turns
    r.daysActive += turns > 0 || charged > 0 ? 1 : 0
    if (!r.firstDay || date < r.firstDay) r.firstDay = date
    if (date > r.lastDay) r.lastDay = date
    r.lastAt = Math.max(r.lastAt, num(d.lastAt))
    if (date === today) { r.today += Math.max(turns, charged); r.todayCredits += credits }
    if (date >= since7) r.last7 += Math.max(turns, charged)
    if (date >= since30) r.last30 += Math.max(turns, charged)
    const day = (days[date] ||= { date, requests: 0, credits: 0, usd: 0, stores: 0, byKind: {} })
    day.requests += Math.max(turns, charged)
    day.credits += credits
    day.usd += num(d.costUsd)
    day.stores += 1
    for (const [k, v] of Object.entries(kindsOf(d))) day.byKind[k] = (day.byKind[k] || 0) + num(v)
  })

  // ── months ──────────────────────────────────────────────────────────────
  const months = {}
  const credits = { month, used: 0, costUsd: 0, requests: 0, byKind: {}, topupLeft: 0, storesWithTopup: 0 }
  creditSnap.docs.forEach((doc) => {
    const id = storeOf(doc)
    const d = doc.data() || {}
    if (/^\d{4}-\d{2}$/.test(doc.id)) {
      const used = num(d.used)
      const r = row(id)
      r.allTimeCredits += used
      r.allTimeUsd += num(d.costUsd)
      r.allTimeRequests += num(d.requests)
      r.monthsActive += 1
      for (const [k, v] of Object.entries(kindsOf(d))) r.byKind[k] = (r.byKind[k] || 0) + num(v)
      const m = (months[doc.id] ||= { month: doc.id, credits: 0, usd: 0, requests: 0, stores: 0, newStores: 0, byKind: {} })
      m.credits += used
      m.usd += num(d.costUsd)
      m.requests += num(d.requests)
      m.stores += 1
      for (const [k, v] of Object.entries(kindsOf(d))) m.byKind[k] = (m.byKind[k] || 0) + num(v)
      if (doc.id === month) {
        r.monthCredits = used; r.monthRequests = num(d.requests); r.monthUsd = num(d.costUsd)
        credits.used += used
        credits.costUsd += num(d.costUsd)
        credits.requests += num(d.requests)
        for (const [k, v] of Object.entries(kindsOf(d))) credits.byKind[k] = (credits.byKind[k] || 0) + num(v)
      }
    } else if (doc.id === 'topup') {
      const lots = Array.isArray(d.lots) ? d.lots : []
      const left = lots.filter((l) => num(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > now)).reduce((n, l) => n + num(l.remaining), 0) + num(d.balance)
      if (left > 0) {
        row(id).topupLeft = round(left)
        credits.topupLeft += left
        credits.storesWithTopup += 1
      }
    }
  })
  // A store's first month of use, for "new users" per month.
  const firstMonthOf = {}
  creditSnap.docs.forEach((doc) => {
    if (!/^\d{4}-\d{2}$/.test(doc.id) || !(num(doc.get('requests')) > 0 || num(doc.get('used')) > 0)) return
    const id = storeOf(doc)
    if (!firstMonthOf[id] || doc.id < firstMonthOf[id]) firstMonthOf[id] = doc.id
  })
  Object.entries(firstMonthOf).forEach(([, m]) => { if (months[m]) months[m].newStores += 1 })

  const ids = Object.keys(stores).filter((id) => {
    const r = stores[id]
    return r.allTimeTurns > 0 || r.allTimeCredits > 0 || r.topupLeft > 0
  })
  const names = await storeNames(db, ids)
  const rows = ids.map((id) => {
    const r = stores[id]
    return {
      ...r,
      ...names[id],
      allTimeCredits: round(r.allTimeCredits),
      allTimeUsd: round(r.allTimeUsd),
      monthCredits: round(r.monthCredits),
      monthUsd: round(r.monthUsd),
      monthLeft: round(Math.max(MONTHLY_CREDITS - r.monthCredits, 0)),
      todayCredits: round(r.todayCredits),
      remainingToday: Math.max(DAILY_GUARD - r.today, 0),
      firstMonth: firstMonthOf[id] || (r.firstDay ? r.firstDay.slice(0, 7) : ''),
      // Requests: the monthly counter covers every kind; older months only
      // counted when credits existed, so the larger of the two is shown.
      requests: Math.max(r.allTimeRequests, r.allTimeTurns),
      // Names the older admin page (pages/Admin.jsx) still reads.
      businessName: names[id]?.name || '',
      allTime: Math.max(r.allTimeRequests, r.allTimeTurns),
      creditsUsed: round(r.monthCredits),
    }
  })

  const dayList = Object.values(days).map((d) => ({ ...d, credits: round(d.credits), usd: round(d.usd) })).sort((a, b) => a.date.localeCompare(b.date))
  const monthList = Object.values(months).map((m) => ({ ...m, credits: round(m.credits), usd: round(m.usd) })).sort((a, b) => a.month.localeCompare(b.month))
  const top = rows.slice().sort((a, b) => b.monthCredits - a.monthCredits)[0]
  const data = {
    success: true,
    dailyLimit: DAILY_GUARD,
    summary: {
      todayTotal: rows.reduce((n, r) => n + r.today, 0),
      todayCredits: round(rows.reduce((n, r) => n + r.todayCredits, 0)),
      activeVendorsToday: rows.filter((r) => r.today > 0).length,
      active7: rows.filter((r) => r.lastDay >= since7).length,
      active30: rows.filter((r) => r.lastDay >= since30).length,
      vendorsEverUsed: rows.filter((r) => r.requests > 0 || r.allTimeCredits > 0).length,
      newThisMonth: Object.values(firstMonthOf).filter((m) => m === month).length,
      allTimeTotal: rows.reduce((n, r) => n + r.requests, 0),
      allTimeCredits: round(rows.reduce((n, r) => n + r.allTimeCredits, 0)),
      allTimeUsd: round(rows.reduce((n, r) => n + r.allTimeUsd, 0)),
      topThisMonth: top && top.monthCredits > 0 ? { storeId: top.storeId, name: top.name, credits: top.monthCredits } : null,
      firstDay: dayList[0]?.date || '',
      logSince: '2026-10-07',
    },
    credits: {
      ...credits,
      used: round(credits.used),
      costUsd: round(credits.costUsd),
      costNaira: Math.round(credits.costUsd * NGN_PER_USD),
      topupLeft: round(credits.topupLeft),
      monthlyAllowance: MONTHLY_CREDITS,
      nairaPerCredit: NAIRA_PER_CREDIT,
      ngnPerUsd: NGN_PER_USD,
    },
    days: dayList,
    months: monthList,
    stores: rows,
    truncated: usageSnap.size >= MAX_USAGE_DOCS || creditSnap.size >= MAX_CREDIT_DOCS,
    builtAt: now,
  }
  overviewCache = { at: Date.now(), data }
  return data
}

async function readLog(db, q) {
  const limit = Math.min(Math.max(Number(q.limit) || 25, 5), 100)
  let ref = db.collection(USAGE_LOG)
  if (q.storeId) ref = ref.where('storeId', '==', String(q.storeId))
  if (q.kind) ref = ref.where('kind', '==', String(q.kind))
  ref = ref.orderBy('__name__')
  // Ids sort newest first, so "to" (newest) is the lower bound.
  if (q.to) ref = ref.startAt(usageLogBound(Number(q.to)))
  if (q.cursor) ref = ref.startAfter(String(q.cursor))
  if (q.from) ref = ref.endAt(`${usageLogBound(Number(q.from))}~`)
  const snap = await ref.limit(limit + 1).get()
  const rows = snap.docs.slice(0, limit).map((d) => ({ id: d.id, ...d.data() }))
  const names = await storeNames(db, rows.map((r) => r.storeId))
  return {
    success: true,
    rows: rows.map((r) => ({ ...r, storeName: names[r.storeId]?.name || '', plan: names[r.storeId]?.plan || '', naira: Math.round(num(r.usd) * NGN_PER_USD) })),
    nextCursor: snap.size > limit ? rows[rows.length - 1].id : null,
  }
}

async function oneStore(db, storeId) {
  const base = db.collection('stores').doc(storeId)
  const [store, monthsSnap, daysSnap, log, balance] = await Promise.all([
    base.get(),
    base.collection('sellaCredits').get(),
    base.collection('sellaAiUsage').get(),
    readLog(db, { storeId, limit: 40 }),
    getBalance(db, storeId),
  ])
  if (!store.exists) return null
  const s = store.data() || {}
  return {
    success: true,
    store: { id: storeId, name: s.businessName || s.storeName || 'Store', slug: s.storeName || '', plan: s.plan || 'starter', staffAccess: s.sellaStaffAccess === true, assistantName: s.sellaAiName || 'Sella AI' },
    balance,
    months: monthsSnap.docs.filter((d) => /^\d{4}-\d{2}$/.test(d.id)).map((d) => ({ month: d.id, credits: round(d.get('used')), usd: round(d.get('costUsd')), requests: num(d.get('requests')), byKind: kindsOf(d.data()) })).sort((a, b) => a.month.localeCompare(b.month)),
    days: daysSnap.docs.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.id)).map((d) => ({ date: d.id, requests: Math.max(num(d.get('count')), num(d.get('charged'))), credits: round(d.get('credits')), usd: round(d.get('costUsd')) })).sort((a, b) => a.date.localeCompare(b.date)).slice(-120),
    log: log.rows,
    nextCursor: log.nextCursor,
  }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'sella-ai')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const q = req.query || {}
    const action = String(q.action || 'usage')
    if (action === 'log') return res.status(200).json(await readLog(db, q))
    if (action === 'store') {
      const storeId = String(q.storeId || '').trim()
      if (!storeId || storeId.includes('/')) return res.status(400).json({ error: 'Missing storeId' })
      const data = await oneStore(db, storeId)
      return data ? res.status(200).json(data) : res.status(404).json({ error: 'not_found', message: 'That store no longer exists.' })
    }
    return res.status(200).json(await overview(db, q.fresh === '1'))
  } catch (err) {
    console.error('[admin-sella-ai] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
