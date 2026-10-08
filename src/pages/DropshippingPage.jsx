// src/pages/DropshippingPage.jsx
//
// Public /dropshipping page. Phase 0 of the Dropshipping Marketplace
// (Docs/Dropshipping-Marketplace-Plan.md): what it is, who can join, and a
// waitlist. Later phases turn this page into the live product marketplace.
//
// Copy rules: only state what is decided. No commission rate (who carries it
// is still open) and no launch date. Pro/Premium for both sides and the
// supplier checks (CAC, phone, video, review) are decided and stated.
//
// A signed-in store OWNER joins in one tap: /api/marketplace-waitlist records
// it on their store (the same flag as the Settings checkboxes). Everyone else,
// including staff, fills the short form.
//
// Rebuilt 2026-10-08 in the style of the new public pages: an animated hero
// (a paid order splitting three ways, the parcel travelling; no amounts, as
// the rate is not decided), the two sides, how an order works, the supplier
// checks, the waitlist and FAQ. The badge reads "Waitlist open", which is
// true today, instead of "Coming soon".

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Loader2, AlertCircle, Warehouse, PackageSearch, Truck, Wallet,
  ShieldCheck, Store, ChevronDown, BellRing, BadgeCheck, Smartphone, Landmark, MapPin, Video, UserCheck,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useAuth } from '../hooks/useAuth'
import { readInterest, roleFromInterest, interestFromRole } from '../utils/marketplace'
import { normaliseNgMobile } from '../utils/phone'
import { Eyebrow } from '../components/marketing/kit'
import { useClock, useOnScreen } from '../components/marketing/motion'

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const SIDES = [
  {
    role: 'supply',
    Icon: Warehouse,
    eyebrow: 'For suppliers',
    title: 'Let sellers across Nigeria sell your stock',
    points: [
      'List your products once at a wholesale price.',
      'Dropshippers add them to their stores and bring you the customers.',
      'You ship each order and your share is paid to your bank automatically.',
      'Switch any product off the marketplace at any time, instantly.',
    ],
    cta: 'Join as a supplier',
  },
  {
    role: 'dropship',
    Icon: PackageSearch,
    eyebrow: 'For dropshippers',
    title: 'Sell products without buying stock',
    points: [
      'Pick products from approved suppliers.',
      'Add them to your Sellapage store at your own price.',
      'Keep the difference on every sale, paid to your bank automatically.',
      'The supplier ships straight to your customer.',
    ],
    cta: 'Join as a dropshipper',
  },
]

const FLOW = [
  { Icon: Store, title: 'The customer buys', text: "They order and pay on the dropshipper's store, like any Sellapage order." },
  { Icon: Wallet, title: 'Everyone is paid at once', text: 'Paystack splits the payment on the spot between the supplier, the dropshipper and Sellapage.' },
  { Icon: Truck, title: 'The supplier ships', text: "The supplier gets the order and delivers from their own location to the dropshipper's customer." },
]

const FAQS = [
  ['When does it launch?', "We are building it now. Everyone on the waitlist hears first, and suppliers on the list are invited to apply before launch."],
  ['Which plan do I need?', 'Suppliers and dropshippers both need a Pro or Premium plan when the marketplace opens. You can join the waitlist on any plan, or without a store.'],
  ['What do suppliers need to join?', 'A verified CAC registration, a verified phone number, a payout bank account, a pickup address, and a short video of your stock. Every supplier is reviewed by the Sellapage team before they can list.'],
  ['Can I keep selling my own products?', 'Yes. Dropshipping sits alongside everything your store already sells, and one store can be a supplier and a dropshipper at the same time.'],
  ['Who delivers the order?', "The supplier. Delivery is priced from the supplier's pickup address, and the customer pays it at checkout."],
  ['How are payments handled?', 'Marketplace products are sold with paid checkout only, so every order is paid up front and split automatically through Paystack. Nobody has to chase anybody for money.'],
  ['Can suppliers and dropshippers talk to each other?', 'Yes, there will be a chat inside Sellapage for questions about products and orders.'],
]

const INPUT =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100'

const ROLE_OPTIONS = [
  { id: 'supply', label: 'Supply products' },
  { id: 'dropship', label: 'Dropship' },
  { id: 'both', label: 'Both' },
]

function RolePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="I want to">
      {ROLE_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all sm:text-sm ${
            value === o.id
              ? 'border-forest-600 bg-forest-50 text-forest-700 ring-2 ring-forest-100'
              : 'border-gray-200 bg-white text-gray-600 hover:border-forest-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

async function joinWaitlist(payload, token) {
  const res = await fetch('/api/marketplace-waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

function WaitlistForm({ role, setRole }) {
  const { user, store, setStore, loading } = useAuth() || {}
  const isOwner = !!user && !!store && !store._isStaff
  const [form, setForm] = useState({ name: '', email: '', phone: '', sells: '', hp: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [serverError, setServerError] = useState('')
  const [startedAt] = useState(() => Date.now())

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const fail = (res) => {
    if (res.data.field) setErrors({ [res.data.field]: res.data.message })
    setServerError(
      res.data.field
        ? ''
        : res.data.message || (res.status === 429 ? 'Too many sign ups from this connection. Please try again later.' : 'We could not add you. Please try again.'),
    )
    setStatus('idle')
  }

  const submitOwner = async () => {
    setStatus('sending')
    setServerError('')
    try {
      const res = await joinWaitlist({ role }, await user.getIdToken())
      if (!res.ok) return fail(res)
      if (res.data.linked && setStore) {
        setStore((s) => (s ? { ...s, marketplaceInterest: interestFromRole(res.data.role) } : s))
      }
      setStatus('done')
    } catch {
      setServerError('We could not reach Sellapage. Check your connection and try again.')
      setStatus('idle')
    }
  }

  const submitVisitor = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    const found = {}
    if (!form.name.trim()) found.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = 'Please enter a valid email address.'
    if (form.phone.trim() && !normaliseNgMobile(form.phone)) found.phone = 'Enter a valid Nigerian mobile number, or leave it empty.'
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return

    setStatus('sending')
    try {
      const res = await joinWaitlist({ ...form, role, elapsedMs: Date.now() - startedAt })
      if (!res.ok) return fail(res)
      setStatus('done')
    } catch {
      setServerError('We could not reach Sellapage. Check your connection and try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-forest-100 bg-white p-6 text-center shadow-sm sm:p-10" role="status">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50">
          <Check size={26} className="text-forest-600" />
        </div>
        <h3 className="font-display text-2xl font-extrabold text-gray-900">You&apos;re on the list</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
          {isOwner
            ? 'We saved it on your store. You will see the dropshipping tab in your dashboard, and we will tell you the moment it opens.'
            : 'We will email you the moment the marketplace opens. Suppliers on the list are invited to apply first.'}
        </p>
        {!isOwner && (
          <Link
            to="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-forest-600 px-5 py-3 text-sm font-bold text-white hover:bg-forest-700"
          >
            Create your free store while you wait <ArrowRight size={15} />
          </Link>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (isOwner) {
    const current = roleFromInterest(readInterest(store))
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Joining as</p>
          <p className="mt-1 font-display text-lg font-bold text-gray-900">{store.businessName || 'your store'}</p>
          {current && (
            <p className="mt-1 text-xs text-forest-700">
              Already on the list to {current === 'both' ? 'supply and dropship' : current === 'supply' ? 'supply' : 'dropship'}.
              Add the other side below if you like.
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">I want to</p>
          <RolePicker value={role} onChange={setRole} />
        </div>
        {serverError && (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {serverError}
          </p>
        )}
        <button
          type="button"
          onClick={submitOwner}
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 py-3.5 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60"
        >
          {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
          Join the waitlist
        </button>
      </div>
    )
  }

  const field = (key, label, props = {}) => (
    <div>
      <label htmlFor={`mw-${key}`} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        id={`mw-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={`${INPUT} ${errors[key] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
        aria-invalid={!!errors[key]}
        {...props}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={submitVisitor} noValidate className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">I want to</p>
        <RolePicker value={role} onChange={setRole} />
      </div>
      {field('name', 'Your name', { autoComplete: 'name', maxLength: 80, placeholder: 'e.g. Chioma Okafor' })}
      {field('email', 'Email address', { type: 'email', autoComplete: 'email', maxLength: 160, placeholder: 'you@example.com' })}
      {field('phone', <>WhatsApp number <span className="font-normal text-gray-400">(optional)</span></>, {
        type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 40, placeholder: 'e.g. 08012345678',
      })}
      {field('sells', <>What do you sell or want to sell? <span className="font-normal text-gray-400">(optional)</span></>, {
        maxLength: 120, placeholder: 'e.g. Hair and beauty products',
      })}
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        value={form.hp}
        onChange={(e) => set('hp', e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      {serverError && (
        <p className="flex items-start gap-2 text-sm text-red-600">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 py-3.5 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60"
      >
        {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
        Join the waitlist
      </button>
      <p className="text-center text-xs text-gray-400">
        Already selling on Sellapage?{' '}
        <Link to="/login" className="font-semibold text-forest-600 hover:underline">Sign in</Link> to join with your store.
      </p>
    </form>
  )
}

/**
 * The marketplace in one picture: a paid order splits between supplier,
 * dropshipper and Sellapage (no amounts or percentages, the rate is not
 * decided), and the parcel travels from the supplier to the customer.
 */
function SplitScene() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 3200 }) % 6000
  const paid = t > 700
  const split = t > 1600
  const ship = Math.min(1, Math.max(0, (t - 2600) / 2400))
  const parties = [
    { Icon: Warehouse, label: 'Supplier', sub: 'Wholesale price' },
    { Icon: PackageSearch, label: 'Dropshipper', sub: 'Their margin' },
    { Icon: ShieldCheck, label: 'Sellapage', sub: 'Marketplace fee' },
  ]
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
      <div className={`mx-auto flex w-fit items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-forest-900/10 ring-1 ring-gray-100 transition-all duration-500 ${paid ? 'scale-100' : 'scale-95'}`}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-500 ${paid ? 'bg-forest-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{paid ? <Check size={18} strokeWidth={3} /> : <Wallet size={18} />}</span>
        <span><span className="block text-[13.5px] font-bold text-gray-900">{paid ? 'Order paid' : 'Customer pays'}</span><span className="block text-[11.5px] text-gray-500">Card, transfer or USSD by Paystack</span></span>
      </div>
      <svg viewBox="0 0 460 90" className="h-[90px] w-full">
        {[80, 230, 380].map((x, i) => {
          const d = `M230 4 C230 50 ${x} 40 ${x} 86`
          return (
            <g key={x}>
              <path d={d} fill="none" stroke={split ? '#0b6b35' : '#e5e7eb'} strokeOpacity={split ? 0.45 : 1} strokeWidth="2" strokeDasharray="5 7" className={split ? 'animate-dash-flow' : ''} style={{ transition: 'stroke 0.5s' }} />
              {split && <circle r="5" fill="#0b6b35"><animateMotion dur="1.4s" begin={`${i * 0.15}s`} repeatCount="indefinite" path={d} /></circle>}
            </g>
          )
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2.5">
        {parties.map((p, i) => (
          <div key={p.label} className={`rounded-2xl p-3 text-center transition-all duration-500 ${split ? 'bg-white shadow-lg shadow-forest-900/10 ring-1 ring-forest-100' : 'bg-white/60 ring-1 ring-gray-100'}`} style={{ transitionDelay: `${i * 120}ms` }}>
            <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-500 ${split ? 'bg-forest text-white' : 'bg-gray-100 text-gray-400'}`}><p.Icon size={18} /></span>
            <p className="mt-2 text-[12.5px] font-bold text-gray-900">{p.label}</p>
            <p className="text-[10.5px] text-gray-500">{p.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-lg shadow-forest-900/5 ring-1 ring-gray-100">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-gray-500"><span>Supplier ships</span><span>{ship >= 1 ? 'Delivered' : ship > 0 ? 'On the way' : 'Packing'}</span></div>
        <div className="relative mt-3 h-2 rounded-full bg-gray-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-forest-600" style={{ width: `${ship * 100}%` }} />
          <span className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-forest text-white shadow-lg" style={{ left: `${ship * 100}%` }}><Truck size={15} /></span>
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-gray-400"><span>Supplier&apos;s pickup</span><span>Customer&apos;s door</span></div>
      </div>
    </div>
  )
}

const CHECKS = [
  [BadgeCheck, 'Verified CAC registration'],
  [Smartphone, 'Verified phone number'],
  [Landmark, 'Payout bank account'],
  [MapPin, 'Pickup address'],
  [Video, 'Short video of the stock'],
  [UserCheck, 'Reviewed by the Sellapage team'],
]

export default function DropshippingPage() {
  const [role, setRole] = useState('supply')
  const [openFaq, setOpenFaq] = useState(0)

  const choose = (r) => {
    setRole(r)
    scrollToId('waitlist')
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/dropshipping')} url="/dropshipping" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(60%_55%_at_70%_10%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-8">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-forest-700 shadow-sm ring-1 ring-forest-100"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-600 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-forest-600" /></span>Waitlist open</span>
            <h1 className="mt-5 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.3rem] lg:text-[3.7rem]">
              The Sellapage <span className="text-forest-600">Dropshipping Marketplace.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Suppliers list their products once. Sellers across Nigeria add them to their stores and sell them. When a customer pays, everyone is paid automatically, and the supplier ships.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => scrollToId('waitlist')} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">Join the waitlist <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button>
              <button type="button" onClick={() => scrollToId('how-it-works')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50">How it works</button>
            </div>
          </Reveal>
          <Reveal direction="left" delay={150}><SplitScene /></Reveal>
        </div>
      </section>

      {/* ── Two sides ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2">
          {SIDES.map(({ role: r, Icon, eyebrow, title, points, cta }, i) => (
            <Reveal key={r} delay={i * 100} className={`flex flex-col rounded-[28px] p-6 sm:p-8 ${i === 0 ? 'bg-forest text-white' : 'bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${i === 0 ? 'bg-white/10' : 'bg-forest-50 text-forest-600'}`}><Icon size={22} /></span>
              <p className={`mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${i === 0 ? 'text-forest-100' : 'text-forest-700'}`}>{eyebrow}</p>
              <h2 className="mt-2 font-display text-[1.4rem] font-extrabold leading-tight sm:text-[1.6rem]">{title}</h2>
              <ul className="mt-5 flex-1 space-y-3">
                {points.map((p) => (
                  <li key={p} className={`flex items-start gap-2.5 text-[14.5px] leading-relaxed ${i === 0 ? 'text-white/85' : 'text-gray-600'}`}>
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${i === 0 ? 'bg-white/15' : 'bg-forest-50 text-forest-600'}`}><Check size={12} strokeWidth={3} /></span>{p}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => choose(r)} className={`group mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold transition sm:self-start ${i === 0 ? 'bg-white text-forest hover:bg-forest-50' : 'bg-forest text-white hover:bg-forest-700'}`}>{cta} <ArrowRight size={16} className="transition group-hover:translate-x-1" /></button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How an order works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-gradient-to-b from-white via-forest-50/60 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.5rem]">How an order works.</h2>
          </Reveal>
          <div className="relative grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-[2px] bg-[repeating-linear-gradient(90deg,#0b6b35_0_8px,transparent_8px_16px)] opacity-40 md:block" />
            {FLOW.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 120} className="relative rounded-[24px] bg-white p-6 text-center ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-white shadow-lg shadow-forest/20"><Icon size={21} /><span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 text-[11px] font-extrabold text-amber-950 ring-2 ring-white">{i + 1}</span></span>
                <h3 className="mt-4 font-display text-[17px] font-extrabold text-gray-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Every supplier is checked ────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 rounded-[32px] bg-gray-950 p-6 text-white sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">Trust built in</span>
            <h2 className="mt-4 text-balance font-display text-[1.8rem] font-extrabold leading-tight sm:text-[2.2rem]">Every supplier is checked before they can list.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">Dropshippers put their name on every order, so they only sell from suppliers who have proved who they are and what they stock. Marketplace products are sold with paid checkout only.</p>
          </div>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CHECKS.map(([I, t], i) => (
              <Reveal as="li" key={t} delay={i * 70} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-600"><I size={17} /></span>
                <span className="text-[13.5px] font-semibold">{t}</span>
                <Check size={16} strokeWidth={3} className="ml-auto flex-shrink-0 text-forest-200" />
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ── Waitlist ─────────────────────────────────────────────────────── */}
      <section id="waitlist" className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Reveal className="mb-8 text-center">
            <Eyebrow>Join the waitlist</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.5rem]">Be first in line.</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-gray-600">Everyone on the waitlist hears first, and suppliers on the list are invited to apply before launch.</p>
          </Reveal>
          <WaitlistForm role={role} setRole={setRole} />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center"><h2 className="font-display text-[2rem] font-extrabold text-gray-950">Questions.</h2></Reveal>
          <div className="space-y-3">
            {FAQS.map(([q, a], i) => {
              const open = openFaq === i
              return (
                <div key={q} className={`overflow-hidden rounded-2xl bg-white transition ${open ? 'ring-1 ring-forest-100 shadow-sm' : 'ring-1 ring-gray-100'}`}>
                  <button type="button" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="font-display text-[15px] font-semibold text-gray-900">{q}</span>
                    <ChevronDown size={17} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="px-5 pb-5 text-[14px] leading-relaxed text-gray-600 animate-in fade-in duration-200">{a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
