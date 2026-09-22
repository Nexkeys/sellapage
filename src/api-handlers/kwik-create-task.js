//src/api-handlers/kwik-create-task.js
// STAGING - see _lib/kwik-booking.js header. Kwik creates a production account only after
// sandbox testing passes, so nothing here has touched real money yet.
//
// !! PAYMENT-FIRST IS OFF, matching Sendbox and Topship !! Consistent with the decisions
// logged on 2026-08-12 (Topship) and 2026-09-16 (Sendbox): the vendor books without the
// customer having paid a delivery fee through Paystack. On staging this costs nothing. Before
// KWIK_ENV=production, all three providers need re-locking together.
//
// WHY THIS RE-QUOTES BEFORE BOOKING. /v2/create_task_via_vendor does not accept a quote id -
// it wants the actual values (amount, total_service_charge, insurance_amount, surge_cost,
// surge_type) that /send_payment_for_task and /get_bill_breakdown produced. Trusting numbers
// posted by the browser would let a client book a real delivery at a price it invented, so
// the pair is re-run server-side here and the client's figure is only used to detect drift.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { resolveCoords } from './_lib/geocode.js'
import { sendEmail } from './_lib/send-email.js'
import {
  calculateKwikPricing,
  getKwikBillBreakdown,
  createKwikTask,
  kwikJobStatusLabel,
} from './_lib/kwik-booking.js'

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
    vehicleId,
    senderDetails,
    receiverDetails,
    pickupDate,
    packageAmount = 0,
    deliveryInstruction = '',
  } = req.body || {}

  if (!storeId || !orderId || !vehicleId || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, vehicleId, senderDetails, receiverDetails',
    })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (err) {
      console.error('[kwik-create-task] verifyIdToken failed:', err?.code, err?.message)
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

    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    console.warn(`[kwik-create-task] Booking WITHOUT payment verification (payment-first off) - order ${orderId}`)

    const [pickupGeo, deliveryGeo] = await Promise.all([
      resolveCoords({
        latitude: senderDetails.latitude,
        longitude: senderDetails.longitude,
        address: senderDetails.address,
        city: senderDetails.city,
        state: senderDetails.state,
      }),
      resolveCoords({
        latitude: receiverDetails.latitude,
        longitude: receiverDetails.longitude,
        address: receiverDetails.address,
        city: receiverDetails.city,
        state: receiverDetails.state,
      }),
    ])
    if (!pickupGeo.success) return res.status(400).json({ error: `Pickup address: ${pickupGeo.error}` })
    if (!deliveryGeo.success) return res.status(400).json({ error: `Delivery address: ${deliveryGeo.error}` })

    const pickupTime = toKwikTime(pickupDate)
    const pickup = {
      address: senderDetails.address || '',
      name: senderDetails.name || '',
      phone: senderDetails.phone || '',
      email: senderDetails.email || '',
      latitude: pickupGeo.data.latitude,
      longitude: pickupGeo.data.longitude,
    }
    const delivery = {
      address: receiverDetails.address || '',
      name: receiverDetails.name || '',
      phone: receiverDetails.phone || '',
      email: receiverDetails.email || '',
      latitude: deliveryGeo.data.latitude,
      longitude: deliveryGeo.data.longitude,
      instruction: deliveryInstruction || orderDoc.data()?.notes || '',
    }

    // Re-quote server-side - see the header note on why the client's figure isn't trusted.
    const pricing = await calculateKwikPricing({
      pickup,
      delivery,
      vehicleId,
      pickupTime,
      parcelAmount: Number(packageAmount) || 0,
    })
    if (!pricing.success) return res.status(502).json({ error: pricing.error })

    const breakdown = await getKwikBillBreakdown({
      pricing: pricing.data,
      vehicleId,
      parcelAmount: Number(packageAmount) || 0,
      pickupTime,
    })
    if (!breakdown.success) return res.status(502).json({ error: breakdown.error })

    const result = await createKwikTask({
      pickup,
      delivery,
      vehicleId,
      pricing: pricing.data,
      breakdown: breakdown.data,
      pickupTime,
      deliveryTime: pickupTime,
      parcelAmount: Number(packageAmount) || 0,
    })
    if (!result.success) return res.status(502).json({ error: result.error })

    // First real booking confirms the response shape; the docs' sample is all we have.
    console.log('[kwik-create-task] created task:', JSON.stringify(result.data))

    const data = result.data || {}
    const deliveryLeg = Array.isArray(data.deliveries) ? data.deliveries[0] : null
    const pickupLeg = Array.isArray(data.pickups) ? data.pickups[0] : null

    const uniqueOrderId = data.unique_order_id || ''
    // The delivery leg's result_tracking_link is the human tracking page. Deliberately NOT
    // job_status_check_link, which is a raw API URL carrying our customer_id.
    const trackingUrl = deliveryLeg?.result_tracking_link || pickupLeg?.result_tracking_link || ''
    const now = new Date()

    // Addresses only - NO coordinates. These are Temporary Mapbox geocoding results, which
    // may not be cached or stored; Permanent storage needs a card on the Mapbox account.
    // See the header of _lib/geocode.js. Re-geocoding costs one free lookup, so nothing is
    // lost by leaving them out.
    const kwikSenderAddress = {
      name: pickup.name,
      address: pickup.address,
      city: senderDetails.city || '',
      state: senderDetails.state || '',
      country: 'Nigeria',
    }
    const kwikReceiverAddress = {
      name: delivery.name,
      address: delivery.address,
      city: receiverDetails.city || '',
      state: receiverDetails.state || '',
      country: 'Nigeria',
    }

    await orderRef.update({
      kwikUniqueOrderId: uniqueOrderId,
      kwikJobId: deliveryLeg?.job_id || null,
      kwikPickupJobId: pickupLeg?.job_id || null,
      kwikTrackingUrl: trackingUrl,
      kwikStatusCheckLink: data.job_status_check_link || '',
      kwikStatus: kwikJobStatusLabel(0),
      kwikVehicleId: String(vehicleId),
      kwikPaymentBypassed: true,
      kwikSenderAddress,
      kwikReceiverAddress,
      provider: 'kwik',
      status: 'dispatched',
      updatedAt: now.toISOString(),
      statusLog: FieldValue.arrayUnion({
        status: 'dispatched',
        changedAt: now.toISOString(),
        changedBy: 'system',
        changedByLabel: 'Shipment Booked (Kwik, payment bypassed)',
      }),
    })

    // Best-effort, never blocks the booking response - same pattern as the Topship handler.
    try {
      const storeData = storeDoc.data() || {}
      if (storeData.email) {
        const trackLine = /^https?:\/\//i.test(trackingUrl)
          ? `<p style="margin:0 0 8px 0;"><a href="${trackingUrl}" style="color:#2563eb;">Track this delivery</a></p>`
          : ''
        const approxNote = deliveryGeo.data.approximate
          ? `<p style="margin:8px 0 0 0;color:#b45309;font-size:12px;">The delivery address matched only approximately, so the rider has a nearby pin. The landmark in the order notes is what will find the door.</p>`
          : ''
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
            <div style="background:#16a34a;padding:18px;color:#fff;font-weight:700;">${storeData.businessName || 'Sellapage'}</div>
            <div style="padding:20px;background:#fff;color:#111827;">
              <h2 style="margin:0 0 12px 0;">Delivery booked with Kwik</h2>
              <p style="margin:0 0 8px 0;">Order reference: <strong>${uniqueOrderId || 'N/A'}</strong></p>
              <p style="margin:0 0 4px 0;color:#6b7280;">Pickup: ${kwikSenderAddress.address}</p>
              <p style="margin:0 0 12px 0;color:#6b7280;">Delivery: ${kwikReceiverAddress.address}</p>
              ${trackLine}
              ${approxNote}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
              <p style="color:#9ca3af;font-size:12px;">You can also check live status any time from the Delivery tab in your Sellapage dashboard.</p>
            </div>
          </div>
        `
        await sendEmail(storeData.email, `Delivery Booked - ${uniqueOrderId || ''}`.trim(), html)
      }
    } catch (err) {
      console.error('[kwik-create-task] vendor email failed (non-fatal):', err)
    }

    return res.status(200).json({
      success: true,
      uniqueOrderId,
      trackingUrl,
      jobId: deliveryLeg?.job_id || null,
      approximatePickup: !!pickupGeo.data.approximate,
      approximateDelivery: !!deliveryGeo.data.approximate,
    })
  } catch (err) {
    console.error('[kwik-create-task] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function toKwikTime(pickupDate) {
  const base = pickupDate ? new Date(`${pickupDate}T09:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ')
  return base.toISOString().slice(0, 19).replace('T', ' ')
}
