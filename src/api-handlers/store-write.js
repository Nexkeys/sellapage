// src/api-handlers/store-write.js
// Write counterpart to store-data.js. Products/Categories/Services/Discounts/
// Ledger writes normally go straight from the client to Firestore, gated by
// rules requiring `request.auth.uid == storeId` — true for the owner, never
// for staff. This proxies those writes through firebase-admin (bypasses rules)
// after checking the caller actually holds WRITE access on that tab.
//
// The owner's existing direct-Firestore path is untouched; the client only
// calls this when `auth.currentUser.uid !== storeId`.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let body = {}
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
        role_not_found: 'Your role no longer exists — ask the store owner to reassign you.',
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
      return res.status(200).json({ success: true })
    }

    const data = coerceTimestamps(type, sanitize(body.data))

    if (op === 'update') {
      await colRef.doc(docId).update(data)
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
      return res.status(200).json({ success: true, id: newRef.id })
    }

    const newRef = docId ? colRef.doc(docId) : colRef.doc()
    await newRef.set(data)
    return res.status(200).json({ success: true, id: newRef.id })
  } catch (err) {
    console.error('[store-write] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
