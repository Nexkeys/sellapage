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

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Loader2, AlertCircle, TrendingUp, Layers, Users, Rocket,
  Linkedin, ExternalLink, ShieldCheck, Store, CreditCard, Truck, CalendarDays,
  BarChart3, ChevronDown,
} from 'lucide-react'
import SellaLogo from '../components/SellaLogo'
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

  const count = status === 'loading' ? 4 : stats.length
  const cols =
    count === 1
      ? 'mx-auto max-w-xs grid-cols-1'
      : count === 2
      ? 'mx-auto max-w-2xl grid-cols-2'
      : count === 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-2 lg:grid-cols-3'
  const asOfLabel = formatAsOf(asOf)

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-10 text-center">
          <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-600">Traction</span>
          <h2 className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Where we are today</h2>
        </Reveal>
        <div className={`grid gap-3 sm:gap-4 ${cols}`} aria-busy={status === 'loading'}>
          {status === 'loading'
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mx-auto h-7 w-16 rounded bg-gray-100 sm:h-8" />
                  <div className="mx-auto mt-3 h-3 w-24 rounded bg-gray-100" />
                  <div className="mx-auto mt-2 h-2.5 w-20 rounded bg-gray-50" />
                </div>
              ))
            : stats.map((t, i) => (
                <Reveal key={`${i}-${t.label}`} delay={i * 80} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm sm:p-6">
                  <p className="break-words font-display text-2xl font-extrabold text-brand-600 sm:text-3xl">{t.value}</p>
                  <p className="mt-1.5 text-sm font-semibold text-gray-800">{t.label}</p>
                  {t.note && <p className="mt-0.5 text-xs text-gray-400">{t.note}</p>}
                </Reveal>
              ))}
        </div>
        {status === 'ready' && asOfLabel && (
          <p className="mt-5 text-center text-xs text-gray-400">Figures as of {asOfLabel}.</p>
        )}
      </div>
    </section>
  )
}

const LIVE_TODAY = [
  { Icon: Store, text: 'Store pages for products, and a separate booking page for services' },
  { Icon: CreditCard, text: 'Paystack checkout with payouts straight to the vendor bank account' },
  { Icon: Truck, text: 'Sendbox and Topship delivery rates and shipment booking' },
  { Icon: CalendarDays, text: 'Orders, bookings, customer records, reviews and discount codes' },
  { Icon: BarChart3, text: 'Analytics, a store designer, custom domains and staff accounts' },
  { Icon: SellaLogo, text: 'Sella, an AI business assistant for store owners' },
]

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
  role: 'Founder & CTO, Sellapage',
  photo: '/founder-ernest-uwaoma.jpg',
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
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500/20'
const inputTone = (hasError) =>
  hasError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-500'

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

function FounderPhoto() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
        <span className="font-display text-6xl font-extrabold text-white/90">EU</span>
      </div>
    )
  }
  return (
    <img
      src={FOUNDER.photo}
      alt={`${FOUNDER.name}, founder and CTO of Sellapage`}
      onError={() => setFailed(true)}
      loading="lazy"
      className="aspect-[4/5] w-full rounded-2xl object-cover shadow-sm ring-1 ring-gray-100"
    />
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
      <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center shadow-sm sm:p-10" role="status">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Check size={26} className="text-brand-600" />
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
    <form onSubmit={submit} noValidate className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
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
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
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
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-xs leading-relaxed text-gray-500">
            I agree to Sellapage storing these details to respond to my enquiry, as described in the{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
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
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
    <div className="min-h-screen bg-white font-body">
      <SEO {...pageSeo('/partners')} url="/partners" />
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 px-4 pb-16 pt-28 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">
            Investors & Partners
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            Help us build how Nigerian businesses sell online
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Sellapage is a live commerce platform for Nigerian small businesses: one store link with checkout,
            delivery and bookings, and one dashboard to run it all. We are looking for investors, strategic
            partners and a co-founder to grow it.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => scrollToId('enquire')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Start a conversation <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollToId('founder')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Meet the founder
            </button>
          </div>
        </div>
      </section>

      {/* ── TRACTION ─────────────────────────────────────────────────────── */}
      <TractionSection />

      {/* ── PROBLEM AND PRODUCT ──────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <Reveal direction="left" className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-400">The problem</span>
              <h3 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Selling online in Nigeria is stitched together by hand</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Most small businesses sell through Instagram DMs, WhatsApp chats and bank transfers, then book a
                dispatch rider by phone. Nothing is joined up, customers find it hard to trust a seller they have
                never met, and the owner tracks everything in their head.
              </p>
            </Reveal>
            <Reveal direction="right" delay={120} className="rounded-2xl bg-brand-600 p-6 sm:p-8">
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-100">What Sellapage does</span>
              <h3 className="font-display text-xl font-bold text-white sm:text-2xl">One store link and one dashboard</h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-100">
                Each business gets a store page with checkout, delivery and bookings built in, and one place to
                manage orders, customers, payments and growth. The Starter plan is free, so any seller can begin
                without paying anything.
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-10 sm:mt-12">
            <h3 className="mb-5 text-center font-display text-lg font-bold text-gray-900">Live on the platform today</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LIVE_TODAY.map(({ Icon, text }) => (
                <div key={text} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <Icon size={15} className="text-brand-600" />
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center">
              <Link to="/about" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                See the full platform on our About page <ArrowRight size={14} />
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW WE BUILD ─────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-10 text-center">
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-600">How we build</span>
            <h2 className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Capital efficient by design</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: 'Built without outside money',
                body: 'The whole platform was designed and built in house by the founder and his engineering studio, with no outsourced code to buy back or rewrite later.',
              },
              {
                title: 'Costs that follow revenue',
                body: 'Sellapage runs on usage-based infrastructure. Costs stay close to zero at today’s size and rise only as usage, and the revenue that comes with it, grows.',
              },
              {
                title: 'A clear way to make money',
                body: 'A free Starter plan removes the barrier to entry. Growth, Pro and Premium subscriptions in naira unlock checkout, delivery, analytics and team tools as a business grows.',
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 100} className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
                <h3 className="font-display text-lg font-bold text-brand-700">{c.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-brand-700/80">{c.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE LOOKING FOR ───────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-10 text-center">
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-600">Who we are looking for</span>
            <h2 className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Four ways to build this with us</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LOOKING_FOR.map(({ id, Icon, title, body }, i) => (
              <Reveal key={id} delay={i * 80} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{body}</p>
                <button
                  type="button"
                  onClick={() => choose(id)}
                  className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-bold text-brand-600 hover:text-brand-700"
                >
                  Talk to us <ArrowRight size={14} />
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ──────────────────────────────────────────────────────── */}
      <section id="founder" className="scroll-mt-20 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center">
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-600">The founder</span>
            <h2 className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Who is building Sellapage</h2>
          </Reveal>
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_1fr] md:gap-10">
            <Reveal direction="left" className="mx-auto w-full max-w-[280px]">
              <FounderPhoto />
            </Reveal>
            <Reveal direction="right" delay={120}>
              <h3 className="font-display text-2xl font-extrabold text-gray-900">{FOUNDER.name}</h3>
              <p className="mt-1 text-sm font-semibold text-brand-600">{FOUNDER.role}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOUNDER.skills.map((s) => (
                  <span key={s} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-gray-600 sm:text-base">
                <p>
                  Ernest is the founder and CTO of Sellapage. He leads the engineering of the entire platform, from
                  the storefronts and Paystack checkout to delivery, bookings, analytics and the Sella AI assistant,
                  built through NexKeys Agency, the Lagos software studio he leads.
                </p>
                <p>
                  Trained in Computer and Software Engineering at Middlesex University, he works across front-end,
                  full-stack and DevOps engineering. That depth is why Sellapage reached live vendors and real
                  transactions without outside funding, on an architecture that runs lean today and is ready to
                  scale as revenue grows.
                </p>
                <p>
                  He is now looking for investors, strategic partners and a commercial co-founder to take Sellapage
                  from its first users to the default way Nigerian businesses sell online.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={FOUNDER.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <Linkedin size={16} /> Connect on LinkedIn
                </a>
                <a
                  href="https://nexkeysagency.com.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  NexKeys Agency <ExternalLink size={14} />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ENQUIRY FORM ─────────────────────────────────────────────────── */}
      <section id="enquire" className="scroll-mt-20 bg-gray-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-brand-600">Start a conversation</span>
            <h2 className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Talk to the founder</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
              Tell us who you are and what you have in mind. It goes straight to the founder, not a sales inbox.
            </p>
          </Reveal>
          <EnquiryForm presetInterest={preset} />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <h2 className="font-display text-3xl font-extrabold text-gray-900">Questions</h2>
          </Reveal>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {FAQS.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:px-6 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown size={16} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-gray-500 sm:px-6">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <p className="text-xs leading-relaxed text-gray-500">
              This page is for introductions only. It is not an offer or an invitation to subscribe for shares,
              securities or any other investment in Sellapage. Any investment would be discussed privately and made
              only through proper legal documentation.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
