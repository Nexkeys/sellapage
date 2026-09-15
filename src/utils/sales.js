// src/utils/sales.js
//
// Orders and bookings received, counted from the order and booking DOCUMENTS
// themselves, never from a separate counter.
//
// WHY NOT A COUNTER
// A counter was tried first: +1 on every paid checkout. It showed 0 on stores
// with dozens of orders, for three reasons that are all structural:
//   1. It only counts from the day it was deployed. Every earlier order was
//      invisible, and there is no safe way to backfill a counter on a live store.
//   2. Orders a vendor adds by hand in the dashboard never pass through checkout.
//   3. It can only ever go up, so it drifts from the tab the moment anything is
//      removed.
// Counting the documents cannot disagree with the Orders and Bookings tabs,
// because it reads exactly what they read.
//
// COST
// Totals use Firestore count aggregation: one billed read per 1,000 documents,
// not one per document. The per-day breakdown does read documents, but only
// those created inside the history window, which is bounded by real sales.

import {
  collection,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { auth } from '../firebase/auth'
import { isActingAsStaffFor } from './staffDataFetch'
import { storeDay, DAILY_FETCH_LIMIT } from './analytics'

const DAY_MS = 24 * 60 * 60 * 1000

const toDate = (v) => {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Staff have a different uid, so the owner-only read rule denies them. They go
 * through the Admin SDK proxy. Throws on failure: a silent 0 here is exactly
 * the bug this file exists to fix.
 */
async function salesViaStaff(storeId, days) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch(
    `/api/store-data?type=sales&storeId=${encodeURIComponent(storeId)}&days=${days}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`sales fetch failed: ${res.status}`)
  return res.json()
}

/**
 * All-time totals.
 *
 * Ordered by createdAt on purpose: the Orders and Bookings tabs query the same
 * way, and Firestore leaves out any document missing the field, so the number
 * here is the number of rows the vendor can actually scroll through.
 *
 *   kinds: { orders: boolean, bookings: boolean }
 */
export async function countSales(storeId, kinds) {
  if (!storeId) return { orders: 0, bookings: 0 }

  if (isActingAsStaffFor(storeId)) {
    const data = await salesViaStaff(storeId, 0)
    return {
      orders: kinds.orders ? Number(data.orders) || 0 : 0,
      bookings: kinds.bookings ? Number(data.bookings) || 0 : 0,
    }
  }

  const count = async (name) => {
    const snap = await getCountFromServer(
      query(collection(db, 'stores', storeId, name), orderBy('createdAt')),
    )
    return snap.data().count
  }

  const [orders, bookings] = await Promise.all([
    kinds.orders ? count('orders') : 0,
    kinds.bookings ? count('bookings') : 0,
  ])
  return { orders, bookings }
}

/**
 * Orders and bookings per Lagos calendar day, over the history window.
 *
 * One extra day is fetched past the window so the oldest day shown is a full
 * day and not whatever fraction of it falls after "now minus N days".
 *
 * Returns a Map of 'YYYY-MM-DD' -> { orders, bookings }.
 */
export async function fetchSalesByDay(storeId, kinds, days = DAILY_FETCH_LIMIT) {
  const byDay = new Map()
  if (!storeId) return byDay

  const lookback = days + 1
  const add = (value, field) => {
    const d = toDate(value)
    if (!d) return
    const key = storeDay(d)
    const row = byDay.get(key) || { orders: 0, bookings: 0 }
    row[field] += 1
    byDay.set(key, row)
  }

  if (isActingAsStaffFor(storeId)) {
    const data = await salesViaStaff(storeId, lookback)
    if (kinds.orders) (data.orderDates || []).forEach((v) => add(v, 'orders'))
    if (kinds.bookings) (data.bookingDates || []).forEach((v) => add(v, 'bookings'))
    return byDay
  }

  const since = Timestamp.fromDate(new Date(Date.now() - lookback * DAY_MS))
  const load = (name) =>
    getDocs(query(collection(db, 'stores', storeId, name), where('createdAt', '>=', since)))

  const [orderSnap, bookingSnap] = await Promise.all([
    kinds.orders ? load('orders') : null,
    kinds.bookings ? load('bookings') : null,
  ])
  orderSnap?.docs.forEach((d) => add(d.get('createdAt'), 'orders'))
  bookingSnap?.docs.forEach((d) => add(d.get('createdAt'), 'bookings'))
  return byDay
}
