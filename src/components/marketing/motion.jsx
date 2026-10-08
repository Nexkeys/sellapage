// src/components/marketing/motion.jsx
//
// The moving product scenes on the public pages (2026-10-08 redesign).
//
// Everything here is drawn in code, not filmed: the dashboard, the phone, the
// journey and the feature cards are real Sellapage screens rebuilt in
// miniature, and they play out the way the product works (an SMS code at
// sign-up, Paystack at checkout, an order landing in the dashboard). That keeps
// them sharp at any size, light to load, and true to the product.
//
// The store in the scenes ("Ada's Closet") is an example, and the numbers in
// it are that example store's, never figures about Sellapage.
//
// How the motion works: each scene is a pure function of `t`, the time in ms
// since it started. useClock() advances t only while the scene is on screen,
// so nothing runs off screen, and with reduced motion on it is held at a
// finished frame instead of animating.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, ShoppingBag, Package, CalendarDays, Users, BarChart3, Megaphone, Bot, Bell, Search, Check, Shirt, Watch,
  Glasses, Footprints, ShoppingCart, Lock, Copy, Link2, Truck, MapPin, Sparkles, Store, Palette, Smartphone, Receipt, Star,
  CreditCard, Tag, Globe2, Wallet, UserPlus, Boxes, Calculator, BadgeCheck, PackageCheck, Clock3, Target, Activity,
} from 'lucide-react'
import { BrandIcon } from './brands'

// ─── Timing ──────────────────────────────────────────────────────────────────

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** True while the element is on screen (unlike useInView, it turns off again). */
export function useOnScreen(ref, rootMargin = '0px') {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') { setOn(true); return undefined }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return on
}

/**
 * Milliseconds of play time. Advances only while `running`; `restartKey`
 * resets it to 0. With reduced motion it returns `stillAt`, a finished frame.
 */
export function useClock(running, { restartKey, stillAt = 0, tick = 60 } = {}) {
  const [t, setT] = useState(0)
  const [reduced] = useState(prefersReducedMotion)
  // Restart from 0 when the key changes (set during render, React's
  // recommended way to reset state on a prop change).
  const [seenKey, setSeenKey] = useState(restartKey)
  if (seenKey !== restartKey) { setSeenKey(restartKey); setT(0) }
  useEffect(() => {
    if (!running || reduced) return undefined
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      setT((v) => v + Math.min(250, now - last))
      last = now
    }, tick)
    return () => clearInterval(id)
  }, [running, tick, restartKey, reduced])
  return reduced ? stillAt : t
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))
/** 0 to 1 between `a` and `b` ms, eased. */
const ease = (t, a, b) => { const p = clamp01((t - a) / (b - a)); return 1 - Math.pow(1 - p, 3) }
/** The first part of `text`, as if typed from `start` ms. */
const typed = (text, t, start, cps = 22) => text.slice(0, Math.max(0, Math.floor(((t - start) / 1000) * cps)))
const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`

/**
 * Draws its children at a fixed design size and scales the whole thing to fit
 * the width it is given, like an image. A phone gets the same composition as
 * a laptop, just smaller, instead of a squashed layout.
 */
export function ScaledStage({ width, height, className = '', children }) {
  const ref = useRef(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fit = () => setScale(Math.min(1, el.clientWidth / width))
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])
  return (
    <div ref={ref} className={`relative mx-auto w-full ${className}`} style={{ maxWidth: width, height: height * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>{children}</div>
    </div>
  )
}

/** A soft tap ripple, as a finger would leave. */
function Tap({ show, className = '' }) {
  if (!show) return null
  return <span className={`pointer-events-none absolute h-10 w-10 rounded-full bg-forest-600/40 animate-tap ${className}`} />
}

// ─── Example store ───────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: 'Ankara wrap dress', price: 24000, icon: Shirt, tint: 'from-amber-100 to-orange-50', ink: 'text-orange-500' },
  { name: 'Green court sneakers', price: 18500, icon: Footprints, tint: 'from-forest-100 to-forest-50', ink: 'text-forest-600' },
  { name: 'Gold-tone watch', price: 32000, icon: Watch, tint: 'from-sky-100 to-sky-50', ink: 'text-sky-600' },
  { name: 'Classic sunglasses', price: 9500, icon: Glasses, tint: 'from-rose-100 to-rose-50', ink: 'text-rose-500' },
]

const ORDER_FEED = [
  { id: 1043, who: 'Chiamaka O.', item: 'Green court sneakers', amount: 18500, via: 'Card' },
  { id: 1044, who: 'Tunde A.', item: 'Gold-tone watch', amount: 32000, via: 'Transfer' },
  { id: 1045, who: 'Blessing E.', item: 'Ankara wrap dress', amount: 24000, via: 'USSD' },
  { id: 1046, who: 'Ibrahim S.', item: 'Classic sunglasses', amount: 9500, via: 'Card' },
  { id: 1047, who: 'Ngozi K.', item: 'Ankara wrap dress', amount: 24000, via: 'Card' },
]

const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)

// ─── Hero: dashboard and phone, live ─────────────────────────────────────────

const HERO_LOOP = 6400 // one shopper's purchase on the phone
const SALE_AT = 4700 // the moment the payment succeeds, when the dashboard updates

function DashboardMock({ t }) {
  // A new order lands each loop, at the moment the phone's payment goes through.
  const sales = t >= SALE_AT ? Math.floor((t - SALE_AT) / HERO_LOOP) + 1 : 0
  const fresh = t >= SALE_AT && (t - SALE_AT) % HERO_LOOP < 2600
  const grow = ease(t, 0, 1400)
  const feed = Array.from({ length: 4 }, (_, i) => ORDER_FEED[(sales - i + ORDER_FEED.length * 50) % ORDER_FEED.length])
  const base = 184500
  const today = base + Array.from({ length: sales }, (_, i) => ORDER_FEED[(i + 1) % ORDER_FEED.length].amount).reduce((a, b) => a + b, 0)
  const bars = [42, 58, 36, 64, 50, 72, 61, 80, 68, 88, 74, 0]
  const lastBar = Math.min(96, 40 + sales * 9)
  const nav = [[LayoutDashboard, 'Overview'], [ShoppingBag, 'Orders'], [Package, 'Products'], [CalendarDays, 'Bookings'], [Users, 'Customers'], [BarChart3, 'Analytics'], [Megaphone, 'Marketing'], [Bot, 'Sella AI']]
  return (
    <div className="flex h-full w-full overflow-hidden rounded-[22px] border border-gray-200/80 bg-white shadow-[0_40px_80px_-30px_rgba(3,78,34,0.35)]">
      <aside className="flex w-[190px] flex-shrink-0 flex-col border-r border-gray-100 bg-[#fbfcfb] px-3 py-4">
        <div className="flex items-center gap-2 px-2"><img src="/og-image.png" alt="" className="h-7 w-7 rounded-lg" /><span className="font-display text-[15px] font-extrabold text-gray-900">Sellapage</span></div>
        <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick access</p>
        <ul className="mt-2 space-y-0.5">
          {nav.map(([I, label], i) => (
            <li key={label} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold ${i === 0 ? 'bg-forest-50 text-forest-700' : 'text-gray-500'}`}><I size={15} />{label}</li>
          ))}
        </ul>
        <div className="mt-auto rounded-2xl bg-forest p-3 text-white">
          <p className="text-[11px] font-bold">Ada&apos;s Closet</p>
          <p className="mt-0.5 text-[10px] text-white/70">sellapage.com.ng/adascloset</p>
        </div>
      </aside>
      <div className="relative min-w-0 flex-1 bg-[#fcfcfd] py-4 pl-6 pr-[92px]">
        <div className="flex items-center justify-between">
          <div><p className="text-[11px] text-gray-400">Good morning</p><p className="font-display text-[19px] font-extrabold text-gray-900">Hi Adaeze</p></div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-[11px] text-gray-400"><Search size={13} />Search orders</span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500"><Bell size={14} />{fresh && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-[11px] font-bold text-white">AO</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            ['Sales today', naira(today * grow), 'bg-forest-50', 'text-forest-700'],
            ['Orders', String(Math.round((23 + sales) * grow)), 'bg-sky-50', 'text-sky-700'],
            ['Store views', Math.round(1248 * grow + sales * 37).toLocaleString('en-NG'), 'bg-amber-50', 'text-amber-700'],
            ['New customers', String(Math.round((9 + sales) * grow)), 'bg-rose-50', 'text-rose-700'],
          ].map(([label, value, bg, ink], i) => (
            <div key={label} className={`rounded-2xl ${bg} px-3.5 py-3 transition-shadow duration-500 ${fresh && i < 2 ? 'shadow-[0_0_0_2px_rgba(11,107,53,0.35)]' : ''}`}>
              <p className={`font-display text-[19px] font-extrabold tabular-nums ${ink}`}>{value}</p>
              <p className="text-[10.5px] font-semibold text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1.35fr_1fr] gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-[12px] font-bold text-gray-800">Sales this year</p><span className="rounded-lg border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">2026</span></div>
            <div className="mt-3 flex h-[150px] items-end gap-2.5">
              {bars.map((h, i) => {
                const height = i === bars.length - 1 ? lastBar : h
                return (
                  <div key={i} className="flex h-full flex-1 items-end gap-0.5">
                    <span className="w-1/2 rounded-t-md bg-forest-600 transition-[height] duration-700 ease-out" style={{ height: `${height * grow}%` }} />
                    <span className="w-1/2 rounded-t-md bg-forest-200 transition-[height] duration-700 ease-out" style={{ height: `${height * 0.62 * grow}%` }} />
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-[9.5px] text-gray-400">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => <span key={i} className="flex-1 text-center">{m}</span>)}</div>
            <div className="mt-2 flex gap-4 text-[10px] text-gray-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-forest-600" />Online sales</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-forest-200" />Walk-in sales</span></div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-[12px] font-bold text-gray-800">Latest orders</p><span className="text-[10px] font-semibold text-forest-600">View all</span></div>
            <ul className="mt-2 space-y-1.5">
              {feed.map((o, i) => (
                <li key={`${o.id}-${sales}-${i}`} className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${i === 0 && fresh ? 'bg-forest-50 animate-rise' : ''}`}>
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">{initials(o.who)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-gray-800">{o.who}</span><span className="block truncate text-[10px] text-gray-400">#{o.id} · {o.item}</span></span>
                  <span className="text-right"><span className="block text-[11px] font-bold tabular-nums text-gray-900">{naira(o.amount)}</span><span className="inline-block rounded-full bg-forest-50 px-1.5 text-[9px] font-bold text-forest-700">Paid</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* The toast a vendor sees when an order is paid. */}
        <div className={`absolute right-[100px] top-14 flex items-center gap-2.5 rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 shadow-xl shadow-forest-900/10 transition-all duration-500 ${fresh ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={16} strokeWidth={3} /></span>
          <span><span className="block text-[11.5px] font-bold text-gray-900">New order #{ORDER_FEED[sales % ORDER_FEED.length].id}</span><span className="block text-[10px] text-gray-500">Paid with Paystack · receipt ready</span></span>
        </div>
      </div>
    </div>
  )
}

function PhoneShop({ t }) {
  const p = t % HERO_LOOP
  const pick = PRODUCTS[1]
  const tapped = p > 1100 && p < 2000
  const inCart = p > 1500 ? 1 : 0
  const sheet = p > 2200 && p < 6100
  const paying = p > 3500 && p < 4600
  const paid = p >= 4600 && p < 6100
  return (
    <div className="relative h-full w-full rounded-[38px] bg-gray-950 p-[9px] shadow-[0_40px_70px_-25px_rgba(2,58,25,0.55)]">
      <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-white">
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-bold text-gray-800"><span>9:41</span><span className="h-4 w-16 rounded-full bg-gray-950" /><span className="flex gap-0.5"><i className="h-2 w-1 rounded-sm bg-gray-800" /><i className="h-2.5 w-1 rounded-sm bg-gray-800" /><i className="h-3 w-1 rounded-sm bg-gray-800" /></span></div>
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-[11px] font-extrabold text-white">AC</span><span><span className="block text-[12px] font-extrabold text-gray-900">Ada&apos;s Closet</span><span className="flex items-center gap-0.5 text-[9px] text-gray-500"><Star size={9} className="fill-amber-400 text-amber-400" />4.9 · Lagos</span></span></div>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700"><ShoppingCart size={15} />{inCart > 0 && <span key={Math.floor(t / HERO_LOOP)} className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-forest-600 text-[9px] font-bold text-white animate-pop">{inCart}</span>}</span>
        </div>
        <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-forest to-forest-600 p-3 text-white">
          <p className="text-[9px] font-bold uppercase tracking-wider text-forest-100">New in</p>
          <p className="font-display text-[15px] font-extrabold leading-tight">Weekend picks,<br />delivered in Lagos</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
          {PRODUCTS.map((pr, i) => (
            <div key={pr.name} className="rounded-2xl border border-gray-100 p-1.5">
              <div className={`flex h-[78px] items-center justify-center rounded-xl bg-gradient-to-br ${pr.tint}`}><pr.icon size={30} className={pr.ink} /></div>
              <p className="mt-1.5 truncate px-0.5 text-[10px] font-semibold text-gray-700">{pr.name}</p>
              <div className="flex items-center justify-between px-0.5 pb-0.5">
                <span className="text-[10.5px] font-extrabold text-gray-900">{naira(pr.price)}</span>
                <span className={`relative flex h-6 w-6 items-center justify-center rounded-full ${i === 1 && inCart ? 'bg-forest-600 text-white' : 'bg-gray-900 text-white'}`}>
                  {i === 1 && inCart ? <Check size={12} strokeWidth={3} /> : <span className="text-[14px] leading-none">+</span>}
                  {i === 1 && <Tap show={tapped} className="-left-2 -top-2" />}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Checkout sheet */}
        <div className={`absolute inset-x-0 bottom-0 rounded-t-[26px] border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-out ${sheet ? 'translate-y-0' : 'translate-y-full'}`}>
          <span className="mx-auto block h-1 w-10 rounded-full bg-gray-200" />
          {paid ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-white animate-pop"><Check size={28} strokeWidth={3} /></span>
              <p className="mt-3 font-display text-[15px] font-extrabold text-gray-900">Payment successful</p>
              <p className="text-[10.5px] text-gray-500">{naira(pick.price + 1500)} paid · Order #{ORDER_FEED[(Math.floor(t / HERO_LOOP) + 0) % ORDER_FEED.length].id}</p>
              <p className="mt-2 rounded-full bg-forest-50 px-2.5 py-1 text-[9.5px] font-bold text-forest-700">Receipt ready to download</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-[12px] font-extrabold text-gray-900">Checkout</p>
              <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-gray-50 p-2">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${pick.tint}`}><pick.icon size={18} className={pick.ink} /></span>
                <span className="flex-1"><span className="block text-[10.5px] font-bold text-gray-800">{pick.name}</span><span className="block text-[9.5px] text-gray-500">Size 42 · Qty 1</span></span>
                <span className="text-[10.5px] font-extrabold">{naira(pick.price)}</span>
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-gray-500">
                <p className="flex justify-between"><span>Delivery (Lekki)</span><span>{naira(1500)}</span></p>
                <p className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{naira(pick.price + 1500)}</span></p>
              </div>
              <div className="relative mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-forest text-[11.5px] font-bold text-white">
                {paying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <><Lock size={12} />Pay with Paystack</>}
                <Tap show={p > 3300 && p < 4100} className="left-1/2 top-0" />
              </div>
              <p className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-gray-400"><BrandIcon name="paystack" size={10} />Card, bank transfer or USSD</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The hero: the vendor's dashboard and a shopper's phone, side by side, and
 * the phone's purchase lands in the dashboard as it happens. It starts tilted
 * back in 3D and settles flat as the visitor scrolls into it.
 */
export function HeroStage() {
  const box = useRef(null)
  const onScreen = useOnScreen(box)
  const t = useClock(onScreen, { stillAt: SALE_AT + 900 })
  const [tilt, setTilt] = useState(() => (prefersReducedMotion() ? 0 : 14))
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = box.current
        if (!el) return
        const top = el.getBoundingClientRect().top
        const vh = window.innerHeight || 800
        setTilt(Math.max(0, Math.min(14, ((top - vh * 0.18) / (vh * 0.6)) * 14)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])
  return (
    <div ref={box} className="relative" style={{ perspective: '2200px' }}>
      <div className="transition-transform duration-200 ease-out will-change-transform" style={{ transform: `rotateX(${tilt}deg) scale(${1 - tilt * 0.004})`, transformOrigin: '50% 100%' }}>
        <div className="hidden md:block">
          <ScaledStage width={1180} height={640}>
            <div className="absolute left-0 top-0 h-[600px] w-[960px]"><DashboardMock t={t} /></div>
            <div className="absolute right-0 top-[36px] h-[600px] w-[292px]"><PhoneShop t={t} /></div>
          </ScaledStage>
        </div>
        {/* Phones: the same scene cropped closer, the shop in front. */}
        <div className="md:hidden">
          <ScaledStage width={640} height={620}>
            <div className="absolute left-0 top-0 h-[560px] w-[520px] overflow-hidden rounded-[22px]"><div className="h-[560px] w-[960px]"><DashboardMock t={t} /></div></div>
            <div className="absolute right-0 top-[40px] h-[580px] w-[282px]"><PhoneShop t={t} /></div>
          </ScaledStage>
        </div>
      </div>
    </div>
  )
}

// ─── Feature strip ───────────────────────────────────────────────────────────

const STRIP_A = [
  [Store, 'Online store'], [CreditCard, 'Paystack checkout'], [CalendarDays, 'Bookings'], [Truck, 'Delivery booking'], [Users, 'Customer records'],
  [Receipt, 'Receipts'], [Tag, 'Discount codes'], [Star, 'Verified reviews'], [Globe2, 'Custom domain'],
]
const STRIP_B = [
  [Bot, 'Sella AI assistant'], [BarChart3, 'Analytics'], [Search, 'Google listings'], [Wallet, 'Payouts to your bank'], [UserPlus, 'Team accounts'],
  [Boxes, 'Stock counts'], [Calculator, 'Sales ledger'], [Megaphone, 'Marketing kit'], [Smartphone, 'Android app'],
]

function StripRow({ items, reverse }) {
  const list = [...items, ...items]
  return (
    <div className="flex w-max gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animation: `marquee 52s linear infinite${reverse ? ' reverse' : ''}` }}>
      {list.map(([I, label], i) => (
        <span key={i} aria-hidden={i >= items.length} className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-gray-100 bg-white px-4 py-3 text-[13.5px] font-semibold text-gray-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-50 text-forest-600"><I size={15} /></span>{label}
        </span>
      ))}
    </div>
  )
}

/** Two rows of features drifting in opposite directions (pauses on hover). */
export function FeatureStrip() {
  return (
    <div className="relative space-y-3 overflow-hidden py-1 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <StripRow items={STRIP_A} />
      <StripRow items={STRIP_B} reverse />
    </div>
  )
}

// ─── The journey: sign up to growing ─────────────────────────────────────────

export const JOURNEY = [
  { id: 'signup', icon: UserPlus, title: 'Sign up', sub: 'Your business name and phone number. We text you a code.' },
  { id: 'setup', icon: Palette, title: 'Set up your store', sub: 'Pick a look, add your logo, and your link is ready.' },
  { id: 'products', icon: Package, title: 'Add what you sell', sub: 'Products or services, with photos, prices and stock. Sella can write the description.' },
  { id: 'share', icon: Link2, title: 'Share your link', sub: 'On WhatsApp, Instagram, TikTok, X, or a flyer.' },
  { id: 'paid', icon: CreditCard, title: 'Get paid', sub: 'Customers pay by card, transfer or USSD. The order and receipt create themselves.' },
  { id: 'grow', icon: Activity, title: 'Deliver and grow', sub: 'Book delivery, track sales, and let Sella tell you what to do next.' },
]
export const JOURNEY_STEP_MS = 5600

function Field({ label, value, caret, done }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <div className={`mt-1 flex h-10 items-center rounded-xl border px-3 text-[13px] font-semibold text-gray-900 ${caret ? 'border-forest-600 ring-4 ring-forest-600/10' : 'border-gray-200'}`}>
        {value}{caret && <span className="ml-0.5 h-4 w-[2px] animate-pulse bg-forest-600" />}
        {done && <Check size={15} className="ml-auto text-forest-600" strokeWidth={3} />}
      </div>
    </div>
  )
}

function SceneSignup({ t }) {
  const name = typed("Ada's Closet", t, 300, 16)
  const phone = typed('0803 412 4521', t, 1300, 16)
  const sent = t > 2500
  const code = '482915'
  const filled = Math.max(0, Math.min(6, Math.floor((t - 3000) / 220)))
  const verified = t > 4500
  return (
    <div className="mx-auto w-[400px] rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/60">
      <p className="font-display text-[20px] font-extrabold text-gray-900">Create your free account</p>
      <p className="text-[12px] text-gray-500">Start selling in minutes.</p>
      <div className="mt-4 space-y-3">
        <Field label="Business name" value={name} caret={t > 300 && t < 1300} done={t >= 1300} />
        <Field label="Phone number" value={phone} caret={t >= 1300 && t < 2500} done={sent} />
      </div>
      <div className={`mt-4 overflow-hidden transition-all duration-500 ${sent ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-[11.5px] text-gray-500">Enter the 6-digit code we sent by SMS</p>
        <div className="mt-2 flex gap-2">
          {code.split('').map((d, i) => (
            <span key={i} className={`flex h-11 w-11 items-center justify-center rounded-xl border text-[17px] font-extrabold ${i < filled ? 'border-forest-600 bg-forest-50 text-forest-700' : 'border-gray-200 text-transparent'}`}>{i < filled ? d : '0'}</span>
          ))}
        </div>
      </div>
      <div className={`mt-4 flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white transition-colors duration-300 ${verified ? 'bg-forest-600' : 'bg-forest'}`}>
        {verified ? <><BadgeCheck size={17} />Phone verified, welcome in</> : 'Continue'}
      </div>
    </div>
  )
}

const THEMES = [
  { name: 'Forest', a: 'bg-forest', b: 'bg-forest-50' },
  { name: 'Sunset', a: 'bg-orange-500', b: 'bg-orange-50' },
  { name: 'Midnight', a: 'bg-slate-900', b: 'bg-slate-100' },
]

function SceneSetup({ t }) {
  const pick = t < 1400 ? 0 : t < 2600 ? 1 : 2
  const th = THEMES[pick]
  const logo = t > 3200
  const link = typed('sellapage.com.ng/adascloset', t, 3700, 30)
  return (
    <div className="mx-auto grid w-[620px] grid-cols-[200px_1fr] gap-5">
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/60">
        <p className="text-[12px] font-bold text-gray-800">Choose a theme</p>
        <div className="mt-3 space-y-2">
          {THEMES.map((x, i) => (
            <div key={x.name} className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${i === pick ? 'border-forest-600 bg-forest-50' : 'border-gray-100'}`}>
              <span className={`h-8 w-8 rounded-lg ${x.a}`} /><span className="text-[12px] font-semibold text-gray-700">{x.name}</span>
              {i === pick && <Check size={14} className="ml-auto text-forest-600" strokeWidth={3} />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] font-bold text-gray-800">Logo</p>
        <div className="mt-2 flex h-14 items-center justify-center rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-400">
          {logo ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-[12px] font-extrabold text-white animate-pop">AC</span> : 'Upload'}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60">
        <div className={`h-24 transition-colors duration-500 ${th.a}`} />
        <div className="-mt-7 px-5">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-white text-[14px] font-extrabold text-white transition-colors duration-500 ${logo ? 'bg-gray-900' : 'bg-gray-200'}`}>{logo ? 'AC' : ''}</span>
          <p className="mt-2 font-display text-[18px] font-extrabold text-gray-900">Ada&apos;s Closet</p>
          <p className="text-[11px] text-gray-500">Fashion · Lagos</p>
          <div className="mt-3 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <span key={i} className={`h-16 rounded-xl transition-colors duration-500 ${th.b}`} />)}</div>
          <div className={`mb-5 mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-500 ${t > 3700 ? 'border-forest-200 bg-forest-50' : 'border-gray-100'}`}>
            <Link2 size={14} className="text-forest-600" /><span className="text-[12px] font-semibold text-gray-800">{link || 'Your link'}</span>
            {t > 4700 && <span className="ml-auto rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pop">Live</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneProducts({ t }) {
  const photo = t > 500
  const name = typed('Green court sneakers', t, 900, 20)
  const price = typed('18,500', t, 2000, 14)
  const stock = t > 2600 ? '12' : ''
  const aiOn = t > 3100
  const desc = typed('Clean, all-day sneakers in leather with a cushioned sole. True to size, sizes 39 to 45.', t, 3300, 46)
  const saved = t > 5000
  return (
    <div className="mx-auto grid w-[620px] grid-cols-[190px_1fr] gap-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60">
      <div>
        <div className="flex h-[190px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
          {photo ? <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-forest-100 to-forest-50 animate-pop"><Footprints size={64} className="text-forest-600" /></div> : <span className="text-[11px] text-gray-400">Add photos</span>}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-12 rounded-lg ${photo && i < 2 ? 'bg-forest-50' : 'bg-gray-50'}`} />)}</div>
      </div>
      <div className="space-y-3">
        <Field label="Product name" value={name} caret={t > 900 && t < 2000} />
        <div className="grid grid-cols-2 gap-3"><Field label="Price (₦)" value={price} caret={t >= 2000 && t < 2600} /><Field label="In stock" value={stock} /></div>
        <div>
          <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-gray-500">Description</p><span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-colors ${aiOn ? 'bg-forest-600 text-white' : 'bg-forest-50 text-forest-700'}`}><Sparkles size={11} />Write with AI</span></div>
          <div className="mt-1 h-[68px] rounded-xl border border-gray-200 p-2.5 text-[11.5px] leading-snug text-gray-700">{desc}{aiOn && t < 5000 && <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-forest-600 align-middle" />}</div>
        </div>
        <div className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[12.5px] font-bold text-white transition-colors ${saved ? 'bg-forest-600' : 'bg-forest'}`}>{saved ? <><Check size={15} strokeWidth={3} />Published to your store</> : 'Publish product'}</div>
      </div>
    </div>
  )
}

const SHARE_TO = [
  { name: 'whatsapp', label: 'WhatsApp status', x: -230, y: -95 },
  { name: 'instagram', label: 'Instagram bio', x: 230, y: -95 },
  { name: 'tiktok', label: 'TikTok', x: -230, y: 95 },
  { name: 'x', label: 'X', x: 230, y: 95 },
]

function SceneShare({ t }) {
  const copied = t > 1000
  return (
    <div className="relative mx-auto flex h-[320px] w-[640px] items-center justify-center">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 320" aria-hidden="true">
        {SHARE_TO.map((s, i) => {
          const on = t > 1500 + i * 450
          return <line key={s.name} x1="320" y1="160" x2={320 + s.x} y2={160 + s.y} stroke={on ? '#0b6b35' : '#d5f1e1'} strokeWidth="2" strokeDasharray="5 5" className={on ? 'animate-dash-flow' : ''} />
        })}
      </svg>
      <div className="relative z-10 rounded-3xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/60">
        <p className="text-[11px] font-semibold text-gray-500">Your store link</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2.5">
          <Link2 size={15} className="text-forest-600" /><span className="text-[13px] font-bold text-gray-900">sellapage.com.ng/adascloset</span>
          <span className={`relative ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition-colors ${copied ? 'bg-forest-600 text-white' : 'bg-white text-gray-700'}`}>{copied ? <><Check size={12} strokeWidth={3} />Copied</> : <><Copy size={12} />Copy</>}<Tap show={t > 700 && t < 1500} className="-left-1 -top-2" /></span>
        </div>
      </div>
      {SHARE_TO.map((s, i) => {
        const on = t > 1500 + i * 450
        return (
          <div key={s.name} className={`absolute flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-lg transition-all duration-500 ${on ? 'scale-100 border-forest-100 opacity-100' : 'scale-75 border-gray-100 opacity-40'}`} style={{ left: 320 + s.x - 70, top: 160 + s.y - 20, width: 140 }}>
            <BrandIcon name={s.name} size={20} /><span className="text-[11.5px] font-bold text-gray-800">{s.label}</span>
            {on && <Check size={13} className="ml-auto text-forest-600 animate-pop" strokeWidth={3} />}
          </div>
        )
      })}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3.5 py-1.5 text-[11px] font-bold text-white transition-all duration-500 ${t > 3700 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>4 people are viewing your store</div>
    </div>
  )
}

function ScenePaid({ t }) {
  const paying = t > 1300 && t < 2400
  const paid = t >= 2400
  const order = t > 3000
  const receipt = t > 3900
  return (
    <div className="mx-auto grid w-[640px] grid-cols-2 items-start gap-5">
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60">
        <p className="text-[11px] font-semibold text-gray-500">Customer checkout</p>
        <p className="mt-0.5 font-display text-[22px] font-extrabold text-gray-900">{naira(20000)}</p>
        <div className="mt-3 space-y-2">
          {[['Card', CreditCard], ['Bank transfer', Wallet], ['USSD', Smartphone]].map(([m, I], i) => (
            <div key={m} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[12px] font-semibold ${i === 0 ? 'border-forest-600 bg-forest-50 text-forest-700' : 'border-gray-100 text-gray-600'}`}><I size={15} />{m}</div>
          ))}
        </div>
        <div className="relative mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#011B33] text-[12.5px] font-bold text-white">
          {paid ? <><Check size={15} strokeWidth={3} />Paid</> : paying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <><BrandIcon name="paystack" size={14} color="#fff" />Pay with Paystack</>}
          <Tap show={t > 900 && t < 1700} className="left-1/2 top-0" />
        </div>
      </div>
      <div className="space-y-3">
        <div className={`rounded-3xl border border-forest-100 bg-white p-4 shadow-xl shadow-forest-900/10 transition-all duration-500 ${order ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-white"><ShoppingBag size={16} /></span><span><span className="block text-[12.5px] font-bold text-gray-900">Order #1043 created</span><span className="block text-[11px] text-gray-500">Chiamaka O. · Green court sneakers</span></span></div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-forest-50 px-3 py-2 text-[11px]"><span className="font-semibold text-forest-700">Paid · settles to your bank</span><span className="font-extrabold tabular-nums text-gray-900">{naira(20000)}</span></div>
        </div>
        <div className={`overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 transition-all duration-700 ${receipt ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900"><Receipt size={14} className="text-forest-600" />Receipt</span><span className="text-[10px] text-gray-400">SP-1043</span></div>
            <div className="mt-2 space-y-1 border-t border-dashed border-gray-200 pt-2 text-[10.5px] text-gray-600"><p className="flex justify-between"><span>Green court sneakers</span><span>{naira(18500)}</span></p><p className="flex justify-between"><span>Delivery</span><span>{naira(1500)}</span></p><p className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{naira(20000)}</span></p></div>
            <p className="mt-2 text-[10px] font-semibold text-forest-700">Ready for the customer to download</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneGrow({ t }) {
  const stage = t < 900 ? 0 : t < 1800 ? 1 : 2
  const draw = ease(t, 600, 3000)
  const ai = typed('Your sneakers sold out 3 times faster this week. Restock 10 pairs before Friday?', t, 3000, 40)
  return (
    <div className="mx-auto grid w-[640px] grid-cols-[1fr_1.1fr] gap-5">
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60">
        <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900"><Truck size={15} className="text-forest-600" />Delivery</span><span className="text-[10px] text-gray-400">Sendbox</span></div>
        <ol className="mt-4 space-y-4">
          {['Picked up from Yaba', 'On the way', 'Delivered in Lekki'].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500 ${i <= stage ? 'bg-forest-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i < stage || (i === 2 && stage === 2) ? <Check size={13} strokeWidth={3} /> : i === 0 ? <PackageCheck size={13} /> : i === 1 ? <Truck size={13} /> : <MapPin size={13} />}</span>
              <span className={`text-[12px] font-semibold ${i <= stage ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/60">
          <div className="flex items-center justify-between"><p className="text-[12px] font-bold text-gray-900">Sales, last 30 days</p><span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold text-forest-700">Trending up</span></div>
          <svg viewBox="0 0 300 90" className="mt-2 h-[90px] w-full" aria-hidden="true">
            <defs><linearGradient id="grow-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0b6b35" stopOpacity=".18" /><stop offset="1" stopColor="#0b6b35" stopOpacity="0" /></linearGradient></defs>
            <path d="M0 78 C30 74 45 64 70 66 S110 50 135 52 175 34 200 38 245 16 300 10 L300 90 L0 90Z" fill="url(#grow-fill)" opacity={draw} />
            <path d="M0 78 C30 74 45 64 70 66 S110 50 135 52 175 34 200 38 245 16 300 10" fill="none" stroke="#0b6b35" strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
          </svg>
        </div>
        <div className="rounded-3xl bg-forest p-4 text-white shadow-xl shadow-forest-900/20">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-forest-100"><Bot size={14} />Sella</p>
          <p className="mt-1.5 min-h-[48px] text-[12.5px] leading-snug">{ai}</p>
        </div>
      </div>
    </div>
  )
}

const SCENES = { signup: SceneSignup, setup: SceneSetup, products: SceneProducts, share: SceneShare, paid: ScenePaid, grow: SceneGrow }

/** One step of the journey, drawn on a soft stage that keeps its size. */
const SCENE_WIDTH = { signup: 440, setup: 660, products: 660, share: 680, paid: 680, grow: 680 }

export function JourneyScene({ step, t }) {
  const id = JOURNEY[step].id
  const Scene = SCENES[id]
  const w = SCENE_WIDTH[id] || 700
  return (
    <div className="flex min-h-[200px] items-center sm:min-h-[380px]">
      <ScaledStage key={step} width={w} height={id === 'share' ? 340 : 400}>
        <div className="flex h-full w-full items-center justify-center animate-in fade-in zoom-in-95 duration-500"><Scene t={t} /></div>
      </ScaledStage>
    </div>
  )
}

// ─── Small live visuals for the feature cards ────────────────────────────────

/** Orders arriving one after another. */
export function OrdersVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 2400 })
  const n = Math.floor(t / 2200)
  const rows = Array.from({ length: 3 }, (_, i) => ORDER_FEED[(n - i + 100) % ORDER_FEED.length])
  return (
    <div ref={box} className="space-y-2">
      {rows.map((o, i) => (
        <div key={`${o.id}-${n}`} className={`flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100 ${i === 0 ? 'animate-rise' : ''}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-50 text-[11px] font-bold text-forest-700">{initials(o.who)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-gray-800">{o.who}</span><span className="block truncate text-[10.5px] text-gray-400">#{o.id} · {o.via}</span></span>
          <span className="text-right text-[12px] font-extrabold tabular-nums text-gray-900">{naira(o.amount)}<span className="block text-[9.5px] font-bold text-forest-600">Paid</span></span>
        </div>
      ))}
    </div>
  )
}

/** A week of appointments filling up. */
export function BookingsVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 8000 })
  // Fills one slot at a time, holds the full week for a beat, then starts again.
  const slots = [[0, 1], [1, 0], [2, 2], [3, 1], [4, 0], [1, 2], [3, 0], [0, 2], [4, 1]]
  const shown = t % 9000 < 6200 ? Math.min(9, Math.floor((t % 9000) / 650)) : 9
  return (
    <div ref={box} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
      <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold text-gray-400">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 15 }, (_, i) => {
          const col = i % 5
          const row = Math.floor(i / 5)
          const k = slots.findIndex(([c, r]) => c === col && r === row)
          const on = k > -1 && k < shown
          return <span key={i} className={`h-7 rounded-lg transition-all duration-300 ${on ? 'scale-100 bg-forest-600' : 'scale-95 bg-gray-50'}`} />
        })}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-600"><Clock3 size={12} className="text-forest-600" />{shown} appointments this week</p>
    </div>
  )
}

/** A Google result climbing as the store's information gets filled in. */
export function SearchVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 3000 })
  const up = (t % 7000) > 1800
  const rows = [
    { title: 'Sneakers in Lagos | Shop online', site: 'lagoskicks.com', you: false },
    { title: "Ada's Closet | Fashion in Lagos", site: 'sellapage.com.ng/adascloset', you: true },
    { title: 'Buy sneakers online in Nigeria', site: 'shoe-market.ng', you: false },
  ]
  const order = up ? [1, 0, 2] : [0, 1, 2]
  return (
    <div ref={box} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-500"><BrandIcon name="google" size={12} />sneakers in lagos</div>
      <div className="relative mt-2 h-[138px]">
        {rows.map((r, i) => (
          <div key={r.site} className={`absolute inset-x-0 rounded-xl px-2.5 py-1.5 transition-all duration-700 ${r.you ? 'bg-forest-50 ring-1 ring-forest-100' : ''}`} style={{ top: order.indexOf(i) * 46 }}>
            <p className="truncate text-[9.5px] text-gray-500">{r.site}</p>
            <p className={`truncate text-[12px] font-semibold ${r.you ? 'text-forest-700' : 'text-[#1a0dab]'}`}>{r.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Sella answering a question about the business. */
export function SellaVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 8000 })
  const p = t % 9000
  const q = typed('How did I do this week?', p, 200, 24)
  const a = typed('Sales are up 18% on last week. Your Ankara wrap dress is the best seller, and 3 customers are waiting for a reply.', p, 1600, 42)
  return (
    <div ref={box} className="space-y-2">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-3 py-2 text-[12px] text-white">{q || ' '}</p>
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Bot size={14} /></span>
        <p className="min-h-[58px] rounded-2xl rounded-tl-md bg-white px-3 py-2 text-[12px] leading-snug text-gray-700 shadow-sm ring-1 ring-gray-100">{a || <span className="inline-flex gap-1 py-1">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: `${i * 120}ms` }} />)}</span>}</p>
      </div>
    </div>
  )
}

/** A receipt printing out. */
export function ReceiptVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 3000 })
  const out = ease(t % 6000, 200, 1800)
  return (
    <div ref={box} className="relative mx-auto w-[210px]">
      <div className="relative z-10 h-3 rounded-full bg-gray-800" />
      <div className="-mt-1.5 overflow-hidden px-2">
        <div className="rounded-b-xl bg-white px-3 pb-3 pt-3 shadow-md ring-1 ring-gray-100 transition-transform" style={{ transform: `translateY(${(out - 1) * 100}%)` }}>
          <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-gray-900">Ada&apos;s Closet</span><span className="text-[9px] text-gray-400">SP-1043</span></div>
          <div className="mt-2 space-y-1 border-t border-dashed border-gray-200 pt-2 text-[10px] text-gray-600">
            <p className="flex justify-between"><span>Ankara wrap dress</span><span>{naira(24000)}</span></p>
            <p className="flex justify-between"><span>Delivery</span><span>{naira(1500)}</span></p>
            <p className="flex justify-between border-t border-dashed border-gray-200 pt-1 font-bold text-gray-900"><span>Total</span><span>{naira(25500)}</span></p>
          </div>
          <p className="mt-2 rounded-md bg-forest-50 py-1 text-center text-[9.5px] font-bold text-forest-700">Paid · Thank you</p>
        </div>
      </div>
    </div>
  )
}

/** Customer records sorting by spend. */
export function CustomersVisual() {
  const box = useRef(null)
  const t = useClock(useOnScreen(box), { stillAt: 3000 })
  const sorted = (t % 6000) > 2000
  const people = [
    { n: 'Tunde Adeyemi', s: 64000, o: 3 },
    { n: 'Chiamaka Obi', s: 142500, o: 7 },
    { n: 'Blessing Eze', s: 48000, o: 2 },
  ]
  const order = sorted ? [1, 0, 2] : [0, 1, 2]
  return (
    <div ref={box} className="relative h-[150px]">
      {people.map((c, i) => (
        <div key={c.n} className="absolute inset-x-0 flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-gray-100 transition-all duration-700" style={{ top: order.indexOf(i) * 50 }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">{initials(c.n)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-gray-800">{c.n}</span><span className="block text-[10.5px] text-gray-400">{c.o} orders</span></span>
          <span className="text-[12px] font-extrabold tabular-nums text-gray-900">{naira(c.s)}</span>
          {i === 1 && sorted && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-700 animate-pop">Top</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Orbit (photo with features circling it) ─────────────────────────────────

/**
 * A dashed ellipse with icon chips riding around it, laid over a photo. The
 * ring turns slowly; each chip counter-turns so it stays upright.
 */
export function Orbit({ items, className = '', size = 360, tilt = 0.42 }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ width: size, height: size * tilt }} aria-hidden="true">
      <div className="absolute inset-0 rounded-[50%] border-2 border-dashed border-forest-600/40" />
      <div className="absolute inset-0" style={{ transform: `scaleY(${tilt})` }}>
        <div className="absolute inset-0 animate-orbit motion-reduce:animate-none" style={{ height: size, top: '50%', marginTop: -size / 2 }}>
          {items.map((it, i) => {
            const a = (i / items.length) * Math.PI * 2
            return (
              <span key={i} className="absolute" style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` }}>
                <span className="block animate-orbit-reverse motion-reduce:animate-none">
                  <span className="block -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%,-50%) scaleY(${1 / tilt})` }}>
                    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2 text-[11.5px] font-bold text-gray-800 shadow-lg shadow-gray-900/10"><it.icon size={14} className="text-forest-600" />{it.label}</span>
                  </span>
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Connected platforms ─────────────────────────────────────────────────────

/** What each one does in Sellapage. Only real, working connections. */
export const PLATFORMS = [
  { key: 'paystack', label: 'Paystack', job: 'Payments and payouts', side: 'l' },
  { key: 'sendbox', label: 'Sendbox', job: 'Rates, booking, tracking', side: 'l', icon: Truck },
  { key: 'topship', label: 'Topship', job: 'Local and international', side: 'l', icon: PackageCheck },
  { key: 'whatsapp', label: 'WhatsApp', job: 'Orders and receipts', side: 'l' },
  { key: 'google', label: 'Google Search', job: 'Your store on search', side: 'l' },
  { key: 'googlemaps', label: 'Google Maps', job: 'Be found nearby', side: 'r' },
  { key: 'googleads', label: 'Google Ads', job: 'Run and track ads', side: 'r' },
  { key: 'shopping', label: 'Google Shopping', job: 'Product listings', side: 'r', icon: ShoppingBag },
  { key: 'meta', label: 'Meta Pixel', job: 'Facebook, Instagram ads', side: 'r' },
  { key: 'tiktok', label: 'TikTok', job: 'Pixel and account', side: 'r' },
]

function PlatformTile({ p, compact }) {
  return (
    <div className={`relative flex items-center rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_-12px_rgba(16,24,40,0.18)] ${compact ? 'gap-2 px-2.5 py-2.5' : 'w-[240px] gap-3 px-3.5 py-3'}`}>
      <span className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        {p.icon ? <p.icon size={20} className="text-forest-600" /> : <BrandIcon name={p.key} size={20} title={p.label} />}
      </span>
      <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-gray-900">{p.label}</span><span className={`truncate text-[11px] text-gray-500 ${compact ? 'hidden min-[480px]:block' : 'block'}`}>{p.job}</span></span>
      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-forest-600 ring-2 ring-white" />
    </div>
  )
}

/**
 * Sellapage in the middle, the services it works with on either side, and
 * data pulsing along the lines between them. On a phone it becomes a grid.
 */
export function PlatformsDiagram() {
  const left = PLATFORMS.filter((p) => p.side === 'l')
  const right = PLATFORMS.filter((p) => p.side === 'r')
  const W = 1100
  const H = 520
  const rowY = (i) => 52 + i * 104
  const curve = (x1, y1, x2, y2) => `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`
  return (
    <>
      <div className="hidden md:block">
        <ScaledStage width={W} height={H}>
          <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {[...left.map((_, i) => curve(240, rowY(i), 470, H / 2)), ...right.map((_, i) => curve(W - 240, rowY(i), W - 470, H / 2))].map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="#d5f1e1" strokeWidth="2" />
                <path d={d} fill="none" stroke="#0b6b35" strokeOpacity=".35" strokeWidth="2" strokeDasharray="4 16" className="animate-dash-flow motion-reduce:animate-none" />
                <circle r="4" fill="#0b6b35">
                  <animateMotion dur={`${2.6 + (i % 4) * 0.5}s`} begin={`${(i * 0.37) % 2}s`} repeatCount="indefinite" path={d} keyPoints={i < left.length ? '0;1' : '1;0'} keyTimes="0;1" calcMode="linear" />
                </circle>
              </g>
            ))}
          </svg>
          {left.map((p, i) => <div key={p.key} className="absolute left-0" style={{ top: rowY(i) - 33 }}><PlatformTile p={p} /></div>)}
          {right.map((p, i) => <div key={p.key} className="absolute right-0" style={{ top: rowY(i) - 33 }}><PlatformTile p={p} /></div>)}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="absolute inset-0 -m-6 animate-ping rounded-full bg-forest-600/10 [animation-duration:2.6s]" />
            <div className="relative flex h-[170px] w-[170px] items-center justify-center rounded-full border-[14px] border-forest bg-forest-50 shadow-2xl shadow-forest-900/20">
              <img src="/og-image.png" alt="Sellapage" className="h-20 w-20 rounded-2xl" />
            </div>
          </div>
        </ScaledStage>
      </div>
      <div className="md:hidden">
        <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-forest bg-forest-50 shadow-xl shadow-forest-900/20">
          <span className="absolute inset-0 -m-4 animate-ping rounded-full bg-forest-600/10 [animation-duration:2.6s]" />
          <img src="/og-image.png" alt="Sellapage" className="h-12 w-12 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">{PLATFORMS.map((p) => <PlatformTile key={p.key} p={p} compact />)}</div>
      </div>
    </>
  )
}

// ─── Feature constellation (closing call to action) ──────────────────────────

// [icon, label, x %, y %]: kept inside 8 to 92 so nothing is clipped, and
// clear of the centred headline and button.
export const CONSTELLATION = [
  [Store, 'Online store', 9, 18], [CreditCard, 'Payments', 28, 11], [Globe2, 'Custom domain', 50, 12], [UserPlus, 'Team accounts', 72, 11], [Receipt, 'Receipts', 91, 18],
  [BarChart3, 'Analytics', 13, 50], [Truck, 'Delivery', 87, 50], [Tag, 'Discounts', 9, 82], [Users, 'Customers', 29, 88], [CalendarDays, 'Bookings', 71, 88],
  [Bot, 'Sella AI', 91, 82], [Target, 'Google Ads', 50, 92], [Boxes, 'Stock counts', 22, 32], [Star, 'Reviews', 78, 32],
]

/** The hero's shopper phone on its own, playing its purchase loop. */
export function ShopPhoneLive() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: SALE_AT + 900 })
  return (
    <div ref={ref}>
      <ScaledStage width={292} height={600}>
        <div className="h-[600px] w-[292px]"><PhoneShop t={t} /></div>
      </ScaledStage>
    </div>
  )
}
