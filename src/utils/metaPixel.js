// src/utils/metaPixel.js
// Meta Pixel loader and event helpers for storefronts.
//
// The pixel belongs to the VENDOR, not to Sellapage. Each store supplies its
// own id (Marketing > Meta Pixel), so events land in that vendor's own Events
// Manager. Nothing here depends on Sellapage's own Meta account standing, which
// matters because that account is currently restricted.
//
// Loaded lazily, only on stores that have configured an id. A store without one
// pays nothing: no script, no request, no cookie.

let loadedPixelId = null

/** Meta pixel ids are numeric. Rejects a pasted snippet, URL or stray text. */
function isValidPixelId(id) {
  return /^\d{10,20}$/.test(String(id || '').trim())
}

/**
 * Injects Meta's base script once per page, then initialises the pixel.
 *
 * Safe to call repeatedly: it returns early if the same id is already live, and
 * every failure is swallowed. A blocked script (ad blockers stop this one very
 * often) must never break a storefront or a checkout.
 */
export function initMetaPixel(pixelId) {
  const id = String(pixelId || '').trim()
  if (!isValidPixelId(id)) return false
  if (typeof window === 'undefined') return false
  if (loadedPixelId === id) return true

  try {
    // The storefront is server rendered (api/storefront-render.js) and already
    // emits the base code plus fbq('init') for stores with a pixel. That exists
    // so Meta's crawler can actually find the pixel in the HTML. When it has
    // run, adopt it rather than initialising a second time.
    if (window.__sellapagePixel === id) {
      loadedPixelId = id
      return true
    }

    if (!window.fbq) {
      // Meta's standard bootstrap, kept close to their published snippet so it
      // stays recognisable to anyone comparing it against their docs.
      const n = (window.fbq = function (...args) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
      })
      if (!window._fbq) window._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []

      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      // Failure is expected and fine: ad blockers block this constantly.
      script.onerror = () => {}
      document.head.appendChild(script)
    }

    window.fbq('init', id)
    loadedPixelId = id
    return true
  } catch {
    return false
  }
}

/**
 * Fires a standard Meta event.
 *
 * Never throws. Tracking is not worth an exception on a page where somebody is
 * trying to buy something.
 */
export function trackPixel(event, params) {
  try {
    if (!loadedPixelId || typeof window === 'undefined' || !window.fbq) return
    if (params) window.fbq('track', event, params)
    else window.fbq('track', event)
  } catch {
    // Deliberately silent.
  }
}

/** True once a pixel is live, so callers can skip building event payloads. */
export function pixelActive() {
  return loadedPixelId !== null
}
