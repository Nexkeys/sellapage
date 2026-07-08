//src/api-handlers/_lib/sendbox-booking.js
// Shared helper for creating Sendbox shipments
// Used by both sendbox-create-shipment.js and paystack-webhook.js safety net

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

/**
 * Create a shipment on Sendbox
 * @param {Object} params
 * @param {Object} params.senderDetails - { name, phone, email, address, city, state }
 * @param {Object} params.receiverDetails - { name, phone, email, address, city, state }
 * @param {number} params.weight - package weight in kg
 * @param {string} params.courierId - Sendbox rate key (from rate quote)
 * @param {string} params.pickupDate - ISO date string
 * @param {number} params.totalValue - order total in NGN
 * @param {string} params.packageType - 'general' or 'food'
 * @param {string} params.callbackUrl - webhook URL for tracking updates
 * @returns {Object} { success, data, error }
 */
export async function createSendboxShipment({
  senderDetails,
  receiverDetails,
  weight = 1,
  courierId,
  pickupDate,
  totalValue = 5000,
  packageType = 'general',
  callbackUrl,
}) {
  const senderName = splitName(senderDetails.name)
  const receiverName = splitName(receiverDetails.name)
  const today = pickupDate || new Date().toISOString().split('T')[0]
  const isFood = packageType === 'food'

  const body = {
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
    dimension: {
      length: 0,
      width: 0,
      height: 0,
    },
    courier_id: courierId,
    pickup_date: today,
    incoming_option: isFood ? 'drop_off' : 'pickup',
    region: 'NG',
    service_type: 'local',
    package_type: isFood ? 'food' : 'general',
    total_value: Number(totalValue) || 5000,
    currency: 'NGN',
    channel_code: 'api',
    service_code: 'standard',
    items: [
      {
        name: 'Package',
        quantity: 1,
        value: Number(totalValue) || 5000,
        weight: Number(weight) || 1,
      }
    ],
  }

  if (callbackUrl) {
    body.callback_url = callbackUrl
  }

  const res = await fetch(`${SENDBOX_BASE}/shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: SENDBOX_TOKEN,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[sendbox-booking] Create shipment error:', data)
    return {
      success: false,
      error: data?.description || data?.message || 'Failed to create shipment on Sendbox',
      data,
    }
  }

  return { success: true, data }
}
