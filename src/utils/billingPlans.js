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
    '50 products or services',
    'Up to 10 images per listing',
    'Analytics dashboard',
    'Multi-item cart checkout',
    'Product visibility toggle',
    'Priority support',
  ],
  pro: [
    'Unlimited products or services',
    'Up to 50 images per listing',
    'Everything in Growth',
    'Customer CRM and hot leads',
    'Reviews and payout workspace',
    'Dedicated support',
  ],
  premium: [
    'Everything in Pro',
    'White-label customer experience',
    'WhatsApp Business automation',
    'Broadcasts and loyalty tools',
    'Staff access controls',
    'Advanced integrations',
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
