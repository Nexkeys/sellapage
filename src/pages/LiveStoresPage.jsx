// src/pages/LiveStoresPage.jsx
//
// Explore Stores, rebuilt on 2026-09-29 to the Explore Stores design: a
// banner with search, store categories with counts, a grid of store cards
// (cover as the big picture, logo as the small round one, verified tick,
// stars, listings) and numbered pages instead of endless scrolling.
//
// Data: /api/explore-stores (explore-stores.js), one small cached list for
// everyone, so browsing costs no database reads per visitor. If that route is
// unreachable the page falls back to reading stores directly, as it used to.
// Search, category and page live in the URL (?q=&cat=&page=) so a filtered
// view can be shared.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Store, ShieldCheck, CreditCard, Truck, Star, ArrowRight, ChevronLeft, ChevronRight, BadgeCheck, X,
  RefreshCw, AlertCircle, Shirt, Scissors, Sparkles, Laptop, Smartphone, Refrigerator, Wine, UtensilsCrossed, Car,
  Briefcase, Baby, Dumbbell, Gem, Sofa, BookOpen, LayoutGrid, Headphones, Package,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { Skeleton } from '../components/Skeleton'
import MediaSlot from '../media/MediaSlot'
import { hasMedia } from '../media/hasMedia'
import { NIGERIAN_MARKET_CATEGORIES } from '../utils/categories'
import { getOptimizedImageUrl } from '../utils/themes'

const PER_PAGE = 12
const CAT_ICON = {
  fashion: Shirt, 'hair-wigs': Scissors, beauty: Sparkles, computing: Laptop, gadgets: Smartphone, appliances: Refrigerator,
  'drinks-wines': Wine, food: UtensilsCrossed, vehicles: Car, services: Briefcase, kids: Baby, sports: Dumbbell,
  jewelry: Gem, home: Sofa, books: BookOpen,
}
const catId = (label) => NIGERIAN_MARKET_CATEGORIES.find((c) => c.label === label)?.id
const TYPE_LABEL = { products: 'Products', services: 'Services', both: 'Products & Services' }
const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
  { id: 'listings', label: 'Most listings' },
]

// Fallback when /api/explore-stores is not reachable (e.g. before deploy).
async function loadDirect() {
  const { getActiveStores } = await import('../firebase/products')
  const docs = await getActiveStores()
  return docs.filter((d) => d.storeName).map((d) => {
    const count = Number(d.ratingCount) || 0
    return {
      id: d.id, slug: d.storeName, name: d.businessName || d.storeName, logo: d.logoUrl || '',
      cover: d.themeMetadata?.heroBannerUrl || d.coverImage || '', category: d.businessCategory || '',
      vendorType: d.vendorType || 'products', listings: Number(d.productCount) || 0,
      rating: count ? Math.round(((Number(d.ratingSum) || 0) / count) * 10) / 10 : 0, reviews: count,
      verified: d.cacVerified === true, about: String(d.description || '').slice(0, 140),
      createdAt: d.createdAt?.seconds ? d.createdAt.seconds * 1000 : 0,
    }
  })
}

function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(total - 1, current + 1)
  if (from > 2) out.push('…')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < total - 1) out.push('…')
  out.push(total)
  return out
}

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-dash-ink">
      <Star size={13} className="fill-amber-400 text-amber-400" /> {value.toFixed(1)}
    </span>
  )
}

function StoreCard({ s }) {
  const Icon = CAT_ICON[catId(s.category)] || Store
  const initial = (s.name || '?').trim()[0]?.toUpperCase() || '?'
  return (
    <Link to={`/${s.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70">
      <div className="relative h-24 overflow-hidden bg-gradient-to-br sm:h-36 from-forest-50 to-[#dcefe3]">
        {s.cover ? (
          <img src={getOptimizedImageUrl(s.cover, 600)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : s.logo ? (
          // No cover yet: the store's own logo, blown up and softened, so the
          // card still looks like THEIR brand instead of a grey box.
          <img src={getOptimizedImageUrl(s.logo, 300)} alt="" loading="lazy" decoding="async" aria-hidden="true" className="h-full w-full scale-150 object-cover opacity-70 blur-2xl saturate-150" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon size={44} strokeWidth={1.3} className="text-forest-600/35" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
      <div className="relative flex flex-1 flex-col px-3 pb-3.5 pt-7 sm:px-4 sm:pb-4 sm:pt-8">
        <span className="absolute -top-6 left-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-forest text-base font-bold sm:-top-7 sm:left-4 sm:h-14 sm:w-14 sm:text-lg text-white shadow-md">
          {s.logo ? <img src={getOptimizedImageUrl(s.logo, 120)} alt={`${s.name} logo`} loading="lazy" className="h-full w-full object-cover" /> : initial}
        </span>
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-[13.5px] font-bold text-dash-ink sm:text-[15px]">{s.name}</p>
          {s.verified && <BadgeCheck size={17} className="mt-px flex-shrink-0 fill-forest-600 text-white" aria-label="CAC verified business" />}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-dash-muted sm:text-[12px]">{s.category || TYPE_LABEL[s.vendorType] || 'Store'}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-dash-muted sm:gap-x-2 sm:text-[12px]">
          {s.reviews > 0 ? <><Stars value={s.rating} /><span>({s.reviews.toLocaleString()}<span className="hidden min-[420px]:inline"> review{s.reviews === 1 ? '' : 's'}</span>)</span></> : <span className="text-forest-600">New on Sellapage</span>}
          {s.listings > 0 && <><span aria-hidden="true">•</span><span>{s.listings.toLocaleString()} listing{s.listings === 1 ? '' : 's'}</span></>}
        </p>
        <span className="h-3.5 sm:h-4" aria-hidden="true" />
        <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-50 px-3.5 py-2 text-xs font-semibold sm:px-4 text-forest transition group-hover:bg-forest group-hover:text-white">
          Visit Store <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export default function LiveStoresPage() {
  const [params, setParams] = useSearchParams()
  const [stores, setStores] = useState(null)
  const [state, setState] = useState('loading')
  const [q, setQ] = useState(params.get('q') || '')
  const [sort, setSort] = useState('featured')
  const cat = params.get('cat') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const gridTop = useRef(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      let list = null
      try {
        const r = await fetch('/api/explore-stores')
        const d = r.ok ? await r.json() : null
        if (d?.success) list = d.stores
      } catch { /* try direct */ }
      if (!list) list = await loadDirect()
      setStores(list)
      setState('ready')
    } catch (err) {
      console.error('[explore] load', err)
      setState('error')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, String(v)); else next.delete(k) }
    setParams(next, { replace: true })
  }
  // Search is typed freely, then written to the URL a moment later.
  useEffect(() => {
    const t = setTimeout(() => { if ((params.get('q') || '') !== q.trim()) update({ q: q.trim(), page: '' }) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const categories = useMemo(() => {
    const counts = new Map()
    for (const s of stores || []) if (s.category) counts.set(s.category, (counts.get(s.category) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n, Icon: CAT_ICON[catId(label)] || Store }))
  }, [stores])

  const filtered = useMemo(() => {
    const needle = (params.get('q') || '').toLowerCase()
    let list = (stores || []).filter((s) => (!cat || s.category === cat) && (!needle || `${s.name} ${s.slug} ${s.about} ${s.category}`.toLowerCase().includes(needle)))
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    else if (sort === 'newest') list = [...list].sort((a, b) => b.createdAt - a.createdAt)
    else if (sort === 'listings') list = [...list].sort((a, b) => b.listings - a.listings)
    return list
  }, [stores, cat, params, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, pages)
  const shown = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const goPage = (n) => {
    update({ page: n > 1 ? n : '' })
    gridTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const clearAll = () => { setQ(''); setSort('featured'); setParams(new URLSearchParams(), { replace: true }) }

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <SEO {...pageSeo('/live-stores')} url="/live-stores" />
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-50 via-[#eef8f2] to-[#dff1e6]">
          <div className="relative z-[1] p-6 sm:p-10 lg:max-w-[56%]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-600 ring-1 ring-forest-100"><Store size={12} /> Sellapage Marketplace</span>
            <h1 className="mt-4 font-display text-[32px] font-extrabold leading-[1.08] tracking-tight text-dash-ink sm:text-[46px]">
              Discover Amazing <span className="text-forest-600">Stores &amp; Shop with Confidence</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">Explore trusted stores, unique products and bookable services, and support real Nigerian entrepreneurs.</p>
            <label className="relative mt-6 block max-w-xl">
              <span className="sr-only">Search stores</span>
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores or categories..." className="h-14 w-full rounded-2xl border border-white bg-white pl-12 pr-11 text-[15px] shadow-lg shadow-forest/5 outline-none ring-1 ring-dash-line placeholder:text-slate-400 focus:ring-forest-200" />
              {q && <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-gray-100" aria-label="Clear search"><X size={15} /></button>}
            </label>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: ShieldCheck, t: 'Trusted Sellers', s: 'Real businesses' },
                { icon: CreditCard, t: 'Secure Payments', s: 'Handled by Paystack' },
                { icon: Truck, t: 'Order Tracking', s: 'Follow your order' },
                { icon: Star, t: 'Real Reviews', s: 'From real buyers' },
              ].map((x) => (
                <div key={x.t} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-forest-600 shadow-sm"><x.icon size={15} /></span>
                  <span className="min-w-0"><span className="block text-[11px] font-semibold text-dash-ink">{x.t}</span><span className="block text-[10px] leading-tight text-dash-muted">{x.s}</span></span>
                </div>
              ))}
            </div>
          </div>
          {hasMedia('explore-hero') && (
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
              <MediaSlot name="explore-hero" alt="" priority className="h-full w-full object-contain object-right-bottom mix-blend-multiply" />
            </div>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
            <button type="button" onClick={() => update({ cat: '', page: '' })} className={`flex min-w-[150px] flex-shrink-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition ${!cat ? 'border-forest bg-forest-50' : 'border-gray-100 bg-white hover:border-forest-200'}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-600"><LayoutGrid size={20} /></span>
              <span><span className="block text-[13px] font-semibold text-dash-ink">All stores</span><span className="block text-[11px] text-dash-muted">{(stores || []).length.toLocaleString()} stores</span></span>
            </button>
            {categories.map(({ label, n, Icon }) => (
              <button key={label} type="button" onClick={() => update({ cat: cat === label ? '' : label, page: '' })} aria-pressed={cat === label}
                className={`group flex min-w-[170px] flex-shrink-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition ${cat === label ? 'border-forest bg-forest-50' : 'border-gray-100 bg-white hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-md'}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Icon size={20} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{label}</span><span className="block text-[11px] text-dash-muted">{n.toLocaleString()} store{n === 1 ? '' : 's'}</span></span>
                <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest" />
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <div ref={gridTop} className="mt-10 flex scroll-mt-20 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex flex-wrap items-center gap-3 font-display text-[26px] font-extrabold tracking-tight text-dash-ink sm:text-[30px]">
              {cat || (params.get('q') ? 'Search results' : 'Featured Stores')}
              {!cat && !params.get('q') && <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 font-body text-[11px] font-semibold text-forest-600"><Star size={11} className="fill-forest-600" /> Top Rated</span>}
            </h2>
            <p className="mt-1 text-sm text-dash-muted">
              {state === 'ready' ? `${filtered.length.toLocaleString()} store${filtered.length === 1 ? '' : 's'}${cat ? ` in ${cat}` : ''}. Shop from trusted Nigerian businesses.` : 'Shop from our handpicked stores and trusted Nigerian businesses.'}
            </p>
          </div>
          <div className="flex gap-2">
            <select value={sort} onChange={(e) => { setSort(e.target.value); update({ page: '' }) }} aria-label="Sort stores" className="h-10 rounded-full border border-gray-200 bg-white px-4 text-[13px] text-slate-700 outline-none focus:border-forest-200">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {(cat || params.get('q') || sort !== 'featured') && (
              <button type="button" onClick={clearAll} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-forest-200 bg-white px-4 text-[13px] font-semibold text-forest hover:bg-forest-50">View All Stores <ArrowRight size={13} /></button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6">
          {state === 'loading' ? (
            <div role="status" aria-label="Loading stores">
              <p className="mb-4 flex items-center gap-2 text-sm text-dash-muted"><RefreshCw size={15} className="animate-spin text-forest-600" /> Please hold on, finding amazing stores for you...</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    <Skeleton className="h-36 w-full rounded-none" />
                    <div className="space-y-2 p-4 pt-8"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="mt-3 h-8 w-28 rounded-full" /></div>
                  </div>
                ))}
              </div>
            </div>
          ) : state === 'error' ? (
            <div className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50"><AlertCircle size={24} className="text-red-500" /></span>
              <p className="mt-4 text-base font-semibold text-dash-ink">We couldn&apos;t load the stores</p>
              <p className="mt-1 text-sm text-dash-muted">Check your connection, then try again.</p>
              <button type="button" onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"><RefreshCw size={15} /> Try again</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-50"><Search size={22} className="text-forest-600" /></span>
              <p className="mt-4 text-base font-semibold text-dash-ink">No stores match that yet</p>
              <p className="mt-1 max-w-sm text-sm text-dash-muted">Try another word or category. New stores open on Sellapage every day.</p>
              <button type="button" onClick={clearAll} className="mt-5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-dash-ink hover:bg-gray-50">Show all stores</button>
            </div>
          ) : (
            <div key={`${cat}-${safePage}-${sort}`} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
              {shown.map((s) => <StoreCard key={s.id} s={s} />)}
            </div>
          )}
        </div>

        {/* Pages */}
        {state === 'ready' && pages > 1 && (
          <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-1.5">
            <button type="button" onClick={() => goPage(safePage - 1)} disabled={safePage === 1} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 hover:bg-gray-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
            {pageList(safePage, pages).map((p, i) => (p === '…' ? (
              <span key={`e${i}`} className="px-1.5 text-sm text-slate-400">…</span>
            ) : (
              <button key={p} type="button" onClick={() => goPage(p)} aria-current={p === safePage ? 'page' : undefined}
                className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-medium transition ${p === safePage ? 'bg-forest text-white shadow' : 'text-slate-600 hover:bg-gray-100'}`}>{p}</button>
            )))}
            <button type="button" onClick={() => goPage(safePage + 1)} disabled={safePage === pages} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 hover:bg-gray-50 disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
          </nav>
        )}

        {/* Why Sellapage */}
        <section className="mt-14 overflow-hidden rounded-3xl bg-forest p-6 text-white sm:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-green-200"><Sparkles size={12} /> Why Sellapage?</p>
              <p className="mt-2 font-display text-2xl font-extrabold">More than just a marketplace.</p>
              <p className="mt-1.5 text-sm text-green-100/90">We connect you with Nigerian businesses you can trust, with smooth checkout and real support.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: ShieldCheck, t: 'Verified Stores', s: 'Look for the green tick' },
                { icon: CreditCard, t: 'Secure Payments', s: 'Handled by Paystack' },
                { icon: Package, t: 'Order Tracking', s: 'Follow your order' },
                { icon: Headphones, t: 'Real Support', s: "We're here for you" },
              ].map((x) => (
                <div key={x.t} className="text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-green-200 ring-1 ring-white/15"><x.icon size={20} /></span>
                  <p className="mt-2 text-[13px] font-semibold">{x.t}</p>
                  <p className="text-[11px] text-green-100/80">{x.s}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => { clearAll(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-forest hover:bg-green-50">Explore All Stores <ArrowRight size={14} /></button>
              <Link to="/register" className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-green-100 ring-1 ring-white/25 hover:bg-white/10">Open your own store, free</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
