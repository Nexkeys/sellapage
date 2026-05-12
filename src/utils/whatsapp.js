// src/utils/whatsapp.js

/**
 * Generates a WhatsApp deep-link URL from a phone number and message body.
 * All other functions in this file use this internally.
 */
export function generateWhatsAppLink(phoneNumber, message) {
  const cleaned = phoneNumber?.toString().replace(/\D/g, '') || ''
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

/**
 * Builds a WhatsApp URL for a general enquiry (Chat with us button).
 */
export function buildEnquiryURL(phoneNumber, storeName) {
  const message = `Hi! I'd like to enquire about ${storeName}. Please assist me.`
  return generateWhatsAppLink(phoneNumber, message)
}

/**
 * Builds a WhatsApp URL for ordering a single product.
 */
export function buildOrderURL(phoneNumber, productName, price, productId, storeUrl) {
  const lines = [
    `Hi! I'd like to order the following:`,
    ``,
    `Product: ${productName}`,
    `Price: ₦${Number(price).toLocaleString()}`,
  ]
  if (storeUrl && productId) {
    lines.push(`Link: ${storeUrl}?product=${productId}`)
  }
  lines.push(``, `Please confirm availability. Thank you!`)
  return generateWhatsAppLink(phoneNumber, lines.join('\n'))
}

/**
 * Builds a WhatsApp URL for a full cart order (Growth / Pro stores only).
 *
 * @param {string}   phoneNumber      – Store owner's WhatsApp number
 * @param {string}   storeName        – Display name of the store
 * @param {Array}    cartItems        – [{ name, price, quantity }, ...]
 * @param {Object}   customerDetails  – { name, phone, note }
 * @returns {string} WhatsApp deep-link URL
 */
export function buildCartOrderURL(phoneNumber, storeName, cartItems, customerDetails) {
  const itemLines = cartItems.map(item => {
    const lineTotal = Number(item.price) * Number(item.quantity)
    return `- ${item.quantity}x ${item.name} — ₦${lineTotal.toLocaleString()}`
  })

  const orderTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  )

  const lines = [
    `🛒 New Order from ${storeName}`,
    ``,
    `Items:`,
    ...itemLines,
    ``,
    `Order Total: ₦${orderTotal.toLocaleString()}`,
    ``,
    `Customer Details:`,
    `Name: ${customerDetails.name}`,
    `Phone: ${customerDetails.phone}`,
  ]

  if (customerDetails.note && customerDetails.note.trim() !== '') {
    lines.push(`Note: ${customerDetails.note.trim()}`)
  }

  lines.push(``, `Please confirm this order. Thank you!`)

  return generateWhatsAppLink(phoneNumber, lines.join('\n'))
}