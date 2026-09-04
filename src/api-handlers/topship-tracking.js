//src/api-handlers/topship-tracking.js
// LIVE - see _lib/topship-booking.js header for the staging/production switch.
import { getAdminAuth } from './_lib/firebase-admin.js'
import { trackTopshipShipment } from './_lib/topship-booking.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, trackingCode } = req.body

  if (!storeId || !trackingCode) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, trackingCode',
    })
  }

  try {
    const auth = getAdminAuth()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (err) {
      // Logged with the real Firebase Admin error code/message (e.g. auth/id-token-expired,
      // auth/argument-error) so a recurrence is diagnosable from Vercel logs alone - this 401
      // is entirely about OUR Firebase token, unrelated to Topship or the tracking ID itself.
      console.error(`[topship-tracking] verifyIdToken failed for trackingCode ${trackingCode}:`, err?.code, err?.message)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await trackTopshipShipment(trackingCode)
    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const trackData = result.data

    // Topship's /track-shipment response only exposes the current status/message -
    // no per-event history array like Sendbox's tracking.events. Synthesize a single
    // timeline entry so the shared timeline UI still has something to render.
    const timeline = trackData?.status
      ? [{ status: trackData.status, description: trackData.message || '', time: trackData.updatedDate || '' }]
      : []

    return res.status(200).json({
      status: trackData?.status || 'unknown',
      trackingCode: trackData?.trackingId || trackingCode,
      timeline,
      itemLocation: trackData?.itemLocation || '',
    })
  } catch (err) {
    console.error('[topship-tracking] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
