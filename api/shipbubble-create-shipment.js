//sellapage/api/shipbubble-create-shipment.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
    adminAuth: getAuth(),
  }
}

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, orderId, courierId, senderDetails, receiverDetails, packageDetails } = body

    if (!storeId || !orderId || !courierId || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({
        error: 'Missing required fields: storeId, orderId, courierId, senderDetails, receiverDetails, packageDetails',
      })
    }

    const { db, adminAuth } = getAdminServices()

    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const orderDoc = await db.collection('stores').doc(storeId).collection('orders').doc(orderId).get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
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
      return res.status(shipbubbleResponse.status).json({
        error: errorData.message || 'Failed to create shipment with Shipbubble',
      })
    }

    const shipbubbleData = await shipbubbleResponse.json()
    const trackingId = shipbubbleData.data?.tracking_id
    const trackingUrl = shipbubbleData.data?.tracking_url

    if (!trackingId) {
      return res.status(502).json({ error: 'Shipbubble did not return a tracking ID' })
    }

    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    await orderRef.update({
      shipbubbleTrackingId: trackingId,
      shipbubbleStatus: 'created',
    })

    return res.status(200).json({ trackingId, trackingUrl })
  } catch (err) {
    console.error('shipbubble-create-shipment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
