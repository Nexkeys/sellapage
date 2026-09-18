// src/utils/phone.js
// Nigerian mobile numbers, shared by the browser and the API handlers so the
// signup form, Settings, the storefront badge and the server all agree on what
// "the same number" means.

/**
 * Canonical form: 234 + 10 digits, mobile prefixes only (070x, 080x, 081x,
 * 090x, 091x). Anything else returns null.
 *
 * Deliberately strict. Every SMS costs money, and an unauthenticated endpoint
 * that texts any international number is the classic SMS-pumping target: a
 * script sends codes to premium-rate numbers abroad and drains the wallet.
 */
export function normaliseNgMobile(input) {
  let d = String(input || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00234')) d = d.slice(2)
  if (d.startsWith('234')) {
    // already international
  } else if (d.startsWith('0') && d.length === 11) {
    d = '234' + d.slice(1)
  } else if (d.length === 10) {
    d = '234' + d
  }
  return /^234[789][01]\d{8}$/.test(d) ? d : null
}

/** 2348012345678 -> 08012345678 */
export function toLocalNgPhone(normalised) {
  const d = normaliseNgMobile(normalised)
  return d ? '0' + d.slice(3) : ''
}

export function maskNgPhone(input) {
  const d = String(input || '').replace(/\D/g, '')
  if (d.length < 4) return ''
  return `••• ••• ${d.slice(-4)}`
}

/**
 * True only while the number customers see on the storefront IS the number
 * that was verified by SMS. Changing the WhatsApp number in Settings turns the
 * badge off until the new one is verified, so the claim is never stale.
 */
export function isPhoneBadgeEarned(store) {
  if (store?.phoneVerified !== true || !store?.verifiedPhone) return false
  return normaliseNgMobile(store.whatsappNumber) === store.verifiedPhone
}
