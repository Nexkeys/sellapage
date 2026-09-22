import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// Signup dates are grouped by Lagos calendar day: a store created at 00:30 in
// Lagos belongs to that day, not to the UTC day before it.
const LAGOS = 'Africa/Lagos'
function lagosDayKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LAGOS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function lastDayKeys(todayKey, count) {
  const [y, m, d] = todayKey.split('-').map(Number)
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10))
}

function lastMonthKeys(thisMonthKey, count) {
  const [y, m] = thisMonthKey.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1))
    return date.toISOString().slice(0, 7)
  })
}

// The only plans anyone pays for. Everything else (starter, free, and any
// older name still on a document) is a free store.
const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const GRACE_MS = 2 * 24 * 60 * 60 * 1000

/**
 * Whether a store is on a paid plan RIGHT NOW.
 *
 * The old count was `where('plan', '!=', 'starter')`, which counted every
 * free store too, because stores created before the plan was renamed carry
 * plan 'free'. That is how 92 paid stores appeared out of 149 total.
 *
 * expiry-cron.js resets an expired store to starter, and marks the two-day
 * grace window as 'grace'. A store still inside grace is counted: it is paid
 * for. A store whose end date passed but which the cron has not reset yet is
 * not counted, so the figure never flatters itself when a cron run is late.
 */
function paidState(store, nowMs) {
  const plan = String(store.plan || '').toLowerCase()
  if (!PAID_PLANS.has(plan)) return { paid: false, plan }
  if (store.planStatus === 'expired') return { paid: false, plan, lapsed: true }

  const end = store.planEndDate?.toDate?.() || (store.planEndDate ? new Date(store.planEndDate) : null)
  if (!end || isNaN(end.getTime())) {
    // No end date: a lifetime or manually granted plan.
    return { paid: true, plan, lifetime: true }
  }
  const graceEnd = store.graceUntil?.toDate?.()?.getTime?.() || end.getTime() + GRACE_MS
  if (nowMs > graceEnd) return { paid: false, plan, lapsed: true }
  return { paid: true, plan, inGrace: nowMs > end.getTime() }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  // Vercel's edge network can conditionally-cache a GET response (serving a
  // bodyless 304 to a repeat identical request) unless a handler explicitly
  // opts out. Live admin data must never be served stale/empty like that.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'analytics')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'overview'

    if (action === 'overview') {
      // Plans are worked out from the documents rather than a query, because
      // a Firestore inequality cannot express "one of these three, and not
      // expired", and silently skips documents with no plan field at all.
      const [storesSnap, leadsSnap, supportSnap, productsSnap] = await Promise.all([
        db.collection('stores').select('plan', 'planStatus', 'planEndDate', 'graceUntil').get(),
        db.collection('leads').count().get(),
        db.collection('supportMessages').where('status', 'in', ['open', 'in_progress']).count().get(),
        db.collectionGroup('products').count().get(),
      ])

      const nowMs = Date.now()
      const byPlan = { growth: 0, pro: 0, premium: 0 }
      let paidStores = 0
      let inGrace = 0
      let lapsed = 0
      let freeStores = 0

      storesSnap.docs.forEach((doc) => {
        const state = paidState(doc.data(), nowMs)
        if (state.paid) {
          paidStores += 1
          byPlan[state.plan] = (byPlan[state.plan] || 0) + 1
          if (state.inGrace) inGrace += 1
        } else if (state.lapsed) {
          lapsed += 1
          freeStores += 1
        } else {
          freeStores += 1
        }
      })

      return res.status(200).json({
        success: true,
        analytics: {
          totalStores: storesSnap.size,
          paidStores,
          freeStores,
          planBreakdown: byPlan,
          inGrace,
          lapsed,
          totalLeads: leadsSnap.data().count,
          totalProducts: productsSnap.data().count,
          openTickets: supportSnap.data().count,
        },
      })
    }

    if (action === 'top-stores') {
      const limit = parseInt(req.query.limit) || 10
      const analyticsSnap = await db.collectionGroup('analytics').limit(500).get()

      const storeAnalytics = {}
      analyticsSnap.docs.forEach(doc => {
        const path = doc.ref.path
        const parts = path.split('/')
        const storeId = parts[1]
        const d = doc.data()
        if (!storeAnalytics[storeId]) {
          storeAnalytics[storeId] = { totalViews: 0, totalClicks: 0, engagedViews: 0 }
        }
        storeAnalytics[storeId].totalViews += d.totalViews || 0
        storeAnalytics[storeId].totalClicks += d.totalClicks || 0
        storeAnalytics[storeId].engagedViews += d.engagedViews || 0
      })

      const storeIds = Object.keys(storeAnalytics)
      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, stores: [] })
      }

      const storeDocs = await Promise.all(
        storeIds.map(id => db.collection('stores').doc(id).get().then(snap => ({ id, ...snap.data(), exists: snap.exists })))
      )

      const enriched = storeDocs
        .filter(s => s.exists)
        .map(s => {
          const analytics = storeAnalytics[s.id] || { totalViews: 0, totalClicks: 0, engagedViews: 0 }
          return {
            id: s.id,
            storeName: s.storeName || s.handle || '',
            handle: s.handle || '',
            email: s.email || s.ownerEmail || '',
            whatsappNumber: s.whatsappNumber || '',
            plan: s.plan || 'starter',
            totalViews: analytics.totalViews,
            totalClicks: analytics.totalClicks,
            engagedViews: analytics.engagedViews,
            engagementRate: analytics.totalViews > 0 ? Math.round((analytics.engagedViews / analytics.totalViews) * 100) : 0,
          }
        })
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, limit)

      return res.status(200).json({ success: true, stores: enriched })
    }

    if (action === 'signups') {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 366)
      const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 60)

      // Every store, not a date-filtered query. A Firestore range filter (or an
      // orderBy) silently drops documents that have no createdAt at all, so the
      // old query under-counted signups with no way to see it. Reading the field
      // alone keeps this cheap, and stores with no usable date are reported
      // separately as "undated" rather than quietly vanishing.
      const snap = await db.collection('stores').select('createdAt').get()

      const byDay = {}
      const byMonth = {}
      let undated = 0
      snap.docs.forEach((doc) => {
        const raw = doc.data().createdAt
        const date = raw?.toDate?.() || (raw ? new Date(raw) : null)
        if (!date || isNaN(date.getTime())) {
          undated += 1
          return
        }
        const key = lagosDayKey(date)
        byDay[key] = (byDay[key] || 0) + 1
        const month = key.slice(0, 7)
        byMonth[month] = (byMonth[month] || 0) + 1
      })

      // Zero-filled, so a quiet day is a gap in the chart instead of being
      // skipped and making the range look busier than it was.
      const todayKey = lagosDayKey(new Date())
      const dayRange = lastDayKeys(todayKey, days).map((date) => ({ date, count: byDay[date] || 0 }))
      const monthRange = lastMonthKeys(todayKey.slice(0, 7), months).map((month) => ({ month, count: byMonth[month] || 0 }))

      return res.status(200).json({
        success: true,
        // "series" stays for anything still reading the old shape.
        series: dayRange,
        days: dayRange,
        months: monthRange,
        totals: {
          range: dayRange.reduce((n, d) => n + d.count, 0),
          months: monthRange.reduce((n, m) => n + m.count, 0),
          allTime: snap.size - undated,
          undated,
        },
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-analytics] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
