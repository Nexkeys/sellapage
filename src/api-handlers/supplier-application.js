// src/api-handlers/supplier-application.js
//
// Dropshipping Marketplace, Phase 1: a vendor applying to become a supplier.
//
//   GET  ?action=status   where this store stands, and every requirement with
//                         a live pass/fail, so the form never lies about what
//                         is missing
//   POST ?action=apply    { videoUrl, notes } submits the application
//   POST ?action=save-terms  { returnWindowDays, changeOfMindShippingPaidBy,
//                         defectReportDays, dispatchDays, warranty, extraTerms }
//                         saves the supplier's terms as a NEW version (Phase 2)
//
// TERMS (plan decision J4). Required before applying, so the admin reviews
// them with the video, and before anything is listed. Stored at
// supplierTerms/{storeId} (current) and supplierTerms/{storeId}/versions/{n}
// (every version, never edited or deleted), all server-only. The store keeps
// `supplierTermsVersion` so any reader knows the current version without the
// extra read. See src/utils/supplierTerms.js for what is fixed by law and what
// the supplier chooses.
//
// WHY THE SERVER OWNS THIS
// `supplierStatus` decides whose products other people's stores are allowed to
// sell. It is written only here and in admin-marketplace.js, and it is locked
// in firestore.rules: a vendor who could set `supplierStatus: 'approved'` from
// the browser console would put unreviewed stock in front of every dropshipper
// on the platform. Every requirement is re-checked here too, never trusted
// from the form, for the same reason.
//
// OWNER ONLY, through resolveStoreAccess like every vendor handler (standing
// convention in Changelog-README.md). 'supplier-hub' is in OWNER_ONLY_TABS, so
// a staff token is refused there: applying commits the store to shipping other
// people's orders, which is the owner's decision (Plan, Part E2).
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, parseJsonBody, getBearerToken } from './_lib/http.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { refuseIfLocked } from './_lib/marketplace-gate.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { readiness, supplierStatus, reapplyAllowedAt, listingAvailability } from '../utils/marketplace.js'
import { cleanTerms, sameTerms, FIXED_CLAUSE } from '../utils/supplierTerms.js'
import { hasAcceptedAgreement, currentAgreementVersion, AGREEMENT_FIELD } from '../utils/marketplaceAgreements.js'
import { supplierLimits } from '../utils/supplierLimits.js'

const termsVersionOf = (store) => (Number.isInteger(store?.supplierTermsVersion) ? store.supplierTermsVersion : 0)

const iso = (v) => {
  const d = v?.toDate?.() || (v ? new Date(v) : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

/**
 * The video must be a Cloudinary video url on OUR account.
 *
 * The browser uploads straight to Cloudinary (unsigned preset) and sends the
 * url back, so this field is attacker-controlled. Without this check it is a
 * hole that puts any url an admin will click - and that the admin panel will
 * embed in a video player - into the review queue.
 */
export function cleanVideoUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return null
  let url
  try { url = new URL(value) } catch { return null }
  if (url.protocol !== 'https:') return null
  if (url.hostname !== 'res.cloudinary.com') return null
  const cloud = String(process.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim()
  // `/<cloud>/video/upload/...` is the only shape accepted. When the cloud name
  // is not configured on this deployment, the path check still holds.
  if (!/^\/[^/]+\/video\/upload\//.test(url.pathname)) return null
  if (cloud && !url.pathname.startsWith(`/${cloud}/`)) return null
  return url.toString()
}

/** Every requirement, checked from the store document, never from the form. */
function requirements(store, videoUrl) {
  const items = readiness(store, 'supply', { video: !!videoUrl })
  // Answered on this screen, like the video, so it has no `tab`.
  items.push({ key: 'terms', label: 'Your supplier terms', done: termsVersionOf(store) > 0 })
  items.push({ key: 'agreement', label: 'Accept the Marketplace Supplier Agreement', done: hasAcceptedAgreement(store, 'supplier') })
  return {
    items: items.map(({ key, label, done, tab }) => ({ key, label, done: !!done, tab: tab || null })),
    ok: items.every((i) => i.done),
  }
}

/** The terms as the browser sees them: the choices, the version and the date. */
function publicTerms(t) {
  if (!t) return null
  return {
    returnWindowDays: t.returnWindowDays,
    changeOfMindShippingPaidBy: t.changeOfMindShippingPaidBy ?? null,
    defectReportDays: t.defectReportDays,
    dispatchDays: t.dispatchDays,
    warranty: t.warranty || '',
    extraTerms: t.extraTerms || '',
    version: t.version || 0,
    updatedAt: iso(t.updatedAt),
  }
}

function statusPayload(storeId, store, extra = {}) {
  const status = supplierStatus(store)
  const reapplyAt = reapplyAllowedAt(store)
  return {
    success: true,
    storeId,
    status,
    appliedAt: iso(store.supplierAppliedAt),
    approvedAt: iso(store.supplierApprovedAt),
    rejectedAt: iso(store.supplierRejectedAt),
    rejectionReason: store.supplierRejectionReason || '',
    suspendedReason: status === 'suspended' ? store.supplierSuspendedReason || '' : '',
    videoUrl: store.supplierVideoUrl || '',
    // A rejected vendor may fix things and apply again, but not in a loop.
    canReapplyAt: reapplyAt ? reapplyAt.toISOString() : null,
    termsVersion: termsVersionOf(store),
    agreement: {
      accepted: Number.isInteger(store[AGREEMENT_FIELD.supplier]) ? store[AGREEMENT_FIELD.supplier] : 0,
      current: currentAgreementVersion('supplier'),
      ok: hasAcceptedAgreement(store, 'supplier'),
    },
    limits: (() => {
      const l = supplierLimits(store)
      // Infinity does not survive JSON; a corrupt counter is shown as "full".
      return { ...l, open: Number.isFinite(l.open) ? l.open : null }
    })(),
    // Why an approved supplier's listings cannot sell right now, if they
    // cannot: 'plan' drives the "upgrade to regain access" banner. Probed with
    // a stand-in product that is otherwise sellable, so only the account-level
    // reasons can come back.
    sellBlockedBy: status === 'approved'
      // wholesalePrice 0 so the per-listing price cap never answers for the
      // whole account (a missing price is read as over the cap, fail closed).
      ? listingAvailability({ marketplaceListed: true, marketplaceStatus: 'live', stock: 1, wholesalePrice: 0 }, store).reason
      : null,
    ...extra,
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
      return res.status(403).json({ error: 'owner_only', message: 'Only the store owner can manage supplier status.' })
    }
    const snap = await db.collection('stores').doc(storeId).get()
    if (!snap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = snap.data() || {}

    // THE LOCK, first, before anything else is read or written. While the
    // marketplace is 'coming_soon' this endpoint does not exist as far as a
    // vendor is concerned.
    if (await refuseIfLocked(res, store)) return

    const action = req.query.action || 'status'

    if (action === 'status') {
      const videoUrl = store.supplierVideoUrl || ''
      const checks = requirements(store, videoUrl)
      // One extra read, only for stores that have saved terms.
      const termsSnap = termsVersionOf(store) > 0
        ? await db.collection('supplierTerms').doc(storeId).get()
        : null
      return res.status(200).json(
        statusPayload(storeId, store, {
          checks: checks.items,
          canApply: checks.ok,
          terms: termsSnap?.exists ? publicTerms(termsSnap.data()) : null,
          fixedClause: FIXED_CLAUSE,
        }),
      )
    }

    // Clickwrap for the Marketplace Supplier Agreement. The record is the
    // evidence (Evidence Act 2011 ss.84 and 93; Cybercrimes Act 2015 s.17), so
    // it is written once per store and version and never edited, and it holds
    // what a court would ask: which text, when, which account, from where, and
    // that the bold clauses (FCCPA s.128) were separately acknowledged.
    if (action === 'accept-agreement' && req.method === 'POST') {
      if (!memoryRateLimit('agreement-accept', storeId, 20, 3600000)) return tooManyRequests(res)
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      const current = currentAgreementVersion('supplier')
      // The browser must say which version it showed. Accepting "whatever is
      // current" would let a stale tab agree to text the person never saw.
      if (Number(body.version) !== current) {
        return res.status(409).json({
          error: 'agreement_changed',
          message: 'The agreement has been updated since this page loaded. Please read the new version.',
          current,
        })
      }
      if (body.readSummary !== true || body.acceptBoldClauses !== true) {
        return res.status(400).json({ error: 'not_acknowledged', message: 'Please tick both boxes to accept.' })
      }
      const recordRef = db.collection('marketplaceAgreements').doc(`${storeId}_supplier_v${current}`)
      const now = new Date()
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(recordRef)
        if (!existing.exists) {
          tx.set(recordRef, {
            storeId,
            kind: 'supplier',
            version: current,
            acceptedAt: now,
            uid: decoded.uid,
            ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
            userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
            readSummary: true,
            acknowledgedBoldClauses: true,
          })
        }
        tx.set(db.collection('stores').doc(storeId), { [AGREEMENT_FIELD.supplier]: current }, { merge: true })
      })
      return res.status(200).json({ success: true, agreement: { accepted: current, current, ok: true } })
    }

    if (action === 'save-terms' && req.method === 'POST') {
      if (!memoryRateLimit('supplier-terms', storeId, 10, 3600000)) return tooManyRequests(res)
      if (supplierStatus(store) === 'suspended') {
        return res.status(403).json({
          error: 'suspended',
          message: 'Your supplier account is suspended, so your terms cannot be changed. Please contact support.',
        })
      }

      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      const cleaned = cleanTerms(body)
      if (!cleaned.ok) {
        return res.status(400).json({ error: 'invalid_terms', message: 'Please check the highlighted fields.', errors: cleaned.errors })
      }

      const termsRef = db.collection('supplierTerms').doc(storeId)
      const storeRef = db.collection('stores').doc(storeId)

      // A transaction, so two quick saves cannot both become "version 3" and
      // leave one of them without a record of what a dropshipper accepted.
      const result = await db.runTransaction(async (tx) => {
        const [freshStore, current] = await Promise.all([tx.get(storeRef), tx.get(termsRef)])
        const version = termsVersionOf(freshStore.data())
        // Saving the same thing again is not a new version: a new version makes
        // every dropshipper re-accept (Phase 3), which must not happen for a
        // double-click.
        if (version > 0 && current.exists && sameTerms(current.data(), cleaned.terms)) {
          return { version, changed: false, terms: current.data() }
        }
        const next = version + 1
        const now = new Date()
        const doc = { ...cleaned.terms, version: next, updatedAt: now, storeId }
        tx.set(termsRef, doc)
        tx.set(termsRef.collection('versions').doc(String(next)), { ...doc, fixedClause: FIXED_CLAUSE })
        tx.set(storeRef, { supplierTermsVersion: next, supplierTermsUpdatedAt: now }, { merge: true })
        return { version: next, changed: true, terms: doc }
      })

      // PHASE 3 NOTE: when `changed` and version > 1, every dropshipper who
      // imported this supplier's products must be told and asked to accept the
      // new version; until they do, their copies are unavailable. There are no
      // imports until Phase 3, so there is nobody to tell yet.

      return res.status(200).json({
        success: true,
        changed: result.changed,
        termsVersion: result.version,
        terms: publicTerms(result.terms),
        fixedClause: FIXED_CLAUSE,
      })
    }

    if (action === 'apply' && req.method === 'POST') {
      // A video review costs a person time, so this is deliberately tight.
      if (!memoryRateLimit('supplier-apply', clientKey(req), 5, 3600000)) return tooManyRequests(res)

      const status = supplierStatus(store)
      if (status === 'pending') {
        return res.status(409).json({
          error: 'already_pending',
          message: 'Your application is already with our team. We will let you know as soon as it is reviewed.',
        })
      }
      if (status === 'approved') {
        return res.status(409).json({ error: 'already_approved', message: 'You are already an approved supplier.' })
      }
      if (status === 'suspended') {
        return res.status(403).json({
          error: 'suspended',
          message: 'Your supplier account is suspended. Please contact support.',
        })
      }
      const reapplyAt = reapplyAllowedAt(store)
      if (reapplyAt && reapplyAt.getTime() > Date.now()) {
        return res.status(429).json({
          error: 'reapply_too_soon',
          message: 'You can apply again 24 hours after a decision. Use the time to fix what was flagged.',
          canReapplyAt: reapplyAt.toISOString(),
        })
      }

      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }

      const videoUrl = cleanVideoUrl(body.videoUrl)
      if (!videoUrl) {
        return res.status(400).json({
          error: 'bad_video',
          message: 'Please upload a short video of your stock before you apply.',
        })
      }

      const checks = requirements(store, videoUrl)
      if (!checks.ok) {
        return res.status(400).json({
          error: 'requirements_not_met',
          message: 'Some requirements are still outstanding.',
          checks: checks.items,
        })
      }

      const notes = String(body.notes || '').trim().slice(0, 1000)
      const appliedAt = new Date()

      await db.collection('stores').doc(storeId).set(
        {
          supplierStatus: 'pending',
          supplierAppliedAt: appliedAt,
          supplierVideoUrl: videoUrl,
          supplierApplicationNotes: notes,
          // A fresh application starts clean: the old reason must not sit next
          // to a pending one.
          supplierRejectionReason: '',
        },
        { merge: true },
      )

      // The admin queue is a query over `stores` (supplierStatus == 'pending'),
      // so there is no second document to keep in step and no extra write.
      const next = {
        ...store,
        supplierStatus: 'pending',
        supplierAppliedAt: appliedAt,
        supplierVideoUrl: videoUrl,
        supplierRejectionReason: '',
      }
      return res.status(200).json(
        statusPayload(storeId, next, { checks: checks.items, canApply: false }),
      )
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[supplier-application] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
