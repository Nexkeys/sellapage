import { useEffect, useState } from 'react'
import { Eye, MousePointerClick, Users, TrendingUp, Lock, Loader2, BarChart2 } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'


export default function AnalyticsTab({ storeId, products, isGrowthOrPro, isPro, navigateTo }) {

  const [analyticsData, setAnalyticsData] = useState({ totalViews: 0, totalClicks: 0 })
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)


  useEffect(() => {
    if (!isGrowthOrPro || !storeId) {
      setLoadingAnalytics(false)
      return
    }
    const fetchAnalytics = async () => {
      try {
        const snap = await getDoc(doc(db, 'stores', storeId, 'analytics', 'storeSummary'))
        if (snap.exists()) {
          const data = snap.data()
          setAnalyticsData({
            totalViews:  data.totalViews  ?? 0,
            totalClicks: data.totalClicks ?? 0,
          })
        }
      } catch {
        // silently fall back to zeros
      } finally {
        setLoadingAnalytics(false)
      }
    }
    fetchAnalytics()
  }, [storeId, isGrowthOrPro])


  // ── Plan gate ──
  if (!isGrowthOrPro) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your store's performance in real time.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Lock size={22} className="text-gray-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">Analytics — Growth+ Feature</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              Store visit tracking and product click analytics are available on the Growth and Pro plans.
            </p>
          </div>
          <button
            onClick={() => navigateTo('settings')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Upgrade to unlock Analytics
          </button>
        </div>
      </div>
    )
  }


  // ── Derived values ──
  const { totalViews, totalClicks } = analyticsData

  const clickRate = totalViews > 0
    ? `${(totalClicks / totalViews * 100).toFixed(1)}%`
    : '—'

  const KPIS = [
    {
      label:   'Store Views',
      value:   totalViews.toLocaleString(),
      Icon:    Eye,
      color:   'bg-amber-50 text-amber-600',
    },
    {
      label:   'Product Clicks',
      value:   totalClicks.toLocaleString(),
      Icon:    MousePointerClick,
      color:   'bg-blue-50 text-blue-600',
    },
    {
      label:   'Total Leads',
      value:   products.length.toLocaleString(),
      Icon:    Users,
      color:   'bg-purple-50 text-purple-600',
    },
    {
      label:   'Click Rate',
      value:   clickRate,
      Icon:    TrendingUp,
      color:   'bg-green-50 text-green-600',
    },
  ]

  const topProducts = [...products]
    .filter(p => p.clicks > 0)
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)

  const maxClicks = topProducts.length > 0 ? topProducts[0].clicks : 1


  // ── Loading ──
  if (loadingAnalytics) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your store's performance in real time.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-green-500 animate-spin" />
        </div>
      </div>
    )
  }


  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your store's performance in real time.</p>
        </div>
        <p className="text-xs text-gray-400 font-medium">Updated in real time.</p>
      </div>


      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPIS.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <kpi.Icon size={15} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{kpi.value}</p>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>


      {/* Top Performing Products */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Top Performing Products</p>
          <p className="text-gray-400 text-xs mt-0.5">By product page clicks — all time</p>
        </div>

        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 text-center">
            <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center">
              <BarChart2 size={20} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium max-w-xs">
              No click data yet — share your store to start tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="text-gray-300 font-bold text-sm w-5 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[180px]">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${((p.clicks ?? 0) / maxClicks) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{p.clicks ?? 0} click{p.clicks !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-green-600 font-semibold">₦{Number(p.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


