// src/api-handlers/admin-trials.js
//
// Admin control for free trials: see who is on one, grant, pause, resume and
// revoke. All the state changes live in _lib/trials.js, which expiry-cron.js
// shares, so a trial that is revoked here and one that simply runs out leave
// the store in exactly the same shape.
//
// Super admin only. A trial hands a vendor paid features for nothing, so it is
// a money decision, and it is the one admin action that can overwrite a plan
// somebody has actually paid for.
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import {
  grantTrial,
  pauseTrial,
  resumeTrial,
  endTrial,
  TRIAL_PLANS,
  MAX_TRIAL_DAYS,
} from './_lib/trials.js'

const iso = (ts) => (ts?.toDate ? ts.toDate().toISOString() : null)

// Human wording for every refusal _lib/trials.js can return, so the panel never
// has to show a raw code to whoever is on support that day.
const ERRORS = {
  bad_plan: `Pick one of: ${TRIAL_PLANS.join(', ')}.`,
  bad_days: `Length must be between 1 and ${MAX_TRIAL_DAYS} days.`,
  not_found: 'No store with that id.',
  trial_exists: 'This vendor already has a trial. Tick override to replace it.',
  on_paid_plan: 'This vendor is on a paid plan that has not expired. Tick override to replace it.',
  no_active_trial: 'This vendor has no running trial to pause.',
  no_paused_trial: 'This vendor has no paused trial to resume.',
  nothing_left: 'That trial has no days left to resume.',
  no_trial: 'This vendor has no trial to end.',
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'trials')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      // Every store that has ever been granted a trial, newest first. Reading
      // the whole collection matches what expiry-cron and admin-analytics
      // already do at this size; revisit if the store count gets large.
      const snap = await db.collection('stores').get()
      const trials = []

      for (const doc of snap.docs) {
        const d = doc.data() || {}
        if (!d.trial) continue
        const t = d.trial
        const endsMs = t.endsAt?.toMillis?.() || 0
        trials.push({
          storeId: doc.id,
          storeName: d.storeName || '',
          businessName: d.businessName || '',
          vendorEmail: d.vendorEmail || d.email || '',
          status: t.status || 'unknown',
          trialPlan: t.plan || null,
          currentPlan: d.plan || 'starter',
          days: t.days ?? null,
          startedAt: iso(t.startedAt),
          endsAt: iso(t.endsAt),
          daysLeft:
            t.status === 'active' && endsMs
              ? Math.max(0, Math.ceil((endsMs - Date.now()) / (24 * 60 * 60 * 1000)))
              : t.status === 'paused'
                ? Math.ceil((Number(t.remainingMs) || 0) / (24 * 60 * 60 * 1000))
                : 0,
          grantedBy: t.grantedBy || null,
          grantedAt: iso(t.grantedAt),
          endedAt: iso(t.endedAt),
          endedReason: t.endedReason || null,
          landedOn: t.landedOn || null,
          note: t.note || '',
          // What they go back to, so whoever revokes can see it beforehand.
          returnsTo: t.previous?.plan || 'starter',
        })
      }

      trials.sort((a, b) => {
        const rank = { active: 0, paused: 1, ended: 2, revoked: 3 }
        const r = (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
        return r !== 0 ? r : (b.grantedAt || '').localeCompare(a.grantedAt || '')
      })

      return res.status(200).json({
        success: true,
        trials,
        counts: {
          active: trials.filter((t) => t.status === 'active').length,
          paused: trials.filter((t) => t.status === 'paused').length,
          total: trials.length,
        },
      })
    }

    // Lookup by store name, so nobody has to paste a Firestore id by hand.
    if (action === 'find') {
      const q = String(req.query.q || '').trim().toLowerCase()
      if (q.length < 2) return res.status(400).json({ error: 'Type at least 2 characters' })

      const snap = await db
        .collection('stores')
        .where('storeName', '>=', q)
        .where('storeName', '<=', `${q}`)
        .limit(10)
        .get()

      return res.status(200).json({
        success: true,
        stores: snap.docs.map((doc) => {
          const d = doc.data() || {}
          return {
            storeId: doc.id,
            storeName: d.storeName || '',
            businessName: d.businessName || '',
            vendorEmail: d.vendorEmail || d.email || '',
            plan: d.plan || 'starter',
            planEndDate: iso(d.planEndDate),
            trialStatus: d.trial?.status || null,
          }
        }),
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const storeId = String(body.storeId || '').trim()
    if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

    let result
    if (action === 'grant') {
      result = await grantTrial(db, storeId, {
        plan: body.plan,
        days: body.days,
        note: body.note,
        override: body.override === true,
        adminUid: admin.uid,
      })
    } else if (action === 'pause') {
      result = await pauseTrial(db, storeId, { adminUid: admin.uid })
    } else if (action === 'resume') {
      result = await resumeTrial(db, storeId, { adminUid: admin.uid })
    } else if (action === 'revoke') {
      result = await endTrial(db, storeId, { reason: 'revoked', adminUid: admin.uid })
    } else {
      return res.status(400).json({ error: 'Unknown action' })
    }

    if (!result.ok) {
      // A refusal is a business outcome, not a server fault: 200 with
      // success:false keeps 5xx in the Vercel log meaning something is broken.
      return res.status(200).json({
        success: false,
        error: result.error,
        message: ERRORS[result.error] || 'That did not work.',
        ...(result.currentPlan ? { currentPlan: result.currentPlan } : {}),
        ...(result.paidUntil ? { paidUntil: result.paidUntil } : {}),
      })
    }

    // Who did what to whose plan. Worth having when a vendor asks why their
    // features changed.
    console.log(`[admin-trials] ${action} store=${storeId} by=${admin.uid}`)

    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[admin-trials] failed', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
