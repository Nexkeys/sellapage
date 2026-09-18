// src/api-handlers/_lib/digests.js
//
// The pure half of the scheduled notifications: Lagos calendar maths, period
// boundaries, figure tallying, and the wording of every scheduled message.
// No Firestore in here, so every rule can be tested without a database.
// digest-cron.js does the reading and sending.
//
// TIMEZONE. Everything is Africa/Lagos (WAT), which is UTC+1 with no daylight
// saving, so a fixed offset is exact rather than an approximation. It is the
// same rule src/utils/analytics.js uses to key analyticsDaily documents, which
// matters: a digest that summed a UTC day would disagree with the Analytics tab
// for the hour between 23:00 and midnight.
//
// WORDING. No em or en dashes anywhere, per the house rule for anything a
// vendor reads.

const WAT_OFFSET_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD for the Lagos calendar day containing `ms`. */
export function watDayKey(ms = Date.now()) {
  return new Date(ms + WAT_OFFSET_MS).toISOString().slice(0, 10)
}

/** Epoch ms of Lagos midnight at the start of a YYYY-MM-DD key. */
export function watStartOfDay(key) {
  return Date.parse(`${key}T00:00:00+01:00`)
}

/** The key `n` Lagos days after `key` (negative goes back). */
export function addDays(key, n) {
  return watDayKey(watStartOfDay(key) + n * DAY_MS + DAY_MS / 2)
}

/** 0 = Sunday ... 6 = Saturday, for a Lagos day key. */
export function watWeekday(key) {
  return new Date(`${key}T12:00:00Z`).getUTCDay()
}

/**
 * Parses a booking's date and time strings as LAGOS wall-clock time.
 *
 * `new Date('2026-09-18T10:00')` on a server parses as the SERVER's zone, and
 * Vercel runs in UTC, so a 10:00 booking read as 11:00 Lagos. That was a real
 * bug in booking-reminder-cron.js: every "starts within two hours" check ran an
 * hour late. The time input is an HTML type="time", so the value is HH:MM.
 */
export function bookingStartMs(bookingDate, bookingTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bookingDate || ''))) return NaN
  const m = String(bookingTime || '').match(/^(\d{1,2}):(\d{2})/)
  const time = m ? `${m[1].padStart(2, '0')}:${m[2]}` : '00:00'
  return Date.parse(`${bookingDate}T${time}:00+01:00`)
}

/**
 * Which periods close on the evening of `dayKey`.
 *
 * The evening run summarises every period ending that day: always the day,
 * the week on a Sunday (Monday to Sunday), the month on its last day, the year
 * on 31 December. Each carries a stable key so a rerun cannot send it twice.
 */
export function closingPeriods(dayKey) {
  const periods = [{ kind: 'day', type: 'daily_summary', key: dayKey, fromKey: dayKey, toKey: dayKey }]

  if (watWeekday(dayKey) === 0) {
    const fromKey = addDays(dayKey, -6)
    periods.push({ kind: 'week', type: 'weekly_summary', key: `week-${fromKey}`, fromKey, toKey: dayKey })
  }

  const tomorrow = addDays(dayKey, 1)
  if (tomorrow.slice(8, 10) === '01') {
    periods.push({
      kind: 'month', type: 'monthly_summary', key: dayKey.slice(0, 7), fromKey: `${dayKey.slice(0, 7)}-01`, toKey: dayKey,
    })
  }

  if (dayKey.slice(5) === '12-31') {
    periods.push({
      kind: 'year', type: 'yearly_summary', key: dayKey.slice(0, 4), fromKey: `${dayKey.slice(0, 4)}-01-01`, toKey: dayKey,
    })
  }

  return periods
}

const EXCLUDED_STATUSES = new Set(['cancelled', 'refunded'])

/**
 * Money that counts as earnings, by the SAME rule the Payouts tab uses
 * (PayoutsTab.jsx `transactions`): paid in-app checkout orders and paid
 * bookings, cancelled and refunded excluded, amount is grandTotal. If this and
 * the Payouts tab ever disagree, a vendor is told one figure at night and sees
 * another in the morning, so the rule is copied, not reinvented.
 */
export function isEarning(doc, kind) {
  if (!doc || EXCLUDED_STATUSES.has(doc.status)) return false
  if (doc.paymentStatus !== 'paid') return false
  if (kind === 'order' && doc.orderType !== 'checkout') return false
  return true
}

/**
 * Tallies one period's figures from raw documents.
 *
 * `orders` and `bookings` counts are everything RECEIVED, matching the
 * Analytics tab's "orders received". `sales` and `inflow` are earnings only.
 */
export function tallyPeriod({ dailyDocs = [], orders = [], bookings = [] }) {
  let views = 0
  let clicks = 0
  for (const d of dailyDocs) {
    views += Number(d.views) || 0
    clicks += (Number(d.productClicks) || 0) + (Number(d.serviceClicks) || 0)
  }

  let inflow = 0
  let sales = 0
  const productTally = new Map()
  const serviceTally = new Map()

  for (const o of orders) {
    if (!isEarning(o, 'order')) continue
    sales++
    inflow += Number(o.grandTotal) || 0
    for (const item of Array.isArray(o.cartItems) ? o.cartItems : []) {
      const name = String(item?.name || '').trim()
      if (!name) continue
      productTally.set(name, (productTally.get(name) || 0) + (Number(item.quantity) || 1))
    }
  }

  for (const b of bookings) {
    if (!isEarning(b, 'booking')) continue
    sales++
    inflow += Number(b.grandTotal) || 0
    const name = String(b.serviceName || '').trim()
    if (name) serviceTally.set(name, (serviceTally.get(name) || 0) + 1)
  }

  return {
    views,
    clicks,
    orders: orders.length,
    bookings: bookings.length,
    sales,
    inflow: Math.round(inflow),
    topProduct: topOf(productTally),
    topService: topOf(serviceTally),
  }
}

// Highest count wins; ties go to the alphabetically first name so the same
// data always produces the same message.
function topOf(tally) {
  let best = null
  for (const [name, count] of tally) {
    if (!best || count > best.count || (count === best.count && name < best.name)) best = { name, count }
  }
  return best
}

export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`

const hasProducts = (vendorType) => vendorType !== 'services'
const hasServices = (vendorType) => vendorType === 'services' || vendorType === 'both'

// ------------------------------------------------------------------ wording

export function morningGreeting(name) {
  return {
    title: `Good morning, ${name} ☀️`,
    body: "I'm ready to assist you with your sales and business today. Ready when you are.",
  }
}

/**
 * The evening message. Wording follows Nex's brief:
 *   10 or more sales  "We did excellent in sales today, I can't wait for tomorrow."
 *   1 to 9            "You made {n} sales today. Don't worry, tomorrow will be better."
 *   0                 worded by what the vendor actually sells: products only,
 *                     services only, or both
 * plus the best seller when there is one.
 */
export function eveningSummary(name, vendorType, t) {
  const title = `Good evening, ${name} 🌙`
  const parts = []

  if (t.sales >= 10) {
    parts.push(`We did excellent in sales today, I can't wait for tomorrow. ${t.sales} sales in total.`)
  } else if (t.sales > 0) {
    parts.push(`You made ${t.sales} ${t.sales === 1 ? 'sale' : 'sales'} today. Don't worry, tomorrow will be better.`)
  } else if (hasProducts(vendorType) && hasServices(vendorType)) {
    parts.push("You sold zero products and didn't receive any service bookings today. Don't worry, tomorrow will be better.")
  } else if (hasServices(vendorType)) {
    parts.push("You didn't receive any service bookings today. Don't worry, tomorrow will be better.")
  } else {
    parts.push("You sold zero products today. Don't worry, tomorrow will be better.")
  }

  if (t.sales > 0) {
    if (hasProducts(vendorType) && t.topProduct) {
      parts.push(`Best seller: ${t.topProduct.name} (${t.topProduct.count}).`)
    }
    if (hasServices(vendorType) && t.topService) {
      parts.push(`Most booked: ${t.topService.name} (${t.topService.count}).`)
    }
  }

  return { title, body: parts.join(' ') }
}

const PERIOD_TITLE = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' }

/**
 * The figures message for a day, week, month or year.
 *
 * Orders and bookings are only mentioned for what the vendor sells, and only
 * when the store can take them at all (`canTransact`, Pro and above); a Growth
 * store has no checkout, so "0 orders" would be a nag about a feature it does
 * not have. Money appears only when some came in, per the brief: no inflow, no
 * money line.
 *
 * Returns null when every figure is zero. A summary of nothing is noise.
 */
export function periodSummary(kind, storeName, vendorType, t, { canTransact }) {
  const bits = [
    `${t.views.toLocaleString('en-NG')} store ${t.views === 1 ? 'view' : 'views'}`,
    `${t.clicks.toLocaleString('en-NG')} ${t.clicks === 1 ? 'card click' : 'card clicks'}`,
  ]
  if (canTransact && hasProducts(vendorType)) bits.push(`${t.orders} ${t.orders === 1 ? 'order' : 'orders'}`)
  if (canTransact && hasServices(vendorType)) bits.push(`${t.bookings} ${t.bookings === 1 ? 'booking' : 'bookings'}`)

  const anything = t.views || t.clicks || (canTransact && (t.orders || t.bookings)) || t.inflow
  if (!anything) return null

  let body = `${bits.join(', ')}.`
  if (canTransact && t.inflow > 0) body += ` ${naira(t.inflow)} came in.`

  return { title: `${PERIOD_TITLE[kind]} at ${storeName}`, body }
}
