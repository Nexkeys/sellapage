import { Eye, MousePointerClick, DollarSign, Target, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

function formatCurrency(amount, currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode || 'USD', minimumFractionDigits: 0 }).format(amount || 0)
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const STAT_COLORS = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },
}

export default function GoogleAdsOverview({ store, campaigns: allCampaigns, reports, loading, onRefresh }) {
  // Sellapage-managed campaigns live on a different account with their own status view — exclude
  // them from this self-managed account's stats.
  const campaigns = (allCampaigns || []).filter((c) => c.managementMode !== 'sellapage')
  const currencyCode = store?.googleAdsCurrency || 'USD'
  const summary = reports?.summary || {}
  const activeCampaigns = campaigns?.filter((c) => c.status === 'ACTIVE' || c.status === 'ENABLED').length || 0
  const pausedCampaigns = campaigns?.filter((c) => c.status === 'PAUSED').length || 0

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Account</h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{store?.googleAdsAccountName || 'Google Ads Account'}</p>
            <p className="text-[11px] text-gray-400">ID: {store?.googleAdsCustomerId || '—'} · {currencyCode}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Impressions', value: formatNumber(summary.impressions), icon: Eye, color: 'blue' },
          { label: 'Clicks', value: formatNumber(summary.clicks), icon: MousePointerClick, color: 'green' },
          { label: 'Spend', value: formatCurrency(summary.spend, currencyCode), icon: DollarSign, color: 'orange' },
          { label: 'Conversions', value: String(summary.conversions || 0), icon: Target, color: 'purple' },
        ].map((stat, i) => {
          const colors = STAT_COLORS[stat.color]
          return (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                  <stat.icon size={14} className={colors.text} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Click-Through Rate</p>
          <p className="text-2xl font-bold text-gray-900">{summary.ctr || '0'}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-[11px] text-gray-400 font-medium mb-1">Cost per Click</p>
          <p className="text-2xl font-bold text-gray-900">
            {summary.clicks > 0 ? formatCurrency((summary.spend || 0) / summary.clicks, currencyCode) : formatCurrency(0, currencyCode)}
          </p>
        </div>
      </div>

      {campaigns?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Campaign Summary</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-600">{activeCampaigns} active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-600">{pausedCampaigns} paused</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-600">{campaigns.length} total</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}
    </div>
  )
}
