//src/api-handlers/sendbox-create-shipment.js/
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { createSendboxShipment } from './_lib/sendbox-booking.js'

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
    packageType = 'general',
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

    const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'
    const callbackUrl = `${appUrl}/api/sendbox-webhook?transactionType=tracking`

    const result = await createSendboxShipment({
      senderDetails,
      receiverDetails,
      weight,
      courierId,
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
      totalValue: orderDoc.data()?.grandTotal || orderDoc.data()?.total || 5000,
      packageType,
      callbackUrl,
    })

    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const shipData = result.data
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
