// src/pages/StoreCustomPage.jsx
//
// Serves a vendor's custom About / Contact / Delivery page at a REAL url:
// /<store>/about, /<store>/contact, /<store>/policies.
//
// Real urls rather than tabs, because the whole point of these pages is that
// Google and an AI assistant can read them. A tab inside a single page app is
// invisible to both.
//
// GATING IS THE SAME TWO KEYS AS THE STOREFRONT: the plan must allow the design
// AND the vendor must have switched that specific page on. Anything else is a
// 404 rather than an empty template carrying someone's business name.
//
// NO COMMERCE HERE. These pages render presentation sections only. Any product
// row on them opens the store, it does not re-implement a checkout.
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getStoreBySlug, getProducts } from '../firebase/products'
import { getServices } from '../firebase/services'
import { fetchStoreReviews } from '../firebase/reviews'
import SEO from '../components/SEO'
import NotFound from './NotFound'
import DesignedStorefront from '../components/storefront/DesignedStorefront'
import {
  isPageLive,
  livePages,
  CUSTOM_PAGES,
  vendorHasProducts,
  vendorHasServices,
} from '../utils/storeDesign'

export default function StoreCustomPage({ pageKey }) {
  const { storeName } = useParams()
  const navigate = useNavigate()

  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getStoreBySlug(storeName)
        if (cancelled) return
        if (!data || !isPageLive(data, pageKey)) {
          setNotFound(true)
          return
        }
        setStore(data)

        const vendorType = String(data.vendorType || 'products').toLowerCase()
        const [p, s] = await Promise.all([
          vendorHasProducts(vendorType) ? getProducts(data.id, data.maxProducts).catch(() => []) : Promise.resolve([]),
          vendorHasServices(vendorType) ? getServices(data.id, data.maxProducts).catch(() => []) : Promise.resolve([]),
        ])
        if (cancelled) return
        setProducts(p || [])
        const liveServices = (s || []).filter((x) => x.isActive !== false)
        setServices(liveServices)

        // A vendor can put the Reviews section on a custom page too, so it
        // needs the same data the shop front gets. Only fetched when the page
        // actually has that section.
        const pageSections = data.storeDesign?.pages?.[pageKey]?.sections || []
        if (pageSections.some((sec) => sec?.type === 'reviews' && sec?.visible !== false)) {
          fetchStoreReviews(data.id, [
            ...(p || []),
            ...liveServices.map((sv) => ({ ...sv, kind: 'service' })),
          ])
            .then((rows) => { if (!cancelled) setReviews(rows) })
            .catch(() => {})
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [storeName, pageKey])

  if (notFound) return <NotFound />

  if (loading || !store) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-10 w-1/2 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  const meta = CUSTOM_PAGES.find((p) => p.key === pageKey)
  const design = store.storeDesign
  const page = design?.pages?.[pageKey]
  const name = store.businessName || store.storeName
  const base = `/${store.slug || store.storeName}`

  const categories = [
    ...new Set([...products, ...services].map((x) => x.category).filter(Boolean)),
  ]

  const whatsappUrl = store.whatsappNumber
    ? `https://wa.me/${String(store.whatsappNumber).replace(/\D/g, '')}`
    : ''

  // Every other live custom page, plus the shop itself. Built from what is
  // actually published, so a link here can never lead to a 404.
  const helpLinks = [
    { label: 'Back to shop', onClick: () => navigate(base) },
    ...livePages(store)
      .filter((p) => p.key !== pageKey)
      .map((p) => ({ label: p.label, onClick: () => navigate(`${base}/${p.path}`) })),
    ...(whatsappUrl ? [{ label: 'Chat on WhatsApp', href: whatsappUrl }] : []),
  ]

  // Crawler-readable text for this page, taken from what the vendor wrote.
  const textFor = (() => {
    const parts = []
    for (const s of page?.sections || []) {
      if (s.settings?.sub) parts.push(s.settings.sub)
      if (s.settings?.body) parts.push(s.settings.body)
      if (s.settings?.a1) parts.push(s.settings.a1)
    }
    return parts.join(' ').slice(0, 300)
  })()

  return (
    <>
      <SEO
        title={`${meta?.label || 'Page'} - ${name}`}
        description={textFor || `${meta?.label || 'Information'} for ${name}, a Nigerian business on Sellapage.`}
        url={`${base}/${meta?.path || pageKey}`}
        image={store.logo || store.coverImage}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${meta?.label} - ${name}`,
          description: textFor || undefined,
          url: `https://sellapage.com.ng${base}/${meta?.path || pageKey}`,
          isPartOf: {
            '@type': 'WebSite',
            name,
            url: `https://sellapage.com.ng${base}`,
          },
          publisher: { '@type': 'Organization', name, logo: store.logo || undefined },
        }}
      />

      {/* A plain link home, always present, so a visitor who lands here from a
          search result is never stranded on a page with no navigation. */}
      <div className="border-b border-black/5 bg-white/80 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to={base} className="min-w-0 truncate text-sm font-extrabold text-gray-900">
            {name}
          </Link>
          <Link to={base} className="flex-shrink-0 text-xs font-bold text-gray-500 hover:text-gray-900">
            Back to shop
          </Link>
        </div>
      </div>

      <DesignedStorefront
        // The welcome popup belongs on the shop front, not on a delivery
        // policy page. Capture is for browsing, not for reading terms.
        design={{ ...design, popup: { ...design.popup, enabled: false }, sections: page.sections }}
        store={store}
        products={products}
        services={services}
        categories={categories}
        reviews={reviews}
        stats={[]}
        helpLinks={helpLinks}
        whatsappUrl={whatsappUrl}
        onCategory={() => navigate(base)}
        onOrder={() => navigate(base)}
        onBook={() => navigate(base)}
        onViewAll={() => navigate(base)}
        onCta={() => navigate(base)}
      />
    </>
  )
}
