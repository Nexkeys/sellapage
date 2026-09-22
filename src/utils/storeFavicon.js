// src/utils/storeFavicon.js
//
// Puts the VENDOR's logo in the browser tab on their storefront, instead of
// Sellapage's.
//
// WHY THIS EXISTS
// index.html ships one <link rel="icon"> pointing at Sellapage's own image, and
// every page served from this bundle inherits it. On a vendor's storefront,
// custom domain or /slug, that is Sellapage's brand sitting in the tab, the
// bookmark and the phone home screen of a shop that is not Sellapage. Vendors
// on a custom domain notice it first, because nothing else on the page says
// Sellapage at all.
//
// WHY NOT react-helmet
// The storefront already renders <SEO>, which is Helmet, and a second icon tag
// could be added there. But Helmet APPENDS: the original icon stays in the
// head, two icons are declared, and which one a browser picks is not something
// worth betting a vendor's brand on. Editing the one link element that already
// exists is unambiguous.

const DEFAULT_ICON = '/og-image.png'

/**
 * Cloudinary can resize on delivery, and a favicon is displayed at 16 to 64
 * pixels. Sending a 1200px logo for that wastes the visitor's data on a
 * connection that may be metered, so Cloudinary URLs get a transformation.
 * Anything else is returned untouched: guessing at another host's URL shape
 * risks producing a link that 404s, and a broken favicon is worse than a large
 * one.
 */
export function faviconUrl(rawUrl, size = 64) {
  const url = String(rawUrl || '').trim()
  if (!url) return null
  // Anything that is not plainly http(s) is refused rather than trusted: this
  // value goes straight into a href attribute in the served HTML.
  if (!/^https?:\/\//i.test(url)) return null

  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // c_pad keeps a wide logo whole rather than cropping the middle out of it.
    return url.replace('/upload/', `/upload/w_${size},h_${size},c_pad,b_auto,f_png,q_auto/`)
  }

  return url
}

// 96, not 64, because Google only shows a favicon beside a search result when
// it is square and 48px or a multiple of it. A tab needs 16 to 32, so 96 is
// generous for the browser and is the size that keeps the search listing
// eligible. 180 is Apple's size for an iOS home screen icon, where upscaling a
// small one looks blurry on exactly the screen a vendor shows people.
export const TAB_ICON_SIZE = 96
export const TOUCH_ICON_SIZE = 180

function setLink(rel, href) {
  if (typeof document === 'undefined') return
  // There can be several (index.html ships icon + apple-touch-icon), and a
  // stale one left behind would be the one some browser decides to use.
  const existing = document.querySelectorAll(`link[rel="${rel}"]`)
  if (existing.length === 0) {
    const link = document.createElement('link')
    link.rel = rel
    link.href = href
    document.head.appendChild(link)
    return
  }
  existing.forEach((el, i) => {
    if (i === 0) {
      el.href = href
      el.removeAttribute('type')
    } else {
      el.remove()
    }
  })
}

/**
 * Points the tab icon at the vendor's logo. Call with a falsy url to put
 * Sellapage's back, which matters because this is a single-page app: without
 * the reset, a visitor who lands on a store and then navigates to the Sellapage
 * home page would see the vendor's logo in the tab on Sellapage's own site.
 */
export function setStoreFavicon(logoUrl) {
  setLink('icon', faviconUrl(logoUrl, TAB_ICON_SIZE) || DEFAULT_ICON)
  setLink('apple-touch-icon', faviconUrl(logoUrl, TOUCH_ICON_SIZE) || '/pwa-192x192.png')
}

/** Restores Sellapage's own icon. */
export function resetFavicon() {
  setStoreFavicon(null)
}
