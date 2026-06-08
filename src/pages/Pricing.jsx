import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Free forever. Launch a clean commerce page for offers, enquiries, and direct customer orders.',
    features: [
      '15 products or services',
      'Shareable business link',
      'Direct order routing',
      'Lead capture form',
      'Offer & Name Lab',
      'Policy Generator',
      'Stock and category basics'
    ],
    cta: 'Start for Free',
    popular: false,
  },
  {
    name: 'Growth',
    price: '₦5,000 /mo',
    description: 'For growing teams that need analytics, carts, branding, AI descriptions, and stronger page control.',
    features: [
      'Up to 50 products or services',
      'Custom visual palette',
      'AI product descriptions',
      'Page analytics',
      'Multi-item cart checkouts'
    ],
    cta: 'Upgrade to Growth',
    popular: true,
  },
  {
    name: 'Pro',
    price: '₦12,000 /mo',
    description: 'For serious businesses managing orders, customers, reviews, payouts, and premium operations from one place.',
    features: [
      'Unlimited products or services',
      '20 custom commerce themes',
      'Advanced analytics dashboard',
      'Customer CRM and reviews',
      'Priority same-day support'
    ],
    cta: 'Get Pro',
    popular: false,
  },
  {
    name: 'Premium',
    price: '₦25,000 /mo',
    description: 'For established operators that need white-label commerce, team access, customer retention tools, and advanced automation.',
    features: [
      'Everything in Pro',
      'White-label customer experience',
      'WhatsApp Business automation',
      'Customer broadcasts and loyalty tools',
      'Staff access controls',
      'Advanced analytics and integrations'
    ],
    cta: 'Contact Sales',
    popular: false,
    contactOnly: true,
  }
]

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Pricing</span>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Start free. Upgrade when you're ready.
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Simple, transparent pricing built for Nigerians. 
            Manage your store, customers, payments, orders and growth tools from one live workspace.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-3xl border p-8 flex flex-col transition-all hover:-translate-y-1 ${plan.popular ? 'border-brand-500 shadow-2xl shadow-brand-100/60 relative' : 'border-gray-200 shadow-sm hover:shadow-lg'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
              <div className="mb-6">
                <span className="font-display text-4xl font-extrabold text-gray-900">{plan.price}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <Check size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(plan.contactOnly ? '/contact' : user ? '/dashboard' : '/login')}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.popular 
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200/50' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
