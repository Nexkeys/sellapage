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

  // Fetch the bytes OURSELVES rather than handing Cloudinary the url.
  //
  // Handing over the url means Cloudinary's servers make a second request to
  // TikTok's CDN, from a different network, with no referrer, possibly from a
  // different region, and seconds-to-minutes later. TikTok refuses some of
  // those, which is why an earlier version of this mirrored most covers but
  // silently left a few pointing at the expiring url. We already hold a url
  // that is valid right now, so the reliable move is to read it here and post
  // the bytes.
  let dataUri
  try {
    const img = await fetch(remoteUrl, { signal: AbortSignal.timeout(timeoutMs) })
    if (!img.ok) {
      console.warn(`[cloudinary] source fetch ${img.status} for ${publicId}`)
      return ''
    }
    const type = (img.headers.get('content-type') || 'image/jpeg').split(';')[0]
    if (!/^image\//.test(type)) {
      console.warn(`[cloudinary] source for ${publicId} was ${type}, not an image`)
      return ''
    }
    const buf = Buffer.from(await img.arrayBuffer())
    // Covers are tens of kilobytes. Anything this large is not a cover, and
    // base64 inflates it by a third before it goes back out.
    if (!buf.length || buf.length > 10 * 1024 * 1024) {
      console.warn(`[cloudinary] source for ${publicId} was ${buf.length} bytes, skipping`)
      return ''
    }
    dataUri = `data:${type};base64,${buf.toString('base64')}`
  } catch (err) {
    console.warn(`[cloudinary] source fetch failed for ${publicId}: ${err.message}`)
    return ''
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signedParams = {
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  }

  const body = new URLSearchParams({
    ...signedParams,
    file: dataUri,
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
    if (!resp.ok) {
      // Never log the body: it would put the signature in the logs.
      console.warn(`[cloudinary] upload ${resp.status} for ${publicId}`)
      return ''
    }
    const json = await resp.json()
    const url = String(json?.secure_url || '')
    // Belt and braces: only ever hand back a Cloudinary url, so a surprising
    // response body can never inject an arbitrary image host into a storefront.
    return /^https:\/\/res\.cloudinary\.com\//.test(url) ? url : ''
  } catch (err) {
    console.warn(`[cloudinary] upload failed for ${publicId}: ${err.message}`)
    return ''
  }
}

/**
 * Uploads image BYTES (a data: URI) into Cloudinary with a signed request.
 *
 * Used for images Sella generates: the image model returns base64, and a
 * vendor's storefront must never point at anything but our own CDN. Same
 * guarantees as mirrorRemoteImage: never throws, returns '' on failure, and
 * only ever hands back a res.cloudinary.com url.
 */
export async function uploadImageData(dataUri, publicId, { folder = '', timeoutMs = 30000 } = {}) {
  if (!isCloudinaryConfigured()) return ''
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(dataUri || ''))) return ''
  // ~15MB of base64 is ~11MB of image, far beyond any generated picture.
  if (dataUri.length > 15 * 1024 * 1024) return ''

  const timestamp = Math.floor(Date.now() / 1000)
  const signedParams = {
    ...(folder ? { folder } : {}),
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  }
  const body = new URLSearchParams({
    ...signedParams,
    file: dataUri,
    api_key: API_KEY,
    signature: sign(signedParams),
  })
  try {
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body, signal: AbortSignal.timeout(timeoutMs),
    })
    if (!resp.ok) {
      // Never log the body: it would put the signature in the logs.
      console.warn(`[cloudinary] data upload ${resp.status} for ${publicId}`)
      return ''
    }
    const url = String((await resp.json())?.secure_url || '')
    return /^https:\/\/res\.cloudinary\.com\//.test(url) ? url : ''
  } catch (err) {
    console.warn(`[cloudinary] data upload failed for ${publicId}: ${err.message}`)
    return ''
  }
}

/**
 * Uploads a finished VIDEO (its bytes) into Cloudinary as a multipart form.
 *
 * Bytes, not a URL: the video provider's download links need our API key, so
 * Cloudinary cannot fetch them itself (tested: a 400). The function downloads
 * the file with the key and hands Cloudinary the bytes. Same guarantees as the
 * image helpers: never throws, returns '' on failure, only a res.cloudinary.com url.
 */
export async function uploadVideoBytes(buffer, contentType, publicId, { folder = '', timeoutMs = 120000 } = {}) {
  if (!isCloudinaryConfigured()) return ''
  if (!buffer?.length || buffer.length > 95 * 1024 * 1024) return ''
  const timestamp = Math.floor(Date.now() / 1000)
  const signedParams = {
    ...(folder ? { folder } : {}),
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  }
  const form = new FormData()
  for (const [k, v] of Object.entries(signedParams)) form.append(k, v)
  form.append('api_key', API_KEY)
  form.append('signature', sign(signedParams))
  form.append('file', new Blob([buffer], { type: contentType || 'video/mp4' }), 'video.mp4')
  try {
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs),
    })
    if (!resp.ok) {
      // Cloudinary's error message is safe to log; the request body is not.
      const msg = await resp.json().then((j) => j?.error?.message || '').catch(() => '')
      console.warn(`[cloudinary] video upload ${resp.status} for ${publicId}: ${String(msg).slice(0, 160)}`)
      return ''
    }
    const url = String((await resp.json())?.secure_url || '')
    return /^https:\/\/res\.cloudinary\.com\//.test(url) ? url : ''
  } catch (err) {
    console.warn(`[cloudinary] video upload failed for ${publicId}: ${err.message}`)
    return ''
  }
}
