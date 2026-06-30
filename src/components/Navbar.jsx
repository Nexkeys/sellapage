// src/components/Navbar.jsx/
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { logoutSeller } from '../firebase/auth'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, store } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutSeller()
    setOpen(false)
    navigate('/')
  }

  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-gray-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2.5 font-bold text-lg text-gray-900 hover:text-green-600 transition-colors"
          >
            <img
              src="/og-image.png"
              alt="Sellapage logo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="tracking-tight font-display">Sellapage</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-500">
            <a href="/#how-it-works" className="hover:text-gray-900 transition-colors hover:font-semibold">How It Works</a>
            <a href="/#features" className="hover:text-gray-900 transition-colors hover:font-semibold">Features</a>
            <a href="/tools/offer-name-lab" className="hover:text-gray-900 transition-colors hover:font-semibold">Offer & Name Lab</a>
            <a href="/tools/policy-generator" className="hover:text-gray-900 transition-colors hover:font-semibold">Policy Generator</a>
            <a href="/pricing" className="hover:text-gray-900 transition-colors hover:font-semibold">Pricing</a>

            {user ? (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-900 font-medium transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=register"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Create Free Account
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-3 pb-5 space-y-0.5 shadow-lg shadow-gray-200/60 animate-in slide-in-from-top-2 duration-200">
          {[
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Features', href: '/#features' },
            { label: 'Offer & Name Lab', href: '/tools/offer-name-lab' },
            { label: 'Policy Generator', href: '/tools/policy-generator' },
            { label: 'Pricing', href: '/pricing' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="block px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-medium transition-all"
            >
              {link.label}
            </a>
          ))}

          <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
            {user ? (
              <>
                {store?.businessName && (
                  <p className="text-xs text-gray-400 px-3 pb-1">
                    Signed in as{' '}
                    <span className="font-semibold text-gray-600">{store.businessName}</span>
                  </p>
                )}
                <Link
                  to="/dashboard"
                  onClick={close}
                  className="flex items-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  <LayoutDashboard size={15} />
                  My Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-3 rounded-xl font-medium text-sm transition-all"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="block w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl font-medium text-sm transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=register"
                  onClick={close}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  Create Free Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
