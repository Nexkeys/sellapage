/**
 * Normalises a Nigerian phone number for use in wa.me links.
 * 08099380000      → 2348099380000
 * +2348099380000   → 2348099380000
 * 2348099380000    → 2348099380000
 *
 * @param {string} phone
 * @returns {string}
 */
export const formatWhatsAppNumber = (phone) => {
  // Strip spaces, +, -, (, )
  let clean = String(phone).replace(/[\s\+\-\(\)]/g, '')

  // Replace leading 0 with Nigerian country code
  if (clean.startsWith('0')) {
    clean = '234' + clean.slice(1)
  }

  return clean
}


/**
 * Builds a wa.me link with a pre-filled message.
 * @param {string} phone   - Any supported Nigerian number format
 * @param {string} message - Plain-text message (will be URI-encoded)
 * @returns {string}
 */
export const generateWhatsAppLink = (phone, message) => {
  const formatted = formatWhatsAppNumber(phone)
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}


/**
 * Builds a wa.me link with a pre-filled order message.
 * @param {string} phoneNumber - Seller's WhatsApp number (any Nigerian format)
 * @param {string} productName - Name of the product being ordered
 * @param {number} price       - Price of the product
 */
export const buildOrderURL = (phoneNumber, productName, price) => {
  const message =
    `Hello! I'd like to order:\n\n*${productName}*\nPrice: ₦${Number(price).toLocaleString()}\n\nPlease confirm availability and let me know how to pay. Thank you!`
  return generateWhatsAppLink(phoneNumber, message)
}


/**
 * Builds a wa.me link for a general enquiry.
 * @param {string} phoneNumber - Seller's WhatsApp number (any Nigerian format)
 * @param {string} storeName   - Store business name
 */
export const buildEnquiryURL = (phoneNumber, storeName) => {
  const message = `Hello ${storeName}! I visited your store and have a question. Can you help me?`
  return generateWhatsAppLink(phoneNumber, message)
}