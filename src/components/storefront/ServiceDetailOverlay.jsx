// src/components/storefront/ServiceDetailOverlay.jsx
//
// The detail view for one service, opened by tapping a service card.
//
// Products have had ProductDetailOverlay for a long time; services never had an
// equivalent, so tapping a service card did nothing. This is that missing view.
//
// A SERVICE IS NOT A PRODUCT. There is no quantity, no variations, no cart and
// no add-to-cart: you cannot buy two haircuts into a basket. What matters is
// what is included, how long it takes, where it happens and what it costs, and
// then one action: book it.
//
// BOOKING LOGIC IS NOT REIMPLEMENTED. The button calls the same onBook the
// storefront already passes down, which opens the existing booking modal.
import { useEffect, useState } from 'react'
import { X, Clock, MapPin, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'

const naira = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? `₦${n.toLocaleString('en-NG')}` : null
}

export default function ServiceDetailOverlay({ service, t, onClose, onBook }) {
  const [img, setImg] = useState(0)

  // Escape closes, and the page behind must not scroll while a sheet is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!service) return null

  const images = Array.isArray(service.imageUrls) ? service.imageUrls.filter(Boolean) : []
  const price = naira(service.price)

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={service.name}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto"
        style={{
          background: t.pageBg,
          color: t.textColor,
          fontFamily: t.bodyFont,
          borderTopLeftRadius: t.radius,
          borderTopRightRadius: t.radius,
          borderBottomLeftRadius: t.radius,
          borderBottomRightRadius: t.radius,
        }}
      >
        <div className="relative">
          {images.length ? (
            <div className="relative bg-black/5">
              <img
                src={images[img]}
                alt={service.name}
                className="max-h-[46vh] w-full object-cover"
                loading="lazy"
              />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setImg((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setImg((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === img ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center bg-black/5">
              <CalendarClock size={26} className="opacity-25" />
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-black/45 p-1.5 text-white transition-colors hover:bg-black/65"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <h2 className="text-xl font-extrabold leading-tight" style={{ fontFamily: t.headingFont }}>
            {service.name}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs opacity-70">
            {service.duration ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} /> {service.duration}
              </span>
            ) : null}
            {service.locationType ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} /> {service.locationType}
              </span>
            ) : null}
            {service.category ? <span>{service.category}</span> : null}
          </div>

          {price ? (
            <p className="mt-4 text-2xl font-extrabold" style={{ color: t.accent, fontFamily: t.headingFont }}>
              {price}
            </p>
          ) : null}

          {service.description ? (
            <div className="mt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-45">About this service</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed opacity-80">
                {service.description}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose?.()
              onBook?.(service)
            }}
            style={{ background: t.primary, color: t.onPrimary, borderRadius: t.radius }}
            className="mt-6 w-full py-3.5 text-sm font-bold transition-transform active:scale-[0.99]"
          >
            Book this service
          </button>
        </div>
      </div>
    </div>
  )
}
