//src/api-handlers/topship-webhook.js/
// LIVE - see _lib/topship-booking.js header for the staging/production switch.
//
// Receives shipment status changes from Topship and moves the matching order forward.
//
// BUILT WITHOUT A SPEC, DELIBERATELY (2026-09-16). Topship documents no webhook at all -
// there is no webhook section anywhere in Docs/Topship-DOCS.txt, and when asked directly
// for the payload format, the status values, and whether requests are signed, they replied
// only "can you send your callback URL for it to be added". Rather than wait again (the
// domestic-rates docs question has been open since 2026-09-04), this handler is written to
// be correct under uncertainty:
//
//   1. It logs the ENTIRE raw payload on every call. Topship's first real delivery IS the
//      spec - the exact shape lands in the Vercel logs and the field/status guesses below
//      get replaced with observed values. Same "log the raw response, retest, confirm"
//      pattern that resolved the VAT rounding and array-unwrap bugs.
//   2. It reads the tracking id and status from every plausible field name rather than one
//      guessed key, so a reasonable payload shape works on the first try.
//   3. It classifies free-text statuses by keyword instead of an exact-match table, because
//      Topship's statuses ARE free text - /track-shipment returns things like "Confirmed"
//      and the Delivery tab already keyword-matches them (classifyShipmentStage in
//      DeliveryTab.jsx). The keyword sets here mirror that function on purpose.
//   4. It answers 200 to anything it doesn't understand, so an unrecognised event can never
//      make Topship mark the endpoint dead and stop sending.
//
// AUTH. Topship has not confirmed whether they sign requests. Until they do, this uses the
// same mechanism as sendbox-webhook.js: a secret embedded in the registered callback URL,
//     https://www.sellapage.com.ng/api/topship-webhook?key=<TOPSHIP_WEBHOOK_SECRET>
// Without it the endpoint would accept any unauthenticated POST and rewrite an order's
// fulfilment status for any guessed tracking id.
//
// If order statuses stop updating from Topship, check the Vercel logs for
// "[topship-webhook] UNAUTHENTICATED CALL" - that means the URL registered with Topship is
// missing ?key=, or the key doesn't match TOPSHIP_WEBHOOK_SECRET in Vercel.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { notifyStore } from './_lib/notifications.js'

const ENFORCE_WEBHOOK_SECRET = true

// Forward order of the courier path, mirroring ORDER_STEPS in src/utils/storeDesign.js
// and STATUS_RANK in sendbox-webhook.js. Used only to refuse backward moves.
const STATUS_RANK = {
  pending: 0,
  confirmed: 1,
  dispatched: 2,
  in_transit: 3,
  delivered: 4,
}

const TERMINAL = new Set(['delivered', 'cancelled'])

/** True when `next` is a real forward move from `previous`. */
function advancesStatus(previous, next) {
  if (!previous) return true
  if (previous === next) return false
  // A finished order is finished. A late courier event must not reopen it, and
  // cancelled after delivered is nonsense that would corrupt revenue reporting.
  if (TERMINAL.has(previous)) return false
  // Cancellation does not need to outrank what it replaces; a courier can cancel
  // a parcel at any point before delivery.
  if (next === 'cancelled') return true
  const from = STATUS_RANK[previous]
  const to = STATUS_RANK[next]
  if (from === undefined || to === undefined) return true
  return to > from
}

// Topship statuses are free text, so this matches on keywords rather than an exact table.
// Kept deliberately in step with classifyShipmentStage() in DeliveryTab.jsx - if a real
// payload shows a status this gets wrong, fix BOTH.
//
// Returns null for anything unrecognised, which is treated as "ignore, but log".
function classifyTopshipStatus(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (!s) return null
  // Checked before the rest: "failed delivery" must not read as "delivered".
  if (/cancel|fail|reject|return|abort/.test(s)) return 'cancelled'
  if (/deliver(ed|y complete)|completed|dropped off/.test(s)) return 'delivered'
  if (/transit|hub|processing|in progress|out for|dispatch|shipped|arrived|departed/.test(s)) return 'in_transit'
  if (/pick(ed)?[ -]?up|collect|assigned|rider|courier on/.test(s)) return 'dispatched'
  // Deliberately unmapped: draft/confirmed/pending/booked. The order is already at least
  // this far on our side, so writing them again says nothing and can only regress.
  return null
}

// Which transitions are worth waking a vendor for. Keys are OUR status values.
// 'delivered' is intentionally absent: update-order-status.js already notifies on
// delivered, and duplicating it here sends two pushes for one event.
const DELIVERY_PUSH_STATUSES = {
  dispatched: {
    title: 'Parcel picked up 📦',
    body: (name) => `The courier has collected ${name}'s order.`,
  },
  in_transit: {
    title: 'Parcel on the move 🚚',
    body: (name) => `${name}'s order is with the courier and moving.`,
  },
  cancelled: {
    title: 'Delivery cancelled',
    body: (name) => `The courier cancelled ${name}'s delivery. Check the Delivery tab.`,
  },
}

function keyMatches(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** First non-empty value among the given candidates. */
function firstOf(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export default async function handler(req, res) {
  // Many providers validate a callback URL with a GET before enabling it. Answering 200
  // (with no side effects) means registration can't fail for a reason we control.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, endpoint: 'topship-webhook' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authorized = keyMatches(req.query?.key, process.env.TOPSHIP_WEBHOOK_SECRET)
  if (!authorized) {
    console.warn('[topship-webhook] UNAUTHENTICATED CALL - no valid ?key=', {
      hasKey: !!req.query?.key,
      secretConfigured: !!process.env.TOPSHIP_WEBHOOK_SECRET,
    })
    if (ENFORCE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    body = body || {}

    // THE POINT OF THIS HANDLER RIGHT NOW. Topship's payload shape is undocumented, so the
    // first real event needs to be fully visible. Once the shape is known from these logs,
    // narrow the field lookups below and consider dropping this to a smaller line.
    console.log('[topship-webhook] RAW PAYLOAD:', JSON.stringify(body))

    // Topship wraps some API responses in an array and some in { data: ... }; neither is
    // documented for webhooks, so unwrap both defensively before reading any field.
    const payload = Array.isArray(body) ? (body[0] || {}) : body
    const d = payload?.data && typeof payload.data === 'object' ? payload.data : payload

    const trackingId = firstOf(
      d?.trackingId, d?.tracking_id, d?.trackingNumber, d?.tracking_number,
      payload?.trackingId, payload?.tracking_id, payload?.trackingNumber,
    )
    const shipmentId = firstOf(d?.shipmentId, d?.shipment_id, d?.id, payload?.shipmentId, payload?.id)
    const rawStatus = firstOf(
      d?.status, d?.shipmentStatus, d?.shipment_status, d?.event, d?.eventType, d?.type,
      payload?.status, payload?.shipmentStatus, payload?.event,
    )

    if (!trackingId && !shipmentId) {
      console.log('[topship-webhook] No tracking id or shipment id in payload - ignoring')
      return res.status(200).json({ received: true })
    }

    const db = getAdminDb()

    // Match on tracking id first, then shipment id. Both are written at booking time by
    // topship-create-shipment.js (topshipTrackingId / topshipShipmentId).
    //
    // NOTE: these are collection-group queries on a single field, which Firestore only
    // serves if that field has an explicit single-field index exemption for collection-group
    // scope - the same thing bookings/reviewToken needed. If the logs show a FAILED_PRECONDITION
    // (code 9) here, that exemption is missing for topshipTrackingId / topshipShipmentId.
    let orderDoc = null
    for (const [field, value] of [['topshipTrackingId', trackingId], ['topshipShipmentId', shipmentId]]) {
      if (!value) continue
      try {
        const snap = await db.collectionGroup('orders').where(field, '==', value).limit(1).get()
        if (!snap.empty) {
          orderDoc = snap.docs[0]
          break
        }
      } catch (queryErr) {
        console.error(
          `[topship-webhook] query on ${field} failed (code ${queryErr?.code}) - a missing collection-group index exemption looks like this:`,
          queryErr?.message || queryErr,
        )
      }
    }

    if (!orderDoc) {
      console.log(`[topship-webhook] No order found for trackingId "${trackingId}" / shipmentId "${shipmentId}"`)
      return res.status(200).json({ received: true })
    }

    const orderData = orderDoc.data() || {}
    const previousStatus = orderData.status || null
    // stores/{storeId}/orders/{orderId} - storeId is not a field on the order, it only
    // exists in the path, so it is read back off the reference.
    const storeId = orderDoc.ref.parent.parent?.id || null

    const firestoreStatus = classifyTopshipStatus(rawStatus)
    if (!firestoreStatus) {
      // Covers both the statuses we deliberately ignore (draft/confirmed/pending) and
      // genuinely unknown ones. Logged either way so an unexpected value is visible.
      console.log(`[topship-webhook] status "${rawStatus}" not mapped - ignoring (order ${orderDoc.id})`)
      return res.status(200).json({ received: true })
    }

    // Couriers redeliver webhooks and do not guarantee order. Without this an in_transit
    // event arriving after delivered would walk a finished order backwards, rewrite its
    // statusLog, and fire a "parcel on the move" push for a parcel already delivered.
    if (!advancesStatus(previousStatus, firestoreStatus)) {
      console.log(
        `[topship-webhook] ignoring "${rawStatus}" (${firestoreStatus}) - order ${orderDoc.id} is already ${previousStatus}`,
      )
      return res.status(200).json({ received: true })
    }

    const changedAtIso = new Date().toISOString()
    await orderDoc.ref.update({
      topshipStatus: rawStatus,
      topshipStatusLabel: firstOf(d?.message, d?.description, payload?.message) || rawStatus,
      status: firestoreStatus,
      updatedAt: changedAtIso,
      statusLog: FieldValue.arrayUnion({
        status: firestoreStatus,
        changedAt: changedAtIso,
        changedBy: 'topship',
        changedByLabel: 'Courier Update',
      }),
    })

    console.log(`[topship-webhook] Updated order ${orderDoc.id} - status: "${rawStatus}" -> ${firestoreStatus}`)

    // Notify the vendor ON TRANSITIONS ONLY. Couriers re-send the same status, sometimes
    // several times for one parcel, and a vendor who gets four "in transit" pushes for one
    // delivery turns notifications off - and then never sees the order ones either.
    if (storeId && firestoreStatus !== previousStatus && DELIVERY_PUSH_STATUSES[firestoreStatus]) {
      try {
        const label = DELIVERY_PUSH_STATUSES[firestoreStatus]
        await notifyStore(db, storeId, {
          type: 'delivery_update',
          title: label.title,
          body: label.body(orderData.customerName || 'A customer'),
          data: { orderId: orderDoc.id, status: firestoreStatus, courier: 'topship' },
        })
      } catch (notifyErr) {
        // The status write already succeeded and Topship must still get its 200, or it will
        // redeliver the webhook and the transition check will then suppress the very
        // notification this failed to send.
        console.error('[topship-webhook] notify failed:', notifyErr?.message || notifyErr)
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    // Never surface a 500 to Topship: a provider that sees repeated errors can disable the
    // callback entirely. The error is logged; the delivery is acknowledged.
    console.error('[topship-webhook] Error:', err)
    return res.status(200).json({ received: true })
  }
}
