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
}

const PLAN_LIMITS = {
  growth: {
    maxProducts: 50,
    maxImagesPerProduct: 10,
    hasGrowthFeatures: true,
    hasProFeatures: false,
  },
  pro: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
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

  const { storeId, plan } = data.metadata || {}

  if (!storeId || !plan) {
    return { statusCode: 400, body: 'Missing storeId or plan in metadata' }
  }

  if (!['growth', 'pro'].includes(plan)) {
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