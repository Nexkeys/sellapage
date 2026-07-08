//src/api-handlers/sendbox-rates.js/
const SENDBOX_BASE = 'https://live.sendbox.co/shipping'
const SENDBOX_TOKEN = process.env.SENDBOX_ACCESS_TOKEN

const STATE_CODES = {
  'Abia': 'ABI', 'Adamawa': 'ADA', 'Akwa Ibom': 'AKW', 'Anambra': 'ANA',
  'Bauchi': 'BAU', 'Bayelsa': 'BAY', 'Benue': 'BEN', 'Borno': 'BOR',
  'Cross River': 'CRO', 'Delta': 'DEL', 'Ebonyi': 'EBO', 'Edo': 'EDO',
  'Ekiti': 'EKI', 'Enugu': 'ENU', 'FCT': 'ABU', 'Abuja': 'ABU',
  'Gombe': 'GOM', 'Imo': 'IMO', 'Jigawa': 'JIG', 'Kaduna': 'KAD',
  'Kano': 'KAN', 'Katsina': 'KAT', 'Kebbi': 'KEB', 'Kogi': 'KOG',
  'Kwara': 'KWA', 'Lagos': 'LOS', 'Nasarawa': 'NAS', 'Niger': 'NIG',
  'Ogun': 'OGU', 'Ondo': 'OND', 'Osun': 'OSU', 'Oyo': 'OYO',
  'Plateau': 'PLT', 'Rivers': 'RIV', 'Sokoto': 'SOK', 'Taraba': 'TAR',
  'Yobe': 'YOB', 'Zamfara': 'ZAM',
}

function getStateCode(stateName) {
  if (!stateName) return 'LOS'
  const normalized = stateName.trim()
  return STATE_CODES[normalized] || normalized.substring(0, 3).toUpperCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    storeId,
    senderDetails,
    receiverDetails,
    weight = 1,
  } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }
  if (!senderDetails?.state) {
    return res.status(400).json({ error: 'Incomplete sender details — state is required' })
  }
  if (!receiverDetails?.state) {
    return res.status(400).json({ error: 'Incomplete receiver details — state is required' })
  }

  try {
    const originStateCode = getStateCode(senderDetails.state)
    const destinationStateCode = getStateCode(receiverDetails.state)

    const quoteRes = await fetch(`${SENDBOX_BASE}/shipment_delivery_quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: SENDBOX_TOKEN,
      },
      body: JSON.stringify({
        origin_country: 'Nigeria',
        origin_country_code: 'NG',
        origin_state: senderDetails.state,
        origin_state_code: originStateCode,
        origin_city: senderDetails.city || '',
        origin_phone: senderDetails.phone
          ? senderDetails.phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
          : '+2348000000000',
        destination_country: 'Nigeria',
        destination_country_code: 'NG',
        destination_state: receiverDetails.state,
        destination_state_code: destinationStateCode,
        destination_city: receiverDetails.city || '',
        destination_phone: receiverDetails.phone
          ? receiverDetails.phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
          : '+2348000000000',
        weight: Number(weight) || 1,
      }),
    })

    const quoteData = await quoteRes.json()

    if (!quoteRes.ok) {
      console.error('[sendbox-rates] quote error:', quoteData)
      return res.status(quoteRes.status).json({
        error: quoteData?.description || quoteData?.message || 'Failed to fetch delivery rates',
      })
    }

    const rates = Array.isArray(quoteData?.rates) ? quoteData.rates : []

    return res.status(200).json({
      rates: rates.map((r) => ({
        courier_id: r.courier_id,
        courier_name: r.name || r.courier?.name || 'Courier',
        fee: Number(r.fee || 0),
        total_shipping_fee: Number(r.fee || 0),
        return_fee: Number(r.return_fee || 0),
        service_code: String(r.courier_id),
        delivery_eta: '',
      })),
    })
  } catch (err) {
    console.error('[sendbox-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
