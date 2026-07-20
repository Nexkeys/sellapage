//src/api-handlers/topship-create-shipment.js
// STAGING ONLY — see _lib/topship-booking.js header for the staging/production switch.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { bookTopshipShipment } from './_lib/topship-booking.js'

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
    reference,
    courierId, // Topship pricingTier, e.g. "Budget" / "Express" / "Premium"
    senderDetails,
    receiverDetails,
    weight = 1,
    itemCategory = 'Others',
    insuranceType = 'None',
  } = req.body

  if (!storeId || !orderId || !reference || !courierId || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, reference, courierId, senderDetails, receiverDetails',
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

    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Self-contained Paystack verification. Unlike the Sendbox redirect flow (which
    // depends on a separate /api/sendbox-payment-verify call — a handler that doesn't
    // currently exist in this codebase), this endpoint verifies the transaction itself
    // before booking, so a crafted/incomplete reference can't trigger a real Topship
    // wallet charge.
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const verifyData = await verifyRes.json()
    const txn = verifyData?.data

    if (!verifyRes.ok || !verifyData?.status || txn?.status !== 'success') {
      return res.status(402).json({ error: 'Payment could not be verified' })
    }
    if (txn?.metadata?.storeId !== storeId || txn?.metadata?.orderId !== orderId) {
      return res.status(400).json({ error: 'Payment reference does not match this order' })
    }

    const shippingFee = Number(txn.metadata?.shippingFee) || 0

    const result = await bookTopshipShipment({
      items: [{
        category: itemCategory,
        description: 'Package',
        weight: Number(weight) || 1,
        quantity: 1,
        value: Math.round(shippingFee * 100),
      }],
      itemCollectionMode: 'PickUp',
      pricingTier: courierId,
      insuranceType,
      shipmentChargeNaira: shippingFee,
      senderDetail: {
        name: senderDetails.name,
        email: senderDetails.email,
        phone: senderDetails.phone,
        addressLine1: senderDetails.address,
        state: senderDetails.state,
        city: senderDetails.city,
      },
      receiverDetail: {
        name: receiverDetails.name,
        email: receiverDetails.email,
        phone: receiverDetails.phone,
        addressLine1: receiverDetails.address,
        state: receiverDetails.state,
        city: receiverDetails.city,
      },
    })

    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const shipData = result.data
    const trackingId = shipData?.trackingId || shipData?.thirdPartyTrackingId || ''
    const trackingUrl = shipData?.trackingUrl || ''
    const now = new Date()

    await orderRef.update({
      topshipTrackingId: trackingId,
      topshipShipmentId: shipData?.id || '',
      topshipTrackingUrl: trackingUrl,
      topshipStatus: shipData?.shipmentStatus || 'Confirmed',
      provider: 'topship',
      status: 'dispatched',
      updatedAt: now.toISOString(),
      statusLog: FieldValue.arrayUnion({
        status: 'dispatched',
        changedAt: now.toISOString(),
        changedBy: 'system',
        changedByLabel: 'Shipment Booked (Topship)',
      }),
    })

    return res.status(200).json({
      success: true,
      trackingId,
      trackingUrl,
      shipmentId: shipData?.id || '',
    })
  } catch (err) {
    console.error('[topship-create-shipment] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
