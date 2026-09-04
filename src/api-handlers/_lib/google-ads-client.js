//src/api-handlers/_lib/google-ads-client.js
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24'
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`

function formatGoogleAdsError(data, fallback) {
  const errObj = Array.isArray(data) ? data[0]?.error : data?.error
  const detail = errObj?.details?.[0]?.errors?.[0]
  if (detail) {
    const code = detail.errorCode ? Object.entries(detail.errorCode)[0]?.join(':') : null
    const field = detail.location?.fieldPathElements?.map((f) => f.fieldName).join('.') || null
    console.error('[google-ads] detailed error:', JSON.stringify(errObj))
    return [detail.message, code && `(${code})`, field && `[field: ${field}]`].filter(Boolean).join(' ')
  }
  if (errObj) console.error('[google-ads] error (no detail array):', JSON.stringify(errObj))
  return errObj?.message || fallback
}

function buildHeaders(accessToken, loginCustomerId) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId.replace(/-/g, '')
  }
  return headers
}

export async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to refresh access token')
  return data.access_token
}

export async function resolveCustomerId(refreshToken) {
  const accessToken = await getAccessToken(refreshToken)
  const resourceNames = await listAccessibleCustomers(accessToken)
  if (!resourceNames.length) return null
  const firstCustomer = resourceNames[0]
  return firstCustomer.split('/').pop()
}

export async function listAccessibleCustomers(accessToken) {
  const res = await fetch(`${BASE_URL}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to list customers'))
  return data.resourceNames || []
}

export async function getCustomer(accessToken, customerId, loginCustomerId) {
  const query = `SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone FROM customer_client WHERE customer_client.id = ${customerId.replace(/-/g, '')}`
  const results = await searchGoogleAds(accessToken, customerId, query, loginCustomerId)
  return results?.[0]?.customerClient || null
}

export async function searchGoogleAds(accessToken, customerId, query, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/googleAds:searchStream`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query }),
  })

  const data = await res.json()
  if (!res.ok) {
    // searchStream errors come back as an array ([{ error: {...} }]); search as an object.
    console.error('[google-ads] search failed:', res.status, 'isArray:', Array.isArray(data), 'keys:', Array.isArray(data) ? 'array' : Object.keys(data || {}).join(','))
    throw new Error(formatGoogleAdsError(data, 'Google Ads search failed'))
  }
  // searchStream returns a top-level array of chunks: [{ results: [...] }, ...].
  // Non-streaming search returns a single object: { results: [...] }.
  const chunks = Array.isArray(data) ? data : (data.results ? [data] : [])
  return chunks.flatMap((chunk) => (Array.isArray(chunk.results) ? chunk.results : []))
}

export async function mutateGoogleAds(accessToken, customerId, query, operations, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/googleAds:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query, operations }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Google Ads mutate failed'))
  return data
}

export async function createBudget(accessToken, customerId, { name, amountMicros }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaignBudgets:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          create: {
            resourceName: `customers/${cleanId}/campaignBudgets/-1`,
            name,
            deliveryMethod: 'STANDARD',
            amountMicros: String(amountMicros),
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to create budget'))
  return data.results?.[0]?.resourceName || null
}

export async function createCampaign(accessToken, customerId, {
  name,
  budgetResourceName,
  status,
  advertisingChannelType,
  biddingStrategy,
}, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const channelType = advertisingChannelType || 'SEARCH'
  const campaign = {
    resourceName: `customers/${cleanId}/campaigns/-1`,
    name,
    status: status || 'PAUSED',
    advertisingChannelType: channelType,
    campaignBudget: budgetResourceName,
    // Campaign.campaign_bidding_strategy is a required oneof - set via one of its member
    // fields (manualCpc, targetSpend, etc.) directly, not a field named campaignBidStrategy.
    ...(biddingStrategy || { manualCpc: {} }),
    // Required declaration (EU political-ad transparency regulation) on every campaign create.
    containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
  }

  // NetworkSettings is a Search-specific concept - Display/PMax don't use it the same way.
  // targetContentNetwork stays false so a vendor's "Search" pick doesn't silently spend on
  // Display placements (that's the separate opt-in "Display Expansion on Search" feature).
  if (channelType === 'SEARCH') {
    campaign.networkSettings = {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false,
    }
  }

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaigns:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [{ create: campaign }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to create campaign'))
  return data.results?.[0]?.resourceName || null
}

export async function updateCampaignStatus(accessToken, customerId, campaignResourceName, status, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaigns:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          updateMask: 'status',
          update: {
            resourceName: campaignResourceName,
            status,
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to update campaign'))
  return data
}

export async function listCampaigns(accessToken, customerId, loginCustomerId) {
  const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget, campaign.advertising_channel_type, campaign_budget.amount_micros, campaign_budget.explicitly_shared FROM campaign ORDER BY campaign.id DESC`
  return searchGoogleAds(accessToken, customerId, query, loginCustomerId)
}

export async function getCampaignReport(accessToken, customerId, dateRange = 'LAST_30_DAYS', loginCustomerId) {
  const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING ${dateRange} ORDER BY metrics.cost_micros DESC`
  return searchGoogleAds(accessToken, customerId, query, loginCustomerId)
}

export async function createAdGroup(accessToken, customerId, { campaignResourceName, name, type }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroups:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          create: {
            resourceName: `customers/${cleanId}/adGroups/-1`,
            name,
            campaign: campaignResourceName,
            type: type || 'SEARCH_STANDARD',
            status: 'ENABLED',
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to create ad group'))
  return data.results?.[0]?.resourceName || null
}

// Google Ads requires raw image bytes (base64), not a URL - fetches the already-uploaded
// Cloudinary image and re-uploads it to Google as an Asset. Returns the asset's resource name for
// use in a ResponsiveDisplayAd's marketingImages/squareMarketingImages.
export async function uploadImageAsset(accessToken, customerId, { imageUrl, name }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch image for Google Ads upload: ${imageUrl}`)
  const buffer = await imgRes.arrayBuffer()
  const base64Data = Buffer.from(buffer).toString('base64')

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/assets:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          create: {
            resourceName: `customers/${cleanId}/assets/-1`,
            name,
            type: 'IMAGE',
            imageAsset: { data: base64Data },
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to upload image asset'))
  return data.results?.[0]?.resourceName || null
}

export async function createResponsiveDisplayAd(accessToken, customerId, {
  adGroupResourceName,
  imageAssetResourceNames,
  headlines,
  descriptions,
  longHeadline,
  businessName,
  finalUrl,
}, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  // Google requires both marketingImages (landscape) and squareMarketingImages (1:1) - vendors
  // only supply one set of images, so the same uploaded assets are reused for both. If a vendor's
  // images don't meet Google's minimum size/aspect requirements, this will surface a specific,
  // readable IMAGE_ERROR via formatGoogleAdsError rather than fail silently.
  const images = (imageAssetResourceNames || []).map((assetResourceName) => ({ asset: assetResourceName }))
  const ad = {
    finalUrls: [finalUrl],
    responsiveDisplayAd: {
      headlines: headlines.map((h) => ({ text: h })),
      descriptions: descriptions.map((d) => ({ text: d })),
      longHeadline: { text: longHeadline },
      businessName,
      marketingImages: images,
      squareMarketingImages: images,
    },
  }

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroupAds:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            ad,
            status: 'ENABLED',
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to create display ad'))
  return data.results?.[0]?.resourceName || null
}

export async function createResponsiveSearchAd(accessToken, customerId, { adGroupResourceName, headlines, descriptions, finalUrl }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  // Attaching an ad to an ad group is a distinct resource (AdGroupAd) from the ad group itself -
  // it must go through AdGroupAdService (adGroupAds:mutate), not AdGroupService (adGroups:mutate).
  const ad = {
    finalUrls: [finalUrl],
    responsiveSearchAd: {
      headlines: headlines.map((h) => ({ text: h })),
      descriptions: descriptions.map((d) => ({ text: d })),
    },
  }

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroupAds:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            ad,
            status: 'ENABLED',
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to create ad'))
  return data.results?.[0]?.resourceName || null
}

export async function addKeywords(accessToken, customerId, { adGroupResourceName, keywords }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const operations = keywords.map((keyword) => ({
    create: {
      resourceName: `customers/${cleanId}/adGroupCriteria/-1`,
      keyword: {
        text: keyword,
        matchType: 'BROAD',
      },
      status: 'ENABLED',
    },
  }))

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroupCriteria:mutate`, {
    method: 'POST',
    headers: buildHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ operations }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(formatGoogleAdsError(data, 'Failed to add keywords'))
  return data.results || []
}
