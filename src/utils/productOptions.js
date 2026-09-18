// src/utils/productOptions.js
//
// Product options and extras, defined once for the browser and the server.
//
// TWO KINDS OF GROUP, one array
//   single ("Choose one")  - Size: 5 litres / 2.5 litres. One pick. Optional price.
//   multi  ("Extras")      - Chicken 15pcs +15,000, Shaki +5,000. Tick as many as
//                            you like, AND as many OF EACH as you like.
//
// QUANTITY PER EXTRA
// A customer ordering two portions of chicken should not have to add the soup
// twice. Each extra therefore carries its own count, capped by that extra's
// stock when the vendor set one, and capped only by MAX_EXTRA_QTY when they did
// not (blank stock means "I am not counting these").
//
// BACKWARDS COMPATIBLE BY DESIGN. This reads the existing `variations` array on
// a product. Groups saved before extras existed have no `type` (read as
// "single") and options with no `price` (read as free) and no `stock` (read as
// unlimited). Selections saved before quantities existed are plain arrays of
// labels, read as one of each. Nothing needs migrating.
//
// WHY THE SAME FILE RUNS ON BOTH SIDES
// The storefront shows a running total; checkout-initialize.js recomputes that
// total from Firestore and ignores whatever the browser claimed. If those two
// ever disagreed, a customer would see one price and be charged another. One
// pure module, imported by both, is what stops that.
//
// STOCK COUNTS DOWN ON PAID ORDERS (since 2026-09-18). Product stock and option
// or extra stock are both decremented when Paystack confirms payment, by
// src/api-handlers/_lib/stock.js, never at checkout start, so an abandoned
// payment never eats stock. Blank stock still means "not tracked" and is never
// touched. Extra stock follows the same rule as product stock, so the two
// cannot drift into different rules.

export const GROUP_SINGLE = 'single'
export const GROUP_MULTI = 'multi'

export const MAX_GROUPS = 6
export const MAX_OPTIONS_PER_GROUP = 20
export const LIMITS = { groupName: 40, optionLabel: 40 }

// The ceiling when a vendor is not counting stock. High enough that no real
// order hits it, low enough that a tampered request cannot ask for 10,000
// portions of chicken and blow up the total.
export const MAX_EXTRA_QTY = 99

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

/** How many of one extra a customer may take: their stock, or the flat ceiling. */
export const maxQtyFor = (option) =>
  option?.stock === null || option?.stock === undefined
    ? MAX_EXTRA_QTY
    : Math.max(0, Math.min(Number(option.stock), MAX_EXTRA_QTY))

/** Extras are the only groups a customer may tick several of. */
export const splitGroups = (groups) => ({
  single: groups.filter((g) => g.type === GROUP_SINGLE),
  extras: groups.filter((g) => g.type === GROUP_MULTI),
})

const asArray = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v])

/**
 * One group's selection, read into a list of { label, qty }.
 *
 * Accepts all three shapes so nothing in flight breaks:
 *   { Extras: { 'Chicken 15pcs': 2 } }   the current shape
 *   { Extras: ['Chicken 15pcs'] }        saved before quantities existed
 *   { Extras: [{ label, qty }] }         a list that already carries counts
 */
export function readEntries(rawValue) {
  const out = []

  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    for (const [label, qty] of Object.entries(rawValue)) {
      const name = String(label ?? '').trim()
      if (name) out.push({ label: name, qty: num(qty) ?? 1 })
    }
    return out
  }

  for (const item of asArray(rawValue)) {
    if (item && typeof item === 'object') {
      const name = String(item.label ?? '').trim()
      if (name) out.push({ label: name, qty: num(item.qty) ?? 1 })
    } else {
      const name = String(item ?? '').trim()
      if (name) out.push({ label: name, qty: 1 })
    }
  }
  return out
}

/** How many of one extra are currently chosen. 0 when it is not chosen. */
export const qtyOf = (selection, groupName, label) => {
  const entry = readEntries(selection?.[groupName]).find((e) => e.label === label)
  return entry ? Math.max(0, Math.floor(entry.qty)) : 0
}

/**
 * Prices one selection against the product's own groups.
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
      if (text) chosen.push({ groupName, label: text, price: 0, qty: 1, free: true })
      continue
    }

    const entries = readEntries(rawValue).filter((e) => e.qty > 0)
    if (!entries.length) continue

    if (group.type === GROUP_SINGLE && entries.length > 1) {
      errors.push({ code: 'too_many', groupName })
      continue
    }

    const seen = new Set()
    for (const entry of entries) {
      if (seen.has(entry.label)) continue
      seen.add(entry.label)

      const option = group.options.find((o) => o.label === entry.label)
      if (!option) {
        errors.push({ code: 'unknown_option', groupName, label: entry.label })
        continue
      }
      if (isSoldOut(option)) {
        errors.push({ code: 'sold_out', groupName, label: option.label })
        continue
      }

      // A single pick is always one. Only extras carry a count.
      const wanted = group.type === GROUP_SINGLE ? 1 : Math.floor(entry.qty)
      const ceiling = maxQtyFor(option)

      if (!Number.isInteger(wanted) || wanted < 1) {
        errors.push({ code: 'bad_quantity', groupName, label: option.label })
        continue
      }
      if (wanted > ceiling) {
        errors.push({
          code: option.stock === null ? 'too_many_of_one' : 'not_enough_stock',
          groupName,
          label: option.label,
          available: ceiling,
        })
        continue
      }

      chosen.push({ groupName, label: option.label, price: option.price, qty: wanted })
      extrasTotal += option.price * wanted
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

/** "Size: 5 litres · Add protein: Chicken 15pcs x2, Shaki" - one line everywhere. */
export function selectionLabel(chosen = []) {
  if (!chosen.length) return ''
  const byGroup = new Map()
  for (const c of chosen) {
    if (!byGroup.has(c.groupName)) byGroup.set(c.groupName, [])
    const qty = Math.max(1, Math.floor(Number(c.qty) || 1))
    byGroup.get(c.groupName).push(qty > 1 ? `${c.label} x${qty}` : c.label)
  }
  return [...byGroup.entries()].map(([g, labels]) => `${g}: ${labels.join(', ')}`).join(' · ')
}

/**
 * Identity of a cart line.
 *
 * The same product with different extras is a different line, so the id has to
 * include the selection. Without this, egusi with chicken and egusi with goat
 * meat shared one id and changing the quantity of either changed both. The
 * COUNT is part of the identity too: one chicken and two chickens are different
 * things to cook.
 */
export function cartLineId(productId, selection = {}) {
  const parts = Object.keys(selection || {})
    .sort()
    .map((groupName) => {
      const entries = readEntries(selection[groupName])
        .filter((e) => e.qty > 0)
        .map((e) => (e.qty > 1 ? `${e.label}*${Math.floor(e.qty)}` : e.label))
        .sort()
      return entries.length ? `${groupName}=${entries.join('+')}` : ''
    })
    .filter(Boolean)
  return parts.length ? `${productId}::${parts.join('&')}` : String(productId)
}

/** Every single-pick group with a real list must be answered before adding to cart. */
export function missingRequired(groups, selection = {}) {
  return groups
    .filter((g) => g.type === GROUP_SINGLE && g.displayType !== 'text-field' && g.options.length)
    .filter((g) => !String(selection?.[g.groupName] ?? '').trim())
    .map((g) => g.groupName)
}
