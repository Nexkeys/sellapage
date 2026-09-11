// src/api-handlers/admin-push.js
//
// Platform broadcast push. One message, every vendor's devices.
//
// Gated on the 'push' tab, which must exist in BOTH _lib/verify-admin.js and
// src/utils/adminRoles.js. Missing it from the server copy means any admin can
// broadcast; missing it from the client copy means the tab never renders. They
// are separate files on purpose and the server one wins.
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors } from './_lib/http.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { DEVICES, sendPushToDevices } from './_lib/push-devices.js'

// Android shows roughly this much of a title on one line before truncating.
const TITLE_MAX = 65
const BODY_MAX = 240

const PLANS = new Set(['starter', 'growth', 'pro', 'premium'])
const VENDOR_TYPES = new Set(['products', 'services'])

// In-app destinations a tap may open. An allowlist rather than validation,
// because the set of real screens is small, known, and changes with app
// releases rather than with admin input.
const APP_ROUTES = new Set([
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/bookings',
  '/dashboard/payouts',
  '/dashboard/delivery',
  '/dashboard/marketing',
  '/dashboard/more',
])

const EXTERNAL_HOSTS = new Set(['sellapage.com.ng', 'www.sellapage.com.ng'])

/**
 * A broadcast target becomes a tap action on every vendor's phone at once, so
 * it is validated here and never trusted from the form.
 *
 * Deliberately NOT reusing normalizeCtaUrl from admin-announcements.js: that is
 * module-local and not exported, and safeAnnouncementUrl in utils permits
 * mailto and tel, which have no meaning as an app destination. An arbitrary URL
 * accepted here would be a phishing link delivered to the entire merchant base
 * in one press, which is a materially worse blast radius than an announcement
 * banner.
 *
 * { ok: true, target: null } means the admin simply left it blank.
 */
function normalizeTarget(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { ok: true, target: null }

  if (value.startsWith('/')) {
    return APP_ROUTES.has(value) ? { ok: true, target: value } : { ok: false }
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false }
  }

  if (parsed.protocol !== 'https:') return { ok: false }
  if (!EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) return { ok: false }

  return { ok: true, target: parsed.toString() }
}

// Cloudinary only. The image is fetched by the device, so an arbitrary host
// here would have every vendor's handset making a request to a stranger's
// server the moment a notification arrives.
function normalizeImageUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { ok: true, imageUrl: null }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false }
  }

  if (parsed.protocol !== 'https:') return { ok: false }
  if (parsed.hostname.toLowerCase() !== 'res.cloudinary.com') return { ok: false }

  return { ok: true, imageUrl: parsed.toString() }
}

function parseFilters(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out

  if (Array.isArray(raw.plan)) {
    const plans = raw.plan.map((p) => String(p).toLowerCase()).filter((p) => PLANS.has(p))
    if (plans.length) out.plan = plans
  }
  if (raw.vendorType && VENDOR_TYPES.has(String(raw.vendorType).toLowerCase())) {
    out.vendorType = String(raw.vendorType).toLowerCase()
  }
  if (raw.isActive === true || raw.isActive === false) {
    out.isActive = raw.isActive
  }
  return out
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'push')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const db = getAdminDb()
  const action = req.query.action || 'list'

  try {
    // Send history, so an admin can see what already went out before adding to
    // the pile. Same shape as the announcements list.
    if (action === 'list' && req.method === 'GET') {
      const snap = await db.collection('broadcasts').orderBy('sentAt', 'desc').limit(50).get()
      const broadcasts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        sentAt: d.data().sentAt?.toDate?.()?.toISOString() || null,
      }))
      return res.status(200).json({ success: true, broadcasts })
    }

    // How many devices a given filter set would actually reach. Sending blind
    // to a thousand handsets is the kind of thing worth previewing.
    if (action === 'audience' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {} } catch {}
      const filters = parseFilters(body.filters)
      const devices = await selectDevices(db, filters)
      return res.status(200).json({ success: true, devices: devices.length, filters })
    }

    if (action === 'send' && req.method === 'POST') {
      // Tighter than the announcement limiter. This one wakes up every vendor's
      // phone, and a loop against it is not recoverable once delivered.
      if (!memoryRateLimit('admin-push-send', clientKey(req), 10, 3600000)) {
        return tooManyRequests(res)
      }

      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {} } catch {}

      const title = String(body.title || '').trim().slice(0, TITLE_MAX)
      const message = String(body.body || '').trim().slice(0, BODY_MAX)
      if (!title || !message) {
        return res.status(400).json({ error: 'Title and body are required' })
      }

      const target = normalizeTarget(body.target)
      if (!target.ok) {
        return res.status(400).json({
          error: 'Link must be an approved in-app screen, or an https link on sellapage.com.ng',
        })
      }

      const image = normalizeImageUrl(body.imageUrl)
      if (!image.ok) {
        return res.status(400).json({ error: 'Image must be an https res.cloudinary.com URL' })
      }

      const filters = parseFilters(body.filters)
      const devices = await selectDevices(db, filters)

      // The document is written FIRST and once. A broadcast to a thousand
      // vendors must not be a thousand per-store records for one piece of text;
      // the app merges this single row into each vendor's feed at read time.
      const ref = await db.collection('broadcasts').add({
        title,
        body: message,
        imageUrl: image.imageUrl,
        target: target.target,
        filters,
        sentBy: admin.uid,
        sentAt: new Date(),
        audience: devices.length,
        sent: 0,
        failed: 0,
      })

      const result = await sendPushToDevices(devices, {
        title,
        body: message,
        imageUrl: image.imageUrl,
        data: {
          type: 'broadcast',
          broadcastId: ref.id,
          ...(target.target ? { target: target.target } : {}),
        },
      })

      await ref.update({ sent: result.sent, failed: result.failed })
      console.log(`[admin-push] ${admin.uid} broadcast ${ref.id} to ${result.sent}/${devices.length}`)

      return res.status(200).json({
        ok: true,
        broadcastId: ref.id,
        audience: devices.length,
        sent: result.sent,
        failed: result.failed,
        pruned: result.pruned,
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-push] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Resolves the recipient list.
 *
 * Every filter is applied against fields COPIED onto the device document at
 * register time, so this is one collection scan and zero store reads. Joining
 * to stores here would be one read per device, a thousand reads for one
 * message, and `in` queries cap at thirty values so batching would not save it.
 *
 * A device with storeId null (installed, never signed in) matches only when no
 * filter is set. Filtering by plan implies a vendor, and an anonymous install
 * has no plan to test.
 */
async function selectDevices(db, filters) {
  const snap = await db.collection(DEVICES).get()
  const hasFilters = Object.keys(filters).length > 0

  const devices = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => !d.disabledAt && d.token)

  if (!hasFilters) return devices

  const needStores = filters.isActive !== undefined
  const activeById = needStores ? await activeStoreMap(db) : null

  return devices.filter((d) => {
    if (!d.storeId) return false
    if (filters.plan && !filters.plan.includes(d.plan || 'starter')) return false
    if (filters.vendorType && (d.vendorType || 'products') !== filters.vendorType) return false
    if (filters.isActive !== undefined && activeById.get(d.storeId) !== filters.isActive) return false
    return true
  })
}

// isActive is the one filter not denormalised onto the device, because a store
// can be deactivated without the vendor ever opening the app again to refresh
// the copy. Read once for the whole send rather than per device.
async function activeStoreMap(db) {
  const snap = await db.collection('stores').select('isActive').get()
  const map = new Map()
  for (const doc of snap.docs) map.set(doc.id, doc.data().isActive !== false)
  return map
}
