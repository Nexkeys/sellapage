// src/utils/partnersContent.js
//
// The traction figures on /partners, defined once.
//
// Edited in the admin panel (Investors & Partners > Page traction), stored in
// platformSettings/partnersPage, served publicly by /api/partners-content. Pure
// on purpose, like partnerEnquiry.js: the admin editor validates live with the
// same function the server runs before saving, so the two can never disagree.

export const MIN_STATS = 1
export const MAX_STATS = 6

export const STAT_LIMITS = { value: 16, label: 40, note: 60 }

// Shown until the first save from the admin panel, so the page is complete on
// the day it ships. Once anything is saved, these are never used again.
export const DEFAULT_TRACTION = {
  asOf: '2026-09-15',
  stats: [
    { value: '145', label: 'Users signed up', note: 'and growing' },
    { value: '17', label: 'Transactions processed', note: 'by vendors on the platform' },
    { value: 'May 2026', label: 'Launched', note: 'live and taking payments' },
    { value: '₦0', label: 'Raised to date', note: 'fully bootstrapped' },
  ],
}

export function isValidIsoDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Today in Lagos as YYYY-MM-DD. Nigeria is UTC+1 with no daylight saving. */
export function todayIso(now = new Date()) {
  try {
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
    })
      .formatToParts(now)
      .reduce((a, x) => ((a[x.type] = x.value), a), {})
    if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`
  } catch {
    // Fall through to the fixed offset.
  }
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** '2026-09-15' -> '15 September 2026'. Empty string for anything invalid. */
export function formatAsOf(iso) {
  if (!isValidIsoDate(iso)) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/**
 * Cleans and checks a traction block.
 *
 * Rows are never silently dropped, even blank ones: the editor shows errors by
 * row position, and dropping a row would shift every error after it onto the
 * wrong card. A blank row is an error the admin fixes or removes.
 *
 * Returns { value, errors } where errors is { stats?, asOf?, rows: { [i]: { value?, label? } } }.
 */
export function validateTraction(input = {}) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max)
  const raw = Array.isArray(input.stats) ? input.stats : []

  const stats = raw.slice(0, MAX_STATS).map((r) => ({
    value: s(r?.value, STAT_LIMITS.value),
    label: s(r?.label, STAT_LIMITS.label),
    note: s(r?.note, STAT_LIMITS.note),
  }))
  const asOf = s(input.asOf, 10)

  const errors = { rows: {} }

  if (raw.length > MAX_STATS) errors.stats = `Show at most ${MAX_STATS} figures.`
  else if (stats.length < MIN_STATS) errors.stats = 'Add at least one figure.'

  stats.forEach((r, i) => {
    const e = {}
    if (!r.value) e.value = 'Enter the figure.'
    if (!r.label) e.label = 'Say what it measures.'
    if (Object.keys(e).length) errors.rows[i] = e
  })

  if (!isValidIsoDate(asOf)) errors.asOf = 'Choose the date these figures are from.'
  else if (asOf > todayIso()) errors.asOf = 'The date cannot be in the future.'

  return { value: { stats, asOf }, errors }
}

export const hasTractionErrors = (errors) =>
  !!(errors?.stats || errors?.asOf || Object.keys(errors?.rows || {}).length)
