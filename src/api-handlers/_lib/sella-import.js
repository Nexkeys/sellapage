// src/api-handlers/_lib/sella-import.js
// Bulk import from a file: validation and row shaping, shared by the proposal
// (sella-ai.js, before the review table is shown) and the job that writes the
// rows (_lib/sella-jobs.js). Keeping both sides on one function means the rows
// the vendor approved are exactly the rows that get written.

export const MAX_IMPORT_ROWS = 500

/**
 * Where each import can go, and the fields it accepts.
 * `required` fields must be present on every row; the rest are optional.
 */
export const IMPORT_TARGETS = {
  products: {
    label: 'Products', tab: 'products', collection: 'products',
    fields: ['name', 'price', 'description', 'category', 'stock', 'imageUrl'],
    required: ['name', 'price'],
    describable: true,
  },
  services: {
    label: 'Services', tab: 'services', collection: 'services',
    fields: ['name', 'price', 'description', 'category', 'duration', 'imageUrl'],
    required: ['name', 'price'],
    describable: true,
  },
  ledger: {
    label: 'Ledger', tab: 'ledger', collection: 'ledger',
    fields: ['customerName', 'itemName', 'amount', 'date', 'status', 'notes'],
    required: ['customerName', 'itemName', 'amount'],
    describable: false,
  },
}

const MONEY_FIELDS = new Set(['price', 'amount'])

/**
 * "₦5,000", "NGN 5000", "5k", "1.2m", "5,000.50" -> number. Returns null when
 * the text is not a price, so a row with "call for price" is rejected with a
 * reason instead of being imported at ₦0.
 */
export function parseMoney(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null
  let s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  s = s.replace(/₦|ngn|naira|n(?=\s*\d)/g, '').replace(/[,\s]/g, '')
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (!m) return null
  const n = Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function parseStock(v) {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function parseDate(v) {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // 25/09/2026 or 25-09-2026: Nigeria writes day first.
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const clip = (v, n) => String(v ?? '').trim().slice(0, n)

/** Cleans one row for a target. Returns { row } or { reason }. */
export function cleanRow(target, raw) {
  const spec = IMPORT_TARGETS[target]
  const r = raw || {}
  const out = {}

  if (target === 'ledger') {
    out.customerName = clip(r.customerName, 120)
    out.itemName = clip(r.itemName, 200)
    out.amount = parseMoney(r.amount)
    out.date = parseDate(r.date) || new Date().toISOString().slice(0, 10)
    const st = clip(r.status, 20).toLowerCase()
    out.status = st.startsWith('pend') ? 'Pending' : st.startsWith('part') ? 'Partial' : 'Paid'
    out.notes = clip(r.notes, 500)
  } else {
    out.name = clip(r.name, 150)
    out.price = parseMoney(r.price)
    out.description = clip(r.description, 3000)
    out.category = clip(r.category, 80)
    if (target === 'products') out.stock = parseStock(r.stock)
    if (target === 'services') out.duration = clip(r.duration, 60)
    const img = String(r.imageUrl || '').trim()
    out.imageUrl = /^https:\/\/\S+$/i.test(img) && img.length < 1000 ? img : ''
  }

  for (const f of spec.required) {
    if (out[f] === '' || out[f] == null) {
      const what = MONEY_FIELDS.has(f) ? `a valid ${f}` : `a ${f}`
      return { reason: `missing ${what}` }
    }
  }
  return { row: out }
}

/**
 * Maps a parsed spreadsheet to rows using the model's column choice.
 * `columns` is { field: 'Header name' }. The model picks the columns; code
 * copies every row, so nothing is paraphrased, dropped or invented.
 */
export function rowsFromTable(table, columns = {}) {
  const idx = {}
  for (const [field, header] of Object.entries(columns || {})) {
    const i = table.headers.findIndex((h) => h.toLowerCase() === String(header || '').trim().toLowerCase())
    if (i >= 0) idx[field] = i
  }
  return table.rows.map((r) => {
    const o = {}
    for (const [field, i] of Object.entries(idx)) o[field] = r[i]
    return o
  })
}

/** Validates a whole batch. Rejected rows are reported, not silently dropped. */
export function prepareImport(target, rawRows) {
  const spec = IMPORT_TARGETS[target]
  if (!spec) return { ok: false, reason: `I can import into ${Object.keys(IMPORT_TARGETS).join(', ')}. "${target}" is not one of them.` }
  const list = Array.isArray(rawRows) ? rawRows : []
  if (!list.length) return { ok: false, reason: 'I did not find any rows to import in that file.' }

  const rows = []
  const rejected = []
  list.slice(0, MAX_IMPORT_ROWS).forEach((raw, i) => {
    const c = cleanRow(target, raw)
    if (c.row) rows.push(c.row)
    else rejected.push({ line: i + 1, name: clip(raw?.name || raw?.itemName, 60), reason: c.reason })
  })
  if (!rows.length) {
    return { ok: false, reason: `None of the ${list.length} rows could be used (${rejected[0]?.reason || 'missing details'}). Check the file has a name and a price for each item.` }
  }
  return {
    ok: true,
    rows,
    rejected: rejected.slice(0, 50),
    rejectedCount: rejected.length,
    overLimit: Math.max(list.length - MAX_IMPORT_ROWS, 0),
  }
}

export function describeImport(args = {}) {
  const spec = IMPORT_TARGETS[args.target] || { label: args.target }
  const n = Array.isArray(args.rows) ? args.rows.length : Number(args.count || 0)
  const noun = args.target === 'ledger' ? (n === 1 ? 'sale' : 'sales') : args.target === 'services' ? (n === 1 ? 'service' : 'services') : (n === 1 ? 'product' : 'products')
  const needDesc = args.writeDescriptions && spec.describable
    ? (args.rows || []).filter((r) => !r.description).length
    : 0
  return `Add ${n} ${noun} to your ${spec.label}` +
    (needDesc ? `, and write descriptions for the ${needDesc} that have none` : '') + '.'
}
