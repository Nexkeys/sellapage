//src/components/dashboard/AnalyticsTab.jsx/
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye, MousePointerClick, Users, TrendingUp, Lock, Loader2, BarChart2, RotateCcw,
  Check, Info, Calendar, CalendarClock, ChevronLeft, ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react'
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor } from '../../utils/staffDataFetch'
import {
  fetchDailyAnalytics,
  emptyDay as blankDay,
  engagementRate as rateOf,
  dayLabel,
  storeDay,
  isToday,
  emptyDay,
  DAILY_FETCH_LIMIT,
} from '../../utils/analytics'

const DAYS_PER_PAGE = 10

const fmt = (n) => Number(n || 0).toLocaleString()

export default function AnalyticsTab({ storeId, products, services = [], vendorType = 'products', isGrowthOrPro, isPro, navigateTo, analyticsData }) {

  // ── State ──
  // MUST stay above the plan gate below. These used to sit after the early
  // return, so a render where `isGrowthOrPro` was false called zero hooks and a
  // later render called two. `isGrowthOrPro` is derived from the store document,
  // which loads asynchronously, so that flip happens in normal use and React
  // throws "Rendered more hooks than during the previous render".
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')

  const [days, setDays] = useState([])
  const [daysLoading, setDaysLoading] = useState(true)
  const [daysError, setDaysError] = useState('')
  const [page, setPage] = useState(0)

  const loadDays = useCallback(async () => {
    if (!storeId || !isGrowthOrPro) {
      setDaysLoading(false)
      return
    }
    setDaysLoading(true)
    setDaysError('')
    try {
      // Staff have a different Firebase uid, so the direct read is denied by
      // rules exactly as it is for the summary document. They go through the
      // same server proxy the rest of the dashboard uses.
      const rows = isActingAsStaffFor(storeId)
        ? await fetchStoreCollectionAsStaff('analyticsDaily', storeId)
        : await fetchDailyAnalytics(storeId)
      setDays(
        (rows || [])
          .map((r) => ({ ...blankDay(r.date || r.id), ...r, date: r.date || r.id }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date))),
      )
    } catch {
      // A read failure here is almost always rules or connectivity. It must be
      // SAID, not swallowed: a silent empty table reads as "no traffic", which
      // is a very different thing from "we could not load your traffic".
      setDaysError('We could not load your daily history. Check your connection and try again.')
    } finally {
      setDaysLoading(false)
    }
  }, [storeId, isGrowthOrPro])

  useEffect(() => { loadDays() }, [loadDays])

  const hasServices = vendorType === 'services' || vendorType === 'both'
  const hasProducts = vendorType === 'products' || vendorType === 'both'

  // Today's row, whether or not a document exists yet. A store with no traffic
  // since midnight should read a confident zero, not a blank.
  const today = useMemo(() => {
    const key = storeDay()
    return days.find((d) => d.date === key) || emptyDay(key)
  }, [days])

  const pageCount = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE))
  const pageDays = useMemo(
    () => days.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE),
    [days, page],
  )

  // Clamp if the data shrank under us, e.g. straight after a reset.
  useEffect(() => { if (page > pageCount - 1) setPage(0) }, [page, pageCount])

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
              Daily store views, product and service click tracking, and your full history are available on the Growth and Pro plans.
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
  const totalViews = analyticsData?.totalViews ?? 0
  const totalClicks = analyticsData?.totalClicks ?? 0
  const productClicks = analyticsData?.productClicks ?? 0
  const serviceClicks = analyticsData?.serviceClicks ?? 0
  const engagedViews = analyticsData?.engagedViews ?? 0
  const totalBookingRequests = analyticsData?.totalBookingRequests ?? 0

  // Clicks recorded before products and services were counted apart. Shown as
  // its own line rather than folded into either number, because guessing how
  // an old combined total split would be inventing data.
  const legacyClicks = Math.max(totalClicks - productClicks - serviceClicks, 0)

  const allTimeRate = rateOf(engagedViews, totalViews)
  const todayRate = rateOf(today.engagedSessions, today.views)

  const KPIS = [
    {
      key: 'views',
      label: 'Store Views',
      value: fmt(totalViews),
      note: 'all time',
      Icon: Eye,
      color: 'bg-blue-50 text-blue-600',
    },
    ...(hasProducts ? [{
      key: 'productClicks',
      label: 'Product Clicks',
      value: fmt(productClicks),
      note: 'taps on a product card, Order or Add to Cart',
      Icon: MousePointerClick,
      color: 'bg-orange-50 text-orange-600',
    }] : []),
    ...(hasServices ? [{
      key: 'serviceClicks',
      label: 'Service Clicks',
      value: fmt(serviceClicks),
      note: 'taps on a service card or its Book button',
      Icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-600',
    }] : []),
    ...(hasServices ? [{
      key: 'bookings',
      label: 'Booking Requests',
      value: fmt(totalBookingRequests),
      note: 'customers who asked to book',
      Icon: Calendar,
      color: 'bg-teal-50 text-teal-600',
    }] : []),
    {
      key: 'listed',
      label: hasProducts && hasServices ? 'Items Listed' : hasServices ? 'Services Listed' : 'Products Listed',
      value: fmt(hasProducts && hasServices ? products.length + services.length : hasServices ? services.length : products.length),
      note: 'live on your store',
      Icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      key: 'rate',
      label: 'Engagement Rate',
      value: `${allTimeRate.toFixed(1)}%`,
      note: 'of all-time visitors who interacted',
      Icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
    },
  ]

  const topProducts = [...products]
    .filter(p => p.clicks > 0)
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 5)

  const maxClicks = topProducts.length > 0 ? topProducts[0].clicks : 1

  // Ranked by booking requests, falling back to card clicks for a service
  // nobody has booked yet. A service getting looked at and never booked is the
  // single most useful thing this table can tell a vendor.
  const serviceScore = (s) => (s.bookingRequests ?? 0) || (s.clicks ?? 0)
  const topServices = [...services]
    .filter(s => serviceScore(s) > 0)
    .sort((a, b) => serviceScore(b) - serviceScore(a))
    .slice(0, 5)

  const maxServiceScore = topServices.length > 0 ? serviceScore(topServices[0]) : 1

  // ── Reset handler ──
  const handleReset = async () => {
    if (!window.confirm('Reset all store views, clicks, booking requests, per-item metrics AND your daily history to zero? This cannot be undone.')) return
    setResetting(true)
    setResetError('')
    try {
      const batch = writeBatch(db)

      // 1. The all-time summary.
      batch.set(doc(db, 'stores', storeId, 'analytics', 'storeSummary'), {
        totalViews: 0,
        totalClicks: 0,
        productClicks: 0,
        serviceClicks: 0,
        engagedViews: 0,
        totalBookingRequests: 0,
        updatedAt: new Date(),
      }, { merge: true })

      // 2. Per-item counters.
      products.forEach(product => {
        batch.update(doc(db, 'stores', storeId, 'products', product.id), { clicks: 0 })
      })
      services.forEach(service => {
        batch.update(doc(db, 'stores', storeId, 'services', service.id), {
          bookingRequests: 0,
          clicks: 0,
        })
      })

      await batch.commit()

      // 3. Daily history, deleted rather than zeroed: a reset should leave no
      //    history, not a wall of empty days. Done in its own batches because
      //    a Firestore batch caps at 500 writes and the step above already
      //    used some of that budget.
      const snap = await getDocs(collection(db, 'stores', storeId, 'analyticsDaily'))
      const docs = snap.docs
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = writeBatch(db)
        docs.slice(i, i + 400).forEach(d => chunk.delete(d.ref))
        await chunk.commit()
      }

      setDays([])
      setPage(0)
      setResetDone(true)
      setTimeout(() => setResetDone(false), 3000)
    } catch (err) {
      console.error('Reset failed', err)
      setResetError('Reset failed. Nothing was changed. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  /** One number in the Today panel. */
  const TodayStat = ({ label, value, tone }) => (
    <div className="min-w-0">
      <p className={`text-lg font-bold ${tone || 'text-gray-900'}`}>{value}</p>
      <p className="text-gray-400 text-[11px] mt-0.5 leading-tight">{label}</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-xs mt-0.5">Track your store's performance in real time.</p>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">Updated in real time.</p>
      </div>

      {/* ── Today ─────────────────────────────────────────────────────────
          Every counter here restarts at zero at midnight Lagos time, which is
          what makes "is today better than yesterday" answerable at all. */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
              <CalendarClock size={13} className="text-gray-400" /> Today
            </p>
            <p className="text-gray-400 text-[11px] mt-0.5 truncate">{dayLabel(today.date)}, from midnight</p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
            LIVE
          </span>
        </div>
        <div className={`grid gap-4 px-4 py-4 grid-cols-2 ${hasProducts && hasServices ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
          <TodayStat label="Store views" value={fmt(today.views)} />
          {hasProducts && <TodayStat label="Product clicks" value={fmt(today.productClicks)} />}
          {hasServices && <TodayStat label="Service clicks" value={fmt(today.serviceClicks)} />}
          {hasServices && <TodayStat label="Booking requests" value={fmt(today.bookings)} />}
          <TodayStat
            label="Engagement"
            value={`${todayRate.toFixed(1)}%`}
            tone={todayRate > 0 ? 'text-green-600' : 'text-gray-900'}
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3 text-blue-700 text-xs">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Products and services are counted separately. Engagement Rate counts one interaction
          per visitor session. Daily numbers restart at zero every midnight; the cards below are
          all-time totals.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {KPIS.map(kpi => (
          <div key={kpi.key} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <kpi.Icon size={14} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{kpi.note}</p>
            {kpi.key === 'productClicks' && legacyClicks > 0 && (
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                plus {fmt(legacyClicks)} earlier clicks recorded before products and services were counted apart
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Daily breakdown ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-xs">Day by day</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {daysLoading ? 'Loading your history...' : `${days.length} day${days.length === 1 ? '' : 's'} recorded`}
            </p>
          </div>
          {!daysLoading && days.length > 0 && (
            <p className="flex-shrink-0 text-[11px] text-gray-400 font-medium">
              Page {page + 1} of {pageCount}
            </p>
          )}
        </div>

        {daysLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 animate-pulse">
                <div className="h-3 w-28 bg-gray-100 rounded" />
                <div className="mt-2.5 flex gap-4">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div key={j} className="h-3 w-12 bg-gray-50 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : daysError ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-3 text-center">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} className="text-red-400" />
            </div>
            <p className="text-gray-500 text-xs max-w-xs">{daysError}</p>
            <button
              onClick={loadDays}
              className="text-xs font-bold text-green-600 hover:text-green-700 px-4 py-2 rounded-xl bg-green-50 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-3 text-center">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <BarChart2 size={18} className="text-gray-300" />
            </div>
            <p className="text-gray-500 text-xs font-semibold">No days recorded yet</p>
            <p className="text-gray-400 text-xs max-w-xs">
              The first visit to your store starts today's count. Share your link and check back.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {pageDays.map((d) => {
                const r = rateOf(d.engagedSessions, d.views)
                return (
                  <div key={d.date} className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-800">{dayLabel(d.date)}</p>
                      {isToday(d.date) && (
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-100 rounded-full px-1.5 py-0.5">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                      <span className="text-[11px] text-gray-400">
                        <span className="font-bold text-gray-700">{fmt(d.views)}</span> views
                      </span>
                      {hasProducts && (
                        <span className="text-[11px] text-gray-400">
                          <span className="font-bold text-gray-700">{fmt(d.productClicks)}</span> product clicks
                        </span>
                      )}
                      {hasServices && (
                        <span className="text-[11px] text-gray-400">
                          <span className="font-bold text-gray-700">{fmt(d.serviceClicks)}</span> service clicks
                        </span>
                      )}
                      {hasServices && (
                        <span className="text-[11px] text-gray-400">
                          <span className="font-bold text-gray-700">{fmt(d.bookings)}</span> bookings
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        <span className={`font-bold ${r > 0 ? 'text-green-600' : 'text-gray-700'}`}>{r.toFixed(1)}%</span> engaged
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {pageCount > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Newer
                </button>
                <p className="text-[11px] text-gray-400 font-medium">
                  {dayLabel(pageDays[pageDays.length - 1]?.date)} to {dayLabel(pageDays[0]?.date)}
                </p>
                <button
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Older <ChevronRight size={14} />
                </button>
              </div>
            )}

            {days.length >= DAILY_FETCH_LIMIT && (
              <p className="px-4 pb-3 text-[10px] text-gray-400">
                Showing the most recent {DAILY_FETCH_LIMIT} days.
              </p>
            )}
          </>
        )}
      </div>

      {/* Top Performing Products */}
      {hasProducts && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-xs">Top Performing Products</p>
            <p className="text-gray-400 text-[11px] mt-0.5">By product clicks - all time</p>
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
      )}

      {/* Top Performing Services */}
      {hasServices && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-xs">Top Performing Services</p>
            <p className="text-gray-400 text-[11px] mt-0.5">By booking requests, then card clicks - all time</p>
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
                        style={{ width: `${(serviceScore(s) / maxServiceScore) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-800">
                      {s.bookingRequests ?? 0} booking{(s.bookingRequests ?? 0) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-gray-400">{s.clicks ?? 0} click{(s.clicks ?? 0) !== 1 ? 's' : ''}</p>
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
            Permanently reset all views, clicks, booking requests, per-item metrics and your daily history to zero.
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
        {resetError && (
          <div className="px-4 pb-3 flex items-start gap-2 text-red-600 text-[11px]">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <p>{resetError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
