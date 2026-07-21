import { getAdminDb } from './_lib/firebase-admin.js'
import { getAdminAuth } from './_lib/firebase-admin.js'
import { getAccessToken, createBudget, createCampaign, createAdGroup, createResponsiveSearchAd, addKeywords } from './_lib/google-ads-client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { reference, storeId } = req.body

  if (!reference || !storeId) {
    return res.status(400).json({ error: 'Missing required fields: reference, storeId' })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

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

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })
    const verifyData = await verifyRes.json()

    if (!verifyRes.ok || !verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment verification failed' })
    }

    const metadata = verifyData.data.metadata || {}
    if (metadata.transactionType !== 'ads-payment') {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }

    const {
      campaignName,
      campaignType,
      budgetAmount,
      targeting: targetingRaw,
    } = metadata

    const targeting = typeof targetingRaw === 'string' ? JSON.parse(targetingRaw) : targetingRaw

    const masterDoc = await db.collection('platformSettings').doc('googleAdsMaster').get()
    if (!masterDoc.exists) {
      return res.status(500).json({ error: 'Master Google Ads account not connected. Please contact support.' })
    }

    const masterData = masterDoc.data()
    const refreshToken = masterData.refreshToken
    const customerId = masterData.customerId

    if (!refreshToken || !customerId) {
      return res.status(500).json({ error: 'Master Google Ads account not configured. Please contact support.' })
    }

    let campaignResourceId = null
    let adGroupResourceId = null
    const accessToken = await getAccessToken(refreshToken)
    const loginCustomerId = process.env.GOOGLE_ADS_MCC_ID
    const budgetMicros = Math.round(Number(budgetAmount) * 1000000)
    const budgetResourceName = await createBudget(accessToken, customerId, {
      name: `${campaignName} (Sellapage Managed)`,
      amountMicros: budgetMicros,
    }, loginCustomerId)
    campaignResourceId = await createCampaign(accessToken, customerId, {
      name: `${campaignName} (Sellapage Managed)`,
      budgetResourceName,
      status: 'PAUSED',
      advertisingChannelType: campaignType || 'SEARCH',
    }, loginCustomerId)

    if (campaignResourceId && campaignType === 'SEARCH' && targeting?.keywords?.length > 0) {
      try {
        adGroupResourceId = await createAdGroup(accessToken, customerId, {
          campaignResourceName: campaignResourceId,
          name: `${campaignName} Ad Group`,
        }, loginCustomerId)

        if (adGroupResourceId) {
          if (targeting.headlines?.length > 0 && targeting.descriptions?.length > 0 && targeting.finalUrl) {
            await createResponsiveSearchAd(accessToken, customerId, {
              adGroupResourceName: adGroupResourceId,
              headlines: targeting.headlines,
              descriptions: targeting.descriptions,
              finalUrl: targeting.finalUrl,
            }, loginCustomerId)
          }

          await addKeywords(accessToken, customerId, {
            adGroupResourceName: adGroupResourceId,
            keywords: targeting.keywords,
          }, loginCustomerId)
        }
      } catch (adErr) {
        console.warn('[ads-payment-verify] Ad group/keyword creation failed (non-fatal):', adErr.message)
      }
    }

    await db.collection('googleAdsCampaigns').add({
      storeId,
      provider: 'google',
      managementMode: 'sellapage',
      name: campaignName,
      type: campaignType || 'SEARCH',
      status: 'PAUSED',
      budgetType: 'daily',
      budgetAmount: Number(budgetAmount),
      serviceCharge: Math.round(Number(budgetAmount) * 0.10),
      totalPaid: Number(budgetAmount) + Math.round(Number(budgetAmount) * 0.10),
      spendToDate: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      conversions: 0,
      targeting: targeting || {},
      providerCampaignId: campaignResourceId ? campaignResourceId.split('/').pop() : null,
      paystackReference: reference,
      createdAt: new Date().toISOString(),
      lastSyncAt: null,
    })

    return res.status(200).json({
      success: true,
      message: 'Campaign created successfully',
      pending: false,
    })
  } catch (err) {
    console.error('[ads-payment-verify] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
