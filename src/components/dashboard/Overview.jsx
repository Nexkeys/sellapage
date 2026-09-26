//src/components/dashboard/Overview.jsx/
//
// The dashboard home, rebuilt on 2026-09-26 to the new dashboard design:
// greeting and plan pills, the "Level up your store" banner, four stat cards
// with 14-day sparklines and a 7-day trend, Total Sales, Quick Actions, Recent
// Activity and Top Performing Products.
//
// Everything the old home screen did is still here: the listing count against
// the plan limit (and the limit-reached warning), leads, store views (Growth
// and up), orders and bookings (Pro and up, counted from the documents), the
// store link with copy and view, and top products and services (Pro).
//
// Reads: see src/utils/overviewData.js. Bounded to the last 30 days and cached
// per session, never the full order history.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, Copy, Check, ExternalLink, Users, ArrowRight, ArrowUpRight, ArrowDownRight,
  AlertCircle, Eye, Lock, Package, ShoppingCart, Zap, ChevronRight, ChevronDown,
  CalendarDays, Store, HelpCircle, UserRound, CreditCard, Crown, Play, Share2,
  Sparkles, ClipboardList, Link2,
} from 'lucide-react'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'
import { HOWTO_VIDEO_URL, HOWTO_VIDEO_LENGTH } from '../../media/howto'
import Sparkline from './ui/Sparkline'
import { ErrorState } from './ui/States'
import { Skeleton } from '../Skeleton'
import { loadOverview, periodChange, countByDay, toDate, isEarning, WINDOW_DAYS } from '../../utils/overviewData'
import { storeDay, lastDays } from '../../utils/analytics'

const SalesChart = lazy(() => import('./ui/SalesChart'))

const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
const RANGES = [7, 14, 30]

const PLAN_PILL = {
  starter: 'Free Plan',
  free: 'Free Plan',
  growth: 'Growth Plan',
  pro: 'Pro Plan',
  premium: 'Premium Plan',
}

function timeAgo(date) {
  if (!date) return ''
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

/** "+12%" in green, "-8%" in red, or a plain note when there is nothing to compare. */
function Trend({ change, noun = 'vs last 7 days', unit }) {
  if (!change) return <p className="mt-1.5 text-[11px] text-dash-muted">{noun}</p>
  const { pct, now } = change
  let body
  let cls
  let Icon = null
  if (pct === null) {
    if (now > 0) {
      body = unit ? `+${now} ${unit}` : 'New this week'
      cls = 'text-forest-600'
      Icon = ArrowUpRight
    } else {
      body = 'No change'
      cls = 'text-dash-muted'
    }
  } else if (pct > 0) {
    body = `+${pct}%`
    cls = 'text-forest-600'
    Icon = ArrowUpRight
  } else if (pct < 0) {
    body = `${pct}%`
    cls = 'text-red-500'
    Icon = ArrowDownRight
  } else {
    body = '0%'
    cls = 'text-dash-muted'
  }
  return (
    <div className="mt-1.5">
      <p className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${cls}`}>
        {Icon && <Icon size={14} strokeWidth={2.4} />}
        {body}
      </p>
      <p className="mt-0.5 text-[11px] text-dash-muted">{noun}</p>
    </div>
  )
}

function StatCard({ icon: Icon, iconWrap, label, value, loading, children, spark, sparkColor, locked, lockedLabel, onLockedClick, footer }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      {locked && (
        <button
          type="button"
          onClick={onLockedClick}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-[2px] transition hover:bg-white/70"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Lock size={14} className="text-dash-muted" />
          </span>
          <span className="px-3 text-center text-[11px] font-semibold text-dash-muted">{lockedLabel}</span>
        </button>
      )}
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <p className="mt-4 text-[13px] font-medium text-slate-600">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <p className="font-body text-2xl font-bold leading-none text-dash-ink tabular-nums sm:text-[28px]">{value}</p>
          )}
          {children}
        </div>
        {spark && !locked && (
          <Sparkline data={spark} color={sparkColor} width={104} height={46} className="hidden flex-shrink-0 sm:block" />
        )}
      </div>
      {spark && !locked && <Sparkline data={spark} color={sparkColor} width={240} height={34} className="mt-2 block w-full sm:hidden" />}
      {footer}
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick, href }) {
  const inner = (
    <>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-forest-600">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="flex-1 text-left text-[13px] font-medium text-slate-700">{label}</span>
      <ChevronRight size={16} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-forest" />
    </>
  )
  const cls = 'group flex w-full items-center gap-2.5 rounded-xl border border-dash-line bg-white px-3 py-2.5 transition hover:border-forest-200 hover:bg-forest-50/60'
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

const ACTIVITY_STYLE = {
  order: { icon: ShoppingCart, wrap: 'bg-forest-50 text-forest-600' },
  payment: { icon: CreditCard, wrap: 'bg-indigo-50 text-indigo-600' },
  booking: { icon: CalendarDays, wrap: 'bg-teal-50 text-teal-600' },
  lead: { icon: UserRound, wrap: 'bg-blue-50 text-blue-600' },
  product: { icon: Package, wrap: 'bg-forest-50 text-forest-600' },
  service: { icon: Sparkles, wrap: 'bg-violet-50 text-violet-600' },
}

export default function OverviewTab({
  store, plan, maxProducts, productCount = 0, serviceCount = 0, services = [], vendorType = 'products', limitReached,
  isGrowthOrPro, isPro,
  leads = [], products = [], storeUrl, copied, copyLink,
  navigateTo, setShowForm, setShowServiceForm, onOpenSetupGuide,
  analyticsData,
}) {
  const sellsProducts = vendorType !== 'services'
  const sellsServices = vendorType !== 'products'

  // ── Listing count and plan limit (unchanged rules) ──────────────────────
  let derivedCount = productCount || 0
  let listingLabel = 'Total Products'
  if (vendorType === 'services') {
    derivedCount = serviceCount || 0
    listingLabel = 'Total Services'
  } else if (vendorType === 'both') {
    derivedCount = (productCount || 0) + (serviceCount || 0)
    listingLabel = 'Total Listings'
  }
  const unlimited = !maxProducts || maxProducts >= 999999
  const pct = unlimited ? 0 : Math.min(100, Math.round((derivedCount / maxProducts) * 100))

  const totalViews = analyticsData?.totalViews ?? 0
  const totalOrders = analyticsData?.totalOrders ?? 0
  const totalBookings = analyticsData?.totalBookings ?? 0
  const salesReceived = totalOrders + totalBookings
  const salesStatus = analyticsData?.salesStatus ?? 'ready'
  const salesLabel = vendorType === 'services' ? 'Bookings' : vendorType === 'both' ? 'Orders & Bookings' : 'Orders'

  // ── Last 30 days, loaded once and cached ───────────────────────────────
  const wants = useMemo(
    () => ({ views: !!isGrowthOrPro, orders: !!isPro && sellsProducts, bookings: !!isPro && sellsServices }),
    [isGrowthOrPro, isPro, sellsProducts, sellsServices],
  )
  const [overview, setOverview] = useState(null)
  const [overviewState, setOverviewState] = useState('loading')
  const needsLoad = wants.views || wants.orders || wants.bookings
  const load = useCallback(async (force = false) => {
    if (!store?.id || !needsLoad) { setOverviewState('ready'); return }
    setOverviewState((s) => (s === 'ready' && !force ? s : 'loading'))
    try {
      const data = await loadOverview(store.id, wants, { force })
      setOverview(data)
      setOverviewState('ready')
    } catch (err) {
      console.error('[overview] load failed', err)
      setOverviewState('error')
    }
  }, [store?.id, wants, needsLoad])
  useEffect(() => { load() }, [load])

  const dayKeys = useMemo(() => lastDays(storeDay(), 14), [])
  const days30 = overview?.days || []
  const days14 = days30.slice(-14)

  const listingSeries = useMemo(() => {
    const items = [...(sellsProducts ? products : []), ...(sellsServices ? services : [])]
    const added = countByDay(items, dayKeys)
    const before = derivedCount - added.reduce((s, v) => s + v, 0)
    let run = Math.max(0, before)
    return added.map((n) => (run += n))
  }, [products, services, sellsProducts, sellsServices, dayKeys, derivedCount])
  const listingAdded = useMemo(() => {
    const items = [...(sellsProducts ? products : []), ...(sellsServices ? services : [])]
    return countByDay(items, dayKeys)
  }, [products, services, sellsProducts, sellsServices, dayKeys])
  const leadSeries = useMemo(() => countByDay(leads, dayKeys), [leads, dayKeys])
  // What the sparklines draw. Leads are a running total (a day with one lead
  // and a day with none would otherwise draw a comb), views and sales a
  // 3-day average, so the line shows the direction rather than daily noise.
  // The numbers and trend badges always use the raw counts.
  const leadSpark = useMemo(() => {
    const before = Math.max(0, leads.length - leadSeries.reduce((s, v) => s + v, 0))
    let run = before
    return leadSeries.map((n) => (run += n))
  }, [leads.length, leadSeries])
  const smooth = (arr) => arr.map((_, i) => {
    const w = arr.slice(Math.max(0, i - 2), i + 1)
    return w.reduce((s, v) => s + v, 0) / w.length
  })
  const viewSeries = smooth(days30.map((d) => d.views)).slice(-14)
  const orderSeries = days14.map((d) => d.orders + d.bookings)
  const orderSpark = smooth(days30.map((d) => d.orders + d.bookings)).slice(-14)

  // ── Total Sales card ────────────────────────────────────────────────────
  const [range, setRange] = useState(7)
  const [rangeOpen, setRangeOpen] = useState(false)
  const showSales = !!isPro
  const money = overview?.money !== false
  const chartMetric = showSales ? 'sales' : 'views'
  const chartDays = days30.slice(-range)
  const chartData = chartDays.map((d) => ({ date: d.date, value: d[chartMetric] }))
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0)
  // Only 30 days are loaded, so a 30-day range has no earlier period to
  // compare with; the badge is left off rather than guessed.
  const chartChange = range * 2 <= WINDOW_DAYS ? periodChange(days30.map((d) => d[chartMetric]), range) : null
  const fmtChart = showSales && money ? naira : (v) => Number(v || 0).toLocaleString('en-NG')
  const chartTitle = showSales ? (money ? 'Total Sales' : 'Sales') : 'Store Views'

  // ── Recent Activity ─────────────────────────────────────────────────────
  const activity = useMemo(() => {
    const out = []
    for (const o of overview?.recentOrders || []) {
      const when = toDate(o.createdAt)
      const amount = Number(o.grandTotal ?? o.total) || 0
      if (isEarning(o, 'order')) {
        out.push({ key: `o${o.id}`, kind: 'payment', title: 'Payment received', detail: `${naira(amount)} • Paystack`, when, tab: 'orders' })
      } else {
        out.push({ key: `o${o.id}`, kind: 'order', title: 'New order received', detail: [o.customerName, amount ? naira(amount) : ''].filter(Boolean).join(' • '), when, tab: 'orders' })
      }
    }
    for (const b of overview?.recentBookings || []) {
      out.push({ key: `b${b.id}`, kind: 'booking', title: 'New booking', detail: [b.customerName, b.serviceName].filter(Boolean).join(' • '), when: toDate(b.createdAt), tab: 'bookings' })
    }
    for (const l of leads.slice(0, 10)) {
      out.push({ key: `l${l.id}`, kind: 'lead', title: 'Customer lead', detail: l.phone || l.whatsapp || l.name || l.email || '', when: toDate(l.createdAt), tab: 'leads' })
    }
    if (sellsProducts) {
      for (const p of products.slice(0, 10)) {
        out.push({ key: `p${p.id}`, kind: 'product', title: 'Product published', detail: [p.name, p.price ? naira(p.price) : ''].filter(Boolean).join(' • '), when: toDate(p.createdAt), tab: 'products' })
      }
    }
    if (sellsServices) {
      for (const s of services.slice(0, 10)) {
        out.push({ key: `s${s.id}`, kind: 'service', title: 'Service published', detail: [s.name, s.price ? naira(s.price) : ''].filter(Boolean).join(' • '), when: toDate(s.createdAt), tab: 'services' })
      }
    }
    return out.filter((a) => a.when).sort((a, b) => b.when - a.when).slice(0, 5)
  }, [overview, leads, products, services, sellsProducts, sellsServices])

  // ── Top performers ──────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const sold = new Map()
    const soldByDay = new Map()
    for (const o of overview?.recentOrders || []) {
      if (!isEarning(o, 'order')) continue
      const d = toDate(o.createdAt)
      const k = d ? storeDay(d) : null
      for (const item of Array.isArray(o.cartItems) ? o.cartItems : []) {
        const id = String(item?.id || item?.productId || '')
        if (!id) continue
        const q = Number(item.quantity) || 1
        sold.set(id, (sold.get(id) || 0) + q)
        if (k) {
          const m = soldByDay.get(id) || new Map()
          m.set(k, (m.get(k) || 0) + q)
          soldByDay.set(id, m)
        }
      }
    }
    const bySales = sold.size > 0
    const ranked = [...products]
      .map((p) => ({ ...p, _sold: sold.get(p.id) || 0, _clicks: Number(p.clicks) || 0 }))
      .filter((p) => (bySales ? p._sold > 0 : p._clicks > 0))
      .sort((a, b) => (bySales ? b._sold - a._sold || b._clicks - a._clicks : b._clicks - a._clicks))
      .slice(0, 4)
      .map((p) => {
        if (!bySales) return { ...p, _spark: null }
        // Running total over the fortnight: a steady seller draws a rising
        // line instead of a comb of single sales.
        let run = 0
        return { ...p, _spark: dayKeys.map((k) => (run += soldByDay.get(p.id)?.get(k) || 0)) }
      })
    return { list: ranked, bySales }
  }, [products, overview, dayKeys])
  const topServices = useMemo(
    () => [...services].filter((s) => (s.bookingRequests || 0) > 0).sort((a, b) => (b.bookingRequests || 0) - (a.bookingRequests || 0)).slice(0, 4),
    [services],
  )

  const firstName = store?.businessName?.trim().split(/\s+/)[0] || 'there'
  const planStatus = store?.planStatus || 'active'
  const storeLive = planStatus !== 'expired'
  const weekOrders = periodChange(orderSeries, 7).now
  const bannerImage = hasMedia('dashboard-banner')
  const showHowTo = !!HOWTO_VIDEO_URL

  const addProduct = () => { setShowForm?.(true); navigateTo('products') }
  const addService = () => { setShowServiceForm?.(true); navigateTo('services') }

  const shareWhatsApp = storeUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Shop with me here: ${storeUrl}`)}`
    : null

  const storeLinkCard = (
    <div className="rounded-2xl border border-dash-line bg-gradient-to-br from-white to-forest-50/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><Link2 size={16} /></span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-dash-ink">Your store link</p>
          <p className="truncate text-[11px] text-dash-muted">{storeUrl}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={copyLink}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
            copied ? 'bg-forest text-white' : 'border border-dash-line bg-white text-slate-700 hover:border-forest-200'
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {shareWhatsApp && (
          <a href={shareWhatsApp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-dash-line bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:border-forest-200">
            <Share2 size={13} /> Share
          </a>
        )}
        <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-forest px-2 py-2 text-xs font-semibold text-white transition hover:bg-forest-700">
          <ExternalLink size={13} /> View
        </a>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-dash-muted">Share on WhatsApp status, Instagram bio and many more.</p>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">

      {/* ── Greeting + banner ─────────────────────────────────────────── */}
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest-600">Welcome back,</p>
          <h1 className="mt-1.5 font-body text-[26px] font-bold leading-tight tracking-tight text-dash-ink sm:text-[32px]">
            Good day, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-dash-muted sm:text-[15px]">
            {weekOrders > 0 ? 'Your store is doing great. ' : ''}Here&apos;s what&apos;s happening today.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold ${storeLive ? 'bg-forest text-white' : 'bg-amber-100 text-amber-800'}`}>
              <span className={`h-2 w-2 rounded-full ${storeLive ? 'bg-green-400' : 'bg-amber-500'}`} />
              {storeLive ? 'Store Active' : 'Plan expired'}
            </span>
            <button
              type="button"
              onClick={() => navigateTo('billing')}
              className="inline-flex items-center gap-2 rounded-full border border-dash-line bg-white px-4 py-2 text-[13px] font-semibold text-dash-ink shadow-sm transition hover:border-forest-200"
            >
              <Crown size={15} className={plan === 'starter' || plan === 'free' ? 'text-slate-400' : 'fill-amber-400 text-amber-500'} />
              {PLAN_PILL[plan] || 'Free Plan'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSetupGuide || (() => navigateTo('online-store'))}
          className="group relative flex min-h-[132px] items-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#fcfcfc] via-[#f6fbf8] to-[#f1f9f6] text-left transition hover:shadow-md sm:min-h-[150px]"
        >
          {bannerImage && (
            <div className="pointer-events-none w-[40%] sm:w-[46%] max-w-[300px] flex-shrink-0 self-stretch">
              <MediaSlot name="dashboard-banner" alt="" className="h-full w-full object-cover object-left" />
            </div>
          )}
          <div className={`flex flex-1 items-center gap-3 py-4 pr-4 ${bannerImage ? 'pl-2' : 'pl-5'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-dash-ink">Level up your store</p>
              <p className="mt-1.5 text-xs leading-relaxed text-dash-muted sm:text-[13px]">
                Add more products, connect your payment gateway and reach more customers.
              </p>
            </div>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-dash-line bg-white text-dash-ink shadow-sm transition group-hover:translate-x-0.5 group-hover:border-forest-200">
              <ArrowRight size={15} />
            </span>
          </div>
        </button>
      </div>

      {/* ── Limit reached ─────────────────────────────────────────────── */}
      {limitReached && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {vendorType === 'services' ? 'Service limit reached' : vendorType === 'both' ? 'Listing limit reached' : 'Product limit reached'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
              You&apos;ve used all {maxProducts} {vendorType === 'services' ? 'service' : vendorType === 'both' ? 'listing' : 'product'} slots on the {plan} plan.{' '}
              <button onClick={() => navigateTo('billing')} className="font-semibold underline hover:no-underline">
                Upgrade your plan
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          iconWrap="bg-forest-50 text-forest-600"
          label={listingLabel}
          value={derivedCount.toLocaleString()}
          spark={listingSeries}
          sparkColor="#16a34a"
          footer={!unlimited && (
            <div className="mt-3">
              <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${limitReached ? 'bg-amber-400' : 'bg-forest-600'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-dash-muted tabular-nums">{derivedCount} of {maxProducts} on your plan</p>
            </div>
          )}
        >
          <Trend change={periodChange(listingAdded, 7)} unit="this week" noun="added in the last 7 days" />
        </StatCard>

        <StatCard
          icon={Eye}
          iconWrap="bg-indigo-50 text-indigo-600"
          label="Store Views"
          value={isGrowthOrPro ? totalViews.toLocaleString() : '-'}
          loading={isGrowthOrPro && overviewState === 'loading' && !overview}
          spark={isGrowthOrPro && overview ? viewSeries : null}
          sparkColor="#16a34a"
          locked={!isGrowthOrPro}
          lockedLabel="Growth plan and up"
          onLockedClick={() => navigateTo('billing')}
        >
          <Trend change={overview ? periodChange(days30.map((d) => d.views), 7) : null} noun="vs last 7 days" />
        </StatCard>

        <StatCard
          icon={Users}
          iconWrap="bg-fuchsia-50 text-fuchsia-600"
          label="Customer Leads"
          value={leads.length.toLocaleString()}
          spark={leadSpark}
          sparkColor="#5b6cf0"
        >
          <Trend change={periodChange(leadSeries, 7)} unit="this week" noun="from lead form" />
        </StatCard>

        <StatCard
          icon={ShoppingCart}
          iconWrap="bg-orange-50 text-orange-500"
          label={salesLabel}
          value={salesStatus === 'error' ? '-' : salesReceived.toLocaleString()}
          loading={isPro && salesStatus === 'loading'}
          spark={isPro && overview ? orderSpark : null}
          sparkColor="#f59e42"
          locked={!isPro}
          lockedLabel="Pro plan and up"
          onLockedClick={() => navigateTo('billing')}
        >
          {salesStatus === 'error'
            ? <p className="mt-1.5 text-[11px] text-red-500">Could not load, refresh to try again</p>
            : <Trend change={overview ? periodChange(days30.map((d) => d.orders + d.bookings), 7) : null} noun="all time" unit="this week" />}
        </StatCard>
      </div>

      {/* ── Sales, quick actions, activity ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_minmax(0,1.1fr)]">

        {/* Total Sales */}
        <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 lg:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-body text-[15px] font-semibold text-dash-ink">{isGrowthOrPro ? chartTitle : 'Total Sales'}</h2>
              {isGrowthOrPro && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  {overviewState === 'loading' && !overview ? (
                    <Skeleton className="h-8 w-40" />
                  ) : (
                    <p className="font-body text-[26px] font-bold leading-none text-dash-ink tabular-nums sm:text-[30px]">
                      {fmtChart(chartTotal)}
                    </p>
                  )}
                  {chartChange && chartChange.pct !== null && overview && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${chartChange.pct >= 0 ? 'bg-forest-50 text-forest-600' : 'bg-red-50 text-red-600'}`}>
                      {chartChange.pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs(chartChange.pct)}%
                    </span>
                  )}
                </div>
              )}
            </div>
            {isGrowthOrPro && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setRangeOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setRangeOpen(false), 150)}
                  aria-haspopup="listbox"
                  aria-expanded={rangeOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-forest-200"
                >
                  Last {range} days <ChevronDown size={13} />
                </button>
                {rangeOpen && (
                  <ul role="listbox" className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-dash-line bg-white py-1 shadow-lg">
                    {RANGES.map((r) => (
                      <li key={r}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={r === range}
                          onMouseDown={() => { setRange(r); setRangeOpen(false) }}
                          className={`w-full px-3 py-2 text-left text-xs transition hover:bg-forest-50 ${r === range ? 'font-semibold text-forest' : 'text-slate-600'}`}
                        >
                          Last {r} days
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-3">
            {!isGrowthOrPro ? (
              <div className="flex h-[230px] flex-col items-center justify-center rounded-xl bg-gradient-to-b from-forest-50/60 to-white text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"><Lock size={18} className="text-forest-600" /></span>
                <p className="mt-3 text-sm font-semibold text-dash-ink">See your store grow day by day</p>
                <p className="mt-1 max-w-xs px-4 text-xs text-dash-muted">Visitors every day on Growth, and naira sales with checkout on Pro.</p>
                <button type="button" onClick={() => navigateTo('billing')} className="mt-3 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-700">
                  View plans
                </button>
              </div>
            ) : overviewState === 'error' ? (
              <ErrorState compact title="We could not load your chart" onRetry={() => load(true)} />
            ) : overviewState === 'loading' && !overview ? (
              <div className="flex h-[230px] flex-col justify-end gap-2" role="status" aria-label="Loading chart">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="h-[230px] w-full rounded-xl" />}>
                <SalesChart data={chartData} format={fmtChart} />
              </Suspense>
            )}
            {showSales && !money && overview && (
              <p className="mt-2 text-[11px] text-dash-muted">Number of sales per day. The store owner sees the naira value.</p>
            )}
            {overview?.errors?.sales && showSales && (
              <p className="mt-2 text-[11px] text-red-500">Sales could not load. <button className="underline" onClick={() => load(true)}>Try again</button></p>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <h2 className="flex items-center gap-2 font-body text-[15px] font-semibold text-dash-ink">
            <Zap size={17} className="fill-amber-400 text-amber-400" /> Quick Actions
          </h2>
          <div className="mt-3.5 space-y-2.5">
            {sellsProducts && <QuickAction icon={Plus} label="Add Product" onClick={addProduct} />}
            {sellsServices && <QuickAction icon={CalendarDays} label="Add Service" onClick={addService} />}
            {isPro && sellsProducts && <QuickAction icon={ShoppingCart} label="View Orders" onClick={() => navigateTo('orders')} />}
            {isPro && vendorType === 'services' && <QuickAction icon={CalendarDays} label="View Bookings" onClick={() => navigateTo('bookings')} />}
            {!isPro && <QuickAction icon={Users} label="View Leads" onClick={() => navigateTo('leads')} />}
            <QuickAction icon={Store} label="Business Page" onClick={() => navigateTo('online-store')} />
            {vendorType !== 'both' && storeUrl && <QuickAction icon={ExternalLink} label="View My Store" href={storeUrl} />}
          </div>
          <button
            type="button"
            onClick={onOpenSetupGuide || (() => navigateTo('support'))}
            className="group mt-3 flex w-full items-center gap-3 rounded-xl bg-forest-50 px-3 py-2.5 text-left transition hover:bg-forest-100"
          >
            <HelpCircle size={20} className="flex-shrink-0 text-forest-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-forest">Need help?</span>
              <span className="block text-[11px] text-forest-600/80">Check out our easy setup guide</span>
            </span>
            <ArrowRight size={15} className="text-forest-600 transition group-hover:translate-x-0.5" />
          </button>
        </section>

        {/* Recent Activity (spans two rows on wide screens) */}
        <section className="flex flex-col gap-4 rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 xl:row-span-2">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-body text-[15px] font-semibold text-dash-ink">Recent Activity</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            </div>
            {overviewState === 'loading' && !overview && needsLoad ? (
              <div className="mt-3 space-y-4" role="status" aria-label="Loading activity">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2.5 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="mt-6 text-center">
                <p className="text-[13px] font-semibold text-dash-ink">Nothing yet</p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-dash-muted">
                  Share your store link and new orders, leads and payments will show up here.
                </p>
              </div>
            ) : (
              <ul className="mt-2">
                {activity.map((a) => {
                  const st = ACTIVITY_STYLE[a.kind]
                  const Icon = st.icon
                  return (
                    <li key={a.key}>
                      <button type="button" onClick={() => navigateTo(a.tab)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition hover:bg-gray-50">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${st.wrap}`}>
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-dash-ink">{a.title}</span>
                          {a.detail && <span className="block truncate text-[11px] text-dash-muted">{a.detail}</span>}
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-dash-muted">{timeAgo(a.when)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-auto space-y-4">
            {showHowTo && (
              <a
                href={HOWTO_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-[104px] items-center overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50 via-[#eaf6ef] to-[#dff1e6] pl-4"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-md transition group-hover:scale-105">
                  <Play size={18} className="ml-0.5 fill-dash-ink text-dash-ink" />
                </span>
                <span className="relative z-[1] ml-3.5 min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug text-dash-ink">Watch how<br />Sellapage works</span>
                  <span className="mt-0.5 block text-[11px] text-dash-muted">{HOWTO_VIDEO_LENGTH}</span>
                </span>
                {hasMedia('dashboard-howto') && (
                  <span className="pointer-events-none absolute inset-y-0 right-0 w-[38%]">
                    <MediaSlot name="dashboard-howto" alt="" className="h-full w-full object-cover" />
                  </span>
                )}
              </a>
            )}
            {storeLinkCard}
          </div>
        </section>

        {/* Top Performing (Pro) */}
        {isPro && (
          <section className="rounded-2xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 lg:col-span-2">
            {sellsProducts && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-body text-[15px] font-semibold text-dash-ink">Top Performing Products</h2>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pro</span>
                    </div>
                    <p className="mt-0.5 text-xs text-dash-muted">
                      {topProducts.bySales ? `Ranked by sales in the last ${WINDOW_DAYS} days` : 'Ranked by customer clicks'}
                    </p>
                  </div>
                  <button type="button" onClick={() => navigateTo('analytics')} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                    View all <ArrowRight size={13} />
                  </button>
                </div>
                {topProducts.list.length === 0 ? (
                  <p className="py-8 text-center text-xs text-dash-muted">No clicks yet. Share your store link to get started.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
                    {topProducts.list.map((p, i) => (
                      <PerformerTile
                        key={p.id}
                        rank={i + 1}
                        image={p.imageUrls?.[0] || p.imageUrl}
                        name={p.name}
                        price={p.price}
                        stat={topProducts.bySales ? `${p._sold} sold` : `${p._clicks} click${p._clicks === 1 ? '' : 's'}`}
                        spark={p._spark}
                        onClick={() => navigateTo('products')}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {sellsServices && (
              <div className={sellsProducts ? 'mt-6 border-t border-dash-line pt-5' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-body text-[15px] font-semibold text-dash-ink">Top Performing Services</h2>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pro</span>
                    </div>
                    <p className="mt-0.5 text-xs text-dash-muted">Ranked by booking requests</p>
                  </div>
                  <button type="button" onClick={() => navigateTo('analytics')} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                    View all <ArrowRight size={13} />
                  </button>
                </div>
                {topServices.length === 0 ? (
                  <p className="py-8 text-center text-xs text-dash-muted">No booking requests yet. Promote your services to get bookings.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
                    {topServices.map((s, i) => (
                      <PerformerTile
                        key={s.id}
                        rank={i + 1}
                        image={s.imageUrls?.[0] || s.imageUrl}
                        name={s.name}
                        price={s.price}
                        stat={`${s.bookingRequests} request${s.bookingRequests === 1 ? '' : 's'}`}
                        onClick={() => navigateTo('services')}
                        service
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function PerformerTile({ rank, image, name, price, stat, spark, onClick, service = false }) {
  const Fallback = service ? Sparkles : Package
  return (
    <button type="button" onClick={onClick} className="group flex items-center gap-3 rounded-xl border border-dash-line p-2.5 text-left transition hover:border-forest-200 hover:shadow-sm">
      <span className="relative h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-gray-300"><Fallback size={24} /></span>
        )}
        <span className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded bg-white/95 px-1 text-[10px] font-bold text-dash-ink shadow-sm">{rank}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-700">{name}</span>
        {price ? <span className="mt-0.5 block text-sm font-bold text-dash-ink tabular-nums">{naira(price)}</span> : null}
        <span className="mt-1 flex items-end justify-between gap-1">
          <span className="text-[11px] text-dash-muted">{stat}</span>
          {spark && spark.some((v) => v > 0) && <Sparkline data={spark} color="#16a34a" width={52} height={20} />}
        </span>
      </span>
    </button>
  )
}
