//src/api-handlers/topship-create-shipment.js
// STAGING ONLY — see _lib/topship-booking.js header for the staging/production switch.
//
// TEMPORARY (2026-07-20): `reference` is optional. When absent, this handler skips the
// Paystack verification step entirely and books directly, so staging testing doesn't
// require completing a real Paystack checkout each time. This bypass is HARD-GATED to
// non-production — see the `TOPSHIP_ENV === 'production'` check below — so it cannot
// function even if this ships unmodified once a production key exists. See README.md
// "Topship Payment-First Booking — Temporarily Bypassed for Staging Testing" for the
// full log of what this replaced and how to fully re-enable payment-first booking.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { bookTopshipShipment, resolveShipmentRoute } from './_lib/topship-booking.js'
import { sendEmail } from './_lib/send-email.js'
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
    reference, // optional during the staging bypass — see file header
    pricingTier, // Topship enum: Budget / Express / FedEx / Premium / LastMileBudget
    shippingFee, // Naira — required when `reference` is absent
    senderDetails,
    receiverDetails,
    weight = 1,
    itemCategory = 'Others',
    insuranceType = 'None',
    pickupDate,
  } = req.body

  if (!storeId || !orderId || !pricingTier || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, pricingTier, senderDetails, receiverDetails',
    })
  }

  const isProduction = (process.env.TOPSHIP_ENV || 'staging').toLowerCase() === 'production'
  if (!reference && isProduction) {
    return res.status(400).json({ error: 'Payment reference is required' })
  }
  if (!reference && !shippingFee) {
    return res.status(400).json({ error: 'shippingFee is required when booking without a payment reference' })
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

    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    let resolvedShippingFee = Number(shippingFee) || 0

    if (reference) {
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
      resolvedShippingFee = Number(txn.metadata?.shippingFee) || resolvedShippingFee
    } else {
      console.warn(`[topship-create-shipment] Booking WITHOUT payment verification (staging bypass) — order ${orderId}`)
    }

    const shipmentRoute = resolveShipmentRoute(senderDetails.countryCode, receiverDetails.countryCode)

    const result = await bookTopshipShipment({
      items: [{
        category: itemCategory,
        description: 'Package',
        weight: Number(weight) || 1,
        quantity: 1,
        value: Math.round(resolvedShippingFee * 100),
      }],
      itemCollectionMode: 'PickUp',
      pricingTier,
      insuranceType,
      shipmentChargeNaira: resolvedShippingFee,
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
      shipmentRoute,
      senderDetail: {
        name: senderDetails.name,
        email: senderDetails.email,
        phone: senderDetails.phone,
        addressLine1: senderDetails.address,
        state: senderDetails.state,
        city: senderDetails.city,
        country: senderDetails.country,
        countryCode: senderDetails.countryCode,
        postalCode: senderDetails.postalCode,
      },
      receiverDetail: {
        name: receiverDetails.name,
        email: receiverDetails.email,
        phone: receiverDetails.phone,
        addressLine1: receiverDetails.address,
        state: receiverDetails.state,
        city: receiverDetails.city,
        country: receiverDetails.country,
        countryCode: receiverDetails.countryCode,
        postalCode: receiverDetails.postalCode,
      },
    })

    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const shipData = result.data
    // Confirms exactly what Topship put in each field on a real success (trackingUrl in
    // particular — see Changelog-README.md 2026-07-22 entry re: the Track-link 404 investigation).
    console.log('[topship-create-shipment] booked shipment record:', JSON.stringify(shipData))
    const trackingId = shipData?.trackingId || shipData?.thirdPartyTrackingId || ''
    const trackingUrl = shipData?.trackingUrl || ''
    const now = new Date()

    // Exact addresses actually sent to Topship for this booking — the vendor may have
    // edited these in the modal from the order's original checkout address, so this is
    // higher-fidelity than falling back to order.deliveryAddress. Displayed on the
    // Delivery tab with zero extra reads (already loaded with the order).
    const topshipSenderAddress = {
      name: senderDetails.name || '',
      address: senderDetails.address || '',
      city: senderDetails.city || '',
      state: senderDetails.state || '',
      country: senderDetails.country || '',
    }
    const topshipReceiverAddress = {
      name: receiverDetails.name || '',
      address: receiverDetails.address || '',
      city: receiverDetails.city || '',
      state: receiverDetails.state || '',
      country: receiverDetails.country || '',
    }

    await orderRef.update({
      topshipTrackingId: trackingId,
      topshipShipmentId: shipData?.id || '',
      topshipTrackingUrl: trackingUrl,
      topshipStatus: shipData?.shipmentStatus || 'Confirmed',
      topshipPaymentBypassed: !reference,
      topshipSenderAddress,
      topshipReceiverAddress,
      provider: 'topship',
      status: 'dispatched',
      updatedAt: now.toISOString(),
      statusLog: FieldValue.arrayUnion({
        status: 'dispatched',
        changedAt: now.toISOString(),
        changedBy: 'system',
        changedByLabel: reference ? 'Shipment Booked (Topship)' : 'Shipment Booked (Topship, staging — payment bypassed)',
      }),
    })

    // Best-effort vendor notification — never blocks the booking response on failure,
    // same non-fatal try/catch pattern already used in submit-review.js.
    try {
      const storeData = storeDoc.data() || {}
      if (storeData.email) {
        const trackLine = /^https?:\/\//i.test(trackingUrl)
          ? `<p style="margin:0 0 8px 0;"><a href="${trackingUrl}" style="color:#2563eb;">Track this shipment</a></p>`
          : ''
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
            <div style="background:#16a34a;padding:18px;color:#fff;font-weight:700;">${storeData.businessName || 'Sellapage'}</div>
            <div style="padding:20px;background:#fff;color:#111827;">
              <h2 style="margin:0 0 12px 0;">Shipment booked with Topship</h2>
              <p style="margin:0 0 8px 0;">Tracking ID: <strong>${trackingId || 'N/A'}</strong></p>
              <p style="margin:0 0 4px 0;color:#6b7280;">Pickup: ${topshipSenderAddress.address}, ${topshipSenderAddress.city}</p>
              <p style="margin:0 0 12px 0;color:#6b7280;">Delivery: ${topshipReceiverAddress.address}, ${topshipReceiverAddress.city}</p>
              ${trackLine}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
              <p style="color:#9ca3af;font-size:12px;">You can also check live status any time from the Delivery tab in your Sellapage dashboard.</p>
            </div>
          </div>
        `
        await sendEmail(storeData.email, `Shipment Booked — Tracking ${trackingId || ''}`.trim(), html)
      }
    } catch (err) {
      console.error('[topship-create-shipment] vendor email failed (non-fatal):', err)
    }

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
