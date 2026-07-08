//src/api-handlers/sendbox-tracking.js/
import { getAdminAuth } from './_lib/firebase-admin.js'

const SENDBOX_BASE = 'https://live.sendbox.co/shipping'
const SENDBOX_TOKEN = process.env.SENDBOX_ACCESS_TOKEN

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
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const trackRes = await fetch(
      `${SENDBOX_BASE}/shipments/${trackingCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: SENDBOX_TOKEN,
        },
      }
    )

    const trackData = await trackRes.json()

    if (!trackRes.ok) {
      console.error('[sendbox-tracking] error:', trackData)
      return res.status(trackRes.status).json({
        error: trackData?.description || trackData?.message || 'Failed to fetch tracking info',
      })
    }

    return res.status(200).json({
      status: trackData?.status_code || 'unknown',
      courierName: trackData?.courier?.name || '',
      trackingCode: trackData?.code || trackingCode,
      trackingUrl: `https://sendbox.co/tracking/${trackData?.code || trackingCode}`,
      waybillUrl: trackData?.package_label_image || '',
      timeline: Array.isArray(trackData?.tracking?.events) ? trackData.tracking.events : [],
      estimatedDelivery: trackData?.package_delivery_eta || '',
    })
  } catch (err) {
    console.error('[sendbox-tracking] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
