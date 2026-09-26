// src/api-handlers/_lib/sella-images.js
// Sella Phase 3: create images, and enhance the vendor's own product photos.
//
// Uses OpenRouter's Images API (POST /api/v1/images), which returns base64.
// Every result is copied into our Cloudinary at once, so nothing a vendor
// sees or attaches to a listing ever points at a third-party host.
//
// TWO JOBS, TWO MODEL ORDERS
//   create  - a new picture from words (a banner, a flyer background, a social
//             post). gpt-image-2 first: cheapest, and the best at spelling
//             words inside the image correctly.
//   enhance - the vendor's REAL photo improved (clean studio background, better
//             light, lifestyle scene). Gemini Flash Image first: it is the one
//             best at keeping the product itself unchanged while the rest of
//             the picture changes. Changing what the product looks like would
//             mislead buyers, so the prompt forbids it too.
//
// Each model accepts different settings (checked against
// /api/v1/images/models), so each call sends only what that model supports.

import crypto from 'crypto'
import { uploadImageData, isCloudinaryConfigured } from './cloudinary-upload.js'

const IMAGES_URL = 'https://openrouter.ai/api/v1/images'
export const MAX_IMAGES_PER_REQUEST = 2
export const MAX_SOURCE_PHOTOS = 4

// Vendor-facing shapes -> each model's aspect ratio value.
export const ASPECTS = { square: '1:1', portrait: '3:4', story: '9:16', landscape: '16:9', wide: '3:2' }

const MODELS = {
  'openai/gpt-image-2': (a) => ({ aspect_ratio: a, quality: 'medium' }),
  'google/gemini-3.1-flash-image': (a) => ({ aspect_ratio: a, resolution: '1K' }),
  'black-forest-labs/flux.2-pro': (a) => ({ aspect_ratio: a, output_format: 'jpeg' }),
}
export const IMAGE_TIERS = {
  create: ['openai/gpt-image-2', 'google/gemini-3.1-flash-image', 'black-forest-labs/flux.2-pro'],
  enhance: ['google/gemini-3.1-flash-image', 'openai/gpt-image-2', 'black-forest-labs/flux.2-pro'],
}

function apiKey() {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPEN_ROUTER_API_KEY is not configured')
  return key
}

// Added to every prompt. Short on purpose: the vendor's words should dominate.
const HOUSE_RULES =
  'Photorealistic, clean, professional e-commerce quality, suited to a Nigerian online store. ' +
  'No watermarks. Do not add any brand logos, trademarks or real people\'s likeness unless the reference photo already shows them.'
const ENHANCE_RULES =
  'Keep the product in the reference photo EXACTLY as it is: same shape, colour, pattern, label, text and proportions. ' +
  'Only change the background, lighting, shadows and setting. Do not add or remove parts of the product.'

/**
 * @param {{prompt: string, aspect?: string, sourceUrls?: string[], count?: number}} opts
 * @returns {Promise<{ok: true, images: Array<{dataUri: string}>, costUsd: number, model: string}
 *                  | {ok: false, message: string, costUsd: number}>}
 */
export async function generateImages({ prompt, aspect = 'square', sourceUrls = [], count = 1 }) {
  const text = String(prompt || '').trim().slice(0, 2000)
  if (!text) return { ok: false, message: 'Describe the image you want.', costUsd: 0 }
  const refs = (Array.isArray(sourceUrls) ? sourceUrls : [])
    .map((u) => String(u || '').trim())
    .filter((u) => /^https:\/\/\S+$/i.test(u))
    .slice(0, MAX_SOURCE_PHOTOS)
  const mode = refs.length ? 'enhance' : 'create'
  const ratio = ASPECTS[aspect] || ASPECTS.square
  const n = Math.min(Math.max(Number(count) || 1, 1), MAX_IMAGES_PER_REQUEST)
  const fullPrompt = `${text}\n\n${mode === 'enhance' ? `${ENHANCE_RULES} ` : ''}${HOUSE_RULES}`

  let costUsd = 0
  let lastError = 'The image could not be made right now. Please try again.'
  for (const model of IMAGE_TIERS[mode]) {
    const images = []
    // Most image models make one picture per call; asking twice is simpler
    // and more portable than relying on each model's own `n` limit.
    for (let i = 0; i < n; i++) {
      try {
        const resp = await fetch(IMAGES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey()}`,
            'HTTP-Referer': process.env.APP_URL || 'https://www.sellapage.com.ng',
            'X-Title': 'Sellapage Sella AI',
          },
          body: JSON.stringify({
            model,
            prompt: fullPrompt,
            n: 1,
            ...MODELS[model](ratio),
            // Shape confirmed against the API validator: plain URL strings are rejected.
            ...(refs.length ? { input_references: refs.map((url) => ({ type: 'image_url', image_url: { url } })) } : {}),
          }),
          signal: AbortSignal.timeout(90000),
        })
        const json = await resp.json().catch(() => ({}))
        costUsd += Number(json?.usage?.cost || 0)
        if (!resp.ok) {
          const msg = String(json?.error?.message || '')
          console.error(`[sella-images] ${model} -> ${resp.status}: ${msg.slice(0, 200)}`)
          // A refusal by the model's safety filter will be refused by the
          // next model too, and the vendor should hear why, not wait longer.
          if (/safety|moderat|policy|violat/i.test(msg)) {
            return { ok: false, message: 'That request was declined by the image safety check. Try describing it differently.', costUsd }
          }
          lastError = 'The image could not be made right now. Please try again.'
          break // try the next model
        }
        const item = json?.data?.[0]
        if (!item?.b64_json) break
        const type = /^image\/(png|jpeg|webp)$/.test(item.media_type || '') ? item.media_type : 'image/png'
        images.push({ dataUri: `data:${type};base64,${item.b64_json}` })
      } catch (err) {
        console.error(`[sella-images] ${model} failed:`, err?.name || err?.message || err)
        break
      }
    }
    if (images.length) return { ok: true, images, costUsd, model, mode }
  }
  return { ok: false, message: lastError, costUsd }
}

/** Copies generated images to Cloudinary. Returns the https URLs that succeeded. */
export async function storeImages(storeId, images) {
  if (!isCloudinaryConfigured()) return []
  const urls = []
  for (const img of images) {
    const id = `${String(storeId).replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const url = await uploadImageData(img.dataUri, id, { folder: 'sellapage/sella-generated' })
    if (url) urls.push(url)
  }
  return urls
}
