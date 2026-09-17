// src/utils/productOptions.js
//
// Product options and extras, defined once for the browser and the server.
//
// TWO KINDS OF GROUP, one array
//   single ("Choose one")  - Size: 5 litres / 2.5 litres. One pick. Optional price.
//   multi  ("Extras")      - Chicken 15pcs +15,000, Shaki +5,000. Tick as many as you like.
//
// BACKWARDS COMPATIBLE BY DESIGN. This reads the existing `variations` array on
// a product. Groups saved before extras existed have no `type` (read as
// "single") and options with no `price` (read as free) and no `stock` (read as
// unlimited), so every product already in the database keeps working untouched
// and nothing needs migrating.
//
// WHY THE SAME FILE RUNS ON BOTH SIDES
// The storefront shows a running total; checkout-initialize.js recomputes that
// total from Firestore and ignores whatever the browser claimed. If those two
// ever disagreed, a customer would see one price and be charged another. One
// pure module, imported by both, is what stops that.
//
// STOCK IS NOT DECREMENTED. Product stock on this platform is a vendor-managed
// number that hides the buy button at 0; nothing counts it down automatically.
// Extra stock behaves identically, so the two cannot drift into different rules.

export const GROUP_SINGLE = 'single'
export const GROUP_MULTI = 'multi'

export const MAX_GROUPS = 6
export const MAX_OPTIONS_PER_GROUP = 20
export const LIMITS = { groupName: 40, optionLabel: 40 }

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** A price is naira, never negative, blank means free. */
const readPrice = (v) => {
  if (v === '' || v === null || v === undefined) return 0
  const n = num(v)
  return n === null || n < 0 ? 0 : Math.round(n)
}

/** Stock: null means "not tracked", a number means "this many left". */
const readStock = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = num(v)
  return n === null || n < 0 ? null : Math.floor(n)
}

/**
 * The option groups of a product, cleaned and normalised.
 *
 * Never throws and never returns junk: a malformed group is dropped rather than
 * allowed to reach pricing. `product.variations` is the stored field.
 */
export function normaliseGroups(product) {
  const raw = Array.isArray(product?.variations) ? product.variations : []
  const out = []

  for (const g of raw.slice(0, MAX_GROUPS)) {
    const groupName = String(g?.groupName ?? '').trim().slice(0, LIMITS.groupName)
    if (!groupName) continue

    const type = g?.type === GROUP_MULTI ? GROUP_MULTI : GROUP_SINGLE
    const displayType = typeof g?.displayType === 'string' ? g.displayType : 'pill'

    const options = (Array.isArray(g?.options) ? g.options : [])
      .slice(0, MAX_OPTIONS_PER_GROUP)
      .map((o) => {
        const label = String(o?.label ?? '').trim().slice(0, LIMITS.optionLabel)
        if (!label) return null
        return {
          label,
          // `value` carries the colour for swatch groups; it has always
          // defaulted to the label elsewhere, so keep that behaviour.
          value: String(o?.value ?? label).slice(0, LIMITS.optionLabel),
          price: readPrice(o?.price),
          stock: readStock(o?.stock),
        }
      })
      .filter(Boolean)

    // A free-text group legitimately has no options. Everything else without an
    // option is an empty shell the vendor never finished.
    if (!options.length && !(type === GROUP_SINGLE && displayType === 'text-field')) continue

    out.push({ groupName, type, displayType, options })
  }

  return out
}

export const hasOptionGroups = (product) => normaliseGroups(product).length > 0

export const isSoldOut = (option) => option?.stock !== null && Number(option?.stock) <= 0

/** Extras are the only groups a customer may tick several of. */
export const splitGroups = (groups) => ({
  single: groups.filter((g) => g.type === GROUP_SINGLE),
  extras: groups.filter((g) => g.type === GROUP_MULTI),
})

const asArray = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v])

/**
 * Prices one selection against the product's own groups.
 *
 * `selection` is { [groupName]: string } for a single group and
 * { [groupName]: string[] } for extras.
 *
 * Returns { chosen, extrasTotal, errors }. `errors` is never a thrown
 * exception: the caller decides whether a bad selection is a 400 to the
 * customer (server) or a disabled button (browser).
 */
export function priceSelection(groups, selection = {}) {
  const chosen = []
  const errors = []
  let extrasTotal = 0

  const byName = new Map(groups.map((g) => [g.groupName, g]))

  for (const [groupName, rawValue] of Object.entries(selection || {})) {
    const group = byName.get(groupName)
    if (!group) {
      errors.push({ code: 'unknown_group', groupName })
      continue
    }

    // Free text: the customer types it, it costs nothing, and there is no list
    // to validate it against. Length capped so it cannot be used as storage.
    if (group.type === GROUP_SINGLE && group.displayType === 'text-field') {
      const text = String(rawValue ?? '').trim().slice(0, 200)
      if (text) chosen.push({ groupName, label: text, price: 0, free: true })
      continue
    }

    const values = asArray(rawValue).map((v) => String(v ?? '').trim()).filter(Boolean)
    if (!values.length) continue

    if (group.type === GROUP_SINGLE && values.length > 1) {
      errors.push({ code: 'too_many', groupName })
      continue
    }

    const seen = new Set()
    for (const value of values) {
      if (seen.has(value)) continue
      seen.add(value)

      const option = group.options.find((o) => o.label === value)
      if (!option) {
        errors.push({ code: 'unknown_option', groupName, label: value })
        continue
      }
      if (isSoldOut(option)) {
        errors.push({ code: 'sold_out', groupName, label: option.label })
        continue
      }

      chosen.push({ groupName, label: option.label, price: option.price })
      extrasTotal += option.price
    }
  }

  return { chosen, extrasTotal, errors }
}

/** Unit price for one of this product with these options chosen. */
export function unitPriceFor(product, groups, selection) {
  const base = Number(product?.price)
  const safeBase = Number.isFinite(base) && base >= 0 ? base : 0
  const { extrasTotal, chosen, errors } = priceSelection(groups, selection)
  return { unitPrice: safeBase + extrasTotal, basePrice: safeBase, extrasTotal, chosen, errors }
}

/** "Size: 5 litres · Chicken 15pcs, Shaki" - one line for carts, emails, receipts. */
export function selectionLabel(chosen = []) {
  if (!chosen.length) return ''
  const byGroup = new Map()
  for (const c of chosen) {
    if (!byGroup.has(c.groupName)) byGroup.set(c.groupName, [])
    byGroup.get(c.groupName).push(c.label)
  }
  return [...byGroup.entries()].map(([g, labels]) => `${g}: ${labels.join(', ')}`).join(' · ')
}

/**
 * Identity of a cart line.
 *
 * The same product with different extras is a different line, so the id has to
 * include the selection. Without this, egusi with chicken and egusi with goat
 * meat shared one id and changing the quantity of either changed both.
 */
export function cartLineId(productId, selection = {}) {
  const parts = Object.keys(selection || {})
    .sort()
    .map((k) => `${k}=${asArray(selection[k]).map(String).sort().join('+')}`)
    .filter((p) => !p.endsWith('='))
  return parts.length ? `${productId}::${parts.join('&')}` : String(productId)
}

/** Every single-pick group with a real list must be answered before adding to cart. */
export function missingRequired(groups, selection = {}) {
  return groups
    .filter((g) => g.type === GROUP_SINGLE && g.displayType !== 'text-field' && g.options.length)
    .filter((g) => !String(selection?.[g.groupName] ?? '').trim())
    .map((g) => g.groupName)
}
