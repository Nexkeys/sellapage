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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Loader2, AlertCircle, Warehouse, PackageSearch, Truck, Wallet,
  ShieldCheck, Store, ChevronDown, BellRing,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useAuth } from '../hooks/useAuth'
import { readInterest, roleFromInterest, interestFromRole } from '../utils/marketplace'
import { normaliseNgMobile } from '../utils/phone'

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
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

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
              ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
              : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300'
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
      <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-sm sm:p-10" role="status">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Check size={26} className="text-brand-600" />
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
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
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
            <p className="mt-1 text-xs text-brand-700">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
        Join the waitlist
      </button>
      <p className="text-center text-xs text-gray-400">
        Already selling on Sellapage?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link> to join with your store.
      </p>
    </form>
  )
}

export default function DropshippingPage() {
  const [role, setRole] = useState('supply')
  const [openFaq, setOpenFaq] = useState(0)

  const choose = (r) => {
    setRole(r)
    scrollToId('waitlist')
  }

  return (
    <div className="min-h-screen bg-white font-body">
      <SEO {...pageSeo('/dropshipping')} url="/dropshipping" />
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 px-4 pb-16 pt-28 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            Coming soon
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            The Sellapage Dropshipping Marketplace
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Suppliers list their products once. Sellers across Nigeria add them to their stores and sell them.
            When a customer pays, everyone is paid automatically, and the supplier ships.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => scrollToId('waitlist')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Join the waitlist <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollToId('how-it-works')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* ── TWO SIDES ────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {SIDES.map(({ role: r, Icon, eyebrow, title, points, cta }, i) => (
            <Reveal key={r} delay={i * 120} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon size={20} className="text-brand-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{eyebrow}</span>
              <h2 className="mt-2 font-display text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
              <ul className="mt-4 flex-1 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
                    <Check size={16} className="mt-0.5 flex-shrink-0 text-brand-600" /> {p}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => choose(r)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                {cta} <ArrowRight size={15} />
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW AN ORDER WORKS ───────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-gray-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">How an order works</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {FLOW.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 100} className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                  <Icon size={18} className="text-brand-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5">
            <ShieldCheck size={20} className="mt-0.5 flex-shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-900">Built on trust.</span> Every supplier is CAC verified, phone verified
              and reviewed by our team before they can list, and marketplace products are sold with paid checkout only.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── WAITLIST ─────────────────────────────────────────────────────── */}
      <section id="waitlist" className="scroll-mt-20 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">Join the waitlist</h2>
          <p className="mx-auto mb-8 mt-3 max-w-md text-center text-sm leading-relaxed text-gray-500">
            Be first in line when the marketplace opens. Suppliers on the list are invited to apply before launch.
          </p>
          <WaitlistForm role={role} setRole={setRole} />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">Questions</h2>
          <div className="space-y-2">
            {FAQS.map(([q, a], i) => (
              <div key={q} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-gray-900"
                >
                  {q}
                  <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm leading-relaxed text-gray-500">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
