// sellapage/api/resolve-account.js

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

    const { accountNumber, bankCode } = body || {}
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Missing accountNumber or bankCode' })
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
