// Shared rules for promotional SMS campaigns.
//
// Promotional SMS is not email: every extra character can cost another page,
// per recipient, in real naira, and a badly worded send cannot be recalled. So
// the counting, the audience and the links all live here, tested, rather than
// being worked out in the UI where only the admin's browser would know.
import crypto from 'node:crypto'
import { normaliseNgMobile } from '../../utils/phone.js'
import { sendWindow } from '../../utils/smsWindow.js'

// GSM-03.38, the alphabet a normal SMS is encoded in. Anything outside it (the
// naira sign, curly quotes, emoji) forces the whole message into UCS-2, where a
// page is 70 characters instead of 160. That is why "₦5,000 off" can double the
// cost of a campaign, and why the composer shows it.
const GSM_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
// These cost TWO characters each in GSM-7 (escape + character).
const GSM_EXTENDED = '^{}\\[~]|€'

const GSM_SET = new Set([...GSM_BASIC])
const GSM_EXT_SET = new Set([...GSM_EXTENDED])

export const SEGMENT_GSM_SINGLE = 160
export const SEGMENT_GSM_MULTI = 153
export const SEGMENT_UCS2_SINGLE = 70
export const SEGMENT_UCS2_MULTI = 67

/**
 * How many characters this message really costs, and how many pages Termii
 * will bill for. Mirrors the note in Docs/TERMII_API_DOCS.md: 1 page = 160
 * characters, and special characters drop that to 70.
 */
export function countSms(text) {
  const message = String(text ?? '')
  let unicode = false
  let units = 0

  for (const char of message) {
    if (GSM_SET.has(char)) units += 1
    else if (GSM_EXT_SET.has(char)) units += 2
    else { unicode = true; break }
  }

  if (unicode) {
    // UCS-2 counts UTF-16 code units, so an emoji outside the basic plane
    // costs two. [...message].length would undercount it.
    units = message.length
  }

  const single = unicode ? SEGMENT_UCS2_SINGLE : SEGMENT_GSM_SINGLE
  const multi = unicode ? SEGMENT_UCS2_MULTI : SEGMENT_GSM_MULTI
  const pages = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi)

  return {
    characters: units,
    pages,
    unicode,
    perPage: single,
    remainingInPage: units === 0 ? single : (pages === 1 ? single - units : pages * multi - units),
  }
}

/** Naira per page. Termii bills per page per recipient. */
export const DEFAULT_PAGE_RATE = Number(process.env.TERMII_PAGE_RATE || 5)

export function estimateCost(pages, recipients, rate = DEFAULT_PAGE_RATE) {
  return Math.round(Number(pages) * Number(recipients) * Number(rate) * 100) / 100
}

// ---------------------------------------------------------------- links

const linkSecret = () =>
  process.env.SMS_LINK_SECRET || process.env.CRON_SECRET || process.env.TERMII_API_KEY || 'sellapage-sms'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

function shortHash(value, length) {
  const digest = crypto.createHmac('sha256', linkSecret()).update(String(value)).digest()
  let out = ''
  for (let i = 0; i < length; i++) out += BASE62[digest[i] % BASE62.length]
  return out
}

/**
 * Per recipient codes, with no per recipient documents.
 *
 * A code is <campaign><recipient>: the campaign part finds the campaign, and
 * the recipient part is an HMAC of the store id under that campaign, so the
 * click can be attributed by recomputing it over that campaign's recipients.
 * A campaign of 500 people therefore costs one document, not 500.
 */
export const campaignCode = (campaignId) => shortHash(`c:${campaignId}`, 5)
export const recipientCode = (campaignId, storeId) => shortHash(`r:${campaignId}:${storeId}`, 3)
export const trackingCode = (campaignId, storeId) => campaignCode(campaignId) + recipientCode(campaignId, storeId)
export const splitTrackingCode = (code) => {
  const clean = String(code || '').trim()
  return { campaignPart: clean.slice(0, 5), recipientPart: clean.slice(5) }
}

/**
 * Opt-out token: it identifies the NUMBER, not the store.
 *
 * A number is what a network actually blocks, and the same number can belong to
 * a store, to several stores, or to nobody we know (a test send). Keying on the
 * phone means one tap on "Stop" silences that handset for good, whatever
 * account it is attached to.
 *
 * The number is packed in base62 rather than base64, which turns
 * 2348033004474 into seven characters. That matters: the token rides in every
 * single message, and characters are what an SMS is billed in.
 */
function packDigits(digits) {
  let n = Number(digits)
  if (!Number.isSafeInteger(n) || n <= 0) return ''
  let out = ''
  while (n > 0) {
    out = BASE62[n % 62] + out
    n = Math.floor(n / 62)
  }
  return out
}

function unpackDigits(packed) {
  const raw = String(packed || '')
  if (!raw) return ''
  let n = 0
  for (const char of raw) {
    const value = BASE62.indexOf(char)
    if (value < 0) return ''
    n = n * 62 + value
    if (!Number.isSafeInteger(n)) return ''
  }
  return String(n)
}

const OPT_OUT_SIG_LENGTH = 5

export function optOutToken(phone) {
  const digits = normaliseNgMobile(phone)
  if (!digits) return ''
  return `${shortHash(`o:${digits}`, OPT_OUT_SIG_LENGTH)}${packDigits(digits)}`
}

export function readOptOutToken(token) {
  const raw = String(token || '').trim()
  if (raw.length <= OPT_OUT_SIG_LENGTH) return null
  const signature = raw.slice(0, OPT_OUT_SIG_LENGTH)
  const phone = normaliseNgMobile(unpackDigits(raw.slice(OPT_OUT_SIG_LENGTH)))
  if (!phone || shortHash(`o:${phone}`, OPT_OUT_SIG_LENGTH) !== signature) return null
  return phone
}

export const publicBase = () =>
  (process.env.PUBLIC_APP_URL || 'https://www.sellapage.com.ng').replace(/\/+$/, '')

export const trackedLink = (campaignId, storeId) => `${publicBase()}/r/${trackingCode(campaignId, storeId)}`
export const optOutLink = (phone) => `${publicBase()}/x/${optOutToken(phone)}`

export const LINK_PLACEHOLDER = '{link}'
export const OPT_OUT_SUFFIX = '\nStop: '

/**
 * The exact text one recipient receives. The composer previews this with a
 * sample recipient, so what is counted is what is sent.
 */
export function buildMessage({ body, campaignId, storeId, phone, includeLink, includeOptOut = true }) {
  let text = String(body || '')
  if (includeLink) text = text.split(LINK_PLACEHOLDER).join(trackedLink(campaignId, storeId))
  if (includeOptOut) text += `${OPT_OUT_SUFFIX}${optOutLink(phone)}`
  return text
}

/**
 * Worst case length, used for counting before a campaign has an id. Tracking
 * codes and opt-out tokens are fixed length, so a sample recipient gives the
 * true page count for everyone.
 */
export const SAMPLE_CAMPAIGN_ID = 'sample-campaign-id'
export const SAMPLE_STORE_ID = 'sample-store-id-000000000000'
// Every Nigerian mobile number packs to the same seven characters, so a sample
// number gives the true length for everyone.
export const SAMPLE_PHONE = '2348000000000'

export function previewMessage({ body, includeLink, includeOptOut = true }) {
  return buildMessage({
    body,
    campaignId: SAMPLE_CAMPAIGN_ID,
    storeId: SAMPLE_STORE_ID,
    phone: SAMPLE_PHONE,
    includeLink,
    includeOptOut,
  })
}

// ---------------------------------------------------------------- audience

export const PAID_PLANS = new Set(['growth', 'pro', 'premium'])

/**
 * Who a campaign goes to.
 *
 * Verified phone first: that is the number the vendor proved they own with our
 * own SMS code at signup. Stores from before phone signup fall back to the
 * WhatsApp number on the store. Anyone who opted out is dropped here, not in
 * the UI, so no filter combination can ever reach them.
 */
export function selectRecipients(stores, filters = {}, optedOutPhones = new Set()) {
  const seen = new Set()
  const recipients = []
  const skipped = { optedOut: 0, noPhone: 0, badPhone: 0, duplicate: 0, filtered: 0 }

  for (const store of stores) {
    const plan = String(store.plan || 'starter').toLowerCase()

    if (filters.plans?.length && !filters.plans.includes(plan)) { skipped.filtered += 1; continue }
    if (filters.paidOnly && !PAID_PLANS.has(plan)) { skipped.filtered += 1; continue }
    if (filters.freeOnly && PAID_PLANS.has(plan)) { skipped.filtered += 1; continue }
    if (filters.vendorType && String(store.vendorType || 'products') !== filters.vendorType) { skipped.filtered += 1; continue }
    if (filters.verifiedOnly && !store.verifiedPhone) { skipped.filtered += 1; continue }

    if (store.smsOptOut === true) { skipped.optedOut += 1; continue }

    const raw = store.verifiedPhone || store.whatsappNumber || ''
    if (!raw) { skipped.noPhone += 1; continue }

    const phone = normaliseNgMobile(raw)
    if (!phone) { skipped.badPhone += 1; continue }

    // Checked on the number, after normalising, so it holds whichever store
    // the number is attached to and however the number was typed in.
    if (optedOutPhones.has(phone)) { skipped.optedOut += 1; continue }

    if (seen.has(phone)) { skipped.duplicate += 1; continue }
    seen.add(phone)

    recipients.push({
      storeId: store.id,
      storeName: store.storeName || store.handle || '',
      plan,
      phone,
      source: store.verifiedPhone ? 'verified' : 'whatsapp',
    })
  }

  return { recipients, skipped }
}

// ---------------------------------------------------------------- send window

// The rule lives in utils/smsWindow.js so the admin tab can show exactly what
// the server enforces, rather than a second copy that drifts.
export { sendWindow }
export { LAGOS } from '../../utils/smsWindow.js'

/** Termii takes at most 100 numbers per bulk request. */
export const BATCH_SIZE = 100
export function batchPhones(list, size = BATCH_SIZE) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
