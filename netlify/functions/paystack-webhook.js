//sellapage/netlify/functions/paystack-webhook.js/
import crypto from 'crypto'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

const PLAN_AMOUNTS = {
  growth: 500000,
  pro: 1200000,
  premium: 2500000,
}

const PLAN_LIMITS = {
  growth: {
    maxProducts: 50,
    maxImagesPerProduct: 10,
    hasGrowthFeatures: true,
    hasProFeatures: false,
    hasPremiumFeatures: false,
  },
  pro: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: false,
  },
  premium: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: true,
  },
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const signature = event.headers['x-paystack-signature']
  const rawBody = event.body

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    return { statusCode: 401, body: 'Invalid signature' }
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { event: eventType, data } = payload

  if (eventType !== 'charge.success' || data?.status !== 'success') {
    return { statusCode: 200, body: 'Event ignored' }
  }

  // Branch on transaction type
  const transactionType = data.metadata?.transactionType

  if (transactionType === 'checkout') {
    // Checkout payment handling
    const {
      storeId,
      customerName,
      customerEmail,
      customerPhone,
      cartItems,
      deliveryFee,
      processingFee,
      grandTotal,
      deliveryAddress,
      notes,
      orderType,
    } = data.metadata || {}

    if (!storeId) {
      return { statusCode: 400, body: 'Missing storeId in metadata' }
    }

    // Parse JSON strings
    let parsedCartItems
    let parsedDeliveryAddress
    try {
      parsedCartItems = JSON.parse(cartItems)
      parsedDeliveryAddress = JSON.parse(deliveryAddress)
    } catch {
      return { statusCode: 400, body: 'Invalid JSON in cartItems or deliveryAddress' }
    }

    // Idempotency check for orders
    const existingOrderSnap = await db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .where('paystackReference', '==', data.reference)
      .limit(1)
      .get()

    if (!existingOrderSnap.empty) {
      return { statusCode: 200, body: 'Already processed' }
    }

    // Create order document
    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc()
    const itemsString = parsedCartItems.map(item => `${item.name} x${item.quantity}`).join(', ')

    await orderRef.set({
      customerName,
      customerPhone,
      customerEmail,
      items: itemsString,
      total: grandTotal,
      deliveryFee,
      processingFee,
      grandTotal,
      deliveryAddress: parsedDeliveryAddress,
      notes,
      paystackReference: data.reference,
      paystackAmount: data.amount,
      orderType: orderType || 'checkout',
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      createdAt: Timestamp.now(),
    })

    return { statusCode: 200, body: 'OK' }
  }

  // Subscription handling (existing logic)
  const { storeId, plan } = data.metadata || {}

  if (!storeId || !plan) {
    return { statusCode: 400, body: 'Missing storeId or plan in metadata' }
  }

  if (!['growth', 'pro', 'premium'].includes(plan)) {
    return { statusCode: 400, body: 'Invalid plan in metadata' }
  }

  if (data.amount !== PLAN_AMOUNTS[plan]) {
    return {
      statusCode: 400,
      body: `Amount mismatch: expected ${PLAN_AMOUNTS[plan]}, got ${data.amount}`,
    }
  }

  // W1 idempotency guard
  const existingSubSnap = await db
    .collection('stores')
    .doc(storeId)
    .collection('subscriptions')
    .where('paystackRef', '==', data.reference)
    .limit(1)
    .get()

  if (!existingSubSnap.empty) {
    return { statusCode: 200, body: 'Already processed' }
  }

  const now = Timestamp.now()
  const planStartDate = now
  const planEndDate = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000)
  const graceUntil = Timestamp.fromMillis(planEndDate.toMillis() + 2 * 24 * 60 * 60 * 1000)

  const limits = PLAN_LIMITS[plan]

  const storeRef = db.collection('stores').doc(storeId)
  const subscriptionRef = storeRef.collection('subscriptions').doc()

  const batch = db.batch()

  batch.update(storeRef, {
    plan,
    planStatus: 'active',
    planStartDate,
    planEndDate,
    graceUntil,
    ...limits,
  })

  batch.set(subscriptionRef, {
    plan,
    amount: data.amount,
    currency: 'NGN',
    status: 'success',
    paystackRef: data.reference,
    paidAt: now,
    planStartDate,
    planEndDate,
  })

  await batch.commit()

  return { statusCode: 200, body: 'OK' }
}