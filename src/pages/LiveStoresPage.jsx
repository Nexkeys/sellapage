import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Store,
  ShoppingBag,
  Briefcase,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Package,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { getActiveStores } from '../firebase/products'
import SEO from '../components/SEO'

const PAGE_SIZE = 20

const VENDOR_TYPE_LABEL = {
  products: { label: 'Products', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  services: { label: 'Services', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  both: { label: 'Products & Services', icon: Package, color: 'text-brand-600 bg-brand-50 border-brand-100' },
}

export default function LiveStoresPage() {
  const [allStores, setAllStores] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getActiveStores()
        if (!cancelled) setAllStores(data)
      } catch (err) {
        console.error('[LiveStoresPage] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = search.trim()
    ? allStores.filter(s => {
        const q = search.toLowerCase()
        return (
          (s.businessName || '').toLowerCase().includes(q) ||
          (s.storeName || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
        )
      })
    : allStores

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + PAGE_SIZE)
      setLoadingMore(false)
    }, 400)
  }, [hasMore, loadingMore])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMore])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <SEO
        title="Live Stores"
        description="Browse live stores powered by Sellapage. Discover products and services from Nigerian businesses."
        url="/live-stores"
        keywords="live stores nigeria, sellapage stores, online stores nigeria, browse stores"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-green-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2MkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <Store size={14} className="text-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sellapage Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            Explore Live Stores
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
            Discover amazing businesses powered by Sellapage. Shop products, book services, and support real entrepreneurs.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-16">
        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stores by name, category, or description..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 shadow-lg shadow-gray-200/50 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {search.trim() && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              {filtered.length} {filtered.length === 1 ? 'store' : 'stores'} found
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-brand-500" />
            <p className="text-sm text-gray-400">Loading stores...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Store size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {search.trim() ? 'No stores match your search' : 'No stores available yet'}
            </p>
            {search.trim() && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Store Grid */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map(store => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        {hasMore && !loading && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">Loading more stores...</span>
              </div>
            )}
          </div>
        )}

        {/* All loaded */}
        {!hasMore && !loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-8">
            You've seen all stores
          </p>
        )}
      </div>

      <Footer />
    </div>
  )
}


function StoreCard({ store }) {
  const vendorType = VENDOR_TYPE_LABEL[store.vendorType] || VENDOR_TYPE_LABEL.products
  const TypeIcon = vendorType.icon
  const isCACVerified = store.cacVerified === true

  return (
    <Reveal
      as={Link}
      to={`/${store.storeName}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Card Header */}
      <div className="relative h-28 bg-gradient-to-br from-brand-50 to-green-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.businessName}
              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white border-2 border-brand-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
              <Store size={24} className="text-brand-400" />
            </div>
          )}
        </div>
        {isCACVerified && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-green-200 rounded-full px-2 py-0.5">
            <ShieldCheck size={11} className="text-green-600" />
            <span className="text-[9px] font-bold text-green-700">Verified</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-brand-600 transition-colors">
            {store.businessName || store.storeName}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            sellapage.com.ng/{store.storeName}
          </p>
        </div>

        {store.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
            {store.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${vendorType.color}`}>
            <TypeIcon size={10} />
            {vendorType.label}
          </span>
          <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Reveal>
  )
}
