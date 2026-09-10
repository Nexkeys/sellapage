// src/utils/tiktokPixel.js
// TikTok Pixel loader and event helpers for storefronts.
//
// The pixel belongs to the VENDOR, not to Sellapage. Each store supplies its
// own id (Dashboard > TikTok Pixel), so events land in that vendor's own TikTok
// Events Manager. Nothing here depends on Sellapage's own TikTok app standing,
// which matters: that app currently holds Login Kit scopes only
// (user.info.basic, user.info.profile, user.info.stats, video.list) and has no
// advertising permission whatsoever. A vendor-supplied pixel sidesteps that
// entirely, exactly as src/utils/metaPixel.js sidesteps Meta's verification.
//
// Loaded lazily, only on stores that have configured an id. A store without one
// pays nothing: no script, no request, no cookie.
//
// TikTok's event vocabulary is NOT Meta's. The two differences that matter:
//   - the purchase event is CompletePayment, not Purchase
//   - deduplication uses a third argument, { event_id }, not a property
// Getting either wrong fails silently, which is the whole reason they are
// named in this comment rather than left to be rediscovered.

let loadedPixelId = null

const SDK_URL = 'https://analytics.tiktok.com/i18n/pixel/events.js'

// The command queue's method list, taken from TikTok's published base code.
// Kept complete rather than trimmed to the two we call, because the SDK replays
// the queue against its own implementation and an unknown method there throws.
const TTQ_METHODS = [
  'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
  'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
  'revokeConsent', 'grantConsent',
]

/**
 * TikTok pixel ids are 20 uppercase alphanumeric characters, e.g.
 * CQVQ8SRC77U1TC4TQD5G.
 *
 * Shape-checked rather than merely "non-empty", for the reason recorded in
 * MetaPixelTab: a loose check lets a mistyped value save happily, the dashboard
 * reports the pixel is live, and the only symptom is an Events Manager that
 * stays empty forever with nothing explaining why. Validating the real shape
 * turns a silent dead end into an error at the moment of pasting.
 */
export function isValidTikTokPixelId(id) {
  return /^[A-Z0-9]{20}$/.test(String(id || '').trim().toUpperCase())
}

/**
 * TikTok's own bootstrap, written out readably instead of pasting their
 * minified blob. Behaviour is theirs; only the formatting is ours, so it stays
 * comparable against their docs.
 */
function bootstrapTtq(win, doc) {
  win.TiktokAnalyticsObject = 'ttq'
  const ttq = (win.ttq = win.ttq || [])

  ttq.methods = TTQ_METHODS
  ttq.setAndDefer = function (target, method) {
    target[method] = function (...args) {
      target.push([method].concat(args))
    }
  }
  for (let i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i])
  }

  ttq.instance = function (id) {
    const inst = (ttq._i && ttq._i[id]) || []
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(inst, ttq.methods[i])
    return inst
  }

  ttq.load = function (id, options) {
    ttq._i = ttq._i || {}
    ttq._i[id] = []
    ttq._i[id]._u = SDK_URL
    ttq._t = ttq._t || {}
    ttq._t[id] = +new Date()
    ttq._o = ttq._o || {}
    ttq._o[id] = options || {}

    const script = doc.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = `${SDK_URL}?sdkid=${encodeURIComponent(id)}&lib=ttq`
    // Failure is expected and fine: ad blockers stop this one constantly.
    script.onerror = () => {}

    const first = doc.getElementsByTagName('script')[0]
    if (first && first.parentNode) first.parentNode.insertBefore(script, first)
    else doc.head.appendChild(script)
  }

  return ttq
}

/**
 * Injects TikTok's base script once per page, then initialises the pixel.
 *
 * Safe to call repeatedly: it returns early if the same id is already live, and
 * every failure is swallowed. A blocked script must never break a storefront or
 * a checkout.
 *
 * Returns true when the pixel is usable, so the caller can decide whether to
 * bother building an event payload.
 */
export function initTikTokPixel(pixelId) {
  const id = String(pixelId || '').trim().toUpperCase()
  if (!isValidTikTokPixelId(id)) return false
  if (typeof window === 'undefined') return false
  if (loadedPixelId === id) return true

  try {
    // The storefront is server rendered (api/storefront-render.js) and already
    // emits the base code plus ttq.load() for stores with a pixel. That exists
    // so TikTok's own detection can find the pixel in the raw HTML. When it has
    // run, adopt it rather than loading a second time, which would double every
    // event this page fires.
    if (window.__sellapageTikTokPixel === id) {
      loadedPixelId = id
      return true
    }

    const ttq = window.ttq && window.ttq.load ? window.ttq : bootstrapTtq(window, document)
    ttq.load(id)
    window.__sellapageTikTokPixel = id
    loadedPixelId = id
    return true
  } catch {
    return false
  }
}

/**
 * Fires a TikTok standard event.
 *
 * `eventId` is TikTok's deduplication key. It is passed as the THIRD argument,
 * not inside the properties object, and TikTok dedupes on it for 48 hours. This
 * is what stops the browser pixel and the server-side Events API counting one
 * purchase twice.
 *
 * Never throws. Tracking is not worth an exception on a page where somebody is
 * trying to buy something.
 */
export function trackTikTok(event, properties, eventId) {
  try {
    if (!loadedPixelId || typeof window === 'undefined' || !window.ttq) return
    if (eventId) window.ttq.track(event, properties || {}, { event_id: String(eventId) })
    else if (properties) window.ttq.track(event, properties)
    else window.ttq.track(event)
  } catch {
    // Deliberately silent.
  }
}

/** Fires TikTok's page view. Separate from track(), same as their own snippet. */
export function trackTikTokPage() {
  try {
    if (!loadedPixelId || typeof window === 'undefined' || !window.ttq) return
    window.ttq.page()
  } catch {
    // Deliberately silent.
  }
}

/** True once a pixel is live, so callers can skip building event payloads. */
export function tiktokPixelActive() {
  return loadedPixelId !== null
}
