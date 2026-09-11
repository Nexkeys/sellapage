// src/api-handlers/notifications.js
//
// The feed behind the bell, and its read state.
//
// WHY THE MERGE HAPPENS HERE AND NOT IN THE APP
// Broadcasts are one shared document per message, carrying the plan and
// vendorType filters they were sent with. If the app queried that collection
// directly, a starter vendor could read and display a message targeted at
// Growth and Pro, and the filters would be decoration rather than a rule. They
// are applied server-side, against the caller's own store, and the app receives
// one already-merged, already-filtered list.
//
// Authorized through resolveCallerStoreId rather than resolveStoreAccess with a
// tab id. There is no 'notifications' tab in any staff role, so a tab check
// would return tab_not_granted for every staff member and the bell would be
// permanently empty for them, silently. Store-level access is the correct test:
// anyone who can act for the store should see its notifications.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import { NOTIFICATIONS } from './_lib/notifications.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

// Read state for shared broadcast documents cannot live on the document, so it
// lives per store. One document holding an id array, which stays small because
// only unexpired broadcasts are ever merged in.
const META_DOC = 'broadcastsRead'

function iso(value) {
  return value?.toDate?.()?.toISOString?.() || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const access = await resolveCallerStoreId(decoded.uid)
    if (!access) return res.status(403).json({ error: 'No store access' })

    const db = getAdminDb()
    const storeId = access.storeId
    const action = req.query.action || 'list'

    if (action === 'list' && req.method === 'GET') {
      return await listFeed(db, storeId, req, res)
    }

    if (action === 'read' && req.method === 'POST') {
      return await markRead(db, storeId, req, res)
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[notifications] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

async function listFeed(db, storeId, req, res) {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT)
  const storeRef = db.collection('stores').doc(storeId)

  const [ownSnap, broadcastSnap, storeSnap, readSnap] = await Promise.all([
    // Single-collection order on one field, so no composite index. That is a
    // deliberate constraint in this codebase, not an accident.
    storeRef.collection(NOTIFICATIONS).orderBy('createdAt', 'desc').limit(limit).get(),
    db.collection('broadcasts').orderBy('sentAt', 'desc').limit(limit).get(),
    storeRef.get(),
    storeRef.collection('meta').doc(META_DOC).get(),
  ])

  const store = storeSnap.data() || {}
  const readBroadcastIds = new Set(readSnap.data()?.ids || [])

  const own = ownSnap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      source: 'store',
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data || {},
      createdAt: iso(data.createdAt),
      read: Boolean(data.readAt),
    }
  })

  const broadcasts = broadcastSnap.docs
    .filter((d) => matchesStore(d.data().filters, store))
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        source: 'broadcast',
        type: 'broadcast',
        title: data.title,
        body: data.body,
        data: {
          ...(data.target ? { target: data.target } : {}),
          ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
          broadcastId: d.id,
        },
        createdAt: iso(data.sentAt),
        read: readBroadcastIds.has(d.id),
      }
    })

  const items = [...own, ...broadcasts]
    // A record written microseconds ago can still have a null serverTimestamp
    // on the first read, so those sort to the top rather than the bottom.
    .sort((a, b) => (b.createdAt || '9999').localeCompare(a.createdAt || '9999'))
    .slice(0, limit)

  return res.status(200).json({
    ok: true,
    items,
    unreadCount: items.filter((i) => !i.read).length,
  })
}

// Mirrors the filter logic in admin-push.js. A broadcast sent with no filters
// reaches everyone.
function matchesStore(filters, store) {
  if (!filters || !Object.keys(filters).length) return true
  if (filters.plan && !filters.plan.includes(store.plan || 'starter')) return false
  if (filters.vendorType && (store.vendorType || 'products') !== filters.vendorType) return false
  if (filters.isActive !== undefined && (store.isActive !== false) !== filters.isActive) return false
  return true
}

async function markRead(db, storeId, req, res) {
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const ids = Array.isArray(body.ids) ? body.ids.slice(0, 200).map(String) : []
  const broadcastIds = Array.isArray(body.broadcastIds)
    ? body.broadcastIds.slice(0, 200).map(String)
    : []

  if (!ids.length && !broadcastIds.length) {
    return res.status(400).json({ error: 'Nothing to mark' })
  }

  const storeRef = db.collection('stores').doc(storeId)
  let updated = 0

  // Per-store records carry their own readAt. Batched because marking the whole
  // list read on opening the bell is the normal case, not the exception.
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch()
    for (const id of ids.slice(i, i + 400)) {
      batch.set(
        storeRef.collection(NOTIFICATIONS).doc(id),
        { readAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
      updated++
    }
    await batch.commit()
  }

  // Broadcast documents are shared, so read state is recorded on the store side.
  if (broadcastIds.length) {
    await storeRef.collection('meta').doc(META_DOC).set(
      {
        ids: FieldValue.arrayUnion(...broadcastIds),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    updated += broadcastIds.length
  }

  return res.status(200).json({ ok: true, updated })
}
