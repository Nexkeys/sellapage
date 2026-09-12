//src/api-handlers/sendbox-webhook.js/
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { notifyStore } from './_lib/notifications.js'

// Sendbox tracking status_code -> this platform's order status.
//
// SOURCE: Docs/Sendbox-DOCS.txt, "Tracking Response", which names each code
// explicitly. The documented set is:
//   drafted           book on hold, shipment not paid for
//   pending           request accepted, waiting to be picked up
//   pickup_started    courier is on the way to collect
//   pickup_completed  courier now has the parcel
//   in_delivery       delivery process has started
//   in_transit        moving, updated in real time
//   delivered         complete
//
// WHAT WAS WRONG BEFORE: the map keyed on `picked_up`, which is NOT one of
// Sendbox's codes, so the collection moment never matched and the order never
// reached `dispatched` from a webhook. `pickup_completed` and `in_delivery`
// were absent entirely, so the two events a vendor most wants to know about
// were silently discarded. Only in_transit and delivered ever did anything.
//
// DELIBERATELY NOT MAPPED. Each of these would move an order backwards or
// assert something untrue:
//   drafted, pending  the order is already at least `pending` on our side;
//                     writing it again says nothing and can only regress.
//   pickup_started    the courier has NOT got the parcel yet, so calling it
//                     dispatched would tell the customer it had left.
//
// KEPT BUT UNDOCUMENTED: `picked_up` and `cancelled` do not appear anywhere in
// Sendbox's documentation. They are left in place because removing a key that
// may be live in production is the riskier move, and both map to a correct
// destination if Sendbox does send them. Confirm against real webhook logs
// before deleting either.
const STATUS_MAP = {
  pickup_completed: 'dispatched',
  in_delivery: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'delivered',
  picked_up: 'dispatched',
  cancelled: 'cancelled',
}

// Forward order of the normal courier path, mirroring ORDER_STEPS in
// src/utils/storeDesign.js, where in_transit sits between dispatched and
// delivered. Used only to refuse backward moves.
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
  // Cancellation is the one status that does not need to outrank what it
  // replaces; a courier can cancel a parcel at any point before delivery.
  if (next === 'cancelled') return true
  const from = STATUS_RANK[previous]
  const to = STATUS_RANK[next]
  if (from === undefined || to === undefined) return true
  return to > from
}

// Which courier transitions are worth waking a vendor for, and what to say.
// Keys are OUR status values, so they only fire for codes STATUS_MAP admits.
//
// 'delivered' is intentionally absent: update-order-status.js already notifies
// on delivered, and duplicating it here would send two pushes for one event.
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

// Sendbox does not document any webhook signing mechanism (checked against
// docs.sendbox.co - the WooCommerce webhook guide covers OAuth setup but no
// HMAC header or shared signing secret). So instead of signature verification
// this uses a secret embedded in the callback URL registered with Sendbox:
//     https://sellapage.com.ng/api/sendbox-webhook?key=<SENDBOX_WEBHOOK_SECRET>
//
// Without this, the endpoint accepted any unauthenticated POST and would
// rewrite an order's fulfilment status for any guessed shipment code.
//
// ENFORCED since 2026-08-09. The staged "watch mode" rollout was skipped
// deliberately: there were no active shipments at the time (no vendors on a
// paid plan), so there was no live traffic that enforcing could disrupt - and
// leaving it permissive indefinitely was the greater risk.
//
// If order statuses ever stop updating from Sendbox, check the Vercel logs for
// "[sendbox-webhook] UNAUTHENTICATED CALL". That means the callback URL
// registered in the Sendbox dashboard is missing the ?key= parameter, or the
// key doesn't match SENDBOX_WEBHOOK_SECRET in Vercel.
const ENFORCE_WEBHOOK_SECRET = true

function keyMatches(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authorized = keyMatches(req.query.key, process.env.SENDBOX_WEBHOOK_SECRET)
  if (!authorized) {
    console.warn('[sendbox-webhook] UNAUTHENTICATED CALL - no valid ?key=', {
      hasKey: !!req.query.key,
      secretConfigured: !!process.env.SENDBOX_WEBHOOK_SECRET,
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

    const code = body?.data?.code || body?.code || ''
    const statusCode = body?.data?.status_code || body?.status_code || ''
    const statusLabel = body?.data?.status || body?.status || ''

    if (!code) {
      console.log('[sendbox-webhook] No shipment code in payload - ignoring')
      return res.status(200).json({ received: true })
    }

    const db = getAdminDb()

    const ordersQuery = await db
      .collectionGroup('orders')
      .where('sendboxOrderCode', '==', code)
      .limit(1)
      .get()

    if (ordersQuery.empty) {
      console.log(`[sendbox-webhook] No order found for code: ${code}`)
      return res.status(200).json({ received: true })
    }

    const orderDoc = ordersQuery.docs[0]
    const orderData = orderDoc.data() || {}
    const previousStatus = orderData.status || null
    // stores/{storeId}/orders/{orderId} - storeId is not a field on the order,
    // it only exists in the path, so it is read back off the reference.
    const storeId = orderDoc.ref.parent.parent?.id || null

    const firestoreStatus = STATUS_MAP[statusCode]
    if (!firestoreStatus) {
      // Includes the codes we deliberately ignore (drafted, pending,
      // pickup_started) as well as genuinely unknown ones. Logged either way so
      // an unexpected value is visible rather than silent.
      console.log(`[sendbox-webhook] status_code "${statusCode}" not mapped - ignoring`)
      return res.status(200).json({ received: true })
    }

    // Couriers redeliver webhooks and do not guarantee order. Without this an
    // in_transit event arriving after delivered would walk a finished order
    // backwards, rewrite its statusLog, and fire a "parcel on the move" push
    // for a parcel already in the customer's hands.
    if (!advancesStatus(previousStatus, firestoreStatus)) {
      console.log(
        `[sendbox-webhook] ignoring ${statusCode} (${firestoreStatus}) - order ${orderDoc.id} is already ${previousStatus}`,
      )
      return res.status(200).json({ received: true })
    }

    const changedAtIso = new Date().toISOString()
    await orderDoc.ref.update({
      sendboxStatus: statusCode,
      sendboxStatusLabel: statusLabel,
      status: firestoreStatus,
      updatedAt: changedAtIso,
      statusLog: FieldValue.arrayUnion({
        status: firestoreStatus,
        changedAt: changedAtIso,
        changedBy: 'sendbox',
        changedByLabel: 'Courier Update',
      }),
    })

    console.log(`[sendbox-webhook] Updated order ${orderDoc.id} - status: ${statusCode}`)

    // Notify the vendor ON TRANSITIONS ONLY.
    //
    // Couriers re-send the same status, sometimes several times for one parcel.
    // A vendor who gets four "in transit" pushes for a single delivery turns
    // notifications off, and then never sees the order ones either. The
    // previous status was read before the update above for exactly this.
    //
    // 'delivered' is excluded here deliberately: update-order-status.js already
    // pushes when an order reaches delivered, and two notifications for one
    // event is the same annoyance from a different direction.
    if (storeId && firestoreStatus !== previousStatus && DELIVERY_PUSH_STATUSES[firestoreStatus]) {
      try {
        const label = DELIVERY_PUSH_STATUSES[firestoreStatus]
        await notifyStore(db, storeId, {
          type: 'delivery_update',
          title: label.title,
          body: label.body(orderData.customerName || 'A customer'),
          data: { orderId: orderDoc.id, status: firestoreStatus, courier: 'sendbox' },
        })
      } catch (notifyErr) {
        // The status write already succeeded and Sendbox must still get its 200,
        // or it will redeliver the webhook and the transition check will then
        // suppress the very notification this failed to send.
        console.error('[sendbox-webhook] notify failed:', notifyErr?.message || notifyErr)
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[sendbox-webhook] Error:', err)
    return res.status(200).json({ received: true })
  }
}
