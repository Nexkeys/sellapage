import { getAdminDb } from './_lib/firebase-admin.js'
import { getAdminAuth } from './_lib/firebase-admin.js'

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

    // Check for a duplicate verify call (e.g. the webhook safety net already processed this
    // reference) before writing a second submission for the same payment.
    const existing = await db.collection('googleAdsCampaigns')
      .where('paystackReference', '==', reference)
      .limit(1)
      .get()
    if (!existing.empty) {
      return res.status(200).json({ success: true, message: 'Submission already recorded', pending: true })
    }

    const {
      campaignName,
      campaignType,
      budgetAmount,
      targeting: targetingRaw,
      images: imagesRaw,
      businessName,
      targetLocation,
    } = metadata

    const targeting = typeof targetingRaw === 'string' ? JSON.parse(targetingRaw) : targetingRaw
    const images = typeof imagesRaw === 'string' ? JSON.parse(imagesRaw) : (imagesRaw || [])
    const normalizedType = (campaignType || 'SEARCH').toUpperCase()

    // Campaign creation no longer happens here — payment only saves the submission for admin
    // review. Approval (in admin-ads-review.js) is what actually calls the Google Ads API, using
    // the already-fixed budget/campaign/ad-group/ad creation logic.
    const isUnsupportedType = normalizedType === 'SHOPPING' || normalizedType === 'PERFORMANCE_MAX'

    await db.collection('googleAdsCampaigns').add({
      storeId,
      provider: 'google',
      managementMode: 'sellapage',
      name: campaignName,
      type: normalizedType,
      status: isUnsupportedType ? 'FAILED' : 'PENDING_REVIEW',
      error: isUnsupportedType
        ? 'Shopping and Performance Max campaigns require a linked Google Merchant Center account, which is not yet supported. Your payment was received — contact support for a refund.'
        : null,
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
      images: Array.isArray(images) ? images.slice(0, 5) : [],
      businessName: businessName || null,
      targetLocation: targetLocation || null,
      providerCampaignId: null,
      paystackReference: reference,
      createdAt: new Date().toISOString(),
      lastSyncAt: null,
    })

    return res.status(200).json({
      success: true,
      message: isUnsupportedType
        ? 'Payment received, but this campaign type is not supported. Contact support for a refund.'
        : 'Payment received. Your campaign is pending review.',
      pending: true,
    })
  } catch (err) {
    console.error('[ads-payment-verify] Unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
