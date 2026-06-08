// src/utils/whatsapp.js

const sanitizeWhatsAppNumber = (num) => {
  if (!num) return ''
  const cleaned = num.toString().replace(/\D/g, '')
  if (cleaned.startsWith('0')) return `234${cleaned.substring(1)}`
  if (cleaned.length === 10 && !cleaned.startsWith('234')) return `234${cleaned}`
  return cleaned
}

export function generateWhatsAppLink(phoneNumber, message) {
  const cleaned = sanitizeWhatsAppNumber(phoneNumber)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function buildEnquiryURL(phoneNumber, storeName) {
  const message = `Hi! I'd like to enquire about ${storeName}. Please assist me.`
  return generateWhatsAppLink(phoneNumber, message)
}

export function buildOrderURL(phoneNumber, productName, price, productId, storeUrl, type = 'physical') {
  const isService = type === 'service'
  const lines = [
    isService ? `Hi! I'd like to book this service:` : `Hi! I'd like to order the following:`,
    '',
    `${isService ? 'Service' : 'Product'}: ${productName}`,
    `Price: ₦${Number(price).toLocaleString()}`,
  ]

  if (storeUrl && productId) {
    lines.push(`Link: ${storeUrl}?product=${productId}`)
  }

  lines.push(
    '',
    isService
      ? 'Please confirm your available booking times. Thank you!'
      : 'Please confirm availability. Thank you!'
  )

  return generateWhatsAppLink(phoneNumber, lines.join('\n'))
}

export function buildCartOrderURL(phoneNumber, storeName, cartItems, customerDetails) {
  const itemLines = cartItems.map(item => {
    const lineTotal = Number(item.price) * Number(item.quantity)
    const label = item.type === 'service' ? 'service' : 'item'
    return `- ${item.quantity}x ${item.name} (${label}) - ₦${lineTotal.toLocaleString()}`
  })

  const orderTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  )

  const lines = [
    `New order from ${storeName}`,
    '',
    'Items:',
    ...itemLines,
    '',
    `Order total: ₦${orderTotal.toLocaleString()}`,
    '',
    'Customer details:',
    `Name: ${customerDetails.name}`,
    `Phone: ${customerDetails.phone}`,
  ]

  if (customerDetails.note && customerDetails.note.trim() !== '') {
    lines.push(`Note: ${customerDetails.note.trim()}`)
  }

  lines.push('', 'Please confirm this order. Thank you!')

  return generateWhatsAppLink(phoneNumber, lines.join('\n'))
}
