//src/api-handlers/google-ads-reports.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAccessToken, getCampaignReport } from './_lib/google-ads-client.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}
const db = getFirestore()
const auth = getAuth()

const DATE_RANGES = {
  '7d': 'LAST_7_DAYS',
  '14d': 'LAST_14_DAYS',
  '30d': 'LAST_30_DAYS',
  '90d': 'LAST_90_DAYS',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, dateRange = '30d' } = req.body
  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }

  try {
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    if (storeDoc.data().ownerId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const refreshToken = storeDoc.data().googleAdsRefreshToken
    const customerId = storeDoc.data().googleAdsCustomerId
    if (!refreshToken || !customerId) {
      return res.status(400).json({ error: 'Google Ads not connected' })
    }

    const accessToken = await getAccessToken(refreshToken)
    const gaDateRange = DATE_RANGES[dateRange] || 'LAST_30_DAYS'
    const results = await getCampaignReport(accessToken, customerId, gaDateRange)

    let totalImpressions = 0
    let totalClicks = 0
    let totalCostMicros = 0
    let totalConversions = 0
    let totalConversionValue = 0

    const campaignMetrics = results.map((r) => {
      const m = r.metrics || {}
      const impressions = Number(m.impressions) || 0
      const clicks = Number(m.clicks) || 0
      const costMicros = Number(m.costMicros) || 0
      const conversions = Number(m.conversions) || 0
      const conversionValue = Number(m.conversionsValue) || 0

      totalImpressions += impressions
      totalClicks += clicks
      totalCostMicros += costMicros
      totalConversions += conversions
      totalConversionValue += conversionValue

      return {
        campaignId: r.campaign?.id,
        campaignName: r.campaign?.name,
        status: r.campaign?.status,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0',
        spendMicros: costMicros,
        spendNaira: costMicros / 1000000,
        conversions,
        conversionValue,
      }
    })

    const totalSpendNaira = totalCostMicros / 1000000

    return res.status(200).json({
      summary: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0',
        spend: totalSpendNaira,
        conversions: totalConversions,
        conversionValue: totalConversionValue,
      },
      campaigns: campaignMetrics,
    })
  } catch (err) {
    console.error('[google-ads-reports] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
