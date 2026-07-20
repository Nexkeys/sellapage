//src/api-handlers/topship-rates.js
// STAGING ONLY — see _lib/topship-booking.js header for the staging/production switch.
import { getTopshipRates } from './_lib/topship-booking.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { storeId, senderDetails, receiverDetails, weight = 1 } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }
  if (!senderDetails?.city) {
    return res.status(400).json({ error: 'Incomplete sender details — city is required' })
  }
  if (!receiverDetails?.city) {
    return res.status(400).json({ error: 'Incomplete receiver details — city is required' })
  }

  try {
    const result = await getTopshipRates({
      senderCity: senderDetails.city,
      senderCountryCode: senderDetails.countryCode || 'NG',
      receiverCity: receiverDetails.city,
      receiverCountryCode: receiverDetails.countryCode || 'NG',
      weight,
    })

    if (!result.success) {
      return res.status(502).json({ error: result.error })
    }

    const rates = result.data.map((r, index) => ({
      courier_id: r.mode || `topship_rate_${index}`,
      courier_name: r.mode || 'Topship',
      fee: Number(r.cost || 0) / 100,
      total_shipping_fee: Number(r.cost || 0) / 100,
      delivery_eta: r.duration || '',
      provider: 'topship',
      pricing_tier: r.pricingTier || r.mode || 'Budget',
    }))

    return res.status(200).json({ rates })
  } catch (err) {
    console.error('[topship-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
