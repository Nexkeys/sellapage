//src/pages/Home.jsx/
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, ShoppingCart, MessageCircle, Zap, ChevronDown, Check, X,
  Store, Package, Share2, TrendingUp, Smartphone, ArrowRight,
  Star, BarChart2, Palette, Settings, Lock, Sparkles, Gift,
  Grid, Users, Truck, CreditCard, Tag, Download, Globe, Shield,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'

// ─── Data ────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Tell us about your business',
    description: 'Add what you sell or offer, whether products, services, prices, photos, contact details, delivery options, and payment preferences.',
  },
  {
    number: '02',
    title: 'Your page goes live instantly',
    description: 'Your clean, professional business page is ready. You get a unique link you can share anywhere online.',
  },
  {
    number: '03',
    title: 'Share and start getting customers',
    description: 'Drop the link in your social bios, messages, ads, flyers, or direct conversations. Customers browse, order, pay, and reach you.',
  },
]

const features = [
  {
    icon: Smartphone,
    title: 'Sharp on Every Phone',
    description: 'Whether you sell clothes, offer a service, or run a food business, your page loads clean and fast on every phone.',
  },
  {
    icon: MessageCircle,
    title: 'Customers Order in One Flow',
    description: 'Every product or service has a clear action path. Customers can order, leave details, and move into your customer workflow without confusion.',
  },
  {
    icon: Package,
    title: 'Customers See Everything Before Messaging',
    description: 'Show your items or services with photos, prices, and descriptions. Customers know what to expect before they reach out.',
  },
  {
    icon: Share2,
    title: 'One Link That Works Everywhere',
    description: 'Your Sellapage link works on WhatsApp status, Instagram bio, Twitter, Telegram, flyers — anywhere you promote yourself.',
  },
  {
    icon: TrendingUp,
    title: 'Never Lose an Interested Customer',
    description: "When someone browses but doesn't reach out immediately, they can drop their contact details. You follow up and close the sale.",
  },
  {
    icon: Zap,
    title: 'Live the Same Day You Sign Up',
    description: 'No technical setup. No waiting. Create your account, add your products or services, and share your link all in the same session.',
  },
  {
    icon: ShoppingCart,
    title: 'Structured Cart (Growth+)',
    description: 'Customers can add multiple items to a cart and send one clean order with their details, notes, and preferred next step.',
  },
  {
    icon: Package,
    title: 'Stock Count Management',
    description: 'Vendors can set precise stock levels. Out-of-stock products automatically sort to the bottom of the store page.',
  },
  {
    icon: Grid,
    title: 'Categories & Search',
    description: 'Organize offers with categories so customers can filter and search items on the live page.',
  },
  {
    icon: Sparkles,
    title: 'AI Product Descriptions (Growth+)',
    description: 'Generate a sharp, ready-to-publish product or service description in seconds. Tap one button and AI writes it for you.',
  },
  {
    icon: Palette,
    title: '20 Premium Store Themes (Pro)',
    description: 'Pick from 20 professionally designed store themes. Each one changes your fonts, colours, layout, and card style completely.',
  },
  {
    icon: ShoppingBag,
    title: 'In-App Paystack Checkout (Pro+)',
    description: 'Accept card, bank transfer, and USSD payments directly on your store. Orders create automatically in your dashboard.',
  },
  {
    icon: Truck,
    title: 'Shipbubble Delivery Integration (Pro+)',
    description: 'Show live delivery rates at checkout, book shipments, and share tracking links with customers from your dashboard.',
  },
  {
    icon: CreditCard,
    title: 'Payouts & Bank Settlement (Pro+)',
    description: 'Connect your bank via Paystack subaccount. View earnings KPIs, transaction history, and get paid on your schedule.',
  },
  {
    icon: Users,
    title: 'Customer CRM (Pro+)',
    description: 'Auto-built from confirmed orders. Expandable profiles, WhatsApp direct links, sort by spend, orders, or recency.',
  },
  {
    icon: Star,
    title: 'Verified Reviews (Pro+)',
    description: 'Buyers leave star ratings and reviews after delivery. Aggregate scores show on product and service cards.',
  },
  {
    icon: Tag,
    title: 'Discounts & Promo Codes (Pro+)',
    description: 'Create percentage or flat discounts, set usage limits and expiry dates. Applied automatically at checkout.',
  },
  {
    icon: Download,
    title: 'Product Export (Pro+)',
    description: 'Export your catalogue to PDF, CSV, Excel, and downloadable files for offline records or marketing.',
  },
  {
    icon: Globe,
    title: 'Custom Domain (Pro+)',
    description: 'Use your own domain (yourbrand.com) for a fully branded store experience.',
  },
  {
    icon: Shield,
    title: 'CAC Verification (Pro+)',
    description: 'Verify your business with Corporate Affairs Commission for added trust and credibility.',
  },
]

const testimonials = [
  {
    name: 'Stephen Promise',
    role: 'Fashion Seller, Lagos',
    avatar: '/avatar-1.png',
    text: "Before Sellapage, I was losing customers because they'd message and I'd forget to reply. Now they click my link, see everything, and order directly. My sales are up.",
  },
  {
    name: 'Emeka Nwosu',
    role: 'Car Dealer, Abuja',
    avatar: '/avatar-2.png',
    text: "I used to screenshot my menu and send it one by one. Now I send one link. Customers see everything, place their orders, and I get a clean WhatsApp message. Much easier.",
  },
  {
    name: 'Peter Bron',
    role: 'Wine & Spirits, Lagos',
    avatar: '/avatar-3.png',
    text: 'My customers used to ask the same questions over and over. Now they see all the details on my page. Orders come in clean and clear. Worth every kobo.',
  },
]

const faqs = [
  {
    q: 'Do my customers need to download anything?',
    a: 'No. Your store is a regular web page customers just tap your link. No app, no account, no friction at all.',
  },
  {
    q: 'How does the order work?',
    a: 'Customers browse your store, choose a product or service, and send a structured order with the important details already included. You confirm from your workflow.',
  },
  {
    q: 'Can I update my products after I create the store?',
    a: 'Yes. Your dashboard lets you add, edit, or remove products anytime. Changes go live on your store instantly.',
  },
  {
    q: "What if I'm not good with technology?",
    a: "Sellapage is built for everyday business owners, not technical teams. If you can upload photos and fill a simple form, you can run your store here.",
  },
  {
    q: 'How do I share my page with customers?',
    a: "You get a link like sellapage.com.ng/yourbrandname. Paste it in your social bio, WhatsApp status, campaign posts, or send it directly to anyone.",
  },
  {
    q: 'Is it really free right now?',
    a: 'Yes — the Starter plan is permanently free. Paid plans are also available: Growth at ₦5,000/month, Pro at ₦12,000/month and Premium at ₦25,000 with more features as you grow.',
  },
]

const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: '₦0',
    period: 'Forever free',
    description: 'Everything you need to start getting customers online today.',
    cta: 'Create Free Account',
    ctaStyle: 'outline',
    available: true,
    features: [
      { text: 'Clean business page', available: true },
      { text: 'Direct order path on every product or service', available: true },
      { text: 'Up to 15 listings', available: true },
      { text: 'Lead capture enquiry form', available: true },
      { text: 'Unique shareable link', available: true },
      { text: 'Store customisation', available: false },
      { text: 'Analytics & tracking', available: false },
      { text: 'Priority support', available: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₦5,000',
    period: 'per month',
    description: 'For businesses that are growing and want more control over their page.',
    cta: 'Upgrade to Growth',
    ctaStyle: 'solid',
    available: true,
    features: [
      { text: 'Everything in Starter', available: true },
      { text: 'Up to 50 listings', available: true },
      { text: 'Customise your page colours & logo', available: true },
      { text: 'See how many people visited your page', available: true },
      { text: 'Track which listings get the most clicks', available: true },
      { text: 'Manage store settings easily', available: true },
      { text: 'Responsive support', available: true },
      { text: 'Product on/off toggle', available: true },
      { text: 'AI product descriptions — 20 per day', available: true },
      { text: 'Structured cart — multi-item orders in one flow', available: true },
      { text: 'Stock count management & out-of-stock sorting', available: true },
      { text: 'Product categories for easy browsing', available: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦12,000',
    period: 'per month',
    description: 'For serious businesses that want the full package and maximum results.',
    cta: 'Upgrade to Pro',
    ctaStyle: 'dark',
    available: true,
    features: [
      { text: 'Everything in Growth', available: true },
      { text: 'Unlimited listings', available: true },
      { text: 'Hot leads list', available: true },
      { text: 'Full analytics dashboard', available: true },
      { text: 'Store badge (Pro tag)', available: true },
      { text: '20 Premium Store Themes — full visual customisation', available: true },
      { text: 'AI product descriptions — 50 per day', available: true },
      { text: 'Priority same-day support', available: true },
      { text: 'Early access to new features', available: true },
    ],
  },
]

const trustBadges = [
  { icon: Zap, label: 'No Coding Required', sub: 'Set up in minutes' },
  { icon: Smartphone, label: 'Mobile-First', sub: 'Looks sharp on any phone' },
  { icon: BarChart2, label: 'Sell Products & Services', sub: 'Physical goods, digital, bookings' },
  { icon: MessageCircle, label: 'Structured Orders', sub: 'Customers order clearly' },
  { icon: Lock, label: 'Always Online', sub: 'Your store never sleeps' },
]

const stats = [
  { value: '100+', label: 'Active Nigerian Stores' },
  { value: '₦0', label: 'To Get Started' },
  { value: '< 2 min', label: 'To Go Live' },
  { value: '24/7', label: 'Always Online' },
]

const storeExamples = [
  {
    name: 'Jenny Wines – Premium Wine Store',
    desc: 'Exquisite wines and spirits delivered straight to your door across Lagos.',
    image: '/seehowotherssell-projectimage1.png',
    tag: 'Jenny Wines',
    tagline: 'Premium wines & spirits, uncorked',
    btnLabel: 'Order Now',
    url: 'https://sellapage.com.ng/jennywines'
  },
  {
    name: 'The Trend Plug – Premium Clothing Store',
    desc: 'The ultimate destination for trending streetwear and fashion outfits.',
    image: '/seehowotherssell-projectimage2.png',
    tag: 'The Trend Plug',
    tagline: 'Your plug for premium outfits',
    btnLabel: 'Shop Now',
    url: 'https://sellapage.com.ng/thetrendplug'
  },
  {
    name: 'Chioma Fashion – Luxury Fashion Store',
    desc: 'Bespoke designs and elegant traditional styles for all premium occasions.',
    image: '/seehowotherssell-projectimage3.png',
    tag: 'Chioma Fashion',
    tagline: 'Elegance in every stitch',
    btnLabel: 'Shop Now',
    url: 'https://sellapage.com.ng/chioma-fashion'
  },
]

const platformFeatures = [
  { icon: Settings, title: 'Structured Checkout', desc: 'Give customers a clear path from browsing to payment confirmation and order follow-up.' },
  { icon: CreditCard, title: 'In-App Paystack Checkout', desc: 'Accept card, bank transfer, and USSD payments directly on your store. Orders create automatically.' },
  { icon: Truck, title: 'Shipbubble Delivery Integration', desc: 'Show live delivery rates at checkout, book shipments, and share tracking links from your dashboard.' },
  { icon: CreditCard, title: 'Payouts & Bank Settlement', desc: 'Connect your bank via Paystack subaccount. View earnings KPIs, transaction history, and get paid on your schedule.' },
  { icon: Users, title: 'Customer CRM', desc: 'Auto-built from confirmed orders. Expandable profiles, WhatsApp direct links, sort by spend, orders, or recency.' },
  { icon: Star, title: 'Verified Reviews & Ratings', desc: 'Buyers leave star ratings and reviews after delivery. Aggregate scores show on product and service cards.' },
  { icon: Tag, title: 'Discounts & Promo Codes', desc: 'Create percentage or flat discounts, set usage limits and expiry dates. Applied automatically at checkout.' },
  { icon: BarChart2, title: 'Advanced Analytics', desc: 'Track store views, clicks, engagement rate, top-performing products and services from one dashboard.' },
  { icon: Download, title: 'Product Export', desc: 'Export your catalogue to PDF, CSV, Excel, and downloadable files for offline records or marketing.' },
  { icon: Globe, title: 'Custom Domain', desc: 'Use your own domain (yourbrand.com) for a fully branded store experience.' },
  { icon: Shield, title: 'CAC Verification', desc: 'Verify your business with Corporate Affairs Commission for added trust and credibility.' },
  { icon: MessageCircle, title: 'Business Messaging', desc: 'Automate order confirmations and customer support from the same commerce flow.' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleCTA = () => navigate(user ? '/dashboard' : '/login')

  return (
    <div className="min-h-screen bg-white font-body text-gray-900">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section id="home" className="relative overflow-hidden bg-white pt-20 pb-0 lg:pt-24">
        {/* subtle green blob top-right */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-brand-50 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-40 w-[340px] h-[340px] rounded-full bg-brand-100 opacity-40 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">

            {/* Left */}
            <div className="max-w-2xl py-10 lg:py-16">
              {/* pill badge */}
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              For Nigerian Business Owners & Service Providers
              </div>

              <h1 className="font-display text-[2.6rem] sm:text-5xl lg:text-[3.35rem] font-extrabold leading-[1.08] tracking-tight text-gray-950 mb-6 max-w-xl">
                Run Your Entire Business from One Dashboard. <br className="hidden sm:block" />
              </h1>

              <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Set up a professional store page for your products or services. Accept payments, manage delivery, track customers in your CRM, run discounts, collect reviews, and grow with analytics — all from one dashboard.
                <br></br> 
                <br></br>
                Share one link anywhere — Instagram, Facebook, TikTok, WhatsApp, Twitter, flyers, or DMs — and let customers browse, order, pay, and reach you directly. 
                <br></br>
                <br></br>
                No coding. No stress.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-brand-200/80 hover:shadow-xl hover:shadow-brand-200"
                >
                  Create Your Free Store
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#examples"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-brand-600 font-semibold text-sm px-5 py-3.5 rounded-xl border border-gray-200 hover:border-brand-300 bg-white shadow-sm transition-all duration-200"
                >
                  See Real Stores
                  <span className="text-base">👁</span>
                </a>
              </div>

              {/* Social proof row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex -space-x-2.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <img
                      key={n}
                      src={`/avatar-${n}.png`}
                      alt={`User avatar ${n}`}
                      width={32}
                      height={32}
                      loading="lazy"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-sm font-semibold text-gray-700 ml-1">5.0</span>
                  <span className="text-sm text-gray-400 ml-1">Trusted by 100+ Nigerian businesses</span>
                </div>
              </div>
            </div>

            {/* Right — hero images */}
              <div className="relative flex justify-center items-end lg:items-center lg:justify-end h-[400px] sm:h-[500px] lg:h-[560px]">
              {/* Main laptop */}
              <img
                src="/Herosection-mainlaptop.png"
                alt="Sellapage dashboard on laptop"
                width={620}
                height={420}
                loading="eager"
                className="relative z-10 w-[88%] sm:w-[78%] lg:w-full max-w-[600px] object-contain drop-shadow-2xl"
              />
              {/* Phone overlay */}
              <img
                src="/Herosection-mobilephone.png"
                alt="Sellapage store on mobile phone"
                width={160}
                height={280}
                loading="eager"
                className="absolute bottom-0 right-0 lg:-right-4 z-20 w-[28%] sm:w-[24%] lg:w-[30%] max-w-[180px] object-contain drop-shadow-xl animate-float"
              />
              {/* Floating badge — New Order */}
              <div className="absolute top-8 left-4 sm:left-0 z-30 flex items-center gap-2 bg-white rounded-2xl shadow-xl shadow-gray-200/70 px-3 py-2 border border-gray-100 animate-float-delayed">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">New Order!</p>
                  <p className="text-[10px] text-gray-400 leading-tight">structured order</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust badges strip ── */}
        <div className="mt-12 border-t border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-2.5 min-w-0">
                  <b.icon className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">{b.label}</p>
                    <p className="text-[11px] text-gray-400 leading-tight">{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT SELLAPAGE DOES ──────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What Sellapage Does</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              One Platform For Everything You Sell Or Offer
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              Built for Nigerian sellers, service providers and freelancers who want to look professional and close more sales without the technical headache.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: 'Create Your Commerce Page', desc: 'Build a beautiful store page in minutes. Add products, services, images, prices and order details.' },
              { icon: Package, title: 'Manage Products & Services', desc: 'Add, edit and organise your offers easily. Keep your store fresh and updated.' },
              { icon: CreditCard, title: 'Accept Payments (Pro+)', desc: 'In-app Paystack checkout for card, transfer, and USSD. Orders create automatically in your dashboard.' },
              { icon: Truck, title: 'Manage Delivery (Pro+)', desc: 'Shipbubble integration for live rates, booking shipments, and tracking. Delivery zones for local areas.' },
              { icon: Users, title: 'Customer CRM (Pro+)', desc: 'Auto-built from confirmed orders. Profiles, WhatsApp links, sort by spend, orders, or recency.' },
              { icon: Star, title: 'Reviews & Ratings (Pro+)', desc: 'Verified buyer reviews with aggregate stars on product and service cards.' },
              { icon: Tag, title: 'Discounts & Promos (Pro+)', desc: 'Percentage or flat discounts, usage limits, expiry dates. Applied automatically at checkout.' },
              { icon: BarChart2, title: 'Analytics & Growth', desc: 'Track store views, clicks, engagement, top performers. Marketing tab with daily tasks and points.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm shadow-gray-100/80 hover:shadow-lg hover:shadow-gray-200/80 hover:border-brand-100 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <item.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-base mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MID-PAGE SHOWCASE — why choose sellapage ────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Why Nigerian Businesses Choose Sellapage™</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-6">
                Less chaos. More orders.<br />
                <span className="text-brand-600">One dashboard.</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md">
                Most Nigerian businesses are managing sales across chats, screenshots, transfers and scattered customer details. 
                Sellapage gives you one proper home for everything you sell or offer and the tools to manage it.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'Your full catalogue in one shareable link',
                  'Orders come in structured, not buried in chats',
                  'Manage products, services, leads and analytics from one dashboard',
                  'Supports products, services and bookings',
                  'In-app Paystack checkout and Shipbubble delivery (Pro+)',
                  'Customer CRM, verified reviews, and discounts (Pro+)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: item }} />
                  </li>
                ))}
              </ul>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm shadow-gray-100/70">
                    <p className="font-display text-2xl font-extrabold text-brand-600 leading-none mb-1">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-brand-200/80 hover:shadow-xl hover:shadow-brand-200"
              >
                Create Your Free Store <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right image */}
            <div className="relative flex justify-center">
              <img
                src="/midpageshowcase-secondarylaptop.png"
                alt="Sellapage dashboard showing products, orders, analytics, and customers"
                width={560}
                height={420}
                loading="lazy"
                className="w-full max-w-[520px] object-contain rounded-2xl drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE REAL PROBLEM ────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 block">
              The Real Problem
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              This is how most Nigerian sellers are operating right now
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              It works until it doesn't. And for most sellers, it breaks at the worst possible time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {[
              {
                problem: 'No permanent catalogue',
                detail: 'Products live in WhatsApp status for 24 hours, then vanish. Every new customer asks the same question: "What do you have?"',
              },
              {
                problem: 'Orders get buried in chats',
                detail: 'A customer messages at 11pm. By morning it\'s buried under 40 other conversations. The sale is gone.',
              },
              {
                problem: 'Looks unprofessional to new buyers',
                detail: 'A customer who doesn\'t know you sees scattered screenshots and no real business page. Trust breaks before the conversation starts.',
              },
              {
                problem: 'Starting from scratch every time',
                detail: 'Every new customer needs prices, photos, and descriptions sent all over again manually, one message at a time.',
              },
              {
                problem: 'No way to track what\'s working',
                detail: 'You have no idea how many people saw your status, which product gets the most interest or who almost bought but didn\'t.',
              },
              {
                problem: 'Expensive tools weren\'t built for you',
                detail: 'Shopify costs ₦47,000 a month and needs a developer. Linktree has no catalogue. WhatsApp Business has no store page.',
              },
              {
                problem: 'No checkout or delivery tools',
                detail: 'Customers can\'t pay on your page. You can\'t show delivery rates or book shipments. Money and logistics stay manual.',
              },
              {
                problem: 'No customer memory',
                detail: 'Repeat buyers are strangers every time. No purchase history, no WhatsApp shortcuts, no way to reward loyalty.',
              },
              {
                problem: 'No growth toolkit',
                detail: 'No analytics, no discounts, no reviews, no export. You\'re flying blind while competitors optimize.',
              },
            ].map((item) => (
              <div
                key={item.problem}
                className="bg-red-50 border border-red-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-600" />
                  </span>
                  <p className="font-bold text-gray-900 text-sm">{item.problem}</p>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed pl-8">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="bg-brand-600 rounded-2xl p-8 sm:p-10 text-center max-w-3xl mx-auto">
            <h3 className="font-display font-extrabold text-white text-2xl sm:text-3xl mb-3">
              Sellapage fixes all of this for free.
            </h3>
            <p className="text-brand-100 max-w-xl mx-auto text-sm sm:text-base mb-6 leading-relaxed">
              Get a professional store link that never expires, receive organised orders, manage customers, track performance, accept payments, handle delivery, run discounts, collect reviews, and run your entire business from one dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Getting Started</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              From sign-up to first order in one session
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-base">
              No technical setup. No waiting. Just create, add, share, and manage from your dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* connector line desktop */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+12px)] right-[calc(16.67%+12px)] h-0.5 bg-brand-100 z-0" />
            {steps.map((step) => (
              <div key={step.number} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-brand-600 flex flex-col items-center justify-center mb-6 shadow-lg shadow-brand-200">
                  <span className="text-brand-100 text-xs font-bold uppercase tracking-wider">Step</span>
                  <span className="text-white font-display text-2xl font-extrabold leading-none">{step.number}</span>
                </div>
                <h3 className="font-display font-bold text-gray-900 text-base mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8 max-w-2xl mx-auto">
            After going live, your dashboard gives you: order management, delivery booking, customer CRM, analytics, discounts, reviews, payouts, and growth tools — all in one place.
          </p>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What You Get</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Built to help you sell more
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              Every feature is live today. Starter gives you the essentials. Growth, Pro, and Premium unlock the full commerce workspace.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100/70 hover:shadow-lg hover:shadow-gray-200/80 hover:border-brand-100 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REAL STORES (EXAMPLES) ──────────────────────────────────────── */}
      <section id="examples" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Real Stores on Sellapage™</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
                See How Others Sell with Ease
              </h2>
              <p className="text-gray-500 text-base mt-2 max-w-xl">
                Live Nigerian businesses using Sellapage for products, services, and bookings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {storeExamples.map((store) => (
              <a 
                key={store.name} 
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80 hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* image with overlay */}
                <div className="relative overflow-hidden h-64 sm:h-72 lg:h-80 w-full bg-gray-50">
                  <img
                    src={store.image}
                    alt={`${store.name} store page on Sellapage`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* overlay label */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-md">
                      <div>
                        <p className="font-display font-bold text-gray-900 text-sm leading-tight">{store.tag}</p>
                        <p className="text-brand-600 text-xs font-medium mt-0.5">{store.tagline}</p>
                      </div>
                      <span className="bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-lg group-hover:bg-brand-700 transition-colors flex-shrink-0">
                        {store.btnLabel}
                      </span>
                    </div>
                  </div>
                </div>
                {/* card footer */}
                <div className="p-5 bg-white">
                  <p className="font-display font-bold text-gray-900 text-base leading-snug group-hover:text-brand-600 transition-colors">{store.name}</p>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">{store.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What Our Users Say</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Loved by Business Owners
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Real Nigerian merchants, service providers, and freelancers sharing their experience with Sellapage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100/70 hover:shadow-lg hover:shadow-gray-200/80 transition-all duration-200 flex flex-col">
                {/* quote mark */}
                <div className="text-brand-200 text-5xl font-serif leading-none mb-3 select-none">&ldquo;</div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover border-2 border-brand-100"
                  />
                  <div>
                    <p className="font-display font-bold text-gray-900 text-sm">— {t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES ───────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Commerce Tools</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Built for the full selling workflow
            </h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto">
              From checkout to delivery, customers, reviews, discounts, analytics, and growth — Sellapage gives Nigerian businesses the operating layer to sell with confidence. Pro and Premium unlock the full suite.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {platformFeatures.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm shadow-gray-100/70 hover:shadow-lg hover:shadow-gray-200/80 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                  <item.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">FAQ</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group border border-gray-100 rounded-2xl bg-white shadow-sm shadow-gray-100/60">
                <summary className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer list-none hover:bg-gray-50 transition-colors">
                  <span className="font-display font-semibold text-gray-900 text-sm">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

       {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left */}
            <div className="flex items-center gap-5 max-w-xl">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <img
                src="/og-image.png"
                alt="Sellapage logo"
                className="w-13 h-13 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
              />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-tight mb-1">
                  Run Your Entire Business from One Dashboard.
                </h2>
                <p className="text-brand-100 text-sm leading-relaxed">
                  Create your free store in minutes. Manage products, services, checkout, delivery, customers, analytics, and growth — all in one place.
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-bold text-sm px-8 py-4 rounded-xl transition-all shadow-xl shadow-brand-900/10"
              >
                Create Your Free Store <ArrowRight className="w-4 h-4" />
              </button>
              {!user && (
                <p className="text-brand-200 text-xs text-center">Free forever on Starter. Upgrade when you need more.</p>
              )}
              {/* social proof */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((n) => (
                    <img
                      key={n}
                      src={`/avatar-${n}.png`}
                      alt={`User ${n}`}
                      width={28}
                      height={28}
                      loading="lazy"
                      className="w-7 h-7 rounded-full border-2 border-brand-600 object-cover"
                    />
                  ))}
                </div>
                <span className="text-brand-100 text-xs">100+ active Nigerian stores use Sellapage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── NOTIFY MODAL ────────────────────────────────────────────────── */}
    </div>
  )
}
