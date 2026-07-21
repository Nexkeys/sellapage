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

    // NOTE: `pricingTier` (Budget/Express/FedEx/Premium/LastMileBudget) is the enum
    // value Topship's /save-shipment actually requires. `mode` is just a free-text
    // display string from their staging environment — sometimes a friendly name
    // ("Chowdeck Shipping"), sometimes a raw courier UUID. Never send `mode` to the
    // booking call; always book with `pricing_tier`.
    const isUuidLike = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '')

    // Topship rejects SeaExport bookings under 100kg outright ("Sea Export shipments are
    // only supported for shipments above or equal to 100KG" — confirmed via a real staging
    // booking), so don't offer that rate for lighter packages in the first place.
    const weightNum = Number(weight) || 1
    const eligible = result.data.filter(r => r.pricingTier !== 'SeaExport' || weightNum >= 100)

    const rates = eligible.map((r, index) => {
      const pricingTier = r.pricingTier || 'Budget'
      const modeLabel = isUuidLike(r.mode) ? '' : (r.mode || '')
      return {
        courier_id: `topship_${index}_${pricingTier}`,
        courier_name: modeLabel && modeLabel !== pricingTier ? modeLabel : pricingTier,
        fee: Number(r.cost || 0) / 100,
        total_shipping_fee: Number(r.cost || 0) / 100,
        delivery_eta: r.duration || '',
        provider: 'topship',
        pricing_tier: pricingTier,
      }
    })

    return res.status(200).json({ rates })
  } catch (err) {
    console.error('[topship-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
