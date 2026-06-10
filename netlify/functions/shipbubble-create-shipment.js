//sellapage/netlify/functions/shipbubble-create-shipment.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

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
    adminAuth: getAuth(),
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { storeId, orderId, courierId, senderDetails, receiverDetails, packageDetails } = body

  if (!storeId || !orderId || !courierId || !senderDetails || !receiverDetails || !packageDetails) {
    return jsonResponse(400, {
      error: 'Missing required fields: storeId, orderId, courierId, senderDetails, receiverDetails, packageDetails',
    })
  }

  try {
    const { db, adminAuth } = getAdminServices()

    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!idToken) {
      return jsonResponse(401, { error: 'Unauthorized' })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    if (decodedToken.uid !== storeId) {
      return jsonResponse(403, { error: 'Forbidden' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return jsonResponse(404, { error: 'Store not found' })
    }

    const orderDoc = await db.collection('stores').doc(storeId).collection('orders').doc(orderId).get()
    if (!orderDoc.exists) {
      return jsonResponse(404, { error: 'Order not found' })
    }

    const shipbubbleResponse = await fetch('https://api.shipbubble.com/v1/shipping/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courier_id: courierId,
        sender: senderDetails,
        receiver: receiverDetails,
        package_items: [packageDetails],
      }),
    })

    if (!shipbubbleResponse.ok) {
      const errorData = await shipbubbleResponse.json().catch(() => ({}))
      return jsonResponse(shipbubbleResponse.status, {
        error: errorData.message || 'Failed to create shipment with Shipbubble',
      })
    }

    const shipbubbleData = await shipbubbleResponse.json()
    const trackingId = shipbubbleData.data?.tracking_id
    const trackingUrl = shipbubbleData.data?.tracking_url

    if (!trackingId) {
      return jsonResponse(502, { error: 'Shipbubble did not return a tracking ID' })
    }

    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    await orderRef.update({
      shipbubbleTrackingId: trackingId,
      shipbubbleStatus: 'created',
    })

    return jsonResponse(200, { trackingId, trackingUrl })
  } catch (err) {
    console.error('shipbubble-create-shipment error:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}
