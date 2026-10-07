import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// Sellapage's cut on a delivery booking. Keep in sync with SERVICE_CHARGE in
// sendbox-payment-initialize.js and topship-payment-initialize.js. Orders booked
// from now on also record what was charged, and that recorded value wins.
const SHIPMENT_SERVICE_CHARGE = 250

// Safety rails on the platform-wide reads. Well above today's volume; the
// response says when a cap was hit so a silent undercount is impossible.
const MAX_ORDERS = 20000
const MAX_BOOKINGS = 20000
const MAX_SUBSCRIPTIONS = 20000

// Money written by the payment webhook comes from Paystack transaction
// metadata, which hands numbers back as text. `0 + "12000"` is the string
// "012000", and the next order glues on to it, which is how one store's revenue
// reached 33 digits on the admin screen. Everything is forced to a number here.
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const naira = (n) => `NGN ${Math.round(num(n)).toLocaleString('en-NG')}`

// An order counts as store income once the customer has paid, unless it was
// cancelled. Delivery status is not income status: a "pending" order is paid.
const ORDER_NOT_COUNTED = new Set(['cancelled', 'refunded'])
const BOOKING_NOT_COUNTED = new Set(['cancelled', 'refunded', 'no_show'])
const isPaid = (d) => d.paymentStatus === 'paid' || d.paymentStatus === 'success'

const storeIdFromPath = (path) => String(path || '').split('/')[1] || ''

const LAGOS = 'Africa/Lagos'
const monthKey = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: LAGOS, year: 'numeric', month: '2-digit' })
    .format(date)
    .slice(0, 7)

function lastMonthKeys(count) {
  const now = new Date()
  const [y, m] = monthKey(now).split('-').map(Number)
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1)).toISOString().slice(0, 7))
}

const toDate = (v) => {
  const d = v?.toDate?.() || (v ? new Date(v) : null)
  return d && !isNaN(d.getTime()) ? d : null
}

/**
 * Every paid order and booking on the platform, grouped by store.
 *
 * Two collection group reads instead of the previous two queries per store,
 * which at 500 stores was 1,000 round trips for one screen. Neither query
 * filters or orders, so no composite index is needed.
 */
async function readSales(db) {
  const [ordersSnap, bookingsSnap] = await Promise.all([
    db.collectionGroup('orders')
      .select('grandTotal', 'total', 'deliveryFee', 'processingFee', 'paymentStatus', 'status',
        'shipmentBooked', 'topshipShipmentId', 'platformServiceCharge', 'createdAt')
      .limit(MAX_ORDERS)
      .get(),
    db.collectionGroup('bookings')
      .select('grandTotal', 'servicePrice', 'processingFee', 'paymentStatus', 'status', 'createdAt')
      .limit(MAX_BOOKINGS)
      .get(),
  ])

  const byStore = {}
  const blank = () => ({
    orders: 0, bookings: 0, productRevenue: 0, serviceRevenue: 0,
    deliveryCollected: 0, processingFees: 0, dropshippingRevenue: 0, totalRevenue: 0,
  })
  const shipments = { count: 0, charges: 0 }

  ordersSnap.docs.forEach((doc) => {
    const d = doc.data()
    const storeId = storeIdFromPath(doc.ref.path)
    if (!storeId) return
    const row = (byStore[storeId] ||= blank())

    // Delivery bookings are Sellapage income and are counted even on an order
    // that was later cancelled: the service charge was already taken.
    if (d.shipmentBooked === true || (d.topshipShipmentId && String(d.topshipShipmentId).trim())) {
      shipments.count += 1
      // Falls back to the standard charge for bookings made before the amount
      // was recorded on the order, and if it ever lands as 0.
      shipments.charges += num(d.platformServiceCharge) || SHIPMENT_SERVICE_CHARGE
    }

    if (!isPaid(d) || ORDER_NOT_COUNTED.has(d.status)) return
    const paid = num(d.grandTotal ?? d.total)
    const delivery = num(d.deliveryFee)
    const fee = num(d.processingFee)
    row.orders += 1
    // What the goods themselves earned: delivery is passed to the courier and
    // the processing fee covers Paystack, so neither is money for the products.
    row.productRevenue += Math.max(paid - delivery - fee, 0)
    row.deliveryCollected += delivery
    row.processingFees += fee
  })

  bookingsSnap.docs.forEach((doc) => {
    const d = doc.data()
    const storeId = storeIdFromPath(doc.ref.path)
    if (!storeId) return
    if (!isPaid(d) || BOOKING_NOT_COUNTED.has(d.status)) return
    const row = (byStore[storeId] ||= blank())
    const fee = num(d.processingFee)
    const paid = num(d.grandTotal)
    row.bookings += 1
    row.serviceRevenue += paid > 0 ? Math.max(paid - fee, 0) : num(d.servicePrice)
    row.processingFees += fee
  })

  Object.values(byStore).forEach((row) => {
    row.totalRevenue = row.productRevenue + row.serviceRevenue + row.dropshippingRevenue
  })

  return {
    byStore,
    shipments,
    truncated: ordersSnap.size >= MAX_ORDERS || bookingsSnap.size >= MAX_BOOKINGS,
  }
}

const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const PERIOD_MONTHS = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 }
const MAX_LEDGER = 5000
const ms = (v) => toDate(v)?.getTime() || 0
function paidNow(d, now) {
  const plan = String(d.plan || '').toLowerCase()
  if (!PAID_PLANS.has(plan) || d.planStatus === 'expired') return false
  const end = ms(d.planEndDate)
  if (!end) return true
  return now <= (ms(d.graceUntil) || end + 2 * 24 * 60 * 60 * 1000)
}

let incomeCache = { at: 0, data: null }
async function readIncome(db, fresh) {
  if (!fresh && incomeCache.data && Date.now() - incomeCache.at < 60 * 1000) return incomeCache.data
  const now = Date.now()
  const [subsSnap, packsSnap, ordersSnap, storesSnap] = await Promise.all([
    db.collectionGroup('subscriptions').select('amount', 'status', 'paidAt', 'plan', 'billingPeriod', 'planEndDate', 'paystackRef').limit(MAX_SUBSCRIPTIONS).get(),
    db.collection('sellaCreditPurchases').where('status', '==', 'paid').limit(MAX_SUBSCRIPTIONS).get(),
    db.collectionGroup('orders').select('shipmentBooked', 'topshipShipmentId', 'platformServiceCharge', 'bookingTimestamp', 'createdAt', 'courierName', 'provider').limit(MAX_ORDERS).get(),
    db.collection('stores').select('businessName', 'storeName', 'plan', 'planStatus', 'planEndDate', 'graceUntil', 'billingPeriod').get(),
  ])

  const events = []
  const latestSub = {}
  subsSnap.docs.forEach((doc) => {
    const d = doc.data()
    if (d.status && d.status !== 'success') return
    const storeId = storeIdFromPath(doc.ref.path)
    const at = ms(d.paidAt)
    const amount = num(d.amount) / 100
    const plan = String(d.plan || 'unknown').toLowerCase()
    const period = d.billingPeriod || 'monthly'
    events.push({ id: `p_${doc.id}`, kind: 'plan', at, amount, storeId, plan, period, ref: d.paystackRef || '' })
    if (!latestSub[storeId] || at > latestSub[storeId].at) latestSub[storeId] = { at, amount, plan, period }
  })
  packsSnap.docs.forEach((doc) => {
    const d = doc.data()
    events.push({ id: `c_${doc.id}`, kind: 'credits', at: ms(d.paidAt) || ms(d.createdAt), amount: num(d.price) + num(d.vat), vat: num(d.vat), storeId: d.storeId || '', pack: d.packName || '', credits: num(d.credits), ref: doc.id })
  })
  ordersSnap.docs.forEach((doc) => {
    const d = doc.data()
    if (!(d.shipmentBooked === true || (d.topshipShipmentId && String(d.topshipShipmentId).trim()))) return
    events.push({ id: `d_${doc.id}`, kind: 'delivery', at: ms(d.bookingTimestamp) || ms(d.createdAt), amount: num(d.platformServiceCharge) || SHIPMENT_SERVICE_CHARGE, storeId: storeIdFromPath(doc.ref.path), courier: d.courierName || (d.provider === 'topship' ? 'Topship' : 'Sendbox'), ref: doc.id })
  })
  events.sort((a, b) => b.at - a.at)

  // Paying right now, and what that is worth a month.
  const names = {}
  let mrr = 0
  let paying = 0
  let manual = 0
  const payingByPlan = { growth: 0, pro: 0, premium: 0 }
  storesSnap.docs.forEach((doc) => {
    const d = doc.data()
    names[doc.id] = d.businessName || d.storeName || 'Unnamed store'
    if (!paidNow(d, now)) return
    paying += 1
    const plan = String(d.plan).toLowerCase()
    payingByPlan[plan] = (payingByPlan[plan] || 0) + 1
    const last = latestSub[doc.id]
    if (last && last.amount > 0) mrr += last.amount / (PERIOD_MONTHS[last.period] || 1)
    else manual += 1
  })
  const firstPay = {}
  events.forEach((e) => { if (e.kind === 'plan' && (!firstPay[e.storeId] || e.at < firstPay[e.storeId])) firstPay[e.storeId] = e.at })

  const used = new Set(events.slice(0, MAX_LEDGER).map((e) => e.storeId))
  const data = {
    events: events.slice(0, MAX_LEDGER),
    truncated: events.length > MAX_LEDGER || ordersSnap.size >= MAX_ORDERS || subsSnap.size >= MAX_SUBSCRIPTIONS,
    names: Object.fromEntries([...used].filter(Boolean).map((id) => [id, names[id] || 'A store that no longer exists'])),
    firstPaidAt: firstPay,
    recurring: { mrr: Math.round(mrr), arr: Math.round(mrr * 12), paying, manual, payingByPlan, arppu: paying - manual > 0 ? Math.round(mrr / (paying - manual)) : 0 },
    serviceCharge: SHIPMENT_SERVICE_CHARGE,
    builtAt: now,
  }
  incomeCache = { at: Date.now(), data }
  return data
}

export default async function handler(req, res) {

  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'revenue')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const secretKey = process.env.PAYSTACK_SECRET_KEY

  try {
    const db = getAdminDb()
    const action = req.query.action || 'platform'

    /**
     * Sellapage's OWN money, and nothing else.
     *
     * This used to show the Paystack balance and Paystack's total volume, which
     * is every naira charged through the integration, vendors' sales included.
     * That read as Sellapage revenue when almost all of it belongs to vendors:
     * their sales settle straight to their own subaccounts and Sellapage's share
     * of a vendor sale is zero (create-subaccount.js sets percentage_charge: 0).
     *
     * What Sellapage actually earns is recorded here in Firestore: plan
     * subscriptions, and the service charge on a delivery booking.
     */
    if (action === 'platform') {
      const subsSnap = await db.collectionGroup('subscriptions')
        .select('amount', 'status', 'paidAt', 'plan', 'billingPeriod')
        .limit(MAX_SUBSCRIPTIONS)
        .get()

      const months = lastMonthKeys(12)
      const subsByMonth = Object.fromEntries(months.map((m) => [m, 0]))
      const subsByPlan = {}
      let subscriptionTotal = 0
      let subscriptionCount = 0

      subsSnap.docs.forEach((doc) => {
        const d = doc.data()
        if (d.status && d.status !== 'success') return
        // Subscriptions store the Paystack amount, which is in kobo.
        const amount = num(d.amount) / 100
        subscriptionTotal += amount
        subscriptionCount += 1
        const plan = d.plan || 'unknown'
        subsByPlan[plan] = (subsByPlan[plan] || 0) + amount
        const paidAt = toDate(d.paidAt)
        if (paidAt) {
          const key = monthKey(paidAt)
          if (key in subsByMonth) subsByMonth[key] += amount
        }
      })

      const { shipments, byStore, truncated } = await readSales(db)

      const thisMonth = months[months.length - 1]
      const ownRevenue = subscriptionTotal + shipments.charges

      // Kept, but labelled for what it is, so it is never read as Sellapage's
      // earnings again.
      let paystack = { hasApiKey: false, balance: 0, allPaymentsVolume: 0, allPaymentsCount: 0 }
      if (secretKey) {
        paystack.hasApiKey = true
        try {
          const [balRes, totRes] = await Promise.all([
            fetch('https://api.paystack.co/balance', { headers: { Authorization: `Bearer ${secretKey}` } }),
            fetch('https://api.paystack.co/transaction/totals', { headers: { Authorization: `Bearer ${secretKey}` } }),
          ])
          if (balRes.ok) {
            const balData = await balRes.json()
            const ngn = (balData.data || []).find((b) => b.currency === 'NGN')
            if (ngn) paystack.balance = num(ngn.balance) / 100
          }
          if (totRes.ok) {
            const totData = await totRes.json()
            paystack.allPaymentsVolume = num(totData.data?.total_volume) / 100
            paystack.allPaymentsCount = num(totData.data?.total_transactions)
          }
        } catch (e) {
          console.error('[admin-revenue] Paystack API error:', e.message)
        }
      }

      const merchantGross = Object.values(byStore).reduce((n, r) => n + r.totalRevenue, 0)

      return res.status(200).json({
        success: true,
        platform: {
          ownRevenue,
          ownRevenueFormatted: naira(ownRevenue),
          subscriptions: {
            total: subscriptionTotal,
            totalFormatted: naira(subscriptionTotal),
            count: subscriptionCount,
            thisMonth: subsByMonth[thisMonth] || 0,
            thisMonthFormatted: naira(subsByMonth[thisMonth] || 0),
            byMonth: months.map((m) => ({ month: m, amount: subsByMonth[m] })),
            byPlan: Object.entries(subsByPlan)
              .map(([plan, amount]) => ({ plan, amount }))
              .sort((a, b) => b.amount - a.amount),
          },
          shipments: {
            count: shipments.count,
            total: shipments.charges,
            totalFormatted: naira(shipments.charges),
            serviceCharge: SHIPMENT_SERVICE_CHARGE,
          },
          dropshipping: { total: 0, totalFormatted: naira(0), count: 0, comingSoon: true },
          // Context, not Sellapage income: what vendors earned through the platform.
          merchantGross,
          merchantGrossFormatted: naira(merchantGross),
          paystack: {
            ...paystack,
            balanceFormatted: naira(paystack.balance),
            allPaymentsVolumeFormatted: naira(paystack.allPaymentsVolume),
          },
          truncated,
        },
      })
    }

    /**
     * Every naira Sellapage itself earned, as one ledger, for the Revenue
     * tab's charts (day, week, month or year) and its payments table:
     *   plan      stores/{id}/subscriptions, Paystack amount in kobo
     *   credits   sellaCreditPurchases marked paid: pack price plus VAT, which
     *             is what Sellapage receives (the vendor pays Paystack's fee)
     *   delivery  the service charge on each delivery booked through Sellapage
     * Dropshipping: the 5% commission rate exists (utils/marketplace.js) but
     * no order flow collects it yet, so it has no rows.
     * Plus MRR: each store paying right now, at the monthly equivalent of its
     * latest plan payment. Grouping happens in the browser, so changing the
     * range or the grouping never costs another read. Cached for a minute.
     */
    if (action === 'income') {
      const data = await readIncome(db, req.query.fresh === '1')
      return res.status(200).json({ success: true, ...data })
    }

    if (action === 'transactions') {
      if (!secretKey) {
        return res.status(200).json({ success: true, transactions: [], hasApiKey: false })
      }

      const from = req.query.from || ''
      const to = req.query.to || ''
      const page = parseInt(req.query.page) || 1
      const perPage = parseInt(req.query.limit) || 50

      let url = `https://api.paystack.co/transaction?page=${page}&perPage=${perPage}&status=success`
      if (from) url += `&from=${from}`
      if (to) url += `&to=${to}`

      const response = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } })
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch transactions' })
      }

      const data = await response.json()
      const transactions = (data.data || []).map((t) => ({
        id: t.id,
        reference: t.reference,
        amount: num(t.amount) / 100,
        // Was `t.fes`, a typo, so every fee read as 0.
        fees: num(t.fees) / 100,
        customer: t.customer?.email || '',
        paidAt: t.paid_at || t.createdAt,
        channel: t.channel || '',
        status: t.status || '',
        subaccount: t.subaccount?.subaccount_code || '',
      }))

      return res.status(200).json({
        success: true,
        transactions,
        meta: data.meta || {},
        hasApiKey: true,
      })
    }

    // What each store earned: products, services, and dropshipping once it ships.
    if (action === 'store-revenue') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20

      const { byStore, truncated } = await readSales(db)

      const rows = Object.entries(byStore)
        .filter(([, r]) => r.orders > 0 || r.bookings > 0)
        .map(([id, r]) => ({ id, ...r }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)

      const totals = rows.reduce((acc, r) => ({
        stores: acc.stores + 1,
        orders: acc.orders + r.orders,
        bookings: acc.bookings + r.bookings,
        productRevenue: acc.productRevenue + r.productRevenue,
        serviceRevenue: acc.serviceRevenue + r.serviceRevenue,
        dropshippingRevenue: acc.dropshippingRevenue + r.dropshippingRevenue,
        deliveryCollected: acc.deliveryCollected + r.deliveryCollected,
        totalRevenue: acc.totalRevenue + r.totalRevenue,
      }), {
        stores: 0, orders: 0, bookings: 0, productRevenue: 0, serviceRevenue: 0,
        dropshippingRevenue: 0, deliveryCollected: 0, totalRevenue: 0,
      })

      const total = rows.length
      const offset = (page - 1) * limit
      const paged = rows.slice(offset, offset + limit)

      // Only the stores actually on this page are read, instead of every store
      // on the platform.
      const storeDocs = await Promise.all(
        paged.map((r) => db.collection('stores').doc(r.id).get()),
      )

      const stores = paged.map((r, i) => {
        const d = storeDocs[i]?.data() || {}
        return {
          ...r,
          storeName: d.storeName || d.handle || '',
          handle: d.handle || '',
          email: d.email || d.ownerEmail || '',
          whatsappNumber: d.whatsappNumber || '',
          plan: d.plan || 'starter',
          productRevenueFormatted: naira(r.productRevenue),
          serviceRevenueFormatted: naira(r.serviceRevenue),
          dropshippingRevenueFormatted: naira(r.dropshippingRevenue),
          totalRevenueFormatted: naira(r.totalRevenue),
        }
      })

      return res.status(200).json({
        success: true,
        stores,
        totals: {
          ...totals,
          productRevenueFormatted: naira(totals.productRevenue),
          serviceRevenueFormatted: naira(totals.serviceRevenue),
          dropshippingRevenueFormatted: naira(totals.dropshippingRevenue),
          totalRevenueFormatted: naira(totals.totalRevenue),
        },
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        truncated,
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-revenue] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
