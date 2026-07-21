//src/api-handlers/google-ads-reports.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAccessToken, getCampaignReport, resolveCustomerId } from './_lib/google-ads-client.js'

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

    let results = []
    let selfManagedError = null
    try {
      results = await getCampaignReport(accessToken, customerId, gaDateRange)
    } catch (apiErr) {
      selfManagedError = apiErr.message
      console.warn('[google-ads-reports] Self-managed report fetch failed:', apiErr.message)
    }

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

    for (const r of results) {
      const cid = String(r.campaign?.id || '')
      seenCampaignIds.add(cid)
      campaignMetrics.push(accumulateMetrics(cid, r.campaign?.name, r.campaign?.status, r.metrics || {}))
    }

    const sellapageSnap = await db
      .collection('googleAdsCampaigns')
      .where('storeId', '==', storeId)
      .where('managementMode', '==', 'sellapage')
      .get()

    if (!sellapageSnap.empty) {
      const masterDoc = await db.collection('platformSettings').doc('googleAdsMaster').get()
      if (masterDoc.exists) {
        const { refreshToken: masterRefresh, customerId: masterId } = masterDoc.data()
        if (masterRefresh && masterId) {
          try {
            const masterToken = await getAccessToken(masterRefresh)
            const loginCustomerId = process.env.GOOGLE_ADS_MCC_ID
            const masterResults = await getCampaignReport(masterToken, masterId, gaDateRange, loginCustomerId)
            const masterCampaignMap = {}
            for (const r of masterResults) {
              const cid = String(r.campaign?.id || '')
              masterCampaignMap[cid] = r
            }

            for (const doc of sellapageSnap.docs) {
              const sd = doc.data()
              const cid = String(sd.providerCampaignId || '')
              if (!cid || seenCampaignIds.has(cid)) continue
              seenCampaignIds.add(cid)
              const match = masterCampaignMap[cid]
              campaignMetrics.push(
                accumulateMetrics(cid, sd.name || 'Sellapage Campaign', sd.status || 'PAUSED', match?.metrics || {})
              )
            }
          } catch (masterErr) {
            console.warn('[google-ads-reports] Master account report fetch failed:', masterErr.message)
            for (const doc of sellapageSnap.docs) {
              const sd = doc.data()
              const cid = String(sd.providerCampaignId || '')
              if (!cid || seenCampaignIds.has(cid)) continue
              seenCampaignIds.add(cid)
              campaignMetrics.push(accumulateMetrics(cid, sd.name || 'Sellapage Campaign', sd.status || 'PAUSED', {
                impressions: sd.impressions || 0,
                clicks: sd.clicks || 0,
                costMicros: (sd.spendToDate || 0) * 1000000,
                conversions: sd.conversions || 0,
                conversionsValue: 0,
              }))
            }
          }
        }
      }
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
