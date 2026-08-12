// src/api-handlers/public-config.js
// Serves public, non-secret client configuration.
//
// WHY AN ENDPOINT rather than an env var: Vite only exposes variables prefixed
// with VITE_ to the browser, and RECAPTCHA_SITE_KEY is configured without that
// prefix. A reCAPTCHA *site* key is public by design (it ships inside the page
// HTML on every site that uses it), so serving it here is safe and avoids
// duplicating the same value into a second, VITE_-prefixed variable that could
// then drift out of sync.
//
// NEVER add a secret to this response. RECAPTCHA_SECRET_KEY stays server-side.
import { applyCors } from './_lib/http.js'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Small and rarely-changing — let the edge cache it so this doesn't add a
  // blocking round-trip to every page load.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  return res.status(200).json({
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null,
  })
}
