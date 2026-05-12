// src/components/StoreNavbar.jsx
import { useState, useRef } from 'react'
import { MessageCircle, Search, X, Home, Grid, ShoppingBag, ShoppingCart } from 'lucide-react'
import { buildEnquiryURL } from '../utils/whatsapp'

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function StoreNavbar({
  store,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  cartCount = 0,
  onCartOpen = null,
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  return (
    <>
      {/* ── Top Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-green-500">
              {store?.logoUrl ? (
                <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xs select-none">
                  {getInitials(store?.businessName)}
                </span>
              )}
            </div>
            <span className="font-bold text-gray-900 text-sm truncate">{store?.businessName}</span>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center flex-shrink-0">
            <div className={`flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2 transition-all duration-200 ${search ? 'ring-2 ring-green-400 bg-white' : ''}`}>
              <Search size={15} className="text-stone-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent text-sm text-gray-700 placeholder-stone-400 outline-none w-40 focus:w-52 transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile search toggle */}
            <button
              onClick={openSearch}
              className="md:hidden p-2 text-stone-500 hover:text-green-600 hover:bg-stone-100 rounded-xl transition-all"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Desktop cart button — only for Growth/Pro */}
            {onCartOpen !== null && (
              <button
                onClick={onCartOpen}
                className="hidden md:flex relative items-center justify-center p-2 text-stone-500 hover:text-green-600 hover:bg-stone-100 rounded-xl transition-all"
                aria-label="Open cart"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Chat button */}
            <a
              href={buildEnquiryURL(store?.whatsappNumber, store?.businessName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fba5a] active:scale-95 text-white px-3 py-2 sm:px-4 rounded-xl font-bold text-xs transition-all shadow-sm whitespace-nowrap"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Chat with us</span>
              <span className="sm:hidden">Chat</span>
            </a>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-stone-100 pt-2 bg-white">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                onBlur={() => { if (!search) setSearchOpen(false) }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setSearchOpen(false) }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-stone-200 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'home',       label: 'Home',      icon: Home },
            { id: 'categories', label: 'Categories', icon: Grid },
            { id: 'orders',     label: 'Orders',     icon: ShoppingBag },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-all ${
                activeTab === id ? 'text-green-600' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
              {activeTab === id && <span className="w-1 h-1 rounded-full bg-green-500 mt-0.5" />}
            </button>
          ))}

          {/* Cart tab — only for Growth/Pro */}
          {onCartOpen !== null && (
            <button
              onClick={onCartOpen}
              className="relative flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-all text-stone-400 hover:text-stone-600"
              aria-label="Open cart"
            >
              <span className="relative">
                <ShoppingCart size={20} strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">Cart</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}