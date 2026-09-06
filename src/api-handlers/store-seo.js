// src/api-handlers/store-seo.js
//
// Owns everything the vendor SEO tab writes, and the URL continuity that keeps
// that SEO working when a store's address changes.
//
// Actions:
//   GET  ?action=get           read the current settings (any plan, so a
//                              downgraded vendor can still SEE their saved work)
//   POST ?action=save          save settings          (Growth+ only)
//   POST ?action=toggle        enable/disable indexing (Growth+ only)
//   POST ?action=change-slug   rename the store URL and remember the old one
//
// TWO THINGS THIS FILE EXISTS TO GET RIGHT
//
// 1. Downgrades must not destroy work. Dropping to Starter turns the feature
//    OFF (the renderer refuses to serve SEO for a Starter plan) but never
//    deletes a single field. Re-upgrading restores everything exactly as it was.
//    Nothing in this file deletes the seo object, and `get` is intentionally
//    ungated so the tab can still show a downgraded vendor what they had.
//
// 2. `previousSlugs` is the reason slug changes are server-side.
//    A vendor renaming chichistore -> chichi-store would otherwise lose every
//    link and every ranking that pointed at the old address. So the old slug is
//    remembered and the renderer 301s it to the new one.
//    That list can NEVER be client-written: a vendor who could set
//    previousSlugs: ['bigpopularstore'] would hijack that address the moment its
//    owner renamed. So the old value is read from Firestore here rather than
//    accepted from the request, and the field is locked in firestore.rules.

import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { RESERVED_SLUGS } from '../utils/reservedSlugs.js'

const PAID_PLANS = new Set(['growth', 'pro', 'premium'])
const MAX_PREVIOUS_SLUGS = 5
const URL_SCHEMES = ['http:', 'https:']

const LIMITS = {
  title: 70,
  tagline: 60,
  description: 160,
  about: 1200,
  keyword: 60,
  keywords: 30,
  faq: 10,
  faqQ: 150,
  faqA: 500,
  areas: 12,
  area: 40,
  links: 8,
  category: 60,
}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

function safeUrl(raw) {
  const v = String(raw ?? '').trim()
  if (!v) return null
  try {
    const u = new URL(v)
    return URL_SCHEMES.includes(u.protocol.toLowerCase()) ? u.toString() : null
  } catch {
    return null
  }
}

/**
 * Everything the vendor can set, normalised and capped.
 *
 * Nothing here is trusted by length or type: the renderer puts this text into a
 * public page and into JSON-LD, so an unbounded `about` would let one vendor
 * bloat every crawl of their page, and a non-array `faq` would throw mid-render.
 */
function sanitizeSeo(input) {
  const b = input && typeof input === 'object' ? input : {}
  return {
    title: clean(b.title, LIMITS.title),
    tagline: clean(b.tagline, LIMITS.tagline),
    description: clean(b.description, LIMITS.description),
    about: clean(b.about, LIMITS.about),
    category: clean(b.category, LIMITS.category),
    // Google Business Profile links. Stored here rather than in a new
    // collection because they are part of the same "how this store is found"
    // record, and they go through the same URL allowlist as socialLinks so a
    // javascript: or data: URL can never be saved and later rendered.
    googleReviewUrl: safeUrl(b.googleReviewUrl) || '',
    googleProfileUrl: safeUrl(b.googleProfileUrl) || '',
    keywords: Array.isArray(b.keywords)
      ? [...new Set(b.keywords.map((k) => clean(k, LIMITS.keyword).toLowerCase()).filter(Boolean))].slice(0, LIMITS.keywords)
      : [],
    serviceAreas: Array.isArray(b.serviceAreas)
      ? [...new Set(b.serviceAreas.map((a) => clean(a, LIMITS.area)).filter(Boolean))].slice(0, LIMITS.areas)
      : [],
    socialLinks: Array.isArray(b.socialLinks)
      ? b.socialLinks.map(safeUrl).filter(Boolean).slice(0, LIMITS.links)
      : [],
    faq: Array.isArray(b.faq)
      ? b.faq
          .map((f) => ({ q: clean(f?.q, LIMITS.faqQ), a: clean(f?.a, LIMITS.faqA) }))
          .filter((f) => f.q && f.a)
          .slice(0, LIMITS.faq)
      : [],
  }
}

/**
 * The vendor's promise to a buyer.
 *
 * Capped hard because it is rendered on a public page and inside JSON-LD: an
 * unbounded headline would let one vendor bloat every crawl of their storefront.
 * `days` is clamped to a year, since a "guarantee" measured in decades is not a
 * promise anyone can hold them to.
 */
function sanitizeGuarantee(input) {
  const b = input && typeof input === 'object' ? input : {}
  const days = Number(b.days)
  return {
    enabled: b.enabled === true,
    headline: clean(b.headline, 140),
    details: clean(b.details, 400),
    days: Number.isFinite(days) && days > 0 ? Math.min(Math.round(days), 365) : null,
    updatedAt: Date.now(),
  }
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/

export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = req.query.action || 'get'

  try {
    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.replace('Bearer ', '').trim()
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!decoded?.uid) return res.status(401).json({ error: 'Unauthorized' })

    // Owner only. The store document id IS the owner uid, so this is ownership
    // by construction. Staff accounts are not built yet; when they are, this is
    // the line that swaps to resolveStoreAccess with a marketing permission.
    const db = getAdminDb()
    const uid = decoded.uid
    const ref = db.collection('stores').doc(uid)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Store not found' })

    const store = snap.data()
    const plan = String(store.plan || 'starter').toLowerCase()
    const isPaid = PAID_PLANS.has(plan)

    // Read stays open on every plan. A downgraded vendor must still be able to
    // see the work they did while paying, otherwise it looks deleted.
    if (action === 'get') {
      return res.status(200).json({
        success: true,
        plan,
        eligible: isPaid,
        // Live only when BOTH the plan allows it and the vendor switched it on.
        active: isPaid && store.seo?.enabled === true,
        seo: store.seo || null,
        guarantee: store.guarantee || null,
        storeName: store.storeName || null,
        previousSlugs: store.previousSlugs || [],
        customDomain: store.customDomain || null,
        customDomainStatus: store.customDomainStatus || null,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    let body = {}
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    // ------------------------------------------------------- save-guarantee
    // Deliberately NOT plan-gated. The vendors who most need a promise to lean
    // on are the new ones with no reviews yet, which is exactly the Starter
    // cohort. Charging for it would withhold the feature from the only people
    // it was designed for.
    if (action === 'save-guarantee') {
      const guarantee = sanitizeGuarantee(body.guarantee)
      if (guarantee.enabled && !guarantee.headline) {
        return res.status(400).json({
          error: 'headline_required',
          message: 'Write the promise before switching it on.',
        })
      }
      await ref.set({ guarantee }, { merge: true })
      return res.status(200).json({ success: true, guarantee })
    }

    // ---------------------------------------------------------------- save
    if (action === 'save') {
      if (!isPaid) {
        return res.status(403).json({
          error: 'plan_required',
          message: 'SEO tools are available on Growth and above. Your saved settings are safe.',
        })
      }
      const seo = sanitizeSeo(body.seo)
      // Preserve the existing toggle unless this request explicitly changes it.
      seo.enabled = body.seo?.enabled === undefined
        ? store.seo?.enabled === true
        : body.seo.enabled === true
      seo.updatedAt = Date.now()

      await ref.set({ seo }, { merge: true })
      return res.status(200).json({ success: true, seo, active: isPaid && seo.enabled })
    }

    // -------------------------------------------------------------- toggle
    if (action === 'toggle') {
      if (!isPaid) {
        return res.status(403).json({
          error: 'plan_required',
          message: 'SEO tools are available on Growth and above.',
        })
      }
      const enabled = body.enabled === true
      await ref.set({ seo: { enabled, updatedAt: Date.now() } }, { merge: true })
      return res.status(200).json({ success: true, enabled, active: isPaid && enabled })
    }

    // --------------------------------------------------------- change-slug
    if (action === 'change-slug') {
      const next = String(body.storeName || '').trim().toLowerCase()

      if (!SLUG_RE.test(next)) {
        return res.status(400).json({
          error: 'invalid_slug',
          message: 'Use 2 to 61 characters: lowercase letters, numbers and hyphens, starting with a letter or number.',
        })
      }
      if (RESERVED_SLUGS.includes(next)) {
        return res.status(400).json({ error: 'reserved_slug', message: 'That address is reserved. Please choose another.' })
      }

      const current = String(store.storeName || '').toLowerCase()
      if (next === current) return res.status(200).json({ success: true, storeName: next, unchanged: true })

      // Taken by a live store?
      const clash = await db.collection('stores').where('storeName', '==', next).limit(1).get()
      if (!clash.empty && clash.docs[0].id !== uid) {
        return res.status(409).json({ error: 'slug_taken', message: 'That store address is already taken.' })
      }

      // Also refuse an address another store still 301s from, otherwise their
      // old links would silently start landing on this store instead.
      const claimed = await db.collection('stores').where('previousSlugs', 'array-contains', next).limit(1).get()
      if (!claimed.empty && claimed.docs[0].id !== uid) {
        return res.status(409).json({ error: 'slug_taken', message: 'That store address is not available.' })
      }

      // The old value comes from Firestore, never from the request, so a caller
      // cannot claim redirects for an address they never owned.
      const previous = Array.isArray(store.previousSlugs) ? store.previousSlugs : []
      const nextPrevious = [current, ...previous.filter((s) => s && s !== current && s !== next)]
        .filter(Boolean)
        .slice(0, MAX_PREVIOUS_SLUGS)

      await ref.set({ storeName: next, previousSlugs: nextPrevious }, { merge: true })

      return res.status(200).json({
        success: true,
        storeName: next,
        previousSlugs: nextPrevious,
        message: `Your store is now at /${next}. The old address will redirect to it.`,
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[store-seo] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
