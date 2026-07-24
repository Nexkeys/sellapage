import { getAdminDb } from './_lib/firebase-admin.js'
import {
  getAccessToken,
  createBudget,
  createCampaign,
  createAdGroup,
  createResponsiveSearchAd,
  createResponsiveDisplayAd,
  uploadImageAsset,
  addKeywords,
} from './_lib/google-ads-client.js'

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
    const action = req.query.action || 'list'

    if (action === 'list') {
      const snap = await db.collection('googleAdsCampaigns')
        .where('managementMode', '==', 'sellapage')
        .where('status', '==', 'PENDING_REVIEW')
        .orderBy('createdAt', 'desc')
        .get()

      const submissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      return res.status(200).json({ success: true, submissions })
    }

    if (action === 'approve' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { campaignId, startDate, endDate, adminName } = body
      if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' })

      const docRef = db.collection('googleAdsCampaigns').doc(campaignId)
      const docSnap = await docRef.get()
      if (!docSnap.exists) return res.status(404).json({ error: 'Submission not found' })
      const submission = docSnap.data()
      if (submission.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ error: `Submission is already ${submission.status}, not pending review` })
      }

      const masterDoc = await db.collection('platformSettings').doc('googleAdsMaster').get()
      if (!masterDoc.exists) return res.status(500).json({ error: 'Master Google Ads account not connected' })
      const masterData = masterDoc.data()
      const { refreshToken, customerId } = masterData
      if (!refreshToken || !customerId) {
        return res.status(500).json({ error: 'Master Google Ads account not configured' })
      }
      const ngnUsdRate = Number(masterData.ngnUsdRate) || DEFAULT_NGN_USD_RATE
      const loginCustomerId = process.env.GOOGLE_ADS_MCC_ID

      const recordFailure = async (errorMessage) => {
        await docRef.update({
          status: 'FAILED',
          error: errorMessage,
          reviewedBy: adminName || 'admin',
          reviewedAt: new Date().toISOString(),
        })
      }

      let campaignResourceName = null
      let adGroupResourceName = null
      try {
        const accessToken = await getAccessToken(refreshToken)
        // budgetAmount was collected from the vendor in NGN — convert to the master serving
        // account's own currency (USD) using the admin-configured rate before sending to Google.
        const budgetMicros = Math.round((Number(submission.budgetAmount) / ngnUsdRate) * 1000000)

        const budgetResourceName = await createBudget(accessToken, customerId, {
          name: `${submission.name} (Sellapage Managed) ${Date.now()}`,
          amountMicros: budgetMicros,
        }, loginCustomerId)

        campaignResourceName = await createCampaign(accessToken, customerId, {
          name: `${submission.name} (Sellapage Managed)`,
          budgetResourceName,
          status: 'PAUSED',
          advertisingChannelType: submission.type,
        }, loginCustomerId)

        const targeting = submission.targeting || {}

        if (submission.type === 'SEARCH') {
          adGroupResourceName = await createAdGroup(accessToken, customerId, {
            campaignResourceName,
            name: `${submission.name} Ad Group`,
            type: 'SEARCH_STANDARD',
          }, loginCustomerId)

          if (targeting.headlines?.length >= 3 && targeting.descriptions?.length >= 2 && targeting.finalUrl) {
            await createResponsiveSearchAd(accessToken, customerId, {
              adGroupResourceName,
              headlines: targeting.headlines,
              descriptions: targeting.descriptions,
              finalUrl: targeting.finalUrl,
            }, loginCustomerId)
          }
          if (targeting.keywords?.length > 0) {
            await addKeywords(accessToken, customerId, { adGroupResourceName, keywords: targeting.keywords }, loginCustomerId)
          }
        } else if (submission.type === 'DISPLAY') {
          adGroupResourceName = await createAdGroup(accessToken, customerId, {
            campaignResourceName,
            name: `${submission.name} Ad Group`,
            type: 'DISPLAY_STANDARD',
          }, loginCustomerId)

          const images = submission.images || []
          if (images.length > 0 && targeting.headlines?.length > 0 && targeting.descriptions?.length > 0 && targeting.finalUrl) {
            const imageAssetResourceNames = []
            for (let i = 0; i < images.length; i++) {
              const assetResourceName = await uploadImageAsset(accessToken, customerId, {
                imageUrl: images[i],
                name: `${submission.name} Image ${i + 1} ${Date.now()}`,
              }, loginCustomerId)
              if (assetResourceName) imageAssetResourceNames.push(assetResourceName)
            }

            await createResponsiveDisplayAd(accessToken, customerId, {
              adGroupResourceName,
              imageAssetResourceNames,
              headlines: targeting.headlines,
              descriptions: targeting.descriptions,
              longHeadline: targeting.headlines[0],
              businessName: submission.businessName || submission.name,
              finalUrl: targeting.finalUrl,
            }, loginCustomerId)
          }
        }
      } catch (err) {
        console.error('[admin-ads-review] Campaign creation failed on approval:', err)
        await recordFailure(err.message || 'Unknown error creating campaign')
        return res.status(500).json({ error: `Campaign creation failed: ${err.message || 'Unknown error'}` })
      }

      await docRef.update({
        status: 'APPROVED',
        campaignResourceName,
        adGroupResourceName,
        providerCampaignId: campaignResourceName ? campaignResourceName.split('/').pop() : null,
        startDate: startDate || null,
        endDate: endDate || null,
        reviewedBy: adminName || 'admin',
        reviewedAt: new Date().toISOString(),
        ngnUsdRateUsed: ngnUsdRate,
      })

      return res.status(200).json({ success: true, campaignId, status: 'APPROVED' })
    }

    if (action === 'reject' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { campaignId, reason, adminName } = body
      if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' })

      const docRef = db.collection('googleAdsCampaigns').doc(campaignId)
      const docSnap = await docRef.get()
      if (!docSnap.exists) return res.status(404).json({ error: 'Submission not found' })
      if (docSnap.data().status !== 'PENDING_REVIEW') {
        return res.status(400).json({ error: `Submission is already ${docSnap.data().status}, not pending review` })
      }

      await docRef.update({
        status: 'REJECTED',
        rejectionReason: reason || 'No reason provided',
        reviewedBy: adminName || 'admin',
        reviewedAt: new Date().toISOString(),
      })

      return res.status(200).json({ success: true, campaignId, status: 'REJECTED' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-ads-review] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
