//src/api-handlers/_lib/google-ads-client.js
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24'
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`

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
  if (!res.ok) throw new Error(data.error?.message || 'Failed to list customers')
  return data.resourceNames || []
}

export async function getCustomer(accessToken, customerId, loginCustomerId) {
  const query = `SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone FROM customer_client WHERE customer_client.id = ${customerId.replace(/-/g, '')}`
  const results = await searchGoogleAds(accessToken, customerId, query, loginCustomerId)
  return results?.[0]?.customerClient || null
}

export async function searchGoogleAds(accessToken, customerId, query, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Google Ads search failed')
  return data.results || []
}

export async function mutateGoogleAds(accessToken, customerId, query, operations, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/googleAds:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, operations }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Google Ads mutate failed')
  return data
}

export async function createBudget(accessToken, customerId, { name, amountMicros }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaignBudgets:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operations: [
        {
          create: {
            resourceName: `customers/${cleanId}/campaignBudgets/-1`,
            name,
            deliveryMethod: 'STANDARD',
            amountMicros: String(amountMicros),
            explicitlyShared: true,
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create budget')
  return data.results?.[0]?.resourceName || null
}

export async function createCampaign(accessToken, customerId, {
  name,
  budgetResourceName,
  status,
  advertisingChannelType,
  campaignBidStrategy,
}, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const campaign = {
    resourceName: `customers/${cleanId}/campaigns/-1`,
    name,
    status: status || 'PAUSED',
    advertisingChannelType: advertisingChannelType || 'SEARCH',
    campaignBudget: budgetResourceName,
  }

  if (campaignBidStrategy) {
    campaign.campaignBidStrategy = campaignBidStrategy
  }

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaigns:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operations: [{ create: campaign }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create campaign')
  return data.results?.[0]?.resourceName || null
}

export async function updateCampaignStatus(accessToken, customerId, campaignResourceName, status, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/campaigns:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
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
  if (!res.ok) throw new Error(data.error?.message || 'Failed to update campaign')
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

export async function createAdGroup(accessToken, customerId, { campaignResourceName, name }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroups:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operations: [
        {
          create: {
            resourceName: `customers/${cleanId}/adGroups/-1`,
            name,
            campaign: campaignResourceName,
            type: 'SEARCH_STANDARD',
            status: 'ENABLED',
          },
        },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create ad group')
  return data.results?.[0]?.resourceName || null
}

export async function createResponsiveSearchAd(accessToken, customerId, { adGroupResourceName, headlines, descriptions, finalUrl }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
  const ad = {
    resourceName: `customers/${cleanId}/ads/-1`,
    finalUrls: [finalUrl],
    responsiveSearchAd: {
      headlines: headlines.map((h) => ({ text: h })),
      descriptions: descriptions.map((d) => ({ text: d })),
    },
    status: 'ENABLED',
  }

  const res = await fetch(`${BASE_URL}/customers/${cleanId}/adGroups:mutate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
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
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create ad')
  return data.results?.[0]?.resourceName || null
}

export async function addKeywords(accessToken, customerId, { adGroupResourceName, keywords }, loginCustomerId) {
  const cleanId = customerId.replace(/-/g, '')
  const loginId = (loginCustomerId || customerId).replace(/-/g, '')
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operations }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Failed to add keywords')
  return data.results || []
}
