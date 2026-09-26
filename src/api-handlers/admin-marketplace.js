// src/api-handlers/admin-marketplace.js
//
// Admin side of the dropshipping marketplace. Phase 0: the waitlist.
//
//   GET  ?action=waitlist   one merged list: public sign ups (marketplaceWaitlist)
//                           + stores that ticked supply/dropship
//                           (stores.marketplaceInterest), with each store's
//                           readiness so the admin can see who is close to
//                           being able to supply at launch
//   GET  ?action=export     every email on that list
//   POST ?action=delete     { id } removes a PUBLIC sign up (a store's
//                           interest is the vendor's own setting)
//   GET  ?action=access     the stage, whether an env var overrides it, and
//                           every store that has early access
//   POST ?action=set-stage  { stage } coming_soon | testing | live, super_admin
//   GET  ?action=find-store &q=  store id, slug or email, to add a tester
//   POST ?action=set-tester { storeId, on } early access on or off
//   GET  ?action=suppliers &status=  the supplier queue (pending by default)
//   POST ?action=supplier-decision  { storeId, decision, reason } approve /
//                           reject / suspend / unsuspend, with a notification.
// Tab `marketplace`: super_admin and operations (Docs/Dropshipping-Marketplace-Plan.md, Part F).

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors, parseJsonBody } from './_lib/http.js'
import { notifyStore } from './_lib/notifications.js'
import { termsSummary } from '../utils/supplierTerms.js'
import { readInterest, roleFromInterest, readiness, supplierStatus, MARKETPLACE_STAGES } from '../utils/marketplace.js'
import { marketplaceStage, stageOverride, clearStageCache, SETTINGS_DOC } from './_lib/marketplace-gate.js'

const iso = (v) => {
  if (typeof v === 'string') return v
  const d = v?.toDate?.() || (v instanceof Date ? v : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

function storeRow(id, s) {
  const role = roleFromInterest(readInterest(s))
  const supplierChecks = readiness(s, 'supply').filter((i) => !i.pending)
  return {
    id: `store:${id}`,
    kind: 'store',
    storeId: id,
    name: s.businessName || '',
    storeName: s.storeName || '',
    email: s.email || '',
    phone: s.whatsappNumber || '',
    role,
    plan: String(s.plan || 'starter').toLowerCase(),
    checks: Object.fromEntries(supplierChecks.map((i) => [i.key, i.done])),
    // Everything a supplier needs today except the launch-time video.
    supplierReady: supplierChecks.every((i) => i.done),
    createdAt: iso(s.createdAt),
  }
}

const SUPPLIER_VIEWS = ['pending', 'approved', 'rejected', 'suspended', 'all']

/**
 * What each decision does, in one place: which states it is legal from, what
 * the store becomes, and what the vendor is told.
 */
const DECISIONS = {
  approve: {
    from: ['pending'],
    to: 'approved',
    notify: () => ({
      title: 'You are an approved supplier',
      body: 'You can now list products on the Dropshipping Marketplace from your Supplier Hub.',
    }),
  },
  reject: {
    from: ['pending'],
    to: 'rejected',
    notify: (reason) => ({
      title: 'Your supplier application was not approved',
      body: reason || 'Open Supplier Hub to see what to fix.',
    }),
  },
  suspend: {
    from: ['approved'],
    to: 'suspended',
    notify: (reason) => ({
      title: 'Your supplier account is suspended',
      body: reason || 'Your marketplace listings are unavailable. Please contact support.',
    }),
  },
  unsuspend: {
    from: ['suspended'],
    to: 'approved',
    notify: () => ({
      title: 'Your supplier account is active again',
      body: 'Your marketplace listings are back on.',
    }),
  },
}

function supplierRow(id, s) {
  const checks = readiness(s, 'supply').filter((i) => !i.pending)
  return {
    storeId: id,
    name: s.businessName || '',
    storeName: s.storeName || '',
    email: s.email || '',
    phone: s.whatsappNumber || '',
    plan: String(s.plan || 'starter').toLowerCase(),
    status: supplierStatus(s),
    videoUrl: s.supplierVideoUrl || '',
    notes: s.supplierApplicationNotes || '',
    rejectionReason: s.supplierRejectionReason || '',
    suspendedReason: s.supplierSuspendedReason || '',
    checks: Object.fromEntries(checks.map((i) => [i.key, i.done])),
    appliedAt: iso(s.supplierAppliedAt),
    approvedAt: iso(s.supplierApprovedAt),
    rejectedAt: iso(s.supplierRejectedAt),
    termsVersion: Number.isInteger(s.supplierTermsVersion) ? s.supplierTermsVersion : 0,
    terms: null,
  }
}

async function loadAll(db) {
  const [pub, supply, dropship] = await Promise.all([
    db.collection('marketplaceWaitlist').orderBy('createdAt', 'desc').limit(5000).get(),
    db.collection('stores').where('marketplaceInterest.supply', '==', true).limit(5000).get(),
    db.collection('stores').where('marketplaceInterest.dropship', '==', true).limit(5000).get(),
  ])

  const stores = new Map()
  for (const d of [...supply.docs, ...dropship.docs]) stores.set(d.id, storeRow(d.id, d.data()))

  const people = pub.docs.map((d) => {
    const r = d.data()
    return {
      id: `page:${d.id}`,
      kind: 'page',
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      sells: r.sells || '',
      role: r.role || 'supply',
      createdAt: iso(r.createdAt),
    }
  })

  // Stores first (they can act on it soonest), then public sign ups, newest first.
  const byDate = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  return [...[...stores.values()].sort(byDate), ...people.sort(byDate)]
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'marketplace')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'waitlist'

    if (action === 'waitlist' || action === 'export') {
      const all = await loadAll(db)

      if (action === 'export') {
        const emails = [...new Set(all.map((r) => r.email.toLowerCase()).filter(Boolean))]
        return res.status(200).json({ success: true, emails })
      }

      const counts = {
        all: all.length,
        supply: all.filter((r) => r.role === 'supply' || r.role === 'both').length,
        dropship: all.filter((r) => r.role === 'dropship' || r.role === 'both').length,
        stores: all.filter((r) => r.kind === 'store').length,
        page: all.filter((r) => r.kind === 'page').length,
        supplierReady: all.filter((r) => r.kind === 'store' && r.supplierReady && (r.role === 'supply' || r.role === 'both')).length,
      }

      const role = ['supply', 'dropship'].includes(req.query.role) ? req.query.role : null
      const search = String(req.query.search || '').trim().toLowerCase()
      const filtered = all.filter((r) => {
        if (role && r.role !== role && r.role !== 'both') return false
        if (!search) return true
        return [r.name, r.email, r.storeName, r.phone, r.sells].some((v) => String(v || '').toLowerCase().includes(search))
      })

      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
      return res.status(200).json({
        success: true,
        items: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        counts,
      })
    }

    // ------------------------------------------------------------- access
    // The stage, and which stores have early access while it is 'testing'.
    if (action === 'access') {
      const [stage, testers] = await Promise.all([
        marketplaceStage(),
        db.collection('stores').where('marketplaceTester', '==', true).limit(200).get(),
      ])
      return res.status(200).json({
        success: true,
        stage,
        // When the environment variable is set it wins over anything set here,
        // so the panel must say so rather than pretend the buttons work.
        lockedByEnv: stageOverride(),
        canSetStage: admin.role === 'super_admin',
        testers: testers.docs.map((d) => ({
          storeId: d.id,
          name: d.data().businessName || '',
          storeName: d.data().storeName || '',
          email: d.data().email || '',
          plan: String(d.data().plan || 'starter').toLowerCase(),
        })),
      })
    }

    if (action === 'set-stage' && req.method === 'POST') {
      // Opening the marketplace to every vendor is a launch decision, so it is
      // narrower than the rest of this tab: super_admin only.
      if (admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only a super admin can change the stage.' })
      }
      if (stageOverride()) {
        return res.status(409).json({
          error: 'The DROPSHIPPING_STAGE environment variable is set, so it overrides this. Remove it in Vercel first.',
        })
      }
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      if (!MARKETPLACE_STAGES.includes(body.stage)) {
        return res.status(400).json({ error: 'Unknown stage.' })
      }
      await db.collection('platformSettings').doc(SETTINGS_DOC).set(
        { stage: body.stage, updatedAt: new Date(), updatedBy: admin.uid },
        { merge: true },
      )
      clearStageCache()
      return res.status(200).json({ success: true, stage: body.stage })
    }

    // Finds a store to give early access to. Small and exact on purpose: the
    // whole store list is thousands of documents and the Spark read quota is
    // an outage when it runs out.
    if (action === 'find-store') {
      const q = String(req.query.q || '').trim().toLowerCase()
      if (q.length < 2) return res.status(200).json({ success: true, stores: [] })

      const byId = await db.collection('stores').doc(q).get()
      const bySlug = await db.collection('stores').where('storeName', '==', q).limit(5).get()
      const byEmail = await db.collection('stores').where('email', '==', q).limit(5).get()

      const found = new Map()
      for (const d of [...(byId.exists ? [byId] : []), ...bySlug.docs, ...byEmail.docs]) {
        found.set(d.id, {
          storeId: d.id,
          name: d.data().businessName || '',
          storeName: d.data().storeName || '',
          email: d.data().email || '',
          plan: String(d.data().plan || 'starter').toLowerCase(),
          isTester: d.data().marketplaceTester === true,
        })
      }
      return res.status(200).json({ success: true, stores: [...found.values()] })
    }

    if (action === 'set-tester' && req.method === 'POST') {
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      const storeId = String(body.storeId || '').trim()
      if (!storeId) return res.status(400).json({ error: 'storeId is required' })

      const ref = db.collection('stores').doc(storeId)
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Store not found' })

      // Written server-side because `marketplaceTester` is locked in
      // firestore.rules: a store can never switch its own early access on.
      await ref.set({ marketplaceTester: body.on === true }, { merge: true })
      return res.status(200).json({ success: true, storeId, on: body.on === true })
    }

    // -------------------------------------------------- supplier applications
    // One indexed query over `stores`, not a scan: the queue IS the status
    // field, so there is no second collection to keep in step and nothing to
    // go stale between the two.
    if (action === 'suppliers') {
      const wanted = SUPPLIER_VIEWS.includes(req.query.status) ? req.query.status : 'pending'
      const states = wanted === 'all' ? ['pending', 'approved', 'rejected', 'suspended'] : [wanted]
      const snap = await db.collection('stores').where('supplierStatus', 'in', states).limit(300).get()

      const rows = snap.docs.map((d) => supplierRow(d.id, d.data()))

      // The terms are reviewed with the video, so they come with the row. One
      // read per supplier that has saved terms; the queue is small and this
      // tab is opened by people, not by traffic.
      await Promise.all(rows.map(async (r) => {
        if (!(r.termsVersion > 0)) return
        const t = await db.collection('supplierTerms').doc(r.storeId).get()
        if (!t.exists) return
        const data = t.data()
        r.terms = { summary: termsSummary(data), extraTerms: data.extraTerms || '', version: data.version || r.termsVersion }
      }))

      // Oldest application first: a queue is fair or it is not a queue.
      rows.sort((a, b) => String(a.appliedAt || '').localeCompare(String(b.appliedAt || '')))

      return res.status(200).json({ success: true, suppliers: rows, total: rows.length, status: wanted })
    }

    if (action === 'supplier-decision' && req.method === 'POST') {
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }

      const storeId = String(body.storeId || '').trim()
      const decision = String(body.decision || '').trim()
      const reason = String(body.reason || '').trim().slice(0, 500)
      if (!storeId) return res.status(400).json({ error: 'storeId is required' })
      if (!DECISIONS[decision]) return res.status(400).json({ error: 'Unknown decision' })
      // The vendor is shown this, so it is not optional on a no.
      if ((decision === 'reject' || decision === 'suspend') && reason.length < 5) {
        return res.status(400).json({ error: 'Please give a reason. The vendor is shown it.' })
      }

      const ref = db.collection('stores').doc(storeId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Store not found' })
      const store = snap.data() || {}
      const from = supplierStatus(store)

      // A decision only makes sense from certain states. Saying so is better
      // than one admin silently overwriting another's decision.
      if (!DECISIONS[decision].from.includes(from)) {
        return res.status(409).json({
          error: 'This store is "' + from + '", so that decision does not apply to it any more.',
          status: from,
        })
      }

      const now = new Date()
      const patch = { supplierStatus: DECISIONS[decision].to, supplierDecidedBy: admin.uid, supplierDecidedAt: now }
      if (decision === 'approve') {
        patch.supplierApprovedAt = now
        patch.supplierRejectionReason = ''
        patch.supplierSuspendedReason = ''
      }
      if (decision === 'reject') {
        patch.supplierRejectedAt = now
        patch.supplierRejectionReason = reason
      }
      if (decision === 'suspend') {
        patch.supplierSuspendedAt = now
        patch.supplierSuspendedReason = reason
      }
      if (decision === 'unsuspend') {
        patch.supplierSuspendedReason = ''
        patch.supplierApprovedAt = store.supplierApprovedAt || now
      }

      await ref.set(patch, { merge: true })

      // Suspending takes every listing off the marketplace in this same
      // instant (plan decision 11) without touching a single product:
      // availability is worked out from supplierStatus on every read
      // (listingAvailability in utils/marketplace.js). Lifting it brings back
      // exactly what was live, for the same reason.

      const copy = DECISIONS[decision].notify(reason)
      // Never let a push failure lose the decision: it is already written.
      await notifyStore(
        db,
        storeId,
        {
          type: 'supplier_status',
          title: copy.title,
          body: copy.body,
          data: { status: patch.supplierStatus, tab: 'supplier-hub' },
        },
        store,
      )

      return res.status(200).json({ success: true, storeId, status: patch.supplierStatus })
    }

    if (action === 'delete' && req.method === 'POST') {
      let body
      try { body = parseJsonBody(req) || {} } catch { return res.status(400).json({ error: 'Invalid JSON body' }) }
      const id = String(body.id || '')
      if (!id.startsWith('page:')) {
        return res.status(400).json({ error: 'Only public sign ups can be removed here. A store changes its own interest in Settings.' })
      }
      await db.collection('marketplaceWaitlist').doc(id.slice(5)).delete()
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-marketplace] error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
