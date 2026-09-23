// src/api-handlers/usage-report.js
//
// Receives the browser's tally of Firestore reads (see utils/usageClient.js)
// and adds it to the server's counter, so the admin usage card reflects what
// storefronts and dashboards spend, not only what the crons and admin do.
//
// PUBLIC BY NECESSITY, AND THEREFORE UNTRUSTED
// A storefront visitor is anonymous, so this endpoint cannot require auth. That
// means anyone can post numbers at it. Consequences are bounded deliberately:
//   - the only thing it can affect is a usage figure on an admin screen; it
//     touches no vendor data, no money, no plan
//   - per-request counts are capped, so one call cannot claim a million reads
//   - a per-IP hourly cap stops a script inflating the figure all day
//   - it writes to Firestore only when the shared buffer is full, so flooding
//     it cannot burn the write quota it exists to protect
//
// Worst case an attacker makes the card read higher than reality, which is the
// harmless direction: it would cause someone to go looking, not to relax.
import { getAdminDb } from './_lib/firebase-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { meter, flushUsage } from './_lib/usage-meter.js'

// A single page doing more than this is a bug worth capping rather than
// recording faithfully.
const MAX_PER_REQUEST = 3000
const MAX_PER_IP_PER_HOUR = 50000

const ALLOWED_LABELS = new Set([
  'client:storefront',
  'client:dashboard',
  'client:admin',
  'client:site',
  'client:other',
])

// Memory only, per instance. A rate limit that cost a Firestore write per
// request would defeat the purpose of the endpoint.
const perIp = new Map()

function withinIpBudget(ip, count) {
  const now = Date.now()
  const hour = Math.floor(now / 3600000)
  const entry = perIp.get(ip)

  if (!entry || entry.hour !== hour) {
    perIp.set(ip, { hour, total: count })
    // Cheap sweep so a long-lived instance cannot grow this map forever.
    if (perIp.size > 5000) {
      for (const [key, value] of perIp) if (value.hour !== hour) perIp.delete(key)
    }
    return true
  }

  if (entry.total >= MAX_PER_IP_PER_HOUR) return false
  entry.total += count
  return true
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // sendBeacon posts text/plain to avoid a preflight during page unload, so
    // the body arrives as a string more often than not.
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}')
      } catch {
        return res.status(204).end()
      }
    }
    body = body || {}

    const label = ALLOWED_LABELS.has(body.label) ? body.label : 'client:other'
    const reads = Math.min(MAX_PER_REQUEST, Math.max(0, Math.floor(Number(body.reads) || 0)))
    if (!reads) return res.status(204).end()

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown'

    if (!withinIpBudget(ip, reads)) {
      // Silently accepted and dropped. Telling a script it has been rate
      // limited only tells it how to pace itself.
      return res.status(204).end()
    }

    meter.reads(label, reads)
    // Not forced: this writes only once the shared buffer is full, so a busy
    // hour of storefront traffic costs a handful of writes, not one per visit.
    await flushUsage(getAdminDb())

    return res.status(204).end()
  } catch {
    // Never surfaced, never retried. A lost usage number is not worth an error
    // response to a customer's browser.
    return res.status(204).end()
  }
}
