// src/api-handlers/notification-prefs.js
//
// The store-wide notification switches behind the app's settings screen.
//
// One switch per Android channel, so muting summaries never mutes orders. The
// server checks these before every push; the bell record is still written when
// a push is skipped, so nothing is lost, it just does not buzz.
//
// STORAGE: stores/{storeId}/private/notificationPrefs, which is already
// `allow read, write: if false` in firestore.rules. Reachable only through the
// Admin SDK, so these switches needed no rules change and no client can read
// another store's settings.
//
// READ is owner and active staff, because a staff member's handset is gated by
// the same switches and a settings screen that cannot read its own state is
// worse than no screen. WRITE is owner only: a switch here silences every
// device on the store, staff handsets included, which is not a staff decision.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  sanitizePrefs,
} from './_lib/notification-channels.js'

export default async function handler(req, res) {
  // Open CORS matches the other app-facing handlers (device-register, notify,
  // notifications). React Native sends no Origin header.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)

    // The store id is DERIVED, never read from the request. Accepting one would
    // let any signed-in vendor mute another store's notifications.
    const access = await resolveCallerStoreId(decoded.uid)
    if (!access) return res.status(403).json({ error: 'No store access' })

    const db = getAdminDb()
    const storeId = access.storeId

    if (req.method === 'GET') {
      const prefs = await loadNotificationPrefs(db, storeId)
      return res.status(200).json({ ok: true, prefs })
    }

    if (req.method === 'POST') {
      if (access.role !== 'owner') {
        return res.status(403).json({
          error: 'Only the store owner can change notification settings.',
        })
      }

      let body
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }

      const result = sanitizePrefs(body.prefs)
      if (!result.ok) return res.status(400).json({ error: result.error })

      const prefs = await saveNotificationPrefs(db, storeId, result.prefs)
      return res.status(200).json({ ok: true, prefs })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[notification-prefs] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
