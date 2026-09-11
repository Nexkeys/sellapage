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
import { sendPushToStore } from './_lib/push-devices.js'
import { sendPush } from './_lib/send-push.js'
import { sendEmail } from './_lib/send-email.js'
import { COLLECTION, markFired, formatWat } from './_lib/reminders.js'

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

const BATCH = 100

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')

  if (!timingSafeMatch(req.headers['x-cron-secret'], process.env.CRON_SECRET)) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const db = getAdminDb()
    const now = Date.now()

    // Single-field range query on a top-level collection: served by the
    // automatic index, so there is no composite index to deploy. See the note
    // at the top of _lib/reminders.js for why this is not a subcollection.
    const due = await db.collection(COLLECTION)
      .where('nextDueAt', '<=', now)
      .orderBy('nextDueAt')
      .limit(BATCH)
      .get()

    let pushed = 0, emailed = 0, skipped = 0, stale = 0

    for (const doc of due.docs) {
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
      const push = await sendPushToStore(r.storeId, {
        title,
        body: r.message,
        data: { type: 'reminder', reminderId: doc.id, storeId: r.storeId },
      })
      if (push.sent > 0) { delivered = 'push'; pushed++ }

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
      if (delivered === 'none' && store.email) {
        const ok = await sendEmail(
          store.email,
          `Reminder: ${String(r.message).slice(0, 60)}`,
          `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
             <h2 style="color: #16a34a;">Reminder</h2>
             <p>Hello ${store.businessName || 'there'},</p>
             <p style="font-size: 16px; background: #f6f6f6; padding: 14px; border-radius: 8px;">${String(r.message)}</p>
             <p style="color: #666; font-size: 13px;">You asked to be reminded at ${formatWat(r.nextDueAt)}.</p>
             <p style="color: #666; font-size: 13px;">Manage your reminders in the Reminders tab of your dashboard.</p>
           </div>`
        )
        if (ok !== false) { delivered = 'email'; emailed++ }
      }

      await markFired(db, doc.ref, r, delivered)
    }

    const summary = { scanned: due.size, pushed, emailed, skipped, stale }
    console.log('[reminders-cron]', JSON.stringify(summary))
    return res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    console.error('[reminders-cron]', err.message)
    return res.status(500).json({ error: 'Reminder cron failed' })
  }
}
