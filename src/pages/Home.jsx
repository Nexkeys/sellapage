// src/pages/Home.jsx
//
// The public homepage, rebuilt 2026-10-08. Its one job: show a business owner
// what Sellapage does, quickly, with as little reading as possible. So it is
// mostly product in motion (components/marketing/motion.jsx): a live dashboard
// and phone, the journey from sign-up to first sale, and feature cards that
// each play out what the feature does.
//
// Deliberately NOT on this page (Nex, 2026-10-08):
//   - platform figures and vendor reviews: a first-time visitor reads small
//     numbers as "nobody uses this". They live on /success-stories.
//   - trust facts (CAC number, Paystack licence, encryption): those belong to
//     the About page, which exists to answer "who are these people?".
// Every product claim here matches the code: the integrations are the ones in
// Settings > Integrations and Marketing, the journey is the real sign-up flow
// (SMS code), and the store in the scenes is a labelled example.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ChevronDown, PlayCircle, Check, ShoppingCart, Tag, Receipt, UserPlus, Boxes, Calculator, Shirt, Sparkles, Smartphone,
  Sofa, Briefcase, UtensilsCrossed, Gem, Scissors, Truck, Bell, Store, BarChart3, Wallet,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PlayStoreBadge, { AppStoreSoon } from '../components/PlayStoreBadge'
import MediaSlot from '../media/MediaSlot'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script } from '../components/marketing/kit'
import {
  HeroStage, FeatureStrip, JOURNEY, JOURNEY_STEP_MS, JourneyScene, useClock, useOnScreen, OrdersVisual, BookingsVisual, SearchVisual,
  SellaVisual, ReceiptVisual, CustomersVisual, Orbit, PlatformsDiagram, CONSTELLATION,
} from '../components/marketing/motion'

// Real store categories (utils/categories.js); each opens Explore filtered to it.
const CATEGORIES = [
  { icon: Shirt, label: 'Fashion', cat: 'Fashion & Clothing' },
  { icon: Sparkles, label: 'Beauty', cat: 'Beauty & Skincare' },
  { icon: Smartphone, label: 'Phones and gadgets', cat: 'Gadgets & Phones' },
  { icon: Sofa, label: 'Home and living', cat: 'Home & Living' },
  { icon: Scissors, label: 'Salons and services', cat: 'Services' },
  { icon: UtensilsCrossed, label: 'Food', cat: 'Food & Groceries' },
  { icon: Gem, label: 'Jewellery', cat: 'Jewelry & Accessories' },
  { icon: Briefcase, label: 'Freelancers', cat: 'Services' },
]

const faqs = [
  { q: 'What is Sellapage?', a: 'Sellapage is a business management and growth platform for Nigerian businesses. It gives you an online store for products, services and bookings, takes payments through Paystack, books delivery, keeps your customer records, receipts and books, and helps you get found on Google, all from one dashboard and the Android app.' },
  { q: 'Do my customers need to download anything?', a: 'No. Your store is a regular web page. Customers tap your link, browse, and pay, with no app and no account.' },
  { q: 'Can I use it for my walk-in sales too?', a: 'Yes. Record walk-in and offline sales, send a receipt, and see them next to your online orders, so your sales and records are in one place.' },
  { q: "What if I'm not good with technology?", a: 'Sellapage is built for everyday business owners, not technical teams. If you can upload a photo and fill a simple form, you can run your business here, and Sella, the assistant inside your dashboard, can help.' },
  { q: 'How do I get paid?', a: 'Customers pay by card, bank transfer or USSD through Paystack, and the money settles to your bank account. Sellapage takes no cut of your sales.' },
  { q: 'Is it really free?', a: 'Yes, the Starter plan is free for good. Paid plans add more as you grow: Growth at ₦5,000 a month, Pro at ₦12,000 a month and Premium at ₦25,000 a month.' },
]

const WORDS = ['business', 'orders', 'bookings', 'payments', 'customers', 'deliveries']

/** The headline's changing word, typed and deleted like Bumpa's, in our green. */
function RotatingWord() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 1200 })
  const per = 2600
  const i = Math.floor(t / per) % WORDS.length
  const p = t % per
  const w = WORDS[i]
  const shown = p < 600 ? w.slice(0, Math.ceil((p / 600) * w.length)) : p > per - 380 ? w.slice(0, Math.ceil(((per - p) / 380) * w.length)) : w
  return (
    <span ref={ref} className="relative inline-block text-forest-600" aria-hidden="true">
      {shown || ' '}<span className="ml-1 inline-block h-[0.82em] w-[3px] translate-y-[0.08em] animate-pulse rounded-full bg-forest-600 align-baseline" />
    </span>
  )
}

/** Sign up to growing, one scene at a time, with a progress bar per step. */
function Journey() {
  const ref = useRef(null)
  const chips = useRef(null)
  const onScreen = useOnScreen(ref, '-15% 0px')
  // The step and its local time are worked out from one running clock, so
  // advancing needs no effect; tapping a step re-bases the clock there.
  const [base, setBase] = useState({ step: 0, at: 0 })
  const clock = useClock(onScreen, { stillAt: JOURNEY_STEP_MS - 200 })
  const elapsed = Math.max(0, clock - base.at)
  const step = (base.step + Math.floor(elapsed / JOURNEY_STEP_MS)) % JOURNEY.length
  // With reduced motion the scene is shown finished rather than played.
  const [still] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const t = still ? JOURNEY_STEP_MS - 200 : elapsed % JOURNEY_STEP_MS
  const setStep = (i) => setBase({ step: i, at: clock })
  const progress = Math.min(1, t / JOURNEY_STEP_MS)
  // On a phone the steps are a sideways row; slide the active one into view
  // (the row only, never the page).
  useEffect(() => {
    const row = chips.current
    const li = row?.children[step]
    if (!row || !li || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: li.offsetLeft - 16, behavior: 'smooth' })
  }, [step])
  return (
    <div ref={ref} className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)] lg:gap-10">
      <ol ref={chips} className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:block lg:space-y-1.5 lg:overflow-visible lg:px-0">
        {JOURNEY.map((s, i) => {
          const on = i === step
          return (
            <li key={s.id} className="flex-shrink-0 snap-start">
              <button type="button" onClick={() => setStep(i)} aria-current={on ? 'step' : undefined}
                className={`group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-300 ${on ? 'bg-white shadow-lg shadow-forest-900/5 ring-1 ring-forest-100' : 'hover:bg-white/70'} px-4 py-3 lg:py-3.5`}>
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${on ? 'bg-forest-600 text-white' : i < step ? 'bg-forest-100 text-forest-700' : 'bg-white text-gray-400 ring-1 ring-gray-100'}`}>
                    {i < step ? <Check size={16} strokeWidth={3} /> : <s.icon size={17} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-gray-400">Step {i + 1}</span>
                    <span className={`block whitespace-nowrap font-display text-[15px] font-bold ${on ? 'text-gray-950' : 'text-gray-600'}`}>{s.title}</span>
                  </span>
                </span>
                <span className={`hidden overflow-hidden pl-12 text-[13px] leading-snug text-gray-500 transition-all duration-300 lg:block ${on ? 'mt-1.5 max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>{s.sub}</span>
                {on && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-forest-100"><span className="block h-full bg-forest-600" style={{ width: `${progress * 100}%` }} /></span>}
              </button>
            </li>
          )
        })}
      </ol>
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-forest-100/70 via-forest-50 to-white" />
        <div className="rounded-[32px] p-4 sm:p-8"><JourneyScene step={step} t={t} /></div>
        <p className="mt-1 px-2 text-center text-[13px] text-gray-500 lg:hidden">{JOURNEY[step].sub}</p>
      </div>
    </div>
  )
}

/** A feature card: words on one side, the feature playing out on the other. */
function Card({ id, tone, eyebrow, title, body, children, className = '', to, dark = false }) {
  return (
    <Reveal id={id} className={`scroll-mt-24 relative flex flex-col overflow-hidden rounded-[28px] p-6 sm:p-8 ${tone} ${className}`}>
      {eyebrow && <span className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${dark ? 'text-forest-100' : 'text-forest-700'}`}>{eyebrow}</span>}
      <h3 className={`mt-2 text-balance font-display text-[1.45rem] font-extrabold leading-tight sm:text-[1.7rem] ${dark ? 'text-white' : 'text-gray-950'}`}>{title}</h3>
      {body && <p className={`mt-2 max-w-md text-[14.5px] leading-relaxed ${dark ? 'text-white/80' : 'text-gray-600'}`}>{body}</p>}
      {to && <Link to={to} className="group mt-4 inline-flex w-fit items-center gap-1.5 text-[14px] font-bold text-forest-700">See the plans <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link>}
      <div className="mt-6 flex-1">{children}</div>
    </Reveal>
  )
}

/** The closing call to action: features drifting around the promise. */
function Constellation({ onStart }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-forest-50 via-white to-amber-50/60 px-6 py-20 ring-1 ring-forest-100 sm:py-28">
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true">
        {CONSTELLATION.map(([Icon, label, x, y], i) => (
          <div key={label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}><Reveal delay={i * 60}>
            <span className="flex flex-col items-center gap-1.5 animate-float motion-reduce:animate-none" style={{ animationDuration: `${4 + (i % 4)}s`, animationDelay: `${(i % 5) * 0.4}s` }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-forest-600 shadow-lg shadow-forest-900/10"><Icon size={22} /></span>
              <span className="text-[12px] font-semibold text-gray-600">{label}</span>
            </span>
          </Reveal></div>
        ))}
      </div>
      <div className="relative mx-auto max-w-xl text-center">
        <h2 className="text-balance font-display text-[2rem] font-extrabold leading-[1.08] text-gray-950 sm:text-[2.8rem]">One app for the whole business.</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-gray-600">Sell, get paid, deliver, keep your records and grow, without juggling five different apps.</p>
        <button type="button" onClick={onStart} className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-forest px-7 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">
          Start free <ArrowRight size={17} className="transition group-hover:translate-x-1" />
        </button>
        <p className="mt-3 text-[12.5px] text-gray-500">Free plan. No card needed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:hidden">
          {CONSTELLATION.slice(0, 8).map(([Icon, label]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 shadow-sm"><Icon size={13} className="text-forest-600" />{label}</span>)}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const start = () => navigate(user ? '/dashboard' : '/login?mode=register')
  const toJourney = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Menu links point at sections here ("/#bookings"). Scroll once the page
  // has drawn, after ScrollToTop has reset the position for a new route.
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return undefined
    const id = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    return () => clearTimeout(id)
  }, [hash])

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900 antialiased">
      <SEO {...pageSeo('/')} url="/" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="home" className="relative overflow-hidden pb-10 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_55%_at_50%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] opacity-[0.35] [background-image:linear-gradient(#d5f1e1_1px,transparent_1px),linear-gradient(90deg,#d5f1e1_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(55%_60%_at_50%_10%,#000,transparent)]" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <Link to="/#mobile-app" className="group inline-flex max-w-full items-center gap-2 rounded-full border border-forest-100 bg-white/90 py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-semibold text-gray-700 shadow-sm backdrop-blur transition hover:border-forest-200">
              <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10.5px] font-bold text-white">New</span>
              <span className="truncate">Sellapage for Android is live. iPhone app coming soon.</span>
              <ArrowRight size={14} className="flex-shrink-0 text-forest-600 transition group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-[2.45rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.6rem] lg:text-[4.25rem]">
              <span className="sr-only">Sellapage: run and grow your business, orders, bookings, payments and customers from one place.</span>
              <span aria-hidden="true" className="block">Run and grow your</span><span aria-hidden="true" className="block"><RotatingWord /></span><span aria-hidden="true" className="block">from one place.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Sellapage is the business management and growth platform for Nigerian businesses. Sell online, get paid, deliver, keep your records and find new customers, from your phone or laptop.
            </p>
          </Reveal>
          <Reveal delay={240} className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={start} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-7 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">
              Start free <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={toJourney} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50">
              <PlayCircle size={19} className="text-forest-600" /> See how it works
            </button>
          </Reveal>
          <Reveal delay={300}><p className="mt-3 text-[12.5px] text-gray-500">Free plan. No card needed.</p></Reveal>
        </div>
        <Reveal delay={200} className="mx-auto mt-12 max-w-[1240px] px-4 sm:px-6">
          <HeroStage />
        </Reveal>
        <div className="mt-10"><FeatureStrip /></div>
      </section>

      {/* ── How it works: the journey ────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-gradient-to-b from-white via-forest-50/40 to-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.7rem]">From sign-up to your first sale.</h2>
            <p className="mt-3 text-[15px] text-gray-600">Six steps, one sitting. Watch it play, or tap a step.</p>
          </Reveal>
          <Journey />
        </div>
      </section>

      {/* ── What it does ─────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>Everything in one place</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.7rem]">Your whole business, in one dashboard.</h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5">
            {/* Store: wide card over the photo, features orbiting the phone. */}
            <Reveal id="store" className="scroll-mt-24 relative grid min-h-[420px] grid-cols-1 overflow-hidden rounded-[28px] bg-[#e9f5ee] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="relative z-10 p-6 sm:p-10 lg:self-center">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-700">Sell online</span>
                <h3 className="mt-2 text-balance font-display text-[1.6rem] font-extrabold leading-tight text-gray-950 sm:text-[2.2rem]">A store that sells for you, day and night.</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-600">Products, services and bookings on one page with your own link or domain. Customers browse, pay and download a receipt without a single DM.</p>
                <Link to="/live-stores" className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-forest-700">See live stores <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link>
              </div>
              <div className="relative h-[300px] sm:h-[380px] lg:h-full">
                <MediaSlot name="home-hero-scene" alt="A Nigerian shop owner managing her store on her phone" className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
                  fallback={<div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-forest-50" />} />
                <div className="absolute inset-0 bg-gradient-to-r from-[#e9f5ee] via-[#e9f5ee]/30 to-transparent lg:via-transparent" />
                <Orbit size={380} className="left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 scale-[0.7] sm:scale-100 lg:left-[58%]"
                  items={[{ icon: ShoppingCart, label: 'Cart' }, { icon: Tag, label: 'Discounts' }, { icon: Receipt, label: 'Receipts' }, { icon: Truck, label: 'Delivery' }]} />
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card id="orders" tone="bg-[#fff7e6]" eyebrow="Orders and payments" title="Every order and payment, in one place." body="Card, transfer and USSD through Paystack. Paid orders create themselves, and the money settles to your bank. No cut of your sales.">
                <OrdersVisual />
              </Card>
              <Card id="bookings" tone="bg-[#fdeef0]" eyebrow="Bookings" title="Bookings that fill your week." body="Salons, tutors, photographers and every service business: customers pick a time, you see it on your calendar.">
                <div className="relative overflow-hidden rounded-3xl">
                  <MediaSlot name="home-bookings" alt="A salon owner checking her bookings on a tablet" className="h-48 w-full object-cover sm:h-56" fallback={null} />
                  <div className="relative -mt-0 sm:mx-auto sm:max-w-sm"><BookingsVisual /></div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <Reveal id="operations" className="scroll-mt-24 relative overflow-hidden rounded-[28px] bg-[#eaf4f0] p-6 sm:p-8">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-700">Run the business</span>
                <h3 className="mt-2 max-w-lg text-balance font-display text-[1.45rem] font-extrabold leading-tight text-gray-950 sm:text-[1.7rem]">See everything happening in your business.</h3>
                <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-gray-600">Stock counts, a ledger for your walk-in sales, and access for your team, so nothing slips through when you are not in the shop.</p>
                <div className="relative mt-6 h-[300px] overflow-hidden rounded-3xl sm:h-[340px]">
                  <MediaSlot name="home-mission" alt="A business owner checking orders on his phone and laptop" className="absolute inset-0 h-full w-full object-cover object-[60%_30%]"
                    fallback={<div className="absolute inset-0 bg-gradient-to-br from-forest-100 to-white" />} />
                  <Orbit size={340} tilt={0.4} className="left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 scale-[0.68] sm:scale-100"
                    items={[{ icon: UserPlus, label: 'Team accounts' }, { icon: Boxes, label: 'Stock counts' }, { icon: Calculator, label: 'Sales ledger' }]} />
                </div>
              </Reveal>
              <Card id="customers" tone="bg-[#f2f4f7]" eyebrow="Customers" title="Know your customers. Keep them coming back." body="Every buyer's orders, spend and contact in one list, with loyalty points and discount codes to bring them back.">
                <CustomersVisual />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-forest to-forest-600 p-3.5 text-white">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-forest-100">Loyalty card</p>
                    <p className="mt-1 font-display text-[20px] font-extrabold">240 points</p>
                    <p className="text-[11px] text-white/70">Chiamaka Obi</p>
                  </div>
                  <div className="rounded-2xl border-2 border-dashed border-forest-200 bg-white p-3.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Discount code</p>
                    <p className="mt-1 font-display text-[20px] font-extrabold tracking-wide text-forest-700">WELCOME10</p>
                    <p className="text-[11px] text-gray-500">10% off, first order</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Card id="marketing" tone="bg-[#eef4ff]" eyebrow="Get found" title="Show up on Google." body="Search, Shopping and Maps listings for your store, with no ad spend.">
                <SearchVisual />
              </Card>
              <Card id="sella" dark tone="bg-forest" eyebrow="Sella AI" title="An assistant that knows your business." body="Ask anything about your sales, stock or customers.">
                <div className="rounded-3xl bg-white/10 p-3"><SellaVisual /></div>
              </Card>
              <Card id="receipts" tone="bg-[#fff7e6]" eyebrow="Receipts and records" title="Receipts that send themselves." body="Every paid order comes with a branded receipt, and walk-in sales go in your ledger.">
                <ReceiptVisual />
              </Card>
            </div>

            <Reveal id="delivery" className="scroll-mt-24 relative grid grid-cols-1 overflow-hidden rounded-[28px] bg-[#f4f1fb] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="relative order-2 h-[260px] sm:h-[340px] lg:order-1 lg:h-full lg:min-h-[340px]">
                <MediaSlot name="home-delivery" alt="A delivery rider handing a parcel to a customer at her door" className="absolute inset-0 h-full w-full object-cover"
                  fallback={(
                    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-violet-100 to-white">
                      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                        <path d="M40 250 C120 240 110 150 190 150 S300 70 360 50" fill="none" stroke="#0b6b35" strokeWidth="3" strokeDasharray="8 8" className="animate-dash-flow" />
                        <circle r="9" fill="#0b6b35"><animateMotion dur="4s" repeatCount="indefinite" path="M40 250 C120 240 110 150 190 150 S300 70 360 50" /></circle>
                        <circle cx="40" cy="250" r="7" fill="#fff" stroke="#0b6b35" strokeWidth="3" /><circle cx="360" cy="50" r="7" fill="#0b6b35" />
                      </svg>
                    </div>
                  )} />
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-gray-900/10">
                  <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-600 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-forest-600" /></span>
                  <span><span className="block text-[12.5px] font-bold text-gray-900">Out for delivery</span><span className="block text-[11px] text-gray-500">Tracking link sent to your customer</span></span>
                </div>
              </div>
              <div className="order-1 p-6 sm:p-10 lg:order-2 lg:self-center">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-700">Delivery</span>
                <h3 className="mt-2 text-balance font-display text-[1.6rem] font-extrabold leading-tight text-gray-950 sm:text-[2.1rem]">Book delivery without leaving your dashboard.</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-600">Live rates from Sendbox and Topship at checkout, booking in one tap, and a tracking link for your customer. Or set your own delivery zones and prices.</p>
              </div>
            </Reveal>
          </div>

          <div className="mt-8 text-center">
            <Link to="/pricing" className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[14px] font-bold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50">
              Compare plans and every feature <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Every kind of business ───────────────────────────────────────── */}
      <section id="business-types" className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Eyebrow>Built for every kind of business</Eyebrow>
              <h2 className="mt-4 font-display text-[1.8rem] font-extrabold text-gray-950 sm:text-[2.2rem]">Whatever you sell, it fits.</h2>
            </div>
            <Link to="/live-stores" className="group inline-flex items-center gap-1.5 text-[14px] font-bold text-forest-700">Explore stores <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link>
          </Reveal>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((c, i) => (
              <Reveal key={c.label} delay={i * 50}>
                <Link to={`/live-stores?cat=${encodeURIComponent(c.cat)}`} className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lg hover:shadow-forest-900/5">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 transition group-hover:bg-forest-600 group-hover:text-white"><c.icon size={20} /></span>
                  <span className="text-[13.5px] font-bold text-gray-800">{c.label}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Connected platforms ──────────────────────────────────────────── */}
      <section id="integrations" className="scroll-mt-20 bg-gradient-to-b from-white via-forest-50/40 to-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>Connected</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.7rem]">Works with the tools you already use.</h2>
            <p className="mt-3 text-[15px] text-gray-600">Payments, delivery, Google and your social pages, connected to one dashboard.</p>
          </Reveal>
          <Reveal><PlatformsDiagram /></Reveal>
        </div>
      </section>

      {/* ── The app ──────────────────────────────────────────────────────── */}
      <section id="mobile-app" className="scroll-mt-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 overflow-hidden rounded-[32px] bg-forest px-6 py-12 text-white sm:px-12 lg:grid-cols-2 lg:py-16">
          <Reveal direction="left">
            <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">Sellapage on your phone</span>
            <h2 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight sm:text-[2.6rem]">Run your shop from your pocket.</h2>
            <ul className="mt-6 space-y-3">
              {[[BarChart3, "Today's sales and what you're owed"], [Bell, 'A push alert the moment an order lands'], [Store, 'Record a walk-in sale in seconds'], [Wallet, 'Send receipts and confirm payments on the move']].map(([I, line]) => (
                <li key={line} className="flex items-center gap-3 text-[15px] text-white/85"><span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10"><I size={16} /></span>{line}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3"><PlayStoreBadge tone="light" /><AppStoreSoon tone="dark" /></div>
          </Reveal>
          <Reveal direction="right" delay={120} className="relative flex justify-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest-600 blur-3xl" />
            <div className="relative flex w-full max-w-[460px] items-end justify-center gap-4">
              <MediaSlot name="home-app-1" alt="The Sellapage app showing today's sales, orders waiting and quick actions" className="relative z-10 w-[46%] rounded-[1.75rem] object-contain shadow-2xl shadow-black/30"
                fallback={<img src="/mobile-app-screen-1.jpg" alt="The Sellapage app showing today's sales, orders waiting and quick actions" width={300} height={620} loading="lazy" className="relative z-10 w-[46%] rounded-[1.75rem] object-contain shadow-2xl shadow-black/30" />} />
              <MediaSlot name="home-app-2" alt="The Sellapage app showing the orders list with their payment status" className="relative mb-10 w-[46%] rounded-[1.75rem] object-contain shadow-xl shadow-black/30"
                fallback={<img src="/mobile-app-screen-2.jpg" alt="The Sellapage app showing the orders list with their payment status" width={300} height={620} loading="lazy" className="relative mb-10 w-[46%] rounded-[1.75rem] object-contain shadow-xl shadow-black/30" />} />
              <div className="absolute -top-6 left-1/2 z-20 w-[86%] max-w-[330px] -translate-x-1/2"><div className="flex items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 text-gray-900 shadow-2xl backdrop-blur animate-[rise_.6s_ease-out_both,float_5s_ease-in-out_1s_infinite] motion-reduce:animate-none">
                <img src="/og-image.png" alt="" className="h-8 w-8 rounded-lg" />
                <span className="min-w-0"><span className="block text-[12px] font-bold">New order #1043</span><span className="block truncate text-[11px] text-gray-500">Chiamaka paid ₦20,000 for Green court sneakers</span></span>
                <span className="ml-auto text-[10px] text-gray-400">now</span>
              </div></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Questions, answered.</h2>
            <p className="mt-3 text-[15px] text-gray-600">Something else? <Link to="/contact" className="font-semibold text-forest-700 underline-offset-2 hover:underline">Talk to us</Link>.</p>
            <Script className="mt-6 hidden -rotate-3 text-[26px] leading-none lg:block">Small steps,<br />big dreams</Script>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal as="details" key={faq.q} delay={i * 50} className="group rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/60 open:ring-1 open:ring-forest-100">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50">
                  <span className="font-display text-[15px] font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5"><p className="text-[14px] leading-relaxed text-gray-600">{faq.a}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to action ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><Constellation onStart={start} /></div>
      </section>

      <Footer />
    </div>
  )
}
