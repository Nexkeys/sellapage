// src/pages/about.jsx
//
// About Sellapage, redesigned 2026-10-07 from Nex's mockup. Every claim on this
// page is true today:
//   - figures come live from Ops (TractionStats), not from the mockup
//   - reviews are real, approved ones from the Reviews wall (ReviewsCarousel)
//   - "No cut of your sales": create-subaccount.js sets percentage_charge: 0
//   - the facts under the hood are the ones the old page already listed
// No team section on purpose: the team belongs on the investors page.
// Photos come from media-src (about-hero, about-mission, about-cta); until one
// is added, its spot shows a designed fallback, never an empty box.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, ShieldCheck, Hexagon, Wand2, Lightbulb, HeartHandshake, Scale, Users2, BadgePercent, Rocket,
  LifeBuoy, Wrench, CreditCard, MapPin, ChevronDown, Headphones, Heart, Building2, Lock, Database, ImageIcon, Server, BellRing, Mail, MessageSquare,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import MediaSlot from '../media/MediaSlot'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script, Leaf, TractionStats, ReviewsCarousel, useApprovedReviews } from '../components/marketing/kit'

const HERO_POINTS = [
  { icon: Wand2, title: 'Easy to use', sub: 'No technical skills needed' },
  { icon: ShieldCheck, title: 'Secure and reliable', sub: 'Payments through Paystack' },
  { icon: Hexagon, title: 'Built for Nigeria', sub: 'Naira, WhatsApp, local delivery' },
]

const VALUES = [
  { icon: Lightbulb, title: 'Innovation', sub: 'We keep improving, one real seller at a time.' },
  { icon: HeartHandshake, title: 'Customer focus', sub: 'Your success is the measure we use.' },
  { icon: Scale, title: 'Integrity', sub: 'No hidden fees, no cut of your sales.' },
  { icon: Users2, title: 'Community', sub: 'We grow when you grow.' },
]

const WHY = [
  { icon: BadgePercent, title: 'No cut of your sales', sub: 'Sellapage takes nothing from what customers pay you.' },
  { icon: Rocket, title: 'Fast setup', sub: 'Your store can be live in minutes.' },
  { icon: LifeBuoy, title: 'Real support', sub: 'Real people answer, by email and in your dashboard.' },
  { icon: Wrench, title: 'Powerful tools', sub: 'Orders, delivery, CRM, discounts and analytics.' },
  { icon: CreditCard, title: 'Secure payments', sub: 'Card, transfer and USSD through Paystack.' },
  { icon: MapPin, title: 'Local focus', sub: 'Built for how Nigerian businesses sell.' },
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
  'Public store page for products with zoom lightbox and stock badges',
  'Public services page for bookings with duration and location types',
  '20 premium store themes with colour, font and layout control',
  'Category filters and search on every store',
  'WhatsApp cart on Growth; in-app Paystack checkout on Pro and Premium',
  'Lead capture form on every store page',
  'Sendbox and Topship delivery rates at checkout, with booking and tracking',
  'PDF receipt after checkout',
  'Ratings on products and services; verified buyer reviews (Pro and up)',
  'Dashboard: products, services, orders, delivery, CRM, analytics, discounts, reviews, billing, settings, support',
  'Push and email notifications for orders, reviews and subscriptions',
  'AI product and service descriptions',
  'Stock management with out-of-stock sorting',
  'Delivery zones and pickup addresses (Pro and up)',
  'Customer CRM with spend, orders and recency (Pro and up)',
  'Discount and promo codes with limits and expiry (Pro and up)',
  'Product export to PDF, CSV and Excel (Pro and up)',
  'Custom domain and CAC verification (Pro and up)',
  'Job listings on every plan',
  'Sellapage blog with public comments',
  'Referral programme: earn when businesses you refer upgrade',
]

function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute inset-x-6 bottom-0 top-10 rounded-[40px] bg-gradient-to-br from-forest-100 via-forest-50 to-white" />
      <Leaf className="absolute -left-4 top-6 h-24 w-20 -rotate-12 animate-float" tone="text-forest-100" />
      <Leaf className="absolute -right-2 bottom-10 h-28 w-20 rotate-[24deg] animate-float-delayed" tone="text-forest-200/70" />
      <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-forest-900/10 ring-1 ring-white">
        <MediaSlot name="about-hero" alt="A Nigerian business owner running her store on a laptop" priority className="aspect-[4/3] w-full object-cover"
          fallback={<div className="flex aspect-[4/3] w-full items-end justify-center bg-gradient-to-br from-forest-50 to-forest-100 px-6 pt-10"><img src="/Herosection-mainlaptop.png" alt="The Sellapage dashboard on a laptop" className="w-full max-w-[520px] object-contain drop-shadow-2xl" /></div>} />
      </div>
      {/* Illustrations of the product, not figures about Sellapage. */}
      <div className="absolute -left-2 top-4 flex items-center gap-2.5 rounded-2xl bg-forest-600 px-3.5 py-2.5 text-white shadow-xl shadow-forest-900/20 animate-float sm:-left-8 sm:top-8">
        <CheckCircle2 size={22} className="flex-shrink-0" />
        <span><span className="block text-[13px] font-bold leading-tight">Your store is live!</span><span className="block text-[11px] text-white/80">Start selling now</span></span>
      </div>
      <div className="absolute -left-2 bottom-8 hidden w-36 rounded-2xl bg-white p-3 text-center shadow-xl shadow-gray-300/40 animate-float-delayed sm:-left-10 sm:block">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-700"><Headphones size={24} /></span>
        <p className="mt-2 text-[11px] font-semibold text-gray-800">Wireless headphones</p>
        <p className="text-[11px] font-bold text-forest-700">₦25,000</p>
        <span className="mt-2 block rounded-full bg-forest-600 py-1 text-[10px] font-bold text-white">Add to cart</span>
      </div>
      <div className="absolute -right-2 top-16 hidden w-44 rounded-2xl bg-white p-3.5 shadow-xl shadow-gray-300/40 animate-float sm:-right-6 sm:block">
        <p className="text-[11px] font-semibold text-gray-500">Orders this week</p>
        <p className="mt-0.5 flex items-baseline gap-2 font-display text-[18px] font-extrabold text-gray-900">24 <span className="text-[10.5px] font-bold text-forest-600">+32%</span></p>
        <svg viewBox="0 0 120 32" className="mt-1.5 h-8 w-full" aria-hidden="true"><path d="M2 26 C20 24 26 14 40 18 S62 8 74 14 96 4 118 6" fill="none" stroke="#0b6b35" strokeWidth="2.5" strokeLinecap="round" /></svg>
      </div>
    </div>
  )
}

export default function About() {
  const reviews = useApprovedReviews(12)
  const [showAll, setShowAll] = useState(false)
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-body text-gray-900">
      <SEO {...pageSeo('/about')} url="/about" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50/70 via-white to-white pb-10 pt-24 sm:pt-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-8">
          <Reveal>
            <Eyebrow>About Sellapage</Eyebrow>
            <h1 className="mt-4 text-balance font-display text-[2.3rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3rem] lg:text-[3.4rem]">
              Empowering Nigerian Businesses to <span className="text-forest-600">Grow Online</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-600 sm:text-base">
              Sellapage is a commerce platform built for Nigerian entrepreneurs, creators and service providers. One store link for products and services, Paystack checkout, Sendbox and Topship delivery, customer CRM, reviews, discounts and analytics, all in one dashboard. Free to start.
            </p>
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {HERO_POINTS.map((p, i) => (
                <Reveal key={p.title} delay={150 + i * 90} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600 ring-1 ring-forest-100"><p.icon size={18} /></span>
                  <span><span className="block text-[13.5px] font-bold text-gray-900">{p.title}</span><span className="block text-[12px] leading-snug text-gray-500">{p.sub}</span></span>
                </Reveal>
              ))}
            </div>
          </Reveal>
          <Reveal direction="left" delay={120}><HeroArt /></Reveal>
        </div>
      </section>

      {/* ── Live figures ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl rounded-3xl bg-forest-50/70 px-5 py-6 ring-1 ring-forest-100 sm:px-8">
          <TractionStats />
        </Reveal>
      </section>

      {/* ── Mission, vision and values ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,0.85fr)]">
          <Reveal>
            <Eyebrow>Our mission and vision</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold leading-tight text-gray-950 sm:text-[2.3rem]">Build Africa&apos;s leading e-commerce platform</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              Our mission is to make professional online selling simple and accessible to every Nigerian business owner, whatever their technical ability or budget. We started with the simplest possible product and we are building from there, one real seller at a time.
            </p>
            <Link to="/login" className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-forest-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-forest-600/20 transition hover:bg-forest">
              Start selling today <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
          <Reveal delay={120} className="relative">
            <div className="overflow-hidden rounded-3xl shadow-xl shadow-forest-900/10">
              <MediaSlot name="about-mission" alt="A modern office building among palm trees" className="aspect-[4/3] w-full object-cover transition duration-700 hover:scale-[1.03]"
                fallback={<div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900"><img src="/receipt/sp-mark.png" alt="" className="h-28 w-28 opacity-90 brightness-[3] saturate-0" /><Leaf className="absolute -bottom-6 -left-4 h-32 w-24" tone="text-white/10" /><Leaf className="absolute -right-6 -top-4 h-36 w-24 rotate-180" tone="text-white/10" /></div>} />
            </div>
            <Script className="absolute left-5 top-1/2 -translate-y-1/2 -rotate-6 text-[30px] leading-[0.95] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:text-[36px]">Together<br />we grow <Heart className="inline h-6 w-6 align-[-2px]" strokeWidth={2.4} /></Script>
          </Reveal>
          <Reveal delay={220} className="rounded-3xl bg-forest-50/60 p-5 ring-1 ring-forest-100 sm:p-6">
            <h3 className="font-display text-[18px] font-extrabold text-gray-900">Our core values</h3>
            <ul className="mt-4 space-y-4">
              {VALUES.map((v) => (
                <li key={v.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-forest-600 shadow-sm ring-1 ring-forest-100"><v.icon size={17} /></span>
                  <span><span className="block text-[14px] font-bold text-gray-900">{v.title}</span><span className="block text-[12.5px] text-gray-500">{v.sub}</span></span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Why choose ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-forest-50/60 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <Eyebrow>Why choose Sellapage</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">More than just a platform</h2>
            <p className="mt-2 text-[15px] text-gray-600">We are not just a marketplace. We are your growth partner.</p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 70} className="group">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-forest-600 shadow-sm ring-1 ring-forest-100 transition duration-300 group-hover:-translate-y-1 group-hover:bg-forest-600 group-hover:text-white"><w.icon size={20} /></span>
                <h3 className="mt-3 text-[14.5px] font-bold text-gray-900">{w.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-gray-500">{w.sub}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Under the hood (real, from the old About page) ───────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Reveal>
            <Eyebrow>Transparency</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">What&apos;s under the hood</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">We are open about how the platform works, how your data is handled, and what your plan includes. Built in Lagos by NexKeys Agency.</p>
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13.5px] font-semibold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50">
              Everything live today ({CAPABILITIES.length}) <ChevronDown size={16} className={`transition ${showAll ? 'rotate-180' : ''}`} />
            </button>
          </Reveal>
          <Reveal delay={120} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {UNDER_THE_HOOD.map((u) => (
              <div key={u.label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><u.icon size={17} /></span>
                <span className="min-w-0"><span className="block text-[12px] font-semibold text-gray-500">{u.label}</span><span className="block break-words text-[13.5px] font-semibold text-gray-900">{u.value}</span></span>
              </div>
            ))}
          </Reveal>
        </div>
        {showAll && (
          <div className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-2.5 animate-in fade-in slide-in-from-top-2 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => <p key={c} className="flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-700"><CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-forest-600" />{c}</p>)}
          </div>
        )}
      </section>

      {/* ── Real reviews ─────────────────────────────────────────────────── */}
      {reviews?.length > 0 && (
        <section className="bg-gradient-to-b from-white to-forest-50/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-8">
              <Eyebrow>What vendors say</Eyebrow>
              <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Trusted by Nigerian businesses</h2>
              <p className="mt-2 text-[15px] text-gray-600">Real reviews from businesses selling on Sellapage.</p>
            </Reveal>
            <ReviewsCarousel reviews={reviews} />
          </div>
        </section>
      )}

      {/* ── Call to action ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-gradient-to-br from-forest via-forest-700 to-forest-600 px-6 py-10 text-white sm:px-10 lg:py-12">
          <Leaf className="absolute -left-8 -top-10 h-40 w-28 rotate-12" tone="text-white/5" />
          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest-200">Ready to grow your business?</p>
              <h2 className="mt-3 text-balance font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2.1rem]">Join Nigerian entrepreneurs already selling on Sellapage.</h2>
              <p className="mt-3 max-w-lg text-[14.5px] text-white/80">Create your free store today. The Starter plan is free for good, and you can upgrade when you are ready.</p>
              <Link to="/login" className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-forest-700 shadow-lg transition hover:bg-forest-50">
                Create your free store <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="relative pt-14">
              <MediaSlot name="about-cta" alt="The Sellapage dashboard on a laptop" className="mx-auto w-full max-w-[460px] rounded-2xl object-cover"
                fallback={<div className="mx-auto w-full max-w-[460px] rounded-2xl bg-white/95 p-3 shadow-2xl"><img src="/Herosection-mainlaptop.png" alt="The Sellapage dashboard on a laptop" loading="lazy" className="w-full object-contain" /></div>} />
              <Script className="absolute right-2 top-0 rotate-[-8deg] text-[24px] leading-none text-white sm:text-[28px]">Your success<br />starts here <Heart className="inline h-5 w-5 align-[-2px]" strokeWidth={2.4} /></Script>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
