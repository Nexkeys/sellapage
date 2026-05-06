import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

const STARTER_RESET = {
  plan: 'starter',
  planStatus: 'expired',
  maxProducts: 10,
  maxImagesPerProduct: 3,
  hasGrowthFeatures: false,
  hasProFeatures: false,
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const cronSecret = event.headers['x-cron-secret']
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const storesSnap = await db
    .collection('stores')
    .where('plan', '!=', 'starter')
    .get()

  if (storesSnap.empty) {
    return {
      statusCode: 200,
      body: JSON.stringify({ active: 0, grace: 0, expired: 0, total: 0 }),
    }
  }

  const now = Timestamp.now()
  const nowMillis = now.toMillis()

  const summary = { active: 0, grace: 0, expired: 0, total: storesSnap.size }
  const batch = db.batch()

  storesSnap.docs.forEach((storeDoc) => {
    const data = storeDoc.data()
    const planEndDate = data.planEndDate
    const graceUntil = data.graceUntil

    if (!planEndDate || !graceUntil) {
      return
    }

    const planEndMillis = planEndDate.toMillis()
    const graceUntilMillis = graceUntil.toMillis()

    if (nowMillis < planEndMillis) {
      batch.update(storeDoc.ref, { planStatus: 'active' })
      summary.active++
    } else if (nowMillis >= planEndMillis && nowMillis < graceUntilMillis) {
      batch.update(storeDoc.ref, { planStatus: 'grace' })
      summary.grace++
    } else {
      batch.update(storeDoc.ref, STARTER_RESET)
      summary.expired++
    }
  })

  await batch.commit()

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(summary),
  }
}