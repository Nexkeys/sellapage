// src/pages/NotFound.jsx
//
// The 404 page, also shown when a store link does not exist. Rebuilt
// 2026-10-08: most people land here from a mistyped or old store link, so it
// says that plainly and offers the useful ways out (Explore Stores to find the
// store, Home, Pricing, Contact) instead of a single button. A lost parcel
// drifts above the 404 as the one moving thing on the page.
import { Link } from 'react-router-dom'
import { Home, Store, Search, CreditCard, MessageCircle, ArrowRight, Package } from 'lucide-react'

const WAYS = [
  { to: '/live-stores', icon: Search, title: 'Find a store', sub: 'Search every business on Sellapage' },
  { to: '/', icon: Home, title: 'Go home', sub: 'See what Sellapage does' },
  { to: '/pricing', icon: CreditCard, title: 'Plans and pricing', sub: 'Start free, upgrade any time' },
  { to: '/contact', icon: MessageCircle, title: 'Talk to us', sub: 'Real people, by WhatsApp or email' },
]

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,#d5f1e1_0%,rgba(236,249,242,0.5)_45%,#fff_100%)]" />
      <header className="relative mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5"><img src="/og-image.png" alt="" className="h-9 w-9 rounded-xl" /><span className="font-display text-[20px] font-extrabold tracking-tight text-gray-950">Sellapage</span></Link>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <div className="relative mx-auto w-fit">
          <p className="select-none font-display text-[7rem] font-extrabold leading-none tracking-tighter text-forest-100 sm:text-[10rem]" aria-hidden="true">404</p>
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-forest text-white shadow-2xl shadow-forest/30 animate-float motion-reduce:animate-none sm:h-20 sm:w-20"><Package size={32} /></span>
        </div>
        <h1 className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.6rem]">This page or store could not be found.</h1>
        <p className="mx-auto mt-3 max-w-lg text-[15.5px] leading-relaxed text-gray-600">The link may be mistyped, or the store may have changed its name. If you were looking for a business, try finding it on Explore Stores.</p>

        <div className="mt-9 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {WAYS.map((w, i) => (
            <Link key={w.to} to={w.to} className={`group flex items-center gap-3.5 rounded-2xl p-4 transition ${i === 0 ? 'bg-forest text-white shadow-xl shadow-forest/20 hover:bg-forest-700' : 'bg-white ring-1 ring-gray-100 hover:ring-forest-200'}`}>
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${i === 0 ? 'bg-white/10' : 'bg-forest-50 text-forest-600'}`}><w.icon size={20} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{w.title}</span><span className={`block text-[12.5px] ${i === 0 ? 'text-white/70' : 'text-gray-500'}`}>{w.sub}</span></span>
              <ArrowRight size={17} className={`flex-shrink-0 transition group-hover:translate-x-1 ${i === 0 ? 'text-white/70' : 'text-gray-300'}`} />
            </Link>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-[13px] text-gray-500"><Store size={15} className="text-forest-600" />Is this your store? <Link to="/login" className="font-bold text-forest-700 hover:underline">Sign in</Link> to check your store link.</p>
      </main>
    </div>
  )
}
