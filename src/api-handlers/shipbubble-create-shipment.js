import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

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

  const {
    storeId,
    orderId,
    requestToken,
    courierId,
    serviceCode,
  } = req.body

  if (!storeId || !orderId || !requestToken || !courierId || !serviceCode) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, requestToken, courierId, serviceCode',
    })
  }

  try {
    const db = getAdminDb()
    const auth = getAdminAuth()

    // Verify vendor auth
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    if (storeDoc.data().ownerId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const orderDoc = await db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .doc(orderId)
      .get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Create shipment label using request_token from rates call
    const shipRes = await fetch(`${SHIPBUBBLE_BASE}/shipping/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SHIPBUBBLE_TOKEN}`,
      },
      body: JSON.stringify({
        request_token: requestToken,
        service_code: serviceCode,
        courier_id: courierId,
      }),
    })

    const shipData = await shipRes.json()

    if (!shipRes.ok) {
      const errMsg = shipData?.message || shipData?.error || 'Failed to create shipment'
      console.error('[shipbubble-create-shipment] labels error:', shipData)
      return res.status(shipRes.status).json({ error: errMsg })
    }

    const shipment = shipData?.data
    const trackingId =
      shipment?.order_id ||
      shipment?.tracking_code ||
      shipment?.courier?.tracking_code ||
      ''
    const waybillUrl = shipment?.waybill_document || ''
    const trackingUrl = shipment?.tracking_url || ''

    // Save shipment info to Firestore order document
    await db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .doc(orderId)
      .update({
        shipbubbleTrackingId: trackingId,
        shipbubbleOrderId: shipment?.order_id || '',
        shipbubbleStatus: 'created',
        shipbubbleCourier: courierId,
        shipbubbleServiceCode: serviceCode,
        shipbubbleWaybillUrl: waybillUrl,
        shipbubbleTrackingUrl: trackingUrl,
        status: 'dispatched',
        updatedAt: new Date().toISOString(),
      })

    return res.status(200).json({
      success: true,
      trackingId,
      waybillUrl,
      trackingUrl,
      orderId: shipment?.order_id || '',
    })
  } catch (err) {
    console.error('[shipbubble-create-shipment] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
