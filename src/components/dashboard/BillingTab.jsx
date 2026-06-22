//src/components/dashboard/BillingTab.jsx/
import { useState } from 'react'
import { CreditCard, Zap, Star, CheckCircle2, Loader2, AlertCircle, RefreshCw, Calendar, ArrowRight, TrendingDown } from 'lucide-react'
import {
  PLAN_PERIODS,
  PLAN_PRICES,
  PLAN_FEATURES,
  formatPrice,
  getMonthlyEquivalent,
  getSavingsPercent,
} from '../../utils/billingPlans'

const PLAN_META = {
  growth: { icon: Zap, accent: 'border-blue-400', badge: 'bg-blue-50 text-blue-600', ring: 'ring-blue-400' },
  pro: { icon: Star, accent: 'border-yellow-400', badge: 'bg-yellow-50 text-yellow-600', ring: 'ring-yellow-400' },
  premium: { icon: CreditCard, accent: 'border-orange-400', badge: 'bg-orange-50 text-orange-600', ring: 'ring-orange-400' },
}

export default function BillingTab({
  store, plan, planStatus, isGrowthOrPro, isPro, isPremium,
  onUpgrade, upgradeLoading, upgradeError,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')

  const isExpired = planStatus === 'expired'
  const isGrace = planStatus === 'grace'
  const currentPlan = isExpired ? null : plan
  const billingPeriod = store?.billingPeriod || 'monthly'

  const planEndDate = store?.planEndDate?.toDate?.()
  const formattedEnd = planEndDate
    ? planEndDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const periodLabel = PLAN_PERIODS.find(p => p.id === billingPeriod)?.label || 'Monthly'

  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Billing & Plans</h1>
        <p className="text-gray-400 text-xs mt-0.5">Manage your subscription and unlock more of your Sellapage commerce workspace.</p>
      </div>

      {/* Current Plan Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gray-900 capitalize">{plan}</span>
              {!isExpired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {periodLabel}
                </span>
              )}
              {isGrace && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  Grace Period
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                  Expired
                </span>
              )}
            </div>
            {formattedEnd && isGrowthOrPro && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                <Calendar size={11} />
                {isGrace ? 'Grace period ends' : 'Renews'} {formattedEnd}
              </p>
            )}
          </div>
          {(isGrace || isExpired) && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
              <RefreshCw size={12} />
              Renew your plan below to restore access
            </div>
          )}
        </div>
      </div>

      {/* Period Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Billing Period</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLAN_PERIODS.map(period => {
            const isActive = selectedPeriod === period.id
            const savings = getSavingsPercent('growth', period.id)
            return (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-100 hover:border-gray-200 text-gray-500 bg-white'
                }`}
              >
                <span>{period.label}</span>
                {savings > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <TrendingDown size={9} />
                    {savings}% off
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {upgradeError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          {upgradeError}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(PLAN_PRICES).map(([planId, prices]) => {
          const meta = PLAN_META[planId]
          const PlanIcon = meta.icon
          const isCurrent = currentPlan === planId
          const isDowngrade = (planId === 'growth' && (isPro || isPremium)) || (planId === 'pro' && isPremium)
          const price = prices[selectedPeriod]
          const monthlyEquiv = getMonthlyEquivalent(planId, selectedPeriod)

          return (
            <div
              key={planId}
              className={`bg-white rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
                isCurrent ? meta.accent : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${meta.badge}`}>
                      <PlanIcon size={13} />
                    </span>
                    <p className="font-bold text-gray-900 capitalize text-sm">{planId}</p>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex-shrink-0">
                    Active
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900">{formatPrice(price)}</span>
                  <span className="text-gray-400 text-xs">/{PLAN_PERIODS.find(p => p.id === selectedPeriod)?.shortLabel}</span>
                </div>
                {selectedPeriod !== 'monthly' && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatPrice(monthlyEquiv)}/mo equivalent
                  </p>
                )}
              </div>

              <ul className="space-y-1.5 flex-1">
                {PLAN_FEATURES[planId].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
                    <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onUpgrade(planId, selectedPeriod)}
                disabled={upgradeLoading === planId || isCurrent || isDowngrade}
                className={`w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : isDowngrade
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white'
                }`}
              >
                {upgradeLoading === planId
                  ? <><Loader2 size={13} className="animate-spin" /> Redirecting...</>
                  : isCurrent
                  ? 'Current Plan'
                  : isGrace || isExpired
                  ? `Renew ${planId.charAt(0).toUpperCase() + planId.slice(1)}`
                  : `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)}`
                }
                {!isCurrent && upgradeLoading !== planId && <ArrowRight size={13} />}
              </button>
            </div>
          )
        })}
      </div>

      {plan === 'starter' && (
        <p className="text-center text-[11px] text-gray-400">
          You are on the free Starter plan. Upgrade anytime — no lock-in.
        </p>
      )}
    </div>
  )
}
