//sellapage/netlify/functions/shipbubble-webhook.js/
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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
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

    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    console.error('shipbubble-webhook error:', err)
    return { statusCode: 200, body: 'OK' }
  }
}
