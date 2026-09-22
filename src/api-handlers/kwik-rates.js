//src/api-handlers/kwik-rates.js
// STAGING - see _lib/kwik-booking.js header.
//
// Returns Kwik quotes in the SAME shape sendbox-rates.js and topship-rates.js return
// ({ rates: [{ courier_id, courier_name, total_shipping_fee, service_code, delivery_eta }] }),
// so the existing booking modal renders Kwik with no UI rework.
//
// WHAT A "COURIER" IS HERE. Sendbox and Topship return carriers; Kwik returns VEHICLE
// CLASSES (bike / small / medium / large), because Kwik is the carrier and what varies is
// the vehicle. So vehicle_id takes the courier_id slot and the vehicle name is shown as the
// courier name. This is a real difference worth knowing before reading the numbers.
//
// COST OF A QUOTE. Kwik needs two calls per vehicle (/send_payment_for_task then
// /get_bill_breakdown, the second consuming the first's output), so quoting N vehicles is 2N
// round trips. Those chains run in PARALLEL and the vehicle list is capped, to stay inside
// vercel.json's 60s maxDuration.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { resolveCoords } from './_lib/geocode.js'
import {
  getKwikVehicles,
  calculateKwikPricing,
  getKwikBillBreakdown,
} from './_lib/kwik-booking.js'

// Each vehicle costs two sequential Kwik calls; more than this and a slow Kwik staging
// response starts threatening the function's time budget.
const MAX_VEHICLES_QUOTED = 3

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    storeId,
    senderDetails,
    receiverDetails,
    vehicleSize = 0, // 0 bike, 1 small, 2 medium, 3 large
    pickupDate,
    packageAmount = 0,
    // Forwarded to /send_payment_for_task, which requires it. Anything it doesn't accept
    // (notably EOMB) is priced as card inside calculateKwikPricing.
    paymentMethod,
  } = req.body || {}

  if (!storeId || !senderDetails || !receiverDetails) {
    return res.status(400).json({
      error: 'Missing required fields: storeId, senderDetails, receiverDetails',
    })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (err) {
      console.error('[kwik-rates] verifyIdToken failed:', err?.code, err?.message)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeDoc = await db.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'delivery', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Coordinates are looked up fresh on every quote rather than stored. Mapbox's Temporary
    // results may not be cached, and Permanent storage requires a card on file - see the
    // header of _lib/geocode.js. Only coordinates a human supplied skip the lookup.
    const [pickupGeo, deliveryGeo] = await Promise.all([
      resolveCoords({
        latitude: senderDetails.latitude,
        longitude: senderDetails.longitude,
        address: senderDetails.address,
        city: senderDetails.city,
        state: senderDetails.state,
      }),
      resolveCoords({
        latitude: receiverDetails.latitude,
        longitude: receiverDetails.longitude,
        address: receiverDetails.address,
        city: receiverDetails.city,
        state: receiverDetails.state,
      }),
    ])

    if (!pickupGeo.success) {
      return res.status(400).json({ error: `Pickup address: ${pickupGeo.error}` })
    }
    if (!deliveryGeo.success) {
      return res.status(400).json({ error: `Delivery address: ${deliveryGeo.error}` })
    }

    const vehiclesResult = await getKwikVehicles(Number(vehicleSize) || 0)
    if (!vehiclesResult.success) {
      // "Sorry, No Vehicle Found." is Kwik's answer when a size class has no vehicles
      // configured for the account - staging has Bike but no Large, which produced a 502 on
      // 2026-09-22. That is an empty result, not a failure: surface it as "pick another
      // vehicle" rather than an error the vendor can do nothing about.
      if (/no vehicle found/i.test(vehiclesResult.error || '')) {
        return res.status(200).json({
          rates: [],
          addressMatch: summariseMatch(pickupGeo, deliveryGeo),
          notice: 'Kwik has no vehicle of that size available for your account. Try a different vehicle.',
        })
      }
      return res.status(502).json({ error: vehiclesResult.error })
    }
    const vehicles = vehiclesResult.data.filter((v) => !v.is_deleted).slice(0, MAX_VEHICLES_QUOTED)
    if (vehicles.length === 0) {
      return res.status(200).json({ rates: [], addressMatch: summariseMatch(pickupGeo, deliveryGeo) })
    }

    const pickupTime = toKwikTime(pickupDate)
    const pickup = {
      address: senderDetails.address || '',
      name: senderDetails.name || '',
      phone: senderDetails.phone || '',
      email: senderDetails.email || '',
      latitude: pickupGeo.data.latitude,
      longitude: pickupGeo.data.longitude,
    }
    const delivery = {
      address: receiverDetails.address || '',
      name: receiverDetails.name || '',
      phone: receiverDetails.phone || '',
      email: receiverDetails.email || '',
      latitude: deliveryGeo.data.latitude,
      longitude: deliveryGeo.data.longitude,
    }

    // One pricing -> breakdown chain per vehicle, chains in parallel.
    const quotes = await Promise.all(
      vehicles.map(async (vehicle) => {
        const pricing = await calculateKwikPricing({
          pickup,
          delivery,
          vehicleId: vehicle.vehicle_id,
          pickupTime,
          parcelAmount: Number(packageAmount) || 0,
          paymentMethod,
        })
        if (!pricing.success) return { vehicle, error: pricing.error }

        const breakdown = await getKwikBillBreakdown({
          pricing: pricing.data,
          vehicleId: vehicle.vehicle_id,
          parcelAmount: Number(packageAmount) || 0,
          pickupTime,
        })
        // NOT fatal (2026-09-22). /get_bill_breakdown enforces a wallet-balance
        // precondition - "Order Cannot be created as the kwik wallet do not have sufficient
        // balance" - and it accepts no payment_method, so it applies that check even when
        // the booking is meant to be cash-on-delivery or EOMB. Treating it as fatal meant an
        // unfunded account could not see ANY price. The breakdown only adds VAT and surge on
        // top of per_task_cost, so losing it degrades the quote rather than blanking it.
        if (!breakdown.success) {
          return { vehicle, pricing: pricing.data, breakdown: null, breakdownError: breakdown.error }
        }

        return { vehicle, pricing: pricing.data, breakdown: breakdown.data }
      }),
    )

    // Kwik's breakdown exposes several near-synonymous totals (PAYABLE_AMOUNT,
    // NET_PAYABLE_AMOUNT, ORDER_PAYABLE_AMOUNT, ACTUAL_ORDER_PAYABLE_AMOUNT) and the docs
    // never say which one the vendor is actually charged. The whole object is logged on the
    // first real quote so the right field can be confirmed against a genuine response
    // instead of guessed - same approach that settled Topship's KOBO/Naira question.
    const firstOk = quotes.find((q) => q.breakdown)
    if (firstOk) {
      console.log('[kwik-rates] bill breakdown sample:', JSON.stringify(firstOk.breakdown))
    }

    // The vehicle tariffs themselves, logged because staging ships absurd test values -
    // a time_fare of 120/minute produced a ₦72,000 Apapa->Lekki quote on 2026-09-22. The
    // pricing formula was correct; the fare table was fiction. Seeing base/distance/time
    // fares next to the quote is what distinguishes "our bug" from "their test data".
    console.log('[kwik-rates] vehicle tariffs:', JSON.stringify(
      vehicles.map((v) => ({
        id: v.vehicle_id, name: v.name,
        base_fare: v.base_fare, distance_fare: v.distance_fare, time_fare: v.time_fare,
      })),
    ))

    const rates = quotes
      .filter((q) => q.pricing)
      .map((q) => ({
        courier_id: String(q.vehicle.vehicle_id),
        courier_name: prettyVehicleName(q.vehicle.name),
        fee: pickAmount(q.breakdown, q.pricing),
        total_shipping_fee: pickAmount(q.breakdown, q.pricing),
        return_fee: 0,
        service_code: String(q.vehicle.vehicle_id),
        delivery_eta: 'Same-day (Kwik)',
        // True when the wallet precondition blocked the breakdown, so the figure shown is
        // the raw task cost before VAT and surge.
        estimateOnly: !q.breakdown,
      }))
      .filter((r) => r.total_shipping_fee > 0)

    const failures = quotes.filter((q) => q.error)
    if (rates.length === 0 && failures.length > 0) {
      return res.status(502).json({ error: failures[0].error })
    }

    return res.status(200).json({
      rates,
      addressMatch: summariseMatch(pickupGeo, deliveryGeo),
    })
  } catch (err) {
    console.error('[kwik-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/** Kwik's documented date format is YYYY-MM-DD HH:MM:SS. */
function toKwikTime(pickupDate) {
  const base = pickupDate ? new Date(`${pickupDate}T09:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ')
  return base.toISOString().slice(0, 19).replace('T', ' ')
}

function prettyVehicleName(name) {
  const n = String(name || '').trim()
  if (!n) return 'Kwik'
  return `Kwik ${n.charAt(0).toUpperCase()}${n.slice(1)}`
}

function pickAmount(breakdown, pricing) {
  const candidate =
    breakdown?.NET_PAYABLE_AMOUNT ??
    breakdown?.PAYABLE_AMOUNT ??
    breakdown?.AMOUNT_PER_TASK ??
    // Fallback when the breakdown was refused on wallet grounds - the raw per-task cost
    // from /send_payment_for_task, i.e. before VAT and surge.
    pricing?.per_task_cost ??
    0
  return Math.round(Number(candidate) || 0)
}

/**
 * How well each address matched, so the booking modal can warn the vendor when a pin is
 * only approximate - common for informal Nigerian addresses, and exactly when the landmark
 * in the order notes is what will actually find the door.
 *
 * Coordinates are deliberately NOT returned: they are Temporary Mapbox results, which may
 * not be cached or stored (see _lib/geocode.js), and handing them to the browser invites
 * exactly that.
 */
function summariseMatch(pickupGeo, deliveryGeo) {
  return {
    pickup: {
      approximate: !!pickupGeo.data.approximate,
      formattedAddress: pickupGeo.data.formattedAddress || '',
    },
    delivery: {
      approximate: !!deliveryGeo.data.approximate,
      formattedAddress: deliveryGeo.data.formattedAddress || '',
    },
  }
}
