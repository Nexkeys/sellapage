import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'


const FEATURES = [
  { category: 'Store & Discovery', items: [
    { label: 'Shareable public store link',          wa: false, sellapage: true  },
    { label: 'Works outside WhatsApp (web browser)', wa: false, sellapage: true  },
    { label: 'Show prices, photos, descriptions',    wa: false, sellapage: true  },
    { label: 'Product search for customers',         wa: false, sellapage: true  },
    { label: 'Category filters',                     wa: false, sellapage: true  },
    { label: 'Sell products and services',           wa: false, sellapage: true  },
    { label: '20 premium store themes',              wa: false, sellapage: true  },
  ]},
  { category: 'Orders & Checkout', items: [
    { label: 'Pre-filled order messages',            wa: false, sellapage: true  },
    { label: 'WhatsApp order button',                wa: false, sellapage: true  },
    { label: 'Multi-item cart checkout (Growth+)',   wa: false, sellapage: true  },
    { label: 'In-app Paystack checkout (Pro+)',      wa: false, sellapage: true  },
    { label: 'Customer lead capture form',           wa: false, sellapage: true  },
  ]},
  { category: 'Growth & Operations', items: [
    { label: 'Dashboard to manage orders & leads',   wa: false, sellapage: true  },
    { label: 'Customer CRM and analytics',           wa: false, sellapage: true  },
    { label: 'Delivery integration & tracking',      wa: false, sellapage: true  },
    { label: 'Reviews and discount codes',           wa: false, sellapage: true  },
    { label: 'Share in Instagram bio',               wa: false, sellapage: true  },
    { label: 'Business messaging & quick replies',   wa: true,  sellapage: true  },
    { label: 'Basic product catalogue',              wa: true,  sellapage: true  },
    { label: 'Free to use',                          wa: true,  sellapage: true  },
  ]},
]


export default function VsWhatsAppBusiness() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <SEO {...pageSeo("/compare/vs-whatsapp-business")} url="/compare/vs-whatsapp-business" />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            WhatsApp Business is for chatting.<br />Sellapage is for running commerce.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed mb-6">
            WhatsApp Business is useful for conversations. Sellapage gives you the broader workspace:
            products, services, orders, customers, payments, analytics, and a public store link you can share anywhere.
          </p>
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            Sellapage gives your business a full commerce workspace alongside WhatsApp: store pages for products and services, Paystack checkout, Sendbox delivery, customer CRM, verified reviews, discounts, analytics, and a public link you can share on Instagram, Twitter, flyers, and DMs.
          </p>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <Reveal as="h2" className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            Side by Side
          </Reveal>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div />
            <div className="bg-gray-100 rounded-xl py-3 text-center">
              <p className="font-bold text-gray-500 text-sm">WA Business</p>
            </div>
            <div className="bg-brand-500 rounded-xl py-3 text-center">
              <p className="font-bold text-white text-sm">Sellapage</p>
            </div>
          </div>

          {FEATURES.map((section, si) => (
            <Reveal key={si} delay={si * 100} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2 px-1">{section.category}</p>
              <div className="space-y-2">
                {section.items.map((row, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 sm:gap-3 items-center bg-gray-50 rounded-xl px-3 sm:px-4 py-3">
                    <p className="text-gray-700 text-xs sm:text-sm font-medium leading-snug">{row.label}</p>
                    <div className="flex justify-center">
                      {row.wa
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* The key limitation */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <Reveal as="h2" className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            The Big Problem with WA Business Catalogue
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            <Reveal direction="left" className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="font-bold text-gray-400 text-sm mb-1">WhatsApp Business Catalogue</p>
              <div className="w-8 h-1 bg-gray-200 rounded mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                Your catalogue only works inside WhatsApp. You can't share a link to it publicly.
                New customers who don't have your number already can't browse your products.
                And customers on Instagram or other platforms can't access it at all.
              </p>
            </Reveal>
            <Reveal direction="right" delay={150} className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6">
              <p className="font-bold text-brand-600 text-sm mb-1">Sellapage Commerce Workspace</p>
              <div className="w-8 h-1 bg-brand-200 rounded mb-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                Your Sellapage link works in a browser, on Instagram, in WhatsApp status,
                on Twitter - anywhere. Any customer can browse your catalogue, order, pay, and become part of your customer record.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Best combo */}
      <section className="py-16 px-4 bg-white">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-gray-900 text-2xl mb-4">
            Actually, Use Both Together
          </h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-xl mx-auto">
            WhatsApp Business can still handle conversations. Sellapage handles the commerce layer:
            catalogue, orders, customers, checkout, reviews, and analytics. They work well together.
          </p>
        </Reveal>
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
            {user ? 'Open Your Dashboard' : 'Create Free Account'}
            <ArrowRight size={18} />
          </button>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
