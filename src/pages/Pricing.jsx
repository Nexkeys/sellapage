// src/pages/Pricing.jsx
//
// Pricing, rebuilt 2026-10-08 in the style of the new Home and About.
//
//   1. A plan finder: tick what the business needs and the right plan lights up
//      (each need maps to the plan that actually unlocks it in the code).
//   2. Four plan cards. Prices count to their new value when the billing period
//      changes; the plan lists come from utils/billingPlans.js, the same lists
//      the dashboard Billing tab shows, checked against the code that enforces
//      them.
//   3. "Keep every naira": Sellapage takes no cut (create-subaccount.js sets
//      percentage_charge: 0) and the customer covers the payment fee at
//      checkout (checkout-initialize.js adds it to the total), so the vendor
//      receives the full price. A slider shows that against a commission.
//   4. One comparison table, sticky plan headers, scrolls sideways on a phone.
//   5. FAQ and a closing call to action.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check, ArrowRight, Minus, ChevronDown, Sparkles, Store, Rocket, Crown, Leaf as LeafIcon, Package, BarChart3, Search, CreditCard,
  CalendarDays, Truck, Users, Globe2, UserPlus, Bot, Gift, Target, ShieldCheck, BadgePercent, Lock, RefreshCcw,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import {
  PLAN_PERIODS, PLAN_PRICES, PLAN_FEATURES, STARTER_FEATURES, PLAN_TAGLINES, formatPrice, getMonthlyEquivalent, getSavingsPercent,
} from '../utils/billingPlans'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script } from '../components/marketing/kit'

const ORDER = ['starter', 'growth', 'pro', 'premium']

const PLANS = [
  { id: 'starter', name: 'Starter', icon: LeafIcon, features: STARTER_FEATURES, cta: 'Start free' },
  { id: 'growth', name: 'Growth', icon: Rocket, features: PLAN_FEATURES.growth, cta: 'Start with Growth' },
  { id: 'pro', name: 'Pro', icon: Store, features: PLAN_FEATURES.pro, cta: 'Start with Pro', popular: true },
  { id: 'premium', name: 'Premium', icon: Crown, features: PLAN_FEATURES.premium, cta: 'Start with Premium' },
]

// What a business might need, and the lowest plan that gives it.
const NEEDS = [
  { id: 'more15', icon: Package, label: 'More than 15 products', plan: 'growth' },
  { id: 'analytics', icon: BarChart3, label: 'See what sells', plan: 'growth' },
  { id: 'google', icon: Search, label: 'Get found on Google', plan: 'growth' },
  { id: 'pay', icon: CreditCard, label: 'Take card and transfer payments', plan: 'pro' },
  { id: 'book', icon: CalendarDays, label: 'Take bookings', plan: 'pro' },
  { id: 'deliver', icon: Truck, label: 'Book delivery', plan: 'pro' },
  { id: 'crm', icon: Users, label: 'Customer records and reviews', plan: 'pro' },
  { id: 'more50', icon: Package, label: 'More than 50 products', plan: 'pro' },
  { id: 'domain', icon: Globe2, label: 'My own domain', plan: 'pro' },
  { id: 'team', icon: UserPlus, label: 'Staff accounts', plan: 'premium' },
  { id: 'sella', icon: Bot, label: 'An AI assistant', plan: 'premium' },
  { id: 'loyalty', icon: Gift, label: 'Loyalty points', plan: 'premium' },
  { id: 'ads', icon: Target, label: 'Run Google or Meta ads', plan: 'premium' },
]

const yes = true
const no = false
const COMPARISON = [
  { group: 'Store', rows: [
    ['Listings', '15', '50', 'Unlimited', 'Unlimited'],
    ['Photos per listing', '3', '10', '50', '50'],
    ['Online store with logo, categories and search', yes, yes, yes, yes],
    ['Your own colours and fonts', no, yes, yes, yes],
    ['20 premium themes', no, no, yes, yes],
    ['Custom domain', no, no, yes, yes],
    ['Store Design: build your own storefront page', no, no, no, yes],
  ] },
  { group: 'Selling and payments', rows: [
    ['Enquiry form and leads inbox', yes, yes, yes, yes],
    ['WhatsApp cart for multi-item orders', no, yes, yes, yes],
    ['Paystack checkout (card, transfer, USSD)', no, no, yes, yes],
    ['Orders created automatically when paid', no, no, yes, yes],
    ['Payouts settled to your bank', no, no, yes, yes],
    ['Bookings calendar', no, no, yes, yes],
    ['Discount and promo codes', no, no, yes, yes],
  ] },
  { group: 'Delivery', rows: [
    ['Pickup address', no, yes, yes, yes],
    ['Sendbox and Topship rates, booking and tracking', no, no, yes, yes],
    ['Delivery zones', no, no, yes, yes],
  ] },
  { group: 'Customers and records', rows: [
    ['Sales ledger for walk-in sales', yes, yes, yes, yes],
    ['Receipts', 'Plain', 'Branded', 'Branded', 'White-label'],
    ['Customer records', no, no, yes, yes],
    ['Verified reviews', no, no, yes, yes],
    ['Product export (PDF, CSV, Excel)', no, no, yes, yes],
    ['Loyalty points', no, no, no, yes],
    ['Abandoned checkout reminders', no, no, no, yes],
  ] },
  { group: 'Grow', rows: [
    ['Google Maps profile kit, post kit and guarantee', yes, yes, yes, yes],
    ['Get found: Google and AI search listing', no, yes, yes, yes],
    ['Free Google Shopping listings feed', no, yes, yes, yes],
    ['Analytics', no, 'Views and clicks', 'Plus best sellers', 'Plus best sellers'],
    ['AI descriptions a day', no, '30', '65', '65'],
    ['Google Ads, Meta Pixel and TikTok Pixel', no, no, no, yes],
    ['Sella, the AI assistant', no, no, no, yes],
  ] },
  { group: 'Business', rows: [
    ['Team accounts with roles', no, no, no, yes],
    ['CAC verification badge', no, no, yes, yes],
    ['Job listings', '5', '25', '50', 'Unlimited'],
    ['Referral programme', yes, yes, yes, yes],
    ['Support', 'Standard', 'Priority', 'Same-day', 'Same-day'],
  ] },
]

const FAQS = [
  { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade from the Billing tab in your dashboard. Upgrades start immediately, and a downgrade applies when your current period ends.' },
  { q: 'Does Sellapage take a cut of my sales?', a: 'No. Sellapage takes nothing from what your customers pay you. Your plan is a flat price, and customers cover the payment processing fee at checkout, so you receive the full price of what you sold.' },
  { q: 'How do I pay for a plan?', a: 'Through Paystack, by card, bank transfer or USSD, in naira.' },
  { q: 'Do longer periods cost less?', a: 'Yes. Paying quarterly saves 10%, every six months saves 15% and yearly saves 20% compared with paying monthly.' },
  { q: 'Is there a free trial?', a: 'The Starter plan is free for good, so you can run your store on it for as long as you like before paying for anything. No card is needed to start.' },
  { q: 'What happens if I reach my plan limits?', a: 'Your store and everything in it keep working. You will be asked to upgrade before adding more listings or photos than your plan allows.' },
  { q: 'Can I use my own domain?', a: 'Yes, on Pro and Premium. You point your domain at Sellapage and verify it from the Custom Domain tab.' },
  { q: 'Do you offer refunds?', a: 'Plans are not refunded for part of a period, but you can cancel at any time and keep your plan until the period ends. If something went wrong, contact us and we will look at it.' },
]

/** A naira figure that counts to its new value instead of jumping. */
function useTween(value, ms = 500) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { from.current = value; setShown(value); return undefined }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t) => {
      const p = Math.min(1, (t - start) / ms)
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3))
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value, ms])
  return shown
}

function Price({ planId, period }) {
  const total = planId === 'starter' ? 0 : PLAN_PRICES[planId][period]
  const shown = useTween(total)
  const p = PLAN_PERIODS.find((x) => x.id === period)
  if (planId === 'starter') {
    return (
      <div>
        <p className="flex items-baseline gap-1.5"><span className="font-display text-[2.4rem] font-extrabold leading-none tracking-tight">Free</span><span className="text-[13px] opacity-70">for good</span></p>
        <p className="mt-1.5 h-4 text-[12px] opacity-70">No card needed</p>
      </div>
    )
  }
  return (
    <div>
      <p className="flex items-baseline gap-1"><span className="font-display text-[2.4rem] font-extrabold leading-none tracking-tight tabular-nums">{formatPrice(Math.round(shown / 50) * 50)}</span><span className="text-[13px] opacity-70">/{p.shortLabel}</span></p>
      <p className="mt-1.5 h-4 text-[12px] opacity-70">{period !== 'monthly' ? `${formatPrice(getMonthlyEquivalent(planId, period))} a month, save ${getSavingsPercent(planId, period)}%` : 'Billed monthly'}</p>
    </div>
  )
}

function PlanCard({ plan, period, best, onPick }) {
  const [open, setOpen] = useState(false)
  const dark = plan.popular
  const list = plan.features
  const shown = open ? list : list.slice(0, 8)
  return (
    <div className={`relative flex h-full flex-col rounded-[28px] p-6 transition duration-300 ${dark ? 'bg-forest text-white shadow-2xl shadow-forest/30 lg:-translate-y-3' : 'bg-white text-gray-900 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-xl hover:shadow-gray-200/60'} ${best ? 'ring-4 ring-amber-300' : ''}`}>
      {best && <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-extrabold text-amber-950 animate-pop"><Sparkles size={12} />Best fit for you</span>}
      {dark && !best && <span className="absolute -top-3 left-6 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-extrabold text-amber-950">Most popular</span>}
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-white/10' : 'bg-forest-50 text-forest-600'}`}><plan.icon size={21} /></span>
        <p className="font-display text-[22px] font-extrabold">{plan.name}</p>
      </div>
      <p className={`mt-3 min-h-[40px] text-[13.5px] leading-snug ${dark ? 'text-white/75' : 'text-gray-500'}`}>{PLAN_TAGLINES[plan.id]}</p>
      <div className="mt-5"><Price planId={plan.id} period={period} /></div>
      <button type="button" onClick={() => onPick(plan.id)}
        className={`group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold transition ${dark ? 'bg-white text-forest hover:bg-forest-50' : 'bg-forest text-white hover:bg-forest-700'}`}>
        {plan.cta}<ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </button>
      <ul className={`mt-6 flex-1 space-y-2.5 border-t pt-5 ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        {shown.map((f) => {
          const head = f.startsWith('Everything in')
          return (
            <li key={f} className={`flex items-start gap-2.5 text-[13.5px] leading-snug ${head ? 'font-bold' : ''} ${dark ? 'text-white/90' : 'text-gray-700'}`}>
              <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/15' : 'bg-forest-50 text-forest-600'}`}><Check size={11} strokeWidth={3} /></span>{f}
            </li>
          )
        })}
      </ul>
      {list.length > 8 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className={`mt-4 inline-flex items-center gap-1 text-[13px] font-bold ${dark ? 'text-forest-100' : 'text-forest-700'}`}>
          {open ? 'Show less' : `${list.length - 8} more`}<ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}

/** Monthly sales on a slider: what a commission would take, against our flat price. */
function KeepEveryNaira() {
  const [sales, setSales] = useState(1500000)
  const cut = Math.round(sales * 0.05)
  const shownSales = useTween(sales, 250)
  const shownCut = useTween(cut, 250)
  const pct = ((sales - 100000) / (10000000 - 100000)) * 100
  return (
    <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-[32px] bg-forest p-6 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">No cut of your sales</span>
        <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold leading-tight sm:text-[2.4rem]">Keep every naira you sell.</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">Sellapage takes nothing from your sales. Your plan is one flat price, and customers cover the payment fee at checkout, so the full price of what you sold reaches your bank.</p>
      </div>
      <div className="rounded-3xl bg-white p-5 text-gray-900 sm:p-6">
        <label htmlFor="sales" className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-gray-500">If you sell this much a month</span>
          <span className="font-display text-[22px] font-extrabold tabular-nums">{formatPrice(Math.round(shownSales))}</span>
        </label>
        <input id="sales" type="range" min={100000} max={10000000} step={50000} value={sales} onChange={(e) => setSales(Number(e.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-forest" style={{ background: `linear-gradient(90deg,#0b6b35 ${pct}%,#e5efe9 ${pct}%)` }} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-[12px] font-semibold text-red-700">A 5% commission takes</p>
            <p className="mt-1 font-display text-[22px] font-extrabold tabular-nums text-red-700">{formatPrice(Math.round(shownCut))}</p>
            <p className="text-[11.5px] text-red-600/80">every month, and it grows with you</p>
          </div>
          <div className="rounded-2xl bg-forest-50 p-4">
            <p className="text-[12px] font-semibold text-forest-700">Sellapage takes</p>
            <p className="mt-1 font-display text-[22px] font-extrabold text-forest-700">₦0</p>
            <p className="text-[11.5px] text-forest-700/80">Pro is a flat {formatPrice(PLAN_PRICES.pro.monthly)} a month</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Cell({ v, col, best }) {
  const hi = col === best
  return (
    <td className={`px-3 py-3 text-center text-[13px] ${hi ? 'bg-amber-50/70' : col === 'pro' ? 'bg-forest-50/40' : ''}`}>
      {v === true ? <Check size={17} strokeWidth={2.6} className="mx-auto text-forest-600" /> : v === false ? <Minus size={16} className="mx-auto text-gray-300" /> : <span className="font-semibold text-gray-700">{v}</span>}
    </td>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('monthly')
  const [needs, setNeeds] = useState([])
  const [closed, setClosed] = useState({})
  const cardsRef = useRef(null)

  const best = useMemo(() => {
    if (!needs.length) return null
    return needs.reduce((acc, id) => {
      const plan = NEEDS.find((n) => n.id === id)?.plan || 'starter'
      return ORDER.indexOf(plan) > ORDER.indexOf(acc) ? plan : acc
    }, 'starter')
  }, [needs])

  const toggle = (id) => setNeeds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const pick = () => navigate(user ? '/dashboard' : '/login?mode=register')
  const periodObj = PLAN_PERIODS.find((p) => p.id === period)
  const periodIndex = PLAN_PERIODS.findIndex((p) => p.id === period)

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-body text-gray-900">
      <SEO {...pageSeo('/pricing')} url="/pricing" />
      <Navbar />

      {/* ── Hero and plan finder ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-6 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_55%_at_50%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal><Eyebrow>Pricing</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.4rem] lg:text-[3.9rem]">
              Simple pricing that <span className="text-forest-600">grows with you.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}><p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">Start free and stay free as long as you like. Upgrade when your business needs more. No cut of your sales, no lock-in.</p></Reveal>
        </div>

        <Reveal delay={220} className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
          <div className="rounded-[28px] bg-white p-5 shadow-xl shadow-forest-900/5 ring-1 ring-forest-100 sm:p-7">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="font-display text-[19px] font-extrabold text-gray-950">Not sure which plan? Tap what you need.</p>
                <p className="mt-0.5 text-[13.5px] text-gray-500">We will light up the plan that covers all of it.</p>
              </div>
              {needs.length > 0 && <button type="button" onClick={() => setNeeds([])} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800"><RefreshCcw size={13} />Clear</button>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {NEEDS.map((n) => {
                const on = needs.includes(n.id)
                return (
                  <button key={n.id} type="button" onClick={() => toggle(n.id)} aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 ${on ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-forest-50 hover:ring-forest-100'}`}>
                    {on ? <Check size={14} strokeWidth={3} /> : <n.icon size={14} className="text-forest-600" />}{n.label}
                  </button>
                )
              })}
            </div>
            <div className={`grid transition-all duration-500 ${best ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                {best && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center">
                    <Sparkles size={20} className="flex-shrink-0 text-amber-600" />
                    <p className="flex-1 text-[14px] text-amber-950"><span className="font-extrabold">{PLANS.find((p) => p.id === best).name}</span> covers everything you picked{best === 'starter' ? ', for free.' : `, from ${formatPrice(PLAN_PRICES[best].monthly)} a month.`}</p>
                    <button type="button" onClick={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-1.5 self-start rounded-xl bg-amber-950 px-4 py-2 text-[13px] font-bold text-white sm:self-auto">See the plan <ArrowRight size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Period and plans ─────────────────────────────────────────────── */}
      <section ref={cardsRef} className="scroll-mt-20 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <div className="relative grid grid-cols-4 rounded-2xl bg-gray-100 p-1" role="tablist" aria-label="Billing period">
              <span className="absolute bottom-1 top-1 rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out" style={{ width: 'calc((100% - 8px) / 4)', transform: `translateX(${periodIndex * 100}%)`, left: 4 }} />
              {PLAN_PERIODS.map((p) => {
                const save = getSavingsPercent('growth', p.id)
                return (
                  <button key={p.id} type="button" role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)}
                    className={`relative z-10 whitespace-nowrap px-3 py-2.5 text-[13px] font-bold transition-colors sm:px-6 ${period === p.id ? 'text-gray-950' : 'text-gray-500 hover:text-gray-700'}`}>
                    {p.label}
                    {save > 0 && <span className="absolute -right-1 -top-2.5 rounded-full bg-forest-600 px-1.5 py-0.5 text-[9.5px] font-extrabold text-white">-{save}%</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p, i) => (
              <Reveal key={p.id} delay={i * 80} className="h-full"><PlanCard plan={p} period={period} best={best === p.id} onPick={pick} /></Reveal>
            ))}
          </div>

          <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-500">
            {[[BadgePercent, 'No cut of your sales'], [Lock, 'Pay by card, transfer or USSD through Paystack'], [ShieldCheck, 'Cancel any time, keep your plan to the end of the period']].map(([I, t]) => (
              <span key={t} className="inline-flex items-center gap-1.5"><I size={15} className="text-forest-600" />{t}</span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Keep every naira ─────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl"><KeepEveryNaira /></Reveal>
      </section>

      {/* ── Compare ──────────────────────────────────────────────────────── */}
      <section id="compare" className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <Eyebrow>Compare plans</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold leading-tight text-gray-950 sm:text-[2.5rem]">Every feature, side by side.</h2>
          </Reveal>
          <Reveal className="overflow-hidden rounded-[24px] bg-white ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-[12px] font-bold uppercase tracking-wider text-gray-400">{periodObj.label} prices</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className={`px-3 py-4 text-center ${best === p.id ? 'bg-amber-50/70' : p.id === 'pro' ? 'bg-forest-50/40' : ''}`}>
                        <span className="block font-display text-[15px] font-extrabold text-gray-950">{p.name}</span>
                        <span className="block text-[12px] font-semibold text-gray-500">{p.id === 'starter' ? 'Free' : `${formatPrice(PLAN_PRICES[p.id][period])}/${periodObj.shortLabel}`}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {COMPARISON.map((g) => (
                  <tbody key={g.group}>
                    <tr>
                      <td colSpan={5} className="border-t border-gray-100 bg-gray-50/80 p-0">
                        <button type="button" onClick={() => setClosed((c) => ({ ...c, [g.group]: !c[g.group] }))} aria-expanded={!closed[g.group]}
                          className="sticky left-0 flex w-full max-w-[100vw] items-center gap-2 px-5 py-3 text-left text-[13.5px] font-extrabold text-gray-900 sm:max-w-none">
                          <ChevronDown size={16} className={`text-gray-400 transition ${closed[g.group] ? '-rotate-90' : ''}`} />{g.group}
                        </button>
                      </td>
                    </tr>
                    {!closed[g.group] && g.rows.map(([label, ...vals]) => (
                      <tr key={label} className="border-t border-gray-50">
                        <td className="sticky left-0 z-10 bg-white px-5 py-3 text-[13.5px] text-gray-700 shadow-[1px_0_0_#f3f4f6]">{label}</td>
                        {vals.map((v, i) => <Cell key={i} v={v} col={ORDER[i]} best={best} />)}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </Reveal>
          <p className="mt-3 text-center text-[12px] text-gray-400 sm:hidden">Swipe the table sideways to see every plan.</p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Pricing questions.</h2>
            <p className="mt-3 text-[15px] text-gray-600">Something else? <Link to="/contact" className="font-semibold text-forest-700 underline-offset-2 hover:underline">Talk to us</Link>.</p>
            <Script className="mt-6 hidden -rotate-3 text-[26px] leading-none lg:block">Start small,<br />grow big</Script>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Reveal as="details" key={f.q} delay={i * 40} className="group rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/60 open:ring-1 open:ring-forest-100">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50">
                  <span className="font-display text-[15px] font-semibold text-gray-900">{f.q}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5"><p className="text-[14px] leading-relaxed text-gray-600">{f.a}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to action ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-forest-50 via-white to-amber-50/60 px-6 py-14 text-center ring-1 ring-forest-100 sm:py-20">
          <h2 className="mx-auto max-w-2xl text-balance font-display text-[2rem] font-extrabold leading-[1.08] text-gray-950 sm:text-[2.7rem]">Start free today. Upgrade when it pays for itself.</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-gray-600">Your store can be live the same day. No card needed.</p>
          <button type="button" onClick={() => navigate(user ? '/dashboard' : '/login?mode=register')} className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-forest px-7 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">
            {user ? 'Open your dashboard' : 'Start free'} <ArrowRight size={17} className="transition group-hover:translate-x-1" />
          </button>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
