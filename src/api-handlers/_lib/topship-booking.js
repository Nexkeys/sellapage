//src/api-handlers/_lib/topship-booking.js
// Shared helper for Topship rate quotes, shipment booking, and tracking.
// LIVE as of 2026-08-12 — TOPSHIP_ENV=production, TOPSHIP_PRODUCTION_KEY set (Topship
// issued the production key after reviewing staging logs/reports). TOPSHIP_STAGING_KEY
// stays commented out in .env rather than deleted, so flipping back to TOPSHIP_ENV=staging
// for future testing is still a one-variable change with no code edits needed.

// save-shipment and pay-from-wallet are real booking/payment operations (not quote
// lookups), so they get a longer per-call budget than e.g. the geolocation timeout
// used elsewhere in this codebase. Kept comfortably under the 60s function-level
// maxDuration (vercel.json) so a slow Topship response is caught here, as a clean
// JSON error, instead of the whole function getting hard-killed by the platform.
const TOPSHIP_CALL_TIMEOUT_MS = 12000

// pay-from-wallet gets its own, longer budget: a real staging booking (2026-07-21) passed
// save-shipment and then blew through the 12s cap on the wallet payment alone. Topship's
// staging wallet op is just slow — confirmed by their support AI as a staging-environment
// characteristic, not a request problem. 25s still fits the 60s function maxDuration
// (vercel.json) alongside the pickup-rates + save-shipment calls.
const TOPSHIP_PAYMENT_TIMEOUT_MS = 25000

function isTimeoutError(err) {
  return err?.name === 'TimeoutError' || err?.name === 'AbortError'
}

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
    ? ' — this usually means the API key isn\'t enabled for this action on Topship\'s side (rate quotes can still work fine even when booking doesn\'t). Contact tech@topship.africa to confirm the production key has write/booking access.'
    : ''
  return `${raw}${hint}`
}

/**
 * Translates a technical Topship error (from describeTopshipError, which is meant for our
 * own server logs) into a message a non-technical vendor can act on. Never lets a raw
 * Topship string (weigh-bill internals, validation field names, dev-only hints like
 * "contact tech@topship.africa") reach the dashboard UI — full technical detail still goes
 * to console.error at the call site, unchanged.
 */
function friendlyTopshipError(technicalMessage) {
  const msg = technicalMessage || ''

  // The specific courier partner (Glovo, Chowdeck, etc.) rejected or can't service this
  // job right now — confirmed via real staging tests to be genuinely courier-side, not a
  // bug in our request. Nothing to fix on our end for these; the vendor's actual next step
  // is simply "pick a different courier."
  if (/weigh-?bill|could not get shipment from|not taking orders/i.test(msg)) {
    return "This courier isn't available for this delivery right now. Please select a different courier and try again."
  }

  // Already plain-language, already actionable business rules (e.g. a minimum weight for
  // Sea Export) — pass through unchanged rather than replacing useful detail with a
  // generic message.
  if (/only (supported|available) for shipments (above|below|between)/i.test(msg)) {
    return technicalMessage
  }

  if (/unauthorized|forbidden/i.test(msg)) {
    return 'We couldn\'t process this booking due to an account setup issue with our shipping partner. Please try again shortly — if this continues, contact support.'
  }

  // Topship's pay-from-wallet debits Sellapage's own prepaid Topship wallet (the vendor's
  // Paystack payment reimburses Sellapage separately). An empty wallet is a Sellapage-ops
  // issue, NOT the vendor's fault — the message must never imply the vendor underpaid or
  // must pay again. The distinct log line below is greppable for ops top-up alerting.
  if (/insufficient.*(wallet|balance)/i.test(msg)) {
    console.error('[topship-booking] WALLET BALANCE LOW — Topship wallet needs funding')
    return 'This shipment couldn\'t be completed right now due to an issue on our courier partner\'s side. Please try again shortly, or contact support if it continues.'
  }

  // Anything else unrecognized (e.g. a validation error on our side we don't have a
  // specific translation for yet) — never show Topship's raw technical string to a vendor.
  return 'We couldn\'t complete this booking due to a temporary issue with our shipping partner. Please try again, or choose a different courier.'
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
    return { success: false, error: friendlyTopshipError(describeTopshipError(data, 'Failed to fetch Topship countries')), data }
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
    return { success: false, error: friendlyTopshipError(describeTopshipError(data, 'Failed to fetch Topship rates')), data }
  }

  const rates = Array.isArray(data) ? data : []
  if (rates.length === 0) {
    // TEMP DEBUG LOGGING (2026-08-12): a 200 response with zero rates is indistinguishable
    // from "no couriers serviceable for this route" on our end right now — logging the exact
    // request and raw response so a real occurrence tells us whether that's genuinely what
    // Topship returned (in which case this is a Topship-account/coverage question, not a bug)
    // or whether production's response is shaped differently than the array docs describe
    // (same category of docs-vs-reality mismatch already hit on /save-shipment and
    // /get-pickup-rates). Remove once confirmed either way.
    console.warn('[topship-booking] get-shipment-rate returned zero rates. Request shipmentDetail was:', JSON.stringify(shipmentDetail))
    console.warn('[topship-booking] get-shipment-rate raw response was:', JSON.stringify(data))
  }
  return { success: true, data: rates }
}

/**
 * Pickup rate — GET /get-pickup-rates. Returns what Topship's own rider network charges to
 * collect a shipment from the sender's address on a given date, plus the pickupId/partner
 * that must be echoed back into /save-shipment. This is a REQUIRED prior step for any
 * itemCollectionMode: 'PickUp' booking — /save-shipment validates pickupCharge against what
 * this endpoint would have returned, and rejects a fabricated/zero value with "Invalid
 * Pickup Charge! Expecting NGN X" (confirmed via real staging bookings on interstate and
 * international routes — local intra-city courier pickup is apparently free, which is why
 * that specific error never showed up for Lagos->Lagos bookings).
 *
 * Response's pickupCharge unit is assumed to already be KOBO, matching /get-shipment-rate's
 * confirmed-KOBO `cost` field (same "charge" convention across Topship's API). Not yet
 * confirmed against a real response — logged verbatim below so that's a one-line fix if
 * this assumption turns out wrong.
 */
export async function getTopshipPickupRates({ senderDetail, pickupDate }) {
  const { baseUrl, apiKey } = getTopshipConfig()
  const senderSplit = splitAddress(senderDetail?.addressLine1 || senderDetail?.address || '')
  const input = {
    senderDetail: {
      addressLine1: senderSplit.line1,
      addressLine2: senderSplit.line2,
      country: senderDetail?.country || 'Nigeria',
      countryCode: senderDetail?.countryCode || 'NG',
      state: senderDetail?.state || '',
      city: senderDetail?.city || '',
    },
    pickupDate: pickupDate ? new Date(pickupDate).toISOString() : new Date().toISOString(),
  }

  let res
  try {
    res = await fetch(`${baseUrl}/get-pickup-rates?input=${encodeURIComponent(JSON.stringify(input))}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TOPSHIP_CALL_TIMEOUT_MS),
    })
  } catch (err) {
    if (isTimeoutError(err)) {
      console.error(`[topship-booking] get-pickup-rates timed out after ${TOPSHIP_CALL_TIMEOUT_MS}ms`)
      return { success: false, error: "Topship's pickup-rate service didn't respond in time. Please try again shortly." }
    }
    throw err
  }

  const data = await res.json()
  // TEMP DEBUG LOGGING (2026-07-21): logs the raw pickup-rate response so the KOBO-vs-Naira
  // assumption above can be confirmed or corrected from real staging evidence. Safe to
  // remove once confirmed — see README.md changelog for context.
  console.error('[topship-booking] get-pickup-rates raw response:', JSON.stringify(data))

  if (!res.ok) {
    console.error('[topship-booking] get-pickup-rates error:', data)
    return { success: false, error: friendlyTopshipError(describeTopshipError(data, 'Failed to fetch Topship pickup rate')), data }
  }
  const options = Array.isArray(data) ? data : (data ? [data] : [])
  if (options.length === 0) {
    return { success: false, error: 'No Topship pickup partner is available for this address right now. Please try a different pickup date or address.' }
  }
  return { success: true, data: options[0] }
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
  pickupDate,
  senderDetail,
  receiverDetail,
  shipmentRoute = 'Domestic',
}) {
  const { baseUrl, apiKey } = getTopshipConfig()

  const shipmentCharge = Math.round((Number(shipmentChargeNaira) || 0) * 100)

  // Pickup handling is ROUTE-DEPENDENT, not tier-dependent (an earlier tier-based guess was
  // disproved by an inter-state Chowdeck booking that still demanded a real pickup charge).
  // Confirmed against every staging sample on 2026-07-21:
  //   - Domestic + same state (e.g. Lagos->Lagos): the delivery courier collects directly,
  //     so Topship expects pickupCharge 0 and VAT on the shipment charge alone. Sending a
  //     real rider rate here instead breaks their VAT validation.
  //   - Anything else (inter-state, Export, Import): Topship's rider network handles pickup,
  //     so /save-shipment requires the REAL /get-pickup-rates values — a fabricated 0 is
  //     rejected with "Invalid Pickup Charge! Expecting NGN X".
  // pickupPartner (pickup leg) and pricingTier (delivery leg) are independent in Topship's
  // model, so using the /get-pickup-rates named partner (e.g. Fez) alongside any delivery
  // tier is valid — that exact combination is what passed save-shipment on staging.
  const sameState = (senderDetail?.state || '').trim().toLowerCase() === (receiverDetail?.state || '').trim().toLowerCase()
  const localSameStatePickup = shipmentRoute === 'Domestic' && sameState

  let pickupCharge = 0
  let deliveryLocation = ''
  let pickupId = ''
  let pickupPartner = itemCollectionMode === 'PickUp' ? 'Standard' : ''
  if (itemCollectionMode === 'PickUp' && !localSameStatePickup) {
    const pickupRateResult = await getTopshipPickupRates({ senderDetail, pickupDate })
    if (!pickupRateResult.success) {
      return { success: false, error: pickupRateResult.error }
    }
    const rate = pickupRateResult.data
    pickupCharge = Number(rate?.pickupCharge) || 0
    deliveryLocation = rate?.deliveryLocation || ''
    pickupId = rate?.pickupId || ''
    pickupPartner = rate?.partner || 'Standard'
  }

  const insuranceCharge = 0
  // Topship rejects VAT computed with standard rounding (confirmed via a real staging
  // response: "Invalid Value Added Tax Charge!, Got 38598, Expecting 38599" for a
  // 514642-kobo shipmentCharge, where 514642*0.075=38598.15 — they expect it rounded
  // UP, not to nearest). Math.round would give 38598 here; Math.ceil gives 38599.
  const valueAddedTaxCharge = Math.ceil((shipmentCharge + pickupCharge + insuranceCharge) * 0.075)

  const senderSplit = splitAddress(senderDetail?.addressLine1 || senderDetail?.address || '')
  const receiverSplit = splitAddress(receiverDetail?.addressLine1 || receiverDetail?.address || '')

  // Built as a named variable (not inlined into the fetch call) specifically so the
  // exact payload can be logged verbatim on failure — see TEMP DEBUG LOGGING note
  // below. Remove that logging once the Topship "Unauthorized" issue is resolved.
  const saveShipmentPayload = {
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
      deliveryLocation,
      pickupId,
      pickupPartner,
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
  }

  let bookRes
  try {
    bookRes = await fetch(`${baseUrl}/save-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(saveShipmentPayload),
      signal: AbortSignal.timeout(TOPSHIP_CALL_TIMEOUT_MS),
    })
  } catch (err) {
    if (isTimeoutError(err)) {
      console.error(`[topship-booking] save-shipment timed out after ${TOPSHIP_CALL_TIMEOUT_MS}ms`)
      return {
        success: false,
        error: "Topship's booking service didn't respond in time — the courier may be temporarily unavailable on their end. Try a different courier or try again shortly.",
      }
    }
    throw err
  }

  const bookData = await bookRes.json()
  if (!bookRes.ok) {
    // TEMP DEBUG LOGGING (2026-07-20): logs the exact raw request body on failure so
    // it can be handed to Topship support verbatim if they ask for it while
    // investigating the /save-shipment "Unauthorized" issue. Safe to remove once
    // that's resolved — see README.md changelog for context.
    console.error('[topship-booking] save-shipment error:', bookData)
    console.error('[topship-booking] save-shipment request payload was:', JSON.stringify(saveShipmentPayload, null, 2))
    const technicalDetail = describeTopshipError(bookData, 'Failed to save Topship shipment draft')
    console.error('[topship-booking] save-shipment technical detail (for support/logs only):', technicalDetail)
    return {
      success: false,
      error: friendlyTopshipError(technicalDetail),
      data: bookData,
    }
  }

  // Topship's docs show a bare object as the /save-shipment response, but real staging
  // responses come back as a one-element ARRAY (confirmed 2026-07-20 against a live
  // successful booking) — presumably because the request body's `shipment` field is
  // itself an array. Unwrap defensively rather than trusting the docs here.
  const bookRecord = Array.isArray(bookData) ? bookData[0] : bookData

  const shipmentId = bookRecord?.id
  if (!shipmentId) {
    console.error('[topship-booking] save-shipment returned no id:', bookData)
    return { success: false, error: friendlyTopshipError('Topship did not return a shipment id'), data: bookRecord }
  }

  const payFromWalletPayload = { detail: { shipmentId } }
  let payRes
  try {
    payRes = await fetch(`${baseUrl}/pay-from-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payFromWalletPayload),
      signal: AbortSignal.timeout(TOPSHIP_PAYMENT_TIMEOUT_MS),
    })
  } catch (err) {
    if (isTimeoutError(err)) {
      console.error(`[topship-booking] pay-from-wallet timed out after ${TOPSHIP_PAYMENT_TIMEOUT_MS}ms`)
      return {
        success: false,
        error: "Topship's payment service didn't respond in time — the shipment draft was created but payment could not be confirmed. Try again shortly before booking a new one.",
      }
    }
    throw err
  }

  const payDataRaw = await payRes.json()
  if (!payRes.ok) {
    // TEMP DEBUG LOGGING (2026-07-20): see the matching note on the save-shipment
    // failure branch above — same reasoning, same removal plan.
    console.error('[topship-booking] pay-from-wallet error:', payDataRaw)
    console.error('[topship-booking] pay-from-wallet request payload was:', JSON.stringify(payFromWalletPayload, null, 2))
    const technicalDetail = describeTopshipError(payDataRaw, 'Failed to pay for Topship shipment from wallet')
    console.error('[topship-booking] pay-from-wallet technical detail (for support/logs only):', technicalDetail)
    return {
      success: false,
      error: friendlyTopshipError(technicalDetail),
      data: payDataRaw,
    }
  }

  // Same defensive unwrap as save-shipment above, applied preemptively since we haven't
  // yet observed a real pay-from-wallet success response to confirm its actual shape.
  const payData = Array.isArray(payDataRaw) ? payDataRaw[0] : payDataRaw

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
    console.error(`[topship-booking] track-shipment error for trackingId ${trackingId}:`, data)
    return { success: false, error: friendlyTopshipError(describeTopshipError(data, 'Failed to fetch Topship tracking status')), data }
  }
  return { success: true, data }
}
