/**
 * Builds a wa.me link with a pre-filled order message.
 * @param {string} phoneNumber - Seller's WhatsApp number with country code (e.g. 2348012345678)
 * @param {string} productName - Name of the product being ordered
 * @param {number} price - Price of the product
 */
export const buildOrderURL = (phoneNumber, productName, price) => {
  const clean = phoneNumber.replace(/[\s\-\(\)\+]/g, '')
  const text = encodeURIComponent(
    `Hello! I'd like to order:\n\n*${productName}*\nPrice: ₦${Number(price).toLocaleString()}\n\nPlease confirm availability and let me know how to pay. Thank you!`
  )
  return `https://wa.me/${clean}?text=${text}`
}

/**
 * Builds a wa.me link for a general enquiry.
 * @param {string} phoneNumber - Seller's WhatsApp number
 * @param {string} storeName - Store business name
 */
export const buildEnquiryURL = (phoneNumber, storeName) => {
  const clean = phoneNumber.replace(/[\s\-\(\)\+]/g, '')
  const text = encodeURIComponent(
    `Hello ${storeName}! I visited your store and have a question. Can you help me?`
  )
  return `https://wa.me/${clean}?text=${text}`
}