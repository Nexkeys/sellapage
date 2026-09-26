// src/api-handlers/reminders-cron.js
// Fires vendor reminders that have come due. Triggered by an external
// cron-job.org job, the same pattern as expiry-cron.js and
// booking-reminder-cron.js (this project has no Vercel Cron, so scheduling
// lives outside the codebase).
//
// Suggested schedule: every 5 minutes. The scan is a single indexed range query
// regardless of how many stores exist, so the cost of running it often is
// negligible and it keeps reminder delivery close to the minute the vendor
// asked for.

import crypto from 'crypto'
import { getAdminDb } from './_lib/firebase-admin.js'
import { notifyStore } from './_lib/notifications.js'
import { sendPush } from './_lib/send-push.js'
import { sendStoreEmail } from './_lib/store-emails.js'
import { COLLECTION, markFired, formatWat } from './_lib/reminders.js'
import { tickDueJobs } from './_lib/sella-jobs.js'
import { waitUntil } from '@vercel/functions'

// Time Sella background jobs may use after the cron has answered. Well under
// the 300s function ceiling, and short enough that the next minute's tick
// takes over rather than two long runs stacking up.
const JOBS_BUDGET_MS = 100000

// Constant-time secret comparison - a plain !== leaks how many leading bytes of
// a guess were correct.
function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// A reminder that is days late is noise, not a reminder. If the cron was down
// or a store was unreachable, drop anything older than this rather than
// delivering a stale alert at 3am.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000

// cron-job.org caps its request timeout at 30 seconds, and that is a hard
// ceiling we cannot raise - Vercel's 60s maxDuration is irrelevant, because the
// caller has already hung up and marked the job failed. So the run is bounded
// by TIME, not by a guessed row count: whatever is left is simply picked up on
// the next tick a minute later. A count alone cannot be safe here because the
// per-reminder cost varies wildly - a store with a device token is one fast FCM
// call, while a store without one falls through to email, which is far slower,
// and most stores currently have no token at all.
const TIME_BUDGET_MS = 20000
const BATCH = 25

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')

  if (!timingSafeMatch(req.headers['x-cron-secret'], process.env.CRON_SECRET)) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const db = getAdminDb()
    const startedAt = Date.now()
    const now = startedAt

    // Single-field range query on a top-level collection: served by the
    // automatic index, so there is no composite index to deploy. See the note
    // at the top of _lib/reminders.js for why this is not a subcollection.
    const due = await db.collection(COLLECTION)
      .where('nextDueAt', '<=', now)
      .orderBy('nextDueAt')
      .limit(BATCH)
      .get()

    let pushed = 0, emailed = 0, skipped = 0, stale = 0, muted = 0

    let ranOut = false

    for (const doc of due.docs) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) { ranOut = true; break }
      const r = doc.data()

      if (r.enabled === false) { skipped++; continue }

      if (now - (r.nextDueAt || now) > STALE_AFTER_MS) {
        await markFired(db, doc.ref, r, 'stale')
        stale++
        continue
      }

      const storeSnap = await db.collection('stores').doc(String(r.storeId)).get()
      if (!storeSnap.exists) {
        // The store is gone; disarm rather than retrying forever.
        await doc.ref.delete()
        skipped++
        continue
      }
      const store = storeSnap.data()
      const title = `Reminder from ${store.sellaAiName || 'Sella'}`

      let delivered = 'none'

      // PRIMARY: the devices registry. This is the path that reaches the mobile
      // app - it is multi-device, it prunes dead tokens, and it carries an
      // android block that _lib/send-push.js does not. stores.fcmToken is the
      // deprecated, world-readable field that devices/ was built to replace.
      //
      // notifyStore rather than a bare sendPushToStore, so the reminder also
      // leaves a record in the bell. Before this a fired reminder pushed and
      // then vanished: tapping it in the app had no entry to open.
      //
      // WHO RECEIVES IT: the owner, plus whoever created it. Sella records the
      // real caller as createdBy.uid (sella-ai.js builds the actor from
      // decoded.uid), so a staff member who asks for a reminder gets their own
      // reminder. Other staff do not. The owner is always a legitimate
      // recipient because the Reminders tab already shows the owner every
      // reminder on the store, which is also why the fallbacks below, which go
      // to the owner's legacy token and email, remain correct.
      const createdByUid = r.createdBy?.uid || null
      const push = await notifyStore(db, r.storeId, {
        type: 'reminder',
        title,
        body: r.message,
        data: {
          reminderId: doc.id,
          storeId: r.storeId,
          ...(createdByUid ? { createdByUid } : {}),
        },
      }, store, { allowUids: createdByUid ? [createdByUid] : [] })
      if (push.sent > 0) { delivered = 'push'; pushed++ }
      // A muted Sella channel is a decision, not a delivery failure. Without
      // this the fallbacks below would route around the vendor's own switch and
      // put the reminder in their inbox instead, which is worse than the push
      // they turned off.
      else if (push.skipped === 'prefs') { delivered = 'muted'; muted++ }

      // FALLBACK 1: the legacy token, for vendors who registered before the
      // devices registry existed and have not opened the app since.
      if (delivered === 'none' && store.fcmToken) {
        const ok = await sendPush(store.fcmToken, title, r.message, {
          type: 'reminder', reminderId: doc.id, storeId: r.storeId,
        })
        if (ok) { delivered = 'push-legacy'; pushed++ }
      }

      // FALLBACK 2: email. Push reaches nobody who has not granted permission,
      // and a reminder that silently never arrives is worse than no feature. This
      // fires only when both push paths found no device, so it never duplicates.
      if (delivered === 'none') {
        // The owner, plus the staff member who asked for this reminder if it
        // was one of theirs. No tab is named: Reminders is not a role tab, so
        // it reaches that person by uid or nobody.
        const mail = await sendStoreEmail(
          db, r.storeId, [],
          `Reminder: ${String(r.message).slice(0, 60)}`,
          `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
             <h2 style="color: #16a34a;">Reminder</h2>
             <p>Hello ${store.businessName || 'there'},</p>
             <p style="font-size: 16px; background: #f6f6f6; padding: 14px; border-radius: 8px;">${String(r.message)}</p>
             <p style="color: #666; font-size: 13px;">You asked to be reminded at ${formatWat(r.nextDueAt)}.</p>
             <p style="color: #666; font-size: 13px;">Manage your reminders in the Reminders tab of your dashboard.</p>
           </div>`,
          { sender: 'support', store, extraUids: createdByUid ? [createdByUid] : [] },
        )
        if (mail.sent) { delivered = 'email'; emailed++ }
      }

      await markFired(db, doc.ref, r, delivered)
    }

    // SELLA BACKGROUND JOBS ride on this same minute tick (a second
    // cron-job.org job would work too, but one fewer thing to configure is one
    // fewer thing to forget). They run AFTER the response, via waitUntil,
    // because one chunk of an import can include a model call that writes
    // descriptions, and that can outlast cron-job.org's hard 30 second hang-up.
    // Answering first keeps the cron green; Fluid compute keeps the function
    // alive to finish. Leases in _lib/sella-jobs.js make overlapping minutes
    // harmless. Never allowed to affect the reminders result.
    waitUntil(
      tickDueJobs(db, Date.now() + JOBS_BUDGET_MS)
        .then((j) => { if (j.ticked) console.log('[reminders-cron] sella jobs', JSON.stringify(j)) })
        .catch((err) => console.error('[reminders-cron] sella jobs tick failed:', err.message)),
    )

    const summary = { scanned: due.size, pushed, emailed, skipped, stale, muted, ranOut, ms: Date.now() - startedAt }
    console.log('[reminders-cron]', JSON.stringify(summary))
    return res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    console.error('[reminders-cron]', err.message)
    return res.status(500).json({ error: 'Reminder cron failed' })
  }
}
