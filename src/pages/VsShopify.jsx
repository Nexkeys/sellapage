// src/pages/VsShopify.jsx/
import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'


const FEATURES = [
  { label: 'Free to start',                       shopify: false, sellapage: true  },
  { label: 'Set up in under 10 minutes',           shopify: false, sellapage: true  },
  { label: 'Direct customer ordering',             shopify: true,  sellapage: true  },
  { label: 'No technical skills needed',           shopify: false, sellapage: true  },
  { label: 'No domain or hosting needed',          shopify: false, sellapage: true  },
  { label: 'Built for Nigerian sellers',           shopify: false, sellapage: true  },
  { label: 'Sell products and services',           shopify: true,  sellapage: true  },
  { label: 'Dashboard to manage orders & leads',   shopify: true,  sellapage: true  },
  { label: 'Online payment processing',            shopify: true,  sellapage: true  },
  { label: 'Inventory and customer management',    shopify: true,  sellapage: true  },
  { label: 'Delivery integration & tracking',      shopify: true,  sellapage: true  },
  { label: 'Verified customer reviews',            shopify: true,  sellapage: true  },
  { label: 'Discounts & promo codes',              shopify: true,  sellapage: true  },
  { label: 'AI product descriptions',              shopify: false, sellapage: true  },
  { label: 'Custom domain included in plan',       shopify: false, sellapage: true  },
]


export default function VsShopify() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Sellapage vs Shopify"
        description="Compare Sellapage and Shopify. See why Sellapage is built specifically for Nigerian businesses with local payments, delivery, and pricing."
        url="/compare/vs-shopify"
        keywords="sellapage vs shopify, shopify alternative nigeria, ecommerce platform nigeria"
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Shopify is expensive and complex.<br />Sellapage gets you selling today.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed mb-6">
            Shopify is a powerful platform built for big businesses with a tech team and a budget.
            We built Sellapage for everyday Nigerian sellers who want to start now, not next month.
          </p>
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            Sellapage gives you a live commerce workspace: store pages for products and services, Paystack checkout, Sendbox delivery, customer CRM, verified reviews, discounts, analytics, AI descriptions, and custom domains - all from one Nigerian-built dashboard. No developer required.
          </p>
        </div>
      </section>

      {/* Cost callout */}
      <section className="py-10 px-4 bg-white">
        <Reveal className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm mb-1">The real cost of Shopify for Nigerian businesses</p>
              <p className="text-amber-700 text-sm leading-relaxed">
                Shopify Basic starts at $29/month - roughly <strong>₦47,000+ monthly</strong> at current rates.
                Add domain (₦15,000+/yr), essential apps (₦10,000-₦50,000/mo), and 2% transaction fees on top of Paystack fees.
                For a Nigerian SME, that's ₦60,000-₦100,000+ monthly before you sell a single item.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Feature comparison */}
      <section className="py-10 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <Reveal as="h2" className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Side by Side
          </Reveal>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div />
            <div className="bg-gray-100 rounded-xl py-3 text-center">
              <p className="font-bold text-gray-500 text-sm">Shopify</p>
            </div>
            <div className="bg-brand-500 rounded-xl py-3 text-center">
              <p className="font-bold text-white text-sm">Sellapage</p>
            </div>
          </div>

          <div className="space-y-2">
            {FEATURES.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 sm:gap-3 items-center bg-gray-50 rounded-xl px-3 sm:px-4 py-3">
                <p className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{row.label}</p>
                <div className="flex justify-center">
                  {row.shopify
                    ? <Check size={18} className="text-green-500" />
                    : <X     size={18} className="text-red-400"   />}
                </div>
                <div className="flex justify-center">
                  {row.sellapage
                    ? <Check size={18} className="text-brand-500" />
                    : <X     size={18} className="text-red-400"   />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-life scenario */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <Reveal as="h2" className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            The Reality for Most Sellers
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            <Reveal direction="left" className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="font-bold text-gray-400 text-sm mb-1">Starting on Shopify</p>
              <div className="w-8 h-1 bg-gray-200 rounded mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                You sign up. Then you need to pick a theme, buy a domain, connect a payment gateway,
                set up product pages, configure shipping settings. Two weeks later, you're still figuring it out -
                and you've already paid ₦47,000.
              </p>
            </Reveal>
            <Reveal direction="right" delay={150} className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6">
              <p className="font-bold text-brand-600 text-sm mb-1">Starting on Sellapage</p>
              <div className="w-8 h-1 bg-brand-200 rounded mb-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                You sign up. You add your products or services, prices, photos, delivery details, and payment options.
                In under 30 minutes, customers are browsing, ordering, and entering your Sellapage workflow.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Who should use what */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <Reveal as="h2" className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Which One Is Right for You?
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            <Reveal direction="left" className="bg-gray-50 rounded-2xl p-6">
              <p className="font-bold text-gray-600 mb-4">Use Shopify if...</p>
              <ul className="space-y-2.5">
                {[
                  'You have ₦50,000+ per month for tools',
                  'You have a developer on your team',
                  'You need complex inventory and multi-currency checkout',
                  "You're running a large, established e-commerce business",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-gray-300 flex-shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal direction="right" delay={150} className="bg-brand-50 rounded-2xl border border-brand-100 p-6">
              <p className="font-bold text-brand-700 mb-4">Use Sellapage if...</p>
              <ul className="space-y-2.5">
                {[
                  'You want a Nigerian-first commerce workspace',
                  'You want to start immediately without heavy setup costs',
                  "You're a small business, service provider, or growing merchant",
                  'You sell products, services, or both and want one page to manage it all',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-700">
                    <Check size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-brand-500 to-emerald-600">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-extrabold text-white text-3xl mb-3">
            Start free. Sell today.
          </h2>
          <p className="text-brand-100 mb-8 text-base">
            Your store. Your products. Your services. One link. Zero cost to start.
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-2xl font-bold text-base hover:bg-brand-50 transition-all shadow-xl hover:-translate-y-0.5"
          >
            {user ? 'Check your growth workspace' : 'Create Free Account'}
            <ArrowRight size={18} />
          </button>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
