import { Link } from 'react-router-dom'
import { Shield, Truck, Lock } from 'lucide-react'
import GuaranteeBadge from './GuaranteeBadge'

const TRUST_BADGES = [
  { icon: Shield, title: '100% Authentic',   sub: 'Genuine products' },
  { icon: Truck,  title: 'Fast Delivery',    sub: 'Across Nigeria' },
  { icon: Lock,   title: 'Secure Shopping',  sub: 'Your data is safe' },
]

export default function StoreFooter({ storeName, customFooterText, guarantee }) {
  return (
    <footer className="mt-10 mb-20 md:mb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Custom Theme Footer Text */}
        {customFooterText && (
          <div className="text-center mb-6 px-4">
            <p className="text-sm font-semibold tracking-wide uppercase opacity-80 whitespace-pre-line">{customFooterText}</p>
          </div>
        )}
        
        {/* The vendor's own promise, above the generic badges on purpose: it is
            the only claim on this page that is specific and can be held to. */}
        <GuaranteeBadge guarantee={guarantee} variant="panel" className="mb-4" />

        {/* Trust Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-6 px-6 bg-white rounded-2xl border border-stone-100 shadow-sm">
          {TRUST_BADGES.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-green-600" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-sm">{title}</p>
                <p className="text-stone-400 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Powered by */}
        <div className="text-center mt-6 pb-4">
          <Link to="/" className="text-stone-300 hover:text-green-500 text-xs transition-colors font-medium">
            Powered by Sellapage
          </Link>
        </div>
      </div>
    </footer>
  )
}
