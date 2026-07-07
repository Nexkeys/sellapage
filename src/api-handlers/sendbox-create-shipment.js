import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
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

    const senderPhone = senderDetails.phone
      ? senderDetails.phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
      : '+2348000000000'
    const receiverPhone = receiverDetails.phone
      ? receiverDetails.phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
      : '+2348000000000'

    const shipRes = await fetch(`${SENDBOX_BASE}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: SENDBOX_TOKEN,
      },
      body: JSON.stringify({
        origin_name: senderDetails.name || '',
        origin_phone: senderPhone,
        origin_email: senderDetails.email || 'noreply@sellapage.com.ng',
        origin_address: senderDetails.address || '',
        origin_city: senderDetails.city || '',
        origin_state: senderDetails.state || '',
        origin_country: 'Nigeria',
        origin_country_code: 'NG',
        destination_name: receiverDetails.name || '',
        destination_phone: receiverPhone,
        destination_email: receiverDetails.email || '',
        destination_address: receiverDetails.address || '',
        destination_city: receiverDetails.city || '',
        destination_state: receiverDetails.state || '',
        destination_country: 'Nigeria',
        destination_country_code: 'NG',
        weight: Number(weight) || 1,
        courier_id: courierId,
        pickup_date: pickupDate || new Date().toISOString().split('T')[0],
        delivery_type_code: 'last_mile',
        incoming_option_code: 'pickup',
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
