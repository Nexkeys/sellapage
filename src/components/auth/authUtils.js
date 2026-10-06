// src/components/auth/authUtils.js
//
// Small helpers for the sign-in / create-store pages: turning a business name
// into a store link, grading a password, and keeping an unfinished signup as a
// draft so a refresh or a closed tab does not wipe it. The password is never
// part of the draft.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,60}$/ // same rule as signup-phone.js

/** "Chioma's Fabrics & Co." -> "chiomas-fabrics-and-co" */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 61)
    .replace(/-+$/g, '')
}

export const isValidSlug = (s) => SLUG_RE.test(s)

/** A few other links to offer when the obvious one is taken. */
export function slugAlternatives(slug) {
  if (!slug) return []
  const base = slug.slice(0, 52)
  return [`${base}-ng`, `${base}store`, `shop-${base}`, `${base}-hq`].filter(isValidSlug)
}

// Weak / Good / Strong / Perfect. "Good" is the floor for creating a store:
// 8+ characters with a letter and a number (the server itself accepts 6+,
// so this only ever asks for more, never less).
const LEVELS = [
  { label: 'Weak', tone: 'red', tip: 'Too easy to guess, boss. Keep going.' },
  { label: 'Good', tone: 'amber', tip: 'Good. Add a capital letter or a symbol to make it strong.' },
  { label: 'Strong', tone: 'green', tip: 'Strong! One more touch and it is perfect.' },
  { label: 'Perfect', tone: 'forest', tip: 'Perfect. Nobody is guessing this one.' },
]

export function passwordStrength(pw) {
  const s = String(pw || '')
  const checks = {
    length: s.length >= 8,
    letter: /[a-z]/i.test(s),
    number: /\d/.test(s),
  }
  const basics = checks.length && checks.letter && checks.number
  const extras = [/[a-z]/.test(s) && /[A-Z]/.test(s), /[^a-z0-9]/i.test(s), s.length >= 12].filter(Boolean).length
  const level = !basics ? 0 : extras === 0 ? 1 : extras === 1 ? 2 : 3
  return { ...LEVELS[level], level, checks, ok: basics, empty: !s }
}

const DRAFT_KEY = 'sellapage_signup_draft'
const DRAFT_FIELDS = ['ownerName', 'businessName', 'storeName', 'description', 'businessCategory', 'vendorType', 'email', 'whatsappNumber', 'referralCode', 'marketplaceInterest', 'heardAbout', 'heardAboutDetail']

export function readSignupDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (!d || Date.now() - (d.savedAt || 0) > 7 * 864e5) return null
    return d
  } catch {
    return null
  }
}

export function saveSignupDraft(form, step) {
  try {
    const out = { step, savedAt: Date.now() }
    for (const k of DRAFT_FIELDS) out[k] = form[k]
    // Only worth keeping once they have actually typed something.
    const hasAny = ['ownerName', 'businessName', 'description', 'email', 'whatsappNumber'].some((k) => String(form[k] || '').trim())
    if (hasAny) localStorage.setItem(DRAFT_KEY, JSON.stringify(out))
  } catch { /* storage blocked: the form still works, just without a draft */ }
}

export function clearSignupDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}
