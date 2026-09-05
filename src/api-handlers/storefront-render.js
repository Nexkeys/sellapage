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
async function loadListings(db, storeId) {
  try {
    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection('products')
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
function buildNoscript({ store, seo, listings, canonical }) {
  const name = store.businessName || store.storeName
  const lines = []

  lines.push(`<h1>${esc(name)}</h1>`)
  lines.push(`<p>${esc(seo.description)}</p>`)

  if (seo.about) lines.push(`<p>${esc(seo.about)}</p>`)

  if (seo.serviceAreas?.length) {
    lines.push(`<p>Delivers to: ${esc(seo.serviceAreas.join(', '))}.</p>`)
  }

  if (listings.length) {
    lines.push(`<h2>What ${esc(name)} sells</h2>`)
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

  lines.push(
    `<p>${esc(name)} is an independent business selling online with Sellapage. ` +
      `Store address: <a href="${esc(canonical)}">${esc(canonical)}</a>.</p>`,
  )

  return `<noscript><main>\n        ${lines.join('\n        ')}\n      </main></noscript>`
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

    const listings = await loadListings(db, store.id)
    const image = store.logo || store.coverImage || `${SITE_URL}/og-image.png`

    const head = [
      `<title>${esc(seo.title)}</title>`,
      `<meta name="description" content="${esc(seo.description)}">`,
      seo.keywords.length
        ? `<meta name="keywords" content="${esc(seo.keywords.join(', '))}">`
        : '',
      `<link rel="canonical" href="${esc(canonical)}">`,
      `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:title" content="${esc(seo.title)}">`,
      `<meta property="og:description" content="${esc(seo.description)}">`,
      `<meta property="og:url" content="${esc(canonical)}">`,
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

    let html = shell.replace('</head>', `  ${head}\n  </head>`)
    html = html.replace(
      '<div id="root"></div>',
      `${buildNoscript({ store, seo, listings, canonical })}\n    <div id="root"></div>`,
    )

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Cached at the CDN, so the function runs roughly once per store per 5
    // minutes rather than on every visit, and stale content still serves
    // instantly while it refreshes in the background.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
    res.setHeader('X-Sellapage-Render', 'storefront-seo')
    return res.status(200).send(html)
  } catch (err) {
    console.error('[storefront-render] falling back to SPA:', err)
    return serveShell(res, shell, 'error')
  }
}
