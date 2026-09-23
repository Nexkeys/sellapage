// src/api-handlers/admin-firestore-usage.js
//
// Firestore reads, writes and deletes used so far in the current free-tier day,
// for the System Health tab. The Cloudinary card next to it exists because
// Cloudinary publishes a /usage endpoint; Firestore does not, and neither the
// Admin SDK nor any Firebase API reports how much of the quota is gone.
//
// Cloud Monitoring is where those counters live, so this reads them with the
// same service account the rest of the platform already uses.
//
// ONE-OFF SETUP: that service account needs the "Monitoring Viewer" role in
// Google Cloud IAM. Without it every request here comes back 403, which is
// reported as needsPermission rather than dressed up as an outage, because the
// fix is a person clicking a button in IAM, not a server problem.
//
// WHY IT MATTERS: on 2026-09-23 the project reached 45k of its 50k daily reads
// with no warning until Firebase emailed. Running out does not degrade the
// platform, it stops it. This card is the thing that says so a day early.
import { GoogleAuth } from 'google-auth-library'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// Spark plan daily allowances.
const FREE_LIMITS = { reads: 50000, writes: 20000, deletes: 20000 }

const METRICS = {
  reads: 'firestore.googleapis.com/document/read_count',
  writes: 'firestore.googleapis.com/document/write_count',
  deletes: 'firestore.googleapis.com/document/delete_count',
}

// Monitoring has its own request quota, and this panel is refreshed by hand.
// One lookup a minute per warm instance is plenty.
const TTL_MS = 60 * 1000
let cache = { at: 0, payload: null }

let authClient = null
async function getClient() {
  if (authClient) return authClient
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT missing')
  const credentials = JSON.parse(raw)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/monitoring.read'],
  })
  authClient = { client: await auth.getClient(), projectId: credentials.project_id }
  return authClient
}

/**
 * The instant the current free quota day began.
 *
 * Firebase resets Spark quotas at midnight US Pacific, NOT at midnight local
 * time, which in Lagos is 8am or 9am depending on US daylight saving. Counting
 * from Nigerian midnight would show a number that disagrees with the Firebase
 * console by several hours of traffic, which is worse than showing nothing.
 */
function quotaDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  // How far into the Pacific day we are, subtracted from now. Doing it this way
  // means daylight saving is handled by Intl rather than by an offset constant
  // that would be silently wrong for half the year.
  const secondsIn = get('hour') * 3600 + get('minute') * 60 + get('second')
  return new Date(now.getTime() - secondsIn * 1000)
}

async function readMetric(client, projectId, metric, startTime, endTime) {
  const url =
    `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries` +
    `?filter=${encodeURIComponent(`metric.type="${metric}"`)}` +
    `&interval.startTime=${startTime.toISOString()}` +
    `&interval.endTime=${endTime.toISOString()}` +
    `&aggregation.alignmentPeriod=3600s` +
    `&aggregation.perSeriesAligner=ALIGN_SUM` +
    `&aggregation.crossSeriesReducer=REDUCE_SUM`

  const res = await client.request({ url })
  const points = (res.data.timeSeries || []).flatMap((s) => s.points || [])

  const hourly = points
    .map((p) => ({
      at: p.interval?.endTime || null,
      value: Number(p.value?.int64Value || p.value?.doubleValue || 0),
    }))
    .filter((p) => p.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at))

  return { total: hourly.reduce((n, p) => n + p.value, 0), hourly }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'health')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  if (cache.payload && Date.now() - cache.at < TTL_MS && req.query.fresh !== '1') {
    return res.status(200).json({ ...cache.payload, cached: true })
  }

  try {
    const { client, projectId } = await getClient()
    const now = new Date()
    const dayStart = quotaDayStart(now)

    const [reads, writes, deletes] = await Promise.all([
      readMetric(client, projectId, METRICS.reads, dayStart, now),
      readMetric(client, projectId, METRICS.writes, dayStart, now),
      readMetric(client, projectId, METRICS.deletes, dayStart, now),
    ])

    const hoursElapsed = Math.max(0.25, (now - dayStart) / 3600000)
    const hoursLeft = Math.max(0, 24 - hoursElapsed)

    const shape = (kind, result) => {
      const limit = FREE_LIMITS[kind]
      const used = result.total
      const perHour = used / hoursElapsed
      // Straight-line projection. Traffic is not flat, so this is a signal, not
      // a forecast: it answers "if the rest of the day looks like the part we
      // have seen, does this end badly?"
      const projected = Math.round(used + perHour * hoursLeft)
      return {
        used,
        limit,
        percent: Math.min(100, Math.round((used / limit) * 100)),
        perHour: Math.round(perHour),
        projected,
        willExceed: projected > limit,
        hourly: result.hourly,
      }
    }

    // The last full hour against the average of the day, which is how a spike
    // shows up before the daily total looks alarming.
    const lastHourReads = reads.hourly.length ? reads.hourly[reads.hourly.length - 1].value : 0
    const avgHourReads = reads.total / hoursElapsed
    const spiking = avgHourReads > 0 && lastHourReads > avgHourReads * 2 && lastHourReads > 1000

    const payload = {
      success: true,
      plan: 'spark',
      quotaDayStart: dayStart.toISOString(),
      // Stated explicitly because "today" means something different here than
      // it does to anyone reading this in Lagos.
      resetsAt: new Date(dayStart.getTime() + 24 * 3600000).toISOString(),
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      reads: shape('reads', reads),
      writes: shape('writes', writes),
      deletes: shape('deletes', deletes),
      spiking,
      lastHourReads,
    }

    cache = { at: Date.now(), payload }
    return res.status(200).json(payload)
  } catch (err) {
    const status = err?.response?.status
    const message = err?.response?.data?.error?.message || err.message || 'Unknown error'

    if (status === 403) {
      // Not an outage. Someone has to grant one IAM role, once.
      return res.status(200).json({
        success: false,
        needsPermission: true,
        message:
          'The Firebase service account cannot read Cloud Monitoring yet. In Google Cloud IAM, give it the "Monitoring Viewer" role.',
      })
    }

    console.error('[admin-firestore-usage] failed', message)
    return res.status(200).json({ success: false, message })
  }
}
