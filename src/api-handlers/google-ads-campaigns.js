//src/api-handlers/google-ads-campaigns.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { getGoogleAdsRefreshToken } from './_lib/store-secrets.js'
import {
  getAccessToken,
  createBudget,
  createCampaign,
  updateCampaignStatus,
  listCampaigns,
  resolveCustomerId,
  createAdGroup,
  createResponsiveSearchAd,
  addKeywords,
} from './_lib/google-ads-client.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}
const db = getFirestore()
const auth = getAuth()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, action, campaignData, campaignId, status } = req.body
  if (!storeId || !action) {
    return res.status(400).json({ error: 'Missing storeId or action' })
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
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'google-ads', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const refreshToken = await getGoogleAdsRefreshToken(db, storeId)
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

    if (action === 'list') {
      let apiCampaigns = []
      let apiListError = null
      try {
        const results = await listCampaigns(accessToken, customerId)
        apiCampaigns = results.map((r) => {
          const c = r.campaign || {}
          const budget = r.campaignBudget || {}
          const cleanId = String(c.id || '')
          return {
            id: cleanId,
            providerCampaignId: cleanId,
            name: c.name || 'Untitled',
            status: c.status || 'UNKNOWN',
            type: c.advertisingChannelType || 'SEARCH',
            budgetMicros: Number(budget.amountMicros) || 0,
            budgetAmount: (Number(budget.amountMicros) || 0) / 1000000,
            resourceCampaignId: c.resourceName || `customers/${customerId}/campaigns/${cleanId}`,
            source: 'google',
          }
        })
      } catch (apiErr) {
        apiListError = apiErr.message
        console.warn('[google-ads-campaigns] Google Ads API list failed, falling back to Firestore:', apiErr.message)
      }

      const firestoreSnap = await db
        .collection('googleAdsCampaigns')
        .where('storeId', '==', storeId)
        .orderBy('createdAt', 'desc')
        .get()

      const firestoreMap = {}
      firestoreSnap.docs.forEach((doc) => {
        const data = doc.data()
        if (data.providerCampaignId) {
          firestoreMap[data.providerCampaignId] = { id: doc.id, ...data }
        }
      })

      const campaigns = apiCampaigns.map((api) => {
        const firestore = firestoreMap[api.providerCampaignId] || {}
        return {
          ...api,
          ...firestore,
          id: firestore.id || api.id,
          budgetAmount: firestore.budgetAmount || api.budgetAmount,
          spendToDate: firestore.spendToDate || 0,
          currency: firestore.currency || storeDoc.data().googleAdsCurrency || 'USD',
          impressions: firestore.impressions || 0,
          clicks: firestore.clicks || 0,
          ctr: firestore.ctr || 0,
          conversions: firestore.conversions || 0,
          targeting: firestore.targeting || {},
          createdAt: firestore.createdAt || null,
        }
      })

      const firestoreOnly = firestoreSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f) => !apiCampaigns.some((a) => a.providerCampaignId === f.providerCampaignId))

      const merged = [...campaigns, ...firestoreOnly]

      // If the Google Ads API call errored AND there's nothing to show, surface the real reason
      // instead of a clean-but-empty 200 that reads as "no campaigns yet".
      if (apiListError && merged.length === 0) {
        return res.status(502).json({ error: `Could not load Google Ads campaigns: ${apiListError}` })
      }

      return res.status(200).json({
        campaigns: merged,
        ...(apiListError ? { warning: apiListError } : {}),
      })
    }

    if (action === 'create') {
      const { name, type, budgetType, budgetAmount, targeting } = campaignData || {}
      if (!name || !budgetAmount) {
        return res.status(400).json({ error: 'Missing campaign name or budget' })
      }

      const channelType = (type || 'SEARCH').toUpperCase()
      if (channelType === 'SHOPPING' || channelType === 'PERFORMANCE_MAX') {
        return res.status(400).json({
          error: 'Shopping and Performance Max campaigns require a linked Google Merchant Center account, which is not yet supported. Please choose Search or Display.',
        })
      }

      const amountMicros = Math.round(Number(budgetAmount) * 1000000)

      const budgetResourceName = await createBudget(accessToken, customerId, {
        name: `${name} Budget ${Date.now()}`,
        amountMicros,
      })

      const campaignResourceName = await createCampaign(accessToken, customerId, {
        name,
        budgetResourceName,
        status: 'PAUSED',
        advertisingChannelType: channelType,
      })

      const providerCampaignId = campaignResourceName.split('/').pop()

      // A campaign with no ad group/ad/keywords can never serve — Google requires all three.
      // Best-effort: campaign + budget already exist by this point, so a failure here shouldn't
      // undo them. Surface it as a warning so the vendor knows to finish setup themselves.
      let adGroupResourceName = null
      let adSetupWarning = null
      const hasSearchAdCopy = targeting?.headlines?.length >= 3 && targeting?.descriptions?.length >= 2 && targeting?.finalUrl
      if (channelType === 'SEARCH' && hasSearchAdCopy) {
        try {
          adGroupResourceName = await createAdGroup(accessToken, customerId, {
            campaignResourceName,
            name: `${name} Ad Group`,
          })
          if (adGroupResourceName) {
            await createResponsiveSearchAd(accessToken, customerId, {
              adGroupResourceName,
              headlines: targeting.headlines,
              descriptions: targeting.descriptions,
              finalUrl: targeting.finalUrl,
            })
            if (targeting.keywords?.length > 0) {
              await addKeywords(accessToken, customerId, {
                adGroupResourceName,
                keywords: targeting.keywords,
              })
            }
          }
        } catch (adErr) {
          console.warn('[google-ads-campaigns] Ad group/ad/keyword creation failed (non-fatal):', adErr.message)
          adSetupWarning = `Campaign created, but ad setup failed: ${adErr.message}. Finish adding your ad group, ad, and keywords directly in Google Ads.`
        }
      } else if (channelType === 'SEARCH') {
        adSetupWarning = 'Campaign created with no ad group yet — add at least 3 headlines, 2 descriptions, and a final URL, or finish setup directly in Google Ads, before it can serve.'
      }

      const docRef = await db.collection('googleAdsCampaigns').add({
        storeId,
        providerCampaignId,
        campaignResourceName,
        budgetResourceName,
        adGroupResourceName,
        name,
        type: channelType,
        status: 'PAUSED',
        budgetType: budgetType || 'daily',
        budgetAmount: Number(budgetAmount),
        spendToDate: 0,
        currency: storeDoc.data().googleAdsCurrency || 'USD',
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        costMicros: 0,
        targeting: targeting || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncAt: null,
      })

      return res.status(200).json({
        campaignId: docRef.id,
        providerCampaignId,
        name,
        status: 'PAUSED',
        ...(adSetupWarning ? { warning: adSetupWarning } : {}),
      })
    }

    if (action === 'pause' || action === 'resume') {
      if (!campaignId) {
        return res.status(400).json({ error: 'Missing campaignId' })
      }

      const newStatus = action === 'pause' ? 'PAUSED' : 'ENABLED'
      let campaignResourceName = null

      const campaignDoc = await db.collection('googleAdsCampaigns').doc(campaignId).get()
      if (campaignDoc.exists && campaignDoc.data().storeId === storeId) {
        campaignResourceName = campaignDoc.data().campaignResourceName
        await updateCampaignStatus(accessToken, customerId, campaignResourceName, newStatus)
        await db.collection('googleAdsCampaigns').doc(campaignId).update({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
      } else {
        campaignResourceName = `customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}`
        await updateCampaignStatus(accessToken, customerId, campaignResourceName, newStatus)
      }

      return res.status(200).json({ campaignId, status: newStatus })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[google-ads-campaigns] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
