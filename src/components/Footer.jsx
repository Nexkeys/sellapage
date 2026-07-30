//src/components/Footer.jsx/
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-gray-900 rounded-2xl p-5 sm:p-7 mb-10 sm:mb-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-white/8">
          <div>
            <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Grow your business</p>
            <p className="font-display font-bold text-lg text-white leading-snug">
              Get free tips on selling, marketing, and running your store
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-gray-800 text-white placeholder-gray-600 px-4 py-2.5 rounded-xl text-sm flex-1 sm:w-52 outline-none focus:ring-2 focus:ring-green-500/40 border border-gray-700/60"
            />
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/og-image.png"
                alt="Sellapage logo"
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
              />
              <span className="font-display font-bold text-white text-base tracking-tight">Sellapage</span>
            </Link>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              The all-in-one commerce workspace for Nigerian businesses. Products, services, checkout, delivery, customers, analytics, and growth — one dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              {['CAC Registered', 'Paystack Secured', 'Firebase Encrypted'].map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1 bg-white/5 border border-white/8 rounded-full px-2.5 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="font-display font-semibold text-white text-sm mb-3">Quick Links</p>
            <ul className="space-y-2">
              {[
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Features', href: '/#features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Offer & Name Lab', href: '/tools/offer-name-lab' },
                { label: 'Policy Generator', href: '/tools/policy-generator' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/jobs" className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                  Jobs
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/success-stories" className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white text-sm mb-3">Compare</p>
            <ul className="space-y-2">
              {[
                { label: 'vs. Linktree', to: '/compare/vs-linktree' },
                { label: 'vs. Shopify', to: '/compare/vs-shopify' },
                { label: 'vs. WhatsApp Business', to: '/compare/vs-whatsapp-business' },
                { label: 'vs. Instagram Bio', to: '/compare/vs-instagram-bio' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white text-sm mb-3">Company</p>
            <ul className="space-y-2">
              {[
                { label: 'About Us', to: '/about' },
                { label: 'Privacy Policy', to: '/privacy-policy' },
                { label: 'Terms of Service', to: '/terms' },
                { label: 'Contact Us', to: '/contact' },
                { label: 'Report Store', to: '/report-store' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-gray-500 hover:text-gray-200 text-xs transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800/60 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Sellapage. All rights reserved.</p>
          <p className="text-gray-600 text-xs">
            Product Of{' '}
            <a
              href="https://nexkeysagency.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-200 text-xs transition-colors"
            >
              NexKeys Agency
            </a>{' '}
            — Made for Nigerians
          </p>
        </div>
      </div>
    </footer>
  )
}
