//sellapage/api/shipbubble-rates.js/
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
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    const { storeId, deliveryState, deliveryLga, deliveryAddress, weight } = body
    const parsedWeight = weight != null ? Number(weight) : 1

    if (!storeId || !deliveryState?.trim() || !deliveryLga?.trim() || !deliveryAddress || typeof deliveryAddress !== 'object') {
      return res.status(400).json({
        error: 'Missing required fields: storeId, deliveryState, deliveryLga, deliveryAddress',
      })
    }

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ error: 'weight must be a number > 0' })
    }

    const { db } = getAdminServices()

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const store = storeDoc.data()
    const pickupAddress = store.pickupAddress
    if (!pickupAddress) {
      return res.status(400).json({ error: 'Store has not set up a pickup address' })
    }

    const shipbubbleResponse = await fetch('https://api.shipbubble.com/v1/shipping/fetch_rates', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          address: pickupAddress.streetAddress,
          city: pickupAddress.city,
          state: pickupAddress.state,
          country: 'NG',
        },
        receiver: {
          address: deliveryAddress.streetAddress,
          city: deliveryAddress.city,
          state: deliveryState,
          lga: deliveryLga,
          country: 'NG',
        },
        package_items: [
          {
            weight: parsedWeight,
            weight_unit: 'kg',
          },
        ],
      }),
    })

    if (!shipbubbleResponse.ok) {
      const errorData = await shipbubbleResponse.json().catch(() => ({}))
      return res.status(shipbubbleResponse.status).json({
        error: errorData.message || 'Failed to fetch shipping rates from Shipbubble',
      })
    }

    const shipbubbleData = await shipbubbleResponse.json()
    return res.status(200).json({ rates: shipbubbleData.data?.couriers || [] })
  } catch (err) {
    console.error('shipbubble-rates error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
