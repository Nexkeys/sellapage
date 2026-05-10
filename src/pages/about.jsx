import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function About() {
  return (
    <div className="min-h-screen bg-white font-body">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 bg-white text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Our Story
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Built for Nigerian sellers,<br />
            by people who get it.
          </h1>
          <p className="text-gray-500 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Sellapage started with a simple observation — millions of Nigerian business owners were doing
            everything through WhatsApp, messy catalogues and PDFs, but had no proper storefront to send
            customers to. We built the simplest fix we could.
          </p>
        </div>
      </section>

      {/* ── WHAT SELLAPAGE IS ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Left — copy */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">What we do</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                A storefront for every Nigerian business
              </h2>
              <div className="space-y-5 text-gray-600 text-base leading-relaxed">
                <p>
                  Sellapage lets any Nigerian business owner create a professional product page in minutes —
                  no coding, no technical setup, and no prior experience required. If you can use WhatsApp,
                  you can build your store.
                </p>
                <p>
                  Customers can browse your products, see prices and photos, and place orders directly from
                  your unique store link. You share the link anywhere — WhatsApp status, Instagram bio,
                  Telegram, or directly in a chat — and customers arrive at a clean, credible storefront.
                </p>
                <p>
                  Sellapage has three plans. The <span className="font-semibold text-gray-800">Starter</span> plan
                  is permanently free. <span className="font-semibold text-gray-800">Growth</span> is
                  ₦5,000/month and unlocks analytics, logo upload, store colour customisation, and up to
                  50 listings. <span className="font-semibold text-gray-800">Pro</span> is ₦12,000/month
                  and adds hot leads access, unlimited listings, a full analytics dashboard, and a Pro store badge.
                </p>
              </div>
            </div>

            {/* Right — stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:max-w-xs">
              {[
                { value: '100+',     label: 'Stores Created' },
                { value: 'April 2026', label: 'Launched' },
                { value: '₦0',       label: 'To Start' },
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
        </div>
      </section>

      {/* ── WHO BUILT THIS ────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 block">The Team</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900">
              The people behind it
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* NexKeys Agency */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8">
              <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center mb-5">
                <span className="text-white font-display font-extrabold text-sm">NK</span>
              </div>
              <h3 className="font-display font-bold text-gray-900 text-lg mb-3">NexKeys Agency</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                The product and engineering team behind Sellapage, based in Nigeria. We focus on building
                practical digital tools for African businesses — things that actually work in the local
                context, not just imports from elsewhere.
              </p>
              <a
                href="https://nexkeysagency.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:underline"
              >
                Visit NexKeys Agency <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* The Mission */}
            <div className="bg-brand-600 rounded-2xl p-8">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-5">
                <span className="text-white font-display font-extrabold text-sm">🎯</span>
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-3">The Mission</h3>
              <p className="text-brand-100 text-sm leading-relaxed">
                Make professional online selling accessible to every Nigerian business owner — regardless
                of their technical ability or budget. We started with the simplest possible product and we
                are building from there, one real seller at a time.
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
              Where we stand today
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {[
              { label: 'Business Registration', status: 'CAC registration in progress' },
              { label: 'Payment Processing',    status: 'Paystack — CBN licensed' },
              { label: 'Data Storage',          status: 'Google Firebase — encrypted at rest' },
              { label: 'Image Hosting',         status: 'Cloudinary — global CDN' },
              { label: 'Hosting',               status: 'Netlify — SOC 2 certified' },
              { label: 'Support',               status: 'nexkeysagency@gmail.com' },
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
            Sellapage is an early-stage product. We are transparent about what is built, what is coming,
            and how your data is handled.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to create your store?
          </h2>
          <p className="text-brand-100 text-base mb-8">
            It takes less than 5 minutes and costs nothing to start.
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