//sellapage/api/shipbubble-webhook.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const getAdminServices = () => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    })
  }

  return {
    db: getFirestore(),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).send('Invalid JSON')
  }

  try {
    const { db } = getAdminServices()
    const { trackingId, status } = body
    const actualTrackingId = trackingId || body.order_id
    const actualStatus = status || body.status

    if (actualTrackingId) {
      const ordersQuery = await db
        .collectionGroup('orders')
        .where('shipbubbleTrackingId', '==', actualTrackingId)
        .limit(1)
        .get()

      if (!ordersQuery.empty) {
        const orderDoc = ordersQuery.docs[0]
        await orderDoc.ref.update({ shipbubbleStatus: actualStatus })
      }
    }

    return res.status(200).send('OK')
  } catch (err) {
    console.error('shipbubble-webhook error:', err)
    return res.status(200).send('OK')
  }
}
