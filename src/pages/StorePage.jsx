import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MessageCircle, Store, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { getStoreBySlug, getProducts } from '../firebase/products'
import { buildOrderURL, buildEnquiryURL } from '../utils/whatsapp'
import LeadForm from '../components/LeadForm'
import NotFound from './NotFound'

// ─── Multi-image Product Card ─────────────────────────────────────────────────

function ProductCard({ product, whatsappNumber }) {
  const [activeImg, setActiveImg] = useState(0)
  const images = product.imageUrls?.length ? product.imageUrls : []
  const hasMultiple = images.length > 1

  const handleOrder = () => {
    const url = buildOrderURL(whatsappNumber, product.name, product.price)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Image area */}
      <div className="relative h-44 bg-gray-50 overflow-hidden">
        {images.length > 0 ? (
          <>
            <img
              src={images[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {/* Prev / next arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + images.length) % images.length) }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % images.length) }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={e => { e.stopPropagation(); setActiveImg(i) }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === activeImg ? 'bg-white scale-125' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package size={32} className="text-gray-200" />
            <p className="text-gray-300 text-xs">No image</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-display font-semibold text-gray-900 text-sm leading-tight mb-0.5 line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-400 text-xs mb-2.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-brand-600 font-display font-bold text-lg">
            ₦{Number(product.price).toLocaleString()}
          </span>
          <button
            onClick={handleOrder}
            className="flex items-center gap-1.5 bg-whatsapp hover:opacity-90 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <MessageCircle size={14} />
            Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Store Page ───────────────────────────────────────────────────────────────

export default function StorePage() {
  const { storeName } = useParams()
  const [store, setStore]       = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading store...</p>
        </div>
      </div>
    )
  }

  if (notFound) return <NotFound />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store header */}
      <div className="bg-gradient-to-br from-brand-500 to-emerald-600">
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
            ) : (
              <Store size={32} className="text-white" />
            )}
          </div>

          <h1 className="font-display font-extrabold text-2xl text-white mb-2">
            {store.businessName}
          </h1>

          {store.description && (
            <p className="text-brand-100 text-sm max-w-xs mx-auto leading-relaxed mb-4">
              {store.description}
            </p>
          )}

          <a
            href={buildEnquiryURL(store.whatsappNumber, store.businessName)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-brand-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg mt-2"
          >
            <MessageCircle size={16} />
            Chat with us on WhatsApp
          </a>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No products listed yet.</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-gray-900 text-lg">Our Products</h2>
              <span className="text-gray-400 text-sm">{products.length} item{products.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  whatsappNumber={store.whatsappNumber}
                />
              ))}
            </div>
          </>
        )}

        {/* Lead form */}
        <div className="mt-10">
          <LeadForm
            storeId={store.id}
            storeName={store.businessName}
            whatsappNumber={store.whatsappNumber}
          />
        </div>

        {/* Powered by */}
        <div className="text-center mt-8 pb-6">
          <Link to="/" className="text-gray-300 hover:text-gray-400 text-xs transition-colors">
            Powered by Sellapage
          </Link>
        </div>
      </div>
    </div>
  )
}