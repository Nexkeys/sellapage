// src/api-handlers/digest-cron.js
//
// Scheduled vendor notifications. Two jobs, both called by the scheduler in
// .github/workflows/scheduled-notifications.yml with the same x-cron-secret
// header as expiry-cron.js and reminders-cron.js:
//
//   ?job=morning   08:00 WAT
//     morning_greeting    digests channel, opt-in, every plan
//     booking_reminder    today's schedule (kind 'today'), Pro and above
//     order_reminder      orders not completed a day after they arrived, Pro and above
//     discount_expiring   codes within 48 hours of expiry or near their cap, Pro and above
//
//   ?job=evening   22:00 WAT
//     evening_summary     sales today and the best seller, Pro and above, opt-in
//     daily_summary       views, clicks, orders, bookings, money in, Growth and above, opt-in
//     weekly_summary      on Sundays, same figures for Monday to Sunday
//     monthly_summary     on the last day of the month
//     yearly_summary      on 31 December
//
// "Starts within two hours" booking reminders are NOT here: booking-reminder-cron.js
// already scans for exactly that and now pushes as well as emailing.
//
// BUDGET. Firestore is on the Spark plan, where reads and writes are a daily
// quota and running out is an outage for every vendor. So:
//   - only stores with at least one linked app device are visited at all, since
//     a push to a store with no device reaches nobody
//   - the evening job reads the store's switches FIRST and stops after one read
//     when digests are off, which is the default
//   - sweeps mark each order and discount once, so nothing is re-announced
//
// IDEMPOTENT. Every send is recorded per store per period in
// stores/{id}/meta/digests (server-only in firestore.rules). A rerun, a retry,
// or GitHub firing a schedule twice can never send anything twice.
//
// CHUNKED. Vercel stops a function at 60 seconds. The run stops starting new
// stores after TIME_BUDGET_MS and returns { done: false, next } so the caller
// continues from there; the workflow loops until done.

import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { DEVICES } from './_lib/push-devices.js'
import { notifyStore, planAllowsNotification } from './_lib/notifications.js'
import { channelAllowed, loadNotificationPrefs } from './_lib/notification-channels.js'
import {
  addDays,
  bookingStartMs,
  closingPeriods,
  eveningSummary,
  morningGreeting,
  periodSummary,
  tallyPeriod,
  watDayKey,
  watStartOfDay,
} from './_lib/digests.js'
import { meter, flushUsage } from './_lib/usage-meter.js'

const TIME_BUDGET_MS = 40 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const META_DOC = 'digests'

// Not completed means not delivered and not closed out. in_transit and
// dispatched stay in on purpose: an order the vendor marked dispatched and
// never marked delivered is exactly the loose end this reminder is for.
const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'dispatched', 'in_transit']
const CLOSED_BOOKING_STATUSES = new Set(['completed', 'cancelled', 'no_show', 'refunded'])
const DISCOUNT_WARN_MS = 48 * 60 * 60 * 1000

function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

const millis = (v) => v?.toMillis?.() ?? (v instanceof Date ? v.getTime() : 0)
const storeNameOf = (store) => store.businessName || store.storeName || 'your store'

/**
 * The Lagos day an EVENING run is about. GitHub's scheduler can start a run
 * late under load; a 22:00 run that actually starts at 00:20 must still
 * summarise the day that just ended, not the one that just began.
 */
function eveningDayKey(nowMs) {
  const watHour = new Date(nowMs + 60 * 60 * 1000).getUTCHours()
  const today = watDayKey(nowMs)
  return watHour < 12 ? addDays(today, -1) : today
}

/**
 * Every store with at least one live, linked device. Single-field inequality on
 * storeId, which Firestore serves from its automatic index.
 */
async function linkedStoreIds(db) {
  const snap = await db.collection(DEVICES).where('storeId', '!=', null).select('storeId', 'disabledAt').get()
  // One read per device row, on EVERY call. With the every-minute trigger this
  // is the part of the digest run that multiplies, so it is counted separately
  // from the per-store work below.
  meter.reads('digest-cron:devices', snap.size)
  const ids = new Set()
  for (const d of snap.docs) {
    const data = d.data()
    if (data.storeId && !data.disabledAt) ids.add(String(data.storeId))
  }
  return [...ids].sort()
}

// ----------------------------------------------------------------- morning

async function runMorning(db, storeId, nowMs, summary) {
  const day = watDayKey(nowMs)
  const storeRef = db.collection('stores').doc(storeId)
  const metaRef = storeRef.collection('meta').doc(META_DOC)

  const [storeSnap, metaSnap, prefs] = await Promise.all([
    storeRef.get(),
    metaRef.get(),
    loadNotificationPrefs(db, storeId),
  ])
  if (!storeSnap.exists) return
  const store = storeSnap.data() || {}
  const meta = metaSnap.data() || {}
  const plan = store.plan || 'starter'
  const name = storeNameOf(store)
  const done = {}

  // Opt-in only. Checked here rather than left to the push layer, because a
  // skipped push still writes a bell record, and a greeting nobody asked for
  // sitting unread in the bell is worse than none.
  if (meta.morning !== day && channelAllowed(prefs, 'digests')) {
    await notifyStore(db, storeId, {
      type: 'morning_greeting',
      ...morningGreeting(name),
      data: { day },
    }, store)
    summary.sent.morning_greeting++
    done.morning = day
  }

  // Everything below is about orders, bookings and discounts, which only exist
  // from Pro upward. One gate instead of three reads that would find nothing.
  if (planAllowsNotification('order_reminder', plan)) {
    if (meta.orderSweep !== day) {
      await sweepStaleOrders(db, storeRef, store, nowMs, summary)
      done.orderSweep = day
    }
    if (meta.discountSweep !== day) {
      await sweepDiscounts(db, storeRef, store, nowMs, summary)
      done.discountSweep = day
    }
    const sellsServices = store.vendorType === 'services' || store.vendorType === 'both'
    if (sellsServices && meta.bookingsToday !== day) {
      await announceTodaysBookings(db, storeRef, store, day, summary)
      done.bookingsToday = day
    }
  }

  if (Object.keys(done).length) {
    await metaRef.set({ ...done, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  }
}

/**
 * One push per store listing every order that has sat unfinished for a day,
 * and each order is only ever included once, so a vendor who leaves an order
 * alone is told about it once rather than every morning forever.
 */
async function sweepStaleOrders(db, storeRef, store, nowMs, summary) {
  const snap = await storeRef.collection('orders').where('status', 'in', OPEN_ORDER_STATUSES).get()
  const stale = snap.docs
    .filter((d) => {
      const o = d.data()
      const at = millis(o.createdAt)
      return at && at < nowMs - DAY_MS && !o.staleReminderAt
    })
    .sort((a, b) => millis(a.data().createdAt) - millis(b.data().createdAt))

  if (!stale.length) return

  const oldest = stale[0]
  const who = oldest.data().customerName || 'A customer'
  await notifyStore(db, storeRef.id, {
    type: 'order_reminder',
    title: 'Orders waiting on you ⏳',
    body: stale.length === 1
      ? `${who}'s order has been waiting over a day. Update it when you can.`
      : `${stale.length} orders have been waiting over a day. The oldest is ${who}'s.`,
    data: { count: stale.length, orderId: oldest.id },
  }, store)
  summary.sent.order_reminder++

  const stamp = new Date().toISOString()
  for (let i = 0; i < stale.length; i += 450) {
    const batch = db.batch()
    for (const d of stale.slice(i, i + 450)) batch.update(d.ref, { staleReminderAt: stamp })
    await batch.commit()
  }
}

/**
 * Active codes close to expiring or close to their usage cap. Each reason is
 * announced once per code, marked on the discount itself.
 */
async function sweepDiscounts(db, storeRef, store, nowMs, summary) {
  const snap = await storeRef.collection('discounts').where('isActive', '==', true).get()

  for (const d of snap.docs) {
    const disc = d.data()
    const code = disc.code || 'A discount code'

    const expiry = millis(disc.expiryDate)
    if (expiry && expiry > nowMs && expiry - nowMs <= DISCOUNT_WARN_MS && !disc.expiryWarnedAt) {
      const hours = Math.max(1, Math.round((expiry - nowMs) / (60 * 60 * 1000)))
      await notifyStore(db, storeRef.id, {
        type: 'discount_expiring',
        title: 'Discount ending soon',
        body: `${code} expires in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.`,
        data: { discountId: d.id, code, reason: 'expiry', expiresAt: new Date(expiry).toISOString() },
      }, store)
      await d.ref.update({ expiryWarnedAt: new Date().toISOString() })
      summary.sent.discount_expiring++
    }

    // Near the cap: the last fifth of uses, and never less than the final one,
    // so a code limited to 2 uses still warns when one is left.
    const limit = disc.usageLimit == null ? null : Number(disc.usageLimit)
    const used = Number(disc.usageCount || 0)
    if (limit && limit > 0) {
      const remaining = limit - used
      if (remaining > 0 && remaining <= Math.max(1, Math.floor(limit * 0.2)) && !disc.capWarnedAt) {
        await notifyStore(db, storeRef.id, {
          type: 'discount_expiring',
          title: 'Discount almost used up',
          body: `${code} has ${remaining} ${remaining === 1 ? 'use' : 'uses'} left out of ${limit}.`,
          data: { discountId: d.id, code, reason: 'cap', used, limit },
        }, store)
        await d.ref.update({ capWarnedAt: new Date().toISOString() })
        summary.sent.discount_expiring++
      }
    }
  }
}

/** The morning run-sheet: how many bookings today and which one is first. */
async function announceTodaysBookings(db, storeRef, store, day, summary) {
  const snap = await storeRef.collection('bookings').where('bookingDate', '==', day).get()
  const today = snap.docs
    .filter((d) => !CLOSED_BOOKING_STATUSES.has(d.data().status))
    .sort((a, b) => (bookingStartMs(a.data().bookingDate, a.data().bookingTime) || 0)
      - (bookingStartMs(b.data().bookingDate, b.data().bookingTime) || 0))

  if (!today.length) return

  const first = today[0].data()
  const at = first.bookingTime ? ` at ${first.bookingTime}` : ''
  await notifyStore(db, storeRef.id, {
    type: 'booking_reminder',
    title: "Today's bookings 📅",
    body: today.length === 1
      ? `1 booking today: ${first.serviceName || 'a service'} with ${first.customerName || 'a customer'}${at}.`
      : `${today.length} bookings today. First up: ${first.serviceName || 'a service'} with ${first.customerName || 'a customer'}${at}.`,
    data: { kind: 'today', count: today.length, bookingId: today[0].id },
  }, store)
  summary.sent.booking_reminder++
}

// ----------------------------------------------------------------- evening

async function runEvening(db, storeId, nowMs, summary) {
  // Switches first: with digests off (the default) this store costs ONE read.
  const prefs = await loadNotificationPrefs(db, storeId)
  if (!channelAllowed(prefs, 'digests')) {
    summary.optedOut++
    return
  }

  const day = eveningDayKey(nowMs)
  const storeRef = db.collection('stores').doc(storeId)
  const metaRef = storeRef.collection('meta').doc(META_DOC)
  const [storeSnap, metaSnap] = await Promise.all([storeRef.get(), metaRef.get()])
  if (!storeSnap.exists) return
  const store = storeSnap.data() || {}
  const meta = metaSnap.data() || {}
  const plan = store.plan || 'starter'
  const vendorType = store.vendorType || 'products'
  const name = storeNameOf(store)

  const canTransact = planAllowsNotification('evening_summary', plan)
  const wantEvening = canTransact && meta.evening !== day
  const periods = closingPeriods(day).filter((p) =>
    planAllowsNotification(p.type, plan) && meta[p.kind] !== p.key)

  if (!wantEvening && !periods.length) return

  // One read of each source covering the WIDEST open period, then each period
  // is cut from it in memory. On a normal day that is a single day.
  const fromKey = periods.reduce((min, p) => (p.fromKey < min ? p.fromKey : min), day)
  const fromMs = watStartOfDay(fromKey)
  const toMs = watStartOfDay(addDays(day, 1))

  const [dailySnap, orderSnap, bookingSnap] = await Promise.all([
    storeRef.collection('analyticsDaily').where('date', '>=', fromKey).get(),
    canTransact
      ? storeRef.collection('orders').where('createdAt', '>=', new Date(fromMs))
        .select('createdAt', 'status', 'paymentStatus', 'orderType', 'grandTotal', 'cartItems').get()
      : null,
    canTransact
      ? storeRef.collection('bookings').where('createdAt', '>=', new Date(fromMs))
        .select('createdAt', 'status', 'paymentStatus', 'grandTotal', 'serviceName').get()
      : null,
  ])

  const dailyAll = dailySnap.docs.map((d) => d.data()).filter((d) => d.date <= day)
  const ordersAll = orderSnap ? orderSnap.docs.map((d) => d.data()).filter((o) => millis(o.createdAt) < toMs) : []
  const bookingsAll = bookingSnap ? bookingSnap.docs.map((d) => d.data()).filter((b) => millis(b.createdAt) < toMs) : []

  const slice = (fromK) => {
    const start = watStartOfDay(fromK)
    return tallyPeriod({
      dailyDocs: dailyAll.filter((d) => d.date >= fromK),
      orders: ordersAll.filter((o) => millis(o.createdAt) >= start),
      bookings: bookingsAll.filter((b) => millis(b.createdAt) >= start),
    })
  }

  const done = {}

  if (wantEvening) {
    const t = slice(day)
    await notifyStore(db, storeId, {
      type: 'evening_summary',
      ...eveningSummary(name, vendorType, t),
      data: {
        day,
        sales: t.sales,
        ...(t.topProduct ? { bestSeller: t.topProduct.name } : {}),
        ...(t.topService ? { mostBooked: t.topService.name } : {}),
      },
    }, store)
    summary.sent.evening_summary++
    done.evening = day
  }

  for (const p of periods) {
    const t = slice(p.fromKey)
    const message = periodSummary(p.kind, name, vendorType, t, { canTransact })
    // Nothing happened: record the period as handled and stay quiet.
    if (message) {
      await notifyStore(db, storeId, {
        type: p.type,
        ...message,
        data: {
          period: p.kind,
          from: p.fromKey,
          to: p.toKey,
          views: t.views,
          clicks: t.clicks,
          ...(canTransact ? { orders: t.orders, bookings: t.bookings, inflow: t.inflow } : {}),
        },
      }, store)
      summary.sent[p.type]++
    } else {
      summary.quiet++
    }
    done[p.kind] = p.key
  }

  await metaRef.set({ ...done, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

// ----------------------------------------------------------------- handler

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')
  if (!timingSafeMatch(req.headers['x-cron-secret'], process.env.CRON_SECRET)) {
    return res.status(401).send('Unauthorized')
  }

  const job = req.query.job
  if (job !== 'morning' && job !== 'evening') {
    return res.status(400).json({ error: 'job must be morning or evening' })
  }

  const startedAt = Date.now()
  // An explicit ?cursor still wins, because the GitHub workflow drives its own
  // loop and passes `next` straight back. Without one, the run resumes from
  // where the last call stopped (see progressRef below), which is what lets a
  // caller that hangs up after 30 seconds still finish a long run: it just
  // calls again, and again, until the day is done.
  const explicitCursor = parseInt(req.query.cursor, 10)
  const hasExplicitCursor = Number.isFinite(explicitCursor)
  const summary = {
    job,
    stores: 0,
    processed: 0,
    optedOut: 0,
    quiet: 0,
    errors: 0,
    sent: {
      morning_greeting: 0, booking_reminder: 0, order_reminder: 0, discount_expiring: 0,
      evening_summary: 0, daily_summary: 0, weekly_summary: 0, monthly_summary: 0, yearly_summary: 0,
    },
  }

  try {
    const db = getAdminDb()

    // Where this job got to, and for which Lagos day. One document, one read,
    // so a call that arrives after the day is finished costs almost nothing:
    // that is what makes it safe to point a every-minute trigger at this.
    const progressRef = db.collection('platform').doc('digestProgress')
    const dayKey = job === 'evening' ? eveningDayKey(Date.now()) : watDayKey(Date.now())
    let cursor = 0

    if (hasExplicitCursor) {
      cursor = Math.max(0, explicitCursor)
    } else {
      const progressSnap = await progressRef.get()
      const saved = (progressSnap.data() || {})[job]
      if (saved?.day === dayKey) {
        if (saved.done) {
          console.log('[digest-cron]', JSON.stringify({ job, day: dayKey, skipped: 'already_done' }))
          return res.status(200).json({ ok: true, done: true, skipped: 'already_done', job })
        }
        cursor = Math.max(0, Number(saved.next) || 0)
      }
    }

    const storeIds = await linkedStoreIds(db)
    summary.stores = storeIds.length
    const run = job === 'morning' ? runMorning : runEvening

    for (let i = cursor; i < storeIds.length; i++) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        await progressRef.set({ [job]: { day: dayKey, next: i, done: false } }, { merge: true })
        await flushUsage(db, { force: true })
        console.log('[digest-cron]', JSON.stringify({ ...summary, done: false, next: i }))
        return res.status(200).json({ ok: true, done: false, next: i, ...summary })
      }
      try {
        await run(db, storeIds[i], Date.now(), summary)
        // A store visit reads the store, its digest marker and its prefs, and
        // the Pro sweeps read orders and discounts on top. Three is the floor,
        // counted as the floor rather than guessed higher.
        meter.reads(`digest-cron:${job}`, 3)
        summary.processed++
      } catch (err) {
        // One store's bad data must not stop every store after it.
        summary.errors++
        console.error(`[digest-cron] ${job} failed for ${storeIds[i]}:`, err?.message || err)
      }
    }

    await progressRef.set({ [job]: { day: dayKey, next: storeIds.length, done: true } }, { merge: true })
    await flushUsage(db, { force: true })
    console.log('[digest-cron]', JSON.stringify({ ...summary, done: true }))
    return res.status(200).json({ ok: true, done: true, ...summary })
  } catch (err) {
    console.error('[digest-cron] error:', err)
    return res.status(500).json({ error: 'Digest cron failed' })
  }
}
