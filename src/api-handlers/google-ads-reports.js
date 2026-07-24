//src/api-handlers/google-ads-reports.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAccessToken, getCampaignReport, listCampaigns, resolveCustomerId } from './_lib/google-ads-client.js'

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
    let customerId = storeDoc.data().googleAdsCustomerId
    if (!refreshToken) {
      return res.status(400).json({ error: 'Google Ads not connected' })
    }

    if (!customerId) {
      customerId = await resolveCustomerId(refreshToken)
      if (customerId) {
        await db.collection('stores').doc(storeId).update({ googleAdsCustomerId: customerId })
      }
    }
    if (!customerId) {
      return res.status(400).json({ error: 'No Google Ads account found. Please reconnect.' })
    }

    const accessToken = await getAccessToken(refreshToken)
    const gaDateRange = DATE_RANGES[dateRange] || 'LAST_30_DAYS'

    // Source the campaign list separately (proven to work in the Campaigns tab), then attach
    // metrics from the report query. A metrics query omits zero-impression campaigns, so relying
    // on it alone would drop campaigns; the list is the source of truth for which campaigns exist.
    let results = []
    let campaignList = []
    let selfManagedError = null
    try {
      results = await getCampaignReport(accessToken, customerId, gaDateRange)
    } catch (apiErr) {
      selfManagedError = apiErr.message
      console.warn('[google-ads-reports] Self-managed report fetch failed:', apiErr.message)
    }
    try {
      campaignList = await listCampaigns(accessToken, customerId)
    } catch (listErr) {
      console.warn('[google-ads-reports] Self-managed campaign list failed:', listErr.message)
    }

    console.log('[google-ads-reports] self-managed:', {
      customerId,
      dateRange: gaDateRange,
      reportRows: results.length,
      campaignListRows: campaignList.length,
      firstReportRow: results[0] ? JSON.stringify(results[0]) : null,
    })

    const campaignMetrics = []
    const seenCampaignIds = new Set()
    let totalImpressions = 0
    let totalClicks = 0
    let totalCostMicros = 0
    let totalConversions = 0
    let totalConversionValue = 0

    function accumulateMetrics(campaignId, campaignName, status, m) {
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
        campaignId,
        campaignName,
        status,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0',
        spendMicros: costMicros,
        spendNaira: costMicros / 1000000,
        conversions,
        conversionValue,
      }
    }

    // Map metrics rows by campaign id so we can attach them to the full campaign list.
    const metricsById = {}
    for (const r of results) {
      const cid = String(r.campaign?.id || '')
      if (cid) metricsById[cid] = r
    }

    // Union of campaigns from the list (source of truth for existence/name/status) and the report
    // rows (source of metrics; may also include a campaign the list omitted, e.g. a removed one).
    // Iterating the union guarantees a metrics row is never dropped by a failed join.
    const campaignInfoById = {}
    for (const r of campaignList) {
      const cid = String(r.campaign?.id || '')
      if (cid && !campaignInfoById[cid]) {
        campaignInfoById[cid] = { name: r.campaign?.name, status: r.campaign?.status }
      }
    }
    for (const r of results) {
      const cid = String(r.campaign?.id || '')
      if (cid && !campaignInfoById[cid]) {
        campaignInfoById[cid] = { name: r.campaign?.name, status: r.campaign?.status }
      }
    }

    for (const cid of Object.keys(campaignInfoById)) {
      if (seenCampaignIds.has(cid)) continue
      seenCampaignIds.add(cid)
      const info = campaignInfoById[cid]
      const match = metricsById[cid]
      campaignMetrics.push(
        accumulateMetrics(cid, match?.campaign?.name || info.name, match?.campaign?.status || info.status, match?.metrics || {})
      )
    }

    const totalSpendNaira = totalCostMicros / 1000000

    // Surface a real reason when the vendor's own account fetch failed and produced nothing,
    // instead of returning a clean-but-empty 200 that looks like "no campaigns".
    if (selfManagedError && campaignMetrics.length === 0) {
      return res.status(502).json({ error: `Could not load Google Ads data: ${selfManagedError}` })
    }

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
      ...(selfManagedError ? { warning: selfManagedError } : {}),
    })
  } catch (err) {
    console.error('[google-ads-reports] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
