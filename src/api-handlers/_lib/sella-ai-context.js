// src/api-handlers/_lib/sella-ai-context.js
// Builds a compact, whole-store context snapshot for the Sella AI Business Partner.
// Reads every relevant vendor collection but returns AGGREGATES + recent items only —
// never full raw dumps — to keep token usage and latency sane.
//
// Designed to be forward-compatible: adding a new dashboard tab usually means adding
// one more block here (and, if writable, one more case in sella-ai-tools.js). Nothing
// else in the AI pipeline needs to change.

const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

// Firestore Timestamp | ISO string | Date -> millis (best effort)
const toMillis = (v) => {
  if (!v) return 0
  if (typeof v?.toMillis === 'function') return v.toMillis()
  if (typeof v?.toDate === 'function') return v.toDate().getTime()
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}

const safeGet = async (promise, fallback) => {
  try {
    return await promise
  } catch (err) {
    console.error('[sella-ai-context] partial read failed:', err?.message || err)
    return fallback
  }
}

/**
 * Build the full-store context object the model receives on every turn.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} storeId
 * @param {object} store  the already-fetched stores/{storeId} data
 */
export async function buildStoreContext(db, storeId, store) {
  const storeRef = db.collection('stores').doc(storeId)
  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  const [
    productsSnap,
    servicesSnap,
    ordersSnap,
    bookingsSnap,
    customersSnap,
    discountsSnap,
    ledgerSnap,
    leadsSnap,
    categoriesSnap,
    analyticsSnap,
  ] = await Promise.all([
    safeGet(storeRef.collection('products').limit(200).get(), { docs: [] }),
    safeGet(storeRef.collection('services').limit(200).get(), { docs: [] }),
    safeGet(storeRef.collection('orders').limit(300).get(), { docs: [] }),
    safeGet(storeRef.collection('bookings').limit(300).get(), { docs: [] }),
    safeGet(storeRef.collection('customers').limit(500).get(), { docs: [] }),
    safeGet(storeRef.collection('discounts').limit(100).get(), { docs: [] }),
    safeGet(storeRef.collection('ledger').limit(300).get(), { docs: [] }),
    safeGet(storeRef.collection('leads').limit(300).get(), { docs: [] }),
    safeGet(storeRef.collection('categories').limit(100).get(), { docs: [] }),
    safeGet(storeRef.collection('analytics').limit(500).get(), { docs: [] }),
  ])

  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const services = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const discounts = discountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const ledger = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const analyticsDocs = analyticsSnap.docs.map((d) => d.data())

  // ---- Orders aggregation ----
  const orderMillis = (o) => toMillis(o.createdAt) || toMillis(o.date) || 0
  const paidOrders = orders.filter((o) => (o.status || '').toLowerCase() !== 'cancelled')
  const revenueAll = paidOrders.reduce((s, o) => s + Number(o.grandTotal || o.total || 0), 0)
  const ordersThisWeek = orders.filter((o) => orderMillis(o) >= weekAgo)
  const ordersThisMonth = orders.filter((o) => orderMillis(o) >= monthAgo)
  const revenueThisMonth = ordersThisMonth
    .filter((o) => (o.status || '').toLowerCase() !== 'cancelled')
    .reduce((s, o) => s + Number(o.grandTotal || o.total || 0), 0)
  const statusCounts = orders.reduce((acc, o) => {
    const s = (o.status || 'pending').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const recentOrders = [...orders]
    .sort((a, b) => orderMillis(b) - orderMillis(a))
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      customer: o.customerName || 'Unknown',
      item: o.itemName || o.items || '—',
      total: Number(o.grandTotal || o.total || 0),
      status: o.status || 'pending',
    }))

  // ---- Bookings aggregation (separate collection/domain from orders) ----
  const today = new Date().toISOString().split('T')[0]
  const bookingMillis = (b) => toMillis(b.createdAt) || 0
  const paidBookings = bookings.filter((b) => (b.status || '').toLowerCase() !== 'cancelled')
  const bookingRevenueAll = paidBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0)
  const bookingsThisWeek = bookings.filter((b) => bookingMillis(b) >= weekAgo)
  const bookingsThisMonth = bookings.filter((b) => bookingMillis(b) >= monthAgo)
  const bookingRevenueThisMonth = bookingsThisMonth
    .filter((b) => (b.status || '').toLowerCase() !== 'cancelled')
    .reduce((s, b) => s + Number(b.grandTotal || 0), 0)
  const bookingStatusCounts = bookings.reduce((acc, b) => {
    const s = (b.status || 'pending').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const recentBookings = [...bookings]
    .sort((a, b) => bookingMillis(b) - bookingMillis(a))
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      customer: b.customerName || 'Unknown',
      service: b.serviceName || '—',
      total: Number(b.grandTotal || 0),
      status: b.status || 'pending',
      scheduledFor: b.bookingDate ? `${b.bookingDate} ${b.bookingTime || ''}`.trim() : null,
    }))
  const upcomingBookings = bookings
    .filter((b) => b.bookingDate >= today && ['pending', 'confirmed', 'rescheduled'].includes((b.status || '').toLowerCase()))
    .sort((a, b) => (a.bookingDate || '').localeCompare(b.bookingDate || ''))
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      customer: b.customerName || 'Unknown',
      service: b.serviceName || '—',
      scheduledFor: `${b.bookingDate} ${b.bookingTime || ''}`.trim(),
      status: b.status || 'pending',
    }))

  // ---- Product / service best sellers (best-effort via order line item names) ----
  const itemSales = {}
  for (const o of paidOrders) {
    const name = o.itemName || o.items
    if (name) itemSales[name] = (itemSales[name] || 0) + 1
  }
  const topSellers = Object.entries(itemSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, orders: count }))

  const lowStock = products
    .filter((p) => p.stock != null && Number(p.stock) <= 3)
    .slice(0, 10)
    .map((p) => ({ id: p.id, name: p.name, stock: Number(p.stock) }))

  // ---- Ledger aggregation ----
  const ledgerMillis = (l) => toMillis(l.date) || toMillis(l.createdAt) || 0
  const ledgerThisMonth = ledger.filter((l) => ledgerMillis(l) >= monthAgo)
  const ledgerRevenueMonth = ledgerThisMonth.reduce((s, l) => s + Number(l.amount || 0), 0)
  const ledgerPending = ledger.filter((l) => (l.status || '').toLowerCase() === 'pending').length

  // ---- Reviews aggregation (products & services carry avgRating + reviewCount) ----
  const rateable = [...products, ...services]
  const reviewCountTotal = rateable.reduce((s, p) => s + Number(p.reviewCount || 0), 0)
  const rated = rateable.filter((p) => Number(p.reviewCount || 0) > 0)
  const avgRatingOverall = rated.length
    ? Number((rated.reduce((s, p) => s + Number(p.avgRating || 0), 0) / rated.length).toFixed(2))
    : 0
  const topRated = [...rated]
    .sort((a, b) => Number(b.avgRating || 0) - Number(a.avgRating || 0))
    .slice(0, 6)
    .map((p) => ({ name: p.name, rating: Number(p.avgRating || 0), reviews: Number(p.reviewCount || 0) }))

  // ---- Analytics aggregation (store views / clicks / engagement) ----
  const analytics = analyticsDocs.reduce(
    (acc, d) => {
      acc.totalViews += Number(d.totalViews || 0)
      acc.totalClicks += Number(d.totalClicks || 0)
      acc.engagedViews += Number(d.engagedViews || 0)
      return acc
    },
    { totalViews: 0, totalClicks: 0, engagedViews: 0 },
  )
  analytics.engagementRate = analytics.totalViews > 0
    ? Math.round((analytics.engagedViews / analytics.totalViews) * 100)
    : 0

  return {
    // Store profile / plan / trust / integrations status — the "Settings / Business / CAC / Ads" tabs at a glance
    store: {
      businessName: store.businessName || store.storeName || 'the store',
      storeName: store.storeName || null,
      plan: store.plan || 'starter',
      planStatus: store.planStatus || 'active',
      vendorType: store.vendorType || 'products',
      email: store.email || null,
      whatsapp: store.whatsapp || store.phone || null,
      currency: 'NGN',
      cacVerified: !!store.cacVerified,
      cacBusinessName: store.cacBusinessName || null,
      customDomain: store.customDomain || null,
      googleAdsConnected: !!store.googleAdsConnected,
      payoutsVerified: !!store.payoutsVerified,
      pickupAddress: store.pickupAddress || null,
      deliveryZones: Array.isArray(store.deliveryZones)
        ? store.deliveryZones.map((z) => ({ name: z.name || z.city || z.state, fee: z.fee ?? z.price ?? null }))
        : [],
      themeId: store.themeId || store.theme || null,
    },
    counts: {
      products: products.length,
      services: services.length,
      orders: orders.length,
      bookings: bookings.length,
      customers: customers.length,
      discounts: discounts.length,
      ledgerEntries: ledger.length,
      leads: leads.length,
      categories: categories.length,
    },
    orders: {
      thisWeek: ordersThisWeek.length,
      thisMonth: ordersThisMonth.length,
      revenueAllTime: revenueAll,
      revenueAllTimeLabel: money(revenueAll),
      revenueThisMonth,
      revenueThisMonthLabel: money(revenueThisMonth),
      statusCounts,
      recent: recentOrders,
      topSellers,
    },
    bookings: {
      thisWeek: bookingsThisWeek.length,
      thisMonth: bookingsThisMonth.length,
      revenueAllTime: bookingRevenueAll,
      revenueAllTimeLabel: money(bookingRevenueAll),
      revenueThisMonth: bookingRevenueThisMonth,
      revenueThisMonthLabel: money(bookingRevenueThisMonth),
      statusCounts: bookingStatusCounts,
      recent: recentBookings,
      upcoming: upcomingBookings,
    },
    catalog: {
      categories: categories.map((c) => c.name).filter(Boolean),
      lowStock,
      sampleProducts: products.slice(0, 15).map((p) => ({
        id: p.id, name: p.name, price: Number(p.price || 0), stock: p.stock ?? null,
        category: p.category || null, visible: p.visible !== false,
      })),
      sampleServices: services.slice(0, 15).map((s) => ({
        id: s.id, name: s.name, price: Number(s.price || 0),
        category: s.category || null, visible: s.visible !== false,
      })),
    },
    ledger: {
      revenueThisMonth: ledgerRevenueMonth,
      revenueThisMonthLabel: money(ledgerRevenueMonth),
      pendingCount: ledgerPending,
      recent: [...ledger].sort((a, b) => ledgerMillis(b) - ledgerMillis(a)).slice(0, 8).map((l) => ({
        id: l.id, customer: l.customerName, item: l.itemName,
        amount: Number(l.amount || 0), status: l.status || 'Paid', date: l.date || null,
      })),
    },
    customers: {
      total: customers.length,
      top: [...customers]
        .sort((a, b) => Number(b.totalSpent || b.orderCount || 0) - Number(a.totalSpent || a.orderCount || 0))
        .slice(0, 8)
        .map((c) => ({ name: c.name || c.customerName || 'Unknown', phone: c.phone || c.id, orders: c.orderCount ?? null, spent: Number(c.totalSpent || 0) })),
    },
    discounts: discounts.map((d) => ({
      id: d.id, code: d.code, type: d.type, value: d.value,
      used: Number(d.usageCount || 0), limit: d.usageLimit ?? null, active: d.active !== false,
    })),
    leads: {
      total: leads.length,
      recent: [...leads].slice(0, 8).map((l) => ({ name: l.name || l.fullName, contact: l.phone || l.email || null })),
    },
    reviews: {
      totalReviews: reviewCountTotal,
      averageRating: avgRatingOverall,
      ratedItems: rated.length,
      topRated,
    },
    analytics: {
      storeViews: analytics.totalViews,
      linkClicks: analytics.totalClicks,
      engagedViews: analytics.engagedViews,
      engagementRate: analytics.engagementRate,
    },
    payouts: {
      // Sellapage settles gross paid-order revenue via Paystack subaccount; balance itself
      // is not stored in Firestore, so we surface the settlement setup + gross revenue.
      verified: !!store.payoutsVerified,
      bankName: store.payoutBankName || null,
      accountMasked: store.payoutAccountNumberMasked || null,
      subaccountConnected: !!store.subaccountCode,
      grossPaidRevenueAllTime: revenueAll,
      grossPaidRevenueAllTimeLabel: money(revenueAll),
    },
  }
}
