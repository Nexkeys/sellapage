//sellapage/netlify/functions/shipbubble-rates.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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

  const { storeId, deliveryState, deliveryLga, deliveryAddress, weight } = body
  const parsedWeight = weight != null ? Number(weight) : 1

  if (!storeId || !deliveryState?.trim() || !deliveryLga?.trim() || !deliveryAddress || typeof deliveryAddress !== 'object') {
    return jsonResponse(400, {
      error: 'Missing required fields: storeId, deliveryState, deliveryLga, deliveryAddress',
    })
  }

  if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
    return jsonResponse(400, { error: 'weight must be a number > 0' })
  }

  try {
    const { db } = getAdminServices()

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return jsonResponse(404, { error: 'Store not found' })
    }

    const store = storeDoc.data()
    const pickupAddress = store.pickupAddress
    if (!pickupAddress) {
      return jsonResponse(400, { error: 'Store has not set up a pickup address' })
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
      return jsonResponse(shipbubbleResponse.status, {
        error: errorData.message || 'Failed to fetch shipping rates from Shipbubble',
      })
    }

    const shipbubbleData = await shipbubbleResponse.json()
    return jsonResponse(200, { rates: shipbubbleData.data?.couriers || [] })
  } catch (err) {
    console.error('shipbubble-rates error:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}
