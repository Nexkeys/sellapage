// src/pages/about.jsx
//
// About Sellapage, rebuilt 2026-10-08. This page answers "who are these people
// and can I trust them?", so it is where the trust facts live (moved here from
// the homepage at Nex's request): CAC registration, Paystack (which holds the
// CBN licence, not Sellapage), encrypted storage on Google Firebase, and the
// app. No vendor reviews or platform figures here; those belong on
// /success-stories. No team section; the team is on the investors page.
//
// Every fact is checked against the code or the old About page:
//   - "No cut of your sales": create-subaccount.js sets percentage_charge: 0
//   - the services under the hood are the ones the platform actually calls
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, ShieldCheck, Lightbulb, HeartHandshake, Scale, Users2, BadgePercent, Rocket, LifeBuoy, Wrench, CreditCard,
  MapPin, ChevronDown, Heart, Building2, Lock, Database, ImageIcon, Server, BellRing, Mail, MessageSquare, BadgeCheck, BookOpen,
  MessageCircle, Landmark, Bike, FileSpreadsheet, Instagram, LayoutDashboard,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import MediaSlot from '../media/MediaSlot'
import PlayStoreBadge, { AppStoreSoon } from '../components/PlayStoreBadge'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script, Leaf } from '../components/marketing/kit'
import { useClock, useOnScreen } from '../components/marketing/motion'

const TRUST = [
  { icon: BadgeCheck, title: 'CAC registered', sub: 'Business name BN 9689086' },
  { icon: ShieldCheck, title: 'Payments by Paystack', sub: 'A CBN-licensed payment processor' },
  { icon: Lock, title: 'Encrypted data', sub: 'Stored on Google Firebase' },
]

const VALUES = [
  { icon: Lightbulb, title: 'Keep it simple', sub: 'If it needs a manual, we have not finished building it.' },
  { icon: HeartHandshake, title: 'Owners first', sub: 'Your success is the only measure we use.' },
  { icon: Scale, title: 'Straight dealing', sub: 'No hidden fees and no cut of your sales.' },
  { icon: Users2, title: 'Grow together', sub: 'We grow when the businesses on Sellapage grow.' },
]

const WHY = [
  { icon: BadgePercent, title: 'No cut of your sales', sub: 'Sellapage takes nothing from what customers pay you.' },
  { icon: Rocket, title: 'Fast setup', sub: 'Your store can be live the same day.' },
  { icon: LifeBuoy, title: 'Real support', sub: 'Real people answer, by email and in your dashboard.' },
  { icon: Wrench, title: 'One toolbox', sub: 'Orders, bookings, delivery, customers, records and marketing.' },
  { icon: CreditCard, title: 'Secure payments', sub: 'Card, transfer and USSD through Paystack.' },
  { icon: MapPin, title: 'Made for Nigeria', sub: 'Naira pricing, local delivery and the way you already sell.' },
]

const UNDER_THE_HOOD = [
  { icon: Building2, label: 'Business registration', value: 'CAC registered, BN 9689086' },
  { icon: CreditCard, label: 'Payment processing', value: 'Paystack (CBN licensed)' },
  { icon: Database, label: 'Data storage', value: 'Google Firebase, encrypted at rest' },
  { icon: ImageIcon, label: 'Image hosting', value: 'Cloudinary global CDN' },
  { icon: Server, label: 'Hosting', value: 'Vercel (SOC 2 certified)' },
  { icon: BellRing, label: 'Notifications', value: 'Firebase Cloud Messaging' },
  { icon: Mail, label: 'Email delivery', value: 'Resend' },
  { icon: Lock, label: 'Security', value: 'ISO/IEC 27001 guidance, reviewed by a co-founder' },
  { icon: MessageSquare, label: 'Support', value: 'sellapage.ng@gmail.com' },
]

const CAPABILITIES = [
  'Online store for products, with zoom, stock badges and categories',
  'Services and bookings, with a calendar for appointments',
  '20 premium store themes with colour, font and layout control',
  'Paystack checkout: card, bank transfer and USSD',
  'Paid orders created automatically, payouts settled to your bank',
  'Sendbox and Topship delivery rates, booking and tracking',
  'Delivery zones and pickup addresses',
  'Branded PDF receipts and a sales ledger for walk-in sales',
  'Customer records with spend, orders and recency',
  'Verified buyer reviews on products and services',
  'Discount and promo codes with limits and expiry',
  'Loyalty points and abandoned checkout reminders (Premium)',
  'Team accounts with roles',
  'Analytics: store views, clicks and best sellers',
  'Google Search, Shopping and Maps listings',
  'Google Ads, Meta Pixel and TikTok Pixel (Premium)',
  'Sella, an AI assistant that knows your store',
  'AI product and service descriptions',
  'Custom domain and CAC verification badge',
  'Push and email alerts for orders, reviews and bookings',
  'The Sellapage app for Android',
  'Job listings and a public jobs board',
  'Referral programme for businesses you bring in',
]

// The scattered ways a business is usually run, before they come together.
const BEFORE = [
  { icon: Instagram, label: 'Instagram DMs', x: 6, y: 10 },
  { icon: MessageCircle, label: 'WhatsApp chats', x: 62, y: 4 },
  { icon: Landmark, label: 'Bank alerts', x: 0, y: 58 },
  { icon: BookOpen, label: 'A sales notebook', x: 58, y: 64 },
  { icon: Bike, label: 'Calling dispatch riders', x: 28, y: 86 },
  { icon: FileSpreadsheet, label: 'A stock spreadsheet', x: 30, y: 34 },
]

/** Six scattered tools pulling together into one dashboard, on a loop. */
function ComeTogether() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 4200 })
  const p = t % 8000
  const together = p > 2600 && p < 7200
  return (
    <div ref={ref} className="relative mx-auto h-[360px] w-full max-w-[520px]" aria-hidden="true">
      {BEFORE.map((b, i) => (
        <span key={b.label} className="absolute flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-[12.5px] font-semibold text-gray-700 shadow-lg shadow-gray-900/5 ring-1 ring-gray-100 transition-all"
          style={{
            left: together ? '50%' : `${b.x}%`,
            top: together ? '50%' : `${b.y}%`,
            transform: together ? 'translate(-50%,-50%) scale(.4)' : `rotate(${(i % 2 ? 1 : -1) * (2 + i)}deg)`,
            opacity: together ? 0 : 1,
            transitionDelay: `${i * 70}ms`,
            transitionDuration: '900ms',
            transitionTimingFunction: 'cubic-bezier(.6,0,.2,1)',
          }}>
          <b.icon size={15} className="text-gray-400" />{b.label}
        </span>
      ))}
      <div className={`absolute left-1/2 top-1/2 w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-4 shadow-2xl shadow-forest-900/15 ring-1 ring-forest-100 transition-all duration-700 ${together ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} style={{ transitionDelay: together ? '500ms' : '0ms' }}>
        <div className="flex items-center gap-2"><img src="/og-image.png" alt="" className="h-7 w-7 rounded-lg" /><span className="font-display text-[14px] font-extrabold text-gray-900">One dashboard</span><LayoutDashboard size={15} className="ml-auto text-forest-600" /></div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {['Orders', 'Payments', 'Delivery', 'Customers', 'Stock', 'Records'].map((x, i) => (
            <span key={x} className={`rounded-lg bg-forest-50 px-1.5 py-2 text-center text-[10.5px] font-bold text-forest-700 transition-all duration-500 ${together ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`} style={{ transitionDelay: together ? `${700 + i * 90}ms` : '0ms' }}>{x}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function About() {
  const [showAll, setShowAll] = useState(false)
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return undefined
    const id = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    return () => clearTimeout(id)
  }, [hash])

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/about')} url="/about" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50/70 via-white to-white pb-10 pt-10 sm:pt-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-8">
          <Reveal>
            <Eyebrow>About Sellapage</Eyebrow>
            <h1 className="mt-4 text-balance font-display text-[2.4rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.2rem] lg:text-[3.6rem]">
              We build the tools Nigerian businesses <span className="text-forest-600">run and grow on.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[16.5px]">
              Sellapage is a business management and growth platform for Nigerian entrepreneurs, service providers and creators. One place to sell online, take payments, run orders and bookings, deliver, keep customer records and receipts, and get found on Google.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/login?mode=register" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">Start free <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
              <a href="#trust" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"><ShieldCheck size={17} className="text-forest-600" />Why you can trust us</a>
            </div>
          </Reveal>
          <Reveal direction="left" delay={120} className="relative">
            <Leaf className="absolute -left-4 -top-6 h-24 w-20 -rotate-12" tone="text-forest-100" />
            <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-forest-900/10 ring-1 ring-white">
              <MediaSlot name="about-hero" alt="A Nigerian business owner running her business on a laptop" priority className="aspect-[4/3] w-full object-cover"
                fallback={<div className="flex aspect-[4/3] w-full items-end justify-center bg-gradient-to-br from-forest-50 to-forest-100 px-6 pt-10"><img src="/Herosection-mainlaptop.png" alt="The Sellapage dashboard on a laptop" className="w-full max-w-[520px] object-contain drop-shadow-2xl" /></div>} />
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-2.5 rounded-2xl bg-forest px-4 py-3 text-white shadow-xl shadow-forest-900/25 sm:-left-6">
              <CheckCircle2 size={22} className="flex-shrink-0" />
              <span><span className="block text-[13px] font-bold leading-tight">Built in Lagos</span><span className="block text-[11px] text-white/75">For businesses across Nigeria</span></span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust facts ──────────────────────────────────────────────────── */}
      <section id="trust" className="scroll-mt-24 px-4 pt-10 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-1 gap-3 rounded-[28px] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-gray-100 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 rounded-2xl bg-forest-50/60 p-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-forest-600 shadow-sm"><t.icon size={21} /></span>
              <span className="min-w-0"><span className="block text-[14px] font-bold text-gray-900">{t.title}</span><span className="block text-[12.5px] text-gray-500">{t.sub}</span></span>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-forest-50/60 p-3">
            <PlayStoreBadge className="origin-center scale-[0.88]" />
            <AppStoreSoon tone="light" className="origin-center scale-[0.88]" />
          </div>
        </Reveal>
      </section>

      {/* ── Why Sellapage exists ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Why we exist</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold leading-tight text-gray-950 sm:text-[2.5rem]">Running a business shouldn&apos;t mean juggling six apps.</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-gray-600">
              Most Nigerian businesses are run across an Instagram page, a WhatsApp thread, bank alerts, a notebook and a dispatch rider&apos;s number, with nothing joined up. Orders get missed, payments get lost, and the owner never really sees how the business is doing.
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-gray-600">
              Sellapage brings all of it into one place, built for how business actually works here: naira, Paystack, local delivery, and customers who expect to pay by transfer.
            </p>
          </Reveal>
          <Reveal delay={120} className="rounded-[32px] bg-gradient-to-br from-forest-50 to-white p-4 ring-1 ring-forest-100 sm:p-8"><ComeTogether /></Reveal>
        </div>
      </section>

      {/* ── Mission, vision and values ───────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white via-forest-50/50 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Reveal className="relative min-h-[340px] overflow-hidden rounded-[32px] shadow-xl shadow-forest-900/10">
            <MediaSlot name="about-mission" alt="A modern green glass building among palm trees" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
              fallback={<div className="absolute inset-0 bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900" />} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/85 via-forest-900/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <Script className="text-[30px] leading-[0.95] text-white sm:text-[36px]">Together we grow <Heart className="inline h-6 w-6 align-[-2px]" strokeWidth={2.4} /></Script>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/85"><span className="font-bold text-white">Our vision:</span> to be the platform African businesses run and grow on, starting with Nigeria.</p>
            </div>
          </Reveal>
          <Reveal delay={120} className="flex flex-col rounded-[32px] bg-white p-6 ring-1 ring-gray-100 sm:p-8">
            <Eyebrow>Our mission</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.6rem] font-extrabold leading-tight text-gray-950 sm:text-[2rem]">Make running a business simple for every Nigerian owner.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">Whatever their technical ability or budget. We started with the simplest possible product and keep building from there, one real business at a time.</p>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {VALUES.map((v) => (
                <li key={v.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><v.icon size={17} /></span>
                  <span><span className="block text-[14px] font-bold text-gray-900">{v.title}</span><span className="block text-[12.5px] leading-snug text-gray-500">{v.sub}</span></span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Why choose ───────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-2xl">
            <Eyebrow>Why businesses choose Sellapage</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.4rem]">A partner, not just software.</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={(i % 3) * 80} className="group flex items-start gap-4 rounded-3xl border border-gray-100 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-xl hover:shadow-forest-900/5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 transition duration-300 group-hover:bg-forest-600 group-hover:text-white"><w.icon size={21} /></span>
                <span><span className="block text-[15px] font-bold text-gray-900">{w.title}</span><span className="mt-1 block text-[13.5px] leading-snug text-gray-500">{w.sub}</span></span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Under the hood ───────────────────────────────────────────────── */}
      <section id="transparency" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] bg-gray-50 p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Reveal>
              <Eyebrow>Transparency</Eyebrow>
              <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">What&apos;s under the hood.</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">We are open about how the platform works, where your data lives and what your plan includes. Built in Lagos by NexKeys Agency.</p>
              <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13.5px] font-semibold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50">
                Everything live today ({CAPABILITIES.length}) <ChevronDown size={16} className={`transition ${showAll ? 'rotate-180' : ''}`} />
              </button>
            </Reveal>
            <Reveal delay={120} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {UNDER_THE_HOOD.map((u) => (
                <div key={u.label} className="flex min-w-0 items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><u.icon size={17} /></span>
                  <span className="min-w-0"><span className="block text-[12px] font-semibold text-gray-500">{u.label}</span><span className="block break-words text-[13.5px] font-semibold text-gray-900">{u.value}</span></span>
                </div>
              ))}
            </Reveal>
          </div>
          {showAll && (
            <div className="mt-8 grid grid-cols-1 gap-2.5 animate-in fade-in slide-in-from-top-2 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((c) => <p key={c} className="flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-[13px] text-gray-700"><CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-forest-600" />{c}</p>)}
            </div>
          )}
        </div>
      </section>

      {/* ── Call to action ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-forest text-white">
          <div className="relative grid grid-cols-1 items-stretch lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="px-6 py-10 sm:px-10 lg:py-14">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest-200">Ready when you are</p>
              <h2 className="mt-3 text-balance font-display text-[1.8rem] font-extrabold leading-tight sm:text-[2.3rem]">Give your business the tools it deserves.</h2>
              <p className="mt-3 max-w-lg text-[15px] text-white/80">The Starter plan is free for good. Upgrade when you are ready.</p>
              <Link to="/login?mode=register" className="group mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-bold text-forest-700 shadow-lg transition hover:bg-forest-50">
                Start free <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="relative min-h-[260px]">
              <MediaSlot name="about-cta" alt="A proud boutique owner at her shop door with her phone" className="absolute inset-0 h-full w-full object-cover"
                fallback={(
                  <div className="absolute inset-0 flex items-center justify-center bg-forest-700">
                    <Leaf className="absolute -right-6 -top-4 h-40 w-28 rotate-12" tone="text-white/5" />
                    <Script className="relative -rotate-6 text-center text-[34px] leading-[0.95] text-white sm:text-[42px]">Your success<br />starts here <Heart className="inline h-7 w-7 align-[-3px]" strokeWidth={2.4} /></Script>
                  </div>
                )} />
              <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/10 to-transparent max-lg:bg-gradient-to-b" />
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
