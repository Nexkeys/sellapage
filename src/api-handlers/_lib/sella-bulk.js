// src/api-handlers/_lib/sella-bulk.js
// Bulk edits: "increase every price in Shoes by 10%", "hide all out-of-stock
// products", "set stock to 20 for everything in Wigs".
//
// The model only describes the change (which items, which field, what
// operation). The SERVER finds the matching items and computes every new
// value, so a 300-item price rise is arithmetic, not 300 numbers a model typed.
// The vendor then sees each item's old and new value in a review table, can
// untick or adjust any of them, and confirms. Nothing is written before that.

const TABS = { products: 'Products', services: 'Services' }
export const BULK_FIELDS = ['price', 'stock', 'isActive', 'category']
export const BULK_OPS = ['set', 'increase_percent', 'decrease_percent', 'increase_by', 'decrease_by']
export const MAX_BULK_ROWS = 500

const lc = (s) => String(s ?? '').trim().toLowerCase()
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

function roundTo(n, step) {
  const s = Number(step)
  return s > 0 ? Math.round(n / s) * s : Math.round(n)
}

function computeNew(field, op, value, current, rounding) {
  if (field === 'isActive') {
    if (op !== 'set') return { error: 'Visibility can only be set on or off.' }
    const v = value === true || lc(value) === 'true' || lc(value) === 'visible' || lc(value) === 'on'
    return { to: v }
  }
  if (field === 'category') {
    if (op !== 'set') return { error: 'A category can only be set, not increased.' }
    const v = String(value ?? '').trim().slice(0, 80)
    return v ? { to: v } : { error: 'Say which category to move them to.' }
  }
  const cur = Number(current) || 0
  const v = Number(String(value ?? '').replace(/[₦,\s]/g, ''))
  if (!Number.isFinite(v) || v < 0) return { error: 'That amount is not a valid number.' }
  let to
  if (op === 'set') to = v
  else if (op === 'increase_percent' || op === 'decrease_percent') {
    if (v <= 0 || v > 500) return { error: 'The percentage must be between 1 and 500.' }
    to = cur * (op === 'increase_percent' ? 1 + v / 100 : 1 - v / 100)
  } else if (op === 'increase_by') to = cur + v
  else if (op === 'decrease_by') to = cur - v
  else return { error: 'Unknown change.' }
  to = Math.max(field === 'stock' ? Math.floor(to) : roundTo(to, rounding), 0)
  return { to }
}

function matches(doc, filter) {
  if (Array.isArray(filter.ids) && filter.ids.length) return filter.ids.map(String).includes(doc.id)
  if (filter.category && lc(doc.category) !== lc(filter.category)) return false
  if (filter.nameContains && !lc(doc.name).includes(lc(filter.nameContains))) return false
  if (filter.outOfStock === true && !(Number(doc.stock) === 0)) return false
  if (filter.hiddenOnly === true && doc.isActive !== false) return false
  return true
}

/**
 * Builds the preview for a bulk edit. Called before the confirm card, so an
 * impossible request is refused with a reason rather than shown.
 */
export async function proposeBulkUpdate(db, storeId, args = {}) {
  const tab = String(args.tab || 'products')
  if (!TABS[tab]) return { ok: false, reason: 'I can bulk edit products or services.' }
  const field = String(args.field || '')
  const op = String(args.op || 'set')
  if (!BULK_FIELDS.includes(field)) return { ok: false, reason: `I can bulk change ${BULK_FIELDS.join(', ')}.` }
  if (!BULK_OPS.includes(op)) return { ok: false, reason: 'Say whether to set, increase or decrease it.' }
  if (tab === 'services' && field === 'stock') return { ok: false, reason: 'Services do not have stock.' }

  const filter = args.filter || {}
  const hasFilter = (Array.isArray(filter.ids) && filter.ids.length) || filter.category || filter.nameContains ||
    filter.outOfStock === true || filter.hiddenOnly === true
  // Changing EVERY item must be said explicitly, never the result of a filter
  // the model forgot to fill in.
  if (!hasFilter && filter.all !== true) {
    return { ok: false, reason: 'Which items should I change? Name a category, part of the name, or say "all".' }
  }

  const snap = await db.collection('stores').doc(storeId).collection(tab).limit(3000).get()
  const hits = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => matches(d, filter))
  if (!hits.length) return { ok: false, reason: `No ${TABS[tab].toLowerCase()} matched that. Check the category or name.` }

  const rows = []
  for (const d of hits.slice(0, MAX_BULK_ROWS)) {
    const c = computeNew(field, op, args.value, d[field], args.roundTo)
    if (c.error) return { ok: false, reason: c.error }
    const from = field === 'isActive' ? d.isActive !== false : (d[field] ?? '')
    if (String(from) === String(c.to)) continue // already at the target value
    rows.push({ id: d.id, name: String(d.name || 'Untitled').slice(0, 120), from, to: c.to })
  }
  if (!rows.length) return { ok: false, reason: 'Every matching item already has that value, so there is nothing to change.' }

  return {
    ok: true,
    args: {
      tab, field, op, value: args.value, roundTo: Number(args.roundTo) || 0,
      rows,
      overLimit: Math.max(hits.length - MAX_BULK_ROWS, 0),
    },
  }
}

/** Re-validates each row the vendor approved (they may have edited new values). */
function cleanValue(field, v) {
  if (field === 'isActive') return typeof v === 'boolean' ? v : lc(v) === 'true'
  if (field === 'category') { const s = String(v ?? '').trim().slice(0, 80); return s || null }
  const n = Number(String(v ?? '').replace(/[₦,\s]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return field === 'stock' ? Math.floor(n) : Math.round(n * 100) / 100
}

export async function applyBulkUpdate(db, storeId, args = {}) {
  const tab = String(args.tab || '')
  const field = String(args.field || '')
  if (!TABS[tab] || !BULK_FIELDS.includes(field)) return { ok: false, message: 'That bulk change is not supported.' }
  const rows = (Array.isArray(args.rows) ? args.rows : []).slice(0, MAX_BULK_ROWS)
  if (!rows.length) return { ok: false, message: 'No items were selected.' }

  const coll = db.collection('stores').doc(storeId).collection(tab)
  const refs = rows.map((r) => coll.doc(String(r.id || '_')))
  const snaps = await db.getAll(...refs)
  const batch = db.batch()
  let n = 0
  const now = new Date().toISOString()
  snaps.forEach((s, i) => {
    if (!s.exists) return // deleted since the preview, or an id that was never ours
    const v = cleanValue(field, rows[i].to)
    if (v === null) return
    batch.update(s.ref, { [field]: v, updatedAt: now })
    n++
  })
  if (!n) return { ok: false, message: 'None of those items could be updated.' }
  await batch.commit()
  const what = field === 'isActive' ? 'visibility' : field
  return { ok: true, message: `Updated ${what} on ${n} ${n === 1 ? TABS[tab].slice(0, -1).toLowerCase() : TABS[tab].toLowerCase()}.` }
}

export function describeBulk(args = {}) {
  const label = TABS[args.tab] || 'items'
  const n = Array.isArray(args.rows) ? args.rows.length : Number(args.count || 0)
  const noun = n === 1 ? label.slice(0, -1).toLowerCase() : label.toLowerCase()
  const v = args.value
  const how = {
    set: args.field === 'isActive' ? (String(v) === 'true' || v === true ? 'make visible' : 'hide') : `set ${args.field} to ${args.field === 'price' ? naira(v) : v}`,
    increase_percent: `increase ${args.field} by ${v}%`,
    decrease_percent: `decrease ${args.field} by ${v}%`,
    increase_by: `increase ${args.field} by ${args.field === 'price' ? naira(v) : v}`,
    decrease_by: `decrease ${args.field} by ${args.field === 'price' ? naira(v) : v}`,
  }[args.op] || `change ${args.field}`
  const cap = how.charAt(0).toUpperCase() + how.slice(1)
  return `${cap} on ${n} ${noun}${args.roundTo ? `, rounded to the nearest ${naira(args.roundTo)}` : ''}.`
}
