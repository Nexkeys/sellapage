import { Link, useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'


const FEATURES = [
  { category: 'Store & Discovery', items: [
    { label: 'Share a link anywhere',           linktree: true,  sellapage: true  },
    { label: 'Show product photos',             linktree: false, sellapage: true  },
    { label: 'Show prices clearly',             linktree: false, sellapage: true  },
    { label: 'Product descriptions',            linktree: false, sellapage: true  },
    { label: 'Category filters and search',     linktree: false, sellapage: true  },
    { label: 'Sell products and services',      linktree: false, sellapage: true  },
    { label: '20 premium store themes',         linktree: false, sellapage: true  },
  ]},
  { category: 'Orders & Checkout', items: [
    { label: 'Direct customer ordering',        linktree: false, sellapage: true  },
    { label: 'WhatsApp order button',           linktree: false, sellapage: true  },
    { label: 'Multi-item cart checkout (Growth+)', linktree: false, sellapage: true  },
    { label: 'In-app Paystack checkout (Pro+)', linktree: false, sellapage: true  },
    { label: 'Customer lead capture form',      linktree: false, sellapage: true  },
  ]},
  { category: 'Growth & Operations', items: [
    { label: 'Dashboard to manage orders & leads', linktree: false, sellapage: true  },
    { label: 'Customer CRM and analytics',      linktree: false, sellapage: true  },
    { label: 'Delivery integration & tracking',  linktree: false, sellapage: true  },
    { label: 'Reviews and discount codes',       linktree: false, sellapage: true  },
    { label: 'AI product descriptions',          linktree: false, sellapage: true  },
    { label: 'Custom domain',                    linktree: false, sellapage: true  },
    { label: 'Free to start',                    linktree: true,  sellapage: true  },
  ]},
]


export default function VsLinktree() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Sellapage vs Linktree"
        description="Compare Sellapage and Linktree. See why Sellapage is the better choice for Nigerian businesses that need a full commerce page, not just a link list."
        url="/compare/vs-linktree"
        keywords="sellapage vs linktree, linktree alternative nigeria, link in bio alternative"
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-tag mb-4">SELLAPAGE VS LINKTREE</p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Linktree shows links.<br />Sellapage sells products.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed mb-6">
            Linktree provides a list of links. Sellapage gives your business a real commerce page where customers see your products or services,
            check prices, order, and enter your customer workflow.
          </p>
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            Sellapage replaces your Linktree with a full commerce workspace: store pages for products and services, Paystack checkout, Sendbox delivery, customer CRM, verified reviews, discounts, analytics, AI descriptions, and custom domains — all from one dashboard.
          </p>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Side by Side
          </h2>

          {/* Column headers */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div />
            <div className="bg-gray-100 rounded-xl py-3 text-center">
              <p className="font-bold text-gray-500 text-sm">Linktree</p>
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
                      {row.linktree
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

      {/* Real-life scenario */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            What a Customer Actually Sees
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="font-bold text-gray-400 text-sm mb-1">With Linktree</p>
              <div className="w-8 h-1 bg-gray-200 rounded mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                Customer sees your bio link. They click it. They see a list — "DM to order", "Visit my page",
                "Follow on Instagram". They have to do more work. Most will close and move on.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6">
              <p className="font-bold text-brand-600 text-sm mb-1">With Sellapage</p>
              <div className="w-8 h-1 bg-brand-200 rounded mb-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                Customer clicks your link. They see your products and services with real photos, prices, details, and ordering options.
                They can order, leave details, and become a trackable customer in your Sellapage workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who should use what */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Which One Is Right for You?
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-gray-50 rounded-2xl p-6">
              <p className="font-bold text-gray-600 mb-4">Use Linktree if...</p>
              <ul className="space-y-2.5">
                {[
                  "You're not selling anything",
                  'You just want to share your social profiles',
                  'You want to point people to other websites',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-gray-300 flex-shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6">
              <p className="font-bold text-brand-700 mb-4">Use Sellapage if...</p>
              <ul className="space-y-2.5">
                {[
                  'You sell through social media and need a real commerce page',
                  'You want customers to see real photos and prices',
                  'You sell products, services, or both and want one page to manage it all',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-700">
                    <Check size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
