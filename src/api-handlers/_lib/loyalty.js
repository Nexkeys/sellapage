// src/api-handlers/_lib/loyalty.js
// Loyalty points, shared server side logic. See Docs/LOYALTY-POINTS-PLAN.md.
//
// IDENTITY MODEL
// A customer is identified by a loyalty code, not by their phone number. Phone
// was the original design and it does not survive contact with reality:
// 08012345678 and +2348012345678 are the same person and two different keys, so
// balances split; and customers with neither phone nor email collapse into one
// shared bucket, which as a points balance is a wallet strangers spend from.
//
// The card document id IS the code, so a checkout lookup is a single document
// read rather than a query. That is the cheapest operation Firestore has, which
// matters while the project is on the Spark free tier where exhausting the daily
// quota is an outage rather than a bill.
//
// A CODE IS A BEARER TOKEN FOR MONEY. Anyone holding it can spend the points, so
// it is generated from crypto.randomBytes (never sequential, never derived from
// the email) and every public lookup that touches it is rate limited.
import { randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'

// Deliberately excludes 0 O 1 I and L. People read these codes off a screen and
// retype them somewhere else, and those five are where they get it wrong.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 8

const DEFAULTS = { earnRate: 100, redeemValue: 1, minRedeem: 100 }

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

function loyaltyRef(db, storeId) {
  return db.collection('stores').doc(storeId).collection('loyalty')
}

/** Cryptographically random code. Rejection sampling keeps the alphabet uniform. */
export function generateCode() {
  let out = ''
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte < 248) {
        out += CODE_ALPHABET[byte % CODE_ALPHABET.length]
        if (out.length === CODE_LENGTH) break
      }
    }
  }
  return out
}

/**
 * Canonicalises whatever the customer typed. Accepts lower case, spaces and the
 * display dash. Returns null unless the result is a plausible code, so an
 * unknown value never reaches Firestore as a document id.
 */
export function normalizeCode(raw) {
  const cleaned = String(raw || '')
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
  return cleaned.length === CODE_LENGTH ? cleaned : null
}

/** Display form. Stored canonically without the dash. */
export function formatCode(code) {
  if (!code || code.length !== CODE_LENGTH) return code || ''
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/** Matches the gate used elsewhere in the codebase (sella-ai.js:357). */
export function isPremiumStore(storeData) {
  return (storeData?.hasPremiumFeatures ?? (storeData?.plan === 'premium')) === true
}

/**
 * Vendor set rates, reclamped on every read. These live on the store document,
 * which the vendor's browser can write directly (same as deliveryZones), so the
 * values are treated as untrusted input every single time they are used.
 */
export function readLoyaltyConfig(storeData) {
  const s = storeData || {}
  return {
    enabled: s.loyaltyEnabled === true,
    earnRate: clamp(Number(s.loyaltyEarnRate) || DEFAULTS.earnRate, 10, 100000),
    redeemValue: clamp(Number(s.loyaltyRedeemValue) || DEFAULTS.redeemValue, 0.01, 1000),
    minRedeem: clamp(Number(s.loyaltyMinRedeem ?? DEFAULTS.minRedeem), 0, 100000),
  }
}

/** True only when the store is Premium AND has switched loyalty on. */
export function isLoyaltyActive(storeData) {
  return isPremiumStore(storeData) && readLoyaltyConfig(storeData).enabled
}

export async function getCardByCode(db, storeId, code) {
  const normalized = normalizeCode(code)
  if (!normalized) return null
  const snap = await loyaltyRef(db, storeId).doc(normalized).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

export async function findCardByEmail(db, storeId, email) {
  const clean = String(email || '').trim().toLowerCase()
  if (!clean) return null
  const snap = await loyaltyRef(db, storeId)
    .where('customerEmail', '==', clean)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() }
}

/**
 * create() rather than set() so a code collision fails loudly instead of
 * silently overwriting somebody else's balance. Retried a few times; at roughly
 * 8.5e11 combinations a single collision is already improbable.
 */
async function createCard(db, storeId, fields, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const code = generateCode()
    try {
      await loyaltyRef(db, storeId).doc(code).create({
        code,
        points: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        frozen: false,
        createdAt: new Date(),
        ...fields,
      })
      return code
    } catch (err) {
      // 6 is ALREADY_EXISTS. Anything else is a real failure worth surfacing.
      if (err?.code === 6) continue
      throw err
    }
  }
  return null
}

/**
 * Awards points for a paid order, creating the card on the customer's first
 * purchase. Returns null whenever loyalty does not apply, so callers can treat a
 * null as "nothing to do" rather than an error.
 *
 * Email is required: it is both the recovery key and how the code reaches the
 * customer. Checkout already collects it for Paystack, so this costs no extra
 * fields at the till.
 */
export async function earnPointsForOrder(db, storeId, storeData, order) {
  if (!isLoyaltyActive(storeData)) return null

  const email = String(order?.customerEmail || '').trim().toLowerCase()
  if (!email) return null

  const subtotal = Number(order?.subtotal)
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null

  const { earnRate } = readLoyaltyConfig(storeData)
  const earned = Math.floor(subtotal / earnRate)

  const existing = await findCardByEmail(db, storeId, email)

  if (!existing) {
    const code = await createCard(db, storeId, {
      customerName: String(order?.customerName || '').trim(),
      customerEmail: email,
      customerPhone: String(order?.customerPhone || '').trim(),
      points: earned,
      lifetimeEarned: earned,
      lastEarnedAt: new Date(),
    })
    return code ? { code, earned, points: earned, isNew: true } : null
  }

  // A frozen card still exists but must not accrue while the store is off Premium.
  if (existing.frozen === true) return null
  if (earned <= 0) return { code: existing.id, earned: 0, points: existing.points || 0, isNew: false }

  await loyaltyRef(db, storeId).doc(existing.id).update({
    points: FieldValue.increment(earned),
    lifetimeEarned: FieldValue.increment(earned),
    lastEarnedAt: new Date(),
  })

  return {
    code: existing.id,
    earned,
    points: (existing.points || 0) + earned,
    isNew: false,
  }
}

/**
 * Read only. Works out what a redemption request is actually worth, without
 * touching the balance. Called from checkout-initialize so the naira figure the
 * customer is charged is decided by the server, never by the browser.
 *
 * Returns null when nothing should be redeemed, which is never an error: an
 * unknown or unusable code simply means the customer pays full price.
 */
export async function resolveRedemption(db, storeId, storeData, { code, requestedPoints, subtotal }) {
  if (!isLoyaltyActive(storeData)) return null

  const requested = Number(requestedPoints)
  if (!Number.isInteger(requested) || requested <= 0) return null

  const card = await getCardByCode(db, storeId, code)
  if (!card || card.frozen === true) return null

  const { redeemValue, minRedeem } = readLoyaltyConfig(storeData)
  const available = Number(card.points) || 0
  if (available <= 0 || available < minRedeem) return null

  const points = Math.min(requested, available)
  // Floor to whole naira, then cap at the subtotal so points can never eat the
  // delivery fee or the Sellapage processing fee.
  const value = Math.min(Math.floor(points * redeemValue), Math.floor(subtotal))
  if (value <= 0) return null

  return { code: card.id, points, value }
}

/**
 * Deducts the points, at the moment Paystack confirms payment. Deliberately not
 * at checkout start: an abandoned checkout must not burn a customer's balance.
 *
 * Transactional and re-clamped, because between initialize and confirmation the
 * balance may have moved. Known and accepted race: a customer can open two
 * checkouts against the same points before either completes. The floor at zero
 * means a balance can never go negative, but the vendor absorbs the difference on
 * the second order. Reserving points at checkout and releasing them on
 * abandonment is the real fix and is a larger build than the rest of this file.
 */
export async function commitRedemption(db, storeId, code, points) {
  const normalized = normalizeCode(code)
  const wanted = Number(points)
  if (!normalized || !Number.isInteger(wanted) || wanted <= 0) return 0

  const ref = loyaltyRef(db, storeId).doc(normalized)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return 0

    const available = Number(snap.data().points) || 0
    const taken = Math.min(wanted, available)
    if (taken <= 0) return 0

    if (taken < wanted) {
      console.warn(
        `[loyalty] redemption shortfall store=${storeId} code=${normalized} wanted=${wanted} took=${taken}`,
      )
    }

    tx.update(ref, {
      points: FieldValue.increment(-taken),
      lifetimeRedeemed: FieldValue.increment(taken),
      lastRedeemedAt: new Date(),
    })
    return taken
  })
}

/**
 * Undoes an order's loyalty effect on cancellation: takes back what it earned,
 * gives back what it spent. Floored at zero so a balance never goes negative.
 * The caller guards against running twice via loyaltyReversed on the order.
 */
export async function reverseOrderLoyalty(db, storeId, { code, earned = 0, redeemed = 0 }) {
  const normalized = normalizeCode(code)
  if (!normalized) return false

  const ref = loyaltyRef(db, storeId).doc(normalized)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return false

    const data = snap.data()
    const current = Number(data.points) || 0
    const takeBack = Math.max(0, Number(earned) || 0)
    const giveBack = Math.max(0, Number(redeemed) || 0)

    const next = Math.max(0, current - takeBack + giveBack)

    tx.update(ref, {
      points: next,
      lifetimeEarned: Math.max(0, (Number(data.lifetimeEarned) || 0) - takeBack),
      lifetimeRedeemed: Math.max(0, (Number(data.lifetimeRedeemed) || 0) - giveBack),
    })
    return true
  })
}

/**
 * Freezes or unfreezes every card in a store, used when a plan lapses past its
 * grace period. Frozen means cannot earn, cannot spend, balance preserved, so a
 * customer never loses points because their vendor forgot to renew.
 *
 * Batched in chunks and only ever called for stores that actually had loyalty
 * switched on, since writes are the scarcer resource on the free tier.
 */
export async function setStoreCardsFrozen(db, storeId, frozen) {
  const snap = await loyaltyRef(db, storeId).select('frozen').get()
  if (snap.empty) return 0

  const targets = snap.docs.filter((d) => (d.data().frozen === true) !== frozen)
  if (targets.length === 0) return 0

  for (let i = 0; i < targets.length; i += 400) {
    const batch = db.batch()
    for (const doc of targets.slice(i, i + 400)) {
      batch.update(doc.ref, { frozen })
    }
    await batch.commit()
  }
  return targets.length
}
