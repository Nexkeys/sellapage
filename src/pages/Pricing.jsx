import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, X, HelpCircle, TrendingDown } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import {
  PLAN_PERIODS,
  PLAN_PRICES,
  formatPrice,
  getMonthlyEquivalent,
  getSavingsPercent,
} from '../utils/billingPlans'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Free forever. Launch a clean commerce page for products, services, enquiries, and direct customer orders.',
    features: [
      '15 total listings (products + services combined)',
      '3 images per listing',
      'WhatsApp order button on every listing',
      'Lead capture enquiry form',
      'Basic store page with hero, categories, search',
      'Offer & Name Lab tool',
      'Policy Generator tool',
      'Stock and category basics',
    ],
    cta: 'Start for Free',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing businesses that need analytics, carts, branding, AI descriptions, and stronger page control.',
    features: [
      'Everything in Starter',
      '50 total listings (products + services combined)',
      '10 images per listing',
      'Custom visual palette (colours, fonts, logo)',
      'Analytics & click tracking (store views, top clicks)',
      'WhatsApp cart & multi-item orders',
      'AI description generation — 20/day',
      'Product & service visibility toggle',
      'Manual orders tab (offline/ledger orders)',
      'Delivery tab with pickup address setup',
      'Marketing tab with daily tasks & points',
      'Stock count management & out-of-stock sorting',
      'Categories for products and services',
    ],
    cta: 'Upgrade to Growth',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious businesses managing orders, customers, reviews, payouts, checkout, delivery, and premium operations from one dashboard.',
    features: [
      'Everything in Growth',
      'Unlimited listings',
      '50 images per listing',
      '20 premium store themes (full visual customization)',
      'In-app Paystack checkout (card, transfer, USSD)',
      'Automatic order creation from payments',
      'Payouts tab with bank settlement via Paystack subaccount',
      'Customer CRM tab (profiles, WhatsApp links, spend/order/recency sorting)',
      'Verified reviews tab (aggregate stars, expandable cards)',
      'Discounts & promo codes tab (percentage/flat, limits, expiry)',
      'Shipbubble delivery integration (live rates, booking, tracking)',
      'Delivery zones setup for local areas',
      'Top-performing analytics (engagement rate, best sellers)',
      'AI description generation — 50/day',
      'Product export (PDF, CSV, Excel, downloadable files)',
      'Custom domain usage (yourbrand.com)',
      'CAC verification system',
      'Priority same-day support',
    ],
    cta: 'Get Pro',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'The flagship plan for established operators. Everything in Pro plus white-label experience and premium positioning.',
    features: [
      'Everything in Pro',
      'White-label customer experience (no Sellapage branding)',
      'Brand-only presentation for the vendor',
      'Highest tier experience',
      'Premium positioning',
    ],
    cta: 'Contact Sales',
    popular: false,
    contactOnly: true,
  }
]

const COMPARISON_ROWS = [
  { category: 'Listings & Media', items: [
    { label: 'Total listings', starter: '15', growth: '50', pro: 'Unlimited', premium: 'Unlimited' },
    { label: 'Images per listing', starter: '3', growth: '10', pro: '50', premium: '50' },
  ]},
  { category: 'Store & Branding', items: [
    { label: 'Basic store page', starter: true, growth: true, pro: true, premium: true },
    { label: 'Custom colours, fonts, logo', starter: false, growth: true, pro: true, premium: true },
    { label: '20 premium store themes', starter: false, growth: false, pro: true, premium: true },
    { label: 'Custom domain', starter: false, growth: false, pro: true, premium: true },
    { label: 'White-label experience', starter: false, growth: false, pro: false, premium: true },
  ]},
  { category: 'Orders & Checkout', items: [
    { label: 'WhatsApp order button', starter: true, growth: true, pro: true, premium: true },
    { label: 'WhatsApp cart (multi-item)', starter: false, growth: true, pro: true, premium: true },
    { label: 'In-app Paystack checkout', starter: false, growth: false, pro: true, premium: true },
    { label: 'Auto order creation from payments', starter: false, growth: false, pro: true, premium: true },
    { label: 'Manual orders tab', starter: false, growth: true, pro: true, premium: true },
    { label: 'Lead capture form', starter: true, growth: true, pro: true, premium: true },
  ]},
  { category: 'Delivery & Fulfillment', items: [
    { label: 'Pickup address setup', starter: false, growth: true, pro: true, premium: true },
    { label: 'Delivery zones', starter: false, growth: false, pro: true, premium: true },
    { label: 'Shipbubble integration (rates, booking, tracking)', starter: false, growth: false, pro: true, premium: true },
  ]},
  { category: 'Customers & Growth', items: [
    { label: 'Customer CRM', starter: false, growth: false, pro: true, premium: true },
    { label: 'Verified reviews & ratings', starter: false, growth: false, pro: true, premium: true },
    { label: 'Discounts & promo codes', starter: false, growth: false, pro: true, premium: true },
    { label: 'Analytics & click tracking', starter: false, growth: true, pro: true, premium: true },
    { label: 'Top-performing analytics', starter: false, growth: false, pro: true, premium: true },
    { label: 'Marketing tab (tasks & points)', starter: false, growth: true, pro: true, premium: true },
    { label: 'AI descriptions', starter: false, growth: '20/day', pro: '50/day', premium: '50/day' },
  ]},
  { category: 'Operations & Extras', items: [
    { label: 'Stock management & visibility toggle', starter: 'Basics', growth: true, pro: true, premium: true },
    { label: 'Product export (PDF, CSV, Excel)', starter: false, growth: false, pro: true, premium: true },
    { label: 'CAC verification', starter: false, growth: false, pro: true, premium: true },
    { label: 'Payouts & bank settlement', starter: false, growth: false, pro: true, premium: true },
    { label: 'Priority support', starter: false, growth: 'Responsive', pro: 'Same-day', premium: 'Same-day' },
    { label: 'Offer & Name Lab / Policy Generator', starter: true, growth: true, pro: true, premium: true },
  ]},
]

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time from your dashboard Billing tab. Upgrades take effect immediately. Downgrades apply at the end of your current billing cycle.'
  },
  {
    q: 'What payment methods are accepted for subscriptions?',
    a: 'We use Paystack for subscription billing. You can pay with card, bank transfer, or USSD. All payments are processed securely in Nigerian Naira (NGN).'
  },
  {
    q: 'Can I save money with longer billing periods?',
    a: 'Yes! Quarterly billing saves 10%, 6-month billing saves 15%, and annual billing saves 20% compared to paying monthly. Choose the period that works best for your budget.'
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'The Starter plan is free forever — no trial needed. You can explore all Starter features without entering payment details. Paid plans activate immediately upon payment.'
  },
  {
    q: 'What happens if I exceed my plan limits?',
    a: 'On Starter and Growth, you\'ll be prompted to upgrade when you hit listing or image limits. Your existing store and orders remain accessible — you just can\'t add new listings until you upgrade or free up space.'
  },
  {
    q: 'Can I use my own domain name?',
    a: 'Custom domains are available on Pro and Premium plans. You\'ll configure DNS in your domain provider and verify it in your Sellapage dashboard Business Page tab.'
  },
  {
    q: 'How do payouts work on Pro and Premium?',
    a: 'Connect your bank account via Paystack subaccount in the Payouts tab. Earnings from Paystack checkout orders settle to your bank on your chosen schedule (daily, weekly, or monthly). You see full transaction history and KPIs.'
  },
  {
    q: 'What\'s the difference between Growth and Pro analytics?',
    a: 'Growth shows store views and top clicks. Pro adds engagement rate, top-performing products/services, customer spend/order/recency sorting, and advanced filtering.'
  },
  {
    q: 'Do you offer refunds?',
    a: 'We don\'t offer refunds for partial months used, but you can cancel anytime and continue using your plan until the billing period ends. Contact support if you have exceptional circumstances.'
  },
]

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
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

      {/* Period Toggle */}
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
            {PLAN_PERIODS.map(period => {
              const isActive = selectedPeriod === period.id
              const savings = getSavingsPercent('growth', period.id)
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {period.label}
                  {savings > 0 && (
                    <span className="absolute -top-2 -right-3 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingDown size={9} />
                      {savings}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((planItem) => {
            const isStarter = planItem.id === 'starter'
            const price = isStarter ? null : PLAN_PRICES[planItem.id]?.[selectedPeriod]
            const monthlyEquiv = isStarter ? null : getMonthlyEquivalent(planItem.id, selectedPeriod)
            const periodObj = isStarter ? null : PLAN_PERIODS.find(p => p.id === selectedPeriod)

            return (
              <div key={planItem.id} className={`rounded-3xl border p-8 flex flex-col transition-all hover:-translate-y-1 ${planItem.popular ? 'border-brand-500 shadow-2xl shadow-brand-100/60 relative' : 'border-gray-200 shadow-sm hover:shadow-lg'}`}>
                {planItem.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{planItem.name}</h3>
                <p className="text-gray-500 text-sm mb-6">{planItem.description}</p>
                <div className="mb-6">
                  {isStarter ? (
                    <span className="font-display text-4xl font-extrabold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="font-display text-4xl font-extrabold text-gray-900">{formatPrice(price)}</span>
                      <span className="text-gray-500 text-sm font-medium ml-1">/{periodObj?.shortLabel}</span>
                      {selectedPeriod !== 'monthly' && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatPrice(monthlyEquiv)}/mo equivalent
                        </p>
                      )}
                    </>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1" role="list">
                  {planItem.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <Check size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(planItem.contactOnly ? '/contact' : user ? '/dashboard' : '/login')}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    planItem.popular
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200/50'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {planItem.cta}
                  <ArrowRight size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Detailed Comparison</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              See every feature side by side
            </h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto">
              Compare all capabilities across plans. Starter is free forever. Growth, Pro, and Premium unlock the full commerce workspace progressively.
            </p>
          </div>

          <div className="overflow-x-auto">
            {COMPARISON_ROWS.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                  <h3 className="font-display font-bold text-gray-900 text-sm">{section.category}</h3>
                </div>
                <table className="w-full text-sm" role="table">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium text-gray-500 w-72">Feature</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Starter<br /><span className="text-xs font-normal text-gray-400">Free</span></th>
                      <th className="text-center px-4 py-3 font-medium text-brand-600">Growth<br /><span className="text-xs font-normal text-gray-400">{formatPrice(PLAN_PRICES.growth[selectedPeriod])}/{PLAN_PERIODS.find(p => p.id === selectedPeriod)?.shortLabel}</span></th>
                      <th className="text-center px-4 py-3 font-medium text-gray-900">Pro<br /><span className="text-xs font-normal text-gray-400">{formatPrice(PLAN_PRICES.pro[selectedPeriod])}/{PLAN_PERIODS.find(p => p.id === selectedPeriod)?.shortLabel}</span></th>
                      <th className="text-center px-4 py-3 font-medium text-gray-900">Premium<br /><span className="text-xs font-normal text-gray-400">{formatPrice(PLAN_PRICES.premium[selectedPeriod])}/{PLAN_PERIODS.find(p => p.id === selectedPeriod)?.shortLabel}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className={`border-b border-gray-100 last:border-0 ${itemIndex % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-6 py-3 text-gray-700 font-medium">{item.label}</td>
                        <td className="text-center px-4 py-3">
                          {typeof item.starter === 'boolean' ? (
                            item.starter ? <Check size={18} className="mx-auto text-brand-500" /> : <X size={18} className="mx-auto text-gray-300" />
                          ) : (
                            <span className="text-gray-600">{item.starter}</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-3">
                          {typeof item.growth === 'boolean' ? (
                            item.growth ? <Check size={18} className="mx-auto text-brand-500" /> : <X size={18} className="mx-auto text-gray-300" />
                          ) : (
                            <span className="text-gray-600">{item.growth}</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-3">
                          {typeof item.pro === 'boolean' ? (
                            item.pro ? <Check size={18} className="mx-auto text-brand-500" /> : <X size={18} className="mx-auto text-gray-300" />
                          ) : (
                            <span className="text-gray-600">{item.pro}</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-3">
                          {typeof item.premium === 'boolean' ? (
                            item.premium ? <Check size={18} className="mx-auto text-brand-500" /> : <X size={18} className="mx-auto text-gray-300" />
                          ) : (
                            <span className="text-gray-600">{item.premium}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">FAQ</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
              Pricing Questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-gray-100 rounded-2xl bg-white shadow-sm shadow-gray-100/60">
                <summary className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer list-none hover:bg-gray-50 transition-colors">
                  <span className="font-display font-semibold text-gray-900 text-sm">{faq.q}</span>
                  <HelpCircle size={20} className="text-gray-400 flex-shrink-0 group-open:text-brand-500 transition-colors" />
                </summary>
                <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-brand-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to run your business from one dashboard?
          </h2>
          <p className="text-brand-100 text-base mb-8 max-w-xl mx-auto">
            Start free on Starter. Upgrade to Growth, Pro, or Premium when you need more power. No lock-in. Cancel anytime.
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