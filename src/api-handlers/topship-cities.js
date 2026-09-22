//src/api-handlers/topship-cities.js
// LIVE - see _lib/topship-booking.js header for the staging/production switch.
//
// Serves Topship's own list of recognised Nigerian cities, grouped so that each city
// carries the suburbs Topship files under it.
//
// WHY (2026-09-22): /get-shipment-rate matches on cityName only, and an unrecognised city
// returns 200 with an empty array - no error anywhere. Proven on one route: "Apapa" quoted
// Dellyman at NGN 4,145, "Olodi-Apapa" quoted nothing. Olodi-Apapa is a suburb of Apapa.
//
// Grouping by city with its suburbs attached is the point: the pickers search suburbs too,
// so a customer who types "Olodi" is shown "Apapa" and selects the value Topship's rate
// engine actually understands. The customer never has to know the distinction exists.
//
// DELIBERATELY UNAUTHENTICATED, matching topship-countries.js. The storefront checkout is
// used by customers who are not signed in and never will be, so requiring a token here
// would defeat the purpose. It exposes nothing sensitive - a public list of Nigerian city
// names - and the Topship API key stays server-side.
import { getTopshipCities } from './_lib/topship-booking.js'

// Topship's city list is reference data that effectively never changes, so it is cached in
// module scope for the lifetime of the warm serverless instance. A cold start refetches.
// This keeps the storefront checkout from making a Topship round trip per shopper.
let CACHE = null
let CACHE_AT = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const countryCode = String(req.query?.countryCode || req.body?.countryCode || 'NG').toUpperCase()

  try {
    if (countryCode === 'NG' && CACHE && Date.now() - CACHE_AT < CACHE_TTL_MS) {
      return res.status(200).json({ cities: CACHE, cached: true })
    }

    const result = await getTopshipCities(countryCode)
    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    // Collapse [{ cityName, suburbName, postcode }, ...] into one entry per city, carrying
    // its suburbs. Topship repeats the same cityName once per suburb, so the raw list is
    // long and full of duplicates - unusable as a dropdown without this.
    const byCity = new Map()
    for (const row of result.data) {
      const name = String(row?.cityName || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!byCity.has(key)) {
        byCity.set(key, { name, suburbs: [], postcode: String(row?.postcode || '').trim() })
      }
      const suburb = String(row?.suburbName || '').trim()
      // A suburb identical to its city name adds nothing to search and clutters the label.
      if (suburb && suburb.toLowerCase() !== key && !byCity.get(key).suburbs.includes(suburb)) {
        byCity.get(key).suburbs.push(suburb)
      }
    }

    const cities = [...byCity.values()].sort((a, b) => a.name.localeCompare(b.name))
    for (const c of cities) c.suburbs.sort((a, b) => a.localeCompare(b))

    if (countryCode === 'NG') {
      CACHE = cities
      CACHE_AT = Date.now()
    }

    return res.status(200).json({ cities })
  } catch (err) {
    console.error('[topship-cities] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
