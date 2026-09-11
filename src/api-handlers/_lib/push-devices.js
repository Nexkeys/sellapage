// src/api-handlers/_lib/push-devices.js
//
// The device registry, and the only place that sends push to more than one
// recipient.
//
// WHY THIS EXISTS
// Push tokens used to live in a single `fcmToken` string on stores/{storeId}.
// That had three faults, and they all collapse into this one file:
//
//   1. ONE DEVICE PER VENDOR. A string is last-writer-wins, so a vendor with a
//      phone and a tablet silently kept only whichever registered most recently.
//   2. STAFF RECEIVED NOTHING. The write was a client SDK call gated by
//      `request.auth.uid == storeId`, and a staff uid never equals the store id,
//      so it failed silently for every staff account.
//   3. NO PRE-LOGIN TOKEN. There is no storeId before sign-in, so a token could
//      not be stored at all, which is what blocked asking for notification
//      permission on first app open.
//
// It also moves tokens OFF stores/{storeId}, which is `allow read: if true`
// because public storefronts read it. Every vendor's push token has been world
// readable. Not directly exploitable without the server credential, but it is
// device data on a public document and it does not belong there.
//
// The legacy `fcmToken` field is deliberately still written by the web client
// and still read by the six original call sites. This registry runs alongside
// it until coverage is good, then those sites move to sendPushToStore().
import crypto from 'crypto'
import { getMessaging } from 'firebase-admin/messaging'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getFirebaseAdminApp } from './firebase-admin.js'

export const DEVICES = 'devices'

// FCM refuses more than 500 tokens in one multicast.
const MULTICAST_CHUNK = 500

// FCM's way of saying "this token is gone". Anything else (a network blip, an
// internal error) is transient and must NOT disable a live device.
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

/**
 * Document id is the SHA-256 of the token.
 *
 * Deterministic on purpose: re-registering the same token updates one document
 * instead of accumulating a new row per app launch, and finding a token's row
 * needs no query at all. Hex is 64 chars, far inside Firestore's id limits, and
 * hashing means the raw token is not sitting in a document path.
 */
export function deviceIdFor(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

/**
 * Upserts a device.
 *
 * `storeId` is ALWAYS derived by the caller from a verified id token, never
 * read from a request body. A client-supplied store id would let anyone
 * subscribe their own handset to another vendor's order notifications.
 *
 * `plan` and `vendorType` are denormalised copies used only for broadcast
 * filtering. Resolving those per device at send time would mean one store read
 * per device, a thousand reads for one message, and `in` queries cap at thirty
 * values so batching does not rescue it. The app calls register on every open,
 * so the copies refresh constantly and staleness is measured in hours.
 */
export async function registerDevice({
  token,
  platform,
  installId,
  appVersion = '',
  storeId = null,
  linkedUid = null,
  plan = null,
  vendorType = null,
}) {
  const db = getAdminDb()
  const deviceId = deviceIdFor(token)
  const ref = db.collection(DEVICES).doc(deviceId)
  const existing = await ref.get()

  const payload = {
    token: String(token),
    platform: String(platform),
    installId: String(installId),
    appVersion: String(appVersion || ''),
    storeId: storeId || null,
    linkedUid: linkedUid || null,
    plan: plan || null,
    vendorType: vendorType || null,
    lastSeenAt: FieldValue.serverTimestamp(),
    // A token that comes back to life (reinstall, permission re-granted) must
    // clear its tombstone, otherwise a pruned device stays dark forever.
    disabledAt: null,
  }

  if (!existing.exists) payload.createdAt = FieldValue.serverTimestamp()

  await ref.set(payload, { merge: true })
  await disableStaleTokensForInstall(installId, deviceId)

  return deviceId
}

/**
 * A rotated token leaves the previous one dead but still stored. FCM will keep
 * accepting sends to it for a while and simply not deliver, so the only signal
 * is the installId: same install, different token, the old row is finished.
 *
 * Single-field equality query, no composite index. That is deliberate and
 * matches the convention in verify-store-access.js, which avoids two-field
 * queries because this codebase has a history of missing-index failures that
 * only appear in production.
 */
async function disableStaleTokensForInstall(installId, keepDeviceId) {
  const db = getAdminDb()
  const snap = await db.collection(DEVICES).where('installId', '==', String(installId)).get()

  const stale = snap.docs.filter((d) => d.id !== keepDeviceId && !d.data().disabledAt)
  if (!stale.length) return

  const batch = db.batch()
  for (const doc of stale) {
    batch.update(doc.ref, { disabledAt: FieldValue.serverTimestamp() })
  }
  await batch.commit()
}

/**
 * Sign-out. The row and the token survive so platform broadcasts still reach
 * the handset; only the store link is cut.
 *
 * This matters for shared phones, which are common. Without it a device keeps
 * receiving the previous vendor's order notifications after they sign out.
 */
export async function unlinkDevicesForInstall(installId, storeId) {
  const db = getAdminDb()
  const snap = await db.collection(DEVICES).where('installId', '==', String(installId)).get()

  // Only rows already linked to the CALLER's store. Without this check an
  // authenticated vendor could unlink a device belonging to someone else by
  // guessing an installId.
  const mine = snap.docs.filter((d) => d.data().storeId === storeId)
  if (!mine.length) return 0

  const batch = db.batch()
  for (const doc of mine) {
    batch.update(doc.ref, { storeId: null, linkedUid: null, plan: null, vendorType: null })
  }
  await batch.commit()
  return mine.length
}

/**
 * Live devices for one store.
 *
 * Queries ONE field and filters the rest in memory. Adding
 * `.where('disabledAt', '==', null)` would need a composite index, and a
 * store's device list is single digits, so the filter is free.
 */
export async function listStoreDevices(storeId) {
  const db = getAdminDb()
  const snap = await db.collection(DEVICES).where('storeId', '==', storeId).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => !d.disabledAt && d.token)
}

/** FCM rejects non-string data values outright. */
function stringifyData(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  )
}

/**
 * Sends one message to many devices and disables the tokens FCM rejects.
 *
 * PRUNING IS NOT AN OPTIMISATION. Nothing in the codebase has ever acted on the
 * dead-token error, so without this the registry rots from the first week and
 * every send afterwards drags a growing tail of dead tokens through the
 * 500-per-call chunking, paying for delivery attempts that can never land.
 *
 * Deliberately separate from _lib/send-push.js. That one hardcodes a `webpush`
 * block with PWA icon paths and carries no `android` block; it serves the web
 * dashboard and is left exactly as it is.
 */
export async function sendPushToDevices(devices, { title, body, data = {}, imageUrl = null }) {
  getFirebaseAdminApp()

  const live = devices.filter((d) => d && d.token && !d.disabledAt)
  if (!live.length) return { sent: 0, failed: 0, pruned: 0 }

  const payloadData = stringifyData(data)
  const dead = []
  let sent = 0
  let failed = 0

  for (let i = 0; i < live.length; i += MULTICAST_CHUNK) {
    const chunk = live.slice(i, i + MULTICAST_CHUNK)

    let result
    try {
      result = await getMessaging().sendEachForMulticast({
        tokens: chunk.map((d) => d.token),
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        data: payloadData,
      })
    } catch (err) {
      // Whole-chunk transport failure. Not evidence about any single token, so
      // nothing is pruned; the devices stay live and the next send retries.
      console.error('[push-devices] multicast chunk failed:', err?.message || err)
      failed += chunk.length
      continue
    }

    sent += result.successCount
    failed += result.failureCount

    result.responses.forEach((resp, idx) => {
      if (resp.success) return
      const code = resp.error?.code
      if (DEAD_TOKEN_ERRORS.has(code)) dead.push(chunk[idx].id)
      else console.error(`[push-devices] send failed (${code}) for device ${chunk[idx].id}`)
    })
  }

  const pruned = await disableDevices(dead)
  return { sent, failed, pruned }
}

async function disableDevices(deviceIds) {
  if (!deviceIds.length) return 0
  const db = getAdminDb()

  // Firestore caps a batch at 500 writes.
  for (let i = 0; i < deviceIds.length; i += 500) {
    const batch = db.batch()
    for (const id of deviceIds.slice(i, i + 500)) {
      batch.update(db.collection(DEVICES).doc(id), { disabledAt: FieldValue.serverTimestamp() })
    }
    await batch.commit()
  }

  console.log(`[push-devices] pruned ${deviceIds.length} dead token(s)`)
  return deviceIds.length
}

/**
 * The replacement for a direct sendPush() call at a vendor-notifying site.
 * Reaches every live device the store has, staff handsets included, instead of
 * whichever one happened to write `fcmToken` last.
 *
 * Never throws. Every existing call site treats push as best-effort inside a
 * try/catch, and a notification must never be the reason a paid order fails to
 * finish recording.
 */
export async function sendPushToStore(storeId, { title, body, data = {}, imageUrl = null }) {
  try {
    const devices = await listStoreDevices(storeId)
    if (!devices.length) return { sent: 0, failed: 0, pruned: 0, devices: 0 }

    const result = await sendPushToDevices(devices, { title, body, data, imageUrl })
    return { ...result, devices: devices.length }
  } catch (err) {
    console.error('[push-devices] sendPushToStore failed:', err?.message || err)
    return { sent: 0, failed: 0, pruned: 0, devices: 0 }
  }
}
