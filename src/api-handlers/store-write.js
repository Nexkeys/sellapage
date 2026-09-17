// src/api-handlers/store-write.js
// Write counterpart to store-data.js. Products/Categories/Services/Discounts/
// Ledger writes normally go straight from the client to Firestore, gated by
// rules requiring `request.auth.uid == storeId` - true for the owner, never
// for staff. This proxies those writes through firebase-admin (bypasses rules)
// after checking the caller actually holds WRITE access on that tab.
//
// The owner's existing direct-Firestore path is untouched; the client only
// calls this when `auth.currentUser.uid !== storeId`.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { notifyStore, recordNotification } from './_lib/notifications.js'

const TYPES = {
  products: { collection: 'products', tab: 'products', countsTowardListings: true },
  services: { collection: 'services', tab: 'services', countsTowardListings: true },
  categories: { collection: 'categories', tab: 'categories', countsTowardListings: false },
  discounts: { collection: 'discounts', tab: 'discounts', countsTowardListings: false },
  ledger: { collection: 'ledger', tab: 'ledger', countsTowardListings: false },
}

// Fields stored as real Firestore Timestamps in the owner's write path. Any
// other date-ish string is left exactly as the owner path would store it
// (e.g. ledger's `date` "YYYY-MM-DD" and its ISO-string `createdAt`), so
// staff-written docs are byte-for-byte the same shape as owner-written ones.
const TIMESTAMP_FIELDS = {
  products: ['createdAt', 'updatedAt'],
  services: ['createdAt', 'updatedAt'],
  categories: ['createdAt'],
  discounts: ['createdAt', 'expiryDate'],
  ledger: [],
}

function coerceTimestamps(type, data) {
  const fields = TIMESTAMP_FIELDS[type] || []
  const out = { ...data }
  for (const field of fields) {
    const value = out[field]
    if (typeof value === 'string' && value) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) out[field] = parsed
    }
  }
  return out
}

// Never let a client-supplied payload write internal/derived fields.
function sanitize(data) {
  const out = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (key.startsWith('_') || key === 'id') continue
    out[key] = value === undefined ? null : value
  }
  return out
}

function planLimits(storeData) {
  const plan = storeData.plan || 'starter'
  return storeData.maxProducts ?? (
    plan === 'premium' ? 999999 : plan === 'pro' ? 999999 : plan === 'growth' ? 50 : 15
  )
}

// ------------------------------------------------------- owner notifications
//
// Two owner-facing notifications ride on this endpoint, because this is the
// ONE place a staff write is committed by the server, and therefore the one
// place that knows both who made the change and that it actually landed. The
// owner's own writes go straight from their browser to Firestore and never
// reach this file, which is exactly right: telling someone what they just did
// themselves is noise.
const TYPE_LABEL = {
  products: 'a product',
  services: 'a service',
  categories: 'a category',
  discounts: 'a discount',
  ledger: 'a ledger entry',
}

const OP_VERB = { create: 'added', update: 'edited', delete: 'deleted' }

// One team_activity PUSH per staff member per window. Somebody editing twenty
// products in a sitting is one afternoon of work, not twenty interruptions. The
// bell record is still written every single time, so nothing is lost: the full
// list is there the moment the owner looks.
const TEAM_ACTIVITY_PUSH_EVERY_MS = 15 * 60 * 1000
const ACTIVITY_META_DOC = 'teamActivity'

/**
 * Tells the owner what a staff member just changed. Never throws.
 *
 * The write has already committed by the time this runs, so a notification
 * failure must never turn a saved product into a 500 and a retry.
 */
async function announceStaffWrite(db, storeId, access, { type, op, docId }) {
  // Owner writes reaching here at all would mean the client called the staff
  // proxy for the owner, which it does not, but the check is the guard that
  // makes the intent explicit.
  if (access.role === 'owner') return

  try {
    const staffName = access.staffName || 'A staff member'
    const tab = TYPES[type]?.tab || type

    // A ledger entry gets its own notification rather than being folded into
    // team_activity: money logged offline is the thing an owner most wants to
    // see at the moment it happens, and it must not be swallowed by the
    // activity throttle below.
    if (type === 'ledger' && op === 'create') {
      await notifyStore(db, storeId, {
        type: 'ledger_entry',
        title: 'Ledger entry logged',
        body: `${staffName} logged a ledger entry.`,
        data: { entryId: docId || '', staffName },
      })
    }

    const payload = {
      type: 'team_activity',
      title: 'Team activity',
      body: `${staffName} ${OP_VERB[op] || 'changed'} ${TYPE_LABEL[type] || 'a record'}.`,
      data: { staffName, tab, action: op },
    }

    // stores/{id}/meta/* is server-only in firestore.rules, so the throttle
    // clock cannot be read or reset by anyone's client.
    const metaRef = db.collection('stores').doc(storeId).collection('meta').doc(ACTIVITY_META_DOC)
    const snap = await metaRef.get()
    const lastPushAt = Number(snap.data()?.[access.staffUid]?.lastPushAt || 0)

    if (Date.now() - lastPushAt < TEAM_ACTIVITY_PUSH_EVERY_MS) {
      // Inside the window: record only, no buzz. recordNotification skips the
      // plan gate, which is safe here because Team is Premium-only, so a store
      // with any staff member at all is already Premium.
      await recordNotification(db, storeId, payload)
      return
    }

    await notifyStore(db, storeId, payload)
    await metaRef.set({ [access.staffUid]: { lastPushAt: Date.now() } }, { merge: true })
  } catch (err) {
    console.error('[store-write] notify failed:', err?.message || err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { type, storeId, op, docId } = body
  const config = TYPES[type]
  if (!config) return res.status(400).json({ error: 'Invalid type' })
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })
  if (!['create', 'update', 'delete'].includes(op)) return res.status(400).json({ error: 'Invalid op' })
  if ((op === 'update' || op === 'delete') && !docId) {
    return res.status(400).json({ error: 'docId is required' })
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const db = getAdminDb()

    const access = await resolveStoreAccess(decoded.uid, storeId, config.tab, true)
    if (!access.allowed) {
      const messages = {
        read_only: 'Your role has view-only access to this section.',
        tab_not_granted: 'Your role does not have access to this section.',
        owner_only_tab: 'Only the store owner can make this change.',
        not_a_staff_member: 'You do not have access to this store.',
        role_not_found: 'Your role no longer exists - ask the store owner to reassign you.',
      }
      return res.status(403).json({ error: messages[access.reason] || 'You do not have permission to make this change.' })
    }

    const storeRef = db.collection('stores').doc(storeId)
    const colRef = storeRef.collection(config.collection)

    if (op === 'delete') {
      if (config.countsTowardListings) {
        const batch = db.batch()
        batch.delete(colRef.doc(docId))
        batch.update(storeRef, { productCount: FieldValue.increment(-1) })
        await batch.commit()
      } else {
        await colRef.doc(docId).delete()
      }
      await announceStaffWrite(db, storeId, access, { type, op, docId })
      return res.status(200).json({ success: true })
    }

    const data = coerceTimestamps(type, sanitize(body.data))

    if (op === 'update') {
      await colRef.doc(docId).update(data)
      await announceStaffWrite(db, storeId, access, { type, op, docId })
      return res.status(200).json({ success: true, id: docId })
    }

    // create
    if (config.countsTowardListings) {
      // Mirror the owner path's plan-limit guard (products + services share one
      // combined listing allowance).
      const storeSnap = await storeRef.get()
      const storeData = storeSnap.exists ? storeSnap.data() : {}
      const limit = planLimits(storeData)
      const [productsCount, servicesCount] = await Promise.all([
        storeRef.collection('products').count().get(),
        storeRef.collection('services').count().get(),
      ])
      const total = productsCount.data().count + servicesCount.data().count
      if (total >= limit) {
        return res.status(403).json({ error: 'FREE_PLAN_LIMIT_REACHED' })
      }

      const batch = db.batch()
      const newRef = docId ? colRef.doc(docId) : colRef.doc()
      batch.set(newRef, data)
      batch.update(storeRef, { productCount: FieldValue.increment(1) })
      await batch.commit()
      await announceStaffWrite(db, storeId, access, { type, op, docId: newRef.id })
      return res.status(200).json({ success: true, id: newRef.id })
    }

    const newRef = docId ? colRef.doc(docId) : colRef.doc()
    await newRef.set(data)
    await announceStaffWrite(db, storeId, access, { type, op, docId: newRef.id })
    return res.status(200).json({ success: true, id: newRef.id })
  } catch (err) {
    console.error('[store-write] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
