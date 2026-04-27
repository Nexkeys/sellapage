import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageCircle, Store, Package } from 'lucide-react'
import { getStoreBySlug, getProducts } from '../firebase/products'
import { buildEnquiryURL } from '../utils/whatsapp'
import ProductCard from '../components/ProductCard'
import LeadForm from '../components/LeadForm'
import NotFound from './NotFound'

export default function StorePage() {
  const { storeName } = useParams()
  const [store, setStore]     = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading]  = useState(true)
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
      {/* Store Header */}
      <div className="bg-gradient-to-br from-brand-500 to-emerald-600">
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          {/* Logo */}
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
              <span className="text-gray-400 text-sm">{products.length} items</span>
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

        {/* Lead capture */}
        <div className="mt-10">
          <LeadForm
            storeId={store.id}
            storeName={store.businessName}
            whatsappNumber={store.whatsappNumber}
          />
        </div>

        {/* Powered by */}
        <div className="text-center mt-8 pb-6">
          <a href="/" className="text-gray-300 hover:text-gray-400 text-xs transition-colors">
            Powered by Sellapage
          </a>
        </div>
      </div>
    </div>
  )
}