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
import { FieldPath, FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import { NOTIFICATIONS } from './_lib/notifications.js'
import { loadRecipient, recipientMayReceive } from './_lib/notification-access.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

// READ STATE IS PER PERSON (since 2026-09-18). It used to be per store: one
// `readAt` on each record, so a Manager opening their bell cleared the owner's
// unread badge for orders the owner had never seen. Now each record carries
// `readBy.{uid}`, and broadcasts keep a per-uid id list.
//
// Marks written BEFORE the change (store-wide `readAt` on a record, the flat
// `ids` array for broadcasts) still count as read for everyone. Treating them
// as unread would have resurrected every old notification as new the day this
// shipped.
//
// Read state for shared broadcast documents cannot live on the broadcast, so it
// lives in this per-store document, keyed by uid.
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

    // Who the caller is relative to this store. The owner sees every record;
    // a staff member sees only types their role's tabs cover, exactly as their
    // devices are filtered when the push is sent. Without this the feed was a
    // second copy of the leak: any staff member could read loyalty codes and
    // order details for tabs they were never granted.
    const recipient = await loadRecipient(storeId, decoded.uid)

    if (action === 'list' && req.method === 'GET') {
      return await listFeed(db, storeId, recipient, decoded.uid, req, res)
    }

    if (action === 'read' && req.method === 'POST') {
      return await markRead(db, storeId, recipient, decoded.uid, req, res)
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[notifications] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

async function listFeed(db, storeId, recipient, viewerUid, req, res) {
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
  const readMeta = readSnap.data() || {}
  // Legacy store-wide ids, plus this person's own.
  const readBroadcastIds = new Set([...(readMeta.ids || []), ...(readMeta.byUid?.[viewerUid] || [])])

  const own = ownSnap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        source: 'store',
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        createdAt: iso(data.createdAt),
        // Mine, or a legacy store-wide mark from before read state went per
        // person.
        read: Boolean(data.readBy?.[viewerUid] || data.readAt),
      }
    })
    // Same rule as the push: staff see only types their role's tabs cover, and
    // a reminder is also visible to the person who created it. Applied after
    // the query limit, so a staff member can get fewer than `limit` store items
    // on a page. That is the price of not needing a second query shape and the
    // composite index it would require.
    .filter((item) => recipientMayReceive(
      recipient,
      item.type,
      item.data?.createdByUid ? [item.data.createdByUid] : [],
    ))

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

async function markRead(db, storeId, recipient, viewerUid, req, res) {
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

  // Only records that EXIST and that this caller is allowed to see. Read state
  // is per person now, so marking cannot touch anyone else's badge, but a
  // caller still has no business writing to a record their role cannot see.
  // And update(), not set-with-merge: the old merge created a document for ANY
  // id sent, so a made-up id left a ghost record that showed as a blank item.
  let markable = []
  if (ids.length) {
    const snaps = await db.getAll(...ids.map((id) => storeRef.collection(NOTIFICATIONS).doc(id)))
    markable = snaps
      .filter((snap) => snap.exists)
      .filter((snap) => {
        const record = snap.data() || {}
        return recipientMayReceive(
          recipient,
          record.type,
          record.data?.createdByUid ? [record.data.createdByUid] : [],
        )
      })
      .map((snap) => snap.id)
  }

  // Per-store records carry their own readAt. Batched because marking the whole
  // list read on opening the bell is the normal case, not the exception.
  for (let i = 0; i < markable.length; i += 400) {
    const batch = db.batch()
    for (const id of markable.slice(i, i + 400)) {
      // FieldPath, not a dotted string, so a uid can never be read as a path.
      batch.update(
        storeRef.collection(NOTIFICATIONS).doc(id),
        new FieldPath('readBy', viewerUid),
        FieldValue.serverTimestamp(),
      )
      updated++
    }
    await batch.commit()
  }

  // Broadcast documents are shared, so read state is recorded on the store
  // side, under this person's uid.
  if (broadcastIds.length) {
    await storeRef.collection('meta').doc(META_DOC).set(
      {
        byUid: { [viewerUid]: FieldValue.arrayUnion(...broadcastIds) },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    updated += broadcastIds.length
  }

  return res.status(200).json({ ok: true, updated })
}
