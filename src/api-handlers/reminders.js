// src/api-handlers/reminders.js
// Vendor-facing CRUD for the Reminders tab. Creation happens through Sella
// (see create_reminder in sella-ai.js), but list / toggle / delete live here so
// the tab works on its own and a vendor is never dependent on the assistant to
// turn off something the assistant set.
//
// Authorization goes through resolveStoreAccess per the standing convention in
// Changelog-README.md - never a raw uid === storeId comparison - so the tab is
// staff-assignable from day one.

import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { listReminders, setReminderEnabled, deleteReminder } from './_lib/reminders.js'

const TAB_ID = 'reminders'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.method === 'POST' ? (req.body || {}) : (req.query || {})
  const action = String(body.action || 'list')
  const storeId = String(body.storeId || '')
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!idToken) return res.status(401).json({ error: 'Please sign in again.' })

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }

    const needsWrite = action !== 'list'
    const access = await resolveStoreAccess(decoded.uid, storeId, TAB_ID, needsWrite)
    if (!access.allowed) {
      return res.status(403).json({
        error: access.reason === 'read_only'
          ? 'You have read-only access to Reminders.'
          : 'Forbidden',
      })
    }

    const db = getAdminDb()

    if (action === 'list') {
      return res.status(200).json({ reminders: await listReminders(db, storeId) })
    }

    if (action === 'toggle') {
      const result = await setReminderEnabled(db, storeId, body.id, body.enabled === true)
      return res.status(result.ok ? 200 : 400).json(result)
    }

    if (action === 'delete') {
      const result = await deleteReminder(db, storeId, body.id)
      return res.status(result.ok ? 200 : 400).json(result)
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[reminders]', err.message)
    return res.status(500).json({ error: 'Could not load reminders' })
  }
}
