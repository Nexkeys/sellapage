// src/api-handlers/_lib/ops-facts.js
//
// One fact sheet per merchant, for the Growth & Activation and Outreach tabs
// of the Ops console. Built from what Sellapage already records:
//   stores                       sign-up, products, logo, description, plan,
//                                referral, "how did you hear", shares (2026-10-06)
//   stores/{id}/analytics        storefront visits (storeSummary)
//   stores/{id}/sessions         vendor sign-ins (lastActiveAt): returning users
//   leads                        enquiries left on a storefront
//   stores/{id}/orders           orders (paid through Paystack)
//   stores/{id}/bookings         service bookings
//   */subscriptions              plan payments (kobo)
//
// Reads: about one per store, session, order, lead and booking. That is a few
// thousand at most today, so the sheet is kept in memory for 10 minutes and
// every dashboard view reuses it (Spark plan: 50,000 reads a day).
//
// DEFINITIONS (shown in the console too, so nobody has to guess):
//   set up        a logo, or a description of 20+ characters
//   has products  at least one product or service
//   complete      has products AND a logo AND a description of 20+ characters
//   shared        shared the store link at least once (tracked from
//                 2026-10-06), or, for stores from before that, 5+ visits
//   interaction   at least one enquiry, order or booking
//   active        signed in to the dashboard in the last 30 days (7 for WAM)
//   returning     signed in again a day or more after signing up
//   activated     has products, shared, and at least one interaction
import { getAdminDb } from './firebase-admin.js'

const DAY = 24 * 60 * 60 * 1000
const CACHE_MS = 10 * 60 * 1000
const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const GRACE_MS = 2 * DAY
const VISITS_AS_SHARED = 5

const ms = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (v.toMillis) return v.toMillis()
  if (v._seconds) return v._seconds * 1000
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

// Same rule as admin-analytics.js paidState: paid right now, grace included.
function isPaidNow(d, now) {
  const plan = String(d.plan || '').toLowerCase()
  if (!PAID_PLANS.has(plan) || d.planStatus === 'expired') return false
  const end = ms(d.planEndDate)
  if (!end) return true
  const graceEnd = ms(d.graceUntil) || end + GRACE_MS
  return now <= graceEnd
}

export const normPhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '')
  if (digits.startsWith('234')) return digits.slice(3).replace(/^0?/, '')
  return digits.replace(/^0/, '')
}

let cache = null
let building = null

export async function getMerchantFacts({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.builtAt < CACHE_MS) return cache
  if (building) return building
  building = build().finally(() => { building = null })
  return building
}

async function build() {
  const db = getAdminDb()
  const now = Date.now()
  const [storesSnap, analyticsSnap, sessionsSnap, leadsSnap, ordersSnap, bookingsSnap, subsSnap] = await Promise.all([
    db.collection('stores').select(
      'createdAt', 'businessName', 'storeName', 'email', 'whatsappNumber', 'productCount', 'logoUrl', 'description',
      'plan', 'planStatus', 'planEndDate', 'graceUntil', 'referredBy', 'heardAbout', 'shareCount', 'lastSharedAt',
      'businessCategory', 'vendorType', 'isActive', 'ownerName',
    ).get(),
    db.collectionGroup('analytics').select('totalViews').get(),
    db.collectionGroup('sessions').select('lastActiveAt', 'createdAt').get(),
    db.collection('leads').select('storeId', 'createdAt').get(),
    db.collectionGroup('orders').select('createdAt', 'total', 'grandTotal', 'amount').get(),
    db.collectionGroup('bookings').select('createdAt').get(),
    db.collectionGroup('subscriptions').select('amount', 'status', 'paidAt').get(),
  ])

  const facts = new Map()
  for (const doc of storesSnap.docs) {
    const d = doc.data()
    const description = String(d.description || '').trim()
    facts.set(doc.id, {
      id: doc.id,
      name: d.businessName || d.storeName || 'Unnamed store',
      slug: d.storeName || '',
      owner: d.ownerName || '',
      email: d.email || '',
      phone: d.whatsappNumber || '',
      category: d.businessCategory || '',
      vendorType: d.vendorType || 'products',
      createdAt: ms(d.createdAt),
      products: Math.max(0, Number(d.productCount) || 0),
      hasLogo: !!d.logoUrl,
      hasDescription: description.length >= 20,
      paid: isPaidNow(d, now),
      plan: String(d.plan || 'starter').toLowerCase(),
      referred: !!d.referredBy,
      source: d.heardAbout?.source || (d.referredBy ? 'merchant_referral' : 'unknown'),
      sourceDetail: d.heardAbout?.detail || '',
      shareCount: Math.max(0, Number(d.shareCount) || 0),
      lastSharedAt: ms(d.lastSharedAt),
      visits: 0,
      lastActiveAt: 0,
      firstReturnAt: 0,
      leads: 0,
      orders: 0,
      bookings: 0,
      firstInteractionAt: 0,
      lastInteractionAt: 0,
      orderValue: 0,
      leads30: 0,
      orders30: 0,
      bookings30: 0,
    })
  }
  const storeOf = (doc) => doc.ref.parent?.parent?.id
  const recent = (at) => !!at && now - at <= 30 * DAY
  const touch = (f, at) => {
    if (!at) return
    if (!f.firstInteractionAt || at < f.firstInteractionAt) f.firstInteractionAt = at
    if (at > f.lastInteractionAt) f.lastInteractionAt = at
  }

  for (const doc of analyticsSnap.docs) {
    if (doc.id !== 'storeSummary') continue
    const f = facts.get(storeOf(doc))
    if (f) f.visits = Number(doc.get('totalViews')) || 0
  }
  for (const doc of sessionsSnap.docs) {
    const f = facts.get(storeOf(doc))
    if (!f) continue
    const last = ms(doc.get('lastActiveAt')) || ms(doc.get('createdAt'))
    if (last > f.lastActiveAt) f.lastActiveAt = last
    if (f.createdAt && last > f.createdAt + DAY && (!f.firstReturnAt || last < f.firstReturnAt)) f.firstReturnAt = last
  }
  for (const doc of leadsSnap.docs) {
    const f = facts.get(doc.get('storeId'))
    if (!f) continue
    f.leads += 1
    if (recent(ms(doc.get('createdAt')))) f.leads30 += 1
    touch(f, ms(doc.get('createdAt')))
  }
  for (const doc of ordersSnap.docs) {
    const f = facts.get(storeOf(doc))
    if (!f) continue
    f.orders += 1
    f.orderValue += Number(doc.get('grandTotal') ?? doc.get('total') ?? doc.get('amount')) || 0
    if (recent(ms(doc.get('createdAt')))) f.orders30 += 1
    touch(f, ms(doc.get('createdAt')))
  }
  for (const doc of bookingsSnap.docs) {
    const f = facts.get(storeOf(doc))
    if (!f) continue
    f.bookings += 1
    if (recent(ms(doc.get('createdAt')))) f.bookings30 += 1
    touch(f, ms(doc.get('createdAt')))
  }

  // Plan payments, in naira, per store and per month.
  let revenue30 = 0
  let revenueAll = 0
  const revenueByMonth = {}
  for (const doc of subsSnap.docs) {
    const status = doc.get('status')
    if (status && status !== 'success') continue
    const naira = (Number(doc.get('amount')) || 0) / 100
    const at = ms(doc.get('paidAt'))
    revenueAll += naira
    if (at && now - at <= 30 * DAY) revenue30 += naira
    if (at) {
      const key = new Date(at).toISOString().slice(0, 7)
      revenueByMonth[key] = (revenueByMonth[key] || 0) + naira
    }
  }

  for (const f of facts.values()) {
    f.setUp = f.hasLogo || f.hasDescription
    f.hasProducts = f.products > 0
    f.complete = f.hasProducts && f.hasLogo && f.hasDescription
    f.sharedTracked = f.shareCount > 0
    f.shared = f.sharedTracked || f.visits >= VISITS_AS_SHARED
    f.interactions = f.leads + f.orders + f.bookings
    f.interacted = f.interactions > 0
    f.active30 = !!f.lastActiveAt && now - f.lastActiveAt <= 30 * DAY
    f.active7 = !!f.lastActiveAt && now - f.lastActiveAt <= 7 * DAY
    f.returning = !!f.firstReturnAt
    f.activated = f.hasProducts && f.shared && f.interacted
    f.segment = segmentOf(f)
  }

  cache = { builtAt: now, facts, revenue30, revenueAll, revenueByMonth }
  return cache
}

// The six segments from the growth plan, one per merchant, checked in this
// order so a merchant sits in the most advanced stage that is true of them.
export const SEGMENTS = [
  { id: 'active', label: 'Active', about: 'Signed in during the last 30 days and has products.' },
  { id: 'went_quiet', label: 'Went quiet', about: 'Was set up or had customers, but no sign-in for 30+ days.' },
  { id: 'shared_no_activity', label: 'Shared, no customers yet', about: 'Shared the store but no enquiry, order or booking yet.' },
  { id: 'complete_not_shared', label: 'Has products, never shared', about: 'Products are in, but the store link was never shared.' },
  { id: 'no_products', label: 'Set up, no products', about: 'Has a logo or description but no products or services.' },
  { id: 'not_set_up', label: 'Signed up, nothing set up', about: 'No logo, no description and no products yet.' },
]

function segmentOf(f) {
  if (f.active30 && f.hasProducts) return 'active'
  if ((f.interacted || f.complete || f.hasProducts) && !f.active30 && f.lastActiveAt) return 'went_quiet'
  if (f.hasProducts && f.shared && !f.interacted) return 'shared_no_activity'
  if (f.hasProducts && !f.shared) return 'complete_not_shared'
  if (f.setUp && !f.hasProducts) return 'no_products'
  if (f.hasProducts) return 'shared_no_activity'
  return 'not_set_up'
}

/** A store's public row for lists (no internal counters beyond what staff need). */
export function factRow(f) {
  return {
    id: f.id, name: f.name, slug: f.slug, owner: f.owner, email: f.email, phone: f.phone, category: f.category,
    createdAt: f.createdAt, products: f.products, hasLogo: f.hasLogo, hasDescription: f.hasDescription, complete: f.complete,
    shared: f.shared, sharedTracked: f.sharedTracked, shareCount: f.shareCount, visits: f.visits, leads: f.leads, orders: f.orders,
    bookings: f.bookings, lastActiveAt: f.lastActiveAt, lastInteractionAt: f.lastInteractionAt, paid: f.paid, plan: f.plan,
    source: f.source, segment: f.segment,
  }
}
