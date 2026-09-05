//src/components/dashboard/AnalyticsTab.jsx/
import { useState } from 'react'
import { Eye, MousePointerClick, Users, TrendingUp, Lock, Loader2, BarChart2, RotateCcw, Check, Info, Calendar } from 'lucide-react'
import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'



export default function AnalyticsTab({ storeId, products, services = [], vendorType = 'products', isGrowthOrPro, isPro, navigateTo, analyticsData }) {

  // ── State ──
  // MUST stay above the plan gate below. These used to sit after the early
  // return, so a render where `isGrowthOrPro` was false called zero hooks and a
  // later render called two. `isGrowthOrPro` is derived from the store document,
  // which loads asynchronously, so that flip happens in normal use and React
  // throws "Rendered more hooks than during the previous render".
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // ── Plan gate ──
  if (!isGrowthOrPro) {
    return (
      <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-xs mt-0.5">Track your store's performance in real time.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-14 px-6 gap-4 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Lock size={20} className="text-gray-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-1">Analytics - Growth+ Feature</h2>
            <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
              Store visit tracking and product click analytics are available on the Growth and Pro plans.
            </p>
          </div>
          <button
            onClick={() => navigateTo('billing')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            Upgrade to unlock Analytics
          </button>
        </div>
      </div>
    )
  }




  // ── Derived values ──
  const totalViews  = analyticsData?.totalViews  ?? 0
  const totalClicks = analyticsData?.totalClicks ?? 0
  const engagedViews = analyticsData?.engagedViews ?? 0
  const totalBookingRequests = analyticsData?.totalBookingRequests ?? 0

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

  // Add booking requests KPI if vendor includes services
  if (vendorType === 'services' || vendorType === 'both') {
    KPIS.push({
      label: 'Booking Requests',
      value: totalBookingRequests.toLocaleString(),
      Icon:  Calendar,
      color: 'bg-teal-50 text-teal-600',
    })
  }

  const topProducts = [...products]
    .filter(p => p.clicks > 0)
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)

  const maxClicks = topProducts.length > 0 ? topProducts[0].clicks : 1

  const topServices = [...services]
    .filter(s => s.bookingRequests > 0)
    .sort((a, b) => (b.bookingRequests ?? 0) - (a.bookingRequests ?? 0))
    .slice(0, 5)

  const maxBookings = topServices.length > 0 ? topServices[0].bookingRequests : 1


  // ── Reset handler ──
  const handleReset = async () => {
    if (!window.confirm('Reset all store views, product clicks, service booking requests, and per-item metrics to zero? This cannot be undone.')) return
    setResetting(true)
    try {
      // Create a single batch for all operations
      const batch = writeBatch(db)

      // 1. Reset the analytics summary document
      const analyticsRef = doc(db, 'stores', storeId, 'analytics', 'storeSummary')
      batch.set(analyticsRef, { 
        totalViews: 0, 
        totalClicks: 0, 
        engagedViews: 0,
        totalBookingRequests: 0,
        updatedAt: new Date() 
      }, { merge: true })

      // 2. Batch-reset clicks on every product document
      products.forEach(product => {
        const productRef = doc(db, 'stores', storeId, 'products', product.id)
        batch.update(productRef, { clicks: 0 })
      })

      // 3. Batch-reset booking requests on every service document
      services.forEach(service => {
        const serviceRef = doc(db, 'stores', storeId, 'services', service.id)
        batch.update(serviceRef, { bookingRequests: 0 })
      })

      // Commit the batch
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
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-xs mt-0.5">Track your store's performance in real time.</p>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">Updated in real time.</p>
      </div>


      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3 text-blue-700 text-xs">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>Engagement Rate counts one interaction per visitor session. Product Clicks count every tap on Order or Add to Cart. Booking Requests count every service booking. All numbers update in real time.</p>
      </div>


      {/* KPI cards */}
      <div className={`grid gap-3 ${KPIS.length === 5 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {KPIS.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <kpi.Icon size={14} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{kpi.label}</p>
            {kpi.label === 'Store Engagement Rate' && (
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">of visitors who tapped a product or added to cart</p>
            )}
            {kpi.label === 'Product Clicks' && (
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">times customers tapped Order or Add to Cart</p>
            )}
            {kpi.label === 'Booking Requests' && (
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">times customers requested a service booking</p>
            )}
          </div>
        ))}
      </div>


      {/* Top Performing Products */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-xs">Top Performing Products</p>
          <p className="text-gray-400 text-[11px] mt-0.5">By product page clicks - all time</p>
        </div>

        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-3 text-center">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <BarChart2 size={18} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-xs max-w-xs">
              No click data yet - share your store to start tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-gray-300 font-bold text-xs w-4 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[160px]">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${((p.clicks ?? 0) / maxClicks) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-800">{p.clicks ?? 0} click{p.clicks !== 1 ? 's' : ''}</p>
                  <p className="text-[11px] text-green-600 font-semibold">₦{Number(p.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Performing Services (only if vendor includes services) */}
      {(vendorType === 'services' || vendorType === 'both') && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-xs">Top Performing Services</p>
            <p className="text-gray-400 text-[11px] mt-0.5">By booking requests - all time</p>
          </div>

          {topServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 gap-3 text-center">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <Calendar size={18} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-xs max-w-xs">
                No booking data yet - share your store to start tracking.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topServices.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-gray-300 font-bold text-xs w-4 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[160px]">
                      <div
                        className="h-full bg-teal-400 rounded-full"
                        style={{ width: `${((s.bookingRequests ?? 0) / maxBookings) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-800">{s.bookingRequests ?? 0} booking{s.bookingRequests !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-teal-600 font-semibold">₦{Number(s.price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── Reset Analytics ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-xs">Reset Analytics</p>
          <p className="text-gray-400 text-[11px] mt-0.5">
            Permanently reset all store views, product clicks, service booking requests, and per-item metrics to zero.
          </p>
        </div>
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-gray-400 text-[11px] leading-relaxed max-w-sm">
            Useful when starting a new marketing campaign or after testing your store. This cannot be undone.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 disabled:opacity-50 ${
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
