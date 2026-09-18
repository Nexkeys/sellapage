// src/api-handlers/email-broadcast-cron.js
//
// Sends scheduled email campaigns when their time comes, whether or not any
// admin is online. Called every minute by cron-job.org with the same
// x-cron-secret header as the other crons.
//
// cron-job.org rather than the GitHub Actions scheduler, because GitHub can
// start a run many minutes late, and a campaign timed for 00:50 Lagos to use up
// the day's leftover Resend quota before the 01:00 reset must go at 00:50, not
// after the reset.
//
// Cheap when idle: one single-field query that usually matches nothing.
// Bounded: cron-job.org hangs up at 30 seconds, so it stops starting new
// campaigns after 20; anything left goes on the next minute's tick.
import crypto from 'crypto'
import { getAdminDb } from './_lib/firebase-admin.js'
import { CAMPAIGNS, sendNextChunk } from './_lib/email-broadcast.js'

const TIME_BUDGET_MS = 20 * 1000

function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')
  if (!timingSafeMatch(req.headers['x-cron-secret'], process.env.CRON_SECRET)) {
    return res.status(401).send('Unauthorized')
  }

  const startedAt = Date.now()
  const summary = { due: 0, ran: 0, sent: 0, failed: 0, skipped: 0 }

  try {
    const db = getAdminDb()
    // Single field, served by the automatic index. Time is filtered here
    // rather than in the query to avoid a composite index.
    const snap = await db.collection(CAMPAIGNS).where('status', '==', 'scheduled').get()
    const due = snap.docs
      .filter((d) => Number(d.data().scheduledAt) <= Date.now())
      .sort((a, b) => Number(a.data().scheduledAt) - Number(b.data().scheduledAt))
    summary.due = due.length

    for (const doc of due) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break
      const result = await sendNextChunk(db, doc.id, doc.data().scheduledCount || 0, { trigger: 'schedule' })
      summary.ran++
      summary.sent += result.sent || 0
      summary.failed += result.failed || 0
      if (!result.sent) summary.skipped++
      console.log(`[email-broadcast-cron] ${doc.id}:`, JSON.stringify({ sent: result.sent, failed: result.failed, pendingAfter: result.pendingAfter, note: result.reason || result.error || null }))
    }

    return res.status(200).json({ ok: true, ...summary })
  } catch (err) {
    console.error('[email-broadcast-cron]', err)
    return res.status(500).json({ error: 'Email broadcast cron failed' })
  }
}
