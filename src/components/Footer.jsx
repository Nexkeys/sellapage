import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-14">

        {/* Email capture banner */}
        <div className="bg-gray-900 rounded-2xl p-6 md:p-8 mb-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-brand-400 text-sm font-semibold mb-1">Stay ahead</p>
            <p className="font-display font-bold text-xl text-white">
              Get tips for selling more on WhatsApp
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-gray-800 text-white placeholder-gray-500 px-4 py-3 rounded-xl text-sm flex-1 md:w-60 focus:outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
            />
            <button className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <Store size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-white text-lg">Sellapage</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Turn your WhatsApp into a professional store. Built for Nigerian sellers who are ready to grow.
            </p>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Quick Links</p>
            <ul className="space-y-2.5">
              {[
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</a>
                </li>
              ))}
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Sign In</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Compare</p>
            <ul className="space-y-2.5">
              {['vs. Linktree', 'vs. Shopify', 'vs. WhatsApp Business', 'vs. Instagram Bio'].map(t => (
                <li key={t} className="text-gray-500 text-sm">{t}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display font-semibold text-white mb-4">Legal</p>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Contact Us'].map(t => (
                <li key={t}>
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{t}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Sellapage. All rights reserved.</p>
          <p className="text-gray-500 text-sm">Built by <a href="https://nexkeysagency.netlify.app" className="text-gray-400 hover:text-white text-sm transition-colors">NexKeys Agency </a>Made For Nigerian sellers 🇳🇬</p>
        </div>
      </div>
    </footer>
  )
}