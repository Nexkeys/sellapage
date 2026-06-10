// sellapage/netlify/functions/resolve-account.js
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

  const { accountNumber, bankCode } = body || {}
  if (!accountNumber || !bankCode) {
    return jsonResponse(400, { error: 'Missing accountNumber or bankCode' })
  }

  try {
    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()

    if (!res.ok || data.status === false) {
      return jsonResponse(res.status || 502, { error: data.message || data.error || 'Failed to resolve account' })
    }

    // Paystack returns data.data.account_name or data.data?.account_name depending on payload
    const accountName = data.data?.account_name || data.data?.account_name || null
    if (!accountName) {
      return jsonResponse(502, { error: 'Paystack did not return an account name' })
    }

    return jsonResponse(200, { accountName })
  } catch (err) {
    console.error('resolve-account error:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}
