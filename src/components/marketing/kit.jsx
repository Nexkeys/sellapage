// src/components/marketing/kit.jsx
//
// Pieces shared by the public Home and About pages (2026 redesign):
//   TractionStats   the live figures the team keeps up to date in Ops
//                   (Investors & Partners > Partners page figures, served by
//                   /api/partners-content). Hidden when they cannot load: a
//                   made-up or stale number is worse than none.
//   ReviewsCarousel approved reviews of Sellapage from real vendors (the Ops
//                   Reviews wall, /api/platform-reviews-public). Hidden when
//                   there are none yet.
//   Script, Leaf, Eyebrow  the handwriting, leaves and small labels in the design.
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Quote, Store, Package, Users, TrendingUp, MapPin, ShieldCheck } from 'lucide-react'
import { useInView } from '../../hooks/useInView'
import { formatAsOf } from '../../utils/partnersContent'

export function Eyebrow({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-md bg-forest-50 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-700 ring-1 ring-forest-100 ${className}`}>{children}</span>
}

/** Handwriting, as in the design ("Real People, Real Businesses"). */
export function Script({ children, className = '', as: Tag = 'p' }) {
  return <Tag className={`text-forest-700 ${className}`} style={{ fontFamily: '"Caveat", cursive', fontWeight: 600 }}>{children}</Tag>
}

/** A soft leaf, for corners and backgrounds. Decorative only. */
export function Leaf({ className = '', tone = 'text-forest-100' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 160" className={`pointer-events-none ${tone} ${className}`} fill="currentColor">
      <path d="M60 0C20 40 4 92 30 132c14 22 40 28 60 18C120 120 118 50 60 0Z" />
      <path d="M60 18c2 40 0 90-24 128" stroke="#fff" strokeOpacity=".55" strokeWidth="3" fill="none" />
    </svg>
  )
}

/** A number that counts up the first time it scrolls into view. Keeps any prefix/suffix ("148+", "₦18.4M"). */
function CountText({ value }) {
  const [ref, inView] = useInView()
  const m = /^(\D*)([\d,.]+)(.*)$/.exec(String(value || ''))
  const target = m ? Number(m[2].replace(/,/g, '')) : NaN
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView || !Number.isFinite(target)) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(target); return undefined }
    let raf = 0
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1100)
      setN(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target])
  if (!m || !Number.isFinite(target)) return <span ref={ref}>{value}</span>
  return <span ref={ref}>{m[1]}{n.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{m[3]}</span>
}

export function useTraction() {
  const [state, setState] = useState({ status: 'loading', stats: [], asOf: '' })
  useEffect(() => {
    let alive = true
    fetch('/api/partners-content')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return
        const stats = Array.isArray(d?.traction?.stats) ? d.traction.stats : []
        setState({ status: stats.length ? 'ready' : 'error', stats, asOf: d?.traction?.asOf || '' })
      })
      .catch(() => { if (alive) setState((s) => ({ ...s, status: 'error' })) })
    return () => { alive = false }
  }, [])
  return state
}

const STAT_ICONS = [Store, Package, Users, TrendingUp, MapPin, ShieldCheck]

/** The live figures as a row of tiles. `compact` drops the as-of line. */
export function TractionStats({ className = '', tileClass = '', compact = false }) {
  const { status, stats, asOf } = useTraction()
  if (status === 'error') return null
  const list = status === 'loading' ? Array.from({ length: 4 }, () => null) : stats.slice(0, 4)
  return (
    <div className={className}>
      <div className={`grid grid-cols-2 gap-3 ${list.length >= 4 ? 'lg:grid-cols-4' : list.length === 3 ? 'lg:grid-cols-3' : ''}`}>
        {list.map((s, i) => {
          const Icon = STAT_ICONS[i % STAT_ICONS.length]
          return (
            <div key={i} className={`flex min-w-0 items-center gap-3 ${tileClass}`}>
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-600/10 text-forest-600"><Icon size={20} /></span>
              {s ? (
                <span className="min-w-0">
                  <span className="block truncate font-display text-[20px] font-extrabold leading-tight text-gray-900 sm:text-[24px]"><CountText value={s.value} /></span>
                  <span className="block text-[12px] leading-snug text-gray-500">{s.label}</span>
                </span>
              ) : <span className="h-9 w-24 animate-pulse rounded-lg bg-forest-50" />}
            </div>
          )
        })}
      </div>
      {!compact && status === 'ready' && formatAsOf(asOf) && <p className="mt-3 text-[11px] text-gray-400">Figures as of {formatAsOf(asOf)}.</p>}
    </div>
  )
}

export function useApprovedReviews(limit = 12) {
  const [reviews, setReviews] = useState(null)
  useEffect(() => {
    let alive = true
    fetch(`/api/platform-reviews-public?action=list&limit=${limit}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) setReviews((d.reviews || []).filter((x) => String(x.reviewText || x.message || '').trim())) })
      .catch(() => { if (alive) setReviews([]) })
    return () => { alive = false }
  }, [limit])
  return reviews
}

const initials = (n) => String(n || 'S').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function ReviewCard({ r }) {
  const name = r.authorName || r.storeName || 'A Sellapage vendor'
  const store = r.storeName && r.storeName !== name ? r.storeName : ''
  const rating = Math.max(0, Math.min(5, Number(r.rating) || 0))
  return (
    <article className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 font-display text-sm font-extrabold text-forest-700">{initials(name)}</span>
        <Quote size={22} className="ml-auto text-forest-100" />
      </div>
      <p className="mt-4 line-clamp-5 flex-1 text-[14px] leading-relaxed text-gray-700">&ldquo;{String(r.reviewText || r.message).trim()}&rdquo;</p>
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="truncate text-[14px] font-bold text-gray-900">{name}</p>
        {store && <p className="truncate text-[12px] text-gray-500">{store}</p>}
        {rating > 0 && <p className="mt-1.5 flex items-center gap-0.5" aria-label={`${rating} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />)}<span className="ml-1.5 text-[12px] font-semibold text-gray-600">{rating.toFixed(1)}</span></p>}
      </div>
    </article>
  )
}

/** Real reviews, sliding sideways (swipe on a phone, arrows on a computer). */
export function ReviewsCarousel({ reviews }) {
  const track = useRef(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = () => {
    const el = track.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(() => { update() }, [reviews])
  const go = (dir) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' })
  }
  if (!reviews?.length) return null
  return (
    <div className="relative">
      <div ref={track} onScroll={update} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {reviews.map((r) => (
          <div key={r.id} className="w-[82%] flex-shrink-0 snap-start sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"><ReviewCard r={r} /></div>
        ))}
      </div>
      {reviews.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 sm:justify-end">
          <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label="Previous reviews" className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-forest-200 hover:text-forest-700 disabled:opacity-40"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label="More reviews" className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-forest-200 hover:text-forest-700 disabled:opacity-40"><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  )
}
