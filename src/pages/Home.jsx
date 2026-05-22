//src/pages/Home.jsx/
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, ShoppingCart, MessageCircle, Zap, ChevronDown, Check, X,
  Store, Package, Share2, TrendingUp, Smartphone, ArrowRight,
  Star, BarChart2, Palette, Settings, Lock, Sparkles, Gift,
  Grid, Users,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import { saveWaitlistEmail } from '../firebase/leads'

// ─── Data ────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Tell us about your business',
    description: 'Add what you sell or offer — products, services, prices, photos, and your contact details. Takes about 2 minutes.',
  },
  {
    number: '02',
    title: 'Your page goes live instantly',
    description: 'Your clean, professional business page is ready. You get a unique link you can share anywhere online.',
  },
  {
    number: '03',
    title: 'Share and start getting customers',
    description: 'Drop the link in your WhatsApp status, Instagram bio, or send it directly to anyone. Customers browse, tap, and reach you.',
  },
]

const features = [
  {
    icon: Smartphone,
    title: 'Sharp on Every Phone',
    description: 'Whether you sell clothes, offer a service, or run a food business — your page loads clean and fast on every phone.',
  },
  {
    icon: MessageCircle,
    title: 'Customers Contact You in One Tap',
    description: 'Every product or service has a direct WhatsApp button. Customers tap once and a message lands in your phone — details already filled in.',
  },
  {
    icon: Package,
    title: 'Customers See Everything Before Messaging',
    description: 'Show your items or services with photos, prices, and descriptions. Customers know what to expect before they reach out.',
  },
  {
    icon: Share2,
    title: 'One Link That Works Everywhere',
    description: 'Your Sellapage link works on WhatsApp status, Instagram bio, Twitter, Telegram — anywhere you promote yourself.',
  },
  {
    icon: TrendingUp,
    title: 'Never Lose an Interested Customer',
    description: "When someone browses but doesn't reach out immediately, they can drop their contact details. You follow up and close the sale.",
  },
  {
    icon: Zap,
    title: 'Live the Same Day You Sign Up',
    description: 'No technical setup. No waiting. Create your account, add your products or services, and share your link — all in the same session.',
  },
  {
    icon: ShoppingCart,
    title: 'WhatsApp Cart (Growth+)',
    description: 'Customers can add multiple items to a cart and send one beautifully structured order directly to the vendor\'s WhatsApp.',
  },
  {
    icon: Package,
    title: 'Stock Count Management',
    description: 'Vendors can set precise stock levels. Out-of-stock products automatically sort to the bottom of the store page.',
  },
  {
    icon: Grid,
    title: 'Categories',
    description: 'Vendors can seamlessly organize their products, allowing customers to easily filter items by category on the live storefront.',
  },
  {
    icon: Sparkles,
    title: 'AI Product Descriptions (Growth+)',
    description: 'Generate a sharp, ready-to-publish product description in seconds. Tap one button and AI writes it for you.',
  },
  {
    icon: Palette,
    title: '20 Premium Store Themes (Pro)',
    description: 'Pick from 20 professionally designed store themes. Each one changes your fonts, colours, layout, and card style completely.',
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
    a: 'No. Your store is a regular web page — customers just tap your link. No app, no account, no friction at all.',
  },
  {
    q: 'How does the order work?',
    a: 'When a customer taps "Order ", it opens a chat with a message already filled in — product name, price, everything. You just reply and confirm.',
  },
  {
    q: 'Can I update my products after I create the store?',
    a: 'Yes. Your dashboard lets you add, edit, or remove products anytime. Changes go live on your store instantly.',
  },
  {
    q: "What if I'm not good with technology?",
    a: "Sellapage is built for everyday people, not tech experts. If you can use WhatsApp, you can set this up. It's that simple.",
  },
  {
    q: 'How do I share my page with customers?',
    a: "You get a link like sellapage.com.ng/yourbrandname. Paste it in your WhatsApp status, Instagram bio, or send it directly to anyone.",
  },
  {
    q: 'Is it really free right now?',
    a: 'Yes — the Starter plan is permanently free. Paid plans are also available now: Growth at ₦5,000/month and Pro at ₦12,000/month, with more features as you grow.',
  },
]

const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: '₦0',
    period: 'Forever free',
    description: 'Everything you need to start getting customers online today.',
    cta: 'Create Free Store',
    ctaStyle: 'outline',
    available: true,
    features: [
      { text: 'Clean business page', available: true },
      { text: 'WhatsApp button on every product or service', available: true },
      { text: 'Up to 10 listings', available: true },
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
      { text: 'WhatsApp support', available: true },
      { text: 'Product on/off toggle', available: true },
      { text: 'AI product descriptions — 20 per day', available: true },
      { text: 'WhatsApp Cart — multi-item orders in one message', available: true },
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
  { icon: Zap, label: 'No Coding Needed', sub: 'Launch in Minutes' },
  { icon: Smartphone, label: 'Mobile Friendly', sub: 'Looks Great Anywhere' },
  { icon: BarChart2, label: 'Built for Sales', sub: 'Designed to Convert' },
  { icon: MessageCircle, label: 'Orders', sub: 'Customers Can Chat & Order' },
  { icon: Lock, label: 'Secure & Reliable', sub: 'Your Store, Always Online' },
]

const stats = [
  { value: '100+', label: 'Stores Created' },
  { value: '100%', label: 'Free to Start' },
  { value: '5 mins', label: 'To Go Live' },
  { value: '24/7', label: 'Always Online' },
]

const storeExamples = [
  {
    name: 'Tasty Meals – Food Store',
    desc: 'Taking food orders across Lagos',
    image: '/seehowotherssell-projectimage1.png',
    tag: 'Tasty Meals',
    tagline: 'Delicious food, delivered fast',
    btnLabel: 'Order Now',
  },
  {
    name: 'Gadgets Hub – Tech Store',
    desc: 'Selling gadgets and accessories online',
    image: '/seehowotherssell-projectimage2.png',
    tag: 'Gadgets Hub',
    tagline: 'Latest gadgets. Best prices.',
    btnLabel: 'Shop Now',
  },
  {
    name: 'Home & More – Home Essentials',
    desc: 'Quality home products for every home',
    image: '/seehowotherssell-projectimage3.png',
    tag: 'Home & More',
    tagline: 'Everything for your home',
    btnLabel: 'Shop Now',
  },
]

const comingFeatures = [
  { icon: Settings, title: 'Structured Orders Tab Tracking', desc: 'Track and manage customer orders from a dedicated Orders tab on your storefront.' },
  { icon: Users, title: 'Advanced Customers CRM', desc: 'See customer history, repeat buyers, and follow up smarter from one dashboard.' },
  { icon: Gift, title: 'Discount & Coupon Codes Engine', desc: 'Create promo codes and run discounts that customers can apply at checkout.' },
  { icon: Star, title: 'Customer Reviews & Ratings', desc: 'Let happy customers leave reviews and build trust on your store page.' },
  { icon: Smartphone, title: 'Native Mobile App', desc: 'Manage your store and orders on the go with a dedicated Sellapage mobile app.' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null)
  const [notifyPlan, setNotifyPlan] = useState(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyDone, setNotifyDone] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i)
  const handleCTA = () => navigate(user ? '/dashboard' : '/login')

  const handleNotify = (planName) => {
    setNotifyPlan(planName)
    setNotifyDone(false)
    setNotifyEmail('')
  }

  const closeModal = () => {
    setNotifyPlan(null)
    setNotifyDone(false)
    setNotifyEmail('')
  }

  const submitNotify = async (e) => {
    e.preventDefault()
    try {
      await saveWaitlistEmail(notifyEmail, notifyPlan)
      setNotifyDone(true)
      setNotifyEmail('')
    } catch (err) {
      console.error('Waitlist save failed:', err)
      setNotifyDone(true)
    }
  }

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
                For Nigerian Business Owners
              </div>

              <h1 className="font-display text-[2.6rem] sm:text-5xl lg:text-[3.35rem] font-extrabold leading-[1.08] tracking-tight text-gray-950 mb-6 max-w-xl">
                One link for<br />
                <span className="text-brand-600">everything you</span><br />
                sell or offer.
              </h1>

              <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Create a clean page for your products. Share one link anywhere.
                Let customers browse and order directly from your store.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-brand-200/80 hover:shadow-xl hover:shadow-brand-200"
                >
                  Create Your Free Page
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#examples"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-brand-600 font-semibold text-sm px-5 py-3.5 rounded-xl border border-gray-200 hover:border-brand-300 bg-white shadow-sm transition-all duration-200"
                >
                  View Examples
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
                  <span className="text-sm text-gray-400 ml-1">Trusted by 100+ Nigerian Businesses</span>
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
                  <p className="text-[10px] text-gray-400 leading-tight">via WhatsApp</p>
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
              Everything You Need to Sell Online
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              Built for vendors, service providers, freelancers, and business owners who want to look professional and get more customers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: 'Create Your Storefront', desc: 'Build a beautiful store page in minutes. Add products, images, and prices.' },
              { icon: Package, title: 'Manage Products', desc: 'Add, edit, and organise your products easily. Keep your store fresh and updated.' },
              { icon: MessageCircle, title: 'Receive Orders', desc: 'Customers order directly from your page. Get notified and fulfil with ease.' },
              { icon: TrendingUp, title: 'Track Performance', desc: "See what's working. Track visitors, orders, and sales all in one place." },
              { icon: ShoppingCart, title: 'WhatsApp Cart (Growth+)', desc: 'Customers can add multiple items to a cart and send one beautifully structured order directly to the vendor\'s WhatsApp.' },
              { icon: Package, title: 'Stock Count Management', desc: 'Vendors can set precise stock levels. Out-of-stock products automatically sort to the bottom of the store page.' },
              { icon: Grid, title: 'Categories', desc: 'Vendors can seamlessly organize their products, allowing customers to easily filter items by category on the live storefront.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm shadow-gray-100/80 hover:shadow-lg hover:shadow-gray-200/80 hover:border-brand-100 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <item.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-base mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                <button className="mt-4 inline-flex items-center gap-1 text-brand-600 text-sm font-semibold hover:gap-2 transition-all duration-150">
                  Learn More <ArrowRight className="w-3.5 h-3.5" />
                </button>
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
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Why Nigerian Businesses Choose Sellapage</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-6">
                Simple, Fast &amp; Built<br />
                for <span className="text-brand-600">Real Business.</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md">
                Sellapage helps you sell more with less stress. One link. More sales. Happier customers.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'One link to showcase everything you sell',
                  'Customers can browse and order instantly',
                  'Accept orders via WhatsApp',
                  'Perfect for products, services &amp; bookings',
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
                Create Your Free Page <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right image */}
            <div className="relative flex justify-center">
              <img
                src="/midpageshowcase-secondarylaptop.png"
                alt="Sellapage store showcase"
                width={560}
                height={420}
                loading="lazy"
                className="w-full max-w-[520px] object-contain rounded-2xl drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">How It Works</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              No technical skill needed
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-base">
              Create your account, add what you offer, share your link. Done.
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
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Real Stores on Sellapage</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
                See How Others Sell with Ease
              </h2>
            </div>
            <a href="#" className="inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:gap-2.5 transition-all duration-150">
              View All Examples <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {storeExamples.map((store) => (
              <div key={store.name} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80 hover:shadow-xl hover:shadow-gray-200/80 transition-all duration-300">
                {/* image with overlay */}
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img
                    src={store.image}
                    alt={store.name}
                    width={480}
                    height={360}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* overlay label */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 shadow-sm">
                      <div>
                        <p className="font-display font-bold text-gray-900 text-sm leading-tight">{store.tag}</p>
                        <p className="text-gray-400 text-xs">{store.tagline}</p>
                      </div>
                      <button className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                        {store.btnLabel}
                      </button>
                    </div>
                  </div>
                </div>
                {/* card footer */}
                <div className="px-4 py-3 bg-white">
                  <p className="font-semibold text-gray-900 text-sm">{store.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{store.desc}</p>
                </div>
              </div>
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
            <p className="text-gray-400 text-base">What sellers like you could expect.</p>
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

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Choose Your Plan</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Start free. Grow when you're ready.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => {
              const isGrowth = plan.id === 'growth'
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 border flex flex-col ${
                    isGrowth
                      ? 'bg-brand-600 border-brand-600 text-white shadow-2xl shadow-brand-200/80 scale-[1.02]'
                      : 'bg-white border-gray-100 text-gray-900 shadow-sm shadow-gray-100/70'
                  }`}
                >
                  {isGrowth && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                      Most Popular
                    </div>
                  )}

                  <h3 className={`font-display font-extrabold text-xl mb-1 ${isGrowth ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`font-display text-4xl font-extrabold ${isGrowth ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm mb-1.5 ${isGrowth ? 'text-brand-100' : 'text-gray-400'}`}>/{plan.period}</span>
                  </div>
                  <p className={`text-sm mb-6 ${isGrowth ? 'text-brand-100' : 'text-gray-500'}`}>{plan.description}</p>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat.text} className="flex items-start gap-2.5">
                        {feat.available ? (
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isGrowth ? 'text-brand-200' : 'text-brand-600'}`} />
                        ) : (
                          <X className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isGrowth ? 'text-brand-300/60' : 'text-gray-300'}`} />
                        )}
                        <span className={`text-sm ${feat.available ? (isGrowth ? 'text-white' : 'text-gray-700') : (isGrowth ? 'text-brand-300/60' : 'text-gray-300')}`}>
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleCTA}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      isGrowth
                        ? 'bg-white text-brand-700 hover:bg-brand-50'
                        : plan.id === 'pro'
                        ? 'bg-gray-900 hover:bg-gray-700 text-white'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-100'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMING SOON FEATURES ────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What's Coming</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Features in the works
            </h2>
            <p className="text-gray-400 text-base max-w-sm mx-auto">
              Early access users will be the first to get them.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {comingFeatures.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm shadow-gray-100/70 hover:shadow-lg hover:shadow-gray-200/80 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                  <item.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
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
              <div
                key={i}
                className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm shadow-gray-100/60"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-display font-semibold text-gray-900 text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
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
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-tight mb-1">
                  Ready to start selling online?
                </h2>
                <p className="text-brand-100 text-sm leading-relaxed">
                  Create your free store in minutes and start receiving orders from your customers today.
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-bold text-sm px-8 py-4 rounded-xl transition-all shadow-xl shadow-brand-900/10"
              >
                Create Your Free Page <ArrowRight className="w-4 h-4" />
              </button>
              {!user && (
                <p className="text-brand-200 text-xs text-center">No credit card needed. Takes less than 5 minutes.</p>
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
                <span className="text-brand-100 text-xs">100+ Nigerian Businesses Trust Sellapage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── NOTIFY MODAL ────────────────────────────────────────────────── */}
      {notifyPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {notifyDone ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-2">You're on the list!</h3>
                <p className="text-gray-500 text-sm">
                  We'll let you know as soon as this plan launches. Early users get a special discount.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-1">
                  Get notified for <span className="text-brand-600">{notifyPlan}</span>
                </h3>
                <p className="text-gray-500 text-sm mb-5">
                  Drop your email and we'll notify you the moment this plan goes live. Early users get a discount.
                </p>
                <form onSubmit={submitNotify} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                  >
                    Notify Me
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
