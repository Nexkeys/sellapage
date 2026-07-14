//src/components/dashboard/GoogleAdsTab/GoogleAdsReports.jsx
import { useState } from 'react'
import { Eye, MousePointerClick, IndianRupee, Target, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0)
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const DATE_RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '14d', label: '14 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
]

export default function GoogleAdsReports({ reports, loading, onRefresh }) {
  const [dateRange, setDateRange] = useState('30d')
  const summary = reports?.summary || {}
  const campaigns = reports?.campaigns || []

  const handleRangeChange = (range) => {
    setDateRange(range)
    onRefresh(range)
  }

  return (
    <div className="space-y-4">
      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-900">Performance Report</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {DATE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => handleRangeChange(range.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                dateRange === range.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-blue-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Impressions', value: formatNumber(summary.impressions), icon: Eye, color: 'blue' },
              { label: 'Clicks', value: formatNumber(summary.clicks), icon: MousePointerClick, color: 'green' },
              { label: 'CTR', value: `${summary.ctr || 0}%`, icon: TrendingUp, color: 'purple' },
              { label: 'Total Spend', value: formatNaira(summary.spend), icon: IndianRupee, color: 'orange' },
              { label: 'Conversions', value: String(summary.conversions || 0), icon: Target, color: 'red' },
              { label: 'Cost/Click', value: summary.clicks > 0 ? formatNaira((summary.spend || 0) / summary.clicks) : '₦0', icon: IndianRupee, color: 'teal' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <stat.icon size={12} className={`text-${stat.color}-500`} />
                  <span className="text-[10px] text-gray-400">{stat.label}</span>
                </div>
                <p className="text-base font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign breakdown */}
          {campaigns.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <h4 className="text-xs font-bold text-gray-900">Campaign Breakdown</h4>
              </div>
              <div className="divide-y divide-gray-50">
                {campaigns.map((c, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-gray-900 truncate">{c.campaignName}</h5>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE' || c.status === 'ENABLED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-400">Impressions</p>
                        <p className="text-xs font-bold text-gray-900">{formatNumber(c.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Clicks</p>
                        <p className="text-xs font-bold text-gray-900">{formatNumber(c.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Spend</p>
                        <p className="text-xs font-bold text-gray-900">{formatNaira(c.spendNaira)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!reports && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <TrendingUp size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">No data yet</p>
              <p className="text-xs text-gray-400 mb-4">Run some ads and check back here for performance reports</p>
              <button
                onClick={() => onRefresh(dateRange)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
