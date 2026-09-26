// src/utils/marketplace.js
// Dropshipping marketplace, Phase 0 (coming soon + waitlist). Shared by the
// dashboard tabs, Settings, signup, the public page and the API handlers, so
// "who is interested" and "who is ready" mean the same thing everywhere.
// Build plan: Docs/Dropshipping-Marketplace-Plan.md.

import { findCategory, findSubcategory } from './marketplaceCategories.js'
import { checkListingPrice } from './supplierLimits.js'

export const MARKETPLACE_ROLES = ['supply', 'dropship', 'both']

/**
 * THE LOCK. `DROPSHIPPING_STAGE` decides who sees anything beyond "coming
 * soon", so the marketplace can be built and tested in production while every
 * vendor keeps seeing the Phase 0 page.
 *
 *   coming_soon (default)  everybody sees "coming soon". Every marketplace
 *                          handler refuses. This is what an unset variable
 *                          means, so a fresh environment is always locked.
 *   testing                only stores with `marketplaceTester: true` (set by
 *                          the server, locked in firestore.rules) get the real
 *                          thing. Everyone else still sees "coming soon".
 *   live                   everyone, subject to plan and supplier approval.
 *
 * The browser copy is cosmetic: it only decides which screen to draw. Every
 * server handler asks again (_lib/marketplace-gate.js), so flipping the
 * variable is the only way in, and a vendor cannot make themselves a tester.
 */
export const MARKETPLACE_STAGES = ['coming_soon', 'testing', 'live']

export function cleanStage(value) {
  const s = String(value || '').trim().toLowerCase()
  return MARKETPLACE_STAGES.includes(s) ? s : 'coming_soon'
}

/** Can THIS store use the real marketplace yet? */
export function marketplaceUnlocked(stage, store) {
  const s = cleanStage(stage)
  if (s === 'live') return true
  if (s === 'testing') return store?.marketplaceTester === true
  return false
}

export const MARKETPLACE_TABS = {
  supply: { id: 'supplier-hub', label: 'Supplier Hub' },
  dropship: { id: 'dropship', label: 'Dropship Marketplace' },
}

/**
 * `stores/{uid}.marketplaceInterest` is { supply, dropship }. It records
 * interest only and grants nothing, which is why the owner may write it.
 */
export function readInterest(store) {
  const m = store?.marketplaceInterest
  return { supply: m?.supply === true, dropship: m?.dropship === true }
}

export function interestFromRole(role) {
  return { supply: role === 'supply' || role === 'both', dropship: role === 'dropship' || role === 'both' }
}

export function roleFromInterest(interest) {
  if (interest?.supply && interest?.dropship) return 'both'
  if (interest?.supply) return 'supply'
  if (interest?.dropship) return 'dropship'
  return null
}

/** Only ever `true` booleans survive; anything else reads as not interested. */
export function cleanInterest(raw) {
  return { supply: raw?.supply === true, dropship: raw?.dropship === true }
}

/**
 * A dropshipper sells products, so ticking "dropship" on a services-only store
 * makes it a products-and-services store. Everything else is left alone.
 */
export function vendorTypeForInterest(vendorType, interest) {
  const t = ['products', 'services', 'both'].includes(vendorType) ? vendorType : 'products'
  return interest?.dropship && t === 'services' ? 'both' : t
}

/**
 * SUPPLIER STATUS (Phase 1). Lives on `stores/{uid}.supplierStatus`, is written
 * ONLY by the server and is locked in firestore.rules, because it is what
 * decides whose products may be sold by other people's stores.
 *
 *   none       never applied, or applied before this existed
 *   pending    applied, waiting for a human to review the video and the checks
 *   approved   may list products on the marketplace
 *   rejected   turned down, with a reason. May fix it and apply again
 *   suspended  was approved and has been stopped by an admin. Listings go
 *              unavailable (Phase 2 cascade). Only an admin can lift it
 */
export const SUPPLIER_STATUSES = ['none', 'pending', 'approved', 'rejected', 'suspended']

export function supplierStatus(store) {
  const s = String(store?.supplierStatus || 'none').toLowerCase()
  return SUPPLIER_STATUSES.includes(s) ? s : 'none'
}

/** Only an approved supplier may list. Everything else is a screen, not access. */
export function isApprovedSupplier(store) {
  return supplierStatus(store) === 'approved'
}

/**
 * A rejected supplier may apply again, but not immediately: every application
 * costs a human a video review, and without this a vendor can resubmit the same
 * rejected video in a loop. A suspended one cannot reapply at all - an admin
 * lifts that.
 */
export const REAPPLY_COOLDOWN_MS = 24 * 60 * 60 * 1000

export function reapplyAllowedAt(store) {
  if (supplierStatus(store) !== 'rejected') return null
  const at = store?.supplierRejectedAt
  const d = at?.toDate?.() || (at ? new Date(at) : null)
  return d && !Number.isNaN(d.getTime()) ? new Date(d.getTime() + REAPPLY_COOLDOWN_MS) : null
}

const hasPro = (store) =>
  store?.hasProFeatures ?? ['pro', 'premium'].includes(String(store?.plan || 'starter').toLowerCase())

/**
 * What each side will need at launch (plan decisions B1, B10). Shown now as a
 * checklist so vendors can get ready while the marketplace is coming soon.
 * `tab` is the dashboard tab that fixes an unmet item. Pass `{ video: bool }`
 * once the application form is open, so the video counts as a real item.
 */
export function readiness(store, role, { video = null } = {}) {
  const items = [
    { key: 'plan', label: 'Pro or Premium plan', done: !!hasPro(store), tab: 'billing' },
    { key: 'payout', label: 'Payout bank account set up', done: !!store?.subaccountCode, tab: 'payouts' },
  ]
  if (role === 'supply') {
    items.push(
      { key: 'cac', label: 'CAC verified', done: store?.cacVerified === true, tab: 'cac-verification' },
      { key: 'phone', label: 'Phone number verified', done: store?.phoneVerified === true, tab: 'settings' },
      {
        key: 'pickup',
        label: 'Pickup address for deliveries',
        done: !!String(store?.pickupAddress?.streetAddress || '').trim(),
        tab: 'delivery',
      },
      // `video` is null everywhere the application form is not open (the Phase 0
      // "get ready" checklist), and there it reads as "at launch" rather than
      // as something the vendor has failed to do.
      video === null
        ? { key: 'video', label: 'A short video of your stock (at launch)', done: false, pending: true }
        : { key: 'video', label: 'A short video of your stock', done: video === true },
    )
  }
  return items
}

// ============================================================================
// Phase 2: supplier listings
// ============================================================================

/**
 * Every marketplace field on a product document. ALL are server-only: they are
 * written by /api/marketplace-listing (and, from Phase 3, /api/marketplace-import)
 * on the Admin SDK, locked in firestore.rules against the browser, and stripped
 * from staff writes in store-write.js (which also runs on the Admin SDK and so
 * would otherwise skip the rules).
 *
 * The dropshipper-copy fields are locked NOW, before Phase 3 trusts them, so no
 * vendor can mark one of their own products as "dropshipped" in the meantime.
 */
export const MARKETPLACE_PRODUCT_FIELDS = [
  'marketplaceListed', 'marketplaceStatus', 'wholesalePrice', 'minSellingPrice',
  'marketplaceCategory', 'marketplaceSubcategory', 'nafdacNumber', 'listingVersion',
  'marketplaceListedAt', 'marketplaceUpdatedAt',
  // Phase 3, on a dropshipper's copy
  'dropshipped', 'sourceSupplierId', 'sourceProductId', 'marketplaceImportId', 'termsVersionAccepted',
]

/** The supplier's own switch on a listing. Only 'live' can sell. */
export const LISTING_STATUSES = ['live', 'off']

/** Stock must be a real number to be listed: null means "not tracked". */
export const isTrackedStock = (stock) => typeof stock === 'number' && Number.isFinite(stock)

/** Whether this store may have ANY listing sell right now. */
export function supplierCanSell(store) {
  return supplierStatus(store) === 'approved' && !!hasPro(store)
}

/**
 * Can this listing be sold right now, and if not, why.
 *
 * DERIVED, NEVER STORED. Availability depends on the supplier's plan and
 * approval as well as the product, and plans change in six places (the billing
 * webhook, the expiry cron and four trial actions). Storing a "paused" flag
 * would need every one of them to remember to update every listing, and the
 * one that forgot would leave a downgraded or suspended supplier selling.
 * Reading it from the store every time means a downgrade pauses everything at
 * once and an upgrade brings back exactly what was live (plan decision 13),
 * and a suspension takes everything off in the same instant (decision 11),
 * with nothing to fall out of step.
 *
 * Checked in this order, so the reason shown is the one the supplier must fix
 * first: the whole account before the single product.
 *
 * @returns {{ available: boolean, reason: null|'unlisted'|'suspended'|'not_approved'|'plan'|'off'|'over_limit'|'untracked_stock'|'out_of_stock' }}
 */
export function listingAvailability(product, supplierStore) {
  const no = (reason) => ({ available: false, reason })
  if (!product?.marketplaceListed || product.dropshipped) return no('unlisted')
  const status = supplierStatus(supplierStore)
  if (status === 'suspended') return no('suspended')
  if (status !== 'approved') return no('not_approved')
  if (!hasPro(supplierStore)) return no('plan')
  if (product.marketplaceStatus !== 'live') return no('off')
  // New-supplier cap (utils/supplierLimits.js): a listing whose wholesale price
  // alone is above it cannot be bought even once, so it is not available
  // anywhere, whatever path read it.
  if (!checkListingPrice(supplierStore, product.wholesalePrice).ok) return no('over_limit')
  if (!isTrackedStock(product.stock)) return no('untracked_stock')
  if (product.stock <= 0) return no('out_of_stock')
  return { available: true, reason: null }
}

export const AVAILABILITY_LABELS = {
  unlisted: 'Not on the marketplace',
  suspended: 'Paused: supplier account suspended',
  not_approved: 'Paused: supplier not approved',
  plan: 'Paused: upgrade to Pro to regain access',
  off: 'Switched off',
  over_limit: 'Paused: above the new-supplier limit',
  untracked_stock: 'Paused: set a stock number',
  out_of_stock: 'Out of stock',
}

/**
 * Sellapage's commission: 5% of the WHOLESALE price (plan decision 5).
 * The supplier is paid the full wholesale price; this comes out of the
 * dropshipper's side of the sale (Nex, 2026-09-26; Legal doc A1). Rounded to
 * the kobo, because Paystack flat split shares are in kobo.
 */
export const MARKETPLACE_COMMISSION_RATE = 0.05

export function commissionFor(wholesalePrice) {
  const w = Number(String(wholesalePrice ?? '').replace(/[,\s₦]/g, '')) || 0
  return Math.round(w * MARKETPLACE_COMMISSION_RATE * 100) / 100
}

/** What the import dialog suggests (plan decision J5): the supplier's own retail price. */
export function suggestedPrice(product) {
  const retail = Number(product?.price) || 0
  const min = Number(product?.minSellingPrice) || 0
  return Math.max(retail, min)
}

const money = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(/[,\s₦]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

/**
 * Validates a listing (the extra fields a product needs to go on the
 * marketplace) against the product it is for.
 * @returns {{ ok: true, listing } | { ok: false, errors: { [field]: message } }}
 */
export function cleanListing(raw = {}, product = {}) {
  const errors = {}
  const retail = money(product.price)

  // The product itself first: no point pricing something that cannot be listed.
  if (product.dropshipped) errors.product = "This is another supplier's product. Only your own stock can be listed."
  else if (product.type === 'digital') errors.product = 'Digital products cannot be dropshipped. There is nothing to ship.'
  else if (!(retail > 0)) errors.product = 'Give the product a price in your Products tab first.'
  else if (!(product.imageUrls?.length || product.imageUrl)) errors.product = 'Add at least one photo. Dropshippers sell from your photos.'
  else if (!isTrackedStock(product.stock)) errors.product = 'Set a stock number in your Products tab. Marketplace products need tracked stock so nobody pays for something you do not have.'

  const wholesale = money(raw.wholesalePrice)
  if (!(wholesale > 0)) errors.wholesalePrice = 'Enter the price dropshippers pay you.'
  else if (retail > 0 && wholesale >= retail) errors.wholesalePrice = `It must be below your own price of ₦${retail.toLocaleString('en-NG')}, or dropshippers cannot make anything.`

  const min = money(raw.minSellingPrice)
  if (Number.isNaN(min)) errors.minSellingPrice = 'Enter a number, or leave it empty.'
  else if (min !== null && wholesale > 0 && min < wholesale) errors.minSellingPrice = 'The lowest selling price cannot be below your wholesale price.'

  const cat = findCategory(raw.marketplaceCategory)
  const sub = findSubcategory(raw.marketplaceCategory, raw.marketplaceSubcategory)
  if (!cat || cat.retired) errors.marketplaceCategory = 'Choose a category.'
  else if (!sub || sub.retired) errors.marketplaceSubcategory = 'Choose a subcategory.'

  // 'a1 1234' and 'A1-1234' are the same number; the pack prints the dash.
  let nafdac = String(raw.nafdacNumber || '').toUpperCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  if (sub?.nafdac) {
    if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(nafdac)) errors.nafdacNumber = 'Enter the NAFDAC registration number on the pack.'
  } else {
    nafdac = null
  }

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    listing: {
      wholesalePrice: wholesale,
      minSellingPrice: min,
      marketplaceCategory: cat.id,
      marketplaceSubcategory: sub.id,
      nafdacNumber: nafdac,
    },
  }
}

/**
 * Hides phone numbers, email addresses and links (plan decision 12: deals stay
 * on Sellapage). Used on supplier terms now and on chat messages in Phase 6.
 *
 * Phone numbers are any run of 10 or more digits, allowing the spaces, dots,
 * dashes, brackets and leading + people use to dodge a filter ("0803 123 4567",
 * "+234-803-...". Numbers spelled out in words still get through; the admin
 * report path in Phase 7 is the answer to that, not a cleverer regex.
 */
export function maskContactDetails(text) {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link hidden]')
    .replace(/\b[a-z0-9-]+\.(?:com|ng|net|org|me|io|co|app|store|shop|link|ly|biz|info)(?:\/\S*)?\b/gi, '[link hidden]')
    .replace(/\+?\d(?:[\s().-]*\d){9,}/g, '[number hidden]')
}
