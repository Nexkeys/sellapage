import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, MessageCircle, Zap, ChevronDown, Check, X,
  Store, Package, Share2, TrendingUp, Smartphone, ArrowRight,
  Star, BarChart2, Palette, Settings, Lock, Sparkles, Gift
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import { saveWaitlistEmail } from '../firebase/leads'

// ─── Data ─────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Tell us about your business',
    description: 'Share your products, prices, photos, and WhatsApp number. Takes about 10 minutes.',
  },
  {
    number: '02',
    title: 'Your store goes live',
    description: 'Your clean, professional store page is ready. You get a unique link to share anywhere.',
  },
  {
    number: '03',
    title: 'Share and start selling',
    description: 'Drop the link in your WhatsApp status, Instagram bio, or send it directly. Customers browse, tap, and order.',
  },
]

const features = [
  {
    icon: Smartphone,
    title: 'Mobile-First Store',
    description: 'Your store looks sharp on every phone. Customers shop from their hands, your page meets them there.',
  },
  {
    icon: MessageCircle,
    title: 'One-Tap WhatsApp Orders',
    description: 'Pre-filled order messages land straight in your WhatsApp. No missed orders, no back-and-forth confusion.',
  },
  {
    icon: Package,
    title: 'Clean Product Display',
    description: 'Show your items with images, prices, and descriptions. Look professional without the Shopify price tag.',
  },
  {
    icon: Share2,
    title: 'One Shareable Link',
    description: 'One link works everywhere — WhatsApp status, Instagram bio, Telegram, SMS. Your shop goes where you go.',
  },
  {
    icon: TrendingUp,
    title: 'Lead Capture Built In',
    description: "Customers who browse but don't order can drop their details. You follow up and close the sale.",
  },
  {
    icon: Zap,
    title: 'Up and Running Fast',
    description: 'No technical headaches. Create your account, add your products, and share your link the same day.',
  },
]

const testimonials = [
  {
    name: 'Chioma Adeyemi',
    role: 'Fashion Seller, Lagos',
    initials: 'CA',
    text: "Before Sellapage, I was losing customers because they'd message and I'd forget to reply. Now they click my link, see everything, and order directly. My sales are up.",
  },
  {
    name: 'Emeka Nwosu',
    role: 'Food Vendor, Abuja',
    initials: 'EN',
    text: "I used to screenshot my menu and send it one by one. Now I send one link. Customers see everything, place their orders, and I get a clean WhatsApp message. Much easier.",
  },
  {
    name: 'Fatima Aliyu',
    role: 'Wine & Spirits, Kano',
    initials: 'FA',
    text: 'My customers used to ask the same questions over and over. Now they see all the details on my page. Orders come in clean and clear. Worth every kobo.',
  },
]

const faqs = [
  {
    q: 'Do my customers need to download anything?',
    a: 'No. Your store is a regular web page — customers just tap your link. No app, no account, no friction at all.',
  },
  {
    q: 'How does the WhatsApp order work?',
    a: 'When a customer taps "Order via WhatsApp", it opens a chat with a message already filled in — product name, price, everything. You just reply and confirm.',
  },
  {
    q: 'Can I update my products after I create the store?',
    a: 'Yes. Your dashboard lets you add, edit, or remove products anytime. Changes go live on your store instantly.',
  },
  {
    q: "What if I'm not good with technology?",
    a: "Sellapage is built for everyday sellers, not tech people. If you can use WhatsApp, you can use this. It's that simple.",
  },
  {
    q: 'How do I share my store with customers?',
    a: 'You get a link like sellapage.com.ng/yourbrandname. Paste it in your WhatsApp status, Instagram bio, or send it directly to anyone.',
  },
  {
    q: 'Is it really free right now?',
    a: 'Yes — completely free during our early access period. No card, no hidden fees. Paid plans are coming later with more advanced features, but your free store stays yours.',
  },
]

// ─── Pricing Plans ────────────────────────────────────────────────────────────

const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: '₦0',
    period: 'Forever free',
    description: 'Everything you need to start selling on WhatsApp today.',
    cta: 'Create Free Store',
    ctaStyle: 'outline',
    available: true,
    features: [
      { text: 'Clean product store page', available: true },
      { text: 'WhatsApp order button on every product', available: true },
      { text: 'Up to 10 products', available: true },
      { text: 'Lead capture enquiry form', available: true },
      { text: 'Unique shareable store link', available: true },
      { text: 'Store customisation', available: false },
      { text: 'Analytics & tracking', available: false },
      { text: 'Priority support', available: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'Coming Soon',
    price: '₦5,000',
    period: 'per month',
    description: 'For sellers who are growing and want more control over their store.',
    cta: 'Notify Me',
    ctaStyle: 'solid',
    available: false,
    features: [
      { text: 'Everything in Starter', available: true },
      { text: 'Up to 50 products', available: true },
      { text: 'Customise your store colours & logo', available: true },
      { text: 'See how many people visited your store', available: true },
      { text: 'Track which products get the most clicks', available: true },
      { text: 'Manage store settings easily', available: true },
      { text: 'WhatsApp support', available: true },
      { text: 'Advanced order features', available: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Coming Soon',
    price: '₦12,000',
    period: 'per month',
    description: 'For serious sellers who want the full package and maximum results.',
    cta: 'Notify Me',
    ctaStyle: 'dark',
    available: false,
    features: [
      { text: 'Everything in Growth', available: true },
      { text: 'Unlimited products', available: true },
      { text: 'Payment links via Paystack', available: true },
      { text: 'Full sales analytics dashboard', available: true },
      { text: 'Order history & customer records', available: true },
      { text: 'Custom domain support', available: true },
      { text: 'Priority same-day support', available: true },
      { text: 'Early access to new features', available: true },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [openFaq, setOpenFaq]         = useState(null)
  const [notifyPlan, setNotifyPlan]   = useState(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyDone, setNotifyDone]   = useState(false)
  const { user }  = useAuth()
  const navigate  = useNavigate()

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
     // Still show success to the user — don't block them on a network error
     setNotifyDone(true)
     }
    }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-24 px-4">
        <div className="absolute top-0 left-0 w-72 h-72 bg-brand-100 rounded-full blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-30 translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="absolute top-28 left-6 md:left-20 w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-xl animate-float">
          <ShoppingBag size={22} className="text-white" />
        </div>
        <div className="absolute top-40 right-6 md:right-20 w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl animate-float-delayed">
          <MessageCircle size={22} className="text-white" />
        </div>
        <div className="absolute bottom-32 left-10 md:left-36 w-10 h-10 bg-white border-2 border-brand-200 rounded-xl flex items-center justify-center shadow-md animate-float-delayed">
          <Package size={16} className="text-brand-500" />
        </div>
        <div className="absolute bottom-24 right-10 md:right-36 w-10 h-10 bg-white border-2 border-brand-200 rounded-xl flex items-center justify-center shadow-md animate-float">
          <Store size={16} className="text-brand-500" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 gap-2">
            <Gift size={14} />
            Free during Early Access — no card needed
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6">
            Your WhatsApp shop,{' '}
            <span className="text-brand-500 underline decoration-brand-300 decoration-[3px] underline-offset-4">
              finally professional
            </span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Show your products clearly and let customers order on WhatsApp.
              <br />
            Easy to use - Easy to Share, Made for both big & small sellers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleCTA}
              className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl shadow-brand-200"
            >
              {user ? 'Go to My Dashboard' : 'Create Your Free Store'}
              <ArrowRight size={20} />
            </button>
            <a href="#how-it-works" className="btn-secondary text-lg px-8 py-4 rounded-2xl">
              See How It Works
            </a>
          </div>

          {/* Browser mockup */}
          <div className="relative max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 h-9 flex items-center px-4 gap-1.5 border-b border-gray-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-6">
                  <div className="bg-gray-200 rounded-full h-4 w-52 mx-auto text-[10px] text-gray-400 flex items-center justify-center">
                    sellapage.com.ng/chiomasfashion
                  </div>
                </div>
              </div>
              <img src="/hero-mockup.png" alt="Sellapage store preview" className="w-full" />
            </div>

            <div className="absolute -left-4 md:-left-12 top-1/3 bg-white rounded-2xl shadow-xl border border-gray-100 p-3.5 w-36 md:w-44">
              <p className="text-gray-400 text-xs mb-1">Orders Today</p>
              <p className="font-display font-bold text-2xl text-gray-900">24</p>
              <p className="text-brand-500 text-xs font-semibold mt-0.5">↑ via WhatsApp</p>
            </div>
            <div className="absolute -right-4 md:-right-12 top-1/4 bg-white rounded-2xl shadow-xl border border-gray-100 p-3.5 w-36 md:w-44">
              <p className="text-gray-400 text-xs mb-1">Store Views</p>
              <p className="font-display font-bold text-2xl text-gray-900">312</p>
              <p className="text-brand-500 text-xs font-semibold mt-0.5">↑ This week</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── EARLY ACCESS BANNER ─────────────────────────────────── */}
      <section className="bg-amber-50 border-y border-amber-100 py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-amber-600" />
          </div>
          <p className="text-amber-800 text-sm leading-relaxed">
            <span className="font-bold">You're joining early.</span>{' '}
            Sellapage is free right now while we grow. Paid plans are coming with more features — but your free store stays yours, always.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-tag mb-3">HOW IT WORKS</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Your store, live today
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No technical skill needed. Create your account, add your products, share your link.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
                  <span className="font-display font-extrabold text-brand-600 text-xl">{step.number}</span>
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="section-tag mb-3">WHAT YOU GET</p>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900">
                Everything you need.<br />Nothing you don't.
              </h2>
            </div>
            <p className="text-gray-500 max-w-xs leading-relaxed md:text-right">
              Built specifically for WhatsApp sellers who want to look professional and sell more.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5">
                  <f.icon size={22} className="text-brand-600" />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start gap-12">
            <div className="md:w-64 flex-shrink-0">
              <p className="section-tag mb-3">TESTIMONIALS</p>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-gray-900">
                What sellers are saying
              </h2>
              <div className="hidden md:grid grid-cols-8 gap-1.5 mt-8 opacity-20">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex mb-3 gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={15} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-brand-700 text-xs">{t.initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <p className="section-tag mb-3">PRICING</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Free now. More coming.
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Start for free today. Paid plans are launching soon with features that will take your store to the next level.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="h-px bg-gray-200 flex-1 max-w-24" />
            <div className="inline-flex items-center bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-bold gap-1.5">
              <Gift size={13} />
              Early Access — Starter is free, no time limit
            </div>
            <div className="h-px bg-gray-200 flex-1 max-w-24" />
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onCTA={plan.available ? handleCTA : () => handleNotify(plan.name)}
                user={user}
              />
            ))}
          </div>

          <p className="text-center text-gray-400 text-xs mt-8">
            Prices are estimates and may change before launch. Early access users get a discount on paid plans.
          </p>
        </div>
      </section>

      {/* ── COMING SOON FEATURES ────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-tag mb-3">WHAT'S COMING</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              We're just getting started
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              These features are in the works. Early access users will be the first to get them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Palette,
                title: 'Customise Your Store',
                desc: 'Change your store colours, upload your logo, and make it look exactly like your brand.',
                tag: 'Growth Plan',
                color: 'amber',
              },
              {
                icon: BarChart2,
                title: 'Store Analytics',
                desc: 'See how many people visited your store, which products they clicked, and where they came from.',
                tag: 'Growth Plan',
                color: 'amber',
              },
              {
                icon: Settings,
                title: 'Store Settings & Control',
                desc: 'Turn products on or off, set availability, and manage your store details all in one place.',
                tag: 'Growth Plan',
                color: 'amber',
              },
              {
                icon: TrendingUp,
                title: 'Payment Integration',
                desc: 'Accept payments directly through your store via Paystack. No more chasing transfers.',
                tag: 'Pro Plan',
                color: 'brand',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-5 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.color === 'brand' ? 'bg-brand-50' : 'bg-amber-50'
                }`}>
                  <item.icon size={22} className={item.color === 'brand' ? 'text-brand-600' : 'text-amber-600'} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-display font-bold text-gray-900 text-base">{item.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item.color === 'brand'
                        ? 'bg-brand-50 text-brand-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-tag mb-3">FAQ</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900">
              Questions? We've got answers.
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
                  openFaq === i ? 'border-brand-300 shadow-sm' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm md:text-base pr-4">{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180 text-brand-500' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-br from-brand-500 to-emerald-600">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 gap-2">
            <Gift size={14} />
            Free during Early Access
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white mb-4">
            Start selling smarter today
          </h2>
          <p className="text-brand-100 text-lg mb-10 max-w-xl mx-auto">
            It's free, it's fast, and your customers will immediately see the difference. No card. No stress. Just your store, live.
          </p>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-brand-50 transition-all shadow-xl hover:-translate-y-0.5"
          >
            {user ? 'Go to My Dashboard' : 'Create My Free Store'}
            <ArrowRight size={20} />
          </button>
          {!user && (
            <p className="text-brand-200 text-sm mt-4">No credit card needed. Takes less than 5 minutes.</p>
          )}
        </div>
      </section>

      <Footer />

      {/* ── NOTIFY MODAL ────────────────────────────────────────── */}
      {notifyPlan && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-gray-900 text-xl">
                  {notifyDone ? "You're on the list! 🎉" : `Get notified — ${notifyPlan} Plan`}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {notifyDone
                    ? "We'll let you know as soon as this plan launches. Early users get a special discount."
                    : "Drop your email and we'll notify you the moment this plan goes live. Early users get a discount."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors flex-shrink-0 ml-4"
              >
                <X size={22} />
              </button>
            </div>

            {!notifyDone ? (
              <form onSubmit={submitNotify} className="space-y-3">
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="input-field"
                />
                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all"
                >
                  Notify Me When It Launches
                </button>
              </form>
            ) : (
              <button
                onClick={closeModal}
                className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({ plan, onCTA, user }) {
  const isHighlighted = plan.id === 'growth'

  const ctaLabel = () => {
    if (!plan.available) return 'Notify Me When Live'
    return user ? 'Go to Dashboard' : plan.cta
  }

  const ctaClasses = () => {
    if (!plan.available) {
      return 'w-full py-3 rounded-xl font-semibold text-sm transition-all border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-300 hover:text-brand-600'
    }
    if (plan.ctaStyle === 'outline') {
      return 'w-full py-3 rounded-xl font-semibold text-sm transition-all border-2 border-brand-500 text-brand-600 hover:bg-brand-50'
    }
    if (plan.ctaStyle === 'dark') {
      return 'w-full py-3 rounded-xl font-bold text-sm transition-all bg-gray-900 text-white hover:bg-gray-800'
    }
    return 'w-full py-3 rounded-xl font-bold text-sm transition-all bg-brand-500 text-white hover:bg-brand-600'
  }

  return (
    <div className={`rounded-2xl p-7 flex flex-col relative transition-all ${
      isHighlighted
        ? 'bg-brand-500 shadow-xl shadow-brand-200/50 md:scale-[1.03]'
        : 'bg-white border border-gray-200 shadow-sm'
    }`}>
      {plan.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
          isHighlighted ? 'bg-amber-400 text-amber-900' : 'bg-gray-100 text-gray-500'
        }`}>
          {plan.badge}
        </div>
      )}

      <div className="mb-5">
        <p className={`font-medium text-sm mb-2 ${isHighlighted ? 'text-brand-100' : 'text-gray-400'}`}>
          {plan.name}
        </p>
        <div className="flex items-end gap-1.5 mb-1">
          <span className={`font-display text-4xl font-extrabold ${isHighlighted ? 'text-white' : 'text-gray-900'}`}>
            {plan.price}
          </span>
        </div>
        <p className={`text-sm ${isHighlighted ? 'text-brand-200' : 'text-gray-400'}`}>{plan.period}</p>
        <p className={`text-sm mt-3 leading-relaxed ${isHighlighted ? 'text-brand-100' : 'text-gray-500'}`}>
          {plan.description}
        </p>
      </div>

      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            {feat.available ? (
              <Check size={15} className={`flex-shrink-0 mt-0.5 ${isHighlighted ? 'text-brand-200' : 'text-brand-500'}`} />
            ) : (
              <Lock size={15} className={`flex-shrink-0 mt-0.5 ${isHighlighted ? 'text-brand-300/50' : 'text-gray-300'}`} />
            )}
            <span className={
              feat.available
                ? isHighlighted ? 'text-white' : 'text-gray-700'
                : isHighlighted ? 'text-brand-300/60' : 'text-gray-300'
            }>
              {feat.text}
            </span>
          </li>
        ))}
      </ul>

      <button onClick={onCTA} className={ctaClasses()}>
        {ctaLabel()}
      </button>
    </div>
  )
}