// src/utils/supplierTerms.js
// A supplier's terms: what a dropshipper agrees to before selling their stock
// (plan decision J4). Shared by the form, the server and, from Phase 3, the
// import dialog, so every screen shows the same wording.
//
// WHY STRUCTURED, NOT JUST A TEXT BOX
// 1. Dropshippers compare suppliers. "Returns: 7 days, customer pays return
//    delivery, ships in 2 days" can be shown as a summary on every product and
//    checked against; a free-text paragraph cannot.
// 2. Nigerian law sets a floor the supplier cannot contract out of. Under the
//    Federal Competition and Consumer Protection Act 2018, s.122, a customer
//    may return defective, unsafe or not-as-described goods for a full refund,
//    and s.129(1)(b) makes terms that try to waive that right unlawful. So the
//    defective-goods clause (FIXED_CLAUSE) is always part of every supplier's
//    terms and cannot be edited out. What a supplier DOES choose is the part
//    the law leaves to them: change-of-mind returns, who pays for those, how
//    fast they dispatch, their warranty, and anything else they want to add.
//
// VERSIONS. Every saved change is a new version, kept for good. A dropshipper
// accepts a specific version; when the supplier changes their terms, that
// dropshipper's copies of the supplier's products go unavailable until they
// accept the new version (Phase 3). That record is what lets Sellapage step in
// between them later: it shows exactly what both sides agreed to, and when.
import { maskContactDetails } from './marketplace.js'

export const TERMS_LIMITS = {
  returnWindowDays: [0, 30],
  defectReportDays: [3, 30],
  dispatchDays: [1, 14],
  warranty: 300,
  extraTerms: 5000,
}

export const RETURN_SHIPPING_PAYERS = ['customer', 'supplier']

export const DEFAULT_TERMS = {
  returnWindowDays: 0,
  changeOfMindShippingPaidBy: 'customer',
  defectReportDays: 7,
  dispatchDays: 2,
  warranty: '',
  extraTerms: '',
}

/**
 * Part of every supplier's terms. Not editable, and it wins over anything the
 * supplier writes, because the law it restates wins over the contract anyway.
 */
export const FIXED_CLAUSE =
  'If an item arrives damaged, defective, unsafe or not as described, the supplier will take it back and give a full refund, ' +
  'or a replacement if the customer prefers, and pays the return delivery. The customer must report it within the reporting ' +
  'period below. This follows the Federal Competition and Consumer Protection Act 2018 (sections 122 and 129), and it applies ' +
  'even where anything else in these terms says otherwise.'

const int = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Math.round(Number(v)) : NaN)

/**
 * Validates and normalises terms from a form or request body.
 * @returns {{ ok: true, terms } | { ok: false, errors: { [field]: message } }}
 */
export function cleanTerms(raw = {}) {
  const errors = {}
  const out = {}

  for (const key of ['returnWindowDays', 'defectReportDays', 'dispatchDays']) {
    const [min, max] = TERMS_LIMITS[key]
    const n = int(raw[key])
    if (!Number.isFinite(n) || n < min || n > max) errors[key] = `Choose between ${min} and ${max} days.`
    else out[key] = n
  }

  const payer = String(raw.changeOfMindShippingPaidBy || '').trim()
  if (out.returnWindowDays > 0) {
    if (!RETURN_SHIPPING_PAYERS.includes(payer)) errors.changeOfMindShippingPaidBy = 'Say who pays for the return delivery.'
    else out.changeOfMindShippingPaidBy = payer
  } else {
    // No change-of-mind returns, so there is nothing to pay for. Stored as
    // null so a summary never says "customer pays" about returns that do not
    // exist.
    out.changeOfMindShippingPaidBy = null
  }

  // Contact details are masked, like chat (plan decision 12): terms are shown
  // to every dropshipper, and a phone number in them is a way off the platform.
  for (const key of ['warranty', 'extraTerms']) {
    const text = String(raw[key] || '').replace(/\r\n/g, '\n').trim()
    if (text.length > TERMS_LIMITS[key]) errors[key] = `Keep this under ${TERMS_LIMITS[key]} characters.`
    else out[key] = maskContactDetails(text)
  }

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, terms: out }
}

/** True when two cleaned terms say the same thing (so saving is a no-op). */
export function sameTerms(a, b) {
  if (!a || !b) return false
  return ['returnWindowDays', 'changeOfMindShippingPaidBy', 'defectReportDays', 'dispatchDays', 'warranty', 'extraTerms']
    .every((k) => (a[k] ?? null) === (b[k] ?? null))
}

/** Short lines for a summary card. Plain English, no legal register. */
export function termsSummary(terms) {
  if (!terms) return []
  const lines = []
  lines.push(`Ships within ${terms.dispatchDays} day${terms.dispatchDays === 1 ? '' : 's'} of the order.`)
  if (terms.returnWindowDays > 0) {
    lines.push(
      `Change-of-mind returns within ${terms.returnWindowDays} day${terms.returnWindowDays === 1 ? '' : 's'} of delivery, ` +
        `return delivery paid by the ${terms.changeOfMindShippingPaidBy}.`,
    )
  } else {
    lines.push('No returns for a change of mind.')
  }
  lines.push(
    `Damaged, defective or wrong items: report within ${terms.defectReportDays} days for a full refund or replacement, return delivery paid by the supplier.`,
  )
  if (terms.warranty) lines.push(`Warranty: ${terms.warranty}`)
  return lines
}
