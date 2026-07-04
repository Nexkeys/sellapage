//src/api-handlers/shipbubble-tracking.js/
import { getFirebaseAdmin } from './_lib/firebase-admin.js'
const SHIPBUBBLE_BASE = 'https://api.shipbubble.com/v1'
const SHIPBUBBLE_TOKEN = process.env.SHIPBUBBLE_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, shipbubbleOrderId } = req.body
  if (!storeId || !shipbubbleOrderId) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, shipbubbleOrderId',
    })
  }

  try {
    const { auth } = getFirebaseAdmin()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const trackRes = await fetch(
      `${SHIPBUBBLE_BASE}/shipping/tracking/${shipbubbleOrderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SHIPBUBBLE_TOKEN}`,
        },
      }
    )

    const trackData = await trackRes.json()

    if (!trackRes.ok) {
      console.error('[shipbubble-tracking] error:', trackData)
      return res.status(trackRes.status).json({
        error: trackData?.message || 'Failed to fetch tracking info',
      })
    }

    const shipment = trackData?.data

    return res.status(200).json({
      status: shipment?.status || 'unknown',
      courierName: shipment?.courier_name || '',
      trackingCode: shipment?.tracking_code || shipbubbleOrderId,
      trackingUrl: shipment?.tracking_url || '',
      timeline: Array.isArray(shipment?.timeline) ? shipment.timeline : [],
      estimatedDelivery: shipment?.estimated_delivery_date || '',
    })
  } catch (err) {
    console.error('[shipbubble-tracking] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
