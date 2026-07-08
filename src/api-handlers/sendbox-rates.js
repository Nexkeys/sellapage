const SENDBOX_BASE = 'https://live.sendbox.co/shipping'
const SENDBOX_TOKEN = process.env.SENDBOX_ACCESS_TOKEN

function normalizePhone(phone) {
  if (!phone) return '+2348000000000'
  return phone.replace(/^0/, '+234').replace(/^\+?234/, '+234')
}

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' }
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
    packageAmount = 5000,
    pickupDate,
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
    const senderName = splitName(senderDetails.name)
    const receiverName = splitName(receiverDetails.name)
    const today = pickupDate || new Date().toISOString().split('T')[0]

    const quoteRes = await fetch(`${SENDBOX_BASE}/shipment_delivery_quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: SENDBOX_TOKEN,
      },
      body: JSON.stringify({
        origin: {
          first_name: senderName.first,
          last_name: senderName.last,
          street: senderDetails.address || '',
          state: senderDetails.state,
          city: senderDetails.city || '',
          country: 'NG',
          phone: normalizePhone(senderDetails.phone),
          email: senderDetails.email || '',
        },
        destination: {
          first_name: receiverName.first,
          last_name: receiverName.last,
          street: receiverDetails.address || '',
          state: receiverDetails.state,
          city: receiverDetails.city || '',
          country: 'NG',
          phone: normalizePhone(receiverDetails.phone),
          email: receiverDetails.email || '',
        },
        weight: Number(weight) || 1,
        incoming_option: 'pickup',
        region: 'NG',
        service_type: 'local',
        package_type: 'general',
        total_value: Number(packageAmount) || 5000,
        currency: 'NGN',
        channel_code: 'api',
        pickup_date: today,
        items: [
          {
            name: 'Package',
            quantity: 1,
            value: Number(packageAmount) || 5000,
            weight: Number(weight) || 1,
          }
        ],
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
        courier_id: r.key || '',
        courier_name: r.name || r.description || 'Courier',
        fee: Number(r.fee || 0),
        total_shipping_fee: Number(r.fee || 0),
        return_fee: Number(r.return_fee || 0),
        service_code: r.service_code || String(r.key || ''),
        delivery_eta: r.delivery_eta_string || r.sla_description || '',
      })),
    })
  } catch (err) {
    console.error('[sendbox-rates] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
