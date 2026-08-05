//src/api-handlers/topship-payment-initialize.js
// STAGING ONLY — see _lib/topship-booking.js header for the staging/production switch.
// Deliberately a separate file from sendbox-payment-initialize.js rather than a shared
// handler with a provider switch, so the existing Sendbox file stays untouched.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

const SERVICE_CHARGE = 250

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    storeId,
    orderId,
    courierName,
    shippingFee,
    courierId,
    pricingTier,
    senderDetails,
    receiverDetails,
    weight,
    pickupDate,
    itemCategory,
    insuranceType,
  } = req.body

  if (!storeId || !orderId || !pricingTier) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, orderId, pricingTier',
    })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'delivery', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const orderDoc = await db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .doc(orderId)
      .get()
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const email = storeDoc.data().email
    if (!email) {
      return res.status(400).json({ error: 'Store has no email address on file' })
    }

    const shippingFeeNum = Number(shippingFee) || 0
    const total = shippingFeeNum + SERVICE_CHARGE
    const amountKobo = Math.round(total * 100)

    const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        callback_url: `${appUrl}/dashboard?shipment=pending`,
        metadata: {
          transactionType: 'shipment',
          provider: 'topship',
          storeId,
          orderId,
          courierId: courierId || '',
          pricingTier,
          courierName: courierName || '',
          shippingFee: shippingFeeNum,
          serviceCharge: SERVICE_CHARGE,
          total,
          senderDetails: JSON.stringify(senderDetails || {}),
          receiverDetails: JSON.stringify(receiverDetails || {}),
          weight: Number(weight) || 1,
          pickupDate: pickupDate || new Date().toISOString().split('T')[0],
          itemCategory: itemCategory || 'Others',
          insuranceType: insuranceType || 'None',
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return res.status(502).json({
        error: paystackData.message || 'Paystack transaction initialization failed',
      })
    }

    return res.status(200).json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    })
  } catch (err) {
    console.error('[topship-payment-initialize] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
