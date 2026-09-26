// src/api-handlers/_lib/sella-video.js
// Sella Phase 4: short marketing videos (WhatsApp status, Reels, TikTok,
// banners), optionally starting from the vendor's own product photo.
//
// OpenRouter's video API is asynchronous: submit, then poll until done. A
// clip takes one to three minutes, far longer than a chat reply, so each
// video is a background job in _lib/sella-jobs.js: submitted when the vendor
// confirms, checked by the chat poll and the minute cron, copied into our
// Cloudinary when ready, then pushed to the vendor and added to the chat.
//
// MODELS (checked against /api/v1/videos/models):
//   Veo 3.1 Lite first: $0.05/second at 720p with sound, $0.03 without.
//     Durations 4, 6, 8; portrait 9:16 or landscape 16:9 only.
//   Seedance 2.0 Fast as the fallback, and for square video, which Veo
//     does not make.
// A video is by far the most expensive thing Sella does, so it is always
// confirmed first with its estimated credits, and charged at the real cost
// the provider reports once it is finished.

const VIDEOS_URL = 'https://openrouter.ai/api/v1/videos'

export const VIDEO_SHAPES = {
  story: { ratio: '9:16', label: 'portrait (9:16)' },
  landscape: { ratio: '16:9', label: 'landscape (16:9)' },
  square: { ratio: '1:1', label: 'square (1:1)' },
}
export const VIDEO_SECONDS = [4, 6, 8]

// Upper-bound USD per second used for the estimate on the confirm card.
const EST_USD_PER_SECOND = { sound: 0.05, silent: 0.03, square: 0.06 }

function apiKey() {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPEN_ROUTER_API_KEY is not configured')
  return key
}
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey()}`,
  'HTTP-Referer': process.env.APP_URL || 'https://www.sellapage.com.ng',
  'X-Title': 'Sellapage Sella AI',
})

/** Normalises the vendor's request and estimates its cost. */
export function planVideo({ prompt, shape, seconds, sound, photoUrl }) {
  const text = String(prompt || '').trim().slice(0, 1500)
  if (!text) return { ok: false, reason: 'Describe the video you want.' }
  const s = VIDEO_SHAPES[shape] ? shape : 'story'
  const secs = VIDEO_SECONDS.includes(Number(seconds)) ? Number(seconds) : 6
  const withSound = sound !== false
  const rate = s === 'square' ? EST_USD_PER_SECOND.square : withSound ? EST_USD_PER_SECOND.sound : EST_USD_PER_SECOND.silent
  return {
    ok: true,
    plan: { prompt: text, shape: s, seconds: secs, sound: withSound, photoUrl: photoUrl || '', estimatedUsd: Math.round(secs * rate * 1000) / 1000 },
  }
}

function modelsFor(plan) {
  // Veo cannot make square video.
  return plan.shape === 'square'
    ? ['bytedance/seedance-2.0-fast']
    : ['google/veo-3.1-lite', 'bytedance/seedance-2.0-fast']
}

/**
 * Submits the video. Returns the provider job id, or a vendor-facing reason.
 * @returns {Promise<{ok: true, providerId: string, model: string} | {ok: false, message: string}>}
 */
export async function submitVideo(plan) {
  const prompt = `${plan.prompt}\n\nProfessional, well-lit commercial footage for a Nigerian online store. ` +
    (plan.photoUrl ? 'Keep the product from the first frame exactly as it is: same shape, colour, label and text. ' : '') +
    'No watermarks, no brand logos that are not in the photo, no real, identifiable people.'
  for (const model of modelsFor(plan)) {
    try {
      const resp = await fetch(VIDEOS_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          prompt,
          duration: plan.seconds,
          resolution: '720p',
          aspect_ratio: VIDEO_SHAPES[plan.shape].ratio,
          generate_audio: plan.sound,
          // Shape confirmed against the API validator (frame_images must be an array).
          ...(plan.photoUrl ? { frame_images: [{ type: 'image_url', image_url: { url: plan.photoUrl }, frame_type: 'first_frame' }] } : {}),
        }),
        signal: AbortSignal.timeout(30000),
      })
      const json = await resp.json().catch(() => ({}))
      if (resp.ok && json?.id) return { ok: true, providerId: String(json.id), model }
      const msg = String(json?.error?.message || '')
      console.error(`[sella-video] submit ${model} -> ${resp.status}: ${msg.slice(0, 200)}`)
      if (/safety|moderat|policy|violat/i.test(msg)) {
        return { ok: false, message: 'That video was declined by the safety check. Try describing it differently.' }
      }
    } catch (err) {
      console.error(`[sella-video] submit ${model} failed:`, err?.name || err?.message || err)
    }
  }
  return { ok: false, message: 'The video could not be started right now. Please try again in a few minutes.' }
}

/**
 * Checks a submitted video.
 * @returns {Promise<{state: 'running'} | {state: 'done', sourceUrl: string, costUsd: number} | {state: 'failed', message: string, costUsd: number}>}
 */
export async function checkVideo(providerId) {
  try {
    const resp = await fetch(`${VIDEOS_URL}/${encodeURIComponent(providerId)}`, { headers: headers(), signal: AbortSignal.timeout(20000) })
    const json = await resp.json().catch(() => ({}))
    if (!resp.ok) return { state: 'running' } // transient: check again next tick
    const status = String(json.status || '')
    const costUsd = Number(json?.usage?.cost || 0)
    if (status === 'completed') {
      const url = Array.isArray(json.unsigned_urls) ? json.unsigned_urls[0] : ''
      if (url) return { state: 'done', sourceUrl: url, costUsd }
      return { state: 'failed', message: 'The video finished but could not be downloaded.', costUsd }
    }
    if (['failed', 'cancelled', 'expired'].includes(status)) {
      return { state: 'failed', message: 'The video could not be made. You were not charged for it.', costUsd }
    }
    return { state: 'running' }
  } catch {
    return { state: 'running' }
  }
}

/**
 * Downloads a finished video with our API key (its links are not public).
 * Tries the link the status gave, then the job's content endpoint.
 * @returns {Promise<{buffer: Buffer, contentType: string} | null>}
 */
export async function downloadVideo(sourceUrl, providerId) {
  const tries = [sourceUrl, `${VIDEOS_URL}/${encodeURIComponent(providerId)}/content?index=0`].filter(Boolean)
  for (const url of tries) {
    try {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey()}` }, signal: AbortSignal.timeout(90000) })
      if (!resp.ok) { console.error('[sella-video] download', resp.status); continue }
      const buffer = Buffer.from(await resp.arrayBuffer())
      if (buffer.length > 1000) return { buffer, contentType: (resp.headers.get('content-type') || 'video/mp4').split(';')[0] }
    } catch (err) {
      console.error('[sella-video] download failed:', err?.name || err?.message || err)
    }
  }
  return null
}
