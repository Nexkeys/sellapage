//src/api-handlers/sendbox-webhook.js/
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { notifyStore } from './_lib/notifications.js'

// Which courier transitions are worth waking a vendor for, and what to say.
//
// SCOPED TO WHAT THE CODE ACTUALLY RECEIVES. STATUS_MAP below accepts exactly
// four Sendbox status_code values and ignores everything else, so those are the
// only transitions that can reach here at all. Note that Sendbox's own
// documented payloads also contain `in_delivery`, which STATUS_MAP does NOT
// list and therefore drops on the floor today. If real webhook logs confirm
// Sendbox sends it, add it to STATUS_MAP first and give it an entry here
// second; adding it here alone would do nothing.
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

    // Strict vocabulary. The previous chain defaulted unknown status codes to
    // 'dispatched', so an arbitrary or malformed value still moved a real order
    // into a real fulfilment state. Unknown codes are now ignored.
    const STATUS_MAP = {
      delivered: 'delivered',
      in_transit: 'in_transit',
      picked_up: 'dispatched',
      cancelled: 'cancelled',
    }
    const firestoreStatus = STATUS_MAP[statusCode]
    if (!firestoreStatus) {
      console.log(`[sendbox-webhook] Unknown status_code "${statusCode}" - ignoring`)
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
