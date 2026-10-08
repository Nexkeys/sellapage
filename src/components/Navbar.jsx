// src/components/Navbar.jsx
//
// The public site header, rebuilt 2026-10-08 alongside the new homepage.
// Product, Business types, Resources and Company open panels (on hover with a
// mouse, on tap or keyboard otherwise); Pricing is a plain link. Every entry
// points at something that exists today: the homepage sections by their ids,
// Explore Stores filtered by a real category, and the existing pages. On a
// phone the same groups become an accordion in a full-height sheet.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, X, LayoutDashboard, LogOut, ChevronDown, ArrowRight, Store, CreditCard, CalendarDays, Truck, ShoppingBag, Users, Receipt,
  UserPlus, Search, BarChart3, Bot, Smartphone, Shirt, Sparkles, Sofa, Scissors, UtensilsCrossed, Gem, Briefcase, BookOpen, Star, Tag,
  FileText, Scale, Info, HeartHandshake as HandshakeIcon, Mail, Flag, Link2, PlayCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { logoutSeller } from '../firebase/auth'

const PRODUCT = [
  {
    title: 'Sell',
    items: [
      { icon: Store, label: 'Online store', sub: 'Products, services and your own link', href: '/#store' },
      { icon: CalendarDays, label: 'Bookings', sub: 'Appointments on a calendar', href: '/#bookings' },
      { icon: CreditCard, label: 'Payments', sub: 'Card, transfer and USSD by Paystack', href: '/#orders' },
      { icon: Truck, label: 'Delivery', sub: 'Sendbox and Topship, booked for you', href: '/#delivery' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { icon: ShoppingBag, label: 'Orders', sub: 'Every order and its status', href: '/#orders' },
      { icon: Users, label: 'Customers', sub: 'Records, spend and loyalty', href: '/#customers' },
      { icon: Receipt, label: 'Receipts and ledger', sub: 'Branded receipts, walk-in sales', href: '/#receipts' },
      { icon: UserPlus, label: 'Team accounts', sub: 'Give staff the access they need', href: '/#operations' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { icon: Search, label: 'Get found on Google', sub: 'Search, Shopping and Maps', href: '/#marketing' },
      { icon: BarChart3, label: 'Analytics', sub: 'Views, clicks and best sellers', href: '/#operations' },
      { icon: Bot, label: 'Sella AI', sub: 'An assistant that knows your store', href: '/#sella' },
      { icon: Smartphone, label: 'Mobile app', sub: 'Android now, iPhone coming soon', href: '/#mobile-app' },
    ],
  },
]

// Real store categories (utils/categories.js), opened in Explore Stores.
const TYPES = [
  { icon: Shirt, label: 'Fashion', cat: 'Fashion & Clothing' },
  { icon: Sparkles, label: 'Beauty', cat: 'Beauty & Skincare' },
  { icon: Smartphone, label: 'Phones and gadgets', cat: 'Gadgets & Phones' },
  { icon: Sofa, label: 'Home and living', cat: 'Home & Living' },
  { icon: Scissors, label: 'Salons and services', cat: 'Services' },
  { icon: UtensilsCrossed, label: 'Food', cat: 'Food & Groceries' },
  { icon: Gem, label: 'Jewellery', cat: 'Jewelry & Accessories' },
]

const RESOURCES = [
  {
    title: 'Learn',
    items: [
      { icon: BookOpen, label: 'Blog', sub: 'Guides for selling and growing', href: '/blog' },
      { icon: Star, label: 'Success stories', sub: 'Vendors in their own words', href: '/success-stories' },
      { icon: Briefcase, label: 'Jobs board', sub: 'Openings at Nigerian businesses', href: '/jobs' },
      { icon: Store, label: 'Explore stores', sub: 'Businesses selling on Sellapage', href: '/live-stores' },
    ],
  },
  {
    title: 'Free tools',
    items: [
      { icon: Tag, label: 'Business name generator', sub: 'Names, a description and a bio', href: '/tools/offer-name-lab' },
      { icon: FileText, label: 'Store policy generator', sub: 'Delivery, refund and payment terms', href: '/tools/policy-generator' },
    ],
  },
  {
    title: 'Compare',
    items: [
      { icon: Scale, label: 'Sellapage vs Shopify', href: '/compare/vs-shopify' },
      { icon: Scale, label: 'Sellapage vs WhatsApp Business', href: '/compare/vs-whatsapp-business' },
      { icon: Scale, label: 'Sellapage vs Linktree', href: '/compare/vs-linktree' },
      { icon: Scale, label: 'Sellapage vs Instagram bio', href: '/compare/vs-instagram-bio' },
    ],
  },
]

const COMPANY = [
  { icon: Info, label: 'About us', sub: 'Who we are and how it works', href: '/about' },
  { icon: HandshakeIcon, label: 'Investors and partners', sub: 'Start a conversation', href: '/partners' },
  { icon: Link2, label: 'Dropshipping', sub: 'The supplier marketplace', href: '/dropshipping' },
  { icon: Mail, label: 'Contact us', sub: 'Email or WhatsApp', href: '/contact' },
  { icon: Flag, label: 'Report a store', sub: 'Tell us about a scam', href: '/report-store' },
]

const MENUS = [
  { id: 'product', label: 'Product' },
  { id: 'types', label: 'Business types' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'resources', label: 'Resources' },
  { id: 'company', label: 'Company' },
]

/** Routes and homepage sections alike ("/#store"); Home scrolls to the hash. */
function NavLink({ href, onClick, className, children }) {
  return <Link to={href} onClick={onClick} className={className}>{children}</Link>
}

function Item({ it, onPick }) {
  return (
    <NavLink href={it.href} onClick={onPick} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-forest-50">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-forest-600 transition-colors group-hover:bg-white"><it.icon size={17} /></span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-gray-900">{it.label}</span>
        {it.sub && <span className="block text-[12px] leading-snug text-gray-500">{it.sub}</span>}
      </span>
    </NavLink>
  )
}

function Panel({ id, onPick }) {
  if (id === 'product') {
    return (
      <div className="grid w-[880px] grid-cols-[1fr_1fr_1fr_230px] gap-2 p-3">
        {PRODUCT.map((g) => (
          <div key={g.title}>
            <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{g.title}</p>
            {g.items.map((it) => <Item key={it.label} it={it} onPick={onPick} />)}
          </div>
        ))}
        <Link to="/#how-it-works" onClick={onPick} className="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-forest p-4 text-white">
          <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-forest-600" />
          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><PlayCircle size={20} /></span>
          <span className="relative font-display text-[17px] font-extrabold leading-tight">See it work, from sign-up to first sale</span>
          <span className="relative mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-forest-100">Watch the walkthrough <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
        </Link>
      </div>
    )
  }
  if (id === 'types') {
    return (
      <div className="w-[520px] p-3">
        <div className="grid grid-cols-2 gap-1">
          {TYPES.map((t) => (
            <Link key={t.label} to={`/live-stores?cat=${encodeURIComponent(t.cat)}`} onClick={onPick} className="flex items-center gap-3 rounded-xl p-2.5 text-[13.5px] font-semibold text-gray-800 transition-colors hover:bg-forest-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-forest-600"><t.icon size={17} /></span>{t.label}
            </Link>
          ))}
        </div>
        <Link to="/live-stores" onClick={onPick} className="mt-2 flex items-center justify-between rounded-xl bg-forest-50 px-4 py-3 text-[13px] font-bold text-forest-700">See every store on Sellapage <ArrowRight size={15} /></Link>
      </div>
    )
  }
  if (id === 'resources') {
    return (
      <div className="grid w-[820px] grid-cols-3 gap-2 p-3">
        {RESOURCES.map((g) => (
          <div key={g.title}>
            <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{g.title}</p>
            {g.items.map((it) => <Item key={it.label} it={it} onPick={onPick} />)}
          </div>
        ))}
      </div>
    )
  }
  if (id === 'company') {
    return <div className="w-[320px] p-2">{COMPANY.map((it) => <Item key={it.label} it={it} onPick={onPick} />)}</div>
  }
  return null
}

function MobileGroup({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-gray-100">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between py-4 text-left font-display text-[17px] font-bold text-gray-900">
        {title}<ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  )
}

export default function Navbar() {
  const [mobile, setMobile] = useState(false)
  const [menu, setMenu] = useState(null)
  const [group, setGroup] = useState('product')
  const [scrolled, setScrolled] = useState(false)
  const { user, store } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef(null)
  const closeTimer = useRef(0)

  // Close everything when the route (or hash) changes.
  const routeKey = location.pathname + location.hash
  const [seenRoute, setSeenRoute] = useState(routeKey)
  if (seenRoute !== routeKey) { setSeenRoute(routeKey); setMenu(null); setMobile(false) }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menu) return undefined
    const onDown = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setMenu(null) }
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menu])

  // The page behind the phone sheet should not scroll.
  useEffect(() => {
    if (!mobile) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobile])

  const handleLogout = async () => {
    await logoutSeller()
    setMobile(false)
    navigate('/')
  }
  const pick = () => { setMenu(null); setMobile(false) }
  const hoverOpen = (id) => { clearTimeout(closeTimer.current); setMenu(id) }
  const hoverClose = () => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setMenu(null), 140) }

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${scrolled || menu ? 'border-gray-100 bg-white/95 backdrop-blur-md' : 'border-transparent bg-white/80 backdrop-blur'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" onClick={pick} className="flex flex-shrink-0 items-center gap-2.5">
          <img src="/og-image.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <span className="font-display text-[20px] font-extrabold tracking-tight text-gray-950">Sellapage</span>
        </Link>

        <nav ref={navRef} aria-label="Main" className="relative hidden items-center gap-1 lg:flex" onMouseLeave={hoverClose}>
          {MENUS.map((m) => (m.href ? (
            <Link key={m.id} to={m.href} onMouseEnter={() => setMenu(null)} className="rounded-xl px-3.5 py-2 text-[14.5px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950">{m.label}</Link>
          ) : (
            <button key={m.id} type="button" onMouseEnter={() => hoverOpen(m.id)} onClick={() => setMenu(menu === m.id ? null : m.id)} aria-expanded={menu === m.id}
              className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-[14.5px] font-semibold transition-colors ${menu === m.id ? 'bg-forest-50 text-forest-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'}`}>
              {m.label}<ChevronDown size={15} className={`transition-transform ${menu === m.id ? 'rotate-180' : ''}`} />
            </button>
          )))}
          {menu && (
            <div onMouseEnter={() => clearTimeout(closeTimer.current)} className={`absolute top-full z-50 mt-2 rounded-3xl border border-gray-100 bg-white shadow-2xl shadow-gray-900/10 animate-in fade-in slide-in-from-top-2 duration-200 ${menu === 'company' ? 'right-0' : menu === 'resources' ? 'right-[-120px]' : 'left-0'}`}>
              <Panel id={menu} onPick={pick} />
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          {user ? (
            <>
              <button type="button" onClick={handleLogout} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-gray-600 transition hover:bg-gray-50"><LogOut size={15} />Sign out</button>
              <Link to="/dashboard" className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-[14px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700"><LayoutDashboard size={16} />Dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-xl border border-forest-200 px-5 py-2.5 text-[14px] font-bold text-forest-700 transition hover:bg-forest-50">Sign in</Link>
              <Link to="/login?mode=register" className="rounded-xl bg-forest px-5 py-2.5 text-[14px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">Start free</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {!user && <Link to="/login?mode=register" className="rounded-xl bg-forest px-3.5 py-2 text-[13px] font-bold text-white">Start free</Link>}
          <button type="button" onClick={() => setMobile((v) => !v)} aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile} className="rounded-xl p-2 text-gray-700 transition hover:bg-gray-50">
            {mobile ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto bg-white px-4 pb-8 animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
          <MobileGroup title="Product" open={group === 'product'} onToggle={() => setGroup(group === 'product' ? null : 'product')}>
            {PRODUCT.map((g) => (
              <div key={g.title} className="mb-2">
                <p className="px-2.5 pb-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{g.title}</p>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2">{g.items.map((it) => <Item key={it.label} it={it} onPick={pick} />)}</div>
              </div>
            ))}
          </MobileGroup>
          <MobileGroup title="Business types" open={group === 'types'} onToggle={() => setGroup(group === 'types' ? null : 'types')}>
            <div className="grid grid-cols-2 gap-1">
              {TYPES.map((t) => <Link key={t.label} to={`/live-stores?cat=${encodeURIComponent(t.cat)}`} onClick={pick} className="flex items-center gap-2.5 rounded-xl p-2.5 text-[13.5px] font-semibold text-gray-800 hover:bg-forest-50"><t.icon size={16} className="text-forest-600" />{t.label}</Link>)}
            </div>
          </MobileGroup>
          <Link to="/pricing" onClick={pick} className="flex items-center justify-between border-b border-gray-100 py-4 font-display text-[17px] font-bold text-gray-900">Pricing<ArrowRight size={17} className="text-gray-400" /></Link>
          <MobileGroup title="Resources" open={group === 'resources'} onToggle={() => setGroup(group === 'resources' ? null : 'resources')}>
            {RESOURCES.map((g) => (
              <div key={g.title} className="mb-2">
                <p className="px-2.5 pb-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{g.title}</p>
                {g.items.map((it) => <Item key={it.label} it={it} onPick={pick} />)}
              </div>
            ))}
          </MobileGroup>
          <MobileGroup title="Company" open={group === 'company'} onToggle={() => setGroup(group === 'company' ? null : 'company')}>
            {COMPANY.map((it) => <Item key={it.label} it={it} onPick={pick} />)}
          </MobileGroup>

          <div className="mt-6 space-y-2.5">
            {user ? (
              <>
                {store?.businessName && <p className="px-1 text-[12.5px] text-gray-500">Signed in as <span className="font-semibold text-gray-800">{store.businessName}</span></p>}
                <Link to="/dashboard" onClick={pick} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3.5 text-[15px] font-bold text-white"><LayoutDashboard size={17} />My dashboard</Link>
                <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3.5 text-[15px] font-semibold text-gray-700"><LogOut size={16} />Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login?mode=register" onClick={pick} className="block w-full rounded-2xl bg-forest px-4 py-3.5 text-center text-[15px] font-bold text-white">Start free</Link>
                <Link to="/login" onClick={pick} className="block w-full rounded-2xl border border-forest-200 px-4 py-3.5 text-center text-[15px] font-bold text-forest-700">Sign in</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
