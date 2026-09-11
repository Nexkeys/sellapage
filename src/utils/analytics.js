// src/utils/analytics.js
//
// Every storefront analytics write, in one place.
//
// WHY ONE FILE
// These counters used to be written inline in StorePage and ServiceStorePage.
// The result was predictable: the designed storefront was wired to different
// handlers than the standard one, so a Premium store with a live design
// recorded ZERO product clicks and zero engagement while its dashboard happily
// showed "0" as if that were the truth. One helper called from every surface is
// the only way those two can never drift again.
//
// PRODUCTS AND SERVICES ARE COUNTED SEPARATELY.
// They are different businesses. A shop with 400 product clicks and a studio
// with 400 booking taps are not the same store, and averaging them into one
// "clicks" number told a vendor nothing about either.
//
// NOTHING HERE THROWS. Analytics is an observer. A failed counter write must
// never break a page a customer is trying to buy from, so every call swallows
// its error. That does mean a rules rejection is invisible, which is exactly
// how the old writes failed unnoticed, so the rules are kept in step with the
// field list below.

import {
  doc,
  setDoc,
  updateDoc,
  increment,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * The calendar day, in Lagos.
 *
 * Nigeria is UTC+1 with no daylight saving. Keying days by UTC would end a
 * vendor's "today" at 11pm and put an hour of every evening's traffic on
 * tomorrow, which is exactly the hour a lot of Nigerian shopping happens.
 */
const DAY_FMT = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return null
  }
})()

export function storeDay(d = new Date()) {
  if (DAY_FMT) {
    // Parts are read individually rather than trusting one formatted string,
    // because some engines insert narrow spaces into the output.
    const p = DAY_FMT.formatToParts(d).reduce((a, x) => {
      a[x.type] = x.value
      return a
    }, {})
    if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`
  }
  // Fallback for an engine without timezone data: Lagos's fixed +1 offset.
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Human label for a day key, e.g. "Thu, 11 Sep 2026". */
export function dayLabel(key) {
  const [y, m, d] = String(key || '').split('-').map(Number)
  if (!y || !m || !d) return key || ''
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const isToday = (key) => key === storeDay()

const summaryRef = (storeId) => doc(db, 'stores', storeId, 'analytics', 'storeSummary')
const dayRef = (storeId, day) => doc(db, 'stores', storeId, 'analyticsDaily', day)

/**
 * Writes one counter to the all-time summary and the same counter to today.
 *
 * Two documents, so the dashboard can show an all-time number without summing
 * every day that ever existed, and a daily number without deriving it from a
 * running total. They are written independently: neither is a rollup of the
 * other, and a failure of one does not corrupt the other.
 */
async function bump(storeId, summaryField, dailyField) {
  if (!storeId) return
  const day = storeDay()
  const now = new Date()
  await Promise.allSettled([
    setDoc(summaryRef(storeId), { [summaryField]: increment(1), updatedAt: now }, { merge: true }),
    setDoc(
      dayRef(storeId, day),
      { date: day, [dailyField]: increment(1), updatedAt: now },
      { merge: true },
    ),
  ])
}

/** One store page load. */
export const trackStoreView = (storeId) => bump(storeId, 'totalViews', 'views')

/**
 * One visitor session that did something rather than bouncing.
 *
 * The caller decides what a session is and fires this at most once per session.
 * This function deliberately does not dedupe.
 */
export const trackEngagement = (storeId) => bump(storeId, 'engagedViews', 'engagedSessions')

/**
 * A customer opened or ordered a product.
 *
 * `totalClicks` keeps being written so the all-time number a vendor has watched
 * for months stays continuous. `productClicks` is the new, honest split.
 */
export async function trackProductClick(storeId, productId) {
  if (!storeId) return
  const day = storeDay()
  const now = new Date()
  await Promise.allSettled([
    setDoc(
      summaryRef(storeId),
      { totalClicks: increment(1), productClicks: increment(1), updatedAt: now },
      { merge: true },
    ),
    setDoc(
      dayRef(storeId, day),
      { date: day, productClicks: increment(1), updatedAt: now },
      { merge: true },
    ),
    productId
      ? updateDoc(doc(db, 'stores', storeId, 'products', productId), { clicks: increment(1) })
      : Promise.resolve(),
  ])
}

/** A customer opened a service card. Not a booking: a look. */
export async function trackServiceClick(storeId, serviceId) {
  if (!storeId) return
  const day = storeDay()
  const now = new Date()
  await Promise.allSettled([
    setDoc(
      summaryRef(storeId),
      { totalClicks: increment(1), serviceClicks: increment(1), updatedAt: now },
      { merge: true },
    ),
    setDoc(
      dayRef(storeId, day),
      { date: day, serviceClicks: increment(1), updatedAt: now },
      { merge: true },
    ),
    serviceId
      ? updateDoc(doc(db, 'stores', storeId, 'services', serviceId), { clicks: increment(1) })
      : Promise.resolve(),
  ])
}

/**
 * A customer asked to book.
 *
 * Counted when the request is MADE, not when money lands, and counted the same
 * way on both paths. The paid path used to increment nothing at all, so a Pro
 * vendor taking card payments saw zero booking requests forever while a vendor
 * on WhatsApp saw the real number.
 */
export async function trackBookingRequest(storeId, serviceId) {
  if (!storeId) return
  const day = storeDay()
  const now = new Date()
  await Promise.allSettled([
    setDoc(summaryRef(storeId), { totalBookingRequests: increment(1), updatedAt: now }, { merge: true }),
    setDoc(dayRef(storeId, day), { date: day, bookings: increment(1), updatedAt: now }, { merge: true }),
    serviceId
      ? updateDoc(doc(db, 'stores', storeId, 'services', serviceId), {
          bookingRequests: increment(1),
        })
      : Promise.resolve(),
  ])
}

/** Shape of one day, with every counter present so the UI never sees undefined. */
export const emptyDay = (date) => ({
  date,
  views: 0,
  productClicks: 0,
  serviceClicks: 0,
  bookings: 0,
  engagedSessions: 0,
})

export const DAILY_FETCH_LIMIT = 180

/**
 * The most recent days, newest first.
 *
 * Bounded on purpose. A store running for three years would otherwise read a
 * thousand documents every time the Analytics tab is opened, to render a table
 * nobody scrolls to the bottom of.
 */
export async function fetchDailyAnalytics(storeId, max = DAILY_FETCH_LIMIT) {
  if (!storeId) return []
  const snap = await getDocs(
    query(collection(db, 'stores', storeId, 'analyticsDaily'), orderBy('date', 'desc'), limit(max)),
  )
  return snap.docs.map((d) => ({ ...emptyDay(d.id), ...d.data(), date: d.data()?.date || d.id }))
}

/** Engagement as a percentage, clamped, with the zero case spelled out. */
export function engagementRate(engaged, views) {
  const v = Number(views) || 0
  const e = Number(engaged) || 0
  if (v <= 0) return 0
  return Math.min((e / v) * 100, 100)
}
