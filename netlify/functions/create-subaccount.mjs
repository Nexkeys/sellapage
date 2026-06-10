//sellapage/netlify/functions/create-subaccount.mjs/
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

  const { storeId, bankCode, accountNumber } = body

  if (!storeId || !bankCode || !accountNumber) {
    return jsonResponse(400, {
      error: 'Missing required fields: storeId, bankCode, accountNumber',
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

    const storeData = storeDoc.data();
    const businessName = storeData?.storeName || storeData?.businessName || 'Sellapage Merchant';

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

    // Map of top 20 banks (code -> readable name) — keep in sync with frontend list
    const BANK_MAP = {
      '057': 'GTBank',
      '044': 'Access Bank',
      '058': 'Zenith Bank',
      '033': 'UBA',
      '011': 'First Bank',
      '070': 'Fidelity Bank',
      '221': 'Stanbic IBTC',
      '232': 'Sterling Bank',
      '076': 'Polaris Bank',
      '50211': 'Kuda Bank',
      '999992': 'Opay',
      '50215': 'Moniepoint',
      '035': 'Wema Bank',
      '032': 'Union Bank',
      '050': 'Ecobank',
      '215': 'Unity Bank',
      '082': 'Keystone Bank',
      '030': 'Heritage Bank',
      '101': 'Providus Bank',
      '102': 'Titan Trust Bank',
    }

    const payoutBankName = BANK_MAP[bankCode] || bankCode
    const payoutAccountNumberMasked = accountNumber && accountNumber.length > 4
      ? '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
      : accountNumber

    await storeRef.update({ subaccountCode, payoutBankName, payoutAccountNumberMasked, payoutsVerified: false })

    return jsonResponse(200, { subaccountCode, payoutBankName, payoutAccountNumberMasked, payoutsVerified: false })
  } catch (err) {
    console.error('create-subaccount error:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}
