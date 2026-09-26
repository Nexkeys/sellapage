// src/api-handlers/_lib/data-export.js
// Builds downloadable exports of a store's own data: CSV, Excel and PDF.
// Used by export-data.js, which both the dashboard tabs and Sella call.
//
// The column list per tab is deliberate, not "dump every field": raw documents
// carry internal state (review tokens, status logs, payment references) that
// means nothing to a vendor and should not end up in a spreadsheet they email
// to an accountant.

import { FieldValue } from 'firebase-admin/firestore'

export const MAX_EXPORT_ROWS = 10000

const toMs = (v) => {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v._seconds === 'number') return v._seconds * 1000
  if (v instanceof Date) return v.getTime()
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? 0 : t
}
const day = (v) => {
  const ms = toMs(v)
  return ms ? new Date(ms + 3600000).toISOString().slice(0, 10) : ''
}
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? '' : Number(v))
const txt = (v) => (v == null ? '' : String(v))

function orderItems(o) {
  if (Array.isArray(o.cartItems) && o.cartItems.length) {
    return o.cartItems.map((it) => `${it.name || it.productName || 'Item'} x${Number(it.quantity || 1)}`).join('; ')
  }
  return typeof o.items === 'string' ? o.items : ''
}
function address(a) {
  if (!a || typeof a !== 'object') return txt(a)
  return [a.street || a.streetAddress, a.address, a.lga, a.city, a.state].filter(Boolean).join(', ')
}

/**
 * Each tab: where it lives, which field dates it (for from/to filters), and
 * its columns as [header, (doc) => value, type]. type 'money' and 'number'
 * become real numeric cells in Excel so the vendor can sum them.
 */
export const EXPORTS = {
  products: {
    label: 'Products', sub: 'products', dateField: 'createdAt',
    columns: [
      ['Name', (d) => txt(d.name)],
      ['Price (NGN)', (d) => num(d.price), 'money'],
      ['Stock', (d) => num(d.stock), 'number'],
      ['Category', (d) => txt(d.category)],
      ['Visible', (d) => (d.isActive === false ? 'No' : 'Yes')],
      ['Description', (d) => txt(d.description)],
      ['Image', (d) => txt(d.imageUrl || (Array.isArray(d.imageUrls) ? d.imageUrls[0] : ''))],
      ['Added', (d) => day(d.createdAt)],
    ],
  },
  services: {
    label: 'Services', sub: 'services', dateField: 'createdAt',
    columns: [
      ['Name', (d) => txt(d.name)],
      ['Price (NGN)', (d) => num(d.price), 'money'],
      ['Duration', (d) => txt(d.duration)],
      ['Category', (d) => txt(d.category)],
      ['Visible', (d) => (d.isActive === false ? 'No' : 'Yes')],
      ['Description', (d) => txt(d.description)],
      ['Added', (d) => day(d.createdAt)],
    ],
  },
  orders: {
    label: 'Orders', sub: 'orders', dateField: 'createdAt',
    columns: [
      ['Date', (d) => day(d.createdAt)],
      ['Order ID', (d) => txt(d.id)],
      ['Customer', (d) => txt(d.customerName)],
      ['Phone', (d) => txt(d.customerPhone)],
      ['Email', (d) => txt(d.customerEmail)],
      ['Items', (d) => orderItems(d)],
      ['Total (NGN)', (d) => num(d.grandTotal ?? d.total), 'money'],
      ['Status', (d) => txt(d.status || 'pending')],
      ['Payment', (d) => txt(d.paymentStatus)],
      ['Delivery address', (d) => address(d.deliveryAddress)],
    ],
  },
  bookings: {
    label: 'Bookings', sub: 'bookings', dateField: 'createdAt',
    columns: [
      ['Booked on', (d) => day(d.createdAt)],
      ['Service', (d) => txt(d.serviceName)],
      ['Customer', (d) => txt(d.customerName)],
      ['Phone', (d) => txt(d.customerPhone)],
      ['Email', (d) => txt(d.customerEmail)],
      ['Date', (d) => txt(d.bookingDate)],
      ['Time', (d) => txt(d.bookingTime)],
      ['Total (NGN)', (d) => num(d.grandTotal ?? d.price), 'money'],
      ['Status', (d) => txt(d.status || 'pending')],
    ],
  },
  customers: {
    label: 'Customers', sub: 'customers', dateField: 'lastOrderDate',
    columns: [
      ['Name', (d) => txt(d.name)],
      ['Phone', (d) => txt(d.phone)],
      ['Email', (d) => txt(d.email)],
      ['Orders', (d) => num(d.orderCount), 'number'],
      ['Total spent (NGN)', (d) => num(d.totalSpent), 'money'],
      ['Last order', (d) => day(d.lastOrderDate)],
    ],
  },
  ledger: {
    label: 'Ledger', sub: 'ledger', dateField: 'date',
    columns: [
      ['Date', (d) => txt(d.date)],
      ['Customer', (d) => txt(d.customerName)],
      ['Item', (d) => txt(d.itemName)],
      ['Amount (NGN)', (d) => num(d.amount), 'money'],
      ['Status', (d) => txt(d.status)],
      ['Notes', (d) => txt(d.notes)],
    ],
  },
  discounts: {
    label: 'Discounts', sub: 'discounts', dateField: 'createdAt',
    columns: [
      ['Code', (d) => txt(d.code)],
      ['Type', (d) => txt(d.type)],
      ['Value', (d) => num(d.value), 'number'],
      ['Used', (d) => num(d.usageCount), 'number'],
      ['Limit', (d) => num(d.usageLimit), 'number'],
      ['Active', (d) => (d.isActive === false || d.active === false ? 'No' : 'Yes')],
      ['Created', (d) => day(d.createdAt)],
    ],
  },
  leads: {
    label: 'Leads', top: 'leads', field: 'storeId', dateField: 'createdAt',
    columns: [
      ['Date', (d) => day(d.createdAt)],
      ['Name', (d) => txt(d.name)],
      ['Phone', (d) => txt(d.phone || d.whatsapp)],
      ['Email', (d) => txt(d.email)],
      ['Interest', (d) => txt(d.interest || d.message)],
    ],
  },
}

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf']

/** "2026-08-01" as the start or end of that day in Lagos. */
function boundMs(s, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0) - 3600000
}

export async function loadExportRows(db, storeId, tab, { from, to } = {}) {
  const spec = EXPORTS[tab]
  const q = spec.top
    ? db.collection(spec.top).where(spec.field, '==', storeId)
    : db.collection('stores').doc(storeId).collection(spec.sub)
  const snap = await q.limit(MAX_EXPORT_ROWS).get()
  const lo = boundMs(from, false)
  const hi = boundMs(to, true)
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (lo != null || hi != null) {
    docs = docs.filter((d) => {
      const ms = spec.dateField === 'date' ? boundMs(String(d.date || ''), false) : toMs(d[spec.dateField])
      if (!ms) return false
      return (lo == null || ms >= lo) && (hi == null || ms <= hi)
    })
  }
  // Newest first reads naturally for every tab except a ledger, which an
  // accountant expects in date order.
  const key = (d) => (spec.dateField === 'date' ? boundMs(String(d.date || ''), false) || 0 : toMs(d[spec.dateField]))
  docs.sort((a, b) => (tab === 'ledger' ? key(a) - key(b) : key(b) - key(a)))
  return docs.map((d) => spec.columns.map(([, get]) => get(d)))
}

// ---------------------------------------------------------------- CSV
function toCsv(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    // A leading = + - @ turns a cell into a formula in Excel. Customer-typed
    // names and notes end up here, so neutralise them (CSV injection).
    const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  // BOM so Excel opens it as UTF-8 and the naira sign survives.
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}

// ---------------------------------------------------------------- XLSX
async function toXlsx(title, headers, types, rows) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sellapage'
  const ws = wb.addWorksheet(title.slice(0, 31))
  ws.addRow(headers)
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  for (const r of rows) {
    ws.addRow(r.map((v, i) => {
      if (types[i] === 'money' || types[i] === 'number') return v === '' ? null : Number(v)
      const s = String(v ?? '')
      // Same formula-injection guard as the CSV path.
      return /^[=+\-@]/.test(s) ? `'${s}` : s
    }))
  }
  types.forEach((t, i) => {
    const col = ws.getColumn(i + 1)
    if (t === 'money') col.numFmt = '#,##0.00'
    const longest = Math.max(headers[i].length, ...rows.slice(0, 200).map((r) => String(r[i] ?? '').length))
    col.width = Math.min(Math.max(longest + 2, 10), 60)
  })
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// ---------------------------------------------------------------- PDF
// The standard PDF fonts only cover Latin-1, so the naira sign and any emoji a
// customer typed would crash the writer. They are replaced, not dropped.
const pdfSafe = (v) => String(v ?? '')
  .replace(/₦/g, 'NGN ')
  .replace(/[–—]/g, '-')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')

async function toPdf(title, subtitle, headers, types, rows) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const W = 842, H = 595, M = 32 // A4 landscape
  const size = 8, lh = 12
  const usable = W - M * 2

  // Column widths proportional to content, capped so one long description
  // cannot squeeze every other column to nothing.
  const weights = headers.map((h, i) => Math.min(Math.max(h.length, ...rows.slice(0, 100).map((r) => String(r[i] ?? '').length)), 40) + 2)
  const total = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map((w) => (w / total) * usable)

  const fit = (s, w, f) => {
    let t = pdfSafe(s)
    if (f.widthOfTextAtSize(t, size) <= w - 4) return t
    while (t.length > 1 && f.widthOfTextAtSize(t + '...', size) > w - 4) t = t.slice(0, -1)
    return t + '...'
  }
  const fmt = (v, t) => (t === 'money' && v !== '' ? Number(v).toLocaleString('en-NG', { maximumFractionDigits: 2 }) : v)

  let page, y
  const newPage = () => {
    page = doc.addPage([W, H])
    y = H - M
    page.drawText(pdfSafe(title), { x: M, y, size: 14, font: bold })
    y -= 16
    page.drawText(pdfSafe(subtitle), { x: M, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) })
    y -= 18
    let x = M
    page.drawRectangle({ x: M, y: y - 3, width: usable, height: lh + 2, color: rgb(0.93, 0.96, 0.93) })
    headers.forEach((h, i) => { page.drawText(fit(h, widths[i], bold), { x: x + 2, y, size, font: bold }); x += widths[i] })
    y -= lh + 4
  }
  newPage()
  for (const r of rows) {
    if (y < M + lh) newPage()
    let x = M
    r.forEach((v, i) => { page.drawText(fit(fmt(v, types[i]), widths[i], font), { x: x + 2, y, size, font }); x += widths[i] })
    y -= lh
  }
  // Totals row for money columns: the first thing anyone does with an export.
  if (types.includes('money') && rows.length) {
    if (y < M + lh * 2) newPage()
    y -= 4
    let x = M
    headers.forEach((_, i) => {
      if (types[i] === 'money') {
        const sum = rows.reduce((s, r) => s + (Number(r[i]) || 0), 0)
        page.drawText(fit(`Total ${sum.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`, widths[i], bold), { x: x + 2, y, size, font: bold })
      }
      x += widths[i]
    })
  }
  return Buffer.from(await doc.save())
}

/**
 * @returns {Promise<{buffer: Buffer, filename: string, contentType: string, rows: number}>}
 */
export async function buildExport(db, storeId, { tab, format, from, to, storeName }) {
  const spec = EXPORTS[tab]
  const headers = spec.columns.map(([h]) => h)
  const types = spec.columns.map(([, , t]) => t || 'text')
  const rows = await loadExportRows(db, storeId, tab, { from, to })
  const range = from || to ? `${from || 'start'} to ${to || 'today'}` : 'all time'
  const stamp = new Date(Date.now() + 3600000).toISOString().slice(0, 10)
  const base = `${spec.label.toLowerCase()}_${from || to ? `${from || 'start'}_${to || stamp}` : stamp}`

  if (format === 'xlsx') {
    return { buffer: await toXlsx(spec.label, headers, types, rows), filename: `${base}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', rows: rows.length }
  }
  if (format === 'pdf') {
    const subtitle = `${storeName || 'Your store'}  |  ${range}  |  ${rows.length} rows  |  exported ${stamp}`
    return { buffer: await toPdf(`${spec.label}`, subtitle, headers, types, rows), filename: `${base}.pdf`, contentType: 'application/pdf', rows: rows.length }
  }
  return { buffer: Buffer.from(toCsv(headers, rows), 'utf8'), filename: `${base}.csv`, contentType: 'text/csv; charset=utf-8', rows: rows.length }
}

/** Exports carry customer personal data out of the platform, so each one is logged. */
export async function logExport(db, { uid, storeId, tab, format, rows, via }) {
  try {
    await db.collection('auditLogs').add({
      uid, action: 'data_export', purpose: tab, result: 'applied',
      meta: { storeId, tab, format, rows, via },
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('[data-export] audit failed:', err.message)
  }
}
