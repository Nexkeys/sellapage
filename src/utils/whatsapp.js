/**
 * Normalises a Nigerian phone number for use in wa.me links.
 * 08099380000      → 2348099380000
 * +2348099380000   → 2348099380000
 * 2348099380000    → 2348099380000
 */
export const formatWhatsAppNumber = (phone) => {
  let clean = String(phone).replace(/[\s\+\-\(\)]/g, '')
  if (clean.startsWith('0')) {
    clean = '234' + clean.slice(1)
  }
  return clean
}

/**
 * Builds a wa.me link with a pre-filled message.
 */
export const generateWhatsAppLink = (phone, message) => {
  const formatted = formatWhatsAppNumber(phone)
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}

/**
 * Builds a wa.me order link with product name, price, ref ID, and store link.
 * @param {string} phoneNumber  - Seller's WhatsApp number (any Nigerian format)
 * @param {string} productName  - Name of the product being ordered
 * @param {number} price        - Price of the product
 * @param {string} [productId]  - Firestore product document ID (optional, for ref + link)
 * @param {string} [storeUrl]   - Full store URL e.g. https://sellapage.com.ng/mystore (optional)
 */
export const buildOrderURL = (phoneNumber, productName, price, productId = null, storeUrl = null) => {
  const ref         = productId ? `SP-${productId.slice(-6).toUpperCase()}` : null
  const productLink = productId && storeUrl ? `${storeUrl}?product=${productId}` : null

  let message = `Hi! I want to order this item:\n\n`
  message    += `*Product:* ${productName}\n`
  message    += `*Price:* ₦${Number(price).toLocaleString()}\n`
  if (ref)         message += `*Ref:* ${ref}\n`
  if (productLink) message += `*Link:* ${productLink}\n`
  message    += `\nPlease confirm availability. Thank you!`

  return generateWhatsAppLink(phoneNumber, message)
}

/**
 * Builds a wa.me link for a general enquiry.
 */
export const buildEnquiryURL = (phoneNumber, storeName) => {
  const message = `Hello ${storeName}! I visited your store and have a question. Can you help me?`
  return generateWhatsAppLink(phoneNumber, message)
}