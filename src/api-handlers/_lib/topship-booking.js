//src/api-handlers/_lib/topship-booking.js
// Shared helper for Topship rate quotes, shipment booking, and tracking.
// STAGING ONLY as of this writing — TOPSHIP_ENV defaults to 'staging' and only
// TOPSHIP_STAGING_KEY is set. Topship will not issue a production key until they've
// reviewed staging logs/reports. Flip TOPSHIP_ENV=production (and add
// TOPSHIP_PRODUCTION_KEY) once that approval lands — no other code changes needed.

function getTopshipConfig() {
  const env = (process.env.TOPSHIP_ENV || 'staging').toLowerCase()
  if (env === 'production') {
    return {
      baseUrl: 'https://api-topship.com/api',
      apiKey: process.env.TOPSHIP_PRODUCTION_KEY,
    }
  }
  return {
    baseUrl: 'https://topship-staging.africa/api',
    apiKey: process.env.TOPSHIP_STAGING_KEY,
  }
}

/**
 * Topship's error responses aren't consistently shaped (plain {message}, or a
 * GraphQL-style {message, locations, path}) — this pulls a readable string out of
 * whatever comes back, and appends a hint when it looks like a permissions problem
 * rather than a request problem, since that distinction isn't obvious from "Unauthorized"
 * alone.
 */
function describeTopshipError(data, fallback) {
  const raw = data?.message || data?.errors?.[0]?.message || fallback
  const looksLikeAuthIssue = /unauthorized|forbidden|not\s*allowed/i.test(raw || '')
  const hint = looksLikeAuthIssue
    ? ' — this usually means the API key isn\'t enabled for this action on Topship\'s side (rate quotes can still work fine even when booking doesn\'t). Contact tech@topship.africa to confirm the staging key has write/booking access.'
    : ''
  return `${raw}${hint}`
}

/**
 * Splits a long address into Topship's addressLine1/2/3 (45-char max each) at word boundaries.
 */
export function splitAddress(address, maxLen = 45) {
  const clean = (address || '').trim()
  if (!clean) return { line1: '', line2: '', line3: '' }
  if (clean.length <= maxLen) return { line1: clean, line2: '', line3: '' }

  const words = clean.split(/\s+/)
  let line1 = '', line2 = '', line3 = ''
  for (const word of words) {
    if ((line1 ? `${line1} ${word}` : word).length <= maxLen) {
      line1 = line1 ? `${line1} ${word}` : word
    } else if ((line2 ? `${line2} ${word}` : word).length <= maxLen) {
      line2 = line2 ? `${line2} ${word}` : word
    } else if ((line3 ? `${line3} ${word}` : word).length <= maxLen) {
      line3 = line3 ? `${line3} ${word}` : word
    }
  }
  return { line1, line2, line3 }
}

/**
 * Countries list — GET /get-countries. Used to populate sender/receiver country
 * pickers for international (Export/Import) shipments.
 */
export async function getTopshipCountries() {
  const { baseUrl, apiKey } = getTopshipConfig()
  const res = await fetch(`${baseUrl}/get-countries`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json()

  if (!res.ok) {
    console.error('[topship-booking] get-countries error:', data)
    return { success: false, error: describeTopshipError(data, 'Failed to fetch Topship countries'), data }
  }
  return { success: true, data: Array.isArray(data) ? data : [] }
}

/**
 * Resolves Topship's shipmentRoute enum (Domestic/Export/Import) from sender/receiver
 * country codes. Sellapage vendors are Nigerian, so Nigeria is the reference point.
 * Neither-side-Nigeria routes (e.g. Ghana -> Togo) aren't covered explicitly in
 * Topship's docs — defaulted to 'Export' as the closest semantic fit. Verify against
 * real staging behavior if that corridor is actually tested.
 */
export function resolveShipmentRoute(senderCountryCode = 'NG', receiverCountryCode = 'NG') {
  const s = (senderCountryCode || 'NG').toUpperCase()
  const r = (receiverCountryCode || 'NG').toUpperCase()
  if (s === 'NG' && r === 'NG') return 'Domestic'
  if (s === 'NG' && r !== 'NG') return 'Export'
  if (s !== 'NG' && r === 'NG') return 'Import'
  return 'Export'
}

/**
 * Rate quote — GET /get-shipment-rate
 */
export async function getTopshipRates({ senderCity, senderCountryCode = 'NG', receiverCity, receiverCountryCode = 'NG', weight = 1 }) {
  const { baseUrl, apiKey } = getTopshipConfig()
  const shipmentDetail = {
    senderDetails: { cityName: senderCity || '', countryCode: senderCountryCode },
    receiverDetails: { cityName: receiverCity || '', countryCode: receiverCountryCode },
    totalWeight: Number(weight) || 1,
  }

  const res = await fetch(
    `${baseUrl}/get-shipment-rate?shipmentDetail=${encodeURIComponent(JSON.stringify(shipmentDetail))}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  const data = await res.json()

  if (!res.ok) {
    console.error('[topship-booking] Rate quote error:', data)
    return { success: false, error: describeTopshipError(data, 'Failed to fetch Topship rates'), data }
  }
  return { success: true, data: Array.isArray(data) ? data : [] }
}

/**
 * Books a shipment: POST /save-shipment (draft) then POST /pay-from-wallet.
 * All charge fields are converted to KOBO at this boundary — callers pass Naira.
 *
 * insuranceCharge is submitted as 0 and left for Topship to calculate (the docs are
 * silent on how a merchant is meant to compute it) — verify against real staging
 * responses and adjust once we see what comes back.
 */
export async function bookTopshipShipment({
  items = [],
  itemCollectionMode = 'PickUp',
  pricingTier = 'Budget',
  insuranceType = 'None',
  shipmentChargeNaira = 0,
  pickupChargeNaira = 0,
  senderDetail,
  receiverDetail,
  shipmentRoute = 'Domestic',
}) {
  const { baseUrl, apiKey } = getTopshipConfig()

  const shipmentCharge = Math.round((Number(shipmentChargeNaira) || 0) * 100)
  const pickupCharge = Math.round((Number(pickupChargeNaira) || 0) * 100)
  const insuranceCharge = 0
  const valueAddedTaxCharge = Math.round((shipmentCharge + pickupCharge + insuranceCharge) * 0.075)

  const senderSplit = splitAddress(senderDetail?.addressLine1 || senderDetail?.address || '')
  const receiverSplit = splitAddress(receiverDetail?.addressLine1 || receiverDetail?.address || '')

  const bookRes = await fetch(`${baseUrl}/save-shipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      shipment: [{
        items: items.length ? items : [{
          category: 'Others',
          description: 'Package',
          weight: 1,
          quantity: 1,
          value: shipmentCharge,
        }],
        itemCollectionMode,
        pricingTier,
        insuranceType,
        insuranceCharge,
        discount: 0,
        shipmentRoute,
        shipmentCharge,
        pickupCharge,
        deliveryLocation: '',
        pickupId: '',
        pickupPartner: itemCollectionMode === 'PickUp' ? 'Standard' : '',
        valueAddedTaxCharge,
        senderDetail: {
          name: senderDetail?.name || '',
          email: senderDetail?.email || '',
          phoneNumber: senderDetail?.phone || senderDetail?.phoneNumber || '',
          addressLine1: senderSplit.line1,
          addressLine2: senderSplit.line2,
          addressLine3: senderSplit.line3,
          country: senderDetail?.country || 'Nigeria',
          state: senderDetail?.state || '',
          city: senderDetail?.city || '',
          countryCode: senderDetail?.countryCode || 'NG',
          postalCode: senderDetail?.postalCode || '',
        },
        receiverDetail: {
          name: receiverDetail?.name || '',
          email: receiverDetail?.email || '',
          phoneNumber: receiverDetail?.phone || receiverDetail?.phoneNumber || '',
          addressLine1: receiverSplit.line1,
          addressLine2: receiverSplit.line2,
          addressLine3: receiverSplit.line3,
          country: receiverDetail?.country || 'Nigeria',
          state: receiverDetail?.state || '',
          city: receiverDetail?.city || '',
          countryCode: receiverDetail?.countryCode || 'NG',
          postalCode: receiverDetail?.postalCode || '',
        },
      }],
    }),
  })

  const bookData = await bookRes.json()
  if (!bookRes.ok) {
    console.error('[topship-booking] save-shipment error:', bookData)
    return {
      success: false,
      error: `Topship rejected the booking request (save-shipment): ${describeTopshipError(bookData, 'Failed to save Topship shipment draft')}`,
      data: bookData,
    }
  }

  const shipmentId = bookData?.id
  if (!shipmentId) {
    console.error('[topship-booking] save-shipment returned no id:', bookData)
    return { success: false, error: 'Topship did not return a shipment id', data: bookData }
  }

  const payRes = await fetch(`${baseUrl}/pay-from-wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ detail: { shipmentId } }),
  })

  const payData = await payRes.json()
  if (!payRes.ok) {
    console.error('[topship-booking] pay-from-wallet error:', payData)
    return {
      success: false,
      error: `Topship rejected the wallet payment (pay-from-wallet): ${describeTopshipError(payData, 'Failed to pay for Topship shipment from wallet')}`,
      data: payData,
    }
  }

  return { success: true, data: payData }
}

/**
 * Tracking — GET /track-shipment
 */
export async function trackTopshipShipment(trackingId) {
  const { baseUrl, apiKey } = getTopshipConfig()
  const res = await fetch(`${baseUrl}/track-shipment?trackingId=${encodeURIComponent(trackingId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json()

  if (!res.ok) {
    console.error('[topship-booking] track-shipment error:', data)
    return { success: false, error: describeTopshipError(data, 'Failed to fetch Topship tracking status'), data }
  }
  return { success: true, data }
}
