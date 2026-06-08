//src/components/dashboard/BillingTab.jsx/
import { CreditCard, Zap, Star, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

const PLANS = [
  {
    id: 'growth',
    name: 'Growth',
    price: '₦5,000',
    period: '/month',
    description: 'For growing teams that need analytics, carts, branding, and AI-assisted selling.',
    features: [
      '50 products or services',
      'Up to 10 images per listing',
      'Analytics dashboard',
      'Multi-item cart checkout',
      'Product visibility toggle',
      'Priority support',
    ],
    cta: 'Upgrade to Growth',
    accent: 'border-blue-400',
    badge: 'bg-blue-50 text-blue-600',
    icon: Zap,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦12,000',
    period: '/month',
    description: 'For serious businesses managing customers, reviews, payouts, and premium operations.',
    features: [
      'Unlimited products or services',
      'Up to 50 images per listing',
      'Everything in Growth',
      'Customer CRM and hot leads',
      'Reviews and payout workspace',
      'Dedicated support',
    ],
    cta: 'Upgrade to Pro',
    accent: 'border-yellow-400',
    badge: 'bg-yellow-50 text-yellow-600',
    icon: Star,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₦25,000',
    period: '/month',
    description: 'For established operators that need white-label commerce, automation, staff access, and deeper integrations.',
    features: [
      'Everything in Pro',
      'White-label customer experience',
      'WhatsApp Business automation',
      'Broadcasts and loyalty tools',
      'Staff access controls',
      'Advanced integrations',
    ],
    cta: 'Upgrade to Premium',
    accent: 'border-orange-400',
    badge: 'bg-orange-50 text-orange-600',
    icon: CreditCard,
  },
]

export default function BillingTab({
  store, plan, planStatus, isGrowthOrPro, isPro, isPremium,
  onUpgrade, upgradeLoading, upgradeError,
}) {
  const isExpired = planStatus === 'expired'
  const isGrace = planStatus === 'grace'

  const planEndDate = store?.planEndDate?.toDate?.()
  const formattedEnd = planEndDate
    ? planEndDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Billing & Plans</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your subscription and unlock more of your Sellapage commerce workspace.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Plan</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-gray-900 capitalize">{plan}</span>
            {isGrace && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                Grace Period
              </span>
            )}
            {isExpired && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                Expired
              </span>
            )}
          </div>
          {formattedEnd && isGrowthOrPro && (
            <p className="text-xs text-gray-400 mt-1">
              {isGrace ? 'Grace period ends' : 'Renews'} {formattedEnd}
            </p>
          )}
        </div>
        {(isGrace || isExpired) && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
            <RefreshCw size={13} />
            Renew your plan below to restore access
          </div>
        )}
      </div>

      {upgradeError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {upgradeError}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map(p => {
          const isCurrent = plan === p.id && !isExpired
          const isDowngrade = (p.id === 'growth' && (isPro || isPremium)) || (p.id === 'pro' && isPremium)
          const PlanIcon = p.icon

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border-2 shadow-sm p-5 flex flex-col gap-4 transition-all ${
                isCurrent ? p.accent : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.badge}`}>
                      <PlanIcon size={14} />
                    </span>
                    <p className="font-extrabold text-gray-900">{p.name}</p>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{p.description}</p>
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex-shrink-0">
                    Active
                  </span>
                )}
              </div>

              <div>
                <span className="text-2xl font-extrabold text-gray-900">{p.price}</span>
                <span className="text-gray-400 text-sm">{p.period}</span>
              </div>

              <ul className="space-y-2">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onUpgrade(p.id)}
                disabled={upgradeLoading === p.id || isCurrent || isDowngrade}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : isDowngrade
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white'
                }`}
              >
                {upgradeLoading === p.id
                  ? <><Loader2 size={14} className="animate-spin" /> Redirecting...</>
                  : isCurrent
                  ? 'Current Plan'
                  : isGrace || isExpired
                  ? `Renew ${p.name}`
                  : p.cta
                }
              </button>
            </div>
          )
        })}
      </div>

      {plan === 'starter' && (
        <p className="text-center text-xs text-gray-400">
          You are on the free Starter plan. Upgrade anytime - no lock-in.
        </p>
      )}
    </div>
  )
}
