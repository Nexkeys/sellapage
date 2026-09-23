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
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { notifyStore } from './_lib/notifications.js'
import {
  grantTrial,
  pauseTrial,
  resumeTrial,
  endTrial,
  TRIAL_PLANS,
  MAX_TRIAL_DAYS,
} from './_lib/trials.js'

const iso = (ts) => (ts?.toDate ? ts.toDate().toISOString() : null)
const title = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
const prettyDate = (value) =>
  new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

function emailShell(heading, colour, storeName, bodyHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
      <h2 style="color: ${colour};">${heading}</h2>
      <p>Hello ${escapeHtml(storeName)},</p>
      ${bodyHtml}
      <div style="margin: 25px 0;">
        <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Open your dashboard</a>
      </div>
      <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
    </div>
  `
}

/**
 * Tells the vendor what just happened to their trial, by email and by push.
 *
 * Lives here rather than in _lib/trials.js because that module is imported by
 * expiry-cron and must stay free of the push stack. Never allowed to throw: the
 * plan change has already been written, and a mail provider having a bad minute
 * must not turn a completed action into a 500 that invites a retry.
 */
async function tellVendor(db, storeId, store, { subject, heading, colour, bodyHtml, pushType, pushTitle, pushBody }) {
  const storeName = store.businessName || store.storeName || 'there'
  const email = store.vendorEmail || store.email

  try {
    await notifyStore(db, storeId, {
      type: pushType,
      title: pushTitle,
      body: pushBody,
      data: { trial: true },
    })
  } catch (err) {
    console.error('[admin-trials] push failed', err?.message || err)
  }

  if (!email) return
  try {
    await sendEmail(email, subject, emailShell(heading, colour, storeName, bodyHtml), {
      sender: 'support',
    })
  } catch (err) {
    console.error(`[admin-trials] email failed for ${email}:`, err?.message || err)
  }
}

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
      // Stores that have a trial, found by querying the nested field rather
      // than reading the whole collection and filtering in memory.
      //
      // The scan version cost one read PER STORE on every load and every press
      // of Refresh. On 2026-09-23 this project hit 45k of its 50k free daily
      // reads and the admin console started returning 500s, and panels like
      // this one are why. This costs one read per trial, and there are only
      // ever a handful.
      //
      // Firestore indexes nested fields automatically, so `trial.status` needs
      // no composite index. A store with no trial has no such field and is
      // never returned.
      const snap = await db
        .collection('stores')
        .where('trial.status', 'in', ['active', 'paused', 'ended', 'revoked'])
        .get()
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
          endedMessage: t.endedMessage || '',
          pausedReason: t.pausedReason || '',
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
      result = await pauseTrial(db, storeId, { adminUid: admin.uid, reason: body.reason })
    } else if (action === 'resume') {
      result = await resumeTrial(db, storeId, { adminUid: admin.uid })
    } else if (action === 'revoke') {
      // `message` is shown to the vendor verbatim in the email, so it is their
      // explanation, not an internal note.
      result = await endTrial(db, storeId, {
        reason: 'revoked',
        adminUid: admin.uid,
        message: body.reason,
      })
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

    // Read AFTER the change, for the vendor's name and email only.
    const storeSnap = await db.collection('stores').doc(storeId).get()
    const store = storeSnap.data() || {}
    const reason = String(body.reason || '').slice(0, 300)
    const reasonBlock = (bg, border) =>
      reason
        ? `<p style="background:${bg};border:1px solid ${border};border-radius:8px;padding:12px;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
        : ''
    const backTo =
      result.landedOn === 'starter' ? 'the free Starter plan' : `your ${title(result.landedOn)} plan`

    // A store that silently gains paid features and silently loses them a
    // fortnight later looks like a platform that cannot be trusted with a shop.
    // Resume is not announced separately: the vendor is simply back on the plan
    // the grant email already described.
    if (action === 'grant') {
      await tellVendor(db, storeId, store, {
        subject: `You have ${result.days} days of Sellapage ${title(result.plan)}, free`,
        heading: `Your free ${title(result.plan)} trial has started`,
        colour: '#16a34a',
        pushType: 'subscription',
        pushTitle: `Free ${title(result.plan)} trial started 🎁`,
        pushBody: `${result.days} days of ${title(result.plan)}, free. Ends ${prettyDate(result.endsAt)}.`,
        bodyHtml: `
          <p>We have put your store on <strong>${title(result.plan)}</strong> for <strong>${result.days} days</strong>, free of charge.</p>
          <p>It runs until <strong>${prettyDate(result.endsAt)}</strong>. Nothing is charged and no card is needed. We will remind you 5 days before it ends, and again the day before.</p>
          ${body.note ? `<p style="color:#6b7280;font-size:13px;">Note from our team: ${escapeHtml(String(body.note).slice(0, 300))}</p>` : ''}
          <p>Go and use everything. If it earns its keep, pick the plan up before the end date and nothing changes.</p>
        `,
      })
    } else if (action === 'pause') {
      await tellVendor(db, storeId, store, {
        subject: 'Your Sellapage free trial is on hold',
        heading: 'Your free trial is on hold',
        colour: '#ea580c',
        pushType: 'plan_downgraded',
        pushTitle: 'Your free trial is on hold',
        pushBody: `Your store is on ${backTo} for now. ${result.daysBanked} trial day(s) are saved.`,
        bodyHtml: `
          <p>Your free trial has been paused, and your store is on ${backTo} for now.</p>
          <p><strong>${result.daysBanked} day(s)</strong> of the trial are saved, and nothing you created has been deleted.</p>
          ${reasonBlock('#fff7ed', '#fed7aa')}
          <p>Reply to this email if you think this is a mistake.</p>
        `,
      })
    } else if (action === 'revoke') {
      await tellVendor(db, storeId, store, {
        subject: 'Your Sellapage free trial has been stopped',
        heading: 'Your free trial has been stopped',
        colour: '#dc2626',
        pushType: 'plan_downgraded',
        pushTitle: 'Your free trial has been stopped',
        pushBody: `Your store is now on ${backTo}.`,
        bodyHtml: `
          <p>Your free <strong>${title(result.trialPlan)}</strong> trial has been stopped, and your store is now on ${backTo}.</p>
          ${reasonBlock('#fef2f2', '#fecaca')}
          <p>Nothing you created has been deleted. Anything the higher plan unlocked is hidden for now, and comes straight back on a paid plan.</p>
          <p>Reply to this email if you think this is a mistake.</p>
        `,
      })
    }

    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[admin-trials] failed', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
