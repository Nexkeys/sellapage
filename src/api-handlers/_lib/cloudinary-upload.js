import crypto from 'crypto'

/**
 * Signed server-side upload of a REMOTE url into Cloudinary.
 *
 * Why this exists: TikTok's Display API returns cover_image_url as a signed url
 * carrying an x-expires stamp. TikTok documents that it expires (roughly an
 * hour), which means anything we persist and render later shows a broken image
 * on a live storefront. Re-querying TikTok per page view is not an option: that
 * is a serverless call per image per visitor, and these pages must stay fast.
 *
 * So at sync time we copy the bytes into Cloudinary once and store the
 * permanent res.cloudinary.com url instead. Same CDN the rest of the
 * storefront's images already come from.
 *
 * The public_id is deterministic (store + video), so a vendor tapping Refresh
 * overwrites the same asset rather than growing the Cloudinary account forever.
 */

const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

export function isCloudinaryConfigured() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET)
}

/** Cloudinary signs the sha1 of its params sorted by key, then the secret. */
function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(canonical + API_SECRET).digest('hex')
}

/**
 * Copies one remote image into Cloudinary.
 *
 * Returns the permanent https url, or '' on any failure. Never throws: a cover
 * we could not copy must not take down a vendor's whole video sync.
 */
export async function mirrorRemoteImage(remoteUrl, publicId, { timeoutMs = 15000 } = {}) {
  if (!isCloudinaryConfigured()) return ''
  if (!remoteUrl || !/^https:\/\//i.test(remoteUrl)) return ''

  const timestamp = Math.floor(Date.now() / 1000)
  const signedParams = {
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  }

  const body = new URLSearchParams({
    ...signedParams,
    file: remoteUrl,
    api_key: API_KEY,
    signature: sign(signedParams),
  })

  try {
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(timeoutMs),
      }
    )
    if (!resp.ok) return ''
    const json = await resp.json()
    const url = String(json?.secure_url || '')
    // Belt and braces: only ever hand back a Cloudinary url, so a surprising
    // response body can never inject an arbitrary image host into a storefront.
    return /^https:\/\/res\.cloudinary\.com\//.test(url) ? url : ''
  } catch {
    return ''
  }
}
