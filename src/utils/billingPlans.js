//src/utils/billingPlans.js/
export const PLAN_PERIODS = [
  { id: 'monthly', label: 'Monthly', shortLabel: 'mo' },
  { id: 'quarterly', label: 'Quarterly', shortLabel: 'qtr', months: 3 },
  { id: 'biannual', label: '6 Months', shortLabel: '6mo', months: 6 },
  { id: 'annual', label: 'Annual', shortLabel: 'yr', months: 12 },
]

export const PLAN_PRICES = {
  growth: {
    monthly: 5000,
    quarterly: 13500,
    biannual: 25500,
    annual: 48000,
  },
  pro: {
    monthly: 12000,
    quarterly: 32400,
    biannual: 61200,
    annual: 115200,
  },
  premium: {
    monthly: 25000,
    quarterly: 67500,
    biannual: 127500,
    annual: 240000,
  },
}

// What each plan includes, as the Pricing page (pages/Pricing.jsx) and the
// Billing tab both show it. One list, so the two can never disagree again.
// Checked against the code that enforces each line (2026-10-08):
//   listings and photos   firebase/products.js (15/3, 50/10, unlimited/50)
//   AI descriptions/day   api-handlers/ai-describe.js DAILY_LIMITS (30, 65, 65)
//   job listings          api-handlers/job-listings.js (5, 25, 50, unlimited)
//   Get found, Google feed  store-seo.js PAID_PLANS (Growth and up)
//   Pro tabs              DashboardLayout: orders, bookings, delivery, payouts,
//                         customers, reviews, discounts; custom domain and CAC
//   Premium tabs          team, loyalty, abandoned, Meta and TikTok pixels,
//                         Google Ads, Store Design; Sella; white-label receipts
export const STARTER_FEATURES = [
  '15 listings, 3 photos each',
  'Online store with your logo, categories and search',
  'Enquiry form and leads inbox',
  'Sales ledger for walk-in sales (CSV and PDF)',
  'Google Maps profile kit, post kit and your guarantee',
  'Up to 5 job listings',
  'Referral programme',
  'Free business name and store policy generators',
]

// One line under each plan's name on the Billing tab.
export const PLAN_TAGLINES = {
  starter: 'Everything you need to open your doors, free forever.',
  growth: 'Get found, see what sells, and look like your brand.',
  pro: 'Take payments, run deliveries and bookings, and manage customers in one place.',
  premium: 'The whole business, with your team and an AI partner by your side.',
}

export const PLAN_FEATURES = {
  growth: [
    'Everything in Starter',
    '50 listings, 10 photos each',
    'Your own colours and fonts',
    'Analytics: store views and top clicks',
    'AI descriptions, 30 a day',
    'Stock counts and categories',
    'Get found: Google and AI search listing',
    'Free Google Shopping listings feed',
    'WhatsApp cart for multi-item orders',
    'Branded receipts (templates, logo, stamp, QR code)',
    'Up to 25 job listings, with AI help',
    'Priority support',
  ],
  pro: [
    'Everything in Growth',
    'Unlimited listings, 50 photos each',
    '20 premium store themes',
    'Paystack checkout: card, transfer and USSD',
    'Orders create themselves when customers pay',
    'Payouts settled to your bank',
    'Bookings calendar for appointments',
    'Sendbox and Topship delivery, plus delivery zones',
    'Customer records, verified reviews and discount codes',
    'Top-performing analytics',
    'AI descriptions, 65 a day',
    'Product export (PDF, CSV, Excel)',
    'Custom domain and CAC verification badge',
    'Up to 50 job listings',
    'Same-day support',
  ],
  premium: [
    'Everything in Pro',
    'Sella, the AI assistant that knows your business',
    'Team accounts with roles',
    'Store Design: build your own storefront page',
    'Loyalty points for repeat customers',
    'Abandoned checkout reminders',
    'Google Ads, Meta Pixel and TikTok Pixel',
    'White-label receipts (no Sellapage branding)',
    'Unlimited job listings',
  ],
}

export function formatPrice(amount) {
  return '₦' + amount.toLocaleString('en-NG')
}

export function getMonthlyEquivalent(planId, periodId) {
  const period = PLAN_PERIODS.find(p => p.id === periodId)
  if (!period || periodId === 'monthly') return PLAN_PRICES[planId]?.monthly || 0
  const total = PLAN_PRICES[planId]?.[periodId] || 0
  return Math.round(total / (period.months || 1))
}

export function getSavingsPercent(planId, periodId) {
  if (periodId === 'monthly') return 0
  const monthlyPrice = PLAN_PRICES[planId]?.monthly || 0
  const periodPrice = PLAN_PRICES[planId]?.[periodId] || 0
  const months = PLAN_PERIODS.find(p => p.id === periodId)?.months || 1
  const fullPrice = monthlyPrice * months
  if (fullPrice <= 0) return 0
  return Math.round((1 - periodPrice / fullPrice) * 100)
}
