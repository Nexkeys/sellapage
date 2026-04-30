import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'


const FEATURES = [
  { label: 'Shareable public store link',          wa: false, sellapage: true  },
  { label: 'Works outside WhatsApp (web browser)', wa: false, sellapage: true  },
  { label: 'Product search for customers',         wa: false, sellapage: true  },
  { label: 'Customer lead capture form',           wa: false, sellapage: true  },
  { label: 'Pre-filled order messages',            wa: false, sellapage: true  },
  { label: 'Share in Instagram bio',               wa: false, sellapage: true  },
  { label: 'Business messaging & quick replies',   wa: true,  sellapage: false },
  { label: 'Basic product catalogue',              wa: true,  sellapage: true  },
  { label: 'Free to use',                          wa: true,  sellapage: true  },
]


export default function VsWhatsAppBusiness() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-emerald-50 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-tag mb-4">SELLAPAGE VS WHATSAPP BUSINESS</p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            WhatsApp Business is for chatting.<br />Sellapage is for selling.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            WhatsApp Business is great for managing messages. But its catalogue is limited
            and only visible inside the app. Sellapage gives you a real web store you can
            share anywhere — to anyone.
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
              <p className="font-bold text-gray-500 text-sm">WA Business</p>
            </div>
            <div className="bg-brand-500 rounded-xl py-3 text-center">
              <p className="font-bold text-white text-sm">Sellapage</p>
            </div>
          </div>

          <div className="space-y-2">
            {FEATURES.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-center bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-gray-700 text-sm font-medium leading-snug">{row.label}</p>
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
        </div>
      </section>

      {/* The key limitation */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-gray-900 text-2xl text-center mb-8">
            The Big Problem with WA Business Catalogue
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="font-bold text-gray-400 text-sm mb-1">WhatsApp Business Catalogue</p>
              <div className="w-8 h-1 bg-gray-200 rounded mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                Your catalogue only works inside WhatsApp. You can't share a link to it publicly.
                New customers who don't have your number already can't browse your products.
                And customers on Instagram or other platforms can't access it at all.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-6">
              <p className="font-bold text-brand-600 text-sm mb-1">Sellapage Store</p>
              <div className="w-8 h-1 bg-brand-200 rounded mb-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                Your Sellapage link works in a browser, on Instagram, in WhatsApp status,
                on Twitter — anywhere. Any customer, even strangers, can open it and browse
                your full catalogue without downloading anything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Best combo */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-gray-900 text-2xl mb-4">
            Actually, Use Both Together
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xl mx-auto">
            WhatsApp Business handles your conversations and replies. Sellapage is where
            customers browse and place orders. Share your Sellapage link in your WhatsApp
            status and on your WA Business profile. They work perfectly together.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-brand-500 to-emerald-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-extrabold text-white text-3xl mb-3">
            Give your business a real store page
          </h2>
          <p className="text-brand-100 mb-8 text-base">
            Free to create. Works anywhere. Customers don't need WhatsApp to browse.
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-2xl font-bold text-base hover:bg-brand-50 transition-all shadow-xl hover:-translate-y-0.5"
          >
            {user ? 'Go to My Dashboard' : 'Create Free Store'}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}