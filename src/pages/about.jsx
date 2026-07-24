// src/pages/about.jsx
import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function About() {
  return (
    <div className="min-h-screen bg-white font-body">
      <SEO
        title="About"
        description="Learn about Sellapage, the all-in-one commerce platform built for Nigerian merchants, service providers, and freelancers."
        url="/about"
        keywords="sellapage about, nigerian ecommerce platform, about sellapage, online business nigeria"
      />
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 bg-white text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Our Story
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            The Commerce Platform Nigerian Businesses Trust
          </h1>
          <p className="text-gray-500 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Sellapage is a live commerce platform built for the way Nigerian businesses actually sell: one store link for products and services, structured ordering, Paystack checkout, Sendbox/TopShip delivery, customer CRM, verified reviews, discounts, analytics, and a dashboard that keeps everything organised. Free to start.
          </p>
        </div>
      </section>

      {/* ── WHAT WE DO ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What We Built</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
              A commerce platform for every Nigerian business
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Value 1 */}
            <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100 shadow-sm flex flex-col justify-start">
              <h3 className="font-display font-bold text-brand-700 text-lg mb-3">Store in Minutes</h3>
              <p className="text-brand-700/80 text-sm leading-relaxed">
                Any Nigerian business owner can have a professional, shareable store page live in under five minutes. No coding, no technical knowledge, no prior experience.
              </p>
            </div>
            {/* Value 2 */}
            <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100 shadow-sm flex flex-col justify-start">
              <h3 className="font-display font-bold text-brand-700 text-lg mb-3">Sell Products or Services</h3>
              <p className="text-brand-700/80 text-sm leading-relaxed">
                Sellapage supports physical products, digital items, and service bookings. Fashion sellers, food vendors, makeup artists, tutors, consultants, and agencies can all run from one workspace.
              </p>
            </div>
            {/* Value 3 */}
            <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100 shadow-sm flex flex-col justify-start">
              <h3 className="font-display font-bold text-brand-700 text-lg mb-3">Built to Grow With You</h3>
              <p className="text-brand-700/80 text-sm leading-relaxed">
                Starter is permanently free. Growth and Pro unlock analytics, carts, AI descriptions, premium themes, customer CRM, reviews, checkout, delivery zones, and payout tools as you scale.
              </p>
            </div>
          </div>

          {/* Platform Capabilities */}
          <div className="mb-12">
            <h3 className="font-display font-bold text-gray-900 text-xl text-center mb-8">Live Platform Capabilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                'Public store page for products with zoom lightbox and stock badges',
                'Public services page for bookings with duration and location types',
                '20 premium store themes with full colour, font, and layout customization',
                'Category filters and search for easy browsing',
                'WhatsApp cart for Growth users; in-app Paystack checkout for Pro/Premium',
                'Lead capture form on every store page',
                'Sendbox Delivery delivery rates at checkout; booking and tracking from dashboard',
                'PDF receipt download after checkout',
                'Star ratings on products and services; verified buyer reviews (Pro+)',
                'Custom store footer with business text',
                'Dashboard: Products, Services, Categories, Orders, Delivery, CRM, Analytics, Discounts, Reviews, Billing, Settings, Support',
                'Push notifications (FCM) for orders, subscriptions, reviews; Email notifications (Resend) for confirmations, delivery, welcome, security, subscription',
                'AI description generation (20/day Growth, 50/day Pro)',
                'Stock management with visibility toggle and out-of-stock sorting',
                'Manual orders tab (Growth+); automatic order creation from payments (Pro+)',
                'Delivery zones setup and pickup address management (Pro+)',
                'Customer CRM with profiles, WhatsApp links, spend/order/recency sorting (Pro+)',
                'Discounts & promo codes with usage limits and expiry (Pro+)',
                'Product export to PDF, CSV, Excel, and downloadable files (Pro+)',
                'Custom domain usage and CAC verification (Pro+)',
              ].map((capability, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <p className="text-gray-700 text-sm leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full flex-shrink-0 mt-2" />
                    {capability}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: '10000+',     label: 'Active Nigerian Stores' },
              { value: '2026', label: 'Launched' },
              { value: '₦0',       label: 'To Get Started' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center"
              >
                <p className="font-display text-3xl font-extrabold text-brand-600 mb-1">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE TEAM ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">The Team</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
              The people behind it
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* The Builders */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8">
              <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center mb-5">
              <img
              src="/nexkeys-logo.png"
              alt="Nexkeys Agency logo"
              className="w-11 h-11 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
            />
              </div>
              <h3 className="font-display font-bold text-gray-900 text-lg mb-3">NexKeys Agency</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                The product and engineering team behind Sellapage, based in Lagos, Nigeria. 
                <br></br>
                We build practical digital tools for African businesses tools that work in the Nigerian context, not imports from markets that do not understand ours.
              </p>
            </div>

            {/* The Mission */}
            <div className="bg-brand-600 rounded-2xl p-8">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-5">
                <span className="text-white font-display font-extrabold text-sm">🎯</span>
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-3">Our Mission</h3>
              <p className="text-brand-100 text-sm leading-relaxed">
                Make professional online selling accessible to every Nigerian business owner or service provider regardless of their technical ability or budget. We started with the simplest possible product and we are building from there, one real seller at a time — products, services, checkout, delivery, customers, analytics, and growth from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRANSPARENCY ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">Transparency</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
              What's under the hood
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {[
              { label: 'Business Registration', status: 'CAC Registered — BN - 9689086' },
              { label: 'Payment Processing',    status: 'Paystack — CBN licensed' },
              { label: 'Data Storage',          status: 'Google Firebase — encrypted at rest' },
              { label: 'Image Hosting',         status: 'Cloudinary — global CDN' },
              { label: 'Hosting',               status: 'Vercel — SOC 2 certified' },
              { label: 'Push Notifications',    status: 'Firebase Cloud Messaging (FCM)' },
              { label: 'Email Delivery',        status: 'Resend' },
              { label: 'Support',               status: 'sellapage.ng@gmail.com' },
              { label: 'Security',              status: 'ISO/IEC 27001 guidance — reviewed by co-founder' },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${
                  i < arr.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="text-gray-700 font-medium text-sm">{item.label}</span>
                <span className="text-gray-500 text-sm text-right">{item.status}</span>
              </div>
            ))}
          </div>

          <p className="text-gray-400 text-xs text-center mt-6 leading-relaxed">
            Sellapage is a live, growing platform. 
            <br></br>
            We are transparent about how the platform works, how your data is handled, and what your subscription includes.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Run Your Entire Business from One Dashboard.
          </h2>
          <p className="text-brand-100 text-base mb-8">
            Takes less than two minutes. Free forever on the Starter plan.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-bold text-sm px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Create Your Free Store <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
