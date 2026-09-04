// src/components/Navbar.jsx/
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu, X, LayoutDashboard, LogOut, Store, Briefcase, BookOpen, Star,
  ChevronDown, Tag, FileText,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { logoutSeller } from '../firebase/auth'

// Same routes as before, just grouped - no path here changed.
const TOOLS_LINKS = [
  { label: 'Offer & Name Lab', href: '/tools/offer-name-lab', icon: Tag },
  { label: 'Policy Generator', href: '/tools/policy-generator', icon: FileText },
]
const COMMUNITY_LINKS = [
  { label: 'Explore Stores', href: '/live-stores', icon: Store, isLink: true },
  { label: 'Jobs', href: '/jobs', icon: Briefcase, isLink: true },
  { label: 'Blog', href: '/blog', icon: BookOpen, isLink: true },
  { label: 'Success Stories', href: '/success-stories', icon: Star, isLink: true },
]

function NavDropdown({ label, items, openId, id, setOpenId }) {
  const isOpen = openId === id
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : id)}
        className={`flex items-center gap-1 transition-colors hover:font-semibold hover:text-gray-900 ${isOpen ? 'font-semibold text-gray-900' : ''}`}
      >
        {label}
        <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-200/70 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map((item) =>
            item.isLink ? (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpenId(null)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-600"
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpenId(null)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-600"
              >
                <item.icon size={14} />
                {item.label}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const { user, store } = useAuth()
  const navigate = useNavigate()
  const navRef = useRef(null)

  const handleLogout = async () => {
    await logoutSeller()
    setOpen(false)
    navigate('/')
  }

  const close = () => setOpen(false)

  // Close an open dropdown on outside click, so it doesn't linger.
  useEffect(() => {
    if (!openDropdown) return
    const handleClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

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
          <nav ref={navRef} className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="/#how-it-works" className="hover:text-gray-900 transition-colors hover:font-semibold">How It Works</a>
            <a href="/#features" className="hover:text-gray-900 transition-colors hover:font-semibold">Features</a>
            <a href="/pricing" className="hover:text-gray-900 transition-colors hover:font-semibold">Pricing</a>

            <NavDropdown label="Tools" items={TOOLS_LINKS} id="tools" openId={openDropdown} setOpenId={setOpenDropdown} />

            <Link to="/live-stores" className="flex items-center gap-1.5 hover:text-green-600 transition-colors hover:font-semibold">
              <Store size={14} />
              Explore Stores
            </Link>

            <NavDropdown label="Community" items={COMMUNITY_LINKS.filter((l) => l.label !== 'Explore Stores')} id="community" openId={openDropdown} setOpenId={setOpenDropdown} />

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

      {/* Mobile Menu - grouped into sections instead of one long flat list */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-3 pb-5 shadow-lg shadow-gray-200/60 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-56px)] overflow-y-auto">
          {[
            {
              section: null,
              items: [
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Features', href: '/#features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Explore Stores', href: '/live-stores', isLink: true, icon: Store },
              ],
            },
            {
              section: 'Tools',
              items: TOOLS_LINKS,
            },
            {
              section: 'Community',
              items: [
                { label: 'Jobs', href: '/jobs', isLink: true, icon: Briefcase },
                { label: 'Blog', href: '/blog', isLink: true, icon: BookOpen },
                { label: 'Success Stories', href: '/success-stories', isLink: true, icon: Star },
              ],
            },
          ].map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1 border-t border-gray-100 pt-2' : ''}>
              {group.section && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                  {group.section}
                </p>
              )}
              {group.items.map((link) =>
                link.isLink ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl text-sm font-medium transition-all"
                  >
                    <link.icon size={14} />
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-medium transition-all"
                  >
                    {link.icon && <link.icon size={14} />}
                    {link.label}
                  </a>
                ),
              )}
            </div>
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
