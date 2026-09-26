// tools/screenshots/data.js
//
// Sample data for the screenshot sandbox: one believable Lagos store.
//
// Invented on purpose. The screenshots go on the public homepage, and a real
// vendor's customers, phone numbers and sales figures have no business there.
// Everything is dated relative to today so the screenshots never look stale.
import { Timestamp } from './shims/firestore.js'

const DAY = 24 * 60 * 60 * 1000
const at = (daysAgo, hour = 11, min = 20) => {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(hour, min, 0, 0)
  return Timestamp.fromDate(d)
}
const lagosDay = (daysAgo) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date(Date.now() - daysAgo * DAY))

export const STORE = {
  id: 'demo',
  storeName: 'adaskincare',
  businessName: 'Ada Skincare',
  vendorType: 'products',
  plan: 'premium',
  planStatus: 'active',
  hasGrowthFeatures: true,
  hasProFeatures: true,
  hasPremiumFeatures: true,
  whatsappNumber: '2348031234567',
  loyaltyEnabled: true,
  abandonedRecoveryEnabled: true,
  loyaltyEarnRate: 100,
  pickupAddress: { streetAddress: '14 Admiralty Way, Lekki Phase 1', city: 'Lekki', state: 'Lagos' },
  deliveryZones: [
    { id: 'z1', name: 'Lekki & Ajah', state: 'Lagos', lga: 'Eti-Osa', price: 2500 },
    { id: 'z2', name: 'Victoria Island & Ikoyi', state: 'Lagos', lga: 'Lagos Island', price: 3000 },
    { id: 'z3', name: 'Yaba & Surulere', state: 'Lagos', lga: 'Lagos Mainland', price: 3500 },
    { id: 'z4', name: 'Ikeja & Maryland', state: 'Lagos', lga: 'Ikeja', price: 4000 },
    { id: 'z5', name: 'Abuja (interstate)', state: 'FCT', lga: 'Municipal', price: 7500 },
  ],
}

const customers = [
  ['c1', 'Chioma Okafor', '08031234501', 'chioma.okafor@gmail.com', 9, 187500, 2, 64],
  ['c2', 'Tunde Bakare', '08052234502', 'tunde.bakare@yahoo.com', 6, 124000, 5, 51],
  ['c3', 'Aisha Bello', '07063234503', 'aishab@gmail.com', 5, 98500, 1, 40],
  ['c4', 'Emeka Nwosu', '08094234504', 'emeka.nwosu@outlook.com', 4, 76000, 9, 33],
  ['c5', 'Funke Adeyemi', '08125234505', 'funke.ade@gmail.com', 3, 61500, 3, 28],
  ['c6', 'Ibrahim Musa', '09036234506', 'ibmusa@gmail.com', 3, 45000, 12, 26],
  ['c7', 'Ngozi Eze', '08147234507', 'ngozi.eze@gmail.com', 2, 38500, 4, 19],
  ['c8', 'Segun Ogunleye', '08038234508', 'segun.o@gmail.com', 2, 29000, 7, 15],
  ['c9', 'Blessing Udo', '07039234509', 'blessingudo@gmail.com', 1, 18500, 6, 6],
  ['c10', 'Kemi Alade', '08160234510', 'kemialade@yahoo.com', 1, 12500, 0, 0],
].map(([id, name, phone, email, orderCount, totalSpent, lastDays, firstDays]) => ({
  id, name, phone, email, orderCount, totalSpent,
  lastOrderDate: at(lastDays, 14), firstOrderDate: at(firstDays, 10),
  storeId: 'demo',
}))

const discounts = [
  { id: 'd1', code: 'DETTY25', type: 'percentage', value: 25, isActive: true, usageCount: 31, usageLimit: 50, expiryDate: at(-40), createdAt: at(12) },
  { id: 'd2', code: 'WELCOME2K', type: 'flat', value: 2000, isActive: true, usageCount: 58, usageLimit: null, expiryDate: null, createdAt: at(40) },
  { id: 'd3', code: 'GLOWFRIDAY', type: 'percentage', value: 15, isActive: true, usageCount: 12, usageLimit: 100, expiryDate: at(-3), createdAt: at(5) },
  { id: 'd4', code: 'SALLAH10', type: 'percentage', value: 10, isActive: false, usageCount: 44, usageLimit: 44, expiryDate: at(20), createdAt: at(70) },
]

const products = [
  ['p1', 'Vitamin C Brightening Serum', 18500, 'Serums', 14, 4.9],
  ['p2', 'Shea & Cocoa Body Butter', 9500, 'Body Care', 22, 4.8],
  ['p3', 'Niacinamide Oil Control Toner', 12000, 'Toners', 9, 4.7],
  ['p4', 'Black Soap Gentle Cleanser', 7500, 'Cleansers', 31, 4.9],
  ['p5', 'SPF 50 Daily Sunscreen', 15000, 'Sun Care', 17, 4.8],
  ['p6', 'Hyaluronic Hydrating Cream', 16500, 'Moisturisers', 6, 4.6],
].map(([id, name, price, category, reviewCount, rating]) => ({
  id, name, price, category, reviewCount, avgRating: rating,
  stock: 40, inStock: true, isActive: true, createdAt: at(60), clicks: reviewCount * 7,
}))
// Two products added this week, so the listings card has a trend to show.
products[4].createdAt = at(2)
products[5].createdAt = at(5)

const reviewText = [
  ['Chioma Okafor', 5, 'My dark spots are fading after three weeks. Delivery to Lekki came the next morning.'],
  ['Aisha Bello', 5, 'Original product, well packaged, and she answered my WhatsApp questions quickly.'],
  ['Tunde Bakare', 4, 'Bought it for my wife and she loves it. Would like a bigger size.'],
  ['Ngozi Eze', 5, 'Third time ordering. Checkout was fast and I got my points.'],
]
const reviewsFor = (seed) =>
  reviewText.map(([customerName, rating, text], i) => ({
    id: `${seed}-r${i}`, customerName, rating, reviewText: text, createdAt: at(i * 3 + seed.length),
  }))

// Orders spread over the last 30 days, busier at weekends, for the sales
// counts on the analytics screen.
const orders = []
for (let d = 0; d < 30; d++) {
  const weekday = new Date(Date.now() - d * DAY).getDay()
  const n = weekday === 0 || weekday === 6 ? 5 : 2 + (d % 3)
  for (let i = 0; i < n; i++) {
    const p = products[(d + i) % products.length]
    const qty = 1 + ((d + i) % 2)
    orders.push({
      id: `o${d}-${i}`, status: d < 2 ? 'pending' : 'delivered', grandTotal: 9500 + ((d * 7 + i * 13) % 6) * 3000, createdAt: at(d, 9 + i * 2),
      orderType: 'checkout', paymentStatus: 'paid', customerName: customers[(d + i) % customers.length].name,
      cartItems: [{ id: p.id, name: p.name, quantity: qty, price: p.price }],
    })
  }
}

// Store views per day, climbing gently, with weekend peaks.
const analyticsDaily = []
for (let d = 0; d < 30; d++) {
  const weekday = new Date(Date.now() - d * DAY).getDay()
  const base = 160 - d * 2 + (weekday === 0 || weekday === 6 ? 70 : 0)
  analyticsDaily.push({
    id: lagosDay(d), date: lagosDay(d),
    views: base, productClicks: Math.round(base * 0.42), serviceClicks: 0,
    bookingRequests: 0, engagedSessions: Math.round(base * 0.31),
  })
}

export const DATA = {
  'stores/demo/customers': customers,
  'stores/demo/discounts': discounts,
  'stores/demo/products': products,
  'stores/demo/services': [],
  'stores/demo/orders': orders,
  'stores/demo/bookings': [],
  'stores/demo/analyticsDaily': analyticsDaily,
  leads: [
    ['l1', 'Tolu Adebayo', '+234 801 234 5671', 0.2],
    ['l2', 'Grace Okon', '+234 803 555 0192', 1.5],
    ['l3', 'Yusuf Danladi', '+234 706 118 4420', 4],
    ['l4', 'Ifeoma Obi', '+234 812 990 3345', 9],
  ].map(([id, name, phone, daysAgo]) => ({ id, name, phone, storeId: 'demo', createdAt: at(daysAgo, 10) })),
  'stores/demo/categories': [],
  ...Object.fromEntries(products.map((p) => [`stores/demo/products/${p.id}/reviews`, reviewsFor(p.id)])),
  stores: [STORE],
  __docs: { 'stores/demo': STORE },
}

// What the sandbox's fake /api answers, in the exact shapes the real
// handlers return (abandoned-checkout-vendor.js, loyalty-vendor.js).
const abandoned = [
  ['Damilola Ade', 'Vitamin C Brightening Serum x1, SPF 50 Daily Sunscreen x1', 2, 33500, false, true, 0.2],
  ['Oluchi Nnamdi', 'Shea & Cocoa Body Butter x2', 2, 19000, true, true, 1],
  ['Yusuf Garba', 'Black Soap Gentle Cleanser x1', 1, 7500, false, false, 1.4],
  ['Temi Balogun', 'Hyaluronic Hydrating Cream x1, Niacinamide Oil Control Toner x1', 2, 28500, true, true, 2],
  ['Ifeoma Obi', 'Vitamin C Brightening Serum x2', 2, 37000, false, true, 3],
  ['Kunle Ajayi', 'SPF 50 Daily Sunscreen x1', 1, 15000, false, false, 4],
].map(([customerName, itemSummary, itemCount, grandTotal, recovered, reminderSent, daysAgo], i) => ({
  reference: `ref${i}`, customerName, customerEmail: `${customerName.split(' ')[0].toLowerCase()}@gmail.com`,
  customerPhone: `0803${String(4400100 + i * 311)}`, itemSummary, itemCount, grandTotal, kind: 'product',
  recovered, reminderSent, whatsappClickedAt: null,
  createdAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
  recoveredAt: recovered ? new Date(Date.now() - (daysAgo - 0.1) * DAY).toISOString() : null,
}))

const loyalty = [
  ['Chioma Okafor', 1875, 3200, 1325, 2], ['Tunde Bakare', 1240, 1240, 0, 5],
  ['Aisha Bello', 985, 1485, 500, 1], ['Emeka Nwosu', 760, 760, 0, 9],
  ['Funke Adeyemi', 615, 1115, 500, 3], ['Ibrahim Musa', 450, 450, 0, 12],
  ['Ngozi Eze', 385, 885, 500, 4], ['Segun Ogunleye', 290, 290, 0, 7],
].map(([customerName, points, lifetimeEarned, lifetimeRedeemed, daysAgo], i) => ({
  code: `ADA-${String(4821 + i * 137).slice(0, 4)}-${['KX', 'PL', 'QM', 'TR', 'VN', 'WB', 'YD', 'ZH'][i]}`,
  customerName, customerEmail: `${customerName.split(' ')[0].toLowerCase()}@gmail.com`,
  customerPhone: '', points, lifetimeEarned, lifetimeRedeemed, frozen: false,
  lastActivity: new Date(Date.now() - daysAgo * DAY).toISOString(),
}))

const sum = (arr, k) => arr.reduce((n, x) => n + x[k], 0)

export const API = {
  '/api/abandoned-checkout-vendor': {
    success: true, checkouts: abandoned, total: abandoned.length, page: 1, totalPages: 1,
    summary: {
      abandoned: abandoned.length,
      recovered: abandoned.filter((c) => c.recovered).length,
      recoveredValue: abandoned.filter((c) => c.recovered).reduce((n, c) => n + c.grandTotal, 0),
      lostValue: abandoned.filter((c) => !c.recovered).reduce((n, c) => n + c.grandTotal, 0),
    },
  },
  '/api/loyalty-vendor': {
    success: true, config: { earnRate: 100, redeemValue: 1, minRedeem: 100 },
    cards: loyalty, total: loyalty.length, page: 1, totalPages: 1,
    totals: {
      outstanding: sum(loyalty, 'points'), earned: sum(loyalty, 'lifetimeEarned'),
      redeemed: sum(loyalty, 'lifetimeRedeemed'), outstandingValue: sum(loyalty, 'points'),
    },
  },
  '/api/public-config': { storefrontGate: false, storefrontEmailGate: false },
}
