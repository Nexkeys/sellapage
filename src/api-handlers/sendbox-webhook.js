//src/api-handlers/sendbox-webhook.js/
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'

// Sendbox does not document any webhook signing mechanism (checked against
// docs.sendbox.co — the WooCommerce webhook guide covers OAuth setup but no
// HMAC header or shared signing secret). So instead of signature verification
// this uses a secret embedded in the callback URL registered with Sendbox:
//     https://sellapage.com.ng/api/sendbox-webhook?key=<SENDBOX_WEBHOOK_SECRET>
//
// Without this, the endpoint accepted any unauthenticated POST and would
// rewrite an order's fulfilment status for any guessed shipment code.
//
// ROLLOUT: leave ENFORCE_WEBHOOK_SECRET = false for one deploy and watch the
// Vercel logs. Once you see authenticated calls arriving (i.e. no
// "UNAUTHENTICATED CALL" warnings), set it to true. Flipping it before the
// Sendbox dashboard URL is updated will silently stop status updates.
const ENFORCE_WEBHOOK_SECRET = false

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
    console.warn('[sendbox-webhook] UNAUTHENTICATED CALL — no valid ?key=', {
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
      console.log('[sendbox-webhook] No shipment code in payload — ignoring')
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
      console.log(`[sendbox-webhook] Unknown status_code "${statusCode}" — ignoring`)
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

    console.log(`[sendbox-webhook] Updated order ${orderDoc.id} — status: ${statusCode}`)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[sendbox-webhook] Error:', err)
    return res.status(200).json({ received: true })
  }
}
