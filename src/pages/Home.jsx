// src/pages/Home.jsx
//
// The public homepage, redesigned 2026-10-07 from Nex's mockup. The hero video
// was removed at his request. Every claim on this page is true today:
//   - figures come live from Ops (TractionStats), never from the mockup
//   - testimonials are real, approved reviews from the Reviews wall
//   - trust badges are facts from the About page (CAC BN 9689086; Paystack,
//     which holds the CBN licence; Firebase encryption; the Android app)
//   - no "#1", no iOS badge (there is no iPhone app), no "24/7 support"
// Photos come from media-src (home-hero-scene, home-hero-phone, home-mission,
// home-categories, home-cta); an empty folder shows a designed fallback.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, ShoppingCart, MessageCircle, Zap, ChevronDown, Check, Store, Package, Share2, TrendingUp, Smartphone, ArrowRight,
  Star, BarChart2, Palette, Sparkles, Gift, Grid, Users, Truck, CreditCard, Tag, Download, Globe, Shield, Briefcase, BookOpen,
  PlayCircle, ShieldCheck, Lock, BadgeCheck, MapPin, Headphones, Shirt, Gem, Sofa, UtensilsCrossed, Heart, Bot,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PlayStoreBadge from '../components/PlayStoreBadge'
import MediaSlot from '../media/MediaSlot'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script, Leaf, TractionStats, ReviewsCarousel, useApprovedReviews } from '../components/marketing/kit'

// ─── Data ────────────────────────────────────────────────────────────────────

const steps = [
  { number: '01', title: 'Tell us about your business', description: 'Add what you sell or offer: products, services, prices, photos, contact details, delivery options and payment preferences.' },
  { number: '02', title: 'Your page goes live instantly', description: 'Your clean, professional business page is ready, with a unique link you can share anywhere online.' },
  { number: '03', title: 'Share and start getting customers', description: 'Drop the link in your bios, messages, ads, flyers or chats. Customers browse, order, pay and reach you.' },
]

// The eight in the design; each opens the plan comparison that says which plan has it.
const CORE = [
  { icon: Store, title: 'Online store', sub: 'A store page in minutes, no coding.' },
  { icon: CreditCard, title: 'Payments', sub: 'Card, bank transfer and USSD through Paystack.' },
  { icon: Truck, title: 'Delivery', sub: 'Sendbox and Topship rates, booking and tracking.' },
  { icon: Users, title: 'CRM and customers', sub: 'Profiles, spend and orders for every customer.' },
  { icon: Star, title: 'Reviews and ratings', sub: 'Build trust with verified buyer reviews.' },
  { icon: Tag, title: 'Discounts and promos', sub: 'Codes with limits and expiry dates.' },
  { icon: BarChart2, title: 'Analytics', sub: 'Views, clicks, orders and your best sellers.' },
  { icon: Bot, title: 'Sella AI', sub: 'An assistant that knows your whole store.' },
]

const features = [
  { icon: Smartphone, title: 'Sharp on every phone', description: 'Your page loads clean and fast on every phone, whatever you sell.' },
  { icon: MessageCircle, title: 'Customers order in one flow', description: 'Every product or service has a clear action path, from order to your dashboard.' },
  { icon: Package, title: 'Customers see everything first', description: 'Photos, prices and descriptions, so buyers know what to expect before they message.' },
  { icon: Share2, title: 'One link that works everywhere', description: 'WhatsApp status, Instagram bio, X, Telegram, flyers: anywhere you promote yourself.' },
  { icon: TrendingUp, title: 'Never lose an interested customer', description: 'Browsers can leave their details so you can follow up and close the sale.' },
  { icon: Zap, title: 'Live the same day', description: 'Create your account, add what you sell and share your link in one session.' },
  { icon: ShoppingCart, title: 'Structured cart (Growth and up)', description: 'Customers add several items and send one clean order with their details.' },
  { icon: Package, title: 'Stock counts', description: 'Set stock levels; sold-out items sort to the bottom by themselves.' },
  { icon: Grid, title: 'Categories and search', description: 'Customers filter and search what you sell on your live page.' },
  { icon: Sparkles, title: 'AI descriptions (Growth and up)', description: 'A ready-to-publish description for a product or service in seconds.' },
  { icon: Palette, title: '20 premium themes (Pro)', description: 'Each one changes fonts, colours, layout and card style completely.' },
  { icon: ShoppingBag, title: 'In-app Paystack checkout (Pro and up)', description: 'Card, transfer and USSD on your store. Orders create themselves in your dashboard.' },
  { icon: Truck, title: 'Sendbox and Topship delivery (Pro and up)', description: 'Live rates at checkout, shipment booking and tracking links.' },
  { icon: CreditCard, title: 'Payouts to your bank (Pro and up)', description: 'Paystack settles sales straight to your account; Sellapage takes no cut.' },
  { icon: Users, title: 'Customer CRM (Pro and up)', description: 'Built from confirmed orders, with WhatsApp links and spend, order and recency sorting.' },
  { icon: Star, title: 'Verified reviews (Pro and up)', description: 'Buyers rate after delivery; scores show on your product and service cards.' },
  { icon: Tag, title: 'Discounts and promo codes (Pro and up)', description: 'Percentage or flat discounts with usage limits and expiry dates.' },
  { icon: Download, title: 'Product export (Pro and up)', description: 'Your catalogue as PDF, CSV or Excel.' },
  { icon: Globe, title: 'Custom domain (Pro and up)', description: 'Use your own domain for a fully branded store.' },
  { icon: Shield, title: 'CAC verification (Pro and up)', description: 'Show customers your business is registered.' },
  { icon: Briefcase, title: 'Job listings (all plans)', description: 'Post openings that go live on the public Sellapage Jobs board.' },
  { icon: BookOpen, title: 'Sellapage blog', description: 'Guides and stories to help you sell more.' },
  { icon: Gift, title: 'Referral programme (all plans)', description: 'Earn when businesses you refer upgrade to a paid plan.' },
  { icon: BarChart2, title: 'Analytics', description: 'Store views, clicks and your top products and services.' },
  { icon: Sparkles, title: 'Sella AI (Premium)', description: 'An assistant that reads your dashboard and helps you run your business.' },
  { icon: BarChart2, title: 'Google Ads (Premium)', description: 'Run and track Google Ads campaigns, or let Sellapage manage them.' },
]

// Real store categories (utils/categories.js); each opens Explore filtered to it.
const CATEGORIES = [
  { icon: Shirt, label: 'Fashion', cat: 'Fashion & Clothing' },
  { icon: Sparkles, label: 'Beauty', cat: 'Beauty & Skincare' },
  { icon: Smartphone, label: 'Phones', cat: 'Gadgets & Phones' },
  { icon: Sofa, label: 'Home', cat: 'Home & Living' },
  { icon: Briefcase, label: 'Services', cat: 'Services' },
  { icon: UtensilsCrossed, label: 'Food', cat: 'Food & Groceries' },
  { icon: Gem, label: 'Jewellery', cat: 'Jewelry & Accessories' },
]

const MISSION_POINTS = [
  { icon: MapPin, title: 'Built for Nigeria', sub: 'Naira prices, WhatsApp, local delivery.' },
  { icon: Zap, title: 'Simple to use', sub: 'Get started in minutes.' },
  { icon: ShieldCheck, title: 'Secure and reliable', sub: 'Payments through Paystack.' },
  { icon: Headphones, title: 'Real support', sub: 'Real people answer, by email and in your dashboard.' },
]

const TRUST = [
  { icon: BadgeCheck, title: 'CAC registered', sub: 'BN 9689086' },
  { icon: ShieldCheck, title: 'Paystack payments', sub: 'CBN licensed' },
  { icon: Lock, title: 'Encrypted data', sub: 'Google Firebase' },
]

const faqs = [
  { q: 'Do my customers need to download anything?', a: 'No. Your store is a regular web page customers just tap your link. No app, no account, no friction at all.' },
  { q: 'How does the order work?', a: 'Customers browse your store, choose a product or service, and send a structured order with the important details already included. You confirm from your workflow.' },
  { q: 'Can I update my products after I create the store?', a: 'Yes. Your dashboard lets you add, edit, or remove products anytime. Changes go live on your store instantly.' },
  { q: "What if I'm not good with technology?", a: 'Sellapage is built for everyday business owners, not technical teams. If you can upload photos and fill a simple form, you can run your store here.' },
  { q: 'How do I share my page with customers?', a: 'You get a link like sellapage.com.ng/yourbrandname. Paste it in your social bio, WhatsApp status, campaign posts, or send it directly to anyone.' },
  { q: 'Is it really free right now?', a: 'Yes - the Starter plan is permanently free. Paid plans are also available: Growth at ₦5,000/month, Pro at ₦12,000/month and Premium at ₦25,000 with more features as you grow.' },
]

// ─── Pieces ──────────────────────────────────────────────────────────────────

function HeroArt() {
  return (
    <div className="relative mx-auto h-[340px] w-full max-w-[640px] sm:h-[460px] lg:h-[520px]">
      <div className="absolute inset-0 overflow-hidden rounded-[36px] bg-gradient-to-br from-forest-100 via-forest-50 to-white shadow-xl shadow-forest-900/5">
        <MediaSlot name="home-hero-scene" alt="A Nigerian shop owner managing her orders on her phone" priority className="h-full w-full object-cover"
          fallback={(
            <div className="relative h-full w-full">
              <Leaf className="absolute -left-6 bottom-0 h-56 w-40 -rotate-12" tone="text-forest-100" />
              <Leaf className="absolute right-6 top-6 h-40 w-28 rotate-[30deg]" tone="text-forest-200/60" />
              <div className="absolute bottom-10 left-8 hidden grid-cols-2 gap-3 sm:grid">
                {[ShoppingBag, Headphones, Shirt, Package].map((I, i) => <span key={i} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-forest-600 shadow-lg shadow-forest-900/5 backdrop-blur animate-float" style={{ animationDelay: `${i * 0.4}s` }}><I size={26} /></span>)}
              </div>
            </div>
          )} />
      </div>
      <MediaSlot name="home-hero-phone" alt="A Sellapage store on a phone" priority
        className="absolute bottom-0 right-2 z-10 h-[94%] w-auto max-w-[56%] object-contain mix-blend-multiply animate-float sm:right-6"
        fallback={<img src="/Herosection-mobilephone.png" alt="A Sellapage store on a phone" className="absolute bottom-0 right-2 z-10 h-[94%] w-auto max-w-[56%] object-contain mix-blend-multiply animate-float sm:right-6" />} />
      {/* Product illustrations, not figures about Sellapage. */}
      <div className="absolute left-3 top-5 z-20 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-gray-300/40 animate-float-delayed sm:left-6 sm:top-8">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-600 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-forest-600" /></span>
        <span><span className="block text-[12.5px] font-bold leading-tight text-gray-900">New order!</span><span className="block text-[11px] text-gray-500">Paid with Paystack</span></span>
      </div>
      <div className="absolute bottom-6 left-3 z-20 hidden rotate-[-4deg] rounded-2xl border border-forest-100 bg-white/95 px-4 py-3 shadow-xl shadow-gray-300/40 sm:left-6 sm:block">
        <Script className="text-[22px] leading-[1.05]">Sell online<br />securely, grow<br />faster <Heart className="inline h-4 w-4 align-[-1px]" strokeWidth={2.6} /></Script>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reviews = useApprovedReviews(12)
  const [allFeatures, setAllFeatures] = useState(false)
  const handleCTA = () => navigate(user ? '/dashboard' : '/login')
  const toHowItWorks = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-body text-gray-900 antialiased">
      <SEO {...pageSeo('/')} url="/" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-forest-50/80 via-white to-white pb-12 pt-24 sm:pt-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
          <Reveal>
            <Eyebrow>E-commerce platform for Nigerian businesses</Eyebrow>
            <h1 className="mt-4 text-balance font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-tight text-gray-950 sm:text-[3.2rem] lg:text-[3.6rem]">
              Sell More.<br />Grow Faster.<br /><span className="text-forest-600">All from One Platform.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-600 sm:text-base">
              Sellapage gives Nigerian businesses everything they need to sell, manage and grow in one place: online stores, payments, delivery and customer management.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={handleCTA} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-forest-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-forest-600/25 transition hover:bg-forest">
                Create your free store <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </button>
              <button type="button" onClick={toHowItWorks} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50">
                <PlayCircle size={18} className="text-forest-600" /> See how it works
              </button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {TRUST.map((t, i) => (
                <Reveal key={t.title} delay={150 + i * 80} className="flex min-w-0 items-center gap-2">
                  <t.icon size={20} className="flex-shrink-0 text-forest-600" />
                  <span className="min-w-0"><span className="block text-[12px] font-bold leading-tight text-gray-800">{t.title}</span><span className="block truncate text-[11px] text-gray-500">{t.sub}</span></span>
                </Reveal>
              ))}
              <Reveal delay={390} className="flex items-center"><PlayStoreBadge className="origin-left scale-90" /></Reveal>
            </div>
          </Reveal>
          <Reveal direction="left" delay={120} className="relative">
            <Script className="absolute -top-10 left-1/3 z-30 hidden rotate-[-6deg] text-[22px] leading-[1.05] lg:block">From your phone<br />to new customers</Script>
            <HeroArt />
          </Reveal>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 rounded-[28px] bg-gradient-to-br from-forest-50/80 to-white p-5 ring-1 ring-forest-100 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="relative overflow-hidden rounded-3xl shadow-lg shadow-forest-900/10">
            <MediaSlot name="home-mission" alt="A Nigerian business owner checking orders on his phone" className="aspect-[4/3] w-full object-cover"
              fallback={<MediaSlot name="home-showcase" alt="The Sellapage dashboard on a laptop" className="aspect-[4/3] w-full bg-white object-contain p-3" fallback={<img src="/midpageshowcase-secondarylaptop.png" alt="The Sellapage dashboard on a laptop" className="aspect-[4/3] w-full bg-white object-contain p-3" />} />} />
            <Script className="absolute right-3 top-3 rotate-[-6deg] rounded-xl bg-white/85 px-2.5 py-1 text-[19px] leading-[1.05] backdrop-blur">Real people,<br />real businesses</Script>
          </div>
          <div>
            <Eyebrow>Our mission</Eyebrow>
            <h2 className="mt-3 text-balance font-display text-[1.7rem] font-extrabold leading-tight text-gray-950 sm:text-[2rem]">More than just a platform. <span className="text-forest-600">We&apos;re your growth partner.</span></h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">We give Nigerian entrepreneurs simple, powerful tools to sell, manage and grow their businesses, from the first customer onwards.</p>
            <button type="button" onClick={handleCTA} className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50">Start selling today <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></button>
          </div>
          <ul className="space-y-4 rounded-3xl bg-white/80 p-5 ring-1 ring-forest-100">
            {MISSION_POINTS.map((m) => (
              <li key={m.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><m.icon size={17} /></span>
                <span><span className="block text-[14px] font-bold text-gray-900">{m.title}</span><span className="block text-[12.5px] text-gray-500">{m.sub}</span></span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ── Everything you need ──────────────────────────────────────────── */}
      <section id="features" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Why Sellapage</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.4rem]">Everything you need to sell, in one place.</h2>
            <p className="mt-3 text-[15px] text-gray-600">From storefronts to payments and delivery, Sellapage brings your business tools together so you can focus on growth.</p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CORE.map((c, i) => (
              <Reveal key={c.title} delay={(i % 4) * 80}>
                <Link to="/pricing" className="group flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-xl hover:shadow-forest-900/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 transition duration-300 group-hover:bg-forest-600 group-hover:text-white"><c.icon size={22} /></span>
                  <span className="mt-4 flex items-center justify-between gap-2"><span className="text-[15px] font-bold text-gray-900">{c.title}</span><ArrowRight size={16} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" /></span>
                  <span className="mt-1.5 text-[13px] leading-snug text-gray-500">{c.sub}</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button type="button" onClick={() => setAllFeatures((v) => !v)} aria-expanded={allFeatures} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13.5px] font-semibold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50">
              {allFeatures ? 'Show fewer' : `See every feature (${features.length})`} <ChevronDown size={16} className={`transition ${allFeatures ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {allFeatures && (
            <div className="mt-6 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                  <f.icon size={18} className="mt-0.5 flex-shrink-0 text-forest-600" />
                  <span><span className="block text-[14px] font-bold text-gray-900">{f.title}</span><span className="block text-[13px] leading-snug text-gray-500">{f.description}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-forest-50 to-white p-5 ring-1 ring-forest-100 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <Eyebrow>Every kind of business</Eyebrow>
            <h2 className="mt-3 font-display text-[1.8rem] font-extrabold text-gray-950 sm:text-[2.2rem]">Discover what you can do</h2>
            <p className="mt-2 text-[15px] text-gray-600">From fashion to food to services, Sellapage works for every kind of Nigerian business. See stores already selling.</p>
            <Link to="/live-stores" className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-forest-600/20 transition hover:bg-forest">Explore stores <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></Link>
            <div className="mt-7 grid grid-cols-4 gap-3 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
              {CATEGORIES.map((c, i) => (
                <Reveal key={c.cat} delay={i * 60}>
                  <Link to={`/live-stores?cat=${encodeURIComponent(c.cat)}`} className="group flex flex-col items-center gap-1.5 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-forest-600 shadow-sm ring-1 ring-forest-100 transition duration-300 group-hover:-translate-y-1 group-hover:bg-forest-600 group-hover:text-white"><c.icon size={22} /></span>
                    <span className="text-[12px] font-semibold text-gray-700">{c.label}</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="relative">
            <Script className="absolute -left-2 top-2 z-10 hidden rotate-[-10deg] text-[22px] leading-none lg:block">Trendy and<br />affordable</Script>
            <MediaSlot name="home-categories" alt="A shopper with her phone and products" className="w-full rounded-3xl object-cover"
              fallback={(
                <div className="relative mx-auto flex h-[340px] max-w-[460px] items-center justify-center sm:h-[380px]">
                  <div className="absolute inset-x-6 inset-y-6 rounded-[32px] bg-gradient-to-br from-forest-100 to-forest-50" />
                  <MediaSlot name="home-app-1" alt="The Sellapage app" className="relative z-10 h-[300px] w-auto rounded-[1.6rem] object-contain shadow-2xl sm:h-[340px]" fallback={<img src="/mobile-app-screen-1.jpg" alt="The Sellapage app" className="relative z-10 h-[300px] w-auto rounded-[1.6rem] object-contain shadow-2xl sm:h-[340px]" />} />
                  <span className="absolute bottom-8 left-2 z-20 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-gray-300/40 animate-float sm:left-6"><span className="block text-[13px] font-bold text-gray-900">New arrivals</span><span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-forest-600 px-2.5 py-1 text-[10.5px] font-bold text-white">Shop now <ArrowRight size={11} /></span></span>
                </div>
              )} />
          </div>
        </Reveal>
      </section>

      {/* ── Live figures ─────────────────────────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-gray-100 sm:p-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div>
            <Eyebrow>Trusted by Nigerian businesses</Eyebrow>
            <h2 className="mt-3 font-display text-[1.6rem] font-extrabold text-gray-950 sm:text-[1.9rem]">Real businesses. Real results.</h2>
            <p className="mt-2 text-[14px] text-gray-600">Nigerian entrepreneurs are already selling with Sellapage.</p>
            <Link to="/success-stories" className="group mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-600 px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-forest">View success stories <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></Link>
          </div>
          <TractionStats tileClass="rounded-2xl bg-forest-50/60 p-3.5 ring-1 ring-forest-100" />
        </Reveal>
      </section>

      {/* ── Real reviews ─────────────────────────────────────────────────── */}
      {reviews?.length > 0 && (
        <section className="bg-gradient-to-b from-white to-forest-50/40 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto mb-8 max-w-2xl text-center">
              <Eyebrow>What our users say</Eyebrow>
              <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Loved by business owners across Nigeria</h2>
              <p className="mt-2 text-[15px] text-gray-600">Real reviews from businesses selling on Sellapage.</p>
            </Reveal>
            <ReviewsCarousel reviews={reviews} />
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">From sign-up to first order in one session</h2>
            <p className="mt-2 text-[15px] text-gray-600">No technical setup. No waiting. Create, add, share, and manage from your dashboard.</p>
          </Reveal>
          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="absolute left-[calc(16.67%+12px)] right-[calc(16.67%+12px)] top-8 hidden h-0.5 bg-gradient-to-r from-forest-100 via-forest-200 to-forest-100 sm:block" />
            {steps.map((s, i) => (
              <Reveal key={s.number} delay={i * 120} className="relative flex flex-col items-center text-center">
                <span className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest-600/25"><span className="text-[10px] font-bold uppercase tracking-wider text-forest-100">Step</span><span className="font-display text-xl font-extrabold leading-none">{s.number}</span></span>
                <h3 className="mt-5 font-display text-[16px] font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-gray-500">{s.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The app ──────────────────────────────────────────────────────── */}
      <section id="mobile-app" className="overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <Reveal direction="left">
            <Eyebrow>Sellapage on your phone</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Run your shop from your pocket</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-gray-600">The Sellapage app is on Google Play. See today&apos;s sales, confirm orders, record a walk-in sale, send a receipt on WhatsApp and ask Sella for help, all from your phone.</p>
            <ul className="mt-5 space-y-2.5">
              {['Today\'s sales and what you are still owed, at a glance', 'Confirm and track orders on the move', 'Record offline sales, send receipts on WhatsApp', 'A push alert the moment an order comes in'].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[14px] text-gray-600"><Check size={16} className="mt-0.5 flex-shrink-0 text-forest-600" />{line}</li>
              ))}
            </ul>
            <div className="mt-6"><PlayStoreBadge /></div>
          </Reveal>
          <Reveal direction="right" delay={120} className="relative flex justify-center lg:justify-end">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-[300px] w-[300px] rounded-full bg-forest-50 opacity-80 blur-3xl sm:h-[420px] sm:w-[420px]" /></div>
            <div className="relative flex w-full max-w-[540px] items-end justify-center gap-3 sm:gap-5">
              <MediaSlot name="home-app-1" alt="The Sellapage app showing today's sales, orders waiting and quick actions" className="relative z-10 w-[45%] max-w-[260px] rounded-[1.75rem] object-contain shadow-2xl shadow-gray-300/60"
                fallback={<img src="/mobile-app-screen-1.jpg" alt="The Sellapage app showing today's sales, orders waiting and quick actions" width={300} height={620} loading="lazy" className="relative z-10 w-[45%] max-w-[260px] rounded-[1.75rem] object-contain shadow-2xl shadow-gray-300/60" />} />
              <MediaSlot name="home-app-2" alt="The Sellapage app showing the orders list with their payment status" className="relative z-0 mb-6 w-[45%] max-w-[260px] rounded-[1.75rem] object-contain shadow-xl shadow-gray-300/50 sm:mb-10"
                fallback={<img src="/mobile-app-screen-2.jpg" alt="The Sellapage app showing the orders list with their payment status" width={300} height={620} loading="lazy" className="relative z-0 mb-6 w-[45%] max-w-[260px] rounded-[1.75rem] object-contain shadow-xl shadow-gray-300/50 sm:mb-10" />} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-10 text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.3rem]">Frequently asked questions</h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal as="details" key={faq.q} delay={i * 60} className="group rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50">
                  <span className="font-display text-[14px] font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5"><p className="text-[14px] leading-relaxed text-gray-500">{faq.a}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to action ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-gradient-to-br from-forest via-forest-700 to-forest-600 px-6 pt-10 text-white sm:px-10 lg:pt-0">
          <Leaf className="absolute -right-8 -top-10 h-44 w-28 -rotate-12" tone="text-white/5" />
          <div className="relative grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="lg:py-12">
              <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">Ready to get started?</span>
              <h2 className="mt-3 text-balance font-display text-[1.8rem] font-extrabold leading-tight sm:text-[2.2rem]">Your business deserves its own place online.</h2>
              <p className="mt-3 max-w-lg text-[14.5px] text-white/80">Create your free store today and take the next step for your business.</p>
              <button type="button" onClick={handleCTA} className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-forest-700 shadow-lg transition hover:bg-forest-50">
                Create your free store <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </button>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <Script className="absolute left-0 top-4 z-10 rotate-[-8deg] text-[24px] leading-none text-white sm:text-[28px]">Small steps,<br />big dreams</Script>
              <MediaSlot name="home-cta" alt="A smiling business owner with her phone" className="relative max-h-[320px] w-auto object-contain"
                fallback={<MediaSlot name="home-hero-phone" alt="A Sellapage store on a phone" className="relative mb-8 h-[296px] w-auto rounded-[28px] bg-white object-contain p-2 shadow-2xl" fallback={<span className="relative mb-8 rounded-[28px] bg-white p-2 shadow-2xl"><img src="/Herosection-mobilephone.png" alt="A Sellapage store on a phone" className="h-[280px] w-auto object-contain" /></span>} />} />
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
