//src/components/ProductCard.jsx/
import { useState } from 'react'
import { MessageCircle, Package, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'
import { buildOrderURL } from '../utils/whatsapp'


export default function ProductCard({ product, whatsappNumber, storeUrl, isHighlighted, onOrder, listView = false }) {
  const [activeImg, setActiveImg]   = useState(0)
  const [popupIndex, setPopupIndex] = useState(null)

  const images      = product.imageUrls?.length ? product.imageUrls : []
  const hasMultiple = images.length > 1

  const handleOrder = () => {
    if (onOrder) onOrder(product.id)
    const url = buildOrderURL(whatsappNumber, product.name, product.price, product.id, storeUrl)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* ── Card ── */}
      <div
        id={`product-${product.id}`}
        className={`bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group
          ${listView ? 'rounded-2xl flex flex-row' : 'rounded-2xl flex flex-col'}
          ${isHighlighted
            ? 'border-2 border-green-400 ring-2 ring-green-300 ring-offset-2 shadow-lg'
            : 'border border-stone-100 shadow-sm hover:shadow-md'
          }`}
      >
        {/* Image area */}
        {listView ? (
          // ── List view image ──
          <div className="relative bg-stone-100 overflow-hidden flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-l-2xl rounded-r-none">
            {images.length > 0 ? (
              <img
                src={images[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover cursor-zoom-in"
                loading="lazy"
                onClick={() => setPopupIndex(activeImg)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <Package size={24} className="text-stone-300" />
                <p className="text-stone-300 text-[10px]">No image</p>
              </div>
            )}
          </div>
        ) : (
          // ── Default (grid/compact) view image ──
          <div className="relative bg-stone-100 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 cursor-zoom-in"
                  loading="lazy"
                  onClick={() => setPopupIndex(activeImg)}
                />
                {/* Zoom hint */}
                <div className="absolute top-2 right-2 w-7 h-7 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <ZoomIn size={13} className="text-white" />
                </div>
                {/* Carousel arrows */}
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
                    {/* Dot indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={e => { e.stopPropagation(); setActiveImg(i) }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImg ? 'bg-white scale-125' : 'bg-white/50'}`}
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
        )}

        {/* ── Info ── */}
        {listView ? (
          // ── List view info ──
          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-stone-400 text-xs line-clamp-1 leading-relaxed mt-1">
                  {product.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-green-600 font-extrabold text-base leading-none flex-shrink-0">
                ₦{Number(product.price).toLocaleString()}
              </span>
              <button
                onClick={handleOrder}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
              >
                <MessageCircle size={12} />
                Order
              </button>
            </div>
          </div>
        ) : (
          // ── Default (grid/compact) view info ──
          <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
            {/* Name */}
            <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
              {product.name}
            </h3>

            {/* Description — only on sm+ to avoid crowding on 2-col mobile grid */}
            {product.description && (
              <p className="hidden sm:block text-stone-400 text-xs line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Price */}
            <span className="text-green-600 font-extrabold text-lg leading-none mt-auto">
              ₦{Number(product.price).toLocaleString()}
            </span>

            {/* Order button — full width, always below price */}
            <button
              onClick={handleOrder}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <MessageCircle size={13} />
              Order 
            </button>
          </div>
        )}
      </div>

      {/* ── Lightbox popup — identical for all layout modes ── */}
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
            <p className="text-white/80 text-sm font-semibold drop-shadow text-center">{product.name}</p>
            <button
              onClick={e => { e.stopPropagation(); handleOrder() }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all"
            >
              <MessageCircle size={15} />
              Order — ₦{Number(product.price).toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </>
  )
}