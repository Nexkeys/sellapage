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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-green-600 transition-colors"
          >
            <img
              src="/og-image.png"
              alt="Sellapage logo"
              className="w-8 h-8 rounded-lg object-cover shadow-sm"
            />
            <span>sellapage</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="/#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="/#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>

            {user ? (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-xl text-sm transition-all"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=register"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  Create Free Store
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
          {[
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Features', href: '/#features' },
            { label: 'Pricing', href: '/#pricing' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="block px-3 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}

          <div className="pt-3 border-t border-gray-100 mt-3 space-y-2">
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
                  className="flex items-center gap-2 w-full bg-green-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
                >
                  <LayoutDashboard size={15} />
                  My Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-medium text-sm"
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
                  className="block w-full text-center border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=register"
                  onClick={close}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
                >
                  Create Free Store
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}