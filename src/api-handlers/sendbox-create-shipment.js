//src/api-handlers/sendbox-create-shipment.js/
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
const SENDBOX_BASE = 'https://live.sendbox.co/shipping'
const SENDBOX_TOKEN = process.env.SENDBOX_ACCESS_TOKEN

function normalizePhone(phone) {
  if (!phone) return '+2348000000000'
  return phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
}

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' }
}

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
    courierId,
    senderDetails,
    receiverDetails,
    weight = 1,
    pickupDate,
  } = req.body
  if (!storeId || !orderId || !courierId || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, courierId, senderDetails, receiverDetails',
    })
  }
  try {
    const auth = getAdminAuth()
    const db = getAdminDb()
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

    const senderName = splitName(senderDetails.name)
    const receiverName = splitName(receiverDetails.name)
    const today = pickupDate || new Date().toISOString().split('T')[0]

    const shipRes = await fetch(`${SENDBOX_BASE}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: SENDBOX_TOKEN,
      },
      body: JSON.stringify({
        origin: {
          first_name: senderName.first,
          last_name: senderName.last,
          street: senderDetails.address || '',
          state: senderDetails.state,
          city: senderDetails.city || '',
          country: 'NG',
          phone: normalizePhone(senderDetails.phone),
          email: senderDetails.email || '',
        },
        destination: {
          first_name: receiverName.first,
          last_name: receiverName.last,
          street: receiverDetails.address || '',
          state: receiverDetails.state,
          city: receiverDetails.city || '',
          country: 'NG',
          phone: normalizePhone(receiverDetails.phone),
          email: receiverDetails.email || '',
        },
        weight: Number(weight) || 1,
        courier_id: courierId,
        pickup_date: today,
        incoming_option: 'pickup',
        region: 'NG',
        service_type: 'local',
        package_type: 'general',
        total_value: orderDoc.data()?.grandTotal || orderDoc.data()?.total || 5000,
        currency: 'NGN',
        channel_code: 'api',
        items: [
          {
            name: 'Package',
            quantity: 1,
            value: orderDoc.data()?.grandTotal || orderDoc.data()?.total || 5000,
            weight: Number(weight) || 1,
          }
        ],
        callback_url: `${process.env.APP_URL || 'https://www.sellapage.com.ng'}/api/sendbox-webhook`,
      }),
    })

    const shipData = await shipRes.json()

    if (!shipRes.ok) {
      console.error('[sendbox-create-shipment] error:', shipData)
      return res.status(shipRes.status).json({
        error: shipData?.description || shipData?.message || 'Failed to create shipment',
      })
    }

    const trackingId = shipData?.code || shipData?.reference_code || ''
    const waybillUrl = shipData?.package_label_image || shipData?.label_image || ''
    const trackingUrl = `https://sendbox.co/tracking/${trackingId}`

    await db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .doc(orderId)
      .update({
        sendboxTrackingId: trackingId,
        sendboxOrderCode: shipData?.code || '',
        sendboxStatus: 'created',
        sendboxCourierId: courierId,
        sendboxWaybillUrl: waybillUrl,
        sendboxTrackingUrl: trackingUrl,
        status: 'dispatched',
        updatedAt: new Date().toISOString(),
      })

    return res.status(200).json({
      success: true,
      trackingId,
      waybillUrl,
      trackingUrl,
      code: shipData?.code || '',
    })
  } catch (err) {
    console.error('[sendbox-create-shipment] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
