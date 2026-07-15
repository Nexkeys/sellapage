import { Link, useNavigate } from 'react-router-dom'
import { HelpCircle, ArrowRight, Mail, MessageCircle, ExternalLink } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'


export default function ContactUs() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-tag mb-4">CONTACT US</p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            We're here to help
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            Have a question, complaint, or suggestion about your store, orders, payments, customers, or dashboard?
            Reach us through any of the channels below. We usually respond within 1-2 business days.
          </p>
        </div>
      </section>

      {/* Contact options */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Dashboard support — shown differently based on auth state */}
          {user ? (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 flex items-start gap-5">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <HelpCircle size={22} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-gray-900 text-lg mb-1">
                  Use Your Dashboard Support Tab
                </p>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  The fastest way to reach us. Your store details are auto-filled so we
                  can help you faster. We'll reply to your registered email.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Go to Dashboard Support
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 flex items-start gap-5">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <HelpCircle size={22} className="text-brand-600" />
              </div>
              <div>

                </div>
              <div className="flex-1">
                <p className="font-display font-bold text-gray-900 text-lg mb-1">
                  Already a Sellapage vendor?
                </p>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Log in and use the Support tab inside your dashboard. Your store details
                  are auto-filled and we can help you much faster.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Sign In to Dashboard
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}

          {/* Email */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex items-start gap-5">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail size={22} className="text-gray-600" />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-lg mb-1">Email Us</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-3">
                Prefer email? Send us a message and we'll get back to you within 1–2 business days.
                Tell us your store name and describe the issue clearly.
              </p>
              <a
                href="mailto:sellapage.ng@gmail.com"
                className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:underline"
              >
                sellapage.ng@gmail.com
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Direct support */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex items-start gap-5">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle size={22} className="text-green-600" />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-lg mb-1">Direct Support</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-3">
                For urgent issues, send us your store name and describe the problem clearly
                so we can trace your workspace faster.
              </p>
              <a
                href="https://wa.me/2348120525256"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
              >
                <MessageCircle size={15} />
                Chat with Support
              </a>
            </div>
          </div>

          {/* Built by */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex items-start gap-5">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
              <img
              src="/og-image.png"
              alt="Sellapage logo"
              className="w-11 h-11 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
            />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-lg mb-1">About Sellapage</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-3">
                Sellapage is built and maintained by NexKeys Agency, a Nigerian digital product studio
                building commerce tools for everyday businesses. We're not a faceless company. We're real people
                helping Nigerian businesses operate with more confidence.
              </p>
              <a
                href="https://nexkeysagency.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:underline"
              >
                Visit NexKeys Agency
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ nudge */}
      <section className="py-10 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-500 text-sm mb-3">
            Looking for quick answers? Many common questions about stores, orders, plans, and customers are already answered on our homepage.
          </p>
          <Link
            to="/#faq"
            className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:underline"
          >
            Read the FAQ
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
