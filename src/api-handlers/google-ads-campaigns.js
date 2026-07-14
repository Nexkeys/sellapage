//src/api-handlers/google-ads-campaigns.js
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import {
  getAccessToken,
  createBudget,
  createCampaign,
  updateCampaignStatus,
  listCampaigns,
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
    if (storeDoc.data().ownerId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const refreshToken = storeDoc.data().googleAdsRefreshToken
    const customerId = storeDoc.data().googleAdsCustomerId
    if (!refreshToken || !customerId) {
      return res.status(400).json({ error: 'Google Ads not connected or no account selected' })
    }

    const accessToken = await getAccessToken(refreshToken)

    if (action === 'list') {
      const campaignsSnap = await db
        .collection('googleAdsCampaigns')
        .where('storeId', '==', storeId)
        .orderBy('createdAt', 'desc')
        .get()

      const campaigns = campaignsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      return res.status(200).json({ campaigns })
    }

    if (action === 'create') {
      const { name, type, budgetType, budgetAmount, targeting } = campaignData || {}
      if (!name || !budgetAmount) {
        return res.status(400).json({ error: 'Missing campaign name or budget' })
      }

      const amountMicros = Math.round(Number(budgetAmount) * 1000000)

      const budgetResourceName = await createBudget(accessToken, customerId, {
        name: `${name} Budget`,
        amountMicros,
      })

      const channelType = (type || 'SEARCH').toUpperCase()
      const campaignResourceName = await createCampaign(accessToken, customerId, {
        name,
        budgetResourceName,
        status: 'PAUSED',
        advertisingChannelType: channelType,
      })

      const providerCampaignId = campaignResourceName.split('/').pop()

      const docRef = await db.collection('googleAdsCampaigns').add({
        storeId,
        providerCampaignId,
        campaignResourceName,
        budgetResourceName,
        name,
        type: channelType,
        status: 'PAUSED',
        budgetType: budgetType || 'daily',
        budgetAmount: Number(budgetAmount),
        spendToDate: 0,
        currency: storeDoc.data().googleAdsCurrency || 'NGN',
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
      })
    }

    if (action === 'pause' || action === 'resume') {
      if (!campaignId) {
        return res.status(400).json({ error: 'Missing campaignId' })
      }

      const campaignDoc = await db.collection('googleAdsCampaigns').doc(campaignId).get()
      if (!campaignDoc.exists) {
        return res.status(404).json({ error: 'Campaign not found' })
      }
      if (campaignDoc.data().storeId !== storeId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const newStatus = action === 'pause' ? 'PAUSED' : 'ENABLED'
      await updateCampaignStatus(
        accessToken,
        customerId,
        campaignDoc.data().campaignResourceName,
        newStatus
      )

      await db.collection('googleAdsCampaigns').doc(campaignId).update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })

      return res.status(200).json({ campaignId, status: newStatus })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[google-ads-campaigns] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
