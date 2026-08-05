// src/utils/staffDataFetch.js
// Used by every data-access function that normally reads Firestore directly
// (getProducts, getServices, fetchOrders, etc.) once it detects the caller
// isn't the store owner. Returns items in the same shape a native getDocs()
// call would — including real Firestore Timestamp objects (not ISO strings)
// for any date-like field — so no downstream `.toDate()` call anywhere in
// the app needs to change.
import { Timestamp } from 'firebase/firestore'
import { auth } from '../firebase/auth'

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function hydrateTimestamps(obj) {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key] = typeof value === 'string' && ISO_RE.test(value)
      ? Timestamp.fromDate(new Date(value))
      : value
  }
  return out
}

export async function fetchStoreCollectionAsStaff(type, storeId) {
  const user = auth.currentUser
  if (!user) return []
  const token = await user.getIdToken()
  const res = await fetch(`/api/store-data?type=${encodeURIComponent(type)}&storeId=${encodeURIComponent(storeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.items || []).map(hydrateTimestamps)
}

// Single-document variant — used for the analytics/storeSummary doc, which
// isn't a list.
export async function fetchStoreDocAsStaff(type, storeId) {
  const user = auth.currentUser
  if (!user) return null
  const token = await user.getIdToken()
  const res = await fetch(`/api/store-data?type=${encodeURIComponent(type)}&storeId=${encodeURIComponent(storeId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.doc ? hydrateTimestamps(data.doc) : null
}

// True when the logged-in identity is not the store owner (a different
// Firebase Auth uid than the target storeId) — the signal every read
// function uses to decide whether to go through the server proxy instead
// of a direct (rules-blocked) Firestore read.
export function isActingAsStaffFor(storeId) {
  return !!auth.currentUser && auth.currentUser.uid !== storeId
}

// Write counterpart. Throws on failure so callers surface the same errors
// their existing Firestore write path would (including the plan-limit
// 'FREE_PLAN_LIMIT_REACHED' signal the product/service forms already handle).
export async function writeStoreDocAsStaff({ type, storeId, op, docId, data }) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch('/api/store-write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type, storeId, op, docId, data }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to save. You may not have permission.')
  }
  return payload
}
