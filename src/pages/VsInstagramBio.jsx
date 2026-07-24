import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'


const FEATURES = [
  { category: 'Store & Discovery', items: [
    { label: 'Dedicated product store page',           ig: false, sellapage: true  },
    { label: 'Show prices and product details',        ig: false, sellapage: true  },
    { label: 'Product descriptions and photos',        ig: false, sellapage: true  },
    { label: 'Category filters and search',            ig: false, sellapage: true  },
    { label: 'Sell products and services',             ig: false, sellapage: true  },
    { label: 'Multiple listings in one page',          ig: false, sellapage: true  },
  ]},
  { category: 'Orders & Checkout', items: [
    { label: 'Direct order flow per listing',          ig: false, sellapage: true  },
    { label: 'WhatsApp order button',                  ig: false, sellapage: true  },
    { label: 'Multi-item cart checkout (Growth+)',     ig: false, sellapage: true  },
    { label: 'In-app Paystack checkout (Pro+)',        ig: false, sellapage: true  },
    { label: 'Lead capture for interested customers',  ig: false, sellapage: true  },
  ]},
  { category: 'Growth & Operations', items: [
    { label: 'Dashboard to manage orders & leads',     ig: false, sellapage: true  },
    { label: 'Customer CRM and analytics',             ig: false, sellapage: true  },
    { label: 'Delivery integration & tracking',        ig: false, sellapage: true  },
    { label: 'Reviews and discount codes',             ig: false, sellapage: true  },
    { label: 'Works without social media algorithm',   ig: false, sellapage: true  },
    { label: 'Post photos and videos',                 ig: true,  sellapage: true  },
    { label: 'Free to use',                            ig: true,  sellapage: true  },
  ]},
]


export default function VsInstagramBio() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Sellapage vs Instagram Bio"
        description="Compare Sellapage and Instagram bio links. See why Sellapage gives you a full commerce page with products, checkout, and orders."
        url="/compare/vs-instagram-bio"
        keywords="sellapage vs instagram bio, instagram link alternative, bio link alternative nigeria"
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-tag mb-4">SELLAPAGE VS INSTAGRAM BIO</p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            One Instagram link is not a store.<br />Sellapage is.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed mb-6">
            Using your Instagram bio link to sell is like running a market from a post-it note.
            Sellapage gives you a full commerce page with products, services, prices, direct ordering, customer records, and payments.
          </p>
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            Sellapage gives your Instagram a real commerce workspace: store pages for products and services, Paystack checkout, Sendbox delivery, customer CRM, verified reviews, discounts, analytics, AI descriptions, and custom domains — all from one dashboard.
          </p>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Side by Side
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div />
            <div className="bg-gray-100 rounded-xl py-3 text-center">
              <p className="font-bold text-gray-500 text-sm">Instagram Bio</p>
            </div>
            <div className="bg-brand-500 rounded-xl py-3 text-center">
              <p className="font-bold text-white text-sm">Sellapage</p>
            </div>
          </div>

          {FEATURES.map((section, si) => (
            <div key={si} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2 px-1">{section.category}</p>
              <div className="space-y-2">
                {section.items.map((row, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 sm:gap-3 items-center bg-gray-50 rounded-xl px-3 sm:px-4 py-3">
                    <p className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{row.label}</p>
                    <div className="flex justify-center">
                      {row.ig
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
          ))}
        </div>
      </section>

      {/* The algorithm problem */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            The Problem with Selling on Instagram
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="font-bold text-gray-400 text-sm mb-1">Selling via Instagram</p>
              <div className="w-8 h-1 bg-gray-200 rounded mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                You post a product photo. The algorithm decides who sees it.
                You can only have one bio link. Customers have to DM you to ask price.
                Posts disappear in the feed after a day. You're constantly posting just to stay visible.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6">
              <p className="font-bold text-brand-600 text-sm mb-1">With Sellapage in your bio</p>
              <div className="w-8 h-1 bg-brand-200 rounded mb-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                Your Sellapage link sits in your Instagram bio permanently.
                Any visitor clicks it and sees your products, services, prices, photos, and ordering options in one place.
                They order directly. No algorithm. No posts buried. Always accessible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Best combo */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-gray-900 text-2xl mb-4">
            Use Instagram to Promote, Sellapage to Sell
          </h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-xl mx-auto">
            Keep your Instagram for content — photos, reels, stories. Put your Sellapage link
            in your bio. When people want to buy, they click through to your real commerce workspace.
            Instagram brings the audience. Sellapage closes the sale.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-brand-500 to-emerald-600">
        <div className="max-w-2xl mx-auto text-center">
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
            {user ? 'Open Your Dashboard' : 'Create Free Account'}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
