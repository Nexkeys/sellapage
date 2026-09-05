// src/api-handlers/product-feed.js
//
// Publishes a vendor's catalogue as a Google Merchant Center product feed.
//
// WHY THIS IS WORTH BUILDING
// Merchant Center free listings put products on Google Search, the Shopping tab
// and Google Images at zero cost, and Merchant Center supports Nigeria. For a
// vendor with no ad budget this is the closest thing to free customers, which
// is exactly the brief: help them GET customers, not admire their business.
//
// The vendor never touches a spreadsheet. They copy one URL into Merchant
// Center, Google refetches it on a schedule, and the catalogue stays in sync on
// its own.
//
// FORMAT
// RSS 2.0 with the Google base namespace, which is the format Merchant Center
// documents for scheduled fetches.
//
// PRICES ARE IN NAIRA
// product.price is stored in naira, not kobo (ProductCard renders it raw;
// checkout multiplies by 100 for Paystack). Publishing a divided price here
// would advertise the wrong amount and is a documented route to having a
// Merchant Center account suspended for price mismatch, so the value is used
// exactly as stored.

import { getAdminDb } from './_lib/firebase-admin.js'

const SITE_URL = 'https://sellapage.com.ng'
const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const MAX_ITEMS = 1000

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** Strips markup and collapses whitespace; Merchant Center rejects HTML here. */
const plain = (s, max = 5000) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

function storeBaseUrl(store) {
  if (store.customDomain && store.customDomainStatus === 'verified') {
    return `https://${String(store.customDomain).replace(/^www\./, '')}`
  }
  return `${SITE_URL}/${store.storeName}`
}

function itemXml(product, store, base) {
  const price = Number(product.price)
  if (!Number.isFinite(price) || price <= 0) return null

  const title = plain(product.name, 150)
  if (!title) return null

  const image = product.imageUrl || product.imageUrls?.[0]
  // Merchant Center rejects an item with no image, so skipping here is better
  // than submitting a row that will be disapproved and drag the feed's health
  // score down.
  if (!image) return null

  const description = plain(product.description) || title
  const inStock = product.stock === undefined || product.stock === null || Number(product.stock) > 0

  const parts = [
    `<g:id>${esc(product.id)}</g:id>`,
    `<g:title>${esc(title)}</g:title>`,
    `<g:description>${esc(description)}</g:description>`,
    `<g:link>${esc(`${base}?product=${encodeURIComponent(product.id)}`)}</g:link>`,
    `<g:image_link>${esc(image)}</g:image_link>`,
    `<g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
    `<g:price>${price.toFixed(2)} NGN</g:price>`,
    `<g:condition>new</g:condition>`,
    `<g:brand>${esc(plain(store.businessName || store.storeName, 70))}</g:brand>`,
    // Handmade and small-batch goods have no GTIN or MPN. Saying so explicitly
    // is required; omitting it silently gets the item disapproved.
    `<g:identifier_exists>no</g:identifier_exists>`,
  ]

  if (product.category) parts.push(`<g:product_type>${esc(plain(product.category, 100))}</g:product_type>`)

  for (const extra of (product.imageUrls || []).slice(1, 11)) {
    parts.push(`<g:additional_image_link>${esc(extra)}</g:additional_image_link>`)
  }

  return `    <item>\n      ${parts.join('\n      ')}\n    </item>`
}

export default async function handler(req, res) {
  const send = (status, body, contentType = 'application/xml; charset=utf-8') => {
    res.setHeader('Content-Type', contentType)
    return res.status(status).send(body)
  }

  try {
    const slug = String(req.query.slug || req.query.store || '').trim().toLowerCase()
    if (!slug) return send(400, '<?xml version="1.0"?><error>Missing store</error>')

    const db = getAdminDb()
    const snap = await db.collection('stores').where('storeName', '==', slug).limit(1).get()
    if (snap.empty) return send(404, '<?xml version="1.0"?><error>Store not found</error>')

    const store = { id: snap.docs[0].id, ...snap.docs[0].data() }

    // Same gate as the SEO renderer: a paid plan AND the vendor switching it on.
    // A feed is public and permanent once Google has it, so it is not something
    // to start publishing without the owner asking for it.
    const plan = String(store.plan || 'starter').toLowerCase()
    if (!PAID_PLANS.has(plan) || store.seo?.enabled !== true || store.isActive === false) {
      return send(403, '<?xml version="1.0"?><error>Feed not enabled for this store</error>')
    }

    const productsSnap = await db
      .collection('stores')
      .doc(store.id)
      .collection('products')
      .limit(MAX_ITEMS)
      .get()

    const base = storeBaseUrl(store)
    const items = productsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.isActive !== false)
      .map((p) => itemXml(p, store, base))
      .filter(Boolean)

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
      `  <channel>\n` +
      `    <title>${esc(plain(store.businessName || store.storeName, 150))}</title>\n` +
      `    <link>${esc(base)}</link>\n` +
      `    <description>${esc(plain(store.seo?.description || store.description || `Products from ${store.businessName || store.storeName}`, 500))}</description>\n` +
      items.join('\n') +
      `\n  </channel>\n</rss>\n`

    // Google refetches on its own schedule, so an hour of CDN cache costs
    // nothing in freshness and keeps the function cold most of the time.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('X-Sellapage-Feed-Items', String(items.length))
    return send(200, xml)
  } catch (err) {
    console.error('[product-feed] error:', err)
    return send(500, '<?xml version="1.0"?><error>Server error</error>')
  }
}
