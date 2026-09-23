// src/utils/usageClient.js
//
// Browser half of the Firestore usage counter. Counts reads made by this tab
// and reports them to the server in one small batch.
//
// DESIGN RULES, in order of importance:
//   1. Never slow a storefront down. Counting is `n += 1`. Reporting goes out
//      with sendBeacon, which the browser sends in the background and which
//      cannot block navigation or a checkout.
//   2. Never break a page. Every path is wrapped, and a failed report is
//      dropped silently: a usage number is not worth an error in front of a
//      customer.
//   3. Cost nothing in Firestore. The report is an HTTP POST to our own API,
//      which adds it to the server's in-memory tally. No document is written
//      per visitor.
const ENDPOINT = '/api/usage-report'

// Below this, a page's reads are not worth a request of their own. A storefront
// view is typically a handful, so most visits send nothing at all.
const MIN_TO_REPORT = 5
const FLUSH_EVERY_MS = 60 * 1000

let reads = 0
let started = false

/** Where these reads came from, so the admin card can separate a storefront
 *  visit from a vendor working in the dashboard. */
function context() {
  if (typeof window === 'undefined') return 'client:other'
  const path = window.location.pathname || ''
  if (path.startsWith('/dashboard')) return 'client:dashboard'
  if (path.startsWith('/admin')) return 'client:admin'
  if (path === '/' || path.startsWith('/blog') || path.startsWith('/pricing')) return 'client:site'
  return 'client:storefront'
}

function send(useBeacon) {
  if (reads < MIN_TO_REPORT) return
  const body = JSON.stringify({ label: context(), reads })
  reads = 0

  try {
    if (useBeacon && navigator.sendBeacon) {
      // text/plain avoids a CORS preflight, which would often not complete
      // during page unload.
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }))
      return
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // A dropped count is the correct outcome here. Never surfaced.
  }
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true

  // On hide rather than on unload: `pagehide` is the event that actually fires
  // on mobile Safari, where a large share of these vendors and their customers
  // are, and where unload often does not.
  window.addEventListener('pagehide', () => send(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send(true)
  })
  // A dashboard left open all day would otherwise report nothing until closed.
  setInterval(() => send(false), FLUSH_EVERY_MS)
}

export function countReads(n = 1) {
  const count = Number(n)
  if (!Number.isFinite(count) || count <= 0) return
  reads += count
  start()
}

/** Exposed for tests and for a deliberate flush before a full page navigation. */
export function flushClientUsage() {
  send(false)
}
