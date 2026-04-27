import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Store, LayoutDashboard, LogOut } from 'lucide-react'
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" onClick={close} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-md shadow-brand-200 group-hover:bg-brand-600 transition-colors">
            <Store size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-gray-900 text-xl">Sellapage</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="/#how-it-works" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
            How It Works
          </a>
          <a href="/#features" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
            Features
          </a>
          <a href="/#pricing" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
            Pricing
          </a>

          {user ? (
            /* Logged-in state */
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-gray-700 hover:text-brand-600 text-sm font-semibold transition-colors"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          ) : (
            /* Logged-out state */
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Create Free Store
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-5 space-y-1">
          {[
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Features',     href: '/#features' },
            { label: 'Pricing',      href: '/#pricing' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={close}
              className="block px-3 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              {link.label}
            </a>
          ))}

          <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
            {user ? (
              <>
                {store?.businessName && (
                  <p className="px-3 py-1 text-xs text-gray-400 font-medium">
                    Signed in as {store.businessName}
                  </p>
                )}
                <Link
                  to="/dashboard"
                  onClick={close}
                  className="flex items-center gap-2.5 px-3 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <LayoutDashboard size={17} className="text-brand-500" />
                  My Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-3 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  <LogOut size={17} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="block px-3 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  onClick={close}
                  className="block bg-brand-500 text-white px-3 py-3 rounded-xl font-semibold text-center"
                >
                  Create Free Store
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}