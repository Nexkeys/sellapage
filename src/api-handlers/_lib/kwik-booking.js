//src/api-handlers/_lib/kwik-booking.js
// STAGING - Kwik issued staging credentials on 2026-09-22 and will create a production
// account only "once you have successfully tested integration in our sandbox". Switch with
// KWIK_ENV=production once they do. Provider #3, alongside Sendbox and Topship.
//
// HOW KWIK DIFFERS FROM THE OTHER TWO - the three things that shape this whole file:
//
// 1. THERE IS NO API KEY. Authentication is a login call: POST /vendor_login with
//    { domain_name, email, password, api_login: 1 } returns an `access_token` plus a
//    `vendor_details` object carrying vendor_id / user_id / customer_id. That is why the
//    credentials email supplied a Domain Name and a password rather than a key - those ARE
//    the credential. The token has NO documented lifetime, so every call re-logs-in once on
//    a 101 INVALID_KEY and retries (see kwikRequest).
//
// 2. PRICING IS DISTANCE x TIME, NOT CITY. The docs state the formula outright:
//      [{{baseFare}} + [[{{job_distance}}]*{{distanceFare}}] + [[{{totalTimeTaken}}]*{{timeFare}}]]
//    so every quote needs LATITUDE AND LONGITUDE for both ends - at QUOTE time, not just at
//    booking. Kwik exposes no geocoding endpoint of its own (searched: zero matches for
//    geocode/autocomplete/address lookup across all 2,609 lines of Docs/Kwik-DOCS.txt), so
//    the caller must supply coordinates. None of the Topship city-vocabulary work applies
//    here; this is a different failure mode entirely.
//
// 3. NO WEBHOOKS AT ALL. Zero matches in the docs. Status is poll-only, via getJobStatus or
//    view_task_by_relationship_id. The webhook pattern built for Topship does not transfer.
//
// Quoting is TWO calls, in this order (the docs are explicit that the second consumes the
// first's output): /send_payment_for_task computes the distance-based cost, then
// /get_bill_breakdown turns that into the final payable amount including VAT and surge.
//
// BASE URL: the blueprint's own HOST line says `staging-api-test.kwik.delivery`, but Kwik's
// credentials email AND their own sample `job_status_check_link` inside the docs both say
// `staging-api.kwik.delivery`. Going with the two that agree.

const KWIK_CALL_TIMEOUT_MS = 15000

// form_id is documented as "can be hardcoded because it don't change on every login. It
// will be always 2".
const KWIK_FORM_ID = 2

// The pricing template name mapped to our account. Observed as "pricing-template" in the
// login response. Overridden from vendor_details when present.
const DEFAULT_PRICING_TEMPLATE = 'pricing-template'

/** Payment methods, from the /send_payment_for_task docs table. */
export const KWIK_PAYMENT_METHODS = {
  CASH_ON_PICKUP: 8,
  CARD: 32,
  CASH_ON_DELIVERY: 262144,
  PAGA: 131072,
  // End-of-month billing. Relevant because Sellapage's Kwik account is a CORPORATE account
  // and the docs carry a whole "Corporate End Of month billing logic" group. The docs note
  // that with this set, "in case there is fund in one's wallet priority will be given to
  // Kwik wallet" - so EOMB may let bookings proceed on an unfunded wallet. Unverified.
  END_OF_MONTH_BILLING: 524288,
}

/** Kwik job_status values -> a human label. */
const JOB_STATUS_LABELS = {
  0: 'Upcoming',
  1: 'Started',
  2: 'Delivered',
  3: 'Failed',
  4: 'Arrived',
  6: 'Unassigned',
  7: 'Accepted',
  8: 'Declined',
  9: 'Cancelled',
  10: 'Deleted',
}

export function kwikJobStatusLabel(value) {
  return JOB_STATUS_LABELS[Number(value)] || 'Pending'
}

export function getKwikConfig() {
  const env = (process.env.KWIK_ENV || 'staging').toLowerCase()
  const isProduction = env === 'production'
  return {
    env,
    isProduction,
    // Production host is NOT yet confirmed - Kwik creates the production account only after
    // sandbox testing passes. Verify against their production credentials email before
    // flipping KWIK_ENV, rather than trusting this guess.
    baseUrl: isProduction ? 'https://api.kwik.delivery' : 'https://staging-api.kwik.delivery',
    domainName: process.env.KWIK_DOMAIN_NAME || '',
    email: process.env.KWIK_EMAIL || '',
    password: process.env.KWIK_PASSWORD || '',
  }
}

/**
 * Nigeria's bounding box, used to reject swapped coordinates.
 *
 * Latitude runs ~4-14 N and longitude ~2.6-14.7 E, so a swapped pair (3.33, 6.44 instead of
 * 6.44, 3.33) yields a latitude BELOW the box - offshore in the Gulf of Guinea. Kwik would
 * not error on that; it would happily quote a delivery into the sea. Fail loudly instead.
 */
export function assertNigerianCoords(label, latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return `${label} coordinates are missing.`
  }
  if (lat < 4 || lat > 14.7) {
    return `${label} latitude ${lat} is outside Nigeria - latitude and longitude may be swapped.`
  }
  if (lng < 2.6 || lng > 14.8) {
    return `${label} longitude ${lng} is outside Nigeria - latitude and longitude may be swapped.`
  }
  return ''
}

/** Turns a Kwik failure into something safe to show a vendor. */
export function friendlyKwikError(data, fallback = 'Could not reach Kwik. Please try again.') {
  const raw = String(data?.message || data?.error || '').trim()
  if (!raw) return fallback
  const lower = raw.toLowerCase()
  // MUST stay narrower than a bare "insufficient" test. On 2026-09-22 this matched Kwik's
  // "Insufficient information was supplied. Please check and try again." - a MISSING
  // PARAMETER error - and reported it to the vendor as an empty wallet, which sent the
  // whole investigation after a funding problem that did not exist. Match the balance
  // wording specifically, and let anything else fall through to the pass-through below.
  if (
    lower.includes('insufficient wallet') ||
    lower.includes('insufficient balance') ||
    lower.includes('insufficient fund') ||
    lower.includes('wallet balance') ||
    lower.includes('low balance')
  ) {
    return 'The Kwik wallet does not have enough balance to cover this delivery.'
  }
  if (lower.includes('insufficient information')) {
    return 'Kwik rejected the request because some delivery details are missing. Please check the addresses and try again.'
  }
  if (lower.includes('invalid') && lower.includes('key')) {
    return 'Kwik rejected our credentials. Please contact support.'
  }
  if (lower.includes('parameter')) {
    return 'Kwik rejected the request because some delivery details are missing or invalid.'
  }
  // Kwik's own messages are generally written for end users, so pass them through.
  return raw
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Cached for the life of the warm serverless instance. A cold start re-logs-in. There is no
// documented token lifetime, so this is also invalidated on the first 101 INVALID_KEY.
let SESSION = null

async function kwikFetch(path, { method = 'POST', body, query } = {}) {
  const { baseUrl } = getKwikConfig()
  let url = `${baseUrl}${path}`
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString()
    if (qs) url += `?${qs}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), KWIK_CALL_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
      signal: controller.signal,
    })
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      // Kwik's getJobStatus is documented with a plain-text response ("SUCCESSFUL,SUCCESSFUL"),
      // so a non-JSON body is expected on at least one endpoint rather than a failure.
      data = { status: res.ok ? 200 : res.status, message: text, data: null, _raw: text }
    }
    return { ok: res.ok, httpStatus: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}

/** Logs in and caches the session. */
export async function kwikLogin(force = false) {
  if (SESSION && !force) return { success: true, data: SESSION }

  const { domainName, email, password } = getKwikConfig()
  if (!domainName || !email || !password) {
    return {
      success: false,
      error: 'Kwik is not configured. KWIK_DOMAIN_NAME, KWIK_EMAIL and KWIK_PASSWORD must all be set.',
    }
  }

  const { data } = await kwikFetch('/vendor_login', {
    body: { domain_name: domainName, email, password, api_login: 1 },
  })

  const token = data?.data?.access_token
  if (Number(data?.status) !== 200 || !token) {
    console.error('[kwik-booking] vendor_login failed:', JSON.stringify(data?.message || data))
    return { success: false, error: friendlyKwikError(data, 'Could not sign in to Kwik.') }
  }

  const v = data.data.vendor_details || {}
  SESSION = {
    accessToken: token,
    vendorId: v.vendor_id,
    userId: v.user_id,
    customerId: v.customer_id,
    corporateId: v.corporate_id,
    cardId: v.card_id || '',
    credits: Number(v.credits) || 0,
    pendingAmount: Number(v.pending_amount) || 0,
    pricingTemplate: DEFAULT_PRICING_TEMPLATE,
    // Whether end-of-month billing is actually enabled for this account. EOMB is the one
    // payment method that should not need a funded wallet, so when a booking fails with
    // "Insufficient wallet Balance" despite payment_method 524288, this flag is the thing
    // to check first - it is Kwik's own answer to "is EOMB switched on for us?".
    isMonthlyInvoice: Number(v.is_monthly_invoice) || 0,
    defaultPickup: {
      address: v.default_pickup_address || '',
      latitude: v.default_pickup_latitude || '',
      longitude: v.default_pickup_longitude || '',
    },
  }
  // The account's billing posture, logged on every cold start. These four fields decide
  // whether a booking can be paid for at all, and reading them off a real login beats
  // guessing from the dashboard.
  console.log('[kwik-booking] account billing:', JSON.stringify({
    vendorId: SESSION.vendorId,
    customerId: SESSION.customerId,
    corporateId: SESSION.corporateId,
    credits: SESSION.credits,
    pendingAmount: SESSION.pendingAmount,
    isMonthlyInvoice: SESSION.isMonthlyInvoice,
    hasCard: !!SESSION.cardId,
  }))

  return { success: true, data: SESSION }
}

/**
 * Authenticated call with a single automatic re-login.
 *
 * Kwik documents no token lifetime, so rather than guess an expiry we treat the documented
 * `101 INVALID_KEY` as "token is stale", log in once more and retry exactly once. A second
 * failure is returned as-is instead of looping.
 */
async function kwikRequest(path, { method = 'POST', body = {}, query } = {}) {
  let session = SESSION
  if (!session) {
    const login = await kwikLogin()
    if (!login.success) return { success: false, error: login.error }
    session = login.data
  }

  const withAuth = (s) =>
    method === 'GET'
      ? { method, query: { ...query, access_token: s.accessToken } }
      : { method, body: { domain_name: getKwikConfig().domainName, access_token: s.accessToken, ...body } }

  let { data } = await kwikFetch(path, withAuth(session))

  if (Number(data?.status) === 101) {
    console.warn(`[kwik-booking] ${path} returned 101 INVALID_KEY - re-authenticating once`)
    SESSION = null
    const relogin = await kwikLogin(true)
    if (!relogin.success) return { success: false, error: relogin.error }
    session = relogin.data
    ;({ data } = await kwikFetch(path, withAuth(session)))
  }

  if (Number(data?.status) !== 200) {
    // The request is logged alongside the failure, access_token redacted. Kwik's rejections
    // name no field ("Insufficient information was supplied"), so without seeing the exact
    // payload a missing parameter can only be found by re-reading the docs and guessing -
    // which cost a round on 2026-09-22 when payment_method turned out to be absent.
    const sent = method === 'GET' ? { query } : { ...(withAuth(session).body || {}) }
    if (sent.access_token) sent.access_token = '[redacted]'
    console.error(`[kwik-booking] ${path} failed:`, JSON.stringify(data?.message || data))
    console.error(`[kwik-booking] ${path} request was:`, JSON.stringify(sent))
    return { success: false, error: friendlyKwikError(data), data }
  }
  return { success: true, data: data.data, session }
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

/**
 * GET /getVehicle - vehicle classes and their fare components.
 * size: 0 bike, 1 small, 2 medium, 3 large.
 */
export async function getKwikVehicles(size = 0) {
  const result = await kwikRequest('/getVehicle', {
    method: 'GET',
    query: { is_vendor: 1, size },
  })
  if (!result.success) return result
  return { success: true, data: Array.isArray(result.data) ? result.data : [] }
}

// ---------------------------------------------------------------------------
// Pricing - two calls, in this order
// ---------------------------------------------------------------------------

function buildLeg({ address, name, latitude, longitude, time, phone, email }) {
  return {
    address: address || '',
    name: name || '',
    latitude: Number(latitude),
    longitude: Number(longitude),
    time: time || '',
    phone: phone || '',
    email: email || '',
  }
}

/**
 * Step 1 - POST /send_payment_for_task. Computes the distance/time cost for the route.
 * Returns per_task_cost, total_service_charge, insurance_amount, total_no_of_tasks, etc.
 */
/**
 * /send_payment_for_task documents only FOUR payment methods - 8 cash-on-pickup, 32 card,
 * 262144 cash-on-delivery, 131072 Paga. EOMB (524288) appears only on /create_task, so it
 * is a booking-time method with no pricing-time equivalent. Sending it here risks the same
 * "Insufficient information was supplied" rejection, so anything outside the four is priced
 * as card, which does not change the distance/time cost.
 */
const PRICING_PAYMENT_METHODS = new Set([8, 32, 262144, 131072])
function pricingPaymentMethod(method) {
  const n = Number(method)
  return PRICING_PAYMENT_METHODS.has(n) ? n : KWIK_PAYMENT_METHODS.CARD
}

export async function calculateKwikPricing({
  pickup,
  delivery,
  vehicleId,
  pickupTime,
  isCodJob = 0,
  parcelAmount = 0,
  paymentMethod,
}) {
  const badPickup = assertNigerianCoords('Pickup', pickup?.latitude, pickup?.longitude)
  if (badPickup) return { success: false, error: badPickup }
  const badDelivery = assertNigerianCoords('Delivery', delivery?.latitude, delivery?.longitude)
  if (badDelivery) return { success: false, error: badDelivery }

  const login = await kwikLogin()
  if (!login.success) return { success: false, error: login.error }
  const s = login.data

  return kwikRequest('/send_payment_for_task', {
    body: {
      custom_field_template: s.pricingTemplate,
      pickup_custom_field_template: s.pricingTemplate,
      vendor_id: s.vendorId,
      user_id: s.userId,
      form_id: KWIK_FORM_ID,
      timezone: -60, // WAT is UTC+1; Kwik's field is minutes-from-UTC, negated (their sample: -330 for IST).
      is_multiple_tasks: 1,
      layout_type: 0,
      has_pickup: 1,
      has_delivery: 1,
      auto_assignment: 1,
      is_schedule_task: 0,
      pickups: [buildLeg({ ...pickup, time: pickupTime })],
      deliveries: [{ ...buildLeg(delivery), has_return_task: false, is_package_insured: 0 }],
      vehicle_id: vehicleId,
      // OMITTED IN THE FIRST BUILD, and the cause of "Insufficient information was supplied"
      // on 2026-09-22. payment_method is in this endpoint's parameter table AND its request
      // example; it was only being sent at booking time.
      payment_method: pricingPaymentMethod(paymentMethod),
      is_loader_required: 0,
      loaders_amount: 0,
      loaders_count: 0,
      delivery_instruction: delivery?.instruction || '',
      delivery_images: '',
      is_cod_job: isCodJob,
      parcel_amount: parcelAmount,
    },
  })
}

/**
 * Step 2 - POST /get_bill_breakdown. Turns step 1's output into the final payable amount
 * (VAT, surge, service charge). Every "fetched from send_payment_for_task" field in the docs
 * is passed straight through from `pricing`.
 */
export async function getKwikBillBreakdown({ pricing, vehicleId, isCodJob = 0, parcelAmount = 0, pickupTime }) {
  const login = await kwikLogin()
  if (!login.success) return { success: false, error: login.error }
  const s = login.data

  return kwikRequest('/get_bill_breakdown', {
    body: {
      benefit_type: null,
      amount: String(pricing?.per_task_cost ?? ''),
      insurance_amount: pricing?.insurance_amount ?? 0,
      total_no_of_tasks: pricing?.total_no_of_tasks ?? 1,
      total_service_charge: pricing?.total_service_charge ?? 0,
      pickup_time: pickupTime || '',
      user_id: s.userId,
      form_id: KWIK_FORM_ID,
      promo_value: null,
      credits: 0,
      vehicle_id: vehicleId,
      delivery_images: pricing?.delivery_images || '',
      is_loader_required: pricing?.is_loader_required ?? 0,
      loaders_amount: pricing?.loaders_amount ?? 0,
      loaders_count: pricing?.loaders_count ?? 0,
      delivery_instruction: pricing?.delivery_instruction || '',
      is_cod_job: isCodJob,
      parcel_amount: parcelAmount,
      delivery_charge_by_buyer: 2, // 1 = buyer pays, 2 = the Kwik customer (the vendor) pays.
    },
  })
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

/**
 * POST /v2/create_task_via_vendor - books the shipment.
 *
 * Note the response carries a ready-made `job_status_check_link`, so nothing needs to build
 * a tracking URL by hand.
 */
export async function createKwikTask({
  pickup,
  delivery,
  vehicleId,
  pricing,
  breakdown,
  pickupTime,
  deliveryTime,
  paymentMethod = KWIK_PAYMENT_METHODS.END_OF_MONTH_BILLING,
  isCodJob = 0,
  parcelAmount = 0,
}) {
  const badPickup = assertNigerianCoords('Pickup', pickup?.latitude, pickup?.longitude)
  if (badPickup) return { success: false, error: badPickup }
  const badDelivery = assertNigerianCoords('Delivery', delivery?.latitude, delivery?.longitude)
  if (badDelivery) return { success: false, error: badDelivery }

  const login = await kwikLogin()
  if (!login.success) return { success: false, error: login.error }
  const s = login.data

  return kwikRequest('/v2/create_task_via_vendor', {
    body: {
      vendor_id: s.vendorId,
      user_id: s.userId,
      form_id: KWIK_FORM_ID,
      custom_field_template: s.pricingTemplate,
      pickup_custom_field_template: s.pricingTemplate,
      timezone: -60,
      is_multiple_tasks: 1,
      fleet_id: '',
      latitude: 0,
      longitude: 0,
      has_pickup: 1,
      has_delivery: 1,
      pickup_delivery_relationship: 0,
      layout_type: 0,
      auto_assignment: 1,
      team_id: '',
      is_schedule_task: 0,
      pickups: [buildLeg({ ...pickup, time: pickupTime })],
      deliveries: [
        {
          ...buildLeg({ ...delivery, time: deliveryTime }),
          has_return_task: false,
          is_package_insured: 0,
          hadVairablePayment: 1,
          hadFixedPayment: 0,
          is_task_otp_required: 0,
        },
      ],
      insurance_amount: pricing?.insurance_amount ?? 0,
      total_no_of_tasks: pricing?.total_no_of_tasks ?? 1,
      total_service_charge: pricing?.total_service_charge ?? 0,
      amount: String(pricing?.per_task_cost ?? ''),
      surge_cost: breakdown?.SURGE_PRICING ?? 0,
      surge_type: breakdown?.SURGE_TYPE ?? 0,
      payment_method: paymentMethod,
      is_loader_required: pricing?.is_loader_required ?? 0,
      loaders_amount: pricing?.loaders_amount ?? 0,
      loaders_count: pricing?.loaders_count ?? 0,
      delivery_instruction: delivery?.instruction || '',
      delivery_images: pricing?.delivery_images || '',
      is_cod_job: isCodJob,
      parcel_amount: parcelAmount,
      is_task_otp_required: 0,
    },
  })
}

/** POST /cancel_vendor_task */
export async function cancelKwikTask(jobId) {
  return kwikRequest('/cancel_vendor_task', { body: { job_id: jobId } })
}

// ---------------------------------------------------------------------------
// Tracking - polling only, there are no Kwik webhooks
// ---------------------------------------------------------------------------

/**
 * GET /view_task_by_relationship_id - the richer of the two tracking calls. Returns an
 * `orders` array with one entry PER LEG: job_type 0 is the pickup, job_type 1 the delivery,
 * each carrying its own job_status.
 *
 * There is no event-history array anywhere in Kwik's API - only a current status per leg,
 * exactly like Topship. Callers that need a timeline synthesize one entry, which is what
 * ShipmentTimelineCard already degrades to.
 */
export async function getKwikTask(uniqueOrderId) {
  const result = await kwikRequest('/view_task_by_relationship_id', {
    method: 'GET',
    query: { unique_order_id: uniqueOrderId },
  })
  if (!result.success) return result

  const orders = Array.isArray(result.data?.orders) ? result.data.orders : []
  const pickupLeg = orders.find((o) => Number(o.job_type) === 0) || null
  const deliveryLeg = orders.find((o) => Number(o.job_type) === 1) || null
  // The delivery leg is "the" status of the shipment; the pickup leg only tells us whether
  // the rider has collected yet.
  const primary = deliveryLeg || pickupLeg

  return {
    success: true,
    data: {
      orders,
      pickupLeg,
      deliveryLeg,
      jobStatus: primary ? Number(primary.job_status) : null,
      statusLabel: primary ? kwikJobStatusLabel(primary.job_status) : 'Pending',
      totalAmount: Number(result.data?.total_amount) || 0,
    },
  }
}

/**
 * GET /getJobStatus - the lighter poll. Kwik documents its response as the literal text
 * "SUCCESSFUL,SUCCESSFUL" with no schema at all, so the raw body is logged on every call
 * until a real response tells us its true shape. Same "log it, retest, confirm" approach
 * that resolved the Topship VAT and array-unwrap bugs.
 */
export async function getKwikJobStatus(uniqueOrderId, customerId) {
  const { data } = await kwikFetch('/getJobStatus', {
    method: 'GET',
    query: { unique_order_id: uniqueOrderId, customer_id: customerId },
  })
  console.log('[kwik-booking] getJobStatus RAW:', JSON.stringify(data))
  return { success: true, data }
}
