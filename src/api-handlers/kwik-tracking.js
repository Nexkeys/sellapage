//src/api-handlers/kwik-tracking.js
// STAGING - see _lib/kwik-booking.js header.
//
// POLLING ONLY. Kwik has no webhooks - zero matches across all 2,609 lines of
// Docs/Kwik-DOCS.txt - so unlike Sendbox and Topship there is nothing that can push a status
// change to us. The Delivery tab's Refresh is the only thing that moves a Kwik shipment
// forward, which is worth knowing before wondering why a Kwik order sits still.
//
// Returns the same shape topship-tracking.js does, so the shared Delivery tab timeline
// renders Kwik with no rework:
//   { status, trackingCode, timeline: [...], ... }
//
// TWO DIFFERENCES the mapping has to absorb:
//   1. Kwik's status is a NUMBER (job_status 0-10), not text, while classifyShipmentStage()
//      in DeliveryTab.jsx keyword-matches strings. kwikJobStatusLabel() converts first.
//   2. A Kwik task has two legs - pickup (job_type 0) and delivery (job_type 1) - each with
//      its own status. The delivery leg is the shipment's status; the pickup leg only says
//      whether the rider has collected yet. Both are returned so the UI can show both.
//
// Like Topship, Kwik exposes no event-history array, so the timeline is synthesized from the
// current status - which ShipmentTimelineCard already degrades to gracefully.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { getKwikTask, kwikJobStatusLabel } from './_lib/kwik-booking.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, trackingCode } = req.body || {}
  if (!storeId || !trackingCode) {
    return res.status(400).json({ error: 'Missing required fields: storeId, trackingCode' })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (err) {
      console.error(`[kwik-tracking] verifyIdToken failed for ${trackingCode}:`, err?.code, err?.message)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Matches the Topship/Sendbox authorisation model rather than the uid === storeId
    // shortcut, so staff with delivery access can track too.
    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'delivery', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await getKwikTask(trackingCode)
    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const { pickupLeg, deliveryLeg, jobStatus, statusLabel, totalAmount } = result.data

    // Newest first, matching how ShipmentTimelineCard renders (index 0 gets the live dot).
    const timeline = []
    if (deliveryLeg) {
      timeline.push({
        status: `Delivery: ${kwikJobStatusLabel(deliveryLeg.job_status)}`,
        description: deliveryLeg.address || '',
        time: '',
      })
    }
    if (pickupLeg) {
      timeline.push({
        status: `Pickup: ${kwikJobStatusLabel(pickupLeg.job_status)}`,
        description: pickupLeg.address || '',
        time: '',
      })
    }

    return res.status(200).json({
      status: statusLabel,
      jobStatus,
      trackingCode,
      timeline,
      itemLocation: '',
      message: '',
      updatedAt: '',
      createdAt: '',
      estimatedDelivery: '',
      totalAmount,
      sender: pickupLeg
        ? { name: pickupLeg.name || '', phone: pickupLeg.phone || '', address: pickupLeg.address || '' }
        : null,
      receiver: deliveryLeg
        ? { name: deliveryLeg.name || '', phone: deliveryLeg.phone || '', address: deliveryLeg.address || '' }
        : null,
    })
  } catch (err) {
    console.error('[kwik-tracking] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
