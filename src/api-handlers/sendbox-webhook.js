//src/api-handlers/sendbox-webhook.js/
import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    const firestoreStatus = statusCode === 'delivered'
      ? 'delivered'
      : statusCode === 'in_transit'
      ? 'in_transit'
      : statusCode === 'picked_up'
      ? 'dispatched'
      : statusCode === 'cancelled'
      ? 'cancelled'
      : 'dispatched'

    await orderDoc.ref.update({
      sendboxStatus: statusCode,
      sendboxStatusLabel: statusLabel,
      status: firestoreStatus,
      updatedAt: new Date().toISOString(),
    })

    console.log(`[sendbox-webhook] Updated order ${orderDoc.id} — status: ${statusCode}`)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[sendbox-webhook] Error:', err)
    return res.status(200).json({ received: true })
  }
}
