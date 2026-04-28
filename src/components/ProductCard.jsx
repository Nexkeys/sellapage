import { ShoppingCart, MessageCircle } from 'lucide-react'
import { buildOrderURL } from '../utils/whatsapp'


export default function ProductCard({ product, whatsappNumber }) {
  const handleOrder = () => {
    const url = buildOrderURL(whatsappNumber, product.name, product.price)
    window.open(url, '_blank', 'noopener,noreferrer')
  }


  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Image */}
      <div className="relative h-44 bg-gray-50 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ShoppingCart size={32} className="text-gray-200" />
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