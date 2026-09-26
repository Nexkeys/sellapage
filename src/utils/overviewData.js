// src/utils/overviewData.js
//
// Everything the Dashboard home screen draws that is not already in memory:
// daily store views, and the orders and bookings of the last month (for the
// Total Sales chart, the trend badges, the "sold" counts on Top Performing
// Products and the Recent Activity feed).
//
// READ BUDGET. The platform runs on Firestore's free daily quota, so this is
// bounded on purpose:
//   - analyticsDaily: at most WINDOW_DAYS + 1 documents, never the full history.
//   - orders and bookings: only those created inside the window, so the cost is
//     the number of real sales in a month, not the life of the store.
//   - one load per store per CACHE_MS. Switching tabs and coming back to the
//     home screen draws from memory instead of reading again.
// The Orders tab still does its own full load when opened; this never
// replaces it and never writes into its state.
//
// Money follows the same rule as the Payouts tab and the nightly digest
// (api-handlers/_lib/digests.js isEarning): paid in-app checkout orders and
// paid bookings, cancelled and refunded left out, amount is grandTotal. Copied,
// not reinvented, so the home screen can never show a different figure.

import { collection, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { getDocs } from '../firebase/metered'
import { db } from '../firebase/config'
import { auth } from '../firebase/auth'
import { isActingAsStaffFor } from './staffDataFetch'
import { fetchDailyAnalytics, storeDay, lastDays, emptyDay } from './analytics'
import { fetchSalesByDay } from './sales'

export const WINDOW_DAYS = 30
const CACHE_MS = 5 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const EXCLUDED_STATUSES = new Set(['cancelled', 'refunded'])

const cache = new Map()

export const toDate = (v) => {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isEarning(doc, kind) {
  if (!doc || EXCLUDED_STATUSES.has(doc.status)) return false
  if (doc.paymentStatus !== 'paid') return false
  if (kind === 'order' && doc.orderType !== 'checkout') return false
  return true
}

async function staffDaily(storeId, max) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch(
    `/api/store-data?type=analyticsDaily&storeId=${encodeURIComponent(storeId)}&limit=${max}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`analyticsDaily fetch failed: ${res.status}`)
  const json = await res.json()
  return (json.items || []).map((d) => ({ ...emptyDay(d.id), ...d, date: d.date || d.id }))
}

async function recentDocs(storeId, name) {
  const since = Timestamp.fromDate(new Date(Date.now() - (WINDOW_DAYS + 1) * DAY_MS))
  const snap = await getDocs(
    query(collection(db, 'stores', storeId, name), where('createdAt', '>=', since), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Loads the home screen's figures.
 *
 *   wants: { views, orders, bookings }  which parts this plan and vendor type use
 *
 * Returns {
 *   days: [{ date, views, sales, orders, bookings }]  WINDOW_DAYS long, oldest first
 *   recentOrders, recentBookings                       newest first (owner only)
 *   money: true when `sales` is naira; false for staff, who get counts only
 *   errors: { views?, sales? }                         a part that failed to load
 * }
 * One part failing never blanks the others: each is loaded and caught alone.
 */
export async function loadOverview(storeId, wants, { force = false } = {}) {
  if (!storeId) return null
  const key = `${storeId}|${wants.views ? 1 : 0}${wants.orders ? 1 : 0}${wants.bookings ? 1 : 0}`
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const staff = isActingAsStaffFor(storeId)
  const errors = {}
  const keys = lastDays(storeDay(), WINDOW_DAYS)
  const rows = new Map(keys.map((k) => [k, { date: k, views: 0, sales: 0, orders: 0, bookings: 0 }]))

  const viewsPart = wants.views
    ? (staff ? staffDaily(storeId, WINDOW_DAYS + 1) : fetchDailyAnalytics(storeId, WINDOW_DAYS + 1))
        .then((docs) => {
          for (const d of docs) {
            const row = rows.get(d.date)
            if (row) row.views = Number(d.views) || 0
          }
        })
        .catch((err) => { console.error('[overview] daily views', err); errors.views = true })
    : null

  let recentOrders = []
  let recentBookings = []
  let money = !staff

  const salesPart = wants.orders || wants.bookings
    ? (async () => {
        if (staff) {
          // Staff cannot read order documents directly, and the proxy only
          // returns creation times for an analytics grant. So staff see how
          // many sales came in each day, not the naira value.
          const byDay = await fetchSalesByDay(storeId, { orders: !!wants.orders, bookings: !!wants.bookings }, WINDOW_DAYS)
          for (const [k, v] of byDay) {
            const row = rows.get(k)
            if (!row) continue
            row.orders += v.orders
            row.bookings += v.bookings
            row.sales += v.orders + v.bookings
          }
          return
        }
        const [o, b] = await Promise.all([
          wants.orders ? recentDocs(storeId, 'orders') : [],
          wants.bookings ? recentDocs(storeId, 'bookings') : [],
        ])
        recentOrders = o
        recentBookings = b
        const tally = (list, kind) => {
          for (const doc of list) {
            const d = toDate(doc.createdAt)
            if (!d) continue
            const row = rows.get(storeDay(d))
            if (!row) continue
            if (kind === 'order') row.orders += 1
            else row.bookings += 1
            if (isEarning(doc, kind)) row.sales += Number(doc.grandTotal) || 0
          }
        }
        tally(o, 'order')
        tally(b, 'booking')
      })().catch((err) => { console.error('[overview] sales', err); errors.sales = true; money = !staff })
    : null

  await Promise.all([viewsPart, salesPart])

  const data = { days: keys.map((k) => rows.get(k)), recentOrders, recentBookings, money, errors }
  // A part that failed is not cached, so the next visit tries again.
  if (!errors.views && !errors.sales) cache.set(key, { at: Date.now(), data })
  return data
}

/** Forget the cached figures, e.g. after the vendor adds an order by hand. */
export function clearOverviewCache(storeId) {
  for (const k of cache.keys()) if (k.startsWith(`${storeId}|`)) cache.delete(k)
}

/**
 * Change between the last `n` days and the `n` days before them, as a whole
 * percent. null when there is nothing to compare against (the earlier period
 * was zero), so the caller can say "new" instead of an invented +100%.
 */
export function periodChange(series, n = 7) {
  const now = series.slice(-n).reduce((s, v) => s + v, 0)
  const before = series.slice(-2 * n, -n).reduce((s, v) => s + v, 0)
  if (!before) return { now, before, pct: null }
  return { now, before, pct: Math.round(((now - before) / before) * 100) }
}

/** How many of `items` were created on each of `keys` (storeDay keys). */
export function countByDay(items, keys) {
  const map = new Map(keys.map((k) => [k, 0]))
  for (const it of items || []) {
    const d = toDate(it?.createdAt)
    if (!d) continue
    const k = storeDay(d)
    if (map.has(k)) map.set(k, map.get(k) + 1)
  }
  return keys.map((k) => map.get(k))
}
