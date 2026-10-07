// src/receipts/receiptModel.js
//
// Every receipt Sellapage itself produces, in one shape, so one design draws
// them all (ReceiptPdf.jsx for the download, ReceiptCard.jsx on screen):
//   order     a customer's order from a storefront (checkout, vendor's Orders)
//   booking   a customer's booking (checkout, vendor's Bookings)
//   plan      a store's plan payment to Sellapage (Billing history)
//   credits   a store's Sella AI credit pack (Sella billing history)
// Not the vendor's own receipt generator (components/receipts), which keeps
// its templates.
//
// Money stays in naira here (plan amounts arrive in kobo and are converted).

export const SITE = 'https://sellapage.com.ng'

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function toMs(v) {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  if (typeof v === 'object') {
    const s = v._seconds ?? v.seconds
    if (s != null) return s * 1000
  }
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

export function ngn(n) {
  const v = num(n)
  const whole = Number.isInteger(Math.round(v * 100) / 100)
  return `${v < 0 ? '-' : ''}NGN ${Math.abs(v).toLocaleString('en-NG', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
}

export function fmtDay(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
}
export function fmtTime(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })
}

const initials = (name) => String(name || 'S').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'S'

function payState(doc, fallbackPaid) {
  const st = String(doc.status || '').toLowerCase()
  if (st === 'refunded') return 'REFUNDED'
  if (st === 'cancelled') return 'CANCELLED'
  const p = String(doc.paymentStatus || '').toLowerCase()
  if (p === 'paid' || p === 'success') return 'PAID'
  if (!p && fallbackPaid) return 'PAID'
  return 'NOT PAID'
}

function storeIssuer(store) {
  const name = store?.businessName || store?.storeName || 'Store'
  return { name, logoUrl: store?.logoUrl || '', initials: initials(name), isSellapage: false }
}
const SELLAPAGE = { name: 'Sellapage', logoUrl: '/receipt/sp-mark.png', initials: 'SP', isSellapage: true }

function contactOf(store) {
  const phone = String(store?.whatsappNumber || '').replace(/[^\d+]/g, '')
  return phone ? { label: 'Seller contact', channel: 'WhatsApp', value: phone.replace(/^0/, '234') } : null
}
const trackUrl = (store, id) => (store?.storeName && id ? `${SITE}/${store.storeName}/track?id=${encodeURIComponent(id)}` : `${SITE}/${store?.storeName || ''}`)

/** A storefront order. Same fields the checkout and Orders tab already pass. */
export function orderReceipt(order, store) {
  const items = (order.cartItems || order.items || []).map((it) => ({
    name: it.name || 'Item',
    note: it.optionsLabel || it.variationLabel || '',
    qty: num(it.quantity) || 1,
    amount: num(it.price) * (num(it.quantity) || 1),
  }))
  const discount = num(order.discountAmount || order.discount)
  const breakdown = [
    { label: `Items (${items.reduce((n, i) => n + i.qty, 0)})`, amount: items.reduce((n, i) => n + i.amount, 0) },
    ...(discount > 0 ? [{ label: `Discount${order.promoCode ? ` (${order.promoCode})` : ''}`, amount: -discount }] : []),
    ...(num(order.deliveryFee) > 0 ? [{ label: 'Delivery fee', amount: num(order.deliveryFee) }] : []),
    { label: 'Processing fee', amount: num(order.processingFee) },
  ]
  const at = toMs(order.createdAt) || Date.now()
  const address = order.deliveryAddress || order.address || ''
  const issuer = storeIssuer(store)
  return {
    kind: 'order',
    title: 'Order receipt',
    issuer,
    status: payState(order, !!(order.reference || order.paystackReference)),
    date: at,
    receiptId: order.id || '',
    receiptIdNote: order.id ? '' : 'Sent to your email',
    paymentRef: order.reference || order.paystackReference || '',
    party: { label: 'Customer', name: order.customerName || 'Customer', sub: [order.customerEmail, order.customerPhone].filter(Boolean).join(' · ') },
    detail: {
      label: 'Order',
      title: items.length === 1 ? items[0].name : `${items.length} items`,
      lines: [
        { icon: 'calendar', text: `Placed ${fmtDay(at)} · ${fmtTime(at)}` },
        ...(address ? [{ icon: 'pin', text: String(typeof address === 'string' ? address : [address.street, address.city, address.state].filter(Boolean).join(', ')) }] : []),
      ],
      items,
    },
    breakdown,
    total: num(order.grandTotal ?? order.total),
    method: { name: 'Paystack', note: 'Secure payment' },
    qr: { url: trackUrl(store, order.id), title: 'Track this order', text: 'Scan to see where your order is.' },
    contact: contactOf(store),
    note: store?.tagline || store?.seo?.tagline || '',
    thanks: `Thank you for shopping with ${issuer.name}`,
    filename: `receipt_${order.id || order.reference || 'order'}.pdf`,
  }
}

/** A storefront booking. */
export function bookingReceipt(booking, store) {
  const at = toMs(booking.createdAt) || Date.now()
  const issuer = storeIssuer(store)
  const when = [booking.bookingDate && fmtDay(toMs(`${booking.bookingDate}T12:00:00`) || booking.bookingDate), booking.bookingTime].filter(Boolean).join(' · ')
  return {
    kind: 'booking',
    title: 'Booking receipt',
    issuer,
    status: payState(booking, !!(booking.reference || booking.paystackReference)),
    date: at,
    receiptId: booking.id || '',
    receiptIdNote: booking.id ? '' : 'Sent to your email',
    paymentRef: booking.paystackReference || booking.reference || '',
    party: { label: 'Customer', name: booking.customerName || 'Customer', sub: [booking.customerEmail, booking.customerPhone].filter(Boolean).join(' · ') },
    detail: {
      label: 'Booking',
      title: booking.serviceName || 'Service',
      lines: [
        ...(when ? [{ icon: 'calendar', text: `Scheduled for ${when}` }] : []),
        ...(booking.locationPref ? [{ icon: 'pin', text: String(booking.locationPref).replace(/^\w/, (c) => c.toUpperCase()) }] : []),
      ],
      items: [],
    },
    breakdown: [
      { label: 'Service fee', amount: num(booking.servicePrice) },
      { label: 'Processing fee', amount: num(booking.processingFee) },
    ],
    total: num(booking.grandTotal),
    method: { name: 'Paystack', note: 'Secure payment' },
    qr: { url: trackUrl(store, booking.id), title: 'Booking details', text: 'Scan or view details of this booking.' },
    contact: contactOf(store),
    note: store?.tagline || store?.seo?.tagline || '',
    thanks: `Thank you for booking with ${issuer.name}`,
    filename: `receipt_${booking.paystackReference || booking.id || 'booking'}.pdf`,
  }
}

const PERIOD = { monthly: 'Monthly', quarterly: '3 months', biannual: '6 months', annual: 'Yearly' }
const cap = (s) => String(s || '').replace(/^\w/, (c) => c.toUpperCase())

/** A store's plan payment to Sellapage (stores/{id}/subscriptions). */
export function planReceipt(row, store) {
  const at = toMs(row.paidAt)
  const amount = num(row.amount) / 100
  return {
    kind: 'plan',
    title: 'Payment receipt',
    issuer: SELLAPAGE,
    status: 'PAID',
    date: at,
    receiptId: row.id || '',
    paymentRef: row.paystackRef || '',
    party: { label: 'Billed to', name: store?.businessName || 'Your store', sub: store?.email || '' },
    detail: {
      label: 'Plan',
      title: `${cap(row.plan)} plan, ${(PERIOD[row.billingPeriod] || cap(row.billingPeriod) || 'Monthly').toLowerCase()}`,
      lines: [{ icon: 'calendar', text: `Covers ${fmtDay(toMs(row.planStartDate))} to ${fmtDay(toMs(row.planEndDate))}` }],
      items: [],
    },
    breakdown: [{ label: `${cap(row.plan)} plan (${PERIOD[row.billingPeriod] || 'Monthly'})`, amount }],
    total: amount,
    method: { name: 'Paystack', note: 'Secure payment' },
    qr: { url: `${SITE}/dashboard`, title: 'Your billing', text: 'Scan to open billing in your dashboard.' },
    contact: null,
    note: '',
    thanks: 'Thank you for growing with Sellapage',
    filename: `sellapage-receipt-${row.paystackRef || row.id || 'plan'}.pdf`,
  }
}

/** A Sella AI credit pack (sellaCreditPurchases, as listed to the vendor). */
export function creditsReceipt(p, store) {
  const at = toMs(p.paidAt) || toMs(p.createdAt)
  return {
    kind: 'credits',
    title: 'Sella credits receipt',
    issuer: SELLAPAGE,
    status: p.status === 'paid' ? 'PAID' : String(p.status || '').toUpperCase() || 'PAID',
    date: at,
    receiptId: p.receiptNumber || p.reference || '',
    paymentRef: p.reference || '',
    party: { label: 'Billed to', name: p.businessName || store?.businessName || 'Your store', sub: p.email || store?.email || '' },
    detail: {
      label: 'Sella AI credits',
      title: `${num(p.credits).toLocaleString('en-NG')} credits, ${p.packName || 'credit'} pack`,
      lines: p.expiresAt ? [{ icon: 'calendar', text: `Valid until ${fmtDay(toMs(p.expiresAt))}` }] : [],
      items: [],
    },
    breakdown: [
      { label: `${num(p.credits).toLocaleString('en-NG')} Sella AI credits`, amount: num(p.price) },
      { label: 'VAT (7.5%)', amount: num(p.vat) },
      { label: 'Payment processing (Paystack)', amount: num(p.processing) },
    ],
    total: num(p.total) || num(p.price) + num(p.vat) + num(p.processing),
    method: { name: p.cardLast4 ? `${cap(p.cardBrand || 'Card')} ending ${p.cardLast4}` : 'Paystack', note: 'Secure payment' },
    qr: { url: `${SITE}/dashboard`, title: 'Your Sella billing', text: 'Credits are used after your monthly included credits.' },
    contact: null,
    note: '',
    thanks: 'Thank you for growing with Sellapage',
    filename: `sella-credits-receipt-${p.receiptNumber || p.reference || 'credits'}.pdf`,
  }
}

/**
 * A statement: every payment in a history, for "download my history".
 * rows: [{ date (ms), description, ref, amount }]
 */
export function statement({ title, party, rows, filename }) {
  const sorted = [...rows].sort((a, b) => b.date - a.date)
  return {
    kind: 'statement',
    title,
    issuer: SELLAPAGE,
    party,
    rows: sorted,
    total: sorted.reduce((n, r) => n + num(r.amount), 0),
    from: sorted.at(-1)?.date || 0,
    to: sorted[0]?.date || 0,
    date: Date.now(),
    thanks: 'Thank you for growing with Sellapage',
    filename,
  }
}
