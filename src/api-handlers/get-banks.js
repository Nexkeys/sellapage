import { getAdminDb } from './_lib/firebase-admin.js'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('[get-banks] PAYSTACK_SECRET_KEY is not set')
    return res.status(500).json({ error: 'Payment provider not configured' })
  }

  try {
    const db = getAdminDb()
    const cacheRef = db.collection('cache').doc('bankList')
    const cacheSnap = await cacheRef.get()

    if (cacheSnap.exists) {
      const cached = cacheSnap.data()
      const age = Date.now() - (cached.updatedAt || 0)
      if (age < CACHE_TTL_MS && cached.banks?.length) {
        return res.status(200).json({
          success: true,
          banks: cached.banks,
          source: 'cache',
        })
      }
    }

    const paystackRes = await fetch('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await paystackRes.json()

    if (!paystackRes.ok || !data.status || !Array.isArray(data.data)) {
      console.error('[get-banks] Paystack API error:', paystackRes.status, JSON.stringify(data))
      if (cacheSnap.exists && cacheSnap.data()?.banks?.length) {
        return res.status(200).json({
          success: true,
          banks: cacheSnap.data().banks,
          source: 'stale-cache',
        })
      }
      return res.status(502).json({ error: 'Failed to fetch bank list from payment provider' })
    }

    const banks = data.data
      .filter(b => b.active !== false)
      .map(b => ({
        name: b.name,
        code: b.code,
        slug: b.slug,
        longcode: b.longcode || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    await cacheRef.set({
      banks,
      updatedAt: Date.now(),
    })

    return res.status(200).json({
      success: true,
      banks,
      source: 'live',
    })
  } catch (err) {
    console.error('[get-banks] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
