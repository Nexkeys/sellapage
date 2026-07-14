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

const STAT_CONFIG = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
  red: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-100' },
}

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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Performance Report</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {DATE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => handleRangeChange(range.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                dateRange === range.id
                  ? 'bg-white text-gray-900 shadow-sm'
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
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Impressions', value: formatNumber(summary.impressions), icon: Eye, color: 'blue' },
              { label: 'Clicks', value: formatNumber(summary.clicks), icon: MousePointerClick, color: 'green' },
              { label: 'CTR', value: `${summary.ctr || 0}%`, icon: TrendingUp, color: 'purple' },
              { label: 'Total Spend', value: formatNaira(summary.spend), icon: IndianRupee, color: 'orange' },
              { label: 'Conversions', value: String(summary.conversions || 0), icon: Target, color: 'red' },
              { label: 'Cost/Click', value: summary.clicks > 0 ? formatNaira((summary.spend || 0) / summary.clicks) : '₦0', icon: IndianRupee, color: 'teal' },
            ].map((stat, i) => {
              const colors = STAT_CONFIG[stat.color]
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                      <stat.icon size={12} className={colors.text} />
                    </div>
                  </div>
                  <p className="text-base font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {campaigns.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-900">Campaign Breakdown</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {campaigns.map((c, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-900 truncate">{c.campaignName}</h5>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE' || c.status === 'ENABLED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-400">Impressions</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNumber(c.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Clicks</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNumber(c.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Spend</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNaira(c.spendNaira)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!reports && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">No data yet</p>
              <p className="text-xs text-gray-400 mb-4">Run some ads and check back here for performance reports</p>
              <button
                onClick={() => onRefresh(dateRange)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
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
