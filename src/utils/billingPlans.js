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

export const PLAN_FEATURES = {
  growth: [
    'Everything in Starter',
    '50 total listings (products + services combined)',
    '10 images per listing',
    'Custom visual palette (colours, fonts, logo)',
    'Analytics & click tracking (store views, top clicks)',
    'AI description generation - 20 per day',
    'Stock count management & out-of-stock sorting',
    'Categories for products and services',
    'Marketing tab: SEO tools, free Google listings, social post kit',
    'Ledger for offline and WhatsApp sales',
    'Leads inbox from your store enquiry form',
    'Priority support',
  ],
  pro: [
    'Everything in Growth',
    'Unlimited listings',
    '50 images per listing',
    '20 premium store themes',
    'In-app Paystack checkout (card, transfer, USSD)',
    'Automatic order creation from payments',
    'Payouts tab with bank settlement via Paystack subaccount',
    'Customer CRM tab (profiles, WhatsApp links, spend sorting)',
    'Verified reviews tab (aggregate stars, expandable cards)',
    'Discounts & promo codes (percentage, flat, limits, expiry)',
    'Sendbox delivery integration (live rates, booking, tracking)',
    'Delivery zones setup for local areas',
    'Top-performing analytics (engagement rate, best sellers)',
    'AI description generation - 50 per day',
    'Product export (PDF, CSV, Excel)',
    'Receipt generator (6 templates, logo, stamp, QR code)',
    'Free Google Shopping product feed',
    'Bookings tab for service appointments',
    'Job Listings board',
    'Custom domain (yourbrand.com)',
    'CAC Trust Verification badge',
    'Priority same-day support',
  ],
  premium: [
    'Everything in Pro',
    'White-label customer experience (no Sellapage branding)',
    'AI Business Partner (context-aware dashboard assistant)',
    'WhatsApp Business API automation',
    'Broadcast manager for customer messaging',
    'Loyalty Points System for repeat customers',
    'Abandoned Cart Recovery',
    'Multi-staff account access with role controls',
    'Meta Pixel for Facebook and Instagram ad tracking',
    'Google Ads integration (self-managed)',
    'Custom Domain Engine with SSL',
    'Advanced integrations & premium positioning',
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
