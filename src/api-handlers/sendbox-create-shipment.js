//src/api-handlers/sendbox-create-shipment.js/
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { createSendboxShipment } from './_lib/sendbox-booking.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

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
    courierId: courierIdFromBody,
    reference,
    senderDetails,
    receiverDetails,
    weight = 1,
    pickupDate,
    packageType = 'general',
  } = req.body
  if (!storeId || !orderId || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, senderDetails, receiverDetails',
    })
  }
  if (!reference && !courierIdFromBody) {
    return res.status(400).json({ error: 'Missing payment reference' })
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
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'delivery', true)
    if (!access.allowed) {
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

    // Self-contained Paystack verification, matching topship-create-shipment.js.
    //
    // The old flow expected the client to call /api/sendbox-payment-verify first
    // and pass back the courierId it returned - but that handler was never built,
    // so the redirect after payment 404'd and the shipment was never created even
    // though the customer had been charged.
    //
    // Verifying here also closes the hole that made a separate verify step risky:
    // this endpoint previously took courierId straight from the request body with
    // no proof of payment, so any vendor with delivery write access could book a
    // real shipment - and trigger a real Sendbox wallet charge - without paying.
    let courierId = courierIdFromBody

    if (reference) {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
      )
      const verifyData = await verifyRes.json()
      const txn = verifyData?.data

      if (!verifyRes.ok || !verifyData?.status || txn?.status !== 'success') {
        return res.status(402).json({ error: 'Payment could not be verified' })
      }
      if (txn?.metadata?.storeId !== storeId || txn?.metadata?.orderId !== orderId) {
        return res.status(400).json({ error: 'Payment reference does not match this order' })
      }

      // Trust the courier recorded at payment time, not whatever the client sends
      // now - otherwise someone could pay for the cheapest courier and book the
      // most expensive one.
      courierId = txn.metadata?.courierId || courierId
    }

    if (!courierId) {
      return res.status(400).json({ error: 'Missing courierId' })
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
