//sellapage/netlify/functions/create-subaccount.js/
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

  const { storeId, bankCode, accountNumber, businessName } = body

  if (!storeId || !bankCode || !accountNumber || !businessName) {
    return jsonResponse(400, {
      error: 'Missing required fields: storeId, bankCode, accountNumber, businessName',
    })
  }

  try {
    const { db, adminAuth } = getAdminServices()

    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!idToken) {
      return jsonResponse(401, { error: 'Please sign in again to set up payouts.' })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    if (decodedToken.uid !== storeId) {
      return jsonResponse(403, { error: 'You can only set up payouts for your own store.' })
    }

    const storeRef = db.collection('stores').doc(storeId)
    const storeDoc = await storeRef.get()

    if (!storeDoc.exists) {
      return jsonResponse(404, { error: 'Store not found' })
    }

    let paystackResponse
    try {
      paystackResponse = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessName,
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: 0,
        }),
      })
    } catch {
      return jsonResponse(502, { error: 'Failed to reach Paystack API' })
    }

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status) {
      return jsonResponse(paystackResponse.status >= 400 ? paystackResponse.status : 502, {
        error: paystackData.message || 'Paystack subaccount creation failed',
      })
    }

    const subaccountCode = paystackData.data?.subaccount_code

    if (!subaccountCode) {
      return jsonResponse(502, { error: 'Paystack did not return a subaccount code' })
    }

    await storeRef.update({ subaccountCode })

    return jsonResponse(200, { subaccountCode })
  } catch (err) {
    console.error('create-subaccount error:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}
