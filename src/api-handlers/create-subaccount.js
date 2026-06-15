//sellapage/api/create-subaccount.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
    adminAuth: getAuth(),
  }
}

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

    const { storeId, bankCode, accountNumber } = body

    if (!storeId || !bankCode || !accountNumber) {
      return res.status(400).json({
        error: 'Missing required fields: storeId, bankCode, accountNumber',
      })
    }

    const { db, adminAuth } = getAdminServices()

    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!idToken) {
      return res.status(401).json({ error: 'Please sign in again to set up payouts.' })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'You can only set up payouts for your own store.' })
    }

    const storeRef = db.collection('stores').doc(storeId)
    const storeDoc = await storeRef.get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
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
      return res.status(502).json({ error: 'Failed to reach Paystack API' })
    }

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status) {
      return res.status(paystackResponse.status >= 400 ? paystackResponse.status : 502).json({
        error: paystackData.message || 'Paystack subaccount creation failed',
      })
    }

    const subaccountCode = paystackData.data?.subaccount_code

    if (!subaccountCode) {
      return res.status(502).json({ error: 'Paystack did not return a subaccount code' })
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

    return res.status(200).json({ subaccountCode, payoutBankName, payoutAccountNumberMasked, payoutsVerified: false })
  } catch (err) {
    console.error('create-subaccount error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
