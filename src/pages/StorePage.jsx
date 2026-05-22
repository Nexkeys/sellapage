// src/pages/StorePage.jsx
import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MessageCircle, Package, Search, X,
  ShoppingBag, ArrowRight, Grid, Tag,
} from 'lucide-react'
import { getStoreBySlug, getProducts } from '../firebase/products'
import { db } from '../firebase/config'
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore'
import { buildEnquiryURL } from '../utils/whatsapp'
import LeadForm from '../components/LeadForm'
import ProductCard from '../components/ProductCard'
import StoreNavbar from '../components/StoreNavbar'
import StoreFooter from '../components/StoreFooter'
import CartDrawer from '../components/CartDrawer'
import NotFound from './NotFound'
import { resolveStoreThemeTokens } from '../utils/resolveStoreTheme'



const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}



// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({ products, onSelectCategory, activeCategory, activeThemeObj }) {
  const categories = ['All', ...Array.from(new Set(
    products.map(p => p.category).filter(Boolean)
  ))]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2 className="font-bold text-gray-900 text-lg mb-4">Categories</h2>
      {categories.length <= 1 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Grid size={24} className="text-gray-300" />
          </div>
          <p className="text-stone-500 font-semibold text-sm">No categories yet</p>
          <p className="text-stone-400 text-xs mt-1">Products will be organised by category here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-3 p-4 transition-all text-left ${
                activeCategory === cat
                  ? `${activeThemeObj?.internalTabShellStyle?.cardClasses || 'bg-white rounded-2xl border border-stone-100 shadow-sm'} ring-2 ring-green-400`
                  : `${activeThemeObj?.internalTabShellStyle?.cardClasses || 'bg-white rounded-2xl border border-stone-100 shadow-sm'} hover:opacity-80`
              }`}
            >
              <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${
                activeThemeObj?.internalTabShellStyle?.cardClasses ? 'rounded-full bg-black/10' : 'rounded-xl bg-stone-100'
              }`}>
                <Tag size={16} className={activeCategory === cat ? 'text-green-600' : 'text-stone-400'} />
              </div>
              <div>
                <p className="font-semibold text-sm">{cat}</p>
                <p className="text-xs text-stone-400">
                  {cat === 'All'
                    ? `${products.length} items`
                    : `${products.filter(p => p.category === cat).length} items`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}



// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ store, activeThemeObj }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2 className="font-bold text-lg mb-4" style={{ fontFamily: activeThemeObj?.typography?.headerFontFamily }}>Orders</h2>
      <div className={`p-10 text-center ${activeThemeObj?.internalTabShellStyle?.cardClasses || 'bg-white rounded-2xl border border-stone-100 shadow-sm'}`}>
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={28} className="text-green-400" />
        </div>
        <h3 className="font-bold text-gray-800 text-base mb-2">Order tracking coming soon</h3>
        <p className="text-stone-400 text-sm max-w-xs mx-auto mb-5">
          For now, all orders are managed directly through WhatsApp. Tap below to start an order.
        </p>
        <a
          href={buildEnquiryURL(store?.whatsappNumber, store?.businessName)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
        >
          <MessageCircle size={15} />
          Order via WhatsApp
        </a>
      </div>
    </div>
  )
}



// ─── Store Page ───────────────────────────────────────────────────────────────
export default function StorePage() {
  const { storeName }             = useParams()
  const [store, setStore]         = useState(null)
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [search, setSearch]       = useState('')
  const [activeTab, setActiveTab] = useState('home')
  const [activeCategory, setActiveCategory] = useState('All')
  const [highlightedProduct, setHighlightedProduct] = useState(null)

  // ── Cart state ──
  const [cart, setCart]         = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const allProdsRef    = useRef(null)
  const viewCountedRef = useRef(false)



  // ── Data fetching ──
  useEffect(() => {
    const load = async () => {
      try {
        const storeData = await getStoreBySlug(storeName)
        if (!storeData) { setNotFound(true); return }
        setStore(storeData)
        const prods = await getProducts(storeData.id)
        setProducts(prods)

        if (!viewCountedRef.current) {
          viewCountedRef.current = true
          try {
            await setDoc(
              doc(db, 'stores', storeData.id, 'analytics', 'storeSummary'),
              { totalViews: increment(1), updatedAt: new Date() },
              { merge: true }
            )
          } catch {
            // silently ignore
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [storeName])



  // ── Theme extraction (shared with dashboard live preview) ──
  const {
    activeThemeObj,
    previewThemeObj,
    themeBg,
    themeText,
    themePrimary,
    themeCard,
    themeAccent,
    headerFont,
    bodyFont,
    fontUrl,
    heroBannerUrl,
    footerText,
  } = resolveStoreThemeTokens(store, {}, { bannerWidth: 1200 })

  // ── Dynamic Font Injection ──
  useEffect(() => {
    if (!store || !fontUrl) return
    const link = document.createElement('link')
    link.href = fontUrl
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [store?.storeTheme])

  // ── Highlight product from URL param ──
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



  // ── Click tracking callback ──
  const handleProductClick = (productId) => {
    if (!store?.id) return
    setDoc(
      doc(db, 'stores', store.id, 'analytics', 'storeSummary'),
      { totalClicks: increment(1), updatedAt: new Date() },
      { merge: true }
    ).catch(() => {})
    updateDoc(
      doc(db, 'stores', store.id, 'products', productId),
      { clicks: increment(1) }
    ).catch(() => {})
  }



  // ── Cart handlers ──
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ]
    })
  }

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }



  // ── Filtered products ──
  const filteredProducts = (
    search.trim()
      ? products.filter(p =>
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
        )
      : activeCategory !== 'All'
        ? products.filter(p => p.category === activeCategory)
        : products
  ).filter(p => p.isActive !== false)


  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aOut = typeof a.stock === 'number' && a.stock === 0
    const bOut = typeof b.stock === 'number' && b.stock === 0
    if (aOut && !bOut) return 1
    if (!aOut && bOut) return -1
    return 0
  })


  const storeUrl    = store ? `${window.location.origin}/${store.storeName}` : ''
  const storeLayout = store?.storeLayout || 'grid'

  // ── Cart feature gate ──
  const isCartEnabled =
    store?.hasGrowthFeatures === true ||
    store?.plan === 'growth' ||
    store?.plan === 'pro'

  const scrollToAll = () => {
    allProdsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSelectCategory = cat => {
    setActiveCategory(cat)
    setActiveTab('home')
    setTimeout(() => allProdsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }



  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm font-medium">Loading store...</p>
        </div>
      </div>
    )
  }

  if (notFound) return <NotFound />


  return (
    <div 
      className={`w-full min-h-screen overflow-x-hidden ${activeThemeObj.structuralStyle.containerClasses}`}
      style={{ backgroundColor: themeBg, color: themeText, fontFamily: bodyFont }}
    >

      {/* ── Navbar ── */}
      <StoreNavbar
        store={store}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={isCartEnabled ? cartCount : 0}
        onCartOpen={isCartEnabled ? () => setCartOpen(true) : null}
        activeThemeObj={previewThemeObj}
      />

      {/* ── Tab: Categories ── */}
      {activeTab === 'categories' && (
        <CategoriesTab
          products={products}
          onSelectCategory={handleSelectCategory}
          activeCategory={activeCategory}
          activeThemeObj={activeThemeObj}
        />
      )}

      {/* ── Tab: Orders ── */}
      {activeTab === 'orders' && <OrdersTab store={store} activeThemeObj={activeThemeObj} />}

      {/* ── Tab: Home ── */}
      {activeTab === 'home' && (
        <>
          {/* ── Hero ── */}
          <div
            className="relative overflow-hidden shadow-inner shadow-black/10"
            style={{ 
              backgroundColor: themePrimary,
              backgroundImage: heroBannerUrl ? `url(${heroBannerUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className={`absolute inset-0 ${heroBannerUrl ? 'bg-black/50' : 'bg-black/10'}`} />
              {!heroBannerUrl && (
                <>
                  <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-white/10" />
                  <div className="absolute -bottom-16 -right-10 w-80 h-80 rounded-full bg-black/10" />
                </>
              )}
            </div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
              <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14">

                {/* Left: Store info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex justify-center md:hidden mb-5">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl bg-white/20 backdrop-blur-sm border-2 border-white/35">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-extrabold text-2xl select-none">
                          {getInitials(store.businessName)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h1 
                    className="font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight text-white tracking-tight mb-4 drop-shadow-sm max-w-2xl mx-auto md:mx-0"
                    style={{ fontFamily: headerFont }}
                  >
                    {store.businessName}
                  </h1>

                  {store.description && (
                    <p className="text-white/80 text-sm md:text-base max-w-md mx-auto md:mx-0 leading-relaxed mb-6">
                      {store.description}
                    </p>
                  )}

                  <div className={`flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 ${store.description ? '' : 'mt-6'}`}>
                    <a
                      href={buildEnquiryURL(store.whatsappNumber, store.businessName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 px-6 py-3 transition-all shadow-xl shadow-black/10 ${activeThemeObj.structuralStyle.buttonClasses}`}
                      style={{ backgroundColor: themeAccent !== activeThemeObj.defaultColors.accent ? themeAccent : undefined }}
                    >
                      <MessageCircle size={15} />
                      Chat with us on WhatsApp
                    </a>
                    {products.length > 0 && (
                      <button
                        onClick={scrollToAll}
                        className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all border border-white/25 backdrop-blur-sm"
                      >
                        <ShoppingBag size={15} />
                        Browse {products.length} item{products.length !== 1 ? 's' : ''}
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop logo showcase */}
                <div className="hidden md:flex flex-shrink-0 items-center justify-center w-[280px] lg:w-[340px] relative">
                  <div className="absolute w-[260px] h-[260px] lg:w-[310px] lg:h-[310px] rounded-full bg-white/10 border border-white/15" />
                  <div className="absolute w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] rounded-full bg-white/15" />
                  <div className="relative z-10 w-[140px] h-[140px] lg:w-[168px] lg:h-[168px] rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl shadow-black/20 bg-white/25 backdrop-blur-md border-2 border-white/40">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-extrabold text-5xl select-none drop-shadow-lg">
                        {getInitials(store.businessName)}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Products Section ── */}
          <div ref={allProdsRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package size={28} className="text-stone-300" />
                </div>
                <p className="text-stone-600 font-semibold text-base">No products listed yet.</p>
                <p className="text-stone-400 text-sm mt-1">Check back soon!</p>
              </div>
            ) : (
              <>
                {/* Section header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-bold text-lg sm:text-xl" style={{ fontFamily: headerFont, color: themeText }}>
                      {search ? 'Search Results' : activeCategory !== 'All' ? activeCategory : 'Our Collection'}
                    </h2>
                    <p className="text-xs sm:text-sm mt-0.5 opacity-60">
                      {search
                        ? `${filteredProducts.length} of ${products.length} item${products.length !== 1 ? 's' : ''}`
                        : `${filteredProducts.length} item${filteredProducts.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {activeCategory !== 'All' && (
                    <button
                      onClick={() => setActiveCategory('All')}
                      className="text-green-600 text-sm font-semibold hover:underline w-fit"
                    >
                      View all
                    </button>
                  )}
                </div>

                {/* Search bar */}
                <div className="relative mb-6 max-w-sm">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all shadow-sm shadow-stone-100/70"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Product grid */}
                {filteredProducts.length > 0 ? (
                  <div
                    className={
                      storeLayout === 'list'
                        ? 'grid grid-cols-1 gap-3 sm:gap-4'
                        : storeLayout === 'compact'
                        ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3'
                        : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5'
                    }
                  >
                    {sortedProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        whatsappNumber={store.whatsappNumber}
                        storeUrl={storeUrl}
                        isHighlighted={highlightedProduct === product.id}
                        onOrder={handleProductClick}
                        listView={storeLayout === 'list'}
                        onAddToCart={isCartEnabled ? handleAddToCart : null}
                        themeCardStyle={{
                          backgroundColor: themeCard,
                          color: themeText,
                          fontFamily: bodyFont
                        }}
                        buttonStyle={activeThemeObj.structuralStyle.buttonClasses}
                        structuralClasses={`${activeThemeObj.structuralStyle.cardBorderRadius} ${activeThemeObj.structuralStyle.cardBorder}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-14 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/80">
                    <Search size={28} className="text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-500 text-sm font-semibold">
                      No products match &ldquo;<span className="font-bold text-gray-700">{search}</span>&rdquo;
                    </p>
                    <button onClick={() => setSearch('')} className="text-green-500 text-sm font-bold mt-2 hover:underline">
                      Clear search
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Lead Form */}
            <div className="mt-12 sm:mt-14">
              <LeadForm
                storeId={store.id}
                storeName={store.businessName}
                whatsappNumber={store.whatsappNumber}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Footer ── */}
      {activeTab === 'home' && (
        <StoreFooter storeName={store.businessName} customFooterText={footerText} />
      )}

      {/* Bottom tab bar spacer on mobile */}
      <div className="h-16 md:hidden" />

      {/* ── Cart Drawer ── */}
      {cartOpen && isCartEnabled && (
        <CartDrawer
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClose={() => setCartOpen(false)}
          whatsappNumber={store.whatsappNumber}
          storeName={store.businessName}
          activeThemeObj={activeThemeObj}
        />
      )}
    </div>
  )
}
