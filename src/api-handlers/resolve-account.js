// sellapage/api/resolve-account.js
import { getAdminAuth } from './_lib/firebase-admin.js'
import { durableRateLimit, tooManyRequests } from './_lib/rate-limit.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// This proxies Paystack's /bank/resolve using the platform's secret key, turning
// (account number, bank code) into the account holder's real name. It used to be
// completely unauthenticated with `Access-Control-Allow-Origin: *`, which made it
// a free, internet-wide Nigerian bank-account-name lookup oracle billed to
// Sellapage's Paystack account — usable for mass PII harvesting and for
// exhausting the Paystack rate limit that legitimate bank setup depends on.
//
// It is now authenticated and capped per user per day: this is a one-time
// onboarding step, not a lookup service.
const DAILY_LOOKUP_LIMIT = 10

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    applyCorsOrigin(req, res);
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

    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim())
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const allowed = await durableRateLimit(
      'resolve-account', `${decoded.uid}_${today}`, DAILY_LOOKUP_LIMIT, 24 * 60 * 60 * 1000,
    )
    if (!allowed) {
      return tooManyRequests(res, 'Too many account lookups today. Please try again tomorrow.')
    }

    const { accountNumber, bankCode } = body || {}
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Missing accountNumber or bankCode' })
    }

    // NUBAN is exactly 10 digits; bank codes are short numeric strings.
    // Rejecting anything else blocks probing with malformed input.
    if (!/^\d{10}$/.test(String(accountNumber).trim())) {
      return res.status(400).json({ error: 'Account number must be 10 digits' })
    }
    if (!/^\d{3,6}$/.test(String(bankCode).trim())) {
      return res.status(400).json({ error: 'Invalid bank code' })
    }

    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    const paystackRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await paystackRes.json()

    if (!paystackRes.ok || data.status === false) {
      return res.status(paystackRes.status || 502).json({ error: data.message || data.error || 'Failed to resolve account' })
    }

    // Paystack returns data.data.account_name or data.data?.account_name depending on payload
    const accountName = data.data?.account_name || data.data?.account_name || null
    if (!accountName) {
      return res.status(502).json({ error: 'Paystack did not return an account name' })
    }

    return res.status(200).json({ accountName })
  } catch (err) {
    console.error('resolve-account error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
