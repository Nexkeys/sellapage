//src/components/dashboard/AnalyticsTab.jsx/
import { useState } from 'react'
import { Eye, MousePointerClick, Users, TrendingUp, Lock, Loader2, BarChart2, RotateCcw, Check, Info } from 'lucide-react'
import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'



export default function AnalyticsTab({ storeId, products, isGrowthOrPro, isPro, navigateTo, analyticsData }) {

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
            onClick={() => navigateTo('billing')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Upgrade to unlock Analytics
          </button>
        </div>
      </div>
    )
  }



  // ── State ──
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)



  // ── Derived values ──
  const totalViews  = analyticsData?.totalViews  ?? 0
  const totalClicks = analyticsData?.totalClicks ?? 0
  const engagedViews = analyticsData?.engagedViews ?? 0

  let engagementRateNum = totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;
  if (engagementRateNum > 100) engagementRateNum = 100;
  const engagementRate = totalViews > 0 ? `${engagementRateNum.toFixed(1)}%` : '0.0%';

  const KPIS = [
    {
      label: 'Store Views',
      value: totalViews.toLocaleString(),
      Icon:  Eye,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Product Clicks',
      value: totalClicks.toLocaleString(),
      Icon:  MousePointerClick,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Products Listed',
      value: products.length.toLocaleString(),
      Icon:  Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Store Engagement Rate',
      value: engagementRate,
      Icon:  TrendingUp,
      color: 'bg-green-50 text-green-600',
    },
  ]

  const topProducts = [...products]
    .filter(p => p.clicks > 0)
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)

  const maxClicks = topProducts.length > 0 ? topProducts[0].clicks : 1



  // ── Reset handler ──
  const handleReset = async () => {
    if (!window.confirm('Reset all store views, product clicks, and per-product click counts to zero? This cannot be undone.')) return
    setResetting(true)
    try {
      // 1. Reset the analytics summary document
      await setDoc(
        doc(db, 'stores', storeId, 'analytics', 'storeSummary'),
        { totalViews: 0, totalClicks: 0, updatedAt: new Date() },
        { merge: true }
      )

      // 2. Batch-reset clicks on every product document
      const batch = writeBatch(db)
      const prodsSnap = await getDocs(collection(db, 'stores', storeId, 'products'))
      prodsSnap.docs.forEach(d => {
        batch.update(d.ref, { clicks: 0 })
      })
      await batch.commit()

      setResetDone(true)
      setTimeout(() => setResetDone(false), 3000)
    } catch (err) {
      console.error('Reset failed', err)
    } finally {
      setResetting(false)
    }
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


      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3 text-blue-700 text-sm mb-6">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <p>Store views count every visit to your store link. Your own visits count too — share your link with customers for the most accurate data. Click rate rises as more customers tap your products.</p>
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
            {kpi.label === 'Store Engagement Rate' && (
              <p className="text-xs text-gray-400 mt-1">of visitors who interacted</p>
            )}
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


      {/* ── Reset Analytics ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">Reset Analytics</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Permanently reset all store views, product clicks, and per-product click counts to zero.
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
            Useful when starting a new marketing campaign or after testing your store. This cannot be undone.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 disabled:opacity-50 ${
              resetDone
                ? 'bg-green-500 text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
            }`}
          >
            {resetting ? (
              <><Loader2 size={13} className="animate-spin" /> Resetting...</>
            ) : resetDone ? (
              <><Check size={13} /> Reset complete</>
            ) : (
              <><RotateCcw size={13} /> Reset All Analytics</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}