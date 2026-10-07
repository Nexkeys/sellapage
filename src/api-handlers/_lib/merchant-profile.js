// src/api-handlers/_lib/merchant-profile.js
//
// Everything the Ops console's merchant side panel shows about ONE store, read
// from what Sellapage already records (nothing here writes):
//
//   stores/{id}                        profile, plan, referral fields, payout
//   Firebase Auth user {id}            account created, last sign-in
//   stores/{id}/sessions               devices; lastActiveAt is bumped every
//                                      45s while the dashboard is open
//                                      (DashboardLayout heartbeat), so
//                                      "online" = a live session seen in the
//                                      last ONLINE_MS
//   stores/{id}/analytics/storeSummary all-time storefront counters
//   stores/{id}/analyticsDaily/{day}   the same counters per Lagos day
//   stores/{id}/orders, /bookings      sales; a booked delivery on an order is
//                                      Sellapage's service charge
//   leads (storeId == id)              enquiries left on the storefront
//   stores/{id}/subscriptions          plan payments (amount in kobo)
//   sellaCreditPurchases (storeId)     Sella credit packs bought
//   stores/{id}/sellaCredits/{month}   Sella credits used each month
//   stores (referredBy == id)          stores this merchant brought in
//
// Reads: roughly one per session, day, order, booking, lead and payment of
// THIS store, so a busy store costs a few hundred. Kept in memory for a
// minute per instance, so opening the same store twice is free.
import { getAdminAuth } from './firebase-admin.js'
import { kindsOf } from './sella-credits.js'

const ONLINE_MS = 2 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const CACHE_MS = 60 * 1000
const DAYS_SHOWN = 90
const SHIPMENT_SERVICE_CHARGE = 250
const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const ORDER_NOT_COUNTED = new Set(['cancelled', 'refunded'])
const BOOKING_NOT_COUNTED = new Set(['cancelled', 'refunded', 'no_show'])

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
export const ms = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v._seconds) return v._seconds * 1000
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}
const isPaid = (d) => d.paymentStatus === 'paid' || d.paymentStatus === 'success'

const LAGOS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' })
export const lagosDay = (t) => LAGOS_DAY.format(new Date(t))
const lastDays = (todayKey, count) => {
  const [y, m, d] = todayKey.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10))
}
const lastMonths = (count) => {
  const [y, m] = lagosDay(Date.now()).slice(0, 7).split('-').map(Number)
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1)).toISOString().slice(0, 7))
}

/** Paid right now (grace included). Same rule as admin-analytics paidState. */
export function paidNow(d, now = Date.now()) {
  const plan = String(d.plan || '').toLowerCase()
  if (!PAID_PLANS.has(plan) || d.planStatus === 'expired') return false
  const end = ms(d.planEndDate)
  if (!end) return true
  const graceEnd = ms(d.graceUntil) || end + 2 * DAY
  return now <= graceEnd
}

const cache = new Map()
export const forgetMerchantProfile = (id) => cache.delete(id)

const safe = (p, fallback) => p.catch((err) => { console.error('[merchant-profile]', err.message); return fallback })
const EMPTY_SNAP = { docs: [], size: 0, empty: true }

export async function buildMerchantProfile(db, storeId, { fresh = false } = {}) {
  const hit = cache.get(storeId)
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const storeRef = db.collection('stores').doc(storeId)
  const storeSnap = await storeRef.get()
  if (!storeSnap.exists) return null
  const s = storeSnap.data() || {}
  const now = Date.now()

  const [
    authUser, sessionsSnap, summarySnap, daysSnap, ordersSnap, bookingsSnap, leadsSnap,
    productsCount, servicesCount, subsSnap, packsSnap, creditsSnap, referredSnap, referrerSnap, staffSnap,
  ] = await Promise.all([
    safe(Promise.resolve().then(() => getAdminAuth().getUser(storeId)), null),
    safe(storeRef.collection('sessions').orderBy('lastActiveAt', 'desc').limit(30).get(), EMPTY_SNAP),
    safe(storeRef.collection('analytics').doc('storeSummary').get(), null),
    safe(storeRef.collection('analyticsDaily').orderBy('date', 'desc').limit(DAYS_SHOWN).get(), EMPTY_SNAP),
    safe(storeRef.collection('orders').select(
      'grandTotal', 'total', 'deliveryFee', 'processingFee', 'paymentStatus', 'status', 'createdAt', 'customerName',
      'shipmentBooked', 'topshipShipmentId', 'platformServiceCharge', 'bookingTimestamp', 'courierName', 'provider',
    ).limit(2000).get(), EMPTY_SNAP),
    safe(storeRef.collection('bookings').select(
      'grandTotal', 'servicePrice', 'processingFee', 'paymentStatus', 'status', 'createdAt', 'customerName', 'serviceName', 'bookingDate', 'bookingTime',
    ).limit(2000).get(), EMPTY_SNAP),
    safe(db.collection('leads').where('storeId', '==', storeId).select('createdAt', 'leadType', 'interest', 'name').limit(2000).get(), EMPTY_SNAP),
    safe(storeRef.collection('products').count().get().then((x) => x.data().count), 0),
    safe(storeRef.collection('services').count().get().then((x) => x.data().count), 0),
    safe(storeRef.collection('subscriptions').get(), EMPTY_SNAP),
    safe(db.collection('sellaCreditPurchases').where('storeId', '==', storeId).get(), EMPTY_SNAP),
    safe(storeRef.collection('sellaCredits').get(), EMPTY_SNAP),
    safe(db.collection('stores').where('referredBy', '==', storeId).select('businessName', 'storeName', 'plan', 'planStatus', 'planEndDate', 'graceUntil', 'createdAt').limit(500).get(), EMPTY_SNAP),
    s.referredBy ? safe(db.collection('stores').doc(String(s.referredBy)).get(), null) : Promise.resolve(null),
    safe(db.collection('staffMemberships').where('storeId', '==', storeId).get(), EMPTY_SNAP),
  ])

  // ── presence ───────────────────────────────────────────────────────────
  const sessions = sessionsSnap.docs.map((d) => {
    const x = d.data()
    return {
      id: d.id,
      device: [x.browser, x.os].filter(Boolean).join(' on ') || 'Unknown device',
      deviceType: x.deviceType || '',
      place: [x.city, x.country].filter(Boolean).join(', '),
      who: x.actorLabel || 'Vendor',
      staff: !!x.actorLabel && x.actorLabel !== 'Vendor',
      createdAt: ms(x.createdAt),
      lastActiveAt: ms(x.lastActiveAt),
      revoked: x.revoked === true,
    }
  })
  const live = sessions.filter((x) => !x.revoked)
  const lastActiveAt = Math.max(0, ...live.map((x) => x.lastActiveAt))
  const meta = authUser?.metadata || {}
  const presence = {
    online: !!lastActiveAt && now - lastActiveAt <= ONLINE_MS,
    onlineDevices: live.filter((x) => now - x.lastActiveAt <= ONLINE_MS).length,
    lastActiveAt,
    lastSignInAt: ms(meta.lastSignInTime) || Math.max(0, ...sessions.map((x) => x.createdAt)),
    accountCreatedAt: ms(meta.creationTime),
    accountDisabled: authUser?.disabled === true,
    emailVerified: authUser?.emailVerified === true,
    sessions,
    devices: new Set(sessions.map((x) => x.device)).size,
  }

  // ── storefront traffic ─────────────────────────────────────────────────
  const sum = summarySnap?.exists ? summarySnap.data() || {} : {}
  const byDay = Object.fromEntries(daysSnap.docs.map((d) => [d.get('date') || d.id, d.data()]))
  const days = lastDays(lagosDay(now), DAYS_SHOWN).map((date) => {
    const x = byDay[date] || {}
    return { date, views: num(x.views), productClicks: num(x.productClicks), serviceClicks: num(x.serviceClicks), bookingRequests: num(x.bookingRequests), engaged: num(x.engagedSessions) }
  })
  const last30 = days.slice(-30).reduce((a, x) => ({
    views: a.views + x.views, productClicks: a.productClicks + x.productClicks, serviceClicks: a.serviceClicks + x.serviceClicks, bookingRequests: a.bookingRequests + x.bookingRequests,
  }), { views: 0, productClicks: 0, serviceClicks: 0, bookingRequests: 0 })
  const traffic = {
    allTime: {
      views: num(sum.totalViews),
      productClicks: num(sum.productClicks),
      serviceClicks: num(sum.serviceClicks),
      // Older stores have clicks only in the combined total.
      clicks: num(sum.totalClicks),
      bookingRequests: num(sum.totalBookingRequests),
      engaged: num(sum.engagedViews),
    },
    last30,
    days,
  }

  // ── sales ──────────────────────────────────────────────────────────────
  const months = lastMonths(12)
  const monthRow = Object.fromEntries(months.map((m) => [m, { month: m, orders: 0, ordersValue: 0, bookings: 0, bookingsValue: 0, leads: 0 }]))
  const monthOf = (t) => (t ? lagosDay(t).slice(0, 7) : '')
  const since30 = now - 30 * DAY
  const sales = {
    orders: { count: 0, paid: 0, value: 0, last30: 0, last30Value: 0, firstAt: 0, lastAt: 0 },
    bookings: { count: 0, paid: 0, value: 0, last30: 0, last30Value: 0, firstAt: 0, lastAt: 0 },
    leads: { count: leadsSnap.size, last30: 0, lastAt: 0 },
  }
  const billing = []
  const recentOrders = []
  for (const doc of ordersSnap.docs) {
    const d = doc.data()
    const at = ms(d.createdAt)
    const o = sales.orders
    o.count += 1
    if (at) { o.lastAt = Math.max(o.lastAt, at); o.firstAt = o.firstAt ? Math.min(o.firstAt, at) : at }
    if (at >= since30) o.last30 += 1
    const counted = isPaid(d) && !ORDER_NOT_COUNTED.has(d.status)
    const value = num(d.grandTotal ?? d.total)
    if (counted) {
      o.paid += 1
      o.value += value
      if (at >= since30) o.last30Value += value
      const row = monthRow[monthOf(at)]
      if (row) { row.orders += 1; row.ordersValue += value }
    }
    recentOrders.push({ id: doc.id, at, customer: d.customerName || '', amount: value, status: d.status || '', paid: isPaid(d), delivery: !!(d.shipmentBooked || d.topshipShipmentId) })
    if (d.shipmentBooked === true || (d.topshipShipmentId && String(d.topshipShipmentId).trim())) {
      const bookedAt = ms(d.bookingTimestamp) || at
      billing.push({
        id: `delivery-${doc.id}`, kind: 'delivery', at: bookedAt,
        amount: num(d.platformServiceCharge) || SHIPMENT_SERVICE_CHARGE,
        label: 'Delivery booking service charge',
        detail: `${d.courierName || (d.provider === 'topship' ? 'Topship' : 'Courier')} · order ${doc.id.slice(0, 8)}`,
      })
    }
  }
  const recentBookings = []
  for (const doc of bookingsSnap.docs) {
    const d = doc.data()
    const at = ms(d.createdAt)
    const b = sales.bookings
    b.count += 1
    if (at) { b.lastAt = Math.max(b.lastAt, at); b.firstAt = b.firstAt ? Math.min(b.firstAt, at) : at }
    if (at >= since30) b.last30 += 1
    const counted = isPaid(d) && !BOOKING_NOT_COUNTED.has(d.status)
    const value = num(d.grandTotal) || num(d.servicePrice)
    if (counted) {
      b.paid += 1
      b.value += value
      if (at >= since30) b.last30Value += value
      const row = monthRow[monthOf(at)]
      if (row) { row.bookings += 1; row.bookingsValue += value }
    }
    recentBookings.push({ id: doc.id, at, customer: d.customerName || '', service: d.serviceName || '', when: [d.bookingDate, d.bookingTime].filter(Boolean).join(' '), amount: value, status: d.status || '', paid: isPaid(d) })
  }
  const recentLeads = []
  for (const doc of leadsSnap.docs) {
    const d = doc.data()
    const at = ms(d.createdAt)
    if (at >= since30) sales.leads.last30 += 1
    sales.leads.lastAt = Math.max(sales.leads.lastAt, at)
    const row = monthRow[monthOf(at)]
    if (row) row.leads += 1
    recentLeads.push({ id: doc.id, at, type: d.leadType || '', interest: String(d.interest || '').slice(0, 80) })
  }
  const newestFirst = (a, b) => b.at - a.at
  recentOrders.sort(newestFirst)
  recentBookings.sort(newestFirst)
  recentLeads.sort(newestFirst)

  // ── what they paid Sellapage ───────────────────────────────────────────
  const subs = subsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((x) => !x.status || x.status === 'success')
    .sort((a, b) => ms(a.paidAt) - ms(b.paidAt))
  subs.forEach((x, i) => {
    const prev = subs[i - 1]
    const kindOfPay = !prev ? 'First payment' : prev.plan === x.plan ? 'Renewal' : 'Plan change'
    billing.push({
      id: `plan-${x.id}`, kind: 'plan', at: ms(x.paidAt), amount: num(x.amount) / 100,
      label: `${String(x.plan || 'Plan').replace(/^\w/, (c) => c.toUpperCase())} plan, ${x.billingPeriod || 'monthly'}`,
      detail: `${kindOfPay}${ms(x.planEndDate) ? ` · runs to ${new Date(ms(x.planEndDate)).toISOString().slice(0, 10)}` : ''}`,
      ref: x.paystackRef || '',
      plan: x.plan || '', period: x.billingPeriod || '',
    })
  })
  for (const doc of packsSnap.docs) {
    const p = doc.data()
    if (p.status !== 'paid') continue
    billing.push({
      id: `credits-${doc.id}`, kind: 'credits', at: ms(p.paidAt) || ms(p.createdAt),
      amount: num(p.price) + num(p.vat),
      label: `Sella credits: ${p.packName || 'pack'} (${num(p.credits).toLocaleString('en-NG')} credits)`,
      detail: `₦${num(p.price).toLocaleString('en-NG')} + ₦${num(p.vat).toLocaleString('en-NG')} VAT`,
      ref: doc.id,
    })
  }
  billing.sort(newestFirst)
  const billingTotals = billing.reduce((a, x) => { a[x.kind] = (a[x.kind] || 0) + x.amount; a.all += x.amount; return a }, { all: 0, plan: 0, credits: 0, delivery: 0 })

  // ── Sella AI ───────────────────────────────────────────────────────────
  const sellaMonths = []
  let topupLeft = 0
  for (const doc of creditsSnap.docs) {
    const d = doc.data() || {}
    if (/^\d{4}-\d{2}$/.test(doc.id)) sellaMonths.push({ month: doc.id, used: num(d.used), requests: num(d.requests), costUsd: num(d.costUsd), byKind: kindsOf(d) })
    else if (doc.id === 'topup') {
      const lots = Array.isArray(d.lots) ? d.lots : []
      topupLeft = lots.filter((l) => num(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > now)).reduce((n, l) => n + num(l.remaining), 0) + num(d.balance)
    }
  }
  sellaMonths.sort((a, b) => a.month.localeCompare(b.month))
  const thisMonth = lagosDay(now).slice(0, 7)
  const sella = {
    thisMonth: sellaMonths.find((x) => x.month === thisMonth) || { month: thisMonth, used: 0, requests: 0, costUsd: 0, byKind: {} },
    allTime: sellaMonths.reduce((a, x) => ({ used: a.used + x.used, requests: a.requests + x.requests, costUsd: a.costUsd + x.costUsd }), { used: 0, requests: 0, costUsd: 0 }),
    months: sellaMonths,
    topupLeft: Math.round(topupLeft * 100) / 100,
  }

  // ── where they came from, and who they brought ─────────────────────────
  const r = referrerSnap?.exists ? referrerSnap.data() || {} : null
  const referred = referredSnap.docs.map((d) => {
    const x = d.data()
    return { id: d.id, name: x.businessName || x.storeName || 'Unnamed store', slug: x.storeName || '', plan: String(x.plan || 'starter').toLowerCase(), paying: paidNow(x, now), joinedAt: ms(x.createdAt) }
  }).sort((a, b) => b.joinedAt - a.joinedAt)
  const referral = {
    code: s.referralCode || '',
    referredBy: s.referredBy ? {
      id: String(s.referredBy),
      name: r ? r.businessName || r.storeName || 'A merchant' : 'A store that no longer exists',
      slug: r?.storeName || '',
      code: r?.referralCode || '',
      plan: r?.plan || '',
    } : null,
    heardAbout: s.heardAbout ? { source: s.heardAbout.source || '', detail: s.heardAbout.detail || '' } : null,
    referred,
    referredPaying: referred.filter((x) => x.paying).length,
    earned: num(s.referralTotalEarned),
    available: num(s.referralAvailable),
  }

  // ── one timeline of everything that happened ───────────────────────────
  const timeline = []
  const joined = ms(s.createdAt)
  if (joined) timeline.push({ at: joined, kind: 'joined', text: 'Created their store' })
  billing.forEach((x) => timeline.push({ at: x.at, kind: x.kind, text: x.label, amount: x.amount }))
  recentOrders.slice(0, 60).forEach((x) => timeline.push({ at: x.at, kind: 'order', text: `Order${x.customer ? ` from ${x.customer}` : ''}`, amount: x.amount, paid: x.paid }))
  recentBookings.slice(0, 60).forEach((x) => timeline.push({ at: x.at, kind: 'booking', text: `Booking${x.service ? `: ${x.service}` : ''}${x.customer ? ` for ${x.customer}` : ''}`, amount: x.amount, paid: x.paid }))
  recentLeads.slice(0, 60).forEach((x) => timeline.push({ at: x.at, kind: 'lead', text: `Enquiry${x.interest ? `: ${x.interest}` : ''}` }))
  sessions.forEach((x) => timeline.push({ at: x.createdAt, kind: 'signin', text: `${x.staff ? x.who : 'Signed in'} on ${x.device}${x.place ? `, ${x.place}` : ''}` }))
  referred.forEach((x) => timeline.push({ at: x.joinedAt, kind: 'referral', text: `Brought in ${x.name}` }))
  timeline.sort(newestFirst)

  const planEnd = ms(s.planEndDate)
  const data = {
    store: {
      id: storeId,
      name: s.businessName || s.storeName || 'Unnamed store',
      slug: s.storeName || s.handle || '',
      ownerName: s.ownerName || '',
      email: s.email || s.ownerEmail || '',
      phone: s.whatsappNumber || '',
      phoneVerified: s.phoneVerified === true || !!s.phoneVerifiedAt,
      category: s.businessCategory || '',
      vendorType: s.vendorType || 'products',
      description: String(s.description || '').slice(0, 400),
      logoUrl: s.logoUrl || '',
      customDomain: s.customDomain || '',
      createdAt: joined,
      plan: String(s.plan || 'starter').toLowerCase(),
      paidNow: paidNow(s, now),
      planStatus: s.planStatus || '',
      billingPeriod: s.billingPeriod || '',
      planStartDate: ms(s.planStartDate),
      planEndDate: planEnd,
      planEnded: PAID_PLANS.has(String(s.plan || '').toLowerCase()) && !!planEnd && !paidNow(s, now),
      cacVerified: s.cacVerified === true,
      isActive: s.isActive !== false,
      subaccountCode: s.subaccountCode || null,
      payoutBankName: s.payoutBankName || null,
      payoutAccountNumberMasked: s.payoutAccountNumberMasked || null,
      payoutsVerified: s.payoutsVerified === true,
      listings: { products: productsCount, services: servicesCount },
      staff: staffSnap.docs.filter((d) => d.get('active') === true).length,
    },
    presence,
    traffic,
    sales: { ...sales, byMonth: months.map((m) => monthRow[m]) },
    recent: { orders: recentOrders.slice(0, 200), bookings: recentBookings.slice(0, 200), leads: recentLeads.slice(0, 200) },
    billing: { items: billing, totals: billingTotals },
    sella,
    referral,
    timeline: timeline.slice(0, 300),
    builtAt: now,
  }
  cache.set(storeId, { at: Date.now(), data })
  return data
}
