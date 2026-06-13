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

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { storeId, code } = body
  const normalizedCode = code?.trim().toUpperCase()

  if (!storeId || !normalizedCode) {
    return jsonResponse(400, { error: 'storeId and code are required' })
  }

  try {
    const discountSnap = await db
      .collection('stores')
      .doc(storeId)
      .collection('discounts')
      .where('code', '==', normalizedCode)
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (discountSnap.empty) {
      return jsonResponse(404, { error: 'Invalid or inactive promo code' })
    }

    const discountDoc = discountSnap.docs[0]
    const discount = discountDoc.data() || {}
    const {
      type,
      value,
      expiryDate,
      usageLimit,
      usageCount = 0,
    } = discount

    if (expiryDate && typeof expiryDate.toMillis === 'function' && expiryDate.toMillis() < Date.now()) {
      return jsonResponse(400, { error: 'This promo code has expired' })
    }

    if (usageLimit != null && Number(usageCount) >= Number(usageLimit)) {
      return jsonResponse(400, { error: 'This promo code has reached its usage limit' })
    }

    return jsonResponse(200, {
      discountId: discountDoc.id,
      type,
      value,
      code: normalizedCode,
    })
  } catch (error) {
    console.error('[validate-discount] Failed to validate discount', error)
    return jsonResponse(500, { error: 'Failed to validate promo code' })
  }
}
