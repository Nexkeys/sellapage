//src/api-handlers/_lib/geocode.js
// Address -> coordinates, via the Mapbox Geocoding API v6. Server-side only.
//
// WHY THIS EXISTS (2026-09-22): Kwik prices by distance and time, so a quote needs latitude
// and longitude for BOTH ends - at quote time, not just at booking. Kwik exposes no
// geocoding endpoint of its own (zero matches for geocode/autocomplete/address lookup
// across all 2,609 lines of Docs/Kwik-DOCS.txt); their web panel solves it with a map pin,
// which is a UI, not an API we can call. Sendbox and Topship never call this file.
//
// WHY MAPBOX AND NOT GOOGLE. Nex's call: Google requires a credit card on file before the
// Geocoding API will serve a single request, while Mapbox's free tier (~100k requests/month)
// needs no card at all. Mapbox's Nigerian coverage is weaker than Google's on informal
// addresses, which is an accepted trade - the landmark captured in the order notes is what
// actually finds a door here, not the pin.
//
// !! NOTHING GEOCODED HERE MAY BE STORED !! Mapbox splits results into Temporary and
// Permanent (Docs/MAPBOX-API-DOCS.md, "Storing Geocoding Results"):
//   - Temporary (the default, and what the free tier gives): results "are not allowed to
//     be cached".
//   - Permanent: may be cached and stored indefinitely, but "requires that you have a valid
//     credit card on file" - precisely what switching to Mapbox was meant to avoid.
// So this runs as Temporary, holds no cache, and callers must NOT persist the coordinates
// to Firestore. Addresses are re-geocoded on each quote and each booking instead. At roughly
// 4 lookups per completed booking that is ~25,000 bookings/month inside the free tier, so
// the cost of not caching is nil. If persisting coordinates ever becomes worth it, that is a
// deliberate decision requiring `permanent=true` AND a card on Mapbox - not a code tweak.
//
// KEY: MAPBOX_API_DEFAULT_KEY. Used only server-side, so do NOT add a URL restriction to the
// token in the Mapbox console - URL restrictions match on a browser's Origin/Referer header,
// which a server-to-server call does not send, and the token would reject every request.

const MAPBOX_FORWARD_URL = 'https://api.mapbox.com/search/geocode/v6/forward'
const GEOCODE_TIMEOUT_MS = 10000

/**
 * Nigeria's bounding box. `country=ng` is already a hard filter, but this also catches the
 * classic GeoJSON trap: Mapbox returns geometry coordinates as [longitude, latitude], the
 * reverse of how coordinates are written everywhere else. A swap puts the pin in the Gulf of
 * Guinea, and nothing downstream errors - Kwik would simply quote a delivery into the sea.
 */
const NG_BOUNDS = { minLat: 4, maxLat: 14.7, minLng: 2.6, maxLng: 14.8 }

function inNigeria(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= NG_BOUNDS.minLat && lat <= NG_BOUNDS.maxLat &&
    lng >= NG_BOUNDS.minLng && lng <= NG_BOUNDS.maxLng
  )
}

/** Builds one address string out of the pieces we store, skipping empties. */
export function composeAddress({ address, city, state, country = 'Nigeria' } = {}) {
  return [address, city, state, country]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Mapbox constrains `q`: at most 20 words/numbers, at most 256 characters, and it must not
 * contain a semicolon (raw or encoded). A vendor pasting a long address with a semicolon
 * would otherwise get an opaque 4xx, so the query is trimmed to fit rather than rejected.
 */
function sanitiseQuery(raw) {
  const noSemicolons = String(raw || '').replace(/;/g, ' ')
  const words = noSemicolons.trim().split(/\s+/).filter(Boolean).slice(0, 20)
  return words.join(' ').slice(0, 256)
}

/**
 * Coordinate accuracy values Mapbox reports for address results, in descending precision:
 * rooftop, parcel, point, interpolated, intersection, approximate, street.
 *
 * Anything at or below `interpolated` means Mapbox placed the pin by estimating along a
 * street rather than knowing the building - common for Nigerian addresses, and exactly when
 * the rider needs the landmark from the order notes.
 */
const VAGUE_ACCURACY = new Set(['interpolated', 'intersection', 'approximate', 'street'])

/**
 * Geocodes a Nigerian address.
 *
 * Returns { success, data: { latitude, longitude, formattedAddress, accuracy, featureType,
 * approximate } }.
 */
export async function geocodeAddress(rawAddress) {
  const query = sanitiseQuery(rawAddress)
  if (!query) return { success: false, error: 'No address supplied to look up.' }

  const token = process.env.MAPBOX_API_DEFAULT_KEY
  if (!token) {
    return {
      success: false,
      error: 'Address lookup is not configured. MAPBOX_API_DEFAULT_KEY is missing.',
    }
  }

  const params = new URLSearchParams({
    q: query,
    access_token: token,
    // ISO code, which Mapbox treats as a hard filter rather than a bias.
    country: 'ng',
    limit: '1',
    // Defaults to TRUE, which returns prefix matches ("India" also matching "Indiana").
    // That behaviour exists for type-ahead; for a one-off server lookup it invites a
    // confidently wrong pin, so it is turned off.
    autocomplete: 'false',
    // Temporary geocoding - see the storage note in this file's header. Do not flip this
    // to true without a card on the Mapbox account.
    permanent: 'false',
    types: 'address,street,neighborhood,locality,place,district',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS)
  let payload
  let httpStatus = 0
  try {
    const res = await fetch(`${MAPBOX_FORWARD_URL}?${params.toString()}`, { signal: controller.signal })
    httpStatus = res.status
    payload = await res.json()
  } catch (err) {
    console.error('[geocode] Mapbox request failed:', err?.name === 'AbortError' ? 'timeout' : err)
    return { success: false, error: 'Address lookup timed out. Please try again.' }
  } finally {
    clearTimeout(timer)
  }

  if (httpStatus === 401 || httpStatus === 403) {
    // Most often a token with a URL restriction on it - see this file's header.
    console.error('[geocode] Mapbox rejected the token:', httpStatus, payload?.message || '')
    return { success: false, error: 'Address lookup is temporarily unavailable. Please try again shortly.' }
  }
  if (httpStatus === 429) {
    console.error('[geocode] Mapbox rate limit hit')
    return { success: false, error: 'Address lookup is busy right now. Please try again in a moment.' }
  }
  if (httpStatus >= 400) {
    console.error('[geocode] Mapbox error', httpStatus, JSON.stringify(payload?.message || payload))
    return { success: false, error: 'Could not look up that address. Please check it and try again.' }
  }

  const feature = Array.isArray(payload?.features) ? payload.features[0] : null
  if (!feature) {
    return { success: false, error: `No location found for "${query}". Try adding the city and state.` }
  }

  const props = feature.properties || {}
  // v6 gives coordinates as a named object here, which avoids the [lng, lat] ordering trap
  // present in feature.geometry.coordinates. The bounds check below catches it regardless.
  const lat = Number(props.coordinates?.latitude)
  const lng = Number(props.coordinates?.longitude)

  if (!inNigeria(lat, lng)) {
    console.error(`[geocode] result outside Nigeria for "${query}": ${lat},${lng}`)
    return { success: false, error: `"${query}" did not resolve to a location in Nigeria. Please check the address.` }
  }

  const accuracy = String(props.coordinates?.accuracy || '')
  const featureType = String(props.feature_type || '')

  return {
    success: true,
    data: {
      latitude: lat,
      longitude: lng,
      formattedAddress: props.full_address || props.name || query,
      accuracy,
      featureType,
      // True when Mapbox matched a street or area rather than a building.
      approximate: featureType !== 'address' || VAGUE_ACCURACY.has(accuracy) || !accuracy,
    },
  }
}

/**
 * Uses coordinates the caller already holds, and geocodes only when they're absent.
 *
 * The passed-in pair is for coordinates a HUMAN supplied (a vendor typing or pinning their
 * pickup point) - not for replaying a stored Mapbox result, which the Temporary terms
 * forbid. See this file's header.
 */
export async function resolveCoords({ latitude, longitude, address, city, state }) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (inNigeria(lat, lng)) {
    return {
      success: true,
      data: { latitude: lat, longitude: lng, formattedAddress: '', accuracy: 'manual', featureType: 'manual', approximate: false },
    }
  }
  return geocodeAddress(composeAddress({ address, city, state }))
}
