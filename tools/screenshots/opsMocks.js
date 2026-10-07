// tools/screenshots/opsMocks.js
//
// Sample answers for the Ops console's tab screens (Phase 3), so each one can
// be previewed in the sandbox. Shapes copy the real handlers in
// src/api-handlers. A function returning undefined falls back to data.js.
const H = 3600e3
const D = 24 * H
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const pick = (arr, i) => arr[i % arr.length]

const STORES = ['Bisi Bakes', 'Chioma Fabrics', 'Glow Beauty NG', 'Mama Put Kitchen', 'TechPro Gadgets', 'Kiddies Corner', 'Wig World Lagos', 'Fit Fam Gym', 'Ada Skincare', 'Okafor Prints', 'Zee Hair', 'Naija Naturals']
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '')
const PLANS = ['starter', 'growth', 'pro', 'premium']

function page(rows, url, per = 20) {
  const p = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const l = Number(url.searchParams.get('limit')) || per
  return { rows: rows.slice((p - 1) * l, p * l), page: p, limit: l, total: rows.length }
}

const tickets = Array.from({ length: 27 }, (_, i) => ({
  id: `t${i}`, storeId: `s${i}`, storeName: slug(pick(STORES, i)), businessName: pick(STORES, i),
  email: `${slug(pick(STORES, i))}@gmail.com`, whatsappNumber: `0803${String(1000000 + i * 7919).slice(0, 7)}`,
  plan: pick(PLANS, i * 3), category: pick(['payments', 'delivery', 'account', 'general', 'bug'], i),
  message: pick([
    'My Paystack payout has not landed since Friday. The dashboard says paid but my bank shows nothing.',
    'How do I add delivery to Abuja? The rates page only shows Lagos.',
    'I changed my store link and now my old Instagram link shows page not found. Can you redirect it?',
    'The product photo upload keeps spinning on my phone. I have tried three times.',
    'Please how do I connect my own domain? I bought bisibakes.com.ng on Whogohost.',
  ], i),
  status: i < 9 ? 'open' : i < 15 ? 'in_progress' : 'resolved',
  createdAt: ago(i * 5 * H + 20 * 60e3),
  replies: i === 10 ? [{ at: ago(2 * H), byName: 'Deola Benedict', message: 'Hello, we are checking with Paystack now. You will hear from us before 5pm.', channel: 'email' }] : [],
}))

const recovery = [
  { id: 'r1', storeId: 's1', storeName: 'bisibakes', businessName: 'Bisi Bakes', currentEmailMasked: 'bi***@gm***.com', contactEmail: 'bisi.adeyemi@yahoo.com', contactPhone: '08031234567', reason: 'I lost access to my old Gmail after my phone was stolen. I still have my WhatsApp number on the store and can send my CAC certificate.', status: 'pending', cacVerified: true, plan: 'pro', requestIp: '102.89.34.10', createdAtMs: Date.now() - 2 * H },
  { id: 'r2', storeId: '', storeName: '', businessName: '', submittedIdentifier: 'chiomafabric', contactEmail: 'chioma.ok@gmail.com', contactPhone: '08099887766', reason: 'Cannot log in, it says too many attempts.', status: 'no_match', plan: '', requestIp: '197.210.54.3', createdAtMs: Date.now() - 6 * H },
  { id: 'r3', storeId: 's3', storeName: 'glowbeauty', businessName: 'Glow Beauty NG', currentEmailMasked: 'gl***@ou***.com', contactEmail: 'glowbeautyng@gmail.com', contactPhone: '08123456789', reason: 'Locked myself out after typing the wrong password.', status: 'pending', cacVerified: false, plan: 'starter', requestIp: '105.112.20.8', createdAtMs: Date.now() - 26 * H },
]
const withdrawals = [
  { id: 'w1', userId: 's1', storeName: 'Bisi Bakes', amount: 1500000, bankName: 'GTBank', bankAccount: '0123456789', bankAccountName: 'ADEYEMI BISOLA', status: 'pending', createdAt: ago(3 * H) },
  { id: 'w2', userId: 's2', storeName: 'Chioma Fabrics', amount: 650000, bankName: 'Opay', bankAccount: '8031234567', bankAccountName: 'OKAFOR CHIOMA', status: 'pending', createdAt: ago(28 * H) },
  { id: 'w3', userId: 's3', storeName: 'TechPro Gadgets', amount: 2000000, bankName: 'Access Bank', bankAccount: '0691234567', bankAccountName: 'TECHPRO GADGETS LTD', status: 'completed', createdAt: ago(5 * D), paidAt: { _seconds: Math.round((Date.now() - 4 * D) / 1000) }, emailSent: true },
  { id: 'w4', userId: 's4', storeName: 'Wig World Lagos', amount: 500000, bankName: 'Kuda', bankAccount: '2001234567', bankAccountName: 'BELLO TUNDE', status: 'rejected', note: 'The account name does not match the store owner.', createdAt: ago(9 * D) },
]
const directory = Array.from({ length: 41 }, (_, i) => ({
  id: `s${i}`, storeName: slug(pick(STORES, i)) + (i > 11 ? i : ''), handle: slug(pick(STORES, i)) + (i > 11 ? i : ''), businessName: pick(STORES, i),
  ownerEmail: `${slug(pick(STORES, i))}@gmail.com`, whatsappNumber: `0803${String(1000000 + i * 7919).slice(0, 7)}`,
  plan: pick(PLANS, i * 5), isPlanExpired: i === 4, createdAt: ago(i * 2 * D + 3 * H), planStartDate: i % 3 ? ago(30 * D) : null, planEndDate: i % 3 ? new Date(Date.now() + (i - 10) * D).toISOString() : null,
  leadCount: (i * 7) % 23, listings: { products: (i * 3) % 17, services: i % 4 === 0 ? 2 : 0, total: ((i * 3) % 17) + (i % 4 === 0 ? 2 : 0) },
  subaccountCode: i % 2 ? `ACCT_${i}` : null, payoutsVerified: i % 4 === 1, payoutBankName: 'GTBank', payoutAccountNumberMasked: '******4567',
  referredBy: i % 5 === 0 ? 'sX' : null, referredByStoreName: i % 5 === 0 ? 'Ada Skincare' : null, referredByReferralCode: i % 5 === 0 ? 'ADA20' : null, cacVerified: i % 6 === 0,
  online: i % 7 === 1, lastActiveAt: i % 9 === 8 ? null : Date.now() - (i % 7 === 1 ? 30e3 : i * 5 * H), paidNow: i % 5 !== 0, heardAboutSource: pick(['google', 'social', 'ai', 'word_of_mouth', ''], i),
}))

// One merchant, everything (admin-health ?action=merchant).
function merchantMock(id) {
  const i = Number(String(id).replace(/\D/g, '')) || 0
  const name = pick(STORES, i)
  const now = Date.now()
  const days = Array.from({ length: 90 }, (_, k) => ({ date: dayKey(89 - k), views: Math.round(30 + 22 * Math.abs(Math.sin(k / 5)) + k / 3), productClicks: Math.round(8 + 6 * Math.abs(Math.cos(k / 4))), serviceClicks: k % 3 === 0 ? 2 : 0, bookingRequests: k % 6 === 0 ? 1 : 0, engaged: 9 }))
  const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
  const orders = Array.from({ length: 34 }, (_, k) => ({ id: `o${k}x9a2b`, at: now - k * 2.3 * D, customer: pick(['Tunde Bello', 'Amaka Obi', 'Kemi Ade', 'Musa Garba', 'Ifeoma Eze'], k), amount: [12500, 8000, 45000, 6500, 23000][k % 5], status: pick(['delivered', 'confirmed', 'pending', 'dispatched', 'cancelled'], k), paid: k % 7 !== 3, delivery: k % 4 === 0 }))
  const bookings = Array.from({ length: 6 }, (_, k) => ({ id: `b${k}`, at: now - k * 9 * D, customer: pick(['Ngozi', 'Femi'], k), service: 'Bridal makeup', when: '2026-10-12 10:00', amount: 35000, status: pick(['confirmed', 'completed'], k), paid: true }))
  const leads = Array.from({ length: 13 }, (_, k) => ({ id: `l${k}`, at: now - k * 4 * D, type: 'whatsapp', interest: pick(['Do you deliver to Abuja?', 'Price for 3 pieces?', 'Is the blue one in stock?'], k) }))
  const billing = [
    { id: 'plan-1', kind: 'plan', at: now - 6 * D, amount: 15000, label: 'Pro plan, monthly', detail: 'Renewal · runs to 2026-11-01', ref: 'T8823910021' },
    { id: 'credits-1', kind: 'credits', at: now - 11 * D, amount: 19350, label: 'Sella credits: Plus (1,000 credits)', detail: '₦18,000 + ₦1,350 VAT', ref: 'SELLA-S1-MG2K-3F9A1C' },
    ...Array.from({ length: 9 }, (_, k) => ({ id: `delivery-${k}`, kind: 'delivery', at: now - (k * 3 + 1) * D, amount: 250, label: 'Delivery booking service charge', detail: `Sendbox · order o${k * 4}x9a2b` })),
    { id: 'plan-0', kind: 'plan', at: now - 36 * D, amount: 15000, label: 'Pro plan, monthly', detail: 'Plan change · runs to 2026-10-02', ref: 'T8711022001' },
    { id: 'plan-00', kind: 'plan', at: now - 70 * D, amount: 5000, label: 'Growth plan, monthly', detail: 'First payment · runs to 2026-08-29', ref: 'T8600311029' },
  ].sort((a, b) => b.at - a.at)
  const totals = billing.reduce((a, x) => { a[x.kind] += x.amount; a.all += x.amount; return a }, { all: 0, plan: 0, credits: 0, delivery: 0 })
  const sessions = [
    { id: 'se1', device: 'Chrome on Android', deviceType: 'Mobile', place: 'Ikeja, Nigeria', who: 'Vendor', staff: false, createdAt: now - 3 * H, lastActiveAt: now - 40e3, revoked: false },
    { id: 'se2', device: 'Chrome on Windows', deviceType: 'Desktop', place: 'Lagos, Nigeria', who: 'Staff: Kemi', staff: true, createdAt: now - 2 * D, lastActiveAt: now - 20 * H, revoked: false },
    { id: 'se3', device: 'Safari on iOS', deviceType: 'Mobile', place: 'Abuja, Nigeria', who: 'Vendor', staff: false, createdAt: now - 12 * D, lastActiveAt: now - 10 * D, revoked: true },
  ]
  const referred = Array.from({ length: 11 }, (_, k) => ({ id: `rf${k}`, name: pick(STORES, k + 3), slug: slug(pick(STORES, k + 3)), plan: pick(['starter', 'growth', 'pro'], k), paying: k % 3 !== 0, joinedAt: now - k * 6 * D }))
  const timeline = [
    ...billing.map((x) => ({ at: x.at, kind: x.kind, text: x.label, amount: x.amount })),
    ...orders.slice(0, 20).map((x) => ({ at: x.at, kind: 'order', text: `Order from ${x.customer}`, amount: x.amount, paid: x.paid })),
    ...leads.map((x) => ({ at: x.at, kind: 'lead', text: `Enquiry: ${x.interest}` })),
    ...sessions.map((x) => ({ at: x.createdAt, kind: 'signin', text: `${x.staff ? x.who : 'Signed in'} on ${x.device}, ${x.place}` })),
    { at: now - 120 * D, kind: 'joined', text: 'Created their store' },
  ].sort((a, b) => b.at - a.at)
  return {
    success: true, builtAt: now,
    store: { id, name, slug: slug(name), ownerName: 'Bisola Adeyemi', email: `${slug(name)}@gmail.com`, phone: '08031234567', phoneVerified: true, category: 'Food and drinks', vendorType: 'products', description: 'Fresh cakes, small chops and pastries in Ikeja. Same-day delivery across Lagos mainland.', logoUrl: '', customDomain: i % 2 ? '' : `${slug(name)}.com.ng`, createdAt: now - 120 * D, plan: 'pro', paidNow: true, planStatus: 'active', billingPeriod: 'monthly', planStartDate: now - 6 * D, planEndDate: now + 24 * D, planEnded: false, cacVerified: true, isActive: true, subaccountCode: 'ACCT_1', payoutBankName: 'GTBank', payoutAccountNumberMasked: '******4567', payoutsVerified: false, listings: { products: 24, services: 2 }, staff: 1 },
    presence: { online: i % 7 === 1 || i === 0, onlineDevices: 1, lastActiveAt: now - 40e3, lastSignInAt: now - 3 * H, accountCreatedAt: now - 120 * D, accountDisabled: false, emailVerified: true, sessions, devices: 3 },
    traffic: { allTime: { views: 18240, productClicks: 4120, serviceClicks: 210, clicks: 4330, bookingRequests: 38, engaged: 2900 }, last30: { views: 1460, productClicks: 330, serviceClicks: 20, bookingRequests: 5 }, days },
    sales: { orders: { count: 34, paid: 29, value: 512000, last30: 13, last30Value: 186000, firstAt: now - 80 * D, lastAt: now - 4 * H }, bookings: { count: 6, paid: 6, value: 210000, last30: 3, last30Value: 105000, firstAt: now - 50 * D, lastAt: now - D }, leads: { count: 13, last30: 7, lastAt: now - D },
      byMonth: months.map((m, k) => ({ month: m, orders: k + 1, ordersValue: k * 18000 + 6000, bookings: k % 3, bookingsValue: (k % 3) * 35000, leads: k })) },
    recent: { orders, bookings, leads },
    billing: { items: billing, totals },
    sella: { thisMonth: { month: '2026-10', used: 412.5, requests: 96, costUsd: 2.95, byKind: { chat: 220, deep: 110, image: 60, voice: 22.5 } }, allTime: { used: 2810, requests: 640, costUsd: 20.1 }, months: months.slice(-6).map((m, k) => ({ month: m, used: 300 + k * 60, requests: 70 + k * 9, costUsd: 2 + k * 0.4, byKind: {} })), topupLeft: 650 },
    referral: { code: 'BISI25', referredBy: i % 2 ? null : { id: 'sX', name: 'Ada Skincare', slug: 'adaskincare', code: 'ADA20', plan: 'premium' }, heardAbout: { source: 'social', detail: 'Instagram' }, referred, referredPaying: referred.filter((x) => x.paying).length, earned: 450000, available: 150000 },
    timeline,
  }
}

// Images are drawn locally (data URIs), so previews never go online.
const IMG = (seed) => {
  const hue = [...String(seed)].reduce((n, c) => n + c.charCodeAt(0), 0) % 360
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},55%,62%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360},60%,38%)'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><circle cx='300' cy='80' r='60' fill='rgba(255,255,255,0.25)'/><rect x='40' y='190' width='220' height='22' rx='11' fill='rgba(255,255,255,0.5)'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
const cacStores = Array.from({ length: 18 }, (_, i) => ({
  id: `c${i}`, storeName: slug(pick(STORES, i)), handle: slug(pick(STORES, i)), businessName: pick(STORES, i), plan: pick(PLANS, i * 2),
  cacStatus: i < 3 ? 'not_submitted' : i < 9 ? 'active' : i === 9 ? 'rejected' : i === 10 ? 'pending' : 'not_submitted',
  cacVerified: i >= 3 && i < 9, cacManual: i === 4, cacRetryCount: i < 3 ? 3 : i === 11 ? 1 : i === 12 ? 2 : 0, cacLastRetryAt: i < 3 || i === 11 || i === 12 ? ago(i * 7 * H + H) : null,
  cacBusinessName: i >= 3 && i < 9 ? `${pick(STORES, i).toUpperCase()} ENTERPRISES` : '', cacRcNumber: i >= 3 && i < 9 ? String(1234567 + i) : '',
  cacVerifiedAt: i >= 3 && i < 9 ? ago(i * D) : null, cacRejectionReason: i === 9 ? 'The business name does not match the store owner.' : '',
  email: `${slug(pick(STORES, i))}@gmail.com`, whatsappNumber: '08031234567',
}))
const reports = Array.from({ length: 14 }, (_, i) => ({
  id: `rp${i}`, storeUrl: `sellapage.com.ng/${slug(pick(STORES, i + 3))}`, reporterName: pick(['Ngozi Eze', 'Tunde Bello', 'Amaka Obi', 'Femi Ojo'], i), reporterEmail: 'customer@gmail.com', reporterPhone: '08099887766',
  whereMet: pick(['instagram', 'whatsapp', 'tiktok', 'sellapage_explore'], i), offenseType: pick(['scam', 'non_delivery', 'fake_products', 'scam', 'counterfeit', 'other'], i),
  description: pick(['I paid N45,000 for a phone on 2 October. After payment the seller blocked me on WhatsApp and the store still shows the same phone.', 'The hair I got is not what was in the picture and they refuse to refund.', 'Ordered two weeks ago, no delivery and no reply.'], i),
  screenshotUrls: i % 3 === 2 ? [] : [IMG(`ev${i}a`), IMG(`ev${i}b`), ...(i % 2 ? [IMG(`ev${i}c`), IMG(`ev${i}d`)] : [])],
  status: i < 6 ? 'pending' : i < 9 ? 'reviewed' : i < 12 ? 'resolved' : 'dismissed', adminNotes: i === 6 ? 'Called the store, they say the order shipped. Waiting for tracking.' : '', createdAt: ago(i * 11 * H),
}))
const jobs = Array.from({ length: 11 }, (_, i) => ({
  id: `j${i}`, storeId: `s${i}`, businessName: pick(STORES, i), storeSlug: slug(pick(STORES, i)), title: pick(['Sales Assistant (Lekki shop)', 'Delivery rider with own bike', 'Social media manager, part time', 'Hair stylist', 'Cook for small restaurant'], i),
  pay: pick(['N60,000 / month', 'N3,000 per delivery', 'N80,000 / month', 'Commission'], i), location: pick(['Lekki, Lagos', 'Ikeja, Lagos', 'Wuse, Abuja', 'Remote'], i), jobType: pick(['full_time', 'part_time', 'contract'], i), category: pick(['sales', 'logistics', 'marketing'], i),
  availabilityTimeline: 'Immediately', mustHaves: 'Smartphone\nCan speak Yoruba and English\nLives within 5km', description: 'You will attend to walk-in customers, take WhatsApp orders and keep the shelves neat.', imageUrl: i % 3 === 0 ? IMG(`job${i}`) : '',
  status: i < 4 ? 'pending' : i < 9 ? 'approved' : 'rejected', rejectionReason: i >= 9 ? 'Please add the pay.' : '', createdAt: ago(i * 13 * H),
}))
const reviews = Array.from({ length: 16 }, (_, i) => ({
  id: `rv${i}`, authorName: pick(['Ada Okafor', 'Bisi Ade', 'Kunle Ojo', 'Zainab Musa', 'Chidi Eze'], i), storeName: pick(STORES, i), rating: 5 - (i % 3 === 2 ? 1 : 0),
  reviewText: pick(['Sellapage changed how I sell. My customers now pay with a link instead of sending screenshots.', 'I set up my store in one evening. The delivery booking alone saves me two hours a day.', 'Best decision for my small business this year. Support answered me on a Sunday!'], i),
  images: i % 4 === 0 ? [IMG(`rv${i}`)] : [], videos: i === 5 ? ['https://res.cloudinary.com/demo/video/upload/sample.mp4'] : [],
  status: i < 5 ? 'pending' : i < 13 ? 'approved' : 'rejected', featured: i === 6 || i === 8, createdAt: ago(i * 17 * H),
}))
const domains = [
  ['bisibakes.com.ng', 'verified'], ['glowbeauty.ng', 'verified'], ['shop.techpro.ng', 'pending'], ['wigworldlagos.com', 'failed'], ['adaskincare.com', 'verified'], ['naijanaturals.store', 'pending'],
].map(([d, st], i) => ({ id: `d${i}`, storeName: slug(pick(STORES, i)), handle: slug(pick(STORES, i)), customDomain: d, domainStatus: st, domainVerifiedAt: st === 'verified' ? ago((i + 3) * D) : null }))

const referrers = Array.from({ length: 13 }, (_, i) => {
  const n = Math.max(1, 12 - i)
  const referredVendors = Array.from({ length: n }, (__, k) => ({ storeId: `rv${i}_${k}`, storeName: pick(STORES, i + k + 5), slug: slug(pick(STORES, i + k + 5)), plan: k % 3 === 0 ? 'starter' : pick(['growth', 'pro', 'premium'], k + i), paying: k % 3 !== 0, everPaid: k % 3 !== 0 || k === 3, rewardAmount: k % 3 === 0 ? 0 : pick([50000, 100000, 200000], k), createdAt: Date.now() - (k + 1) * 6 * D }))
  const paying = referredVendors.filter((v) => v.paying).length
  return { referrerId: `ref${i}`, storeName: pick(STORES, i + 2), slug: slug(pick(STORES, i + 2)), referralCode: `${slug(pick(STORES, i + 2)).slice(0, 4).toUpperCase()}${10 + i}`, email: `${slug(pick(STORES, i + 2))}@gmail.com`, whatsappNumber: '08031234567',
    totalReferrals: n, paying, free: n - paying, totalEarned: paying * 100000, availableBalance: (i % 3) * 150000, pendingPayoutAmount: i === 1 ? 650000 : 0, paidOutAmount: paying * 50000, lastReferralAt: Date.now() - i * D, referredVendors }
})
const dayKey = (n) => new Date(Date.now() - n * D).toISOString().slice(0, 10)
const sigDays = Array.from({ length: 90 }, (_, i) => ({ date: dayKey(89 - i), count: Math.max(0, Math.round(2 + 1.8 * Math.sin(i / 4) + (i % 7 === 0 ? 3 : 0) + i / 30)) }))
const sigMonths = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((m, i) => ({ month: m, count: 4 + i * 3 + (i % 3) * 2 }))
const trials = [
  { storeId: 't1', storeName: 'bisibakes', businessName: 'Bisi Bakes', status: 'active', trialPlan: 'premium', currentPlan: 'premium', days: 14, daysLeft: 9, startedAt: ago(5 * D), endsAt: new Date(Date.now() + 9 * D).toISOString(), grantedAt: ago(5 * D), note: 'Won the Instagram giveaway', returnsTo: 'starter' },
  { storeId: 't2', storeName: 'glowbeautyng', businessName: 'Glow Beauty NG', status: 'active', trialPlan: 'pro', currentPlan: 'pro', days: 30, daysLeft: 2, startedAt: ago(28 * D), endsAt: new Date(Date.now() + 2 * D).toISOString(), grantedAt: ago(28 * D), returnsTo: 'growth' },
  { storeId: 't3', storeName: 'okaforprints', businessName: 'Okafor Prints', status: 'paused', trialPlan: 'growth', currentPlan: 'starter', days: 30, daysLeft: 18, grantedAt: ago(15 * D), pausedReason: 'Asked to pause while travelling', returnsTo: 'starter' },
  { storeId: 't4', storeName: 'fitfamgym', businessName: 'Fit Fam Gym', status: 'ended', trialPlan: 'premium', currentPlan: 'starter', days: 7, daysLeft: 0, grantedAt: ago(40 * D), endedAt: ago(33 * D), returnsTo: 'starter' },
]

const subscribers = Array.from({ length: 46 }, (_, i) => ({ id: `n${i}`, email: `${pick(['ada', 'tunde', 'ngozi', 'femi', 'zainab', 'chidi'], i)}.${i}@gmail.com`, source: pick(['footer', 'blog', 'partners', 'landing'], i), status: 'subscribed', createdAt: ago(i * 19 * H) }))
const enquiries = Array.from({ length: 9 }, (_, i) => ({
  id: `e${i}`, interest: pick(['investor', 'strategic', 'partner', 'cofounder'], i), fullName: pick(['Kemi Adebayo', 'John Mensah', 'Amina Yusuf', 'David Okoro', 'Sarah Lee'], i), email: 'investor@fund.com', phone: '08031234567',
  organisation: pick(['Lagos Angel Network', 'Kuda Ventures', '', 'Paystack Alumni Fund'], i), investorType: i % 2 ? 'angel' : '', ticketSize: '', link: 'https://linkedin.com/in/someone', source: '',
  message: 'We back early commerce tools for SMEs in West Africa and would love to learn about your traction and plans for 2027.', status: pick(['new', 'contacted', 'in_talks', 'new', 'closed', 'not_a_fit'], i), adminNotes: i === 2 ? 'Call booked for Friday 10am.' : '', createdAt: ago(i * 2 * D),
}))
const announcements = [
  { id: 'a1', title: 'Join the Sellapage vendors community', message: 'Tips, wins and early news every week on WhatsApp.', type: 'promo', displayMode: 'modal', ctaLabel: 'Join Community', ctaUrl: 'https://chat.whatsapp.com/x', active: true, createdAt: ago(2 * D) },
  { id: 'a2', title: 'Delivery to Abuja is live', message: 'Book Abuja deliveries from your Delivery tab.', type: 'info', displayMode: 'banner', ctaLabel: '', ctaUrl: '', active: false, createdAt: ago(9 * D) },
]
const broadcasts = [
  { id: 'b1', title: 'Your store got 3 new enquiries this week', body: 'Open your dashboard to reply before they go cold.', sentAt: ago(26 * H), audience: 412, sent: 398, failed: 14, filters: {}, target: '/dashboard' },
  { id: 'b2', title: 'Pro is 20% off this weekend', body: 'Upgrade before Sunday midnight.', sentAt: ago(6 * D), audience: 380, sent: 371, failed: 9, filters: { plan: ['starter', 'growth'] } },
]

const posts = Array.from({ length: 7 }, (_, i) => ({
  id: `p${i}`, title: pick(['How to take product photos with your phone', 'Five ways to get your first 10 customers', 'Paystack payouts, explained', 'Selling on WhatsApp without the chaos', 'Pricing your services in Naira'], i),
  slug: `post-${i}`, category: pick(['Guides', 'Growth', 'Payments'], i), status: pick(['published', 'published', 'draft', 'scheduled', 'published'], i), commentCount: (i * 3) % 7, commentsEnabled: i !== 2,
  featuredImageUrl: i % 3 === 1 ? '' : IMG(`post${i}`), publishedAt: ago(i * 4 * D), updatedAt: ago(i * D + H),
}))
const suppliers = [
  { storeId: 'sp1', name: 'Naija Naturals', storeName: 'naijanaturals', email: 'hello@naijanaturals.ng', phone: '08031234567', plan: 'pro', status: 'pending', videoUrl: '', notes: 'We make shea butter and black soap in Kano and ship nationwide in 2 days.', checks: { plan: true, payout: true, cac: true, phone: true, pickup: false }, appliedAt: ago(3 * D), termsVersion: 2, terms: { version: 2, summary: ['Ships within 2 working days', 'Returns accepted within 7 days if unused', 'Minimum resale price: cost plus 15%'], extraTerms: '' }, agreementVersion: 1, agreementCurrent: 1, limits: null },
  { storeId: 'sp2', name: 'TechPro Gadgets', storeName: 'techprogadgets', email: 'sales@techpro.ng', phone: '08099887766', plan: 'premium', status: 'pending', videoUrl: '', notes: '', checks: { plan: true, payout: true, cac: false, phone: true, pickup: true }, appliedAt: ago(1 * D), termsVersion: 0, terms: null, agreementVersion: 0, agreementCurrent: 1, limits: null },
]

export const OPS_MOCKS = {
  // Sign-in: 000000 = the attempt took too long; 111111 = set-up done (recovery codes).
  '/api/ops-auth': (url, body) => {
    const action = url.searchParams.get('action')
    if (action === 'verify' && body.code === '000000') return { success: false, error: 'expired', message: 'This sign-in took too long. Start again.' }
    if (action === 'verify' && body.code === '111111') return { success: true, customToken: 'demo', session: 'x.y', expiresAt: Date.now() + 3600e3, idleMs: 1800e3, recoveryCodes: ['ab3d-ef7h', 'k2mn-pq4r', 'st5v-wx6z', 'a7cd-e2gh', 'jk3m-n4pq', 'rs6t-uv7w', 'xy2a-bc3d', 'ef4g-hi5j'] }
    if (action === 'verify') return { success: false, error: 'wrong_code', message: 'That code is not right. 4 attempts left.' }
    if (action === 'recovery-codes') return { success: true, recoveryLeft: 8, recoveryCodes: ['mn2p-qr3s', 'tu4v-wx5y', 'za6b-cd7e', 'fg2h-ij3k', 'lm4n-op5q', 'rs6t-uv7w', 'xy2z-ab3c', 'de4f-gh5i'] }
    return undefined
  },
  '/api/blog-admin': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'list-categories') return { success: true, categories: [{ id: 'guides', name: 'Guides' }, { id: 'growth', name: 'Growth' }, { id: 'payments', name: 'Payments' }] }
    if (action === 'list-comments') return { success: true, comments: [{ id: 'c1', body: 'This helped me a lot, thank you!', authorName: 'Ada', isAnonymous: false, createdAt: ago(3 * H) }] }
    const st = url.searchParams.get('status') || 'all'
    return { success: true, posts: st === 'all' ? posts : posts.filter((p) => p.status === st), stats: { total: posts.length, draft: 1, scheduled: 1, published: 5 } }
  },
  '/api/admin-marketplace': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'suppliers') return { success: true, suppliers, total: suppliers.length }
    if (action === 'access') return { success: true, stage: 'testing', lockedByEnv: false, canSetStage: true, testers: [{ storeId: 't1', name: 'Bisi Bakes', storeName: 'bisibakes', email: 'bisi@gmail.com', plan: 'pro' }] }
    if (action === 'waitlist') return { success: true, total: 12, page: 1, limit: 20, counts: { all: 12, supply: 7, dropship: 8, stores: 9, page: 3, supplierReady: 2 }, items: Array.from({ length: 12 }, (_, i) => ({ id: i < 9 ? `store:w${i}` : `page:w${i}`, kind: i < 9 ? 'store' : 'page', storeId: `w${i}`, name: pick(STORES, i), storeName: slug(pick(STORES, i)), email: `${slug(pick(STORES, i))}@gmail.com`, phone: '08031234567', role: pick(['supply', 'dropship', 'both'], i), plan: pick(PLANS, i), checks: { plan: i % 2 === 0, payout: true, cac: i % 3 === 0, phone: true, pickup: i % 4 === 0 }, supplierReady: i === 0, sells: i >= 9 ? 'Hair products' : '', createdAt: ago(i * D) })) }
    return undefined
  },
  '/api/admin-sms': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'overview') return { success: true, config: { ready: true, senderId: 'Sellapage', rate: 4.5, linkPlaceholder: '{link}' }, wallet: { balance: 18450 }, window: { open: true, closesAt: '8pm', opensAt: '8am' },
      totals: { campaigns: 4, sentMessages: 1620, clicks: 212, clickRate: 13, dndBlocked: 140, delivered: 1390, undelivered: 78, spend: 7290, failed: 12 },
      series: [[44, 410, 360, 40, 1845, 61], [30, 380, 330, 30, 1710, 44], [17, 420, 370, 35, 1890, 58], [6, 410, 330, 35, 1845, 49]].flatMap(([dd, sent, delivered, dnd, spend, clicks]) => [{ date: dayKey(dd), sent, delivered, dnd, spend, campaigns: 1, clicks: Math.round(clicks * 0.6) }, { date: dayKey(dd - 1), sent: 0, delivered: 0, dnd: 0, spend: 0, campaigns: 0, clicks: Math.round(clicks * 0.3) }, { date: dayKey(dd - 2), sent: 0, delivered: 0, dnd: 0, spend: 0, campaigns: 0, clicks: Math.round(clicks * 0.1) }]),
      byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, clicks: h < 7 ? h % 2 : h < 21 ? Math.round(6 + 10 * Math.abs(Math.sin((h - 6) / 3))) : 3 })), byWeekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({ day, clicks: [38, 31, 29, 34, 41, 22, 17][i] })),
      campaigns: [{ id: 'sc1', name: 'October re-engagement', body: 'Hi, your Sellapage store misses you. Add 3 products this week and we will feature you: {link}', status: 'draft', linkUrl: 'https://www.sellapage.com.ng/dashboard', includeLink: true, filters: {} },
        { id: 'sc2', name: 'September promo', body: 'Pro is 20% off till Sunday. Upgrade: {link}', status: 'sent', sent: 410, failed: 3, clicks: 61, clickedBy: 48, delivered: 360, dndBlocked: 40, undelivered: 7, cost: 1845, sentAt: ago(44 * D) },
        { id: 'sc3', name: 'Add your first product', body: 'Your store has no products yet. Add one in 2 minutes: {link}', status: 'sent', sent: 380, failed: 2, clicks: 44, clickedBy: 39, delivered: 330, dndBlocked: 30, undelivered: 18, cost: 1710, sentAt: ago(30 * D) },
        { id: 'sc4', name: 'Delivery is live', body: 'Book Sendbox and Topship deliveries from your dashboard: {link}', status: 'sent', sent: 420, failed: 4, clicks: 58, clickedBy: 51, delivered: 370, dndBlocked: 35, undelivered: 11, cost: 1890, sentAt: ago(17 * D) },
        { id: 'sc5', name: 'October check-in', body: 'How is your store doing? Tell us: {link}', status: 'sent', sent: 410, failed: 3, clicks: 49, clickedBy: 40, delivered: 330, dndBlocked: 35, undelivered: 42, cost: 1845, sentAt: ago(6 * D) }] }
    if (action === 'audience') return { success: true, count: 386, quote: { characters: 112, pages: 1, perPage: 160, remainingInPage: 48, unicode: false, cost: 1737, preview: 'Hi, your Sellapage store misses you. Add 3 products this week and we will feature you: sllp.ng/x7Kq2 Stop: sllp.ng/s' }, affordable: true, bySource: { verified: 300, whatsapp: 86 }, skipped: { optedOut: 4, noPhone: 20, badPhone: 2, duplicate: 1 } }
    if (action === 'messages') return { success: true, page: 1, totalPages: 3, total: 60, counts: { delivered: 40, dnd: 8, failed: 4, pending: 8 }, messages: Array.from({ length: 10 }, (_, i) => ({ messageId: `m${i}`, storeName: pick(STORES, i), phone: '+234803123456' + (i % 10), outcome: pick(['delivered', 'delivered', 'dnd', 'failed', 'pending'], i), status: 'DELIVRD', pages: 1, sentAt: ago(i * H) })) }
    if (action === 'opt-outs') return { success: true, total: 1, optOuts: [{ phone: '2348031112222', local: '0803 111 2222', storeName: 'Zee Hair', at: ago(4 * D) }] }
    return undefined
  },
  '/api/admin-email': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'quota') return { success: true, quota: { unlimited: false, limit: 100, reserve: 20, used: 31, available: 49, resetsAt: new Date(Date.now() + 9 * H).toISOString() } }
    if (action === 'list') return { success: true, campaigns: [
      { id: 'ec1', name: 'October newsletter', subject: 'Five things new in your store', sender: 'hello', status: 'partial', counts: { sent: 80, failed: 1 }, updatedAt: ago(2 * H) },
      { id: 'ec2', name: 'Pro launch', subject: 'Meet Sellapage Pro', sender: 'info', status: 'scheduled', counts: { sent: 0, failed: 0 }, scheduledAt: Date.now() + 20 * H, updatedAt: ago(D) },
      { id: 'ec3', name: 'Welcome series 1', subject: 'Your store in 10 minutes', sender: 'info', status: 'sent', counts: { sent: 148, failed: 0 }, updatedAt: ago(12 * D) },
    ] }
    return undefined
  },

  '/api/admin-sella-ai': (url) => {
    const action = url.searchParams.get('action') || 'usage'
    const KINDS = ['chat', 'deep', 'image', 'voice', 'files', 'speech']
    const logRows = Array.from({ length: 25 }, (_, i) => ({ id: `lg${i}`, storeId: `sa${i % 12}`, storeName: pick(STORES, i), plan: 'premium', at: Date.now() - i * 37 * 60e3, kind: pick(KINDS, i), credits: [1, 5.4, 8, 1.2, 2, 0.6][i % 6], usd: [0.004, 0.038, 0.057, 0.008, 0.014, 0.004][i % 6], fromTopup: i % 9 === 0 ? 1 : 0, actorRole: i % 5 === 0 ? 'staff' : 'owner', actorLabel: i % 5 === 0 ? 'Kemi (staff)' : null }))
    if (action === 'log') return { success: true, rows: logRows, nextCursor: 'lg24' }
    if (action === 'store') return { success: true, store: { id: url.searchParams.get('storeId'), name: 'Bisi Bakes', slug: 'bisibakes', plan: 'premium', staffAccess: true, assistantName: 'Bisi Helper' }, balance: { included: 1000, used: 640, includedLeft: 360, topup: 1500, remaining: 1860, resetsAt: '2026-10-31T23:00:00.000Z', topupNextExpiry: { credits: 1500, at: '2027-09-12T10:00:00.000Z' } },
      months: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((m, i) => ({ month: m, credits: 300 + i * 80, usd: 2 + i * 0.5, requests: 90 + i * 20, byKind: {} })),
      days: Array.from({ length: 60 }, (_, i) => ({ date: dayKey(59 - i), requests: Math.round(4 + 6 * Math.abs(Math.sin(i / 4))), credits: 10 + i, usd: 0.1 })), log: logRows.slice(0, 10), nextCursor: null }
    const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((m, i) => ({ month: m, credits: 2000 + i * 2400, usd: 14 + i * 16, requests: 600 + i * 380, stores: 8 + i * 9, newStores: i ? 3 + (i % 3) * 4 : 8, byKind: { chat: 1000 + i * 1200, deep: 500 + i * 600, image: 300 + i * 400, voice: 100 + i * 120, files: 100 + i * 80 } }))
    const days = Array.from({ length: 120 }, (_, i) => ({ date: dayKey(119 - i), requests: Math.round(60 + 50 * Math.abs(Math.sin(i / 6)) + i), credits: Math.round(400 + 300 * Math.abs(Math.sin(i / 6)) + i * 4), usd: 3 + (i % 9) * 0.4, stores: Math.round(10 + 8 * Math.abs(Math.cos(i / 5)) + i / 10), byKind: {} }))
    const stores = STORES.map((n, i) => ({ storeId: `sa${i}`, name: n, slug: slug(n), plan: 'premium', today: Math.max(0, 30 - i * 3), todayCredits: 40 - i * 3, last7: 120 - i * 9, last30: 400 - i * 30, requests: 2400 - i * 150, allTimeCredits: 9000 - i * 600, allTimeUsd: 64 - i * 4.2, monthCredits: Math.max(0, 1000 - i * 90), monthLeft: i * 90, monthRequests: 300 - i * 20, monthUsd: 7 - i * 0.5, topupLeft: i === 0 ? 1500 : i === 4 ? 300 : 0, firstDay: dayKey(200 - i * 12), lastDay: dayKey(i > 9 ? 40 : i), lastAt: i > 9 ? 0 : Date.now() - i * 3 * H, daysActive: 80 - i * 5, monthsActive: 6, byKind: { chat: 5000 - i * 300, deep: 2000, image: 1200, voice: 400 } }))
    return { success: true, dailyLimit: 300, summary: { todayTotal: 143, todayCredits: 920, activeVendorsToday: 9, active7: 11, active30: 12, vendorsEverUsed: 12, newThisMonth: 3, allTimeTotal: 18230, allTimeCredits: 64200, allTimeUsd: 452.6, topThisMonth: { storeId: 'sa0', name: STORES[0], credits: 1000 }, firstDay: dayKey(210), logSince: '2026-10-07' },
      credits: { month: '2026-10', used: 18450.5, costUsd: 129.8, costNaira: 181720, requests: 3120, byKind: { chat: 9800, deep: 4200, image: 2600, voice: 900, files: 700, speech: 250 }, topupLeft: 1800, storesWithTopup: 2, monthlyAllowance: 1000, nairaPerCredit: 10, ngnPerUsd: 1400 },
      days, months, stores, truncated: false, builtAt: Date.now() }
  },
  '/api/admin-ai-describe': (url) => {
    if (url.searchParams.get('action') === 'logs') {
      const logs = Array.from({ length: 25 }, (_, i) => ({ id: `l${i}`, storeId: `s${i}`, storeName: pick(STORES, i), plan: 'pro', mode: pick(['product', 'service'], i), subject: pick(['Ankara midi dress', 'Wireless earbuds', 'Bridal makeup session', 'Jollof rice tray'], i), status: i % 9 === 4 ? 'failed' : i % 13 === 6 ? 'rate_limited' : 'success', model: pick(['meta/llama-3.1-70b-instruct', 'mistralai/mixtral-8x7b'], i), keyLabel: pick(['Key A', 'Key B'], i), keyHint: '...9f2a', durationMs: 900 + i * 120, totalTokens: 420 + i * 9, attempts: [], errorCode: i % 9 === 4 ? 'timeout' : '', errorMessage: i % 9 === 4 ? 'The model did not answer within 20 seconds.' : '', createdAtMs: Date.now() - i * 47 * 60e3 }))
      return { success: true, logs, page: 1, limit: 25, total: 240, totalPages: 10, truncated: false, windowSize: 2000 }
    }
    const days = Number(url.searchParams.get('days')) || 30
    return { success: true, summary: { generationsAllTime: 9120, generationsInWindow: 1340, days, today: 61, storesUsed: 73, series: Array.from({ length: days }, (_, i) => ({ date: dayKey(days - 1 - i), count: 20 + Math.round(18 * Math.abs(Math.sin(i / 3))) })),
      topStores: STORES.slice(0, 6).map((n, i) => ({ storeId: `as${i}`, storeName: n, plan: pick(PLANS, i + 2), total: 600 - i * 70 })),
      keys: [{ label: 'Key A', env: 'NVIDIA_API_KEY', hint: '...9f2a', total: 900, success: 870, failed: 30, tokens: 380000 }, { label: 'Key B', env: 'NVIDIA_API_KEY_2', hint: '...71c0', total: 440, success: 431, failed: 9, tokens: 190000 }], retiredKeys: [],
      models: [{ model: 'meta/llama-3.1-70b-instruct', total: 1100, success: 1072, failed: 28, avgMs: 1840 }, { model: 'mistralai/mixtral-8x7b', total: 240, success: 229, failed: 11, avgMs: 1210 }],
      byStatus: { success: 1301, failed: 30, rate_limited: 9 }, byMode: { product: 1100, service: 240 }, avgDurationMs: 1720, tokensLogged: 570000, logCount: 1340, logsTruncated: false, usageTruncated: false } }
  },
  '/api/admin-newsletter': (url) => {
    const q = (url.searchParams.get('search') || '').toLowerCase()
    const rows = q ? subscribers.filter((s) => s.email.includes(q)) : subscribers
    const pg = page(rows, url, 20)
    return { success: true, items: pg.rows, total: rows.length, page: pg.page, limit: pg.limit, counts: { all: subscribers.length, footer: 12, blog: 12, partners: 11, landing: 11 } }
  },
  '/api/admin-partners': (url) => {
    if (url.searchParams.get('action') === 'get-content') return { success: true, saved: true, updatedAt: ago(5 * D), traction: { asOf: '2026-10-01', stats: [{ value: '148', label: 'Stores on Sellapage', note: 'and growing every week' }, { value: '2,310', label: 'Products listed', note: '' }, { value: '₦18.4M', label: 'Sold through stores', note: 'since launch' }, { value: '36', label: 'States reached', note: '' }] } }
    const st = url.searchParams.get('status') || 'open'
    const rows = enquiries.filter((e) => (st === 'all' ? true : st === 'open' ? !['closed', 'not_a_fit'].includes(e.status) : e.status === st))
    const c = (v) => enquiries.filter((e) => e.status === v).length
    return { success: true, items: rows, total: rows.length, page: 1, limit: 10, counts: { open: 6, all: 9, new: c('new'), contacted: c('contacted'), in_talks: c('in_talks'), closed: c('closed'), not_a_fit: c('not_a_fit') }, interestCounts: { all: rows.length, investor: 3, strategic: 2, partner: 2, cofounder: 2 } }
  },
  '/api/admin-announcements': () => ({ success: true, announcements }),
  '/api/admin-push': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'audience') return { success: true, devices: 412 }
    return { success: true, broadcasts }
  },

  '/api/admin-analytics': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'overview') return { success: true, analytics: { totalStores: 148, paidStores: 10, freeStores: 138, planBreakdown: { growth: 4, pro: 3, premium: 3 }, inGrace: 1, lapsed: 5, totalLeads: 912, totalProducts: 2310, openTickets: 9 } }
    if (action === 'signups') return { success: true, days: sigDays, months: sigMonths, totals: { range: sigDays.reduce((n, d) => n + d.count, 0), months: 0, allTime: 148, undated: 6 } }
    if (action === 'top-stores') return { success: true, stores: STORES.slice(0, 10).map((n, i) => ({ id: `ts${i}`, storeName: n, handle: slug(n), plan: pick(PLANS, i + 1), totalViews: 4200 - i * 380, totalClicks: 900 - i * 70, engagedViews: 0, engagementRate: 62 - i * 6 })) }
    return undefined
  },
  '/api/admin-revenue': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'platform') {
      const byMonth = sigMonths.map((m, i) => ({ month: m.month, amount: [15000, 22500, 30000, 30000, 45000, 52500, 60000, 75000, 70000, 97500, 120000, 37500][i] }))
      return { success: true, platform: { ownRevenue: 702500, subscriptions: { total: 655000, count: 41, thisMonth: 37500, byMonth, byPlan: [{ plan: 'pro', amount: 300000 }, { plan: 'premium', amount: 225000 }, { plan: 'growth', amount: 130000 }] }, shipments: { count: 190, total: 47500, serviceCharge: 250 }, merchantGross: 18450000, paystack: { hasApiKey: true, balance: 82000 }, truncated: false } }
    }
    if (action === 'store-revenue') {
      const rows = STORES.map((n, i) => ({ id: `sr${i}`, storeName: n, handle: slug(n), plan: pick(PLANS, i + 2), orders: 40 - i * 3, bookings: i % 4 === 0 ? 6 : 0, productRevenue: 2400000 - i * 180000, serviceRevenue: i % 4 === 0 ? 300000 : 0, deliveryCollected: 90000 - i * 5000, totalRevenue: 2400000 - i * 180000 + (i % 4 === 0 ? 300000 : 0) }))
      const pg = page(rows, url, 12)
      return { success: true, stores: pg.rows, totals: { stores: rows.length, orders: 270, bookings: 18, productRevenue: 16900000, serviceRevenue: 900000, totalRevenue: 17800000 }, page: pg.page, limit: pg.limit, total: rows.length, totalPages: Math.ceil(rows.length / pg.limit) }
    }
    if (action === 'income') {
      const events = []
      const price = { growth: 5000, pro: 15000, premium: 30000 }
      for (let k = 0; k < 420; k++) {
        const at = Date.now() - Math.round((k * 1.3 + (k % 5) * 0.37) * D)
        const sid = `in${k % 23}`
        const r = k % 9
        if (r < 4) { const plan = pick(['growth', 'pro', 'premium', 'pro'], k); const period = pick(['monthly', 'monthly', 'quarterly', 'annual'], k); events.push({ id: `p${k}`, kind: 'plan', at, amount: price[plan] * ({ monthly: 1, quarterly: 3, annual: 12 }[period]) * (period === 'annual' ? 0.8 : 1), storeId: sid, plan, period, ref: `T88${k}` }) }
        else if (r < 6) events.push({ id: `c${k}`, kind: 'credits', at, amount: pick([6450, 19350, 53750], k), vat: 450, storeId: sid, pack: pick(['Starter', 'Plus', 'Max'], k), credits: pick([300, 1000, 3000], k), ref: `SELLA-${k}` })
        else events.push({ id: `d${k}`, kind: 'delivery', at, amount: 250, storeId: sid, courier: pick(['Sendbox', 'Topship'], k), ref: `o${k}` })
      }
      const names = Object.fromEntries(Array.from({ length: 23 }, (_, i) => [`in${i}`, pick(STORES, i) + (i > 11 ? ' Abuja' : '')]))
      const firstPaidAt = {}
      events.forEach((e) => { if (e.kind === 'plan' && (!firstPaidAt[e.storeId] || e.at < firstPaidAt[e.storeId])) firstPaidAt[e.storeId] = e.at })
      return { success: true, events, names, firstPaidAt, truncated: false, serviceCharge: 250, builtAt: Date.now(), recurring: { mrr: 186500, arr: 2238000, paying: 14, manual: 1, payingByPlan: { growth: 5, pro: 6, premium: 3 }, arppu: 14346 } }
    }
    if (action === 'transactions') return { success: true, hasApiKey: true, meta: { total: 60, pageCount: 3 }, transactions: Array.from({ length: 25 }, (_, i) => ({ id: i, reference: `ref${i}`, amount: [12000, 7500, 45000, 3500][i % 4], fees: [180, 112, 600, 52][i % 4], customer: `customer${i}@gmail.com`, paidAt: ago(i * 3 * H), channel: pick(['card', 'bank_transfer', 'ussd'], i), subaccount: i % 5 === 0 ? '' : 'ACCT_x' })) }
    return undefined
  },
  '/api/admin-trials': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'find') return { success: true, stores: [{ storeId: 'f1', storeName: 'bisibakes', businessName: 'Bisi Bakes', plan: 'starter', planEndDate: null, trialStatus: null }, { storeId: 'f2', storeName: 'bisibakes2', businessName: 'Bisi Bakes Abuja', plan: 'pro', planEndDate: new Date(Date.now() + 20 * D).toISOString(), trialStatus: null }] }
    return { success: true, trials, counts: { active: 2, paused: 1, total: trials.length } }
  },

  '/api/admin-cac': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'requests') {
      const reqs = [
        { id: 'q1', storeName: 'zeehair', businessName: 'Zee Hair', entityType: 'business-name', proposedName: 'Zee Hair Ventures', contactEmail: 'zee@gmail.com', contactPhone: '08031234567', notes: 'I want it done before December please.', status: 'new', createdAt: ago(5 * H) },
        { id: 'q2', storeName: 'okaforprints', businessName: 'Okafor Prints', entityType: 'limited-company', proposedName: 'Okafor Prints Limited', contactEmail: 'okafor@gmail.com', contactPhone: '08123456789', notes: '', status: 'contacted', createdAt: ago(3 * D) },
      ]
      const st = url.searchParams.get('status') || 'open'
      return { success: true, requests: st === 'all' || st === 'open' ? reqs : reqs.filter((r) => r.status === st), counts: { open: 2, total: 2 } }
    }
    const st = url.searchParams.get('status') || 'all'
    const needs = (s) => !s.cacVerified && s.cacRetryCount >= 3
    const rows = cacStores.filter((s) => (st === 'all' ? true : st === 'verified' ? s.cacVerified : st === 'needs_help' ? needs(s) : s.cacStatus === st))
    const pg = page(rows, url, 12)
    return { success: true, stores: pg.rows, total: pg.total, page: pg.page, limit: pg.limit,
      stats: { total: 148, verified: 6, pending: 1, rejected: 1, notSubmitted: 140, needsHelp: 3, tried: 5 } }
  },
  '/api/admin-reports': (url) => {
    const st = url.searchParams.get('status') || 'all'
    const of = url.searchParams.get('offense') || 'all'
    const rows = reports.filter((r) => (st === 'all' || r.status === st) && (of === 'all' || r.offenseType === of))
    const pg = page(rows, url, 10)
    const c = (k, v) => reports.filter((r) => r[k] === v).length
    return { success: true, reports: pg.rows, total: pg.total, page: pg.page, limit: pg.limit,
      stats: { total: reports.length, pending: c('status', 'pending'), reviewed: c('status', 'reviewed'), resolved: c('status', 'resolved'), dismissed: c('status', 'dismissed'), scam: c('offenseType', 'scam'), fake_products: c('offenseType', 'fake_products'), non_delivery: c('offenseType', 'non_delivery'), identity_theft: 0, counterfeit: c('offenseType', 'counterfeit'), other: c('offenseType', 'other') } }
  },
  '/api/admin-jobs': (url) => {
    const st = url.searchParams.get('status') || 'all'
    const c = (v) => jobs.filter((j) => j.status === v).length
    return { success: true, jobs: st === 'all' ? jobs : jobs.filter((j) => j.status === st), stats: { total: jobs.length, pending: c('pending'), approved: c('approved'), rejected: c('rejected') } }
  },
  '/api/platform-reviews-admin': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'get-prompt-settings') return { enabled: true }
    const st = url.searchParams.get('status') || 'all'
    const rows = st === 'all' ? reviews : reviews.filter((r) => r.status === st)
    const pg = page(rows, url, 12)
    const c = (v) => reviews.filter((r) => r.status === v).length
    return { reviews: pg.rows, total: pg.total, page: pg.page, limit: pg.limit, counts: { all: reviews.length, pending: c('pending'), approved: c('approved'), rejected: c('rejected') } }
  },
  '/api/admin-domains': () => ({ success: true, stores: domains, page: 1, limit: 500, total: domains.length,
    stats: { total: domains.length, totalStores: 148, verified: 3, pending: 2, failed: 1 } }),

  '/api/admin-recovery': (url) => {
    const st = url.searchParams.get('status') || 'pending'
    return { success: true, requests: st === 'all' ? recovery : recovery.filter((r) => r.status === st) }
  },
  '/api/admin-referrals': (url) => {
    const action = url.searchParams.get('action')
    if (action === 'withdrawals') return { success: true, withdrawals, page: 1, limit: 200, total: withdrawals.length }
    if (action === 'stats') return { success: true, stats: { totalReferrals: 94, referredPaying: 38, referredFree: 56, referredEverPaid: 45, conversionRate: 47.9, referrers: 13, totalRewardsEarned: 5500000, totalPaidOut: 2200000, totalPendingPayoutAmount: 650000, pendingWithdrawals: 2, planBreakdown: { growth: 17, pro: 13, premium: 8 } } }
    if (action === 'referrers') {
      const show = url.searchParams.get('show')
      let rows = show === 'paying' ? referrers.filter((r) => r.paying) : show === 'free_only' ? referrers.filter((r) => !r.paying) : referrers
      const q = (url.searchParams.get('search') || '').toLowerCase()
      if (q) rows = rows.filter((r) => `${r.storeName} ${r.referralCode}`.toLowerCase().includes(q))
      const pg = page(rows, url, 10); return { success: true, referrers: pg.rows, page: pg.page, limit: pg.limit, total: rows.length }
    }
    return undefined
  },
  '/api/admin-health': (url) => {
    if (url.searchParams.get('action') === 'merchant') return merchantMock(url.searchParams.get('storeId'))
    if (url.searchParams.get('action') !== 'directory') return undefined

    const q = (url.searchParams.get('search') || '').toLowerCase()
    let rows = directory
    if (url.searchParams.get('payoutFilter') === 'unverified') rows = rows.filter((s) => s.subaccountCode && !s.payoutsVerified)
    if (q) rows = rows.filter((s) => `${s.storeName} ${s.ownerEmail} ${s.whatsappNumber}`.toLowerCase().includes(q))
    const pg = page(rows, url, 15)
    return { stores: pg.rows, meta: { totalResults: pg.total, totalPages: Math.max(1, Math.ceil(pg.total / pg.limit)), currentPage: pg.page, limit: pg.limit } }
  },
  '/api/admin-tickets': (url) => {
    const status = url.searchParams.get('status') || 'all'
    const q = (url.searchParams.get('search') || '').toLowerCase()
    let rows = status === 'all' ? tickets : tickets.filter((t) => t.status === status)
    if (q) rows = rows.filter((t) => `${t.message} ${t.businessName} ${t.email}`.toLowerCase().includes(q))
    const pg = page(rows, url)
    return {
      success: true, tickets: pg.rows, page: pg.page, limit: pg.limit, total: pg.total,
      stats: { total: tickets.length, open: 9, inProgress: 6, resolved: 12 },
    }
  },
}
