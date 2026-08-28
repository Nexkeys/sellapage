// src/components/ServiceCard.jsx
import { useState } from 'react'
import {
  MessageCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MapPin,
} from 'lucide-react'

export default function ServiceCard({
  service,
  isHighlighted,
  onOrder,
  onBook,
  listView = false,
  themeCardStyle = {},
  buttonStyle = '',
  structuralClasses = 'rounded-2xl border border-stone-100',
  avgRating = 0,
  reviewCount = 0,
}) {
  const [activeImg, setActiveImg] = useState(0)
  const [popupIndex, setPopupIndex] = useState(null)

  const images = service.imageUrls?.length ? service.imageUrls : []
  const hasMultiple = images.length > 1

  const handleBook = () => {
    if (onOrder) onOrder(service.id)
    if (onBook) onBook(service)
  }

  return (
    <>
      <div
        id={`product-${service.id}`}
        className={`relative isolate h-full min-w-0 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group
          ${listView ? 'flex flex-row' : 'flex flex-col'}
          ${structuralClasses}
          ${isHighlighted ? 'ring-2 ring-green-300 ring-offset-2 shadow-xl shadow-green-100/80' : 'hover:shadow-lg hover:shadow-black/10'}`}
        style={themeCardStyle}
      >
        {/* Image Area */}
        {listView ? (
          <div className="relative z-0 bg-stone-100 overflow-hidden flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-l-2xl rounded-r-none">
            {images.length > 0 ? (
              <img
                src={images[activeImg]}
                alt={service.name}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
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
          <div className="relative z-0 aspect-square w-full bg-stone-100 overflow-hidden">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImg]}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 cursor-zoom-in"
                  loading="lazy"
                  onClick={() => setPopupIndex(activeImg)}
                />
                {hasMultiple && (
                  <>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setActiveImg(i => (i - 1 + images.length) % images.length)
                      }}
                      className="absolute left-1.5 top-1/2 z-20 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setActiveImg(i => (i + 1) % images.length)
                      }}
                      className="absolute right-1.5 top-1/2 z-20 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                    >
                      <ChevronRight size={14} />
                    </button>
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

        {/* Info & Badges */}
        {listView ? (
          <div className="relative z-10 flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-stone-400 text-xs line-clamp-1 leading-relaxed mt-1">
                  {service.description}
                </p>
              )}
              {reviewCount > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-amber-400">★</span>
                  <span className="font-bold text-gray-800">{Number(avgRating).toFixed(1)}</span>
                  <span className="text-gray-400">({reviewCount})</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {service.duration && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    <Clock size={8} /> {service.duration}
                  </span>
                )}
                {service.locationType && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                    <MapPin size={8} />{' '}
                    {service.locationType === 'physical'
                      ? 'In Person'
                      : service.locationType === 'virtual'
                        ? 'Online'
                        : 'In Person / Online'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-green-600 font-extrabold text-base leading-none flex-shrink-0">
                ₦{Number(service.price).toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleBook}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold transition-all shadow-sm hover:shadow-md ${buttonStyle || 'bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl'}`}
                >
                  <MessageCircle size={12} />
                  Book
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 p-3 sm:p-4 flex flex-col flex-1 min-h-0 gap-2">
            <h3 className="min-h-[2.25rem] font-bold text-gray-900 text-sm leading-snug line-clamp-2">
              {service.name}
            </h3>
            <p className="min-h-[1rem] text-stone-400 text-[11px] sm:text-xs line-clamp-1 leading-snug">
              {service.description || ''}
            </p>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span className="text-amber-400">★</span>
                <span className="font-bold text-gray-800">{Number(avgRating).toFixed(1)}</span>
                <span className="text-gray-400">({reviewCount})</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {service.duration && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock size={8} /> {service.duration}
                </span>
              )}
              {service.locationType && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                  <MapPin size={8} />{' '}
                  {service.locationType === 'physical'
                    ? 'In Person'
                    : service.locationType === 'virtual'
                      ? 'Online'
                      : 'In Person / Online'}
                </span>
              )}
            </div>

            <span className="text-green-600 font-extrabold text-lg leading-none mt-auto">
              ₦{Number(service.price).toLocaleString()}
            </span>

            <button
              onClick={handleBook}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all shadow-sm hover:shadow-md ${buttonStyle || 'bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl'}`}
            >
              <MessageCircle size={13} />
              Book Now
            </button>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {popupIndex !== null && (
        <div
          className="fixed inset-0 z-[80] bg-black/92 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPopupIndex(null)}
        >
          <button
            onClick={() => setPopupIndex(null)}
            className="absolute top-4 right-4 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={images[popupIndex]}
            alt={service.name}
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-3 px-4">
            <p className="text-white/80 text-sm font-semibold drop-shadow text-center">
              {service.name}
            </p>
            {reviewCount > 0 && (
              <div className="mt-1 flex items-center gap-1 text-xs text-white/90">
                <span className="text-amber-300">★</span>
                <span className="font-bold">{Number(avgRating).toFixed(1)}</span>
                <span className="opacity-80">({reviewCount})</span>
              </div>
            )}
            <button
              onClick={e => {
                e.stopPropagation()
                handleBook()
              }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all"
            >
              <MessageCircle size={15} />
              Book: ₦{Number(service.price).toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
