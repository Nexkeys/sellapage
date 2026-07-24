import { getAdminDb } from './_lib/firebase-admin.js'

const DEFAULT_NGN_USD_RATE = 1800

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const adminToken = req.headers['x-admin-token']
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()
    const action = req.query.action || 'get'
    const docRef = db.collection('platformSettings').doc('googleAdsMaster')

    if (action === 'get') {
      const docSnap = await docRef.get()
      const data = docSnap.exists ? docSnap.data() : {}
      return res.status(200).json({
        success: true,
        ngnUsdRate: data.ngnUsdRate || DEFAULT_NGN_USD_RATE,
        ngnUsdRateUpdatedAt: data.ngnUsdRateUpdatedAt || null,
      })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { ngnUsdRate } = body
      const rate = Number(ngnUsdRate)
      if (!rate || rate <= 0 || !isFinite(rate)) {
        return res.status(400).json({ error: 'ngnUsdRate must be a positive number' })
      }

      await docRef.set({
        ngnUsdRate: rate,
        ngnUsdRateUpdatedAt: new Date().toISOString(),
      }, { merge: true })

      return res.status(200).json({ success: true, ngnUsdRate: rate })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-ads-settings] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
