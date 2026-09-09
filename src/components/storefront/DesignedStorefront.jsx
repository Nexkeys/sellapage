// src/components/storefront/DesignedStorefront.jsx
//
// Renders a vendor's custom Store Design.
//
// Used in TWO places deliberately: the live storefront and the preview inside
// the Store Design tab. Same component, same data, so what a vendor previews is
// literally what a customer gets. A separate "preview renderer" is how those
// two drift apart and how a vendor publishes something they never saw.
//
// COMMERCE IS NOT REIMPLEMENTED HERE. Product cards call the same onAddToCart /
// onOrder the storefront already passes down, service cards call the same
// onBook, and the enquiry section mounts the real LeadForm. Ordering, booking,
// checkout and delivery run through exactly the same code as always. This file
// decides layout and colour, nothing else.
//
// EVERY LINK HERE HAS A DESTINATION. Footer links are supplied by the page that
// mounts this component rather than hardcoded, because the product storefront
// and the service storefront do not have the same tabs. A link with nowhere to
// go is worse than no link.
import { useEffect, useMemo, useState } from 'react'
import { Star, ShoppingCart, MessageCircle, ArrowRight, Clock, MapPin, Check, X } from 'lucide-react'
import LeadForm from '../LeadForm'
import VerifiedBadge from '../VerifiedBadge'
import {
  fontStack,
  fontHref,
  radiusValue,
  shadowValue,
  ratioValue,
  widthValue,
  isSectionLiveNow,
  verifiedTone,
} from '../../utils/storeDesign'

const naira = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : ''
}

const SPEEDS = { slow: '38s', normal: '24s', fast: '14s' }

/* Tailwind cannot see runtime-built class names, so column counts map to
   literal classes that exist in the build output. */
const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}
const SM_COLS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }
const LG_COLS = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

const hoverClass = (h) =>
  h === 'lift'
    ? 'transition-transform duration-200 hover:-translate-y-1'
    : h === 'both'
    ? 'transition-transform duration-200 hover:-translate-y-1'
    : 'transition-transform duration-200'

const imgHoverClass = (h) => (h === 'zoom' || h === 'both' ? 'group-hover:scale-[1.04]' : '')

/** Button styling from the three declared styles plus the theme colours. */
function buttonStyle(style, t) {
  if (style === 'outline') {
    return { background: 'transparent', color: t.primary, border: `1.5px solid ${t.primary}`, borderRadius: t.radius }
  }
  if (style === 'soft') {
    return { background: `${t.primary}1a`, color: t.primary, border: '1.5px solid transparent', borderRadius: t.radius }
  }
  return { background: t.primary, color: t.onPrimary, border: '1.5px solid transparent', borderRadius: t.radius }
}

/** Section heading, obeying the global case and alignment settings. */
function Heading({ children, sub, color, t, align }) {
  if (!children) return null
  const a = align || t.headingAlign
  return (
    <div className={a === 'center' ? 'text-center' : 'text-left'}>
      <h2
        className={`text-2xl font-extrabold sm:text-3xl ${t.headingCase === 'uppercase' ? 'uppercase' : ''}`}
        style={{ color, fontFamily: t.headingFont, letterSpacing: t.headingCase === 'uppercase' ? '0.01em' : '0' }}
      >
        {children}
      </h2>
      {sub ? <p className="mx-auto mt-2 max-w-2xl text-sm opacity-70" style={{ color }}>{sub}</p> : null}
    </div>
  )
}

const Wrap = ({ t, children, className = '' }) => (
  <div className={`mx-auto w-full ${className}`} style={{ maxWidth: t.maxWidth }}>
    {children}
  </div>
)

/* ---------------------------------------------------------------- sections */

function Announcement({ s }) {
  if (!s.text) return null
  // Duplicated content plus a translate keyframe: a marquee that does not use
  // the deprecated <marquee> element and does not reflow on every tick.
  const anim = `sp-marquee-${s.speed || 'normal'}`
  return (
    <div style={{ background: s.bg, color: s.fg }} className="overflow-hidden py-2">
      <style>{`@keyframes ${anim}{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){.${anim}-track{animation:none!important}}`}</style>
      <div
        className={`${anim}-track flex w-max gap-12 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-widest`}
        style={{ animation: `${anim} ${SPEEDS[s.speed] || SPEEDS.normal} linear infinite` }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i}>{s.text}</span>
        ))}
      </div>
    </div>
  )
}

function Hero({ s, store, stats, t, badge, onCta }) {
  const banner = store?.heroBannerUrl || store?.coverImage
  const pad = s.height === 'tall' ? 'py-20 sm:py-28' : s.height === 'compact' ? 'py-8 sm:py-10' : 'py-12 sm:py-16'
  const centered = s.layout === 'centered'
  const behind = s.layout === 'imageBehind' && banner

  const inner = (
    <div className={`min-w-0 ${centered || behind ? 'mx-auto max-w-2xl text-center' : ''}`}>
      <h1
        className="text-3xl font-extrabold leading-[1.08] sm:text-4xl lg:text-5xl"
        style={{ fontFamily: t.headingFont }}
      >
        {s.headline}
      </h1>
      {badge?.hero ? (
        <div className={`mt-3 flex ${centered || behind ? 'justify-center' : ''}`}>
          <VerifiedBadge tone={badge.tone} radius={t.radius === '0px' ? '0px' : '999px'} size="md" />
        </div>
      ) : null}
      {s.sub ? (
        <p className={`mt-4 text-sm leading-relaxed opacity-80 ${centered || behind ? 'mx-auto max-w-lg' : 'max-w-lg'}`}>
          {s.sub}
        </p>
      ) : null}
      {s.ctaLabel ? (
        <button
          type="button"
          onClick={onCta}
          style={{ background: s.ctaBg, color: s.ctaFg, borderRadius: t.radius }}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold transition-transform active:scale-[0.98]"
        >
          {s.ctaLabel} <ArrowRight size={15} />
        </button>
      ) : null}
      {s.showStats && stats.length ? (
        <div className={`mt-8 flex flex-wrap gap-8 ${centered || behind ? 'justify-center' : ''}`}>
          {stats.map((st) => (
            <div key={st.label}>
              <p className="text-2xl font-extrabold" style={{ fontFamily: t.headingFont }}>{st.value}</p>
              <p className="text-xs opacity-70">{st.label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )

  if (behind) {
    return (
      <section className={`relative isolate overflow-hidden px-4 ${pad}`} style={{ color: s.fg }}>
        <img src={banner} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: `${s.bg}c0` }} />
        <Wrap t={t}>{inner}</Wrap>
      </section>
    )
  }

  return (
    <section style={{ background: s.bg, color: s.fg }} className={`px-4 ${pad}`}>
      <Wrap t={t}>
        {centered || !banner ? (
          inner
        ) : (
          <div className="grid items-center gap-8 lg:grid-cols-2">
            {inner}
            <img
              src={banner}
              alt=""
              className="h-56 w-full object-cover sm:h-72 lg:h-80"
              style={{ borderRadius: t.radius }}
              loading="lazy"
            />
          </div>
        )}
      </Wrap>
    </section>
  )
}

function BrandStrip({ s, t }) {
  const items = String(s.items || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  if (!items.length) return null
  const size = s.size === 'large' ? 'text-xl sm:text-2xl' : s.size === 'small' ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-6">
      <Wrap t={t} className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {items.map((b) => (
          <span key={b} className={`font-extrabold uppercase tracking-wide ${size}`} style={{ fontFamily: t.headingFont }}>
            {b}
          </span>
        ))}
      </Wrap>
    </section>
  )
}

/** One product card, entirely driven by the theme's productCard settings. */
function ProductCard({ p, cfg, t, onAddToCart, onOrder }) {
  const img = p.imageUrl || p.imageUrls?.[0]
  const btn = buttonStyle(cfg.buttonStyle, t)
  return (
    <div
      className={`group flex min-w-0 flex-col overflow-hidden ${hoverClass(cfg.hover)}`}
      style={{
        background: cfg.cardBg,
        border: cfg.showBorder ? `1px solid ${t.border}` : '1px solid transparent',
        borderRadius: t.radius,
        boxShadow: shadowValue(cfg.shadow),
      }}
    >
      <button
        type="button"
        onClick={() => onOrder?.(p)}
        className="block w-full overflow-hidden bg-black/5"
        style={{ aspectRatio: ratioValue(cfg.imageRatio) }}
        aria-label={p.name}
      >
        {img ? (
          <img
            src={img}
            alt={p.name}
            className={`h-full w-full transition-transform duration-300 ${imgHoverClass(cfg.hover)}`}
            style={{ objectFit: cfg.imageFit }}
            loading="lazy"
          />
        ) : null}
      </button>
      <div className={`flex flex-1 flex-col p-3 ${cfg.align === 'center' ? 'text-center' : ''}`}>
        {cfg.showCategory && p.category ? (
          <p className="truncate text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: t.textColor }}>
            {p.category}
          </p>
        ) : null}
        <p className="truncate text-sm font-bold" style={{ color: t.textColor }}>{p.name}</p>
        {cfg.showPrice ? (
          <p className="mt-0.5 text-sm font-extrabold" style={{ color: t.accent }}>{naira(p.price)}</p>
        ) : null}
        {cfg.showButton && onAddToCart ? (
          <button
            type="button"
            onClick={() => onAddToCart(p)}
            style={btn}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 py-2 text-[11px] font-bold"
          >
            <ShoppingCart size={12} /> {cfg.buttonLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ProductRow({ s, products, productCard, t, onAddToCart, onOrder, onViewAll }) {
  const list = useMemo(() => {
    let out = Array.isArray(products) ? [...products] : []
    if (s.source === 'category' && s.category) {
      out = out.filter((p) => String(p.category || '').toLowerCase() === String(s.category).toLowerCase())
    } else if (s.source === 'discounted') {
      out = out.filter((p) => Number(p.comparePrice || p.oldPrice || 0) > Number(p.price || 0))
    }
    return out.slice(0, Number(s.limit) || 8)
  }, [products, s.source, s.category, s.limit])

  if (!list.length) return null

  const lg = LG_COLS[s.columns] || LG_COLS[4]
  const base = COLS[s.mobileColumns] || COLS[2]

  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg} sub={s.sub}>{s.title}</Heading>
        <div className={`mt-8 grid gap-3 sm:gap-5 ${base} sm:grid-cols-2 ${lg}`}>
          {list.map((p) => (
            <ProductCard key={p.id} p={p} cfg={productCard} t={t} onAddToCart={onAddToCart} onOrder={onOrder} />
          ))}
        </div>
        {s.showViewAll && onViewAll ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onViewAll}
              style={buttonStyle('outline', t)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </Wrap>
    </section>
  )
}

/** One service booking card. A different object to a product, so a different card. */
function ServiceCard({ sv, cfg, t, onBook, onOpen }) {
  const img = sv.imageUrls?.[0]
  const btn = buttonStyle(cfg.buttonStyle, t)
  const horizontal = cfg.layout === 'horizontal'
  const prefix = cfg.pricePrefix === 'none' ? '' : `${cfg.pricePrefix} `

  return (
    <div
      className={`group flex min-w-0 overflow-hidden ${horizontal ? 'flex-row' : 'flex-col'} ${hoverClass(cfg.hover)}`}
      style={{
        background: cfg.cardBg,
        border: cfg.showBorder ? `1px solid ${t.border}` : '1px solid transparent',
        borderRadius: t.radius,
        boxShadow: shadowValue(cfg.shadow),
      }}
    >
      {img ? (
        <button
          type="button"
          onClick={() => onOpen?.(sv)}
          aria-label={sv.name}
          className={`overflow-hidden bg-black/5 ${horizontal ? 'w-28 flex-shrink-0 sm:w-40' : 'w-full'}`}
          style={horizontal ? undefined : { aspectRatio: ratioValue(cfg.imageRatio) }}
        >
          <img
            src={img}
            alt={sv.name}
            className={`h-full w-full object-cover transition-transform duration-300 ${imgHoverClass(cfg.hover)}`}
            loading="lazy"
          />
        </button>
      ) : null}

      <div className={`flex min-w-0 flex-1 flex-col p-4 ${cfg.align === 'center' && !horizontal ? 'text-center' : ''}`}>
        <button
          type="button"
          onClick={() => onOpen?.(sv)}
          className="truncate text-left text-base font-bold"
          style={{ color: t.textColor, fontFamily: t.headingFont }}
        >
          {sv.name}
        </button>

        {cfg.showDescription && sv.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-70" style={{ color: t.textColor }}>
            {sv.description}
          </p>
        ) : null}

        <div
          className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-70 ${
            cfg.align === 'center' && !horizontal ? 'justify-center' : ''
          }`}
          style={{ color: t.textColor }}
        >
          {cfg.showDuration && sv.duration ? (
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {sv.duration}</span>
          ) : null}
          {sv.locationType ? (
            <span className="inline-flex items-center gap-1"><MapPin size={11} /> {sv.locationType}</span>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          {cfg.showPrice && sv.price ? (
            <p className="text-sm font-extrabold" style={{ color: t.accent }}>
              {prefix}{naira(sv.price)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => onBook?.(sv)}
            style={btn}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          >
            {cfg.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceRow({ s, services, serviceCard, t, onBook, onOpenService, onViewAll, onViewAllServices }) {
  const list = useMemo(() => {
    let out = Array.isArray(services) ? [...services] : []
    if (s.source === 'category' && s.category) {
      out = out.filter((x) => String(x.category || '').toLowerCase() === String(s.category).toLowerCase())
    }
    return out.slice(0, Number(s.limit) || 6)
  }, [services, s.source, s.category, s.limit])

  if (!list.length) return null
  const lg = LG_COLS[s.columns] || LG_COLS[3]

  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg} sub={s.sub}>{s.title}</Heading>
        <div className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${lg}`}>
          {list.map((sv) => (
            <ServiceCard key={sv.id} sv={sv} cfg={serviceCard} t={t} onBook={onBook} onOpen={onOpenService} />
          ))}
        </div>
        {s.showViewAll && (onViewAllServices || onViewAll) ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onViewAllServices || onViewAll}
              style={buttonStyle('outline', t)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </Wrap>
    </section>
  )
}

function CategoryGrid({ s, categories, t, onCategory }) {
  const list = (categories || []).filter(Boolean).slice(0, 12)
  if (!list.length) return null
  const lg = LG_COLS[s.columns] || LG_COLS[2]

  if (s.style === 'pill') {
    return (
      <section style={{ background: s.bg }} className="px-4 py-10">
        <Wrap t={t}>
          <Heading t={t} color={s.fg}>{s.title}</Heading>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {list.map((c) => {
              const label = typeof c === 'string' ? c : c.label || c.name
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onCategory?.(label)}
                  style={{ background: s.tileBg, color: s.tileFg, borderRadius: '999px' }}
                  className="px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.03]"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Wrap>
      </section>
    )
  }

  const tall = s.style === 'tile'
  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg}>{s.title}</Heading>
        <div className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${lg}`}>
          {list.map((c) => {
            const label = typeof c === 'string' ? c : c.label || c.name
            return (
              <button
                key={label}
                type="button"
                onClick={() => onCategory?.(label)}
                style={{ background: s.tileBg, color: s.tileFg, borderRadius: t.radius }}
                className={`flex items-center justify-start px-6 text-left transition-transform hover:scale-[1.01] ${
                  tall ? 'h-40 sm:h-52' : 'h-24 sm:h-28'
                }`}
              >
                <span className="text-lg font-extrabold sm:text-xl" style={{ fontFamily: t.headingFont }}>{label}</span>
              </button>
            )
          })}
        </div>
      </Wrap>
    </section>
  )
}

function TextBlock({ s, t }) {
  if (!s.title && !s.body) return null
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-12">
      <Wrap t={t} className={s.align === 'center' ? 'text-center' : ''}>
        <Heading t={t} color={s.fg} align={s.align}>{s.title}</Heading>
        {s.body ? (
          <div className={`mt-4 space-y-3 text-sm leading-relaxed opacity-80 ${s.align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-3xl'}`}>
            {s.body.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : null}
      </Wrap>
    </section>
  )
}

function TrustBadges({ s, t }) {
  const items = [s.item1, s.item2, s.item3, s.item4].filter(Boolean)
  if (!items.length) return null
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-10">
      <Wrap t={t}>
        <Heading t={t} color={s.fg}>{s.title}</Heading>
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${s.title ? 'mt-8' : ''} ${items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {items.map((it) => (
            <div
              key={it}
              className="flex items-center gap-3 p-4"
              style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: `${t.accent}1f`, color: t.accent }}
              >
                <Check size={15} />
              </span>
              <span className="min-w-0 text-sm font-bold">{it}</span>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

function Faq({ s, t }) {
  const pairs = [
    [s.q1, s.a1],
    [s.q2, s.a2],
    [s.q3, s.a3],
  ].filter(([q, a]) => q && a)
  if (!pairs.length) return null
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg}>{s.title}</Heading>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {pairs.map(([q, a], i) => (
            // <details> is open to crawlers and to screen readers without any
            // JavaScript, which a custom accordion would not be.
            <details key={i} className="group p-4" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}>
              <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
                {q}
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed opacity-75">{a}</p>
            </details>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

function Reviews({ s, reviews, t }) {
  const list = (reviews || []).slice(0, 6)
  if (!list.length) return null
  const lg = LG_COLS[s.columns] || LG_COLS[3]
  return (
    <section style={{ background: s.bg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg}>{s.title}</Heading>
        <div className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${lg}`}>
          {list.map((r, i) => (
            <div
              key={r.id || i}
              className="p-5"
              style={{ background: s.cardBg, border: `1px solid ${t.border}`, borderRadius: t.radius }}
            >
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
              {r.comment ? (
                <p className="mt-1 break-words text-xs leading-relaxed opacity-70" style={{ color: s.fg }}>
                  {r.comment}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/**
 * The enquiry section mounts the REAL LeadForm, so a message sent from a
 * designed storefront lands in the vendor's Leads tab exactly like one sent
 * from the standard storefront. No second submission path.
 */
function Enquiry({ s, store, t }) {
  return (
    <section id="sp-enquiry" style={{ background: s.bg, color: s.fg }} className="px-4 py-12">
      <Wrap t={t}>
        <Heading t={t} color={s.fg} sub={s.sub}>{s.title}</Heading>
        <div className="mx-auto mt-8 max-w-xl">
          {/* The real form, themed to the vendor's colours. A white card on a
              dark storefront reads as broken, but the submission path is
              untouched: same component, same saveLead call. */}
          <LeadForm
            storeId={store?.id || store?.uid}
            storeName={store?.businessName || store?.storeName}
            whatsappNumber={store?.whatsappNumber}
            leadType="general"
            theme={{
              card: t.pageBg,
              field: s.bg,
              border: t.border,
              text: s.fg,
              primary: t.primary,
              onPrimary: t.onPrimary,
              radius: t.radius,
            }}
          />
        </div>
      </Wrap>
    </section>
  )
}

function CtaBanner({ s, whatsappUrl, t }) {
  const body = (
    <div
      style={{ background: s.bg, color: s.fg, borderRadius: s.full ? 0 : t.radius }}
      className={`flex flex-col items-start justify-between gap-5 p-8 sm:flex-row sm:items-center ${s.full ? '' : 'mx-auto'}`}
    >
      <h2 className="max-w-lg text-xl font-extrabold uppercase leading-tight sm:text-2xl" style={{ fontFamily: t.headingFont }}>
        {s.headline}
      </h2>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center gap-2 bg-white px-6 py-3 text-sm font-bold text-gray-900"
          style={{ borderRadius: t.radius }}
        >
          <MessageCircle size={15} /> {s.ctaLabel}
        </a>
      ) : null}
    </div>
  )
  if (s.full) return <section>{body}</section>
  return (
    <section className="px-4 py-8">
      <Wrap t={t}>{body}</Wrap>
    </section>
  )
}

/**
 * Live countdown. Ticks once a second and stops itself at zero rather than
 * counting into negative numbers, which is the usual bug in these.
 */
function Countdown({ s, t }) {
  const target = useMemo(() => (s.endsAt ? new Date(`${s.endsAt}T23:59:59`).getTime() : 0), [s.endsAt])
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    if (!target) return
    setLeft(Math.max(0, target - Date.now()))
    const id = setInterval(() => {
      const next = Math.max(0, target - Date.now())
      setLeft(next)
      if (next === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [target])

  if (!s.endsAt) return null

  const done = left <= 0
  const secs = Math.floor(left / 1000)
  const parts = [
    ['Days', Math.floor(secs / 86400)],
    ['Hours', Math.floor((secs % 86400) / 3600)],
    ['Mins', Math.floor((secs % 3600) / 60)],
    ['Secs', secs % 60],
  ]

  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-8">
      <Wrap t={t} className="text-center">
        <p className="text-sm font-extrabold uppercase tracking-widest opacity-80" style={{ fontFamily: t.headingFont }}>
          {done ? s.expiredText : s.title}
        </p>
        {!done && (
          <div className="mt-4 flex justify-center gap-3 sm:gap-5">
            {parts.map(([label, value]) => (
              <div key={label} className="min-w-[62px] px-3 py-2" style={{ border: `1px solid ${s.fg}33`, borderRadius: t.radius }}>
                <p className="text-2xl font-extrabold tabular-nums sm:text-3xl" style={{ fontFamily: t.headingFont }}>
                  {String(value).padStart(2, '0')}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">{label}</p>
              </div>
            ))}
          </div>
        )}
      </Wrap>
    </section>
  )
}

function ImageBanner({ s, t, onCta }) {
  if (!s.imageUrl) return null
  const h = s.height === 'tall' ? 'h-72 sm:h-96' : s.height === 'short' ? 'h-36 sm:h-48' : 'h-52 sm:h-72'
  return (
    <section className="px-4 py-6">
      <Wrap t={t}>
        <div className={`relative isolate overflow-hidden ${h}`} style={{ borderRadius: t.radius }}>
          <img src={s.imageUrl} alt={s.headline || ''} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          {s.headline || s.ctaLabel ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 p-6 text-center" style={{ color: s.fg }}>
              {s.headline ? (
                <p className="max-w-lg text-xl font-extrabold leading-tight sm:text-3xl" style={{ fontFamily: t.headingFont }}>
                  {s.headline}
                </p>
              ) : null}
              {s.ctaLabel ? (
                <button type="button" onClick={onCta} style={buttonStyle('solid', t)} className="px-5 py-2.5 text-xs font-bold">
                  {s.ctaLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Wrap>
    </section>
  )
}

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', url: (h) => `https://instagram.com/${h}` },
  { key: 'tiktok', label: 'TikTok', url: (h) => `https://tiktok.com/@${h}` },
  { key: 'facebook', label: 'Facebook', url: (h) => `https://facebook.com/${h}` },
  { key: 'x', label: 'X', url: (h) => `https://x.com/${h}` },
]

function SocialLinks({ s, t }) {
  const items = SOCIALS.filter((x) => s[x.key])
  if (!items.length) return null
  return (
    <section style={{ background: s.bg, color: s.fg }} className="px-4 py-10">
      <Wrap t={t}>
        <Heading t={t} color={s.fg} sub={s.sub}>{s.title}</Heading>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {items.map((x) => (
            <a
              key={x.key}
              href={x.url(s[x.key])}
              target="_blank"
              rel="noopener noreferrer"
              style={{ border: `1px solid ${t.border}`, borderRadius: t.radius }}
              className="px-5 py-2.5 text-sm font-bold transition-transform hover:scale-[1.03]"
            >
              {x.label} <span className="opacity-60">@{s[x.key]}</span>
            </a>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/**
 * One popup, shown after a delay, remembered per visitor.
 *
 * localStorage can throw outright in a private window or with site data
 * blocked, so every read and write is guarded: a storage failure must never
 * stop a storefront rendering.
 */
function Popup({ cfg, t, storeId, whatsappUrl }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!cfg?.enabled) return
    const key = `sp_popup_${storeId || 'store'}`
    if (cfg.frequency === 'once') {
      try {
        if (localStorage.getItem(key)) return
      } catch {
        // Storage unavailable: fall through and just show it this once.
      }
    }
    const id = setTimeout(() => setOpen(true), (Number(cfg.delay) || 6) * 1000)
    return () => clearTimeout(id)
  }, [cfg?.enabled, cfg?.delay, cfg?.frequency, storeId])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(`sp_popup_${storeId || 'store'}`, '1')
    } catch {
      // Nothing to do: the popup simply shows again next visit.
    }
  }

  if (!cfg?.enabled || !open) return null

  const act = () => {
    if (cfg.ctaAction === 'whatsapp' && whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener')
    if (cfg.ctaAction === 'enquiry') document.getElementById('sp-enquiry')?.scrollIntoView({ behavior: 'smooth' })
    close()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div
        className="relative w-full max-w-sm p-6 text-center"
        style={{ background: cfg.bg, color: cfg.fg, borderRadius: t.radius }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 p-1 opacity-50 hover:opacity-100"
        >
          <X size={16} />
        </button>
        <p className="text-lg font-extrabold leading-tight" style={{ fontFamily: t.headingFont }}>{cfg.title}</p>
        {cfg.body ? <p className="mt-2 text-sm leading-relaxed opacity-75">{cfg.body}</p> : null}
        {cfg.ctaLabel ? (
          <button type="button" onClick={act} style={buttonStyle('solid', t)} className="mt-5 w-full py-3 text-sm font-bold">
            {cfg.ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const PAYMENTS = ['Card', 'Transfer', 'Bank', 'USSD']

/**
 * Footer. Every entry is a real control:
 *   category names  -> filter the store by that category
 *   helpLinks       -> supplied by the mounting page, so it can only list tabs
 *                      that page actually has
 *   phone / address -> tel: and maps links
 */
function RichFooter({ s, store, categories, helpLinks, t, badge, onCategory }) {
  const name = store?.businessName || store?.storeName || 'Store'
  const cats = (categories || []).filter(Boolean).slice(0, 5)
  const addr = store?.pickupAddress
  const addrText = addr
    ? [addr.streetAddress, addr.city, addr.state].filter(Boolean).join(', ')
    : ''
  const phone = String(store?.whatsappNumber || '').replace(/\D/g, '')

  const linkCls = 'block w-full truncate text-left hover:opacity-100 hover:underline'

  return (
    <footer style={{ background: s.bg, color: s.fg }} className="px-4 pb-10 pt-12">
      <Wrap t={t}>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-lg font-extrabold uppercase" style={{ fontFamily: t.headingFont }}>{name}</p>
            {s.about ? <p className="mt-2 whitespace-pre-line break-words text-xs leading-relaxed opacity-70">{s.about}</p> : null}
            {/* Under the business name, where a customer looks to confirm who
                they just bought from. */}
            {badge?.footer ? (
              <div className="mt-3">
                <VerifiedBadge variant="line" size="md" tone={{ fg: s.fg }} />
              </div>
            ) : null}
          </div>

          {cats.length ? (
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-60">{s.shopHeading || 'Shop'}</p>
              <ul className="mt-2 space-y-1.5 text-xs opacity-80">
                {cats.map((c) => {
                  const label = typeof c === 'string' ? c : c.label || c.name
                  return (
                    <li key={label}>
                      <button type="button" onClick={() => onCategory?.(label)} className={linkCls}>
                        {label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {helpLinks?.length ? (
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-60">Help</p>
              <ul className="mt-2 space-y-1.5 text-xs opacity-80">
                {helpLinks.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a
                        href={l.href}
                        target={l.href.startsWith('http') ? '_blank' : undefined}
                        rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className={linkCls}
                      >
                        {l.label}
                      </a>
                    ) : (
                      <button type="button" onClick={l.onClick} className={linkCls}>
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-60">Contact</p>
            <div className="mt-2 space-y-1.5 break-words text-xs opacity-80">
              {addrText ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline"
                >
                  {addrText}
                </a>
              ) : null}
              {phone ? (
                <a href={`tel:+${phone}`} className="block hover:underline">
                  +{phone}
                </a>
              ) : null}
              {store?.email ? (
                <a href={`mailto:${store.email}`} className="block break-all hover:underline">
                  {store.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row" style={{ borderColor: `${s.fg}1a` }}>
          <p className="text-[11px] opacity-60">
            {name} &copy; {new Date().getFullYear()}
          </p>
          {/* No "Powered by Sellapage" here, deliberately: removing it is part
              of what a Premium vendor is paying for. */}
          {s.showPayments ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {PAYMENTS.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider opacity-70"
                  style={{ border: `1px solid ${s.fg}33`, borderRadius: t.radius }}
                >
                  {p}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Wrap>
    </footer>
  )
}

const RENDERERS = {
  announcement: Announcement,
  hero: Hero,
  brandStrip: BrandStrip,
  productRow: ProductRow,
  serviceRow: ServiceRow,
  categoryGrid: CategoryGrid,
  textBlock: TextBlock,
  trustBadges: TrustBadges,
  faq: Faq,
  reviews: Reviews,
  enquiry: Enquiry,
  countdown: Countdown,
  imageBanner: ImageBanner,
  socialLinks: SocialLinks,
  ctaBanner: CtaBanner,
  richFooter: RichFooter,
}

/**
 * Loads the design's Google fonts, and only those. Returns nothing; the link
 * stays in <head> for the life of the page because removing it would reflow
 * every glyph on the page the moment a vendor changes a colour.
 */
function useDesignFonts(theme) {
  const href = fontHref(theme)
  useEffect(() => {
    if (!href || document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [href])
}

/**
 * The full catalogue: everything, or one category.
 *
 * A designed home page is a curated layout, not a listing, so "View all" and
 * every category control need somewhere real to land. This is that place, built
 * from the same cards as the rest of the design so it never looks like a
 * different site.
 *
 * Products and services both appear here, under their own headings, because a
 * vendor selling both has customers who do not care which bucket a thing is in.
 */
function CatalogueView({
  browse, products, services, productCard, serviceCard, t, footer, store, categories,
  helpLinks, kind, badge, query, onAddToCart, onOrder, onBook, onOpenService, onCategory, onBrowseAll,
  onClear, onClearSearch,
}) {
  const [sort, setSort] = useState('newest')

  const all = browse === 'all'
  const inScope = (x) =>
    all || String(x.category || '').toLowerCase() === String(browse).toLowerCase()

  // The navbar search box is visible on a designed store, so it has to work on
  // one. Same fields the standard theme searches, so a customer gets the same
  // answer whichever page they are on.
  const q = String(query || '').trim().toLowerCase()
  const matches = (x) =>
    !q ||
    String(x.name || '').toLowerCase().includes(q) ||
    String(x.description || '').toLowerCase().includes(q)

  const sorter = (a, b) => {
    if (sort === 'low') return Number(a.price || 0) - Number(b.price || 0)
    if (sort === 'high') return Number(b.price || 0) - Number(a.price || 0)
    if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
    return 0
  }

  // The shop front lists products; the service page lists services. They are
  // different businesses to a customer, and mixing them here was wrong.
  const p = kind === 'services' ? [] : (products || []).filter(inScope).filter(matches).sort(sorter)
  const sv = kind === 'products' ? [] : (services || []).filter(inScope).filter(matches).sort(sorter)
  const total = p.length + sv.length
  const bothKinds = p.length > 0 && sv.length > 0

  const chip = (active) => ({
    background: active ? t.primary : 'transparent',
    color: active ? t.onPrimary : t.textColor,
    border: `1px solid ${active ? t.primary : t.border}`,
    borderRadius: '999px',
  })

  return (
    <>
      <section className="px-4 py-6 sm:py-8">
        <Wrap t={t}>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-xs font-bold opacity-60 transition-opacity hover:opacity-100"
          >
            <ArrowRight size={13} className="rotate-180" /> Back to store
          </button>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1
                className={`text-2xl font-extrabold sm:text-3xl ${t.headingCase === 'uppercase' ? 'uppercase' : ''}`}
                style={{ fontFamily: t.headingFont }}
              >
                {q
                  ? `Results for "${String(query).trim()}"`
                  : all
                  ? kind === 'services'
                    ? 'All our services'
                    : 'Everything we sell'
                  : browse}
              </h1>
              <p className="mt-1 text-xs opacity-60">
                {total} {total === 1 ? 'item' : 'items'}
              </p>
            </div>

            {total > 1 ? (
              <label className="flex flex-shrink-0 items-center gap-2 text-xs">
                <span className="opacity-60">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, background: 'transparent', color: t.textColor }}
                  className="px-2.5 py-1.5 text-xs font-semibold outline-none"
                >
                  <option value="newest">Featured</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                  <option value="name">Name A to Z</option>
                </select>
              </label>
            ) : null}
          </div>

          {/* Category filter. Horizontally scrollable on a phone rather than
              wrapping into a wall of chips that pushes the grid off screen. */}
          {categories?.length ? (
            <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1">
              <div className="flex w-max gap-2">
                <button type="button" onClick={onBrowseAll} style={chip(all)} className="px-4 py-2 text-xs font-bold">
                  All
                </button>
                {categories.map((c) => {
                  const label = typeof c === 'string' ? c : c.label || c.name
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onCategory?.(label)}
                      style={chip(!all && String(browse).toLowerCase() === String(label).toLowerCase())}
                      className="whitespace-nowrap px-4 py-2 text-xs font-bold"
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {!total ? (
            <div
              className="mt-8 p-10 text-center"
              style={{ border: `1px dashed ${t.border}`, borderRadius: t.radius }}
            >
              <p className="text-sm font-bold">
                {q ? 'Nothing matched that search' : 'Nothing here yet'}
              </p>
              <p className="mt-1 text-xs opacity-60">
                {q
                  ? 'Check the spelling, or browse everything instead.'
                  : all
                  ? 'This store has not added anything yet.'
                  : 'Try another category.'}
              </p>
              {!all || q ? (
                <button
                  type="button"
                  onClick={() => {
                    // "See everything" has to undo BOTH filters, or a customer
                    // clears the category and still sees an empty page.
                    if (q) onClearSearch?.()
                    if (!all) onBrowseAll?.()
                  }}
                  style={buttonStyle('solid', t)}
                  className="mt-4 px-5 py-2.5 text-xs font-bold"
                >
                  See everything
                </button>
              ) : null}
            </div>
          ) : null}

          {p.length ? (
            <div className="mt-6">
              {bothKinds ? (
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest opacity-50">Products</p>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {p.map((x) => (
                  <ProductCard key={x.id} p={x} cfg={productCard} t={t} onAddToCart={onAddToCart} onOrder={onOrder} />
                ))}
              </div>
            </div>
          ) : null}

          {sv.length ? (
            <div className={p.length ? 'mt-10' : 'mt-6'}>
              {bothKinds ? (
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest opacity-50">Services</p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sv.map((x) => (
                  <ServiceCard key={x.id} sv={x} cfg={serviceCard} t={t} onBook={onBook} onOpen={onOpenService} />
                ))}
              </div>
            </div>
          ) : null}
        </Wrap>
      </section>

      {footer ? (
        <RichFooter
          s={footer.settings}
          t={t}
          store={store}
          categories={categories}
          helpLinks={helpLinks}
          badge={badge}
          onCategory={onCategory}
        />
      ) : null}
    </>
  )
}

export default function DesignedStorefront({
  design,
  store,
  products = [],
  services = [],
  categories = [],
  reviews = [],
  stats = [],
  helpLinks = [],
  browse,
  whatsappUrl,
  onAddToCart,
  onOrder,
  onBook,
  onOpenService,
  onCategory,
  onBrowseAll,
  onClearBrowse,
  onViewAll,
  onViewAllServices,
  onCta,
  onClearSearch,
  catalogueKind,
  query,
}) {
  const theme = design?.theme
  useDesignFonts(theme)

  const t = useMemo(
    () => ({
      headingFont: fontStack(theme?.fontHeading),
      bodyFont: fontStack(theme?.fontBody),
      pageBg: theme?.pageBg || '#ffffff',
      textColor: theme?.textColor || '#0f172a',
      primary: theme?.primary || '#0f172a',
      onPrimary: theme?.onPrimary || '#ffffff',
      accent: theme?.accent || '#0f766e',
      border: theme?.border || '#e2e8f0',
      radius: radiusValue(theme?.radius),
      headingCase: theme?.headingCase || 'uppercase',
      headingAlign: theme?.headingAlign || 'center',
      maxWidth: widthValue(theme?.width),
    }),
    [theme]
  )

  if (!design?.sections?.length) return null

  const productCard = design.productCard || {}
  const serviceCard = design.serviceCard || {}

  // The CAC mark. `cacVerified` is the only gate that matters; the design can
  // only move it or hide it, never award it. Resolved here rather than in each
  // section so the header, the hero and the footer cannot disagree.
  //
  // Placement is read straight off the design instead of through
  // verifiedBadgeAt() because this component also renders the editor preview,
  // where the design is not yet published and that helper would correctly say
  // "not live" and show the vendor nothing while they are configuring it.
  const badgeCfg = design.badge && typeof design.badge === 'object' ? design.badge : null
  const verified = store?.cacVerified === true
  const badge = {
    // A design saved before this setting existed keeps the badge in the footer,
    // which is where it would have been by default.
    hero: verified && (badgeCfg ? badgeCfg.hero === true : false),
    footer: verified && (badgeCfg ? badgeCfg.footer === true : true),
    tone: verifiedTone(design),
  }

  // The hero's button target is resolved here rather than in the hero, because
  // only this component knows which callbacks the mounting page supplied.
  const heroCta = (s) => () => {
    if (s.ctaAction === 'whatsapp' && whatsappUrl) return window.open(whatsappUrl, '_blank', 'noopener')
    if (s.ctaAction === 'enquiry') return document.getElementById('sp-enquiry')?.scrollIntoView({ behavior: 'smooth' })
    return onCta?.()
  }

  // Something is being browsed or searched, so show the catalogue instead of
  // the curated home layout. The footer stays, so the page never loses its
  // navigation.
  //
  // A search with no category selected browses everything: without this the
  // catalogue would compare each item's category against the string "null" and
  // find nothing.
  const searching = !!String(query || '').trim()
  const filtering = !!browse || searching

  return (
    <div style={{ background: theme?.pageBg || '#ffffff', color: t.textColor, fontFamily: t.bodyFont }}>
      {filtering ? (
        <CatalogueView
          browse={browse || 'all'}
          query={query}
          onClearSearch={onClearSearch}
          products={products}
          services={services}
          productCard={productCard}
          serviceCard={serviceCard}
          t={t}
          store={store}
          categories={categories}
          helpLinks={helpLinks}
          kind={catalogueKind}
          badge={badge}
          footer={design.sections.find((x) => x.type === 'richFooter' && isSectionLiveNow(x))}
          onAddToCart={onAddToCart}
          onOrder={onOrder}
          onBook={onBook}
          onOpenService={onOpenService}
          onCategory={onCategory}
          onBrowseAll={onBrowseAll}
          onClear={onClearBrowse}
        />
      ) : (
        design.sections
        .filter((s) => isSectionLiveNow(s))
        .map((section) => {
          const Renderer = RENDERERS[section.type]
          // A section type that no longer exists must not take the page down.
          if (!Renderer) return null
          const el = (
            <Renderer
              s={section.settings}
              t={t}
              store={store}
              products={products}
              services={services}
              categories={categories}
              reviews={reviews}
              stats={stats}
              helpLinks={helpLinks}
              badge={badge}
              productCard={productCard}
              serviceCard={serviceCard}
              whatsappUrl={whatsappUrl}
              onAddToCart={onAddToCart}
              onOrder={onOrder}
              onBook={onBook}
              onOpenService={onOpenService}
              onCategory={onCategory}
              onViewAll={onViewAll}
              onViewAllServices={onViewAllServices}
              onCta={heroCta(section.settings)}
            />
          )
          return section.hideOnMobile ? (
            <div key={section.id} className="hidden sm:block">{el}</div>
          ) : (
            <div key={section.id}>{el}</div>
          )
        })
      )}

      <Popup cfg={design.popup} t={t} storeId={store?.id || store?.uid} whatsappUrl={whatsappUrl} />
    </div>
  )
}
