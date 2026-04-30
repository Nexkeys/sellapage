import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MessageCircle, Package,
  ChevronLeft, ChevronRight, Search, X, ZoomIn,
  ShoppingBag, ArrowRight,
} from 'lucide-react'
import { getStoreBySlug, getProducts } from '../firebase/products'
import { buildOrderURL, buildEnquiryURL } from '../utils/whatsapp'
import LeadForm from '../components/LeadForm'
import NotFound from './NotFound'


// ─── Initials helper ──────────────────────────────────────────────────────────
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}


// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, whatsappNumber, storeUrl, isHighlighted }) {
  const [activeImg, setActiveImg] = useState(0)
  const [popupIndex, setPopupIndex] = useState(null)
  const images = product.imageUrls?.length ? product.imageUrls : []
  const hasMultiple = images.length > 1

  const handleOrder = () => {
    const url = buildOrderURL(whatsappNumber, product.name, product.price, product.id, storeUrl)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div
        id={`product-${product.id}`}
        className={`
          bg-white rounded-2xl border overflow-hidden
          hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group
          ${isHighlighted
            ? 'border-brand-400 ring-2 ring-brand-300 ring-offset-2 shadow-md'
            : 'border-stone-100 shadow-sm'}
        `}
      >
        <div className="relative h-44 sm:h-48 bg-stone-100 overflow-hidden">
          {images.length > 0 ? (
            <>
              <img
                src={images[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 cursor-zoom-in"
                loading="lazy"
                onClick={() => setPopupIndex(activeImg)}
              />
              <div className="absolute top-2 right-2 w-7 h-7 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <ZoomIn size={13} className="text-white" />
              </div>
              {hasMultiple && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + images.length) % images.length) }}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                    aria-label="Previous image"
                  ><ChevronLeft size={14} /></button>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % images.length) }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                    aria-label="Next image"
                  ><ChevronRight size={14} /></button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={e => { e.stopPropagation(); setActiveImg(i) }}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === activeImg ? 'bg-white scale-125' : 'bg-white/50'
                        }`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Package size={32} className="text-stone-300" />
              <p className="text-stone-300 text-xs">No image</p>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <h3 className="font-display font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-stone-400 text-xs mb-3 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 mt-auto pt-1">
            <span className="text-brand-600 font-display font-extrabold text-xl leading-none">
              ₦{Number(product.price).toLocaleString()}
            </span>
            <button
              onClick={handleOrder}
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fba5a] active:scale-95 text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap"
            >
              <MessageCircle size={13} />
              Order
            </button>
          </div>
        </div>
      </div>

      {popupIndex !== null && (
        <div
          className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4"
          onClick={() => setPopupIndex(null)}
        >
          <button
            onClick={() => setPopupIndex(null)}
            className="absolute top-4 right-4 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close"
          ><X size={20} /></button>

          {hasMultiple && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {popupIndex + 1} / {images.length}
            </div>
          )}
          {hasMultiple && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setPopupIndex(i => (i - 1 + images.length) % images.length) }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Previous"
              ><ChevronLeft size={22} /></button>
              <button
                onClick={e => { e.stopPropagation(); setPopupIndex(i => (i + 1) % images.length) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Next"
              ><ChevronRight size={22} /></button>
            </>
          )}

          <img
            src={images[popupIndex]}
            alt={product.name}
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-3 px-4">
            <p className="text-white/80 text-sm font-semibold drop-shadow text-center">
              {product.name}
            </p>
            <button
              onClick={e => { e.stopPropagation(); handleOrder() }}
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all"
            >
              <MessageCircle size={15} />
              Order on WhatsApp — ₦{Number(product.price).toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </>
  )
}


// ─── Store Page ───────────────────────────────────────────────────────────────
export default function StorePage() {
  const { storeName } = useParams()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightedProduct, setHighlightedProduct] = useState(null)
  const searchRef = useRef(null)
  const allProdsRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const storeData = await getStoreBySlug(storeName)
        if (!storeData) { setNotFound(true); return }
        setStore(storeData)
        const prods = await getProducts(storeData.id)
        setProducts(prods)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [storeName])

  useEffect(() => {
    if (products.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const productId = params.get('product')
    if (!productId) return
    setHighlightedProduct(productId)
    setTimeout(() => {
      const el = document.getElementById(`product-${productId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 250)
    setTimeout(() => setHighlightedProduct(null), 4500)
  }, [products])

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  const filteredProducts = search.trim()
    ? products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : products

  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : ''

  const scrollToAll = () => {
    allProdsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5F1]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm">Loading store...</p>
        </div>
      </div>
    )
  }

  if (notFound) return <NotFound />

  return (
    <div className="min-h-screen bg-[#F8F5F1]">

      {/* ── Sticky Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-brand-500">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-display font-extrabold text-xs select-none">
                  {getInitials(store.businessName)}
                </span>
              )}
            </div>
            <span className="font-display font-bold text-gray-900 text-sm truncate">
              {store.businessName}
            </span>
          </div>

          <div className="hidden md:flex items-center flex-shrink-0">
            <div className={`flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2 transition-all duration-200 ${
              search ? 'ring-2 ring-brand-400 bg-white' : ''
            }`}>
              <Search size={15} className="text-stone-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent text-sm text-gray-700 placeholder-stone-400 outline-none w-40 focus:w-52 transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600 transition-colors" aria-label="Clear">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(s => !s)}
              className="md:hidden p-2 text-stone-500 hover:text-brand-600 hover:bg-stone-100 rounded-xl transition-all"
              aria-label="Search"
            ><Search size={18} /></button>
            <a
              href={buildEnquiryURL(store.whatsappNumber, store.businessName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fba5a] text-white px-3 py-2 sm:px-4 rounded-xl font-bold text-xs transition-all shadow-sm whitespace-nowrap"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Chat with us</span>
              <span className="sm:hidden">Chat</span>
            </a>
          </div>
        </div>

        {searchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-stone-100 pt-2">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label="Clear">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">

            {/* Left: store info */}
            <div className="flex-1 text-center md:text-left">

              {/* Mobile-only logo */}
              <div className="flex justify-center md:hidden mb-5">
                <div
                  className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl"
                  style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)' }}
                >
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-display font-extrabold text-2xl select-none">
                      {getInitials(store.businessName)}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight text-white tracking-tight mb-3 drop-shadow-sm">
                {store.businessName}
              </h1>

              {/* ✅ Only renders if the vendor actually set a description */}
              {store.description && (
                <p className="text-white/75 text-sm md:text-base max-w-sm mx-auto md:mx-0 leading-relaxed mb-6">
                  {store.description}
                </p>
              )}

              <div className={`flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 ${store.description ? '' : 'mt-6'}`}>
                <a
                  href={buildEnquiryURL(store.whatsappNumber, store.businessName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg"
                >
                  <MessageCircle size={15} />
                  Chat on WhatsApp
                </a>
                {products.length > 0 && (
                  <button
                    onClick={scrollToAll}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all border border-white/20"
                  >
                    <ShoppingBag size={15} />
                    Browse {products.length} item{products.length !== 1 ? 's' : ''}
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop-only big logo showcase */}
            <div className="hidden md:flex flex-shrink-0 items-center justify-center w-[280px] lg:w-[340px] xl:w-[380px] relative">
              <div
                className="absolute w-[260px] h-[260px] lg:w-[310px] lg:h-[310px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
              <div
                className="absolute w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />
              <div
                className="relative z-10 w-[140px] h-[140px] lg:w-[168px] lg:h-[168px] rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '2px solid rgba(255,255,255,0.35)',
                }}
              >
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-display font-extrabold text-5xl select-none drop-shadow-lg">
                    {getInitials(store.businessName)}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Products Section ── */}
      <div ref={allProdsRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-stone-300" />
            </div>
            <p className="text-stone-600 font-semibold text-base">No products listed yet.</p>
            <p className="text-stone-400 text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-lg sm:text-xl">
                  {search ? 'Search Results' : 'Our Products'}
                </h2>
                <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
                  {search
                    ? `${filteredProducts.length} of ${products.length} item${products.length !== 1 ? 's' : ''}`
                    : `${products.length} item${products.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>

            {/* Desktop search */}
            <div className="hidden md:block relative mb-6 max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search all products..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label="Clear">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile search */}
            <div className="relative mb-5 md:hidden">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label="Clear">
                  <X size={15} />
                </button>
              )}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    whatsappNumber={store.whatsappNumber}
                    storeUrl={storeUrl}
                    isHighlighted={highlightedProduct === product.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-14 bg-white rounded-2xl border border-stone-100 shadow-sm">
                <Search size={28} className="text-stone-200 mx-auto mb-3" />
                <p className="text-stone-500 text-sm font-semibold">
                  No products match &ldquo;<span className="font-bold text-gray-700">{search}</span>&rdquo;
                </p>
                <button onClick={() => setSearch('')} className="text-brand-500 text-sm font-bold mt-2 hover:underline">
                  Clear search
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-12 sm:mt-14">
          <LeadForm
            storeId={store.id}
            storeName={store.businessName}
            whatsappNumber={store.whatsappNumber}
          />
        </div>

        <div className="text-center mt-8 pb-6">
          <Link to="/" className="text-stone-300 hover:text-stone-400 text-xs transition-colors">
            Powered by Sellapage
          </Link>
        </div>
      </div>
    </div>
  )
}