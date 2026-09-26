// src/api-handlers/marketplace-listing.js
//
// Dropshipping Marketplace, Phase 2: a supplier putting their products on the
// marketplace. Plan: Docs/Dropshipping-Marketplace-Plan.md, Part G1.
//
//   GET  ?action=mine                 every product of this store with its
//                                     listing and whether it can sell now
//   POST ?action=save   { productId, wholesalePrice, minSellingPrice,
//                         marketplaceCategory, marketplaceSubcategory,
//                         nafdacNumber }   list a product, or edit its listing
//   POST ?action=set-status { productId, on }   the availability switch
//   POST ?action=unlist { productId }  take it off the marketplace. The
//                                     product stays in the store; the prices
//                                     are kept so listing it again is one tap
//
// ONE PRODUCT DOCUMENT. A listing is extra fields on the supplier's own
// stores/{id}/products/{pid}, so the supplier's own sales and every dropshipper
// sale draw on one stock count, which _lib/stock.js already counts down.
//
// WHY THROUGH THE SERVER. Every marketplace field is locked in firestore.rules
// and stripped from staff writes (MARKETPLACE_PRODUCT_FIELDS): the wholesale
// price is what dropshippers pay, and an unvalidated one (0, or above retail)
// is a broken promise to every store that imported it.
//
// NOTHING HERE STORES "PAUSED". Whether a listing can sell right now depends on
// the supplier's plan and approval too, and is worked out on every read
// (listingAvailability in utils/marketplace.js). This handler only stores the
// supplier's own choices.
//
// Owner only (resolveStoreAccess, tab 'supplier-hub', in OWNER_ONLY_TABS).
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, parseJsonBody, getBearerToken } from './_lib/http.js'
import { memoryRateLimit, tooManyRequests } from './_lib/rate-limit.js'
import { refuseIfLocked } from './_lib/marketplace-gate.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import {
  supplierStatus, supplierCanSell, listingAvailability, cleanListing, isTrackedStock,
} from '../utils/marketplace.js'
import { hasAcceptedAgreement } from '../utils/marketplaceAgreements.js'
import { supplierLimits, checkListingPrice } from '../utils/supplierLimits.js'

// Anything that puts stock in front of dropshippers needs the CURRENT
// Marketplace Supplier Agreement. Switching off and unlisting do not: reducing
// exposure must always be possible, agreement or not.
const needsAgreement = (action, body) => action === 'save' || (action === 'set-status' && body?.on === true)

const iso = (v) => {
  const d = v?.toDate?.() || (v ? new Date(v) : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

// Staleness marker for the Phase 3 sync, not a counter anyone reconciles, so
// read-and-add is enough (the product was just read in this request anyway).
const nextVersion = (p) => (Number(p?.listingVersion) || 0) + 1

/** One row of the Supplier Hub list: the product, its listing and its state. */
function row(id, p, store) {
  const availability = listingAvailability(p, store)
  return {
    id,
    name: p.name || '',
    price: Number(p.price) || 0,
    stock: isTrackedStock(p.stock) ? p.stock : null,
    imageUrl: p.imageUrl || p.imageUrls?.[0] || '',
    type: p.type || 'physical',
    dropshipped: p.dropshipped === true,
    listed: p.marketplaceListed === true,
    status: p.marketplaceStatus || null,
    wholesalePrice: p.wholesalePrice ?? null,
    minSellingPrice: p.minSellingPrice ?? null,
    marketplaceCategory: p.marketplaceCategory || '',
    marketplaceSubcategory: p.marketplaceSubcategory || '',
    nafdacNumber: p.nafdacNumber || '',
    listingVersion: p.listingVersion || 0,
    listedAt: iso(p.marketplaceListedAt),
    available: availability.available,
    reason: availability.reason,
  }
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const idToken = getBearerToken(req)
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  try {
    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const db = getAdminDb()
    const storeId = String(req.query.storeId || decoded.uid)
    const access = await resolveStoreAccess(decoded.uid, storeId, 'supplier-hub', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'owner_only', message: 'Only the store owner can manage marketplace listings.' })
    }
    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() || {}

    // THE LOCK first (Part G8).
    if (await refuseIfLocked(res, store)) return

    // Only approved suppliers have listings at all. Reading them is allowed
    // while suspended or downgraded, so the tab can show what is paused and
    // why; changing them is not (below).
    const status = supplierStatus(store)
    if (!['approved', 'suspended'].includes(status)) {
      return res.status(403).json({
        error: 'not_a_supplier',
        message: 'Apply to supply first. Listing opens once our team has approved you.',
        status,
      })
    }

    const action = req.query.action || 'mine'
    const products = storeRef.collection('products')

    if (action === 'mine') {
      // The whole product list, like the Products tab reads it. Bounded, so a
      // huge catalogue cannot turn one tab open into thousands of reads.
      const snap = await products.limit(500).get()
      const rows = snap.docs.map((d) => row(d.id, d.data(), store))
      // Listed first (live before off), then the rest by name.
      rows.sort((a, b) => (Number(b.listed) - Number(a.listed)) || a.name.localeCompare(b.name))
      return res.status(200).json({
        success: true,
        products: rows,
        canSell: supplierCanSell(store),
        limits: (() => { const l = supplierLimits(store); return { ...l, open: Number.isFinite(l.open) ? l.open : null } })(),
        termsVersion: Number.isInteger(store.supplierTermsVersion) ? store.supplierTermsVersion : 0,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!memoryRateLimit('marketplace-listing', storeId, 120, 3600000)) return tooManyRequests(res)

    // Changing listings needs the account to be able to sell. A downgraded or
    // suspended supplier keeps what they had (nothing is deleted) and sees why
    // in the tab, but cannot add to it or switch things on.
    if (!supplierCanSell(store)) {
      const reason = status === 'suspended' ? 'suspended' : 'plan'
      return res.status(403).json({
        error: reason === 'plan' ? 'plan_required' : 'suspended',
        message: reason === 'plan'
          ? 'Upgrade to Pro or Premium to regain access. Your listings are kept exactly as they were.'
          : 'Your supplier account is suspended. Please contact support.',
      })
    }

    let body
    try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
    const productId = String(body.productId || '').trim()
    if (!productId || productId.includes('/')) return res.status(400).json({ error: 'productId is required' })
    const ref = products.doc(productId)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Product not found' })
    const product = snap.data() || {}

    if (needsAgreement(action, body) && !hasAcceptedAgreement(store, 'supplier')) {
      return res.status(409).json({
        error: 'agreement_required',
        message: 'Accept the current Marketplace Supplier Agreement in Supplier Hub before listing or switching products on.',
      })
    }

    if (action === 'save') {
      // Terms come before the first listing (plan decision J4): a dropshipper
      // must be able to read them before they can add anything.
      if (!(Number.isInteger(store.supplierTermsVersion) && store.supplierTermsVersion > 0)) {
        return res.status(409).json({
          error: 'terms_required',
          message: 'Set your supplier terms first. Dropshippers must accept them before selling your products.',
        })
      }

      const cleaned = cleanListing(body, product)
      if (!cleaned.ok) {
        return res.status(400).json({ error: 'invalid_listing', message: 'Please check the highlighted fields.', errors: cleaned.errors })
      }
      // New-supplier cap (utils/supplierLimits.js), from this store's own
      // server-written counters, never from the request.
      const cap = checkListingPrice(store, cleaned.listing.wholesalePrice)
      if (!cap.ok) {
        return res.status(400).json({ error: 'over_limit', message: cap.message, errors: { wholesalePrice: cap.message } })
      }

      const now = new Date()
      const first = product.marketplaceListed !== true
      const patch = {
        ...cleaned.listing,
        marketplaceListed: true,
        // A first listing goes live. An edit keeps the supplier's switch as it
        // was: editing a price must not quietly turn a product back on.
        marketplaceStatus: first ? 'live' : (product.marketplaceStatus === 'off' ? 'off' : 'live'),
        listingVersion: nextVersion(product),
        marketplaceUpdatedAt: now,
        ...(first && !product.marketplaceListedAt ? { marketplaceListedAt: now } : {}),
      }
      await ref.set(patch, { merge: true })

      // PHASE 3 NOTE: every dropshipper copy of this product is synced here, in
      // the same request (plan G3). There are no copies until Phase 3.

      const fresh = (await ref.get()).data()
      return res.status(200).json({ success: true, product: row(productId, fresh, store) })
    }

    if (action === 'set-status') {
      if (product.marketplaceListed !== true) {
        return res.status(409).json({ error: 'not_listed', message: 'List this product first.' })
      }
      const on = body.on === true
      if (on && !isTrackedStock(product.stock)) {
        return res.status(400).json({
          error: 'untracked_stock',
          message: 'Set a stock number for this product in your Products tab before switching it on.',
        })
      }
      await ref.set(
        { marketplaceStatus: on ? 'live' : 'off', listingVersion: nextVersion(product), marketplaceUpdatedAt: new Date() },
        { merge: true },
      )
      // PHASE 3 NOTE: switching off marks every dropshipper copy unavailable in
      // this same request (decision 11). Checkout re-reads this document anyway
      // (Phase 4), so even a copy that missed it cannot be paid for.
      const fresh = (await ref.get()).data()
      return res.status(200).json({ success: true, product: row(productId, fresh, store) })
    }

    if (action === 'unlist') {
      if (product.marketplaceListed !== true) return res.status(200).json({ success: true, product: row(productId, product, store) })
      await ref.set(
        { marketplaceListed: false, marketplaceStatus: 'off', listingVersion: nextVersion(product), marketplaceUpdatedAt: new Date() },
        { merge: true },
      )
      const fresh = (await ref.get()).data()
      return res.status(200).json({ success: true, product: row(productId, fresh, store) })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[marketplace-listing] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
