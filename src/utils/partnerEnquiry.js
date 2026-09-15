// src/utils/partnerEnquiry.js
//
// The Investors & Partners enquiry, defined once.
//
// Imported by the public page (src/pages/PartnersPage.jsx), the public API
// (src/api-handlers/partner-enquiry.js) and the admin tab and API. Pure on
// purpose: no Firebase, no import.meta.env, so the same file runs in the
// browser and on the server. The browser uses validateEnquiry for instant
// feedback; the server runs the exact same function and is the one that counts.

export const INTEREST_OPTIONS = [
  { id: 'investor', label: 'Investor' },
  { id: 'strategic', label: 'Strategic partner' },
  { id: 'partner', label: 'Distribution partner' },
  { id: 'cofounder', label: 'Co-founder' },
]

export const INVESTOR_TYPES = [
  { id: 'angel', label: 'Angel investor' },
  { id: 'vc', label: 'VC fund' },
  { id: 'family-office', label: 'Family office' },
  { id: 'corporate', label: 'Corporate or strategic investor' },
  { id: 'accelerator', label: 'Accelerator or programme' },
  { id: 'other', label: 'Other' },
]

// A typical cheque size, asked as a range and optional. It helps the founder
// prioritise replies; it is not a commitment and is never shown publicly.
export const TICKET_SIZES = [
  { id: 'under-10k', label: 'Under $10,000' },
  { id: '10k-50k', label: '$10,000 to $50,000' },
  { id: '50k-250k', label: '$50,000 to $250,000' },
  { id: '250k-plus', label: 'Over $250,000' },
  { id: 'undisclosed', label: 'Prefer not to say' },
]

export const SOURCES = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'referral', label: 'Someone referred me' },
  { id: 'search', label: 'Google or another search engine' },
  { id: 'event', label: 'An event' },
  { id: 'other', label: 'Other' },
]

export const ENQUIRY_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'in_talks', label: 'In talks' },
  { id: 'closed', label: 'Closed' },
  { id: 'not_a_fit', label: 'Not a fit' },
]

// Stored word for word with every enquiry, with the time it was given. Under
// the NDPA consent has to be specific and provable, so if this wording ever
// changes, the records keep the version each person actually agreed to.
export const CONSENT_TEXT =
  'I agree to Sellapage storing these details to respond to my enquiry, as described in the Privacy Policy.'

export const LIMITS = {
  name: 120,
  email: 160,
  phone: 20,
  organisation: 160,
  link: 300,
  message: 2000,
  messageMin: 20,
}

const idsOf = (list) => list.map((o) => o.id)

export const labelFor = (list, id) => list.find((o) => o.id === id)?.label || id || ''

/**
 * Accepts "linkedin.com/in/x" as well as a full URL. Returns '' for blank,
 * null for something that is not a web link.
 */
export function normaliseLink(raw) {
  const v = String(raw || '').trim()
  if (!v) return ''
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Cleans and checks an enquiry.
 *
 * Returns { value, errors }. `value` is what gets stored: trimmed, length
 * capped, unknown options dropped, investor-only fields cleared for anyone who
 * is not an investor. `errors` maps a field name to a message a person can act
 * on; empty means valid.
 */
export function validateEnquiry(input = {}) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max)

  const value = {
    interest: s(input.interest, 20),
    fullName: s(input.fullName, LIMITS.name),
    email: s(input.email, LIMITS.email).toLowerCase(),
    phone: s(input.phone, LIMITS.phone),
    organisation: s(input.organisation, LIMITS.organisation),
    investorType: s(input.investorType, 30),
    ticketSize: s(input.ticketSize, 30),
    link: s(input.link, LIMITS.link),
    source: s(input.source, 30),
    message: String(input.message ?? '').trim().slice(0, LIMITS.message),
    consent: input.consent === true,
  }

  const errors = {}

  if (!idsOf(INTEREST_OPTIONS).includes(value.interest)) {
    errors.interest = 'Choose what you are interested in.'
  }
  if (value.fullName.length < 2) {
    errors.fullName = 'Enter your full name.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (value.phone) {
    const digits = value.phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number, or leave it blank.'
    }
  }

  if (value.interest === 'investor') {
    if (!idsOf(INVESTOR_TYPES).includes(value.investorType)) {
      errors.investorType = 'Choose the type of investor you are.'
    }
    if (value.ticketSize && !idsOf(TICKET_SIZES).includes(value.ticketSize)) {
      value.ticketSize = ''
    }
  } else {
    value.investorType = ''
    value.ticketSize = ''
  }

  if (value.source && !idsOf(SOURCES).includes(value.source)) value.source = ''

  if (value.link) {
    const link = normaliseLink(value.link)
    if (link === null) errors.link = 'Enter a valid link, for example your LinkedIn profile.'
    else value.link = link
  }

  if (value.message.length < LIMITS.messageMin) {
    errors.message = `Tell us a little more, at least ${LIMITS.messageMin} characters.`
  }
  if (!value.consent) {
    errors.consent = 'Please agree so we can store your details and reply.'
  }

  return { value, errors }
}
