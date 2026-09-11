// src/api-handlers/device-unlink.js
//
// Called on sign-out, BEFORE the Firebase session is cleared, because this
// endpoint needs the id token to prove which store is doing the unlinking.
//
// Clears the store link and leaves the token intact, so platform broadcasts
// still reach the handset while order notifications for the departing vendor
// stop. Deleting the row instead would mean a signed-out phone goes completely
// dark until someone logs in again.
//
// This exists for shared phones, which are ordinary in this market. Without it
// a device keeps receiving the previous vendor's order and delivery pushes
// after they have signed out, which leaks customer names and order values to
// whoever holds the phone next.
import { getAdminAuth } from './_lib/firebase-admin.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import { unlinkDevicesForInstall } from './_lib/push-devices.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const installId = String(body.installId || '').trim()
  if (!installId || installId.length > 128) {
    return res.status(400).json({ error: 'Invalid installId' })
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)

    const access = await resolveCallerStoreId(decoded.uid)
    if (!access) return res.status(403).json({ error: 'No store access' })

    // Only rows already linked to THIS store are touched, so a guessed
    // installId cannot be used to unlink someone else's device.
    const unlinked = await unlinkDevicesForInstall(installId, access.storeId)

    return res.status(200).json({ ok: true, unlinked })
  } catch (err) {
    console.error('[device-unlink] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
