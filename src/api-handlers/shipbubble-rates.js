import { getAdminDb } from './_lib/firebase-admin.js'

const SHIPBUBBLE_BASE = 'https://api.shipbubble.com/v1'
const SHIPBUBBLE_TOKEN = process.env.SHIPBUBBLE_API_KEY

async function validateAddress(addressObj) {
  const res = await fetch(`${SHIPBUBBLE_BASE}/shipping/address/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SHIPBUBBLE_TOKEN}`,
    },
    body: JSON.stringify(addressObj),
  })
  const data = await res.json()
  if (!res.ok || !data?.data?.address_code) {
    const msg = data?.message || data?.error || 'Address validation failed'
    throw new Error(`Address validation failed: ${msg}`)
  }
  return data.data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    storeId,
    senderDetails,
    receiverDetails,
    weight = 1,
    categoryId = 98246239,
    packageAmount = 5000,
  } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }
  if (
    !senderDetails?.name ||
    !senderDetails?.phone ||
    !senderDetails?.address ||
    !senderDetails?.state
  ) {
    return res.status(400).json({ error: 'Incomplete sender details' })
  }
  if (
    !receiverDetails?.name ||
    !receiverDetails?.phone ||
    !receiverDetails?.address ||
    !receiverDetails?.state
  ) {
    return res.status(400).json({ error: 'Incomplete receiver details' })
  }

  try {
    const db = getAdminDb()
    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    // Step 1: Validate sender address
    let senderAddressData
    try {
      senderAddressData = await validateAddress({
        name: senderDetails.name,
        email: senderDetails.email || 'noreply@sellapage.com.ng',
        phone: senderDetails.phone,
        address: `${senderDetails.address}, ${senderDetails.city || ''}, ${senderDetails.state}, Nigeria`,
      })
    } catch (err) {
      return res.status(422).json({ error: `Sender address invalid: ${err.message}` })
    }

    // Step 2: Validate receiver address
    let receiverAddressData
    try {
      receiverAddressData = await validateAddress({
        name: receiverDetails.name,
        email: receiverDetails.email || 'customer@sellapage.com.ng',
        phone: receiverDetails.phone,
        address: `${receiverDetails.address}, ${receiverDetails.city || ''}, ${receiverDetails.state}, Nigeria`,
      })
    } catch (err) {
      return res.status(422).json({ error: `Receiver address invalid: ${err.message}` })
    }

    // Step 3: Fetch rates using address codes
    const today = new Date()
    const pickupDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const ratesRes = await fetch(`${SHIPBUBBLE_BASE}/shipping/fetch_rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SHIPBUBBLE_TOKEN}`,
      },
      body: JSON.stringify({
        sender_address_code: senderAddressData.address_code,
        reciever_address_code: receiverAddressData.address_code,
        pickup_date: pickupDate,
        category_id: categoryId,
        package_items: [
          {
            name: 'Package',
            description: 'Sellapage order',
            unit_weight: Number(weight) || 1,
            unit_amount: Number(packageAmount) || 5000,
            quantity: 1,
          },
        ],
        package_dimension: {
          length: 10,
          width: 10,
          height: 10,
        },
      }),
    })

    const ratesData = await ratesRes.json()

    if (!ratesRes.ok) {
      const errMsg = ratesData?.message || ratesData?.error || 'Failed to fetch rates'
      console.error('[shipbubble-rates] fetch_rates error:', ratesData)
      return res.status(ratesRes.status).json({ error: errMsg })
    }

    const couriers = ratesData?.data?.couriers || []
    const requestToken = ratesData?.data?.request_token || ''

    return res.status(200).json({
      rates: couriers.map((c) => ({
        courier_id: c.courier_id,
        courier_name: c.courier_name,
        courier_image: c.courier_image || '',
        service_code: c.service_code,
        total_shipping_fee: c.total || c.rate_card_amount || 0,
        delivery_eta: c.delivery_eta || '',
        pickup_eta: c.pickup_eta || '',
        service_type: c.service_type || '',
      })),
      request_token: requestToken,
    })
  } catch (err) {
    console.error('[shipbubble-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
