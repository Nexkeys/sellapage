// src/api-handlers/_lib/notification-channels.js
//
// Android notification channels, and the store-wide switches that gate them.
//
// WHY CHANNELS EXIST
// Every push this platform has ever sent went out on the app's `default`
// channel. Android only lets a person mute a CHANNEL, never an individual
// message, so a vendor who silences the 10pm summary also silences the order
// that arrives at noon. The category has to be on the message before the choice
// can exist on the phone.
//
// WHY THE VERSION GATE
// Naming a channelId the installed app never created is undefined behaviour on
// Android, and in practice the notification can be dropped with no error
// anywhere. The app creates these channels from 1.0.2 onward, so anything older
// must keep receiving `default`, which every build since 1.0.1 creates. The
// comparison is numeric per segment, not a string compare: '1.0.10' is newer
// than '1.0.2' and a string compare gets that backwards.
import { FieldValue } from 'firebase-admin/firestore'

// The channels the app creates. `default` is deliberately NOT one of them: it
// always exists, it is the fallback, and it is not a preference key.
export const CHANNEL_KEYS = [
  'orders',
  'bookings',
  'delivery',
  'money',
  'store',
  'account',
  'sella',
  'digests',
]

export const DEFAULT_CHANNEL = 'default'

// First app release that creates the named channels.
export const CHANNELS_FROM_VERSION = '1.0.2'

/**
 * Type to channel. Mirrors section 3 of the app's contract exactly.
 *
 * Anything absent falls back to `default`, which is correct for `broadcast` and
 * for any type a future sender invents before the app knows about it.
 */
export const TYPE_CHANNEL = {
  new_order: 'orders',
  order_delivered: 'orders',
  order_reminder: 'orders',
  abandoned_checkout: 'orders',

  new_booking: 'bookings',
  booking_completed: 'bookings',
  booking_reminder: 'bookings',

  delivery_update: 'delivery',

  payout_received: 'money',
  subscription: 'money',
  plan_expiring: 'money',
  plan_downgraded: 'money',
  referral_upgrade: 'money',
  referral_signup: 'money',

  new_review: 'store',
  new_lead: 'store',
  discount_used: 'store',
  discount_expiring: 'store',
  loyalty_earned: 'store',
  stock_low: 'store',
  team_joined: 'store',
  team_activity: 'store',
  ledger_entry: 'store',

  domain_verified: 'account',
  cac_status: 'account',
  job_status: 'account',
  security_alert: 'account',

  reminder: 'sella',
  sella_reply: 'sella',

  morning_greeting: 'digests',
  evening_summary: 'digests',
  daily_summary: 'digests',
  weekly_summary: 'digests',
  monthly_summary: 'digests',
  yearly_summary: 'digests',
}

// Digests are the one category that defaults to OFF. They are the only push a
// vendor receives without having done anything, so opting in is the honest
// default and it keeps the 10pm summary from being the reason someone disables
// notifications for the whole app.
const DEFAULT_OFF = new Set(['digests'])

export const PREFS_DOC = 'notificationPrefs'

/** The channel a type belongs to, or `default` when it has no category. */
export function channelFor(type) {
  return TYPE_CHANNEL[type] || DEFAULT_CHANNEL
}

/**
 * Numeric version comparison. Returns negative, zero or positive.
 *
 * Each segment is parsed with parseInt, so '1.0.2 (14)' and '1.0.2-beta' both
 * read as 1.0.2 rather than throwing off the compare. A segment that holds no
 * digits at all reads as 0.
 */
export function compareVersions(a, b) {
  const parse = (v) => String(v || '').split('.').map((part) => {
    const n = parseInt(part, 10)
    return Number.isFinite(n) ? n : 0
  })

  const left = parse(a)
  const right = parse(b)
  const length = Math.max(left.length, right.length)

  for (let i = 0; i < length; i++) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Whether this install created the named channels.
 *
 * An empty or non-numeric appVersion returns false. Devices registered before
 * the field was collected have no version, and guessing "new enough" for them
 * is the failure that loses notifications silently.
 */
export function supportsNamedChannels(appVersion) {
  const value = String(appVersion || '').trim()
  if (!value || !/\d/.test(value)) return false
  return compareVersions(value, CHANNELS_FROM_VERSION) >= 0
}

/**
 * Whether a store's switches allow this channel.
 *
 * Unknown and `default` always pass: broadcasts must never be mutable by a
 * store-level switch, which is why `default` is not a preference key.
 */
export function channelAllowed(prefs, channelId) {
  if (!channelId || channelId === DEFAULT_CHANNEL) return true
  const value = prefs?.[channelId]
  if (typeof value === 'boolean') return value
  return !DEFAULT_OFF.has(channelId)
}

function prefsRef(db, storeId) {
  // stores/{id}/private/* is `allow read, write: if false` in firestore.rules,
  // so this is reachable only through the Admin SDK. No rules change was needed
  // to add it, and no client can read another store's switches.
  return db.collection('stores').doc(storeId).collection('private').doc(PREFS_DOC)
}

/**
 * Stored switches for a store. Never throws.
 *
 * Fails OPEN, returning {} so defaults apply. A read failure must not silence
 * a vendor's order notifications; the opposite failure mode (a missed order
 * push because Firestore blipped) is far worse than one unwanted digest.
 */
export async function loadNotificationPrefs(db, storeId) {
  if (!storeId) return {}
  try {
    const snap = await prefsRef(db, storeId).get()
    if (!snap.exists) return {}
    const data = snap.data() || {}
    const out = {}
    for (const key of CHANNEL_KEYS) {
      if (typeof data[key] === 'boolean') out[key] = data[key]
    }
    return out
  } catch (err) {
    console.error('[notification-channels] prefs read failed:', err?.message || err)
    return {}
  }
}

/**
 * Validates a partial switch object from a request body.
 *
 * Unknown keys are ignored rather than rejected, so an app that learns about a
 * channel this server has not shipped yet does not start failing. A non-boolean
 * value IS rejected: 'false' as a string would otherwise read as true and mute
 * nothing while appearing to work.
 */
export function sanitizePrefs(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'prefs must be an object' }
  }

  const prefs = {}
  for (const [key, value] of Object.entries(input)) {
    if (!CHANNEL_KEYS.includes(key)) continue
    if (typeof value !== 'boolean') {
      return { ok: false, error: `prefs.${key} must be true or false` }
    }
    prefs[key] = value
  }

  return { ok: true, prefs }
}

/** Merges a validated partial into the stored set and returns the full result. */
export async function saveNotificationPrefs(db, storeId, partial) {
  await prefsRef(db, storeId).set(
    { ...partial, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  return loadNotificationPrefs(db, storeId)
}
