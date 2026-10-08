// src/pages/PartnersPage.jsx
//
// Investors & Partners: an introductions page, NOT an offer.
//
// LEGAL SHAPE, read before editing any copy here
// Sellapage is registered as a business name, which cannot issue shares at all.
// Even once incorporated as a private company, CAMA 2020 s.22(5) forbids
// inviting the public to subscribe for its shares. So this page must never
// carry a share price, valuation, equity percentage, promised return or a
// payment button. It collects introductions; terms are only ever discussed
// privately. The notice at the bottom of the page says so to the reader.
//
// TRACTION
// Not in this file. The figures and their as-of date are edited in the admin
// panel (Investors & Partners > Page traction), stored in
// platformSettings/partnersPage and served by /api/partners-content, so a new
// number never needs a deploy. Defaults and validation: src/utils/partnersContent.js.
//
// INCORPORATION
// The founder is open to incorporating as a limited company when investors come
// in. Copy should say that plainly, never read as a precondition or a refusal.
//
// REDESIGN 2026-10-08 (Nex): same content and legal shape, new look in line
// with Home and About. The founder photo was removed at his request; the
// "who builds it" section now shows the Sellapage and NexKeys marks. New
// visuals: the business model as a turning loop, the live product (the Home
// hero), and the plan ladder. The revenue lines named here are the ones the
// Ops Revenue tab records: plan payments, Sella credit packs and delivery.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Loader2, AlertCircle, TrendingUp, Layers, Users, Rocket, Linkedin, ExternalLink, ShieldCheck, ChevronDown,
  Store, Wallet, BadgeCheck, Sparkles, Coins, Truck, Bot, Gauge, Code2, LineChart,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import {
  INTEREST_OPTIONS,
  INVESTOR_TYPES,
  TICKET_SIZES,
  SOURCES,
  LIMITS,
  validateEnquiry,
} from '../utils/partnerEnquiry'
import { formatAsOf } from '../utils/partnersContent'
import { PLAN_PRICES, formatPrice } from '../utils/billingPlans'
import { Eyebrow, Script } from '../components/marketing/kit'
import { HeroStage, useClock, useOnScreen } from '../components/marketing/motion'

/**
 * Traction figures from the admin panel.
 *
 * On failure the section is hidden rather than filled with fallback numbers:
 * a figure the founder has since changed is worse on an investor page than no
 * figure, and there is no honest way to show stale data as current.
 */
function useTraction() {
  const [state, setState] = useState({ status: 'loading', stats: [], asOf: '' })
  useEffect(() => {
    let cancelled = false
    fetch('/api/partners-content')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return
        const stats = Array.isArray(data?.traction?.stats) ? data.traction.stats : []
        setState({ status: stats.length ? 'ready' : 'error', stats, asOf: data?.traction?.asOf || '' })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }))
      })
    return () => { cancelled = true }
  }, [])
  return state
}

function TractionSection() {
  const { status, stats, asOf } = useTraction()
  if (status === 'error') return null
  const list = status === 'loading' ? Array.from({ length: 4 }, () => null) : stats
  const asOfLabel = formatAsOf(asOf)
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 text-center">
          <Eyebrow>Traction</Eyebrow>
          <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.6rem]">Where we are today.</h2>
        </Reveal>
        <div className={`grid gap-4 ${list.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : list.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'mx-auto max-w-2xl grid-cols-2'}`} aria-busy={status === 'loading'}>
          {list.map((t, i) => (
            <Reveal key={i} delay={i * 80} className="relative min-w-0 overflow-hidden rounded-[24px] bg-white p-5 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
              <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-forest-50" />
              {t ? (
                <>
                  <p className="relative break-words font-display text-[1.9rem] font-extrabold leading-none text-forest-700 sm:text-[2.4rem]">{t.value}</p>
                  <p className="relative mt-2 text-[14px] font-bold text-gray-900">{t.label}</p>
                  {t.note && <p className="relative mt-0.5 text-[12px] text-gray-500">{t.note}</p>}
                </>
              ) : <span className="relative block h-16 animate-pulse rounded-xl bg-forest-50" />}
            </Reveal>
          ))}
        </div>
        {status === 'ready' && asOfLabel && <p className="mt-5 text-center text-[12px] text-gray-400">Figures as of {asOfLabel}. Detailed metrics are shared privately after a first conversation.</p>}
      </div>
    </section>
  )
}

// The business model as a loop: a business starts free, sells through
// Paystack, upgrades as it grows, and the new tools help it sell more.
const LOOP = [
  { icon: Store, title: 'Starts free', sub: 'A store on the Starter plan, no card needed' },
  { icon: Wallet, title: 'Sells through Paystack', sub: 'Orders, payments and records in one place' },
  { icon: TrendingUp, title: 'Upgrades as it grows', sub: 'Growth, Pro and Premium, billed in naira' },
  { icon: Sparkles, title: 'Grows with more tools', sub: 'Delivery, marketing, team accounts, Sella AI' },
]

function GrowthLoop() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 1500 })
  const active = Math.floor(t / 1800) % LOOP.length
  const R = 128
  const pos = (i) => {
    const a = -Math.PI / 2 + (i / LOOP.length) * Math.PI * 2
    return [200 + R * Math.cos(a), 200 + R * Math.sin(a)]
  }
  const circle = `M 200 ${200 - R} A ${R} ${R} 0 1 1 ${199.99} ${200 - R}`
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[460px]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="200" cy="200" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <circle cx="200" cy="200" r={R} fill="none" stroke="rgba(213,241,225,0.55)" strokeWidth="2" strokeDasharray="6 12" className="animate-dash-flow motion-reduce:animate-none" />
        <circle r="7" fill="#fbbf24"><animateMotion dur="7.2s" repeatCount="indefinite" path={circle} /></circle>
        <circle cx="200" cy="200" r="70" fill="rgba(255,255,255,0.06)" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 sm:h-[112px] sm:w-[112px] flex-col items-center justify-center rounded-full bg-white text-center shadow-2xl">
        <img src="/og-image.png" alt="" className="h-10 w-10 rounded-xl" />
        <span className="mt-1 font-display text-[13px] font-extrabold text-forest">Sellapage</span>
      </div>
      {LOOP.map((n, i) => {
        const [x, y] = pos(i)
        const on = i === active
        return (
          <div key={n.title} className="absolute w-[38%] max-w-[180px] -translate-x-1/2 -translate-y-1/2 sm:w-[44%]" style={{ left: `${(x / 400) * 100}%`, top: `${(y / 400) * 100}%` }}>
            <div className={`flex items-start gap-2 rounded-2xl p-2.5 text-left transition-all duration-500 sm:p-3 ${on ? 'scale-105 bg-white text-gray-900 shadow-2xl' : 'bg-white/10 text-white backdrop-blur'}`}>
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${on ? 'bg-forest text-white' : 'bg-white/10'}`}><n.icon size={16} /></span>
              <span className="min-w-0"><span className="block text-[12px] font-extrabold leading-tight sm:text-[13px]">{n.title}</span><span className={`mt-0.5 hidden text-[11px] leading-snug sm:block ${on ? 'text-gray-500' : 'text-white/60'}`}>{n.sub}</span></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** The plan ladder, rising into view: how revenue per business grows. */
function PlanLadder() {
  const ref = useRef(null)
  const on = useOnScreen(ref)
  const [seen, setSeen] = useState(false)
  if (on && !seen) setSeen(true)
  const steps = [
    ['Starter', 0, 'Free, for good'],
    ['Growth', PLAN_PRICES.growth.monthly, 'a month'],
    ['Pro', PLAN_PRICES.pro.monthly, 'a month'],
    ['Premium', PLAN_PRICES.premium.monthly, 'a month'],
  ]
  return (
    <div ref={ref} className="flex h-[260px] items-end gap-3 sm:gap-4">
      {steps.map(([name, price, note], i) => (
        <div key={name} className="flex h-full flex-1 flex-col justify-end">
          <p className="mb-2 text-center font-display text-[15px] font-extrabold text-gray-900 sm:text-[17px]">{price ? formatPrice(price) : 'Free'}</p>
          <div className={`rounded-t-2xl transition-[height] duration-1000 ease-out ${i === 2 ? 'bg-forest' : i === 3 ? 'bg-forest-700' : i === 1 ? 'bg-forest-600' : 'bg-forest-200'}`} style={{ height: seen ? `${18 + i * 26}%` : '4%', transitionDelay: `${i * 140}ms` }} />
          <p className="mt-2 text-center text-[13px] font-bold text-gray-800">{name}</p>
          <p className="text-center text-[11px] text-gray-500">{note}</p>
        </div>
      ))}
    </div>
  )
}

const LOOKING_FOR = [
  {
    id: 'investor',
    Icon: TrendingUp,
    title: 'Investors',
    body: 'Angels, funds and family offices who want an early conversation ahead of our first round. The deck and detailed numbers are shared privately after a first call.',
  },
  {
    id: 'strategic',
    Icon: Layers,
    title: 'Strategic partners',
    body: 'Payments, logistics, banking, telecoms and SME finance companies whose customers are the same businesses Sellapage serves.',
  },
  {
    id: 'partner',
    Icon: Users,
    title: 'Distribution partners',
    body: 'Business associations, trainers, communities, agencies and creators who can put Sellapage in front of Nigerian sellers.',
  },
  {
    id: 'cofounder',
    Icon: Rocket,
    title: 'A co-founder',
    body: 'A commercial co-founder to lead growth, sales and partnerships alongside a technical founder who has already built the product.',
  },
]

const FAQS = [
  {
    q: 'Is Sellapage raising money right now?',
    a: 'We are open to early conversations with investors ahead of a first round. Nothing on this page is an offer to sell shares or any other investment, and terms are only ever discussed privately.',
  },
  {
    q: 'How is Sellapage registered?',
    a: 'Sellapage is registered with the Corporate Affairs Commission as a business name (BN 9689086). We are open to incorporating as a limited company, and would do so as part of bringing investors on board.',
  },
  {
    q: 'Can I see the pitch deck and financials?',
    a: 'Yes, after a first conversation. The deck, detailed metrics and revenue figures are shared privately with the people we are actively talking to.',
  },
  {
    q: 'What kind of co-founder are you looking for?',
    a: 'Someone commercial: sales, partnerships, growth or operations, ideally with experience selling to Nigerian small businesses. Role and equity are agreed privately.',
  },
  {
    q: 'What happens after I submit the form?',
    a: 'The founder reads every submission personally and gets back to you by email or WhatsApp.',
  },
  {
    q: 'What do you do with my details?',
    a: 'We use them only to reply to your enquiry. They are never sold or shared, and you can ask us to delete them at any time by emailing sellapage.ng@gmail.com.',
  },
]

const FOUNDER = {
  name: 'Ernest Uwaoma',
  role: 'Founder and CTO, Sellapage',
  linkedin: 'https://www.linkedin.com/in/ernest-uwaoma-446846409',
  skills: ['Full-stack engineering', 'Systems architecture', 'DevOps', 'Product leadership'],
}

const EMPTY_FORM = {
  interest: '',
  fullName: '',
  email: '',
  phone: '',
  organisation: '',
  investorType: '',
  ticketSize: '',
  link: '',
  source: '',
  message: '',
  consent: false,
  // Honeypot. Hidden from people, filled in by bots. Named so no browser
  // autofill profile will ever match it.
  hp: '',
}

const INPUT =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600/20'
const inputTone = (hasError) =>
  hasError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-forest-600'

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
      <AlertCircle size={13} className="mt-px flex-shrink-0" />
      {message}
    </p>
  )
}

function EnquiryForm({ presetInterest }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success
  const [serverError, setServerError] = useState('')
  const startedAt = useRef(Date.now())

  // A "Talk to us" button on one of the cards above preselects the interest.
  useEffect(() => {
    if (!presetInterest) return
    setForm((f) => ({ ...f, interest: presetInterest.id }))
    setErrors((e) => ({ ...e, interest: undefined }))
  }, [presetInterest])

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const focusField = (key) => {
    const el = document.getElementById(`pe-${key}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return

    const { errors: found } = validateEnquiry(form)
    const firstError = Object.keys(found)[0]
    setErrors(found)
    setServerError('')
    if (firstError) {
      focusField(firstError)
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch('/api/partner-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, elapsedMs: Date.now() - startedAt.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors)
          const key = Object.keys(data.errors)[0]
          if (key) focusField(key)
        }
        setServerError(
          data.message ||
            (res.status === 429
              ? 'Too many submissions from this connection. Please try again later.'
              : 'We could not send your message. Please try again.'),
        )
        setStatus('idle')
        return
      }
      setStatus('success')
      scrollToId('enquire')
    } catch {
      setServerError('We could not reach Sellapage. Check your connection and try again.')
      setStatus('idle')
    }
  }

  const reset = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setServerError('')
    startedAt.current = Date.now()
    setStatus('idle')
  }

  if (status === 'success') {
    const firstName = form.fullName.trim().split(/\s+/)[0]
    return (
      <div className="rounded-2xl border border-forest-100 bg-white p-6 text-center shadow-sm sm:p-10" role="status">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50">
          <Check size={26} className="text-forest-600" />
        </div>
        <h3 className="font-display text-2xl font-extrabold text-gray-900">
          Thank you{firstName ? `, ${firstName}` : ''}.
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
          Your message is with the founder. Every submission is read personally, and you will hear back by
          email or WhatsApp. A confirmation should also reach <span className="font-semibold text-gray-700">{form.email}</span> shortly.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Send another enquiry
        </button>
      </div>
    )
  }

  const isInvestor = form.interest === 'investor'
  const submitting = status === 'submitting'

  return (
    <form onSubmit={submit} noValidate className="rounded-[28px] bg-white p-5 shadow-xl shadow-forest-900/5 ring-1 ring-gray-100 sm:p-8">
      {/* Honeypot: off screen, out of the tab order, invisible to screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={form.hp} onChange={(e) => set('hp', e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold text-gray-800">
          I am interested as <span className="text-red-500">*</span>
        </legend>
        <div id="pe-interest" tabIndex={-1} className="grid grid-cols-2 gap-2 outline-none sm:grid-cols-4" role="radiogroup" aria-describedby={errors.interest ? 'pe-interest-error' : undefined}>
          {INTEREST_OPTIONS.map((o) => {
            const active = form.interest === o.id
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('interest', o.id)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  active
                    ? 'border-forest-600 bg-forest-50 text-forest-700 ring-2 ring-forest-600/20'
                    : errors.interest
                    ? 'border-red-200 text-gray-600 hover:bg-gray-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
        <FieldError id="pe-interest-error" message={errors.interest} />
      </fieldset>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pe-fullName" className="mb-1.5 block text-sm font-semibold text-gray-800">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="pe-fullName"
            type="text"
            autoComplete="name"
            maxLength={LIMITS.name}
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'pe-fullName-error' : undefined}
            className={`${INPUT} ${inputTone(errors.fullName)}`}
          />
          <FieldError id="pe-fullName-error" message={errors.fullName} />
        </div>

        <div>
          <label htmlFor="pe-email" className="mb-1.5 block text-sm font-semibold text-gray-800">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="pe-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={LIMITS.email}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'pe-email-error' : undefined}
            className={`${INPUT} ${inputTone(errors.email)}`}
          />
          <FieldError id="pe-email-error" message={errors.email} />
        </div>

        <div>
          <label htmlFor="pe-phone" className="mb-1.5 block text-sm font-semibold text-gray-800">
            WhatsApp or phone <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="pe-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={LIMITS.phone}
            placeholder="+234..."
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'pe-phone-error' : undefined}
            className={`${INPUT} ${inputTone(errors.phone)}`}
          />
          <FieldError id="pe-phone-error" message={errors.phone} />
        </div>

        <div>
          <label htmlFor="pe-organisation" className="mb-1.5 block text-sm font-semibold text-gray-800">
            Organisation and role <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="pe-organisation"
            type="text"
            autoComplete="organization"
            maxLength={LIMITS.organisation}
            placeholder="e.g. Partner, Example Capital"
            value={form.organisation}
            onChange={(e) => set('organisation', e.target.value)}
            className={`${INPUT} ${inputTone(false)}`}
          />
        </div>

        {isInvestor && (
          <>
            <div>
              <label htmlFor="pe-investorType" className="mb-1.5 block text-sm font-semibold text-gray-800">
                Type of investor <span className="text-red-500">*</span>
              </label>
              <select
                id="pe-investorType"
                value={form.investorType}
                onChange={(e) => set('investorType', e.target.value)}
                aria-invalid={!!errors.investorType}
                aria-describedby={errors.investorType ? 'pe-investorType-error' : undefined}
                className={`${INPUT} ${inputTone(errors.investorType)}`}
              >
                <option value="">Choose one</option>
                {INVESTOR_TYPES.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <FieldError id="pe-investorType-error" message={errors.investorType} />
            </div>

            <div>
              <label htmlFor="pe-ticketSize" className="mb-1.5 block text-sm font-semibold text-gray-800">
                Typical investment size <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                id="pe-ticketSize"
                value={form.ticketSize}
                onChange={(e) => set('ticketSize', e.target.value)}
                className={`${INPUT} ${inputTone(false)}`}
              >
                <option value="">Choose a range</option>
                {TICKET_SIZES.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label htmlFor="pe-link" className="mb-1.5 block text-sm font-semibold text-gray-800">
            LinkedIn or website <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="pe-link"
            type="url"
            inputMode="url"
            autoComplete="url"
            maxLength={LIMITS.link}
            placeholder="linkedin.com/in/your-name"
            value={form.link}
            onChange={(e) => set('link', e.target.value)}
            aria-invalid={!!errors.link}
            aria-describedby={errors.link ? 'pe-link-error' : undefined}
            className={`${INPUT} ${inputTone(errors.link)}`}
          />
          <FieldError id="pe-link-error" message={errors.link} />
        </div>

        <div>
          <label htmlFor="pe-source" className="mb-1.5 block text-sm font-semibold text-gray-800">
            How did you hear about us? <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <select
            id="pe-source"
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
            className={`${INPUT} ${inputTone(false)}`}
          >
            <option value="">Choose one</option>
            {SOURCES.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="pe-message" className="mb-1.5 block text-sm font-semibold text-gray-800">
            Your message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="pe-message"
            rows={5}
            maxLength={LIMITS.message}
            placeholder="Tell us who you are, what you have in mind, and why Sellapage."
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'pe-message-error' : 'pe-message-count'}
            className={`${INPUT} ${inputTone(errors.message)} resize-y`}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id="pe-message-error" message={errors.message} />
            <p id="pe-message-count" className="ml-auto mt-1.5 flex-shrink-0 text-[11px] text-gray-400">
              {form.message.length}/{LIMITS.message}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="pe-consent" className="flex cursor-pointer items-start gap-3">
          <input
            id="pe-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? 'pe-consent-error' : undefined}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-forest-600 focus:ring-forest-600"
          />
          <span className="text-xs leading-relaxed text-gray-500">
            I agree to Sellapage storing these details to respond to my enquiry, as described in the{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-600 hover:underline">
              Privacy Policy
            </a>
            . <span className="text-red-500">*</span>
          </span>
        </label>
        <FieldError id="pe-consent-error" message={errors.consent} />
      </div>

      {serverError && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-4 text-[15px] font-bold text-white shadow-lg shadow-forest/20 transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Sending...
          </>
        ) : (
          <>
            Send to the founder <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  )
}

export default function PartnersPage() {
  // Changes identity on every click, so choosing the same card twice still
  // re-applies the preset after the visitor has changed it by hand.
  const [preset, setPreset] = useState(null)

  const choose = (id) => {
    setPreset({ id })
    scrollToId('enquire')
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/partners')} url="/partners" />
      <Navbar />

      {/* ── Hero: the business model, turning ───────────────────────────── */}
      <section className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-forest px-6 py-12 text-white sm:px-10 lg:py-16">
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-forest-600/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-forest-700/60 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Reveal>
              <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">Investors and partners</span>
              <h1 className="mt-5 text-balance font-display text-[2.3rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.2rem] lg:text-[3.6rem]">
                Help build the platform Nigerian businesses <span className="text-amber-300">run and grow on.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/80 sm:text-[17px]">
                Sellapage is a live business management and growth platform for Nigerian small businesses: one dashboard to sell online, take payments, run orders and bookings, deliver and grow. We are looking for investors, strategic partners and a co-founder to scale it.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => scrollToId('enquire')} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-forest shadow-xl transition hover:bg-forest-50">
                  Start a conversation <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </button>
                <button type="button" onClick={() => scrollToId('model')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-4 text-[15px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15">
                  How it makes money
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/70">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} className="text-forest-200" />CAC registered, BN 9689086</span>
                <span className="inline-flex items-center gap-1.5"><Code2 size={15} className="text-forest-200" />Built in house, in Lagos</span>
                <span className="inline-flex items-center gap-1.5"><Gauge size={15} className="text-forest-200" />Live since May 2026</span>
              </div>
            </Reveal>
            <Reveal direction="left" delay={150}><GrowthLoop /></Reveal>
          </div>
        </div>
      </section>

      {/* ── Traction (live from Ops) ─────────────────────────────────────── */}
      <TractionSection />

      {/* ── The product ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-forest-50/50 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal direction="left" className="rounded-[28px] bg-white p-6 ring-1 ring-gray-100 sm:p-8">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">The problem</span>
              <h3 className="mt-3 font-display text-[1.4rem] font-extrabold leading-tight text-gray-950 sm:text-[1.6rem]">Most Nigerian businesses are run by hand.</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-gray-600">Sales in Instagram DMs and WhatsApp chats, payments matched against bank alerts, dispatch riders booked by phone, records in a notebook. Nothing is joined up, and buyers find it hard to trust a seller they have never met.</p>
            </Reveal>
            <Reveal direction="right" delay={120} className="rounded-[28px] bg-forest p-6 text-white sm:p-8">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-100">What Sellapage does</span>
              <h3 className="mt-3 font-display text-[1.4rem] font-extrabold leading-tight sm:text-[1.6rem]">One platform to run and grow the business.</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/80">A store with checkout, delivery and bookings built in, plus one dashboard for orders, customers, receipts, team, marketing and an AI assistant. The Starter plan is free, so any business can begin.</p>
            </Reveal>
          </div>
          <Reveal className="mx-auto mt-12 max-w-[1240px]">
            <p className="mb-5 text-center text-[13px] font-semibold text-gray-500">The live product: a shopper pays on their phone and the order lands in the owner&apos;s dashboard.</p>
            <HeroStage />
          </Reveal>
          <p className="mt-6 text-center"><Link to="/about" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-forest-700 hover:underline">Everything live today, on our About page <ArrowRight size={15} /></Link></p>
        </div>
      </section>

      {/* ── Business model ───────────────────────────────────────────────── */}
      <section id="model" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal>
            <Eyebrow>Business model</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.6rem]">Free to start. Paid as it grows.</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-gray-600">A free Starter plan removes the barrier to entry. Subscriptions in naira unlock checkout, delivery, customer tools, team accounts and AI as a business grows, and Sellapage never takes a cut of a vendor&apos;s sales.</p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[[Coins, 'Plan subscriptions', 'Monthly to yearly, in naira'], [Bot, 'Sella AI credits', 'Packs for heavier AI use'], [Truck, 'Delivery bookings', 'Shipments paid for through Sellapage']].map(([I, t, s]) => (
                <li key={t} className="rounded-2xl bg-gray-50 p-4"><I size={18} className="text-forest-600" /><p className="mt-2 text-[13.5px] font-bold text-gray-900">{t}</p><p className="text-[12px] text-gray-500">{s}</p></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="rounded-[28px] bg-white p-6 ring-1 ring-gray-100 shadow-xl shadow-forest-900/5 sm:p-8">
            <p className="flex items-center gap-2 text-[13px] font-bold text-gray-500"><LineChart size={16} className="text-forest-600" />Revenue per business rises with its plan</p>
            <div className="mt-6"><PlanLadder /></div>
          </Reveal>
        </div>
      </section>

      {/* ── How we build ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 text-center">
            <Eyebrow>How we build</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.6rem]">Capital efficient by design.</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              [Code2, 'Built without outside money', 'The whole platform was designed and built in house by the founder and his engineering studio, with no outsourced code to buy back or rewrite later.'],
              [Gauge, 'Costs that follow revenue', 'Sellapage runs on usage-based infrastructure. Costs stay close to zero at today’s size and rise only as usage, and the revenue that comes with it, grows.'],
              [TrendingUp, 'A clear way to make money', 'Growth, Pro and Premium subscriptions in naira unlock checkout, delivery, analytics and team tools as a business grows.'],
            ].map(([I, title, body], i) => (
              <Reveal key={title} delay={i * 100} className="group rounded-[24px] bg-forest-50/70 p-6 ring-1 ring-forest-100 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-forest-900/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-sm transition group-hover:bg-forest group-hover:text-white"><I size={20} /></span>
                <h3 className="mt-4 font-display text-[18px] font-extrabold text-gray-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we are looking for ───────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 text-center">
            <Eyebrow>Who we are looking for</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.6rem]">Four ways to build this with us.</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOOKING_FOR.map(({ id, Icon, title, body }, i) => (
              <Reveal key={id} delay={i * 80} className="group flex flex-col rounded-[24px] bg-white p-6 ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 transition group-hover:bg-forest group-hover:text-white"><Icon size={20} /></span>
                <h3 className="mt-4 font-display text-[18px] font-extrabold text-gray-900">{title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-600">{body}</p>
                <button type="button" onClick={() => choose(id)} className="mt-5 inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-forest-700">
                  Talk to us <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who builds Sellapage ─────────────────────────────────────────── */}
      <section id="founder" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="grid grid-cols-1 overflow-hidden rounded-[32px] ring-1 ring-gray-100 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="relative flex flex-col items-center justify-center gap-6 bg-gray-950 p-10 text-white">
              <div className="flex items-center gap-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-2 shadow-xl"><img src="/og-image.png" alt="Sellapage" className="h-full w-full rounded-2xl" /></span>
                <span className="text-[22px] font-extrabold text-white/40">+</span>
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-black shadow-xl ring-1 ring-white/10"><img src="/nexkeys-logo.png" alt="NexKeys Agency" className="h-full w-full object-contain" /></span>
              </div>
              <p className="max-w-xs text-center text-[13.5px] leading-relaxed text-white/70">Sellapage is designed, built and run in Lagos by NexKeys Agency, the software studio behind it.</p>
              <Script className="-rotate-3 text-[24px] leading-none !text-amber-300">Built here, for here</Script>
            </div>
            <div className="bg-white p-6 sm:p-10">
              <Eyebrow>Who builds Sellapage</Eyebrow>
              <h2 className="mt-4 font-display text-[1.8rem] font-extrabold text-gray-950">{FOUNDER.name}</h2>
              <p className="mt-1 text-[14px] font-bold text-forest-700">{FOUNDER.role}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOUNDER.skills.map((s) => <span key={s} className="rounded-full bg-forest-50 px-3 py-1 text-[12px] font-semibold text-forest-700 ring-1 ring-forest-100">{s}</span>)}
              </div>
              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-gray-600">
                <p>Ernest leads the engineering of the entire platform, from the storefronts and Paystack checkout to delivery, bookings, analytics and the Sella AI assistant, built through NexKeys Agency, the Lagos software studio he leads.</p>
                <p>Trained in Computer and Software Engineering at Middlesex University, he works across front-end, full-stack and DevOps engineering. That depth is why Sellapage reached live vendors and real transactions without outside funding, on an architecture that runs lean today and is ready to scale as revenue grows.</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A66C2] px-5 py-3 text-[14px] font-bold text-white transition hover:opacity-90"><Linkedin size={16} />Connect on LinkedIn</a>
                <a href="https://nexkeysagency.com.ng" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-[14px] font-bold text-gray-700 transition hover:bg-gray-50">NexKeys Agency <ExternalLink size={14} /></a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Enquiry form ─────────────────────────────────────────────────── */}
      <section id="enquire" className="scroll-mt-20 bg-gradient-to-b from-white via-forest-50/60 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <Eyebrow>Start a conversation</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-extrabold text-gray-950 sm:text-[2.6rem]">Talk to the founder.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-gray-600">Tell us who you are and what you have in mind. It goes straight to the founder, not a sales inbox.</p>
          </Reveal>
          <EnquiryForm presetInterest={preset} />
        </div>
      </section>

      {/* ── FAQ and legal notice ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center"><h2 className="font-display text-[2rem] font-extrabold text-gray-950">Questions.</h2></Reveal>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Reveal as="details" key={f.q} delay={i * 40} className="group rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/60 open:ring-1 open:ring-forest-100">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[15px] font-semibold text-gray-900">{f.q}</span>
                  <ChevronDown size={16} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-relaxed text-gray-600">{f.a}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <p className="text-[12.5px] leading-relaxed text-gray-500">
              This page is for introductions only. It is not an offer or an invitation to subscribe for shares, securities or any other investment in Sellapage. Any investment would be discussed privately and made only through proper legal documentation.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
