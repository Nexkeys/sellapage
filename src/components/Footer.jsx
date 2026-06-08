import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="bg-gray-900 rounded-[28px] p-6 md:p-8 mb-14 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
          <div>
            <p className="text-orange-300 text-sm font-semibold mb-1">Stay ahead</p>
            <p className="font-display font-bold text-xl text-white">
              Get practical growth tips for your Sellapage workspace
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-gray-800 text-white placeholder-gray-500 px-4 py-3 rounded-2xl text-sm flex-1 md:w-60 focus:outline-none focus:ring-2 focus:ring-orange-400 border border-gray-700"
            />
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img
                src="/og-image.png"
                alt="Sellapage logo"
                className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
              />
              <span className="font-display font-bold text-white text-lg tracking-tight">Sellapage</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              A live commerce workspace for Nigerian businesses to manage offers, orders, customers, payments, and growth.
            </p>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Quick Links</p>
            <ul className="space-y-2.5">
              {[
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Features', href: '/#features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Offer & Name Lab', href: '/tools/offer-name-lab' },
                { label: 'Policy Generator', href: '/tools/policy-generator' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Compare</p>
            <ul className="space-y-2.5">
              {[
                { label: 'vs. Linktree', to: '/compare/vs-linktree' },
                { label: 'vs. Shopify', to: '/compare/vs-shopify' },
                { label: 'vs. WhatsApp Business', to: '/compare/vs-whatsapp-business' },
                { label: 'vs. Instagram Bio', to: '/compare/vs-instagram-bio' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Company</p>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', to: '/about' },
                { label: 'Privacy Policy', to: '/privacy-policy' },
                { label: 'Terms of Service', to: '/terms' },
                { label: 'Contact Us', to: '/contact' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Sellapage. All rights reserved.</p>
          <p className="text-gray-500 text-sm">
            Product Of{' '}
            <a
              href="https://nexkeysagency.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              NexKeys Agency
            </a>{' '}
            - Made for Nigerians
          </p>
        </div>
      </div>
    </footer>
  )
}
