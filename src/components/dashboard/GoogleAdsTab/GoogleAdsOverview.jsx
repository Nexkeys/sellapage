//src/components/dashboard/GoogleAdsTab/GoogleAdsOverview.jsx
import { Eye, MousePointerClick, IndianRupee, Target, TrendingUp, Loader2 } from 'lucide-react'

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0)
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

export default function GoogleAdsOverview({ store, campaigns, reports, loading, onRefresh }) {
  const summary = reports?.summary || {}
  const activeCampaigns = campaigns?.filter((c) => c.status === 'ACTIVE' || c.status === 'ENABLED').length || 0
  const pausedCampaigns = campaigns?.filter((c) => c.status === 'PAUSED').length || 0

  return (
    <div className="space-y-4">
      {/* Account info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-900">Account</h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#4285F4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{store?.googleAdsAccountName || 'Google Ads Account'}</p>
            <p className="text-[10px] text-gray-400">ID: {store?.googleAdsCustomerId || '—'} · {store?.googleAdsCurrency || 'NGN'}</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Impressions', value: formatNumber(summary.impressions), icon: Eye, color: 'blue' },
          { label: 'Clicks', value: formatNumber(summary.clicks), icon: MousePointerClick, color: 'green' },
          { label: 'Spend', value: formatNaira(summary.spend), icon: IndianRupee, color: 'orange' },
          { label: 'Conversions', value: String(summary.conversions || 0), icon: Target, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                <stat.icon size={13} className={`text-${stat.color}-500`} />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* CTR + ROAS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 font-medium mb-1">Click-Through Rate</p>
          <p className="text-xl font-bold text-gray-900">{summary.ctr || '0'}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 font-medium mb-1">Cost per Click</p>
          <p className="text-xl font-bold text-gray-900">
            {summary.clicks > 0 ? formatNaira((summary.spend || 0) / summary.clicks) : '₦0'}
          </p>
        </div>
      </div>

      {/* Campaign summary */}
      {campaigns?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-xs font-bold text-gray-900 mb-3">Campaign Summary</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600">{activeCampaigns} active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-600">{pausedCampaigns} paused</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-600">{campaigns.length} total</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-blue-500" />
        </div>
      )}
    </div>
  )
}
