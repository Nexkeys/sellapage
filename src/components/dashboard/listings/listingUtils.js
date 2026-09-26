// src/components/dashboard/listings/listingUtils.js
//
// Small helpers shared by the Products and Services screens (ListingsPage and
// ListingForm). No components here, so React fast refresh keeps working on the
// component files.

export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`

/** For tight spaces: ₦1.2M, ₦350K, ₦9,500. */
export function nairaShort(n) {
  const v = Math.round(Number(n) || 0)
  if (v >= 1_000_000) return `₦${+(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 100_000) return `₦${Math.round(v / 1000)}K`
  return naira(v)
}

// Same threshold the old Products card used for its amber "N left" pill.
export const LOW_STOCK = 5

/** Stock as a vendor thinks of it. `tracked` is false when stock is left blank. */
export function stockInfo(item) {
  const s = item?.stock
  if (s === null || s === undefined || s === '') return { tracked: false, state: 'in', label: 'In stock' }
  const n = Number(s)
  if (!Number.isFinite(n)) return { tracked: false, state: 'in', label: 'In stock' }
  if (n <= 0) return { tracked: true, n: 0, state: 'out', label: 'Out of stock' }
  if (n <= LOW_STOCK) return { tracked: true, n, state: 'low', label: `Only ${n} left` }
  return { tracked: true, n, state: 'in', label: `${n} in stock` }
}

/** How many choices a product's Options & Extras hold, across every group. */
export function optionCount(item) {
  const groups = Array.isArray(item?.variations) ? item.variations : []
  return groups.reduce((sum, g) => sum + (Array.isArray(g?.options) ? g.options.length : 0), 0)
}

export const isHidden = (item) => item?.isActive === false

export const toMillis = (v) => {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.seconds === 'number') return v.seconds * 1000
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** The storefront link that scrolls to and highlights this listing. */
export function listingLink(storeUrl, item, kind) {
  if (!storeUrl || !item?.id) return ''
  if (kind === 'service') return `${storeUrl.replace(/\/$/, '')}/services`
  return `${storeUrl}${storeUrl.includes('?') ? '&' : '?'}product=${encodeURIComponent(item.id)}`
}

export const PRICE_BANDS = [
  { id: 'all', label: 'Price Range', test: () => true },
  { id: 'u5', label: 'Under ₦5,000', test: (p) => p < 5000 },
  { id: '5-20', label: '₦5,000 to ₦20,000', test: (p) => p >= 5000 && p <= 20000 },
  { id: '20-50', label: '₦20,000 to ₦50,000', test: (p) => p > 20000 && p <= 50000 },
  { id: 'o50', label: 'Over ₦50,000', test: (p) => p > 50000 },
]

export const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'name', label: 'Name: A to Z' },
  { id: 'popular', label: 'Most clicked' },
]

export function sortListings(list, sortId, kind) {
  const out = [...list]
  const pop = (x) => Number(kind === 'service' ? x.bookingRequests || x.clicks : x.clicks) || 0
  switch (sortId) {
    case 'oldest': return out.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
    case 'price-desc': return out.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    case 'price-asc': return out.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    case 'name': return out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    case 'popular': return out.sort((a, b) => pop(b) - pop(a))
    default: return out.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
  }
}

// ── Drafts ────────────────────────────────────────────────────────────────
// "Save draft" keeps the typed fields on THIS device only, so a vendor can
// stop half way and come back. Photos are files the browser cannot keep, so
// they are left out, and the draft says so.
const draftKey = (storeId, kind) => `sellapage_listing_draft_${kind}_${storeId}`
const DRAFT_FIELDS = {
  product: ['name', 'price', 'description', 'category', 'stock', 'variations'],
  service: ['name', 'price', 'description', 'category', 'duration', 'locationType', 'bookingNote'],
}

export function saveDraft(storeId, kind, form) {
  if (!storeId) return false
  const data = {}
  for (const f of DRAFT_FIELDS[kind] || []) data[f] = form?.[f]
  try {
    localStorage.setItem(draftKey(storeId, kind), JSON.stringify({ at: Date.now(), data }))
    return true
  } catch {
    return false
  }
}

export function readDraft(storeId, kind) {
  if (!storeId) return null
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey(storeId, kind)) || 'null')
    if (!raw?.data) return null
    const hasContent = Object.values(raw.data).some((v) => (Array.isArray(v) ? v.length : String(v ?? '').trim()))
    return hasContent ? raw : null
  } catch {
    return null
  }
}

export function clearDraft(storeId, kind) {
  try { localStorage.removeItem(draftKey(storeId, kind)) } catch { /* nothing to clear */ }
}

export function timeAgo(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
