// src/utils/recaptcha.js
// reCAPTCHA v3 token acquisition.
//
// DESIGN: every failure path returns null rather than throwing. A caller that
// gets null still proceeds - the server decides what to do about a missing
// token. This is deliberate: reCAPTCHA being unreachable (ad blocker, corporate
// proxy, Google outage, or v2 keys configured where v3 is expected) must never
// stop a Nigerian vendor from signing in or recovering their account. Bot
// protection that takes real users offline is worse than no bot protection.
//
// The site key is fetched from /api/public-config because RECAPTCHA_SITE_KEY is
// not VITE_-prefixed and so isn't compiled into the bundle.

let siteKeyPromise = null
let scriptPromise = null

async function getSiteKey() {
  if (!siteKeyPromise) {
    siteKeyPromise = fetch('/api/public-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.recaptchaSiteKey || null)
      .catch(() => null)
  }
  return siteKeyPromise
}

function loadScript(siteKey) {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.grecaptcha?.execute) return resolve(true)

    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    s.async = true
    s.defer = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false) // blocked or offline - proceed without
    document.head.appendChild(s)

    // Don't hang a form submit forever if the script never settles.
    setTimeout(() => resolve(!!window.grecaptcha?.execute), 5000)
  })
  return scriptPromise
}

/**
 * @param {string} action e.g. 'account_recovery_request'
 * @returns {Promise<string|null>} token, or null if unavailable
 */
export async function getRecaptchaToken(action) {
  try {
    const siteKey = await getSiteKey()
    if (!siteKey) return null

    const loaded = await loadScript(siteKey)
    if (!loaded || !window.grecaptcha) return null

    await new Promise((resolve) => window.grecaptcha.ready(resolve))
    // Throws if the configured keys are v2 rather than v3 - caught below, and
    // the caller proceeds tokenless.
    return await window.grecaptcha.execute(siteKey, { action })
  } catch {
    return null
  }
}
