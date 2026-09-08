// src/components/storefront/DesignedStorefront.jsx
//
// Renders a vendor's custom Store Design.
//
// Used in TWO places deliberately: the live storefront and the preview inside
// the Store Design tab. Same component, same data, so what a vendor previews is
// literally what a customer gets. A separate "preview renderer" is how those two
// drift apart and how a vendor ends up publishing something they never saw.
//
// COMMERCE IS NOT REIMPLEMENTED HERE. Product cards call the same onAddToCart
// and onOrder callbacks the existing storefront passes down, so ordering,
// checkout and delivery run through exactly the same code as always. This file
// decides layout and colour, nothing else.
import { useMemo } from 'react'
import { Star, ShoppingCart, MessageCircle, ArrowRight } from 'lucide-react'
import { fontStack } from '../../utils/storeDesign'

const naira = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : ''
}

const SPEEDS = { slow: '38s', normal: '24s', fast: '14s' }

function Announcement({ s }) {
  if (!s.text) return null
  // Duplicated content plus a translate keyframe: a marquee that does not
  // depend on the deprecated <marquee> element and does not reflow on each tick.
  const anim = `sp-marquee-${s.speed || 'normal'}`
  return (
    <div style={{ background: s.bg, color: s.fg }} className="overflow-hidden py-2">
      <style>{`@keyframes ${anim}{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div
        className="flex w-max gap-12 whitespace-nowrap text-[11px] font-black uppercase tracking-widest"
        style={{ animation: `${anim} ${SPEEDS[s.speed] || SPEEDS.normal} linear infinite` }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i}>{s.text}</span>
        ))}
      </div>
    </div>
  )
}

function Hero({ s, store, stats, onCta, headingFont }) {
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h1
            className="text-3xl font-black leading-[1.05] sm:text-4xl lg:text-5xl"
            style={{ fontFamily: headingFont }}
          >
            {s.headline}
          </h1>
          {s.sub && <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-80">{s.sub}</p>}
          {s.ctaLabel && (
            <button
              type="button"
              onClick={onCta}
              style={{ background: s.ctaBg }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
            >
              {s.ctaLabel} <ArrowRight size={15} />
            </button>
          )}
          {s.showStats && (
            <div className="mt-8 flex flex-wrap gap-8">
              {stats.map((st) => (
                <div key={st.label}>
                  <p className="text-2xl font-black" style={{ fontFamily: headingFont }}>{st.value}</p>
                  <p className="text-xs opacity-70">{st.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {store?.heroBannerUrl || store?.coverImage ? (
          <img
            src={store.heroBannerUrl || store.coverImage}
            alt=""
            className="h-56 w-full rounded-2xl object-cover sm:h-72 lg:h-80"
            loading="lazy"
          />
        ) : null}
      </div>
    </section>
  )
}

function BrandStrip({ s, headingFont }) {
  const items = String(s.items || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  if (!items.length) return null
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {items.map((b) => (
          <span key={b} className="text-lg font-black uppercase tracking-wide sm:text-xl" style={{ fontFamily: headingFont }}>
            {b}
          </span>
        ))}
      </div>
    </section>
  )
}

function ProductRow({ s, products, onAddToCart, onOrder, headingFont }) {
  const list = useMemo(() => {
    let out = Array.isArray(products) ? [...products] : []
    if (s.source === 'category' && s.category) {
      out = out.filter((p) => String(p.category || '').toLowerCase() === String(s.category).toLowerCase())
    }
    return out.slice(0, Number(s.limit) || 8)
  }, [products, s.source, s.category, s.limit])

  if (!list.length) return null

  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-center text-2xl font-black uppercase sm:text-3xl"
          style={{ color: s.fg, fontFamily: headingFont }}
        >
          {s.title}
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {list.map((p) => (
            <div key={p.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onOrder?.(p)}
                className="block w-full overflow-hidden rounded-2xl bg-gray-100"
              >
                {p.imageUrl || p.imageUrls?.[0] ? (
                  <img
                    src={p.imageUrl || p.imageUrls[0]}
                    alt={p.name}
                    className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-square w-full" />
                )}
              </button>
              <p className="mt-2 truncate text-sm font-bold" style={{ color: s.fg }}>{p.name}</p>
              <p className="text-sm font-black" style={{ color: s.fg }}>{naira(p.price)}</p>
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(p)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-2 text-[11px] font-bold text-white"
                >
                  <ShoppingCart size={12} /> Add to cart
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoryGrid({ s, categories, onCategory, headingFont }) {
  const list = (categories || []).filter(Boolean).slice(0, 8)
  if (!list.length) return null
  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-black uppercase sm:text-3xl" style={{ color: s.fg, fontFamily: headingFont }}>
          {s.title}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((c) => {
            const label = typeof c === 'string' ? c : c.label || c.name
            return (
              <button
                key={label}
                type="button"
                onClick={() => onCategory?.(label)}
                className="flex h-28 items-center justify-start rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100 px-6 text-left transition-transform hover:scale-[1.01] sm:h-36"
              >
                <span className="text-lg font-black sm:text-xl" style={{ fontFamily: headingFont }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Reviews({ s, reviews, headingFont }) {
  const list = (reviews || []).slice(0, 6)
  if (!list.length) return null
  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-black uppercase sm:text-3xl" style={{ color: s.fg, fontFamily: headingFont }}>
          {s.title}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r, i) => (
            <div key={r.id || i} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={n <= Number(r.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm font-bold" style={{ color: s.fg }}>
                {r.customerName || 'Verified buyer'}
              </p>
              {r.comment && <p className="mt-1 break-words text-xs leading-relaxed opacity-70" style={{ color: s.fg }}>"{r.comment}"</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaBanner({ s, whatsappUrl, headingFont }) {
  return (
    <section className="px-4 py-8">
      <div
        style={{ background: s.bg, color: s.fg }}
        className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-2xl p-8 sm:flex-row sm:items-center"
      >
        <h2 className="max-w-lg text-xl font-black uppercase leading-tight sm:text-2xl" style={{ fontFamily: headingFont }}>
          {s.headline}
        </h2>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-900"
          >
            <MessageCircle size={15} /> {s.ctaLabel}
          </a>
        )}
      </div>
    </section>
  )
}

const PAYMENTS = ['Card', 'Transfer', 'Bank', 'USSD']

function RichFooter({ s, store, categories, headingFont }) {
  const name = store?.businessName || store?.storeName || 'Store'
  return (
    <footer style={{ background: s.bg, color: s.fg }} className="px-4 pb-10 pt-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-lg font-black uppercase" style={{ fontFamily: headingFont }}>{name}</p>
            {s.about && <p className="mt-2 break-words text-xs leading-relaxed opacity-70">{s.about}</p>}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Shop</p>
            <ul className="mt-2 space-y-1.5 text-xs opacity-80">
              {(categories || []).slice(0, 5).map((c) => {
                const label = typeof c === 'string' ? c : c.label || c.name
                return <li key={label} className="truncate">{label}</li>
              })}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Help</p>
            <ul className="mt-2 space-y-1.5 text-xs opacity-80">
              <li>Track order</li>
              <li>My orders</li>
              <li>Contact us</li>
            </ul>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Contact</p>
            <div className="mt-2 space-y-1.5 break-words text-xs opacity-80">
              {store?.pickupAddress?.streetAddress && (
                <p>{[store.pickupAddress.streetAddress, store.pickupAddress.city, store.pickupAddress.state].filter(Boolean).join(', ')}</p>
              )}
              {store?.whatsappNumber && <p>{store.whatsappNumber}</p>}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-current/10 pt-5 sm:flex-row">
          <p className="text-[11px] opacity-60">
            {name} © {new Date().getFullYear()}
          </p>
          {/* No "Powered by Sellapage" here, deliberately: removing it is part of
              what a Premium vendor is paying for. */}
          {s.showPayments && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {PAYMENTS.map((p) => (
                <span key={p} className="rounded-lg border border-current/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider opacity-70">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

const RENDERERS = {
  announcement: Announcement,
  hero: Hero,
  brandStrip: BrandStrip,
  productRow: ProductRow,
  categoryGrid: CategoryGrid,
  reviews: Reviews,
  ctaBanner: CtaBanner,
  richFooter: RichFooter,
}

export default function DesignedStorefront({
  design,
  store,
  products = [],
  categories = [],
  reviews = [],
  stats = [],
  whatsappUrl,
  onAddToCart,
  onOrder,
  onCategory,
  onCta,
}) {
  if (!design?.sections?.length) return null

  const headingFont = fontStack(design.theme?.fontHeading)
  const bodyFont = fontStack(design.theme?.fontBody)

  return (
    <div style={{ background: design.theme?.pageBg || '#ffffff', fontFamily: bodyFont }}>
      {design.sections
        .filter((s) => s.visible !== false)
        .map((section) => {
          const Renderer = RENDERERS[section.type]
          // A section type that no longer exists must not take the page down.
          if (!Renderer) return null
          return (
            <Renderer
              key={section.id}
              s={section.settings}
              store={store}
              products={products}
              categories={categories}
              reviews={reviews}
              stats={stats}
              whatsappUrl={whatsappUrl}
              headingFont={headingFont}
              onAddToCart={onAddToCart}
              onOrder={onOrder}
              onCategory={onCategory}
              onCta={onCta}
            />
          )
        })}
    </div>
  )
}
