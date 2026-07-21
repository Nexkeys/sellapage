//src/api-handlers/topship-countries.js
// STAGING ONLY — see _lib/topship-booking.js header for the staging/production switch.
import { getTopshipCountries } from './_lib/topship-booking.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await getTopshipCountries()
    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }
    // Topship's /get-countries returns them in no particular order — sort alphabetically
    // so the (now-searchable) country picker is actually easy to scan.
    const sorted = [...result.data].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
    return res.status(200).json({ countries: sorted })
  } catch (err) {
    console.error('[topship-countries] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
