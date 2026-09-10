// src/api-handlers/storefront-render.js
//
// Server-renders a vendor storefront's HTML head and a crawlable content block,
// so that pasting https://sellapage.com.ng/chichistore into an AI describes
// CHICHI STORE - what they sell, who they are - instead of describing Sellapage.
//
// WHY A FUNCTION AND NOT PRERENDERING
// The marketing pages are prerendered at build time because there are 17 of
// them and they change when we deploy. Storefronts are unbounded and change
// whenever a vendor edits a product, so they have to be rendered per request and
// cached at the CDN instead.
//
// WHY NOT SNIFF FOR BOTS
// Serving different HTML to crawlers than to people is dynamic rendering, which
// Google removed from its recommendations and now treats as a cloaking risk.
// Everyone gets the identical response; the CDN cache makes that cheap.
//
// FAIL-OPEN, ALWAYS
// Every failure path returns the untouched SPA shell. A storefront must never
// break because SEO could not be generated - the React app boots and the page
// works exactly as it does today. This is why nothing here throws.

import { getAdminDb } from './_lib/firebase-admin.js'
import { isPageLive, CUSTOM_PAGES } from '../utils/storeDesign.js'

const SITE_URL = 'https://sellapage.com.ng'
// BOTH apex and www stay listed regardless of which one Vercel treats as
// primary, so switching the primary domain in the dashboard cannot strand
// either host. Preview deployments count as main hosts too: otherwise `/` on a
// *.vercel.app URL is treated as a vendor custom domain, runs a Firestore
// lookup that can only fail, and renders nothing useful.
const MAIN_HOSTS = new Set(['sellapage.com.ng', 'www.sellapage.com.ng', 'localhost'])
const isMainHostname = (host) =>
  MAIN_HOSTS.has(host) || host.startsWith('localhost') || host.endsWith('.vercel.app')

// SEO rendering is a paid feature. Starter stores keep exactly today's path.
const ELIGIBLE_PLANS = new Set(['growth', 'pro', 'premium'])

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const clamp = (s, n) => {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim()
  return v.length <= n ? v : v.slice(0, n - 1).trimEnd() + '\u2026'
}

// product.price is stored in NAIRA, not kobo. Confirmed two ways: ProductCard
// renders it raw as `Number(product.price).toLocaleString()`, and checkout
// multiplies by 100 to reach the kobo Paystack expects. Dividing here would have
// advertised a 45,000 naira item to Google and every AI as 450 naira, which
// misleads buyers and is the kind of mismatch that gets a Merchant Center
// account suspended.
const naira = (amount) => {
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  return `\u20a6${n.toLocaleString('en-NG')}`
}

/** Serves the SPA unchanged. Used for every not-found, not-eligible or error path. */
function serveShell(res, shell, reason) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Short cache: a Starter store that upgrades should start getting the
  // rendered version quickly rather than being stuck on a cached shell.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.setHeader('X-Sellapage-Render', reason)
  return res.status(200).send(shell)
}

/**
 * Resolves which store this request is for.
 *  - sellapage.com.ng/<slug>  -> slug from the path
 *  - customdomain.com/        -> looked up by Host
 */
async function resolveStore(db, req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(':')[0]
    .toLowerCase()

  const url = String(req.url || '').split('?')[0]
  const segments = url.split('/').filter(Boolean)
  const querySlug = req.query?.slug

  const isMainHost = isMainHostname(host)

  if (!isMainHost && host) {
    const snap = await db
      .collection('stores')
      .where('customDomain', '==', host.replace(/^www\./, ''))
      .limit(1)
      .get()
    if (!snap.empty) {
      const d = snap.docs[0]
      return { store: { id: d.id, ...d.data() }, host, onCustomDomain: true }
    }
    return { store: null, host, onCustomDomain: true }
  }

  const slug = querySlug || segments[0]
  if (!slug) return { store: null, host, onCustomDomain: false }

  const snap = await db.collection('stores').where('storeName', '==', slug).limit(1).get()
  if (!snap.empty) {
    const d = snap.docs[0]
    return { store: { id: d.id, ...d.data() }, host, onCustomDomain: false }
  }

  // Not a live address. It may be one this store used to have, in which case
  // every old link and every ranking pointing at it should be carried forward
  // rather than dropped on a 404. A live storeName always wins over a
  // previousSlug, which is why this lookup runs second.
  const old = await db
    .collection('stores')
    .where('previousSlugs', 'array-contains', slug)
    .limit(1)
    .get()
  if (!old.empty) {
    const d = old.docs[0]
    return { store: { id: d.id, ...d.data() }, host, onCustomDomain: false, movedFrom: slug }
  }

  return { store: null, host, onCustomDomain: false }
}

/**
 * Where this store's SEO authority lives.
 *
 * A store reachable at BOTH sellapage.com.ng/slug and its own domain is
 * duplicate content, and pointing each copy at itself splits the ranking
 * between them. So both copies name the same canonical: the custom domain once
 * it is verified, otherwise the Sellapage address. The Sellapage URL keeps
 * working and keeps describing the store either way.
 */
function preferredUrl(store) {
  if (store.customDomain && store.customDomainStatus === 'verified') {
    return `https://${String(store.customDomain).replace(/^www\./, '')}`
  }
  return `${SITE_URL}/${store.storeName}`
}

/** Up to 24 listings, enough to describe the shop without bloating the page. */
async function loadListings(db, storeId, kind = 'products') {
  try {
    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection(kind === 'services' ? 'services' : 'products')
      .limit(24)
      .get()
    return snap.docs
      .map((d) => d.data())
      .filter((p) => p && p.name && p.isActive !== false)
  } catch {
    return []
  }
}

function buildJsonLd({ store, seo, listings, canonical, storeUrl }) {
  const blocks = []

  const offers = listings
    .map((p) => {
      const price = Number(p.price)
      if (!Number.isFinite(price)) return null
      return {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'NGN',
        availability:
          p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      }
    })
    .filter(Boolean)

  const prices = offers.map((o) => Number(o.price)).filter(Number.isFinite)

  // The store itself as the primary entity of this URL. `alternateName` and
  // `sameAs` are what let an assistant tie "chichi store sellapage" and the
  // vendor's social handles to this one business.
  blocks.push({
    '@context': 'https://schema.org',
    '@type': ['Store', 'OnlineStore'],
    '@id': `${canonical}#store`,
    name: store.businessName || store.storeName,
    alternateName: [store.storeName, `${store.storeName} on Sellapage`].filter(Boolean),
    url: canonical,
    description: seo.description,
    ...(store.logo ? { logo: store.logo, image: store.logo } : {}),
    ...(seo.category ? { knowsAbout: seo.keywords } : {}),
    areaServed: (seo.serviceAreas?.length ? seo.serviceAreas : ['Nigeria']).map((a) => ({
      '@type': 'Place',
      name: a,
    })),
    ...(seo.socialLinks?.length ? { sameAs: seo.socialLinks } : {}),
    currenciesAccepted: 'NGN',
    paymentAccepted: 'Card, Bank Transfer, USSD',
    ...(prices.length
      ? {
          makesOffer: {
            '@type': 'AggregateOffer',
            priceCurrency: 'NGN',
            lowPrice: Math.min(...prices).toFixed(2),
            highPrice: Math.max(...prices).toFixed(2),
            offerCount: offers.length,
          },
        }
      : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Sellapage',
      url: SITE_URL,
    },
  })

  if (listings.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Products and services from ${store.businessName || store.storeName}`,
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 24).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          ...(p.description ? { description: clamp(p.description, 300) } : {}),
          ...(p.image || p.images?.[0] ? { image: p.image || p.images[0] } : {}),
          ...(Number.isFinite(Number(p.price))
            ? {
                offers: {
                  '@type': 'Offer',
                  price: Number(p.price).toFixed(2),
                  priceCurrency: 'NGN',
                  availability:
                    p.stock === 0
                      ? 'https://schema.org/OutOfStock'
                      : 'https://schema.org/InStock',
                  url: storeUrl,
                },
              }
            : {}),
        },
      })),
    })
  }

  // Vendor-written FAQ. Research is consistent that FAQ markup is one of the
  // strongest signals for being quoted in AI answers - but only when the same
  // text is visible on the page, which is why it is rendered below as well.
  if (seo.faq?.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seo.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  // The vendor's guarantee, expressed as a return policy ONLY when they set a
  // day count. A free-text promise does not map cleanly onto
  // MerchantReturnPolicy, and emitting a policy that does not match reality is
  // how a merchant account gets penalised, so the untimed case stays prose only.
  const g = store.guarantee
  if (g?.enabled && g?.headline && Number(g.days) > 0) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'MerchantReturnPolicy',
      '@id': `${canonical}#returns`,
      name: g.headline,
      merchantReturnDays: Number(g.days),
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      applicableCountry: 'NG',
      ...(g.details ? { description: g.details } : {}),
    })
  }

  blocks.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Sellapage', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Stores', item: `${SITE_URL}/live-stores` },
      {
        '@type': 'ListItem',
        position: 3,
        name: store.businessName || store.storeName,
        item: canonical,
      },
    ],
  })

  return blocks
}

/**
 * The crawlable content block.
 *
 * Kept in <noscript> so a human never sees it and there is no flash before
 * React mounts, while every non-JS crawler reads it. Its text deliberately
 * mirrors the JSON-LD: assistants discount structured data that has no visible
 * counterpart, so the claims and the prose have to agree.
 */
function buildNoscript({ store, seo, listings, canonical, kind = 'products' }) {
  const name = store.businessName || store.storeName
  const lines = []

  lines.push(`<h1>${esc(name)}</h1>`)
  lines.push(`<p>${esc(seo.description)}</p>`)

  if (seo.about) lines.push(`<p>${esc(seo.about)}</p>`)

  if (seo.serviceAreas?.length) {
    lines.push(`<p>Delivers to: ${esc(seo.serviceAreas.join(', '))}.</p>`)
  }

  if (listings.length) {
    // A service business does not "sell" a haircut off a shelf, and a crawler
    // reading the wrong verb is a crawler filing the business wrongly.
    lines.push(
      kind === 'services'
        ? `<h2>Services ${esc(name)} offers</h2>`
        : `<h2>What ${esc(name)} sells</h2>`,
    )
    lines.push('<ul>')
    for (const p of listings.slice(0, 24)) {
      const price = naira(p.price)
      lines.push(
        `<li>${esc(p.name)}${price ? ` - ${esc(price)}` : ''}` +
          `${p.description ? `. ${esc(clamp(p.description, 180))}` : ''}</li>`,
      )
    }
    lines.push('</ul>')
  }

  if (seo.faq?.length) {
    lines.push(`<h2>Frequently asked questions</h2>`)
    for (const f of seo.faq) {
      lines.push(`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
    }
  }

  const guarantee = store.guarantee
  if (guarantee?.enabled && guarantee?.headline) {
    const days = Number(guarantee.days)
    lines.push(`<h2>${days > 0 ? `${days}-day guarantee` : 'Our guarantee'}</h2>`)
    lines.push(`<p>${esc(guarantee.headline)}</p>`)
    if (guarantee.details) lines.push(`<p>${esc(guarantee.details)}</p>`)
  }

  // Only when it is true on the document, which only the Admin SDK can set.
  // Said in the crawlable text as well as on the page because a claim that
  // exists only in structured data is one an assistant is right to discount.
  if (store.cacVerified === true) {
    lines.push(
      `<p>${esc(name)} is CAC verified: its business registration has been checked ` +
        `against the Corporate Affairs Commission of Nigeria.</p>`,
    )
  }

  lines.push(
    `<p>${esc(name)} is an independent business selling online with Sellapage. ` +
      `Store address: <a href="${esc(canonical)}">${esc(canonical)}</a>.</p>`,
  )

  return `<noscript><main>\n        ${lines.join('\n        ')}\n      </main></noscript>`
}

/**
 * Server rendered HTML for a vendor's custom page (/store/about and friends).
 *
 * These pages exist so Google and an AI assistant can read a business's own
 * words. Served from the same section data the browser renders, so the crawler
 * and the customer are never shown different content, which is cloaking.
 *
 * Everything is escaped: this is vendor written text going into HTML.
 */
function pageText(sections) {
  const out = []
  for (const sec of sections || []) {
    if (sec?.visible === false) continue
    const st = sec.settings || {}
    if (sec.type === 'hero') {
      if (st.headline) out.push({ tag: 'h1', text: st.headline })
      if (st.sub) out.push({ tag: 'p', text: st.sub })
    }
    if (sec.type === 'textBlock') {
      if (st.title) out.push({ tag: 'h2', text: st.title })
      for (const para of String(st.body || '').split('\n\n')) {
        if (para.trim()) out.push({ tag: 'p', text: para.trim() })
      }
    }
    if (sec.type === 'trustBadges') {
      const items = [st.item1, st.item2, st.item3, st.item4].filter(Boolean)
      if (st.title) out.push({ tag: 'h2', text: st.title })
      for (const it of items) out.push({ tag: 'li', text: it })
    }
    if (sec.type === 'faq') {
      if (st.title) out.push({ tag: 'h2', text: st.title })
      for (const [q, a] of [[st.q1, st.a1], [st.q2, st.a2], [st.q3, st.a3]]) {
        if (q && a) {
          out.push({ tag: 'h3', text: q })
          out.push({ tag: 'p', text: a })
        }
      }
    }
    if (sec.type === 'ctaBanner' && st.headline) out.push({ tag: 'p', text: st.headline })
    if (sec.type === 'socialLinks' && st.title) out.push({ tag: 'h2', text: st.title })
  }
  return out
}

function buildPageNoscript({ store, blocks, canonical, label }) {
  const name = store.businessName || store.storeName
  const body = blocks
    .map((b) => `<${b.tag}>${esc(b.text)}</${b.tag}>`)
    .join('\n      ')

  return `<noscript>
    <div>
      <p><a href="${esc(canonical)}">${esc(name)}</a> &rsaquo; ${esc(label)}</p>
      ${body}
    </div>
  </noscript>`
}

/** FAQ entries as schema.org, so the answers can surface directly in search. */
function faqJsonLd(sections) {
  const pairs = []
  for (const sec of sections || []) {
    if (sec?.type !== 'faq' || sec?.visible === false) continue
    const st = sec.settings || {}
    for (const [q, a] of [[st.q1, st.a1], [st.q2, st.a2], [st.q3, st.a3]]) {
      if (q && a) pairs.push({ q, a })
    }
  }
  if (!pairs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map((p) => ({
      '@type': 'Question',
      name: p.q,
      acceptedAnswer: { '@type': 'Answer', text: p.a },
    })),
  }
}

export default async function handler(req, res) {
  let shell = '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
  try {
    const mod = await import('./_generated/spa-shell.js')
    if (mod?.SPA_SHELL && mod.SPA_SHELL.includes('id="root"')) shell = mod.SPA_SHELL
  } catch {
    // Shell module missing means the build did not generate it. Nothing here can
    // work without it, but the request must still succeed.
    return serveShell(res, shell, 'no-shell')
  }

  try {
    const db = getAdminDb()
    const { store, movedFrom } = await resolveStore(db, req)

    if (!store) return serveShell(res, shell, 'no-store')

    const plan = String(store.plan || 'starter').toLowerCase()
    const canonical = preferredUrl(store)

    // An address the store has moved away from. Redirect BEFORE any plan or
    // toggle check: a moved URL should never dead-end, whatever the plan.
    if (movedFrom) {
      res.setHeader('Location', canonical)
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      res.setHeader('X-Sellapage-Render', 'slug-moved')
      return res.status(301).end()
    }

    // Downgrading to Starter switches the feature off. It never deletes the
    // vendor's saved settings - they are still on the document, and upgrading
    // makes them live again untouched.
    if (!ELIGIBLE_PLANS.has(plan)) return serveShell(res, shell, 'plan-ineligible')
    if (store.isActive === false) return serveShell(res, shell, 'store-inactive')

    const s = store.seo || {}

    // Explicit opt-in. Indexing a vendor's business without asking is not ours
    // to decide, so nothing is served until they switch it on.
    if (s.enabled !== true) return serveShell(res, shell, 'seo-disabled')

    // A vendor built page (/store/about and friends). Same opt-in as the
    // storefront: the vendor must have published the page AND switched SEO on,
    // because this is what puts their words in front of a crawler. Anything
    // else falls through to the SPA, which still serves the page to people.
    const pageKey = String(req.query?.page || '').trim().toLowerCase()
    if (pageKey) {
      const meta = CUSTOM_PAGES.find((p) => p.key === pageKey)
      if (!meta || !isPageLive(store, pageKey)) return serveShell(res, shell, 'page-off')

      const sections = store.storeDesign?.pages?.[pageKey]?.sections || []
      const blocks = pageText(sections)
      const bizName = store.businessName || store.storeName
      const pageUrl = `${canonical}/${meta.path}`
      const desc =
        (blocks.find((b) => b.tag === 'p')?.text || '').slice(0, 300) ||
        `${meta.label} for ${bizName}, a Nigerian business on Sellapage.`

      const faq = faqJsonLd(sections)
      const pageHead = [
        `<title>${esc(`${meta.label} - ${bizName}`)}</title>`,
        `<meta name="description" content="${esc(desc)}">`,
        `<link rel="canonical" href="${esc(pageUrl)}">`,
        `<meta property="og:title" content="${esc(`${meta.label} - ${bizName}`)}">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:url" content="${esc(pageUrl)}">`,
        `<meta property="og:type" content="website">`,
        store.logo ? `<meta property="og:image" content="${esc(store.logo)}">` : '',
        `<meta name="twitter:card" content="summary">`,
        `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${meta.label} - ${bizName}`,
          description: desc,
          url: pageUrl,
          isPartOf: { '@type': 'WebSite', name: bizName, url: canonical },
          publisher: { '@type': 'Organization', name: bizName },
        })}</script>`,
        faq ? `<script type="application/ld+json">${JSON.stringify(faq)}</script>` : '',
      ]
        .filter(Boolean)
        .join('\n  ')

      let pageHtml = shell.replace('</head>', `  ${pageHead}
  </head>`)
      pageHtml = pageHtml.replace(
        '<div id="root"></div>',
        `${buildPageNoscript({ store, blocks, canonical, label: meta.label })}
    <div id="root"></div>`,
      )

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
      res.setHeader('X-Sellapage-Render', `custom-page-${pageKey}`)
      return res.status(200).send(pageHtml)
    }

    const name = store.businessName || store.storeName

    const seo = {
      // The title carries the store name AND "Sellapage", so a search for
      // "chichi store sellapage" has something to match on.
      title: clamp(s.title || `${name}${s.tagline ? ` - ${s.tagline}` : ''} | Sellapage`, 70),
      description: clamp(
        s.description ||
          store.description ||
          `${name} sells online with Sellapage. Browse products and order directly.`,
        160,
      ),
      keywords: Array.isArray(s.keywords) ? s.keywords.slice(0, 30) : [],
      about: s.about ? clamp(s.about, 1200) : '',
      faq: Array.isArray(s.faq)
        ? s.faq.filter((f) => f?.q && f?.a).slice(0, 10)
        : [],
      serviceAreas: Array.isArray(s.serviceAreas) ? s.serviceAreas.slice(0, 12) : [],
      socialLinks: Array.isArray(s.socialLinks) ? s.socialLinks.slice(0, 8) : [],
      category: s.category || '',
    }

    // The services page is a different page with different content, so it gets
    // its own canonical, its own title and its own listings. Serving the shop
    // front's metadata on /services was telling a crawler the two URLs are the
    // same page, and listing products on a page that shows none.
    //
    // A services-only vendor has no product page at all, so their root URL
    // lists services too.
    const servicesUrl = String(req.query?.view || '').trim().toLowerCase() === 'services'
    const servicesOnly = String(store.vendorType || '').toLowerCase() === 'services'
    const listKind = servicesUrl || servicesOnly ? 'services' : 'products'

    const listings = await loadListings(db, store.id, listKind)
    const pageUrl = servicesUrl ? `${canonical}/services` : canonical

    if (listKind === 'services') {
      const serviceTitle = clamp(
        `Book ${name} services${s.tagline ? ` - ${s.tagline}` : ''} | Sellapage`,
        70,
      )
      // On /services the vendor's own SEO title is DELIBERATELY not reused: it
      // is the shop front's title, and two URLs carrying one title is exactly
      // the duplicate a crawler collapses. A services-only vendor has one page,
      // so their configured title still wins there.
      seo.title = servicesUrl ? serviceTitle : s.title ? seo.title : serviceTitle
      seo.description = clamp(
        s.description ||
          store.description ||
          `Book services from ${name} online. Check what they offer and reserve a time.`,
        160,
      )
    }

    const image = store.logo || store.coverImage || `${SITE_URL}/og-image.png`

    const head = [
      `<title>${esc(seo.title)}</title>`,
      `<meta name="description" content="${esc(seo.description)}">`,
      seo.keywords.length
        ? `<meta name="keywords" content="${esc(seo.keywords.join(', '))}">`
        : '',
      `<link rel="canonical" href="${esc(pageUrl)}">`,
      `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:title" content="${esc(seo.title)}">`,
      `<meta property="og:description" content="${esc(seo.description)}">`,
      `<meta property="og:url" content="${esc(pageUrl)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta property="og:site_name" content="${esc(name)}">`,
      `<meta property="og:locale" content="en_NG">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(seo.title)}">`,
      `<meta name="twitter:description" content="${esc(seo.description)}">`,
      `<meta name="twitter:image" content="${esc(image)}">`,
      ...buildJsonLd({ store, seo, listings, canonical, storeUrl: canonical }).map(
        (b) =>
          `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`,
      ),
    ]
      .filter(Boolean)
      .join('\n    ')

    // Meta Pixel base code, server rendered.
    //
    // The client also initialises this (src/utils/metaPixel.js), and for a real
    // visitor that alone is enough. This exists because Meta's own tooling
    // fetches the raw HTML and greps it: without a pixel in the server response
    // Events Manager reports "a pixel wasn't detected on this website" and
    // "0 websites", and the Event Setup Tool refuses to open, even while Test
    // Events is happily receiving events from the hydrated page.
    //
    // Deliberately init WITHOUT PageView. The client fires that, so events come
    // from exactly one place and cannot be double counted. Meta's detection
    // looks for the base code, not the track call.
    const pixelId = String(store.metaPixelId || '').trim()
    const pixelTag = /^[1-9]\d{14,15}$/.test(pixelId)
      ? "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" + pixelId + "');window.__sellapagePixel='" + pixelId + "';</script>"
      : ''
    // TikTok Pixel base code, server rendered. Same reasoning as the Meta block
    // directly above: TikTok Events Manager fetches the raw HTML to confirm a
    // pixel is installed, and reports the site as unverified without one, even
    // while Test Events is happily receiving events from the hydrated page.
    //
    // Also init WITHOUT ttq.page(). The client fires the page view
    // (src/utils/tiktokPixel.js), so it comes from exactly one place and cannot
    // be double counted. `window.__sellapageTikTokPixel` is the handshake that
    // tells the client this already ran, so it adopts rather than loading the
    // SDK a second time.
    //
    // Written as a template literal on purpose: the snippet contains both quote
    // characters, and a real newline inside a single-quoted string is exactly
    // what took every storefront down on 2026-09-09.
    const ttPixelId = String(store.tiktokPixelId || '').trim().toUpperCase()
    const ttPixelTag = /^[A-Z0-9]{20}$/.test(ttPixelId)
      ? `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var s=d.createElement("script");s.type="text/javascript",s.async=!0,s.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};ttq.load("${ttPixelId}");w.__sellapageTikTokPixel="${ttPixelId}";}(window,document,"ttq");</script>`
      : ''
    let html = shell.replace('</head>', `  ${head}\n  ${pixelTag}\n  ${ttPixelTag}\n  </head>`)
    html = html.replace(
      '<div id="root"></div>',
      `${buildNoscript({ store, seo, listings, canonical, kind: listKind })}\n    <div id="root"></div>`,
    )

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Cached at the CDN, so the function runs roughly once per store per 5
    // minutes rather than on every visit, and stale content still serves
    // instantly while it refreshes in the background.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
    res.setHeader('X-Sellapage-Render', servicesUrl ? 'storefront-seo-services' : 'storefront-seo')
    return res.status(200).send(html)
  } catch (err) {
    console.error('[storefront-render] falling back to SPA:', err)
    return serveShell(res, shell, 'error')
  }
}
