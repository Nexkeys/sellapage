// src/api-handlers/store-design.js
//
// Persistence for the Store Design builder.
//
//   GET  ?action=get   read the layout      (ungated, see below)
//   POST ?action=save  save the layout      (Premium only)
//
// UNGATED READ, GATED WRITE
// Same rule as the SEO tab. A vendor who downgrades must still be able to SEE
// the design they built while paying, otherwise it looks deleted. They just
// cannot edit it or serve it until they upgrade again. Nothing in this file
// deletes a design, ever.
//
// The plan check that decides whether a storefront actually RENDERS the design
// lives in isDesignLive() in src/utils/storeDesign.js, so the dashboard and the
// storefront can never disagree about who is live.
//
// COMMERCE IS UNTOUCHED. This handler writes one presentation object. Orders,
// checkout, delivery and payouts do not read it and are not affected by it.

import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { sanitizeDesign, defaultDesign } from '../utils/storeDesign.js'

const DESIGN_PLANS = new Set(['premium'])

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

    // Owner only: the store document id IS the owner uid, so this is ownership
    // by construction rather than by lookup.
    const db = getAdminDb()
    const ref = db.collection('stores').doc(decoded.uid)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Store not found' })

    const store = snap.data()
    const plan = String(store.plan || 'starter').toLowerCase()
    const eligible = DESIGN_PLANS.has(plan)
    // Which sections this vendor is even allowed to place depends on whether
    // they sell products, services or both.
    const vendorType = String(store.vendorType || 'products').toLowerCase()

    if (action === 'get') {
      return res.status(200).json({
        success: true,
        plan,
        eligible,
        vendorType,
        // Live requires BOTH the plan and the vendor's own switch.
        live: eligible && store.storeDesign?.enabled === true,
        // Normalised on the way out, so a design saved before a field existed
        // (service sections, custom pages, tracking) opens complete instead of
        // showing the vendor an empty editor for it.
        design: store.storeDesign
          ? sanitizeDesign(store.storeDesign, vendorType)
          : defaultDesign(vendorType),
        hasSaved: !!store.storeDesign,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    let body = {}
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    if (action === 'save') {
      if (!eligible) {
        return res.status(403).json({
          error: 'plan_required',
          message: 'Store Design is a Premium feature. Your saved design is safe and returns when you upgrade.',
        })
      }

      // Everything is re-normalised server side. The editor already constrains
      // input, but the editor is the client and cannot be trusted with values
      // that end up as inline styles on a public page.
      const design = sanitizeDesign(body.design, vendorType)
      await ref.set({ storeDesign: design }, { merge: true })

      return res.status(200).json({
        success: true,
        design,
        live: eligible && design.enabled,
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[store-design] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
