// src/api-handlers/_lib/sella-credits.js
// Sella Credits: a monthly allowance charged at what each request REALLY cost.
//
// WHY REAL COST AND NOT A PRICE LIST
// A fixed "a chat is 1 credit, an image is 8" table is wrong the day a model
// changes price, and a quick question and a deep multi-step task cost wildly
// different amounts. OpenRouter reports the exact USD cost of every call in
// usage.cost, so we charge that, converted to credits. Nothing to maintain.
//
//   1 credit = NAIRA_PER_CREDIT naira of real AI cost.
//
// WHY A MINIMUM PER TURN
// Free models cost $0, which would make every free-tier reply free and the
// monthly pool meaningless as an abuse bound. Every turn costs at least
// MIN_CREDITS_PER_TURN, and Deep turns at least MIN_CREDITS_DEEP.
//
// WHERE IT LIVES
// stores/{storeId}/sellaCredits/{YYYY-MM}  - the month's included pool
// stores/{storeId}/sellaCredits/topup      - purchased credits (Phase B, read now
//                                           so top-ups work the moment they exist)
// Both are server-only in firestore.rules. The allowance is deliberately NOT
// read from the store document: vendors can write parts of their own store doc,
// so an allowance kept there would be one console command from unlimited.

import { FieldValue } from 'firebase-admin/firestore'

export const NAIRA_PER_CREDIT = 10
export const MONTHLY_CREDITS = Number(process.env.SELLA_MONTHLY_CREDITS) || 1000
// Parallel-market rate, deliberately a little above the official one: our
// OpenRouter top-ups are bought with real dollars, and under-charging is the
// failure mode that costs money.
export const NGN_PER_USD = Number(process.env.SELLA_NGN_PER_USD) || 1400
export const MIN_CREDITS_PER_TURN = 1
export const MIN_CREDITS_DEEP = 5

const round2 = (n) => Math.round(n * 100) / 100

/** Month key in Lagos time, so the reset lands at midnight WAT on the 1st. */
export function monthKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit',
  }).format(d).slice(0, 7)
}

/** Midnight WAT on the 1st of next month, as an ISO string for the UI. */
export function nextResetIso(d = new Date()) {
  const [y, m] = monthKey(d).split('-').map(Number)
  // 00:00 WAT = 23:00 UTC the previous day.
  return new Date(Date.UTC(y, m, 1, 0, 0) - 60 * 60000).toISOString()
}

export function creditsForUsd(usd) {
  const n = Number(usd)
  if (!Number.isFinite(n) || n <= 0) return 0
  return round2((n * NGN_PER_USD) / NAIRA_PER_CREDIT)
}

function refs(db, storeId) {
  const base = db.collection('stores').doc(storeId).collection('sellaCredits')
  return { month: base.doc(monthKey()), topup: base.doc('topup') }
}

// ---------------------------------------------------------------- TOP-UP LOTS
// Bought credits are kept as LOTS, one per purchase, each with its own expiry
// (12 months from purchase, as agreed with Nex). Spending takes from the lot
// that expires soonest, so a vendor never loses credits they could have used.
// Expired lots are simply not counted. A plain `balance` field from before
// lots existed is honoured as a lot that never expires.
export const TOPUP_VALID_MONTHS = 12
const MAX_LOTS_KEPT = 60

function liveLots(data, now = Date.now()) {
  const lots = Array.isArray(data?.lots) ? data.lots : []
  const out = lots
    .filter((l) => Number(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > now))
    .map((l) => ({ ...l, remaining: round2(Number(l.remaining)) }))
  const legacy = Number(data?.balance || 0)
  if (legacy > 0) out.push({ ref: 'legacy', credits: legacy, remaining: round2(legacy), expiresAt: null })
  return out.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity))
}

/** Adds a purchased lot inside a caller's transaction (see _lib/sella-topups.js). */
export function addTopupLot(tx, db, storeId, currentTopupData, lot) {
  const ref = refs(db, storeId).topup
  const lots = (Array.isArray(currentTopupData?.lots) ? currentTopupData.lots : [])
    .filter((l) => Number(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > Date.now()))
  lots.push(lot)
  tx.set(ref, { lots: lots.slice(-MAX_LOTS_KEPT), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

export function topupRef(db, storeId) {
  return refs(db, storeId).topup
}

/** Current balance, shaped for the UI and for the pre-flight check. */
export async function getBalance(db, storeId) {
  const r = refs(db, storeId)
  const [m, t] = await Promise.all([r.month.get(), r.topup.get()])
  const used = round2(m.exists ? Number(m.data().used || 0) : 0)
  const included = MONTHLY_CREDITS
  const includedLeft = Math.max(included - used, 0)
  const lots = liveLots(t.exists ? t.data() : null)
  const topup = round2(lots.reduce((sum, l) => sum + l.remaining, 0))
  const nextExpiring = lots.find((l) => l.expiresAt)
  return {
    included,
    used,
    includedLeft: round2(includedLeft),
    topup,
    remaining: round2(includedLeft + topup),
    resetsAt: nextResetIso(),
    nairaPerCredit: NAIRA_PER_CREDIT,
    ...(nextExpiring ? { topupNextExpiry: { credits: nextExpiring.remaining, at: new Date(nextExpiring.expiresAt).toISOString() } } : {}),
    byKind: m.exists ? (m.data().byKind || {}) : {},
  }
}

/**
 * Charges a finished request. Spends the included pool first, then top-up
 * lots, soonest-expiring first. A turn that started with credit left is
 * allowed to finish even if it ends slightly over, because cutting an answer
 * off halfway is worse than a few credits of overdraft, and the next request
 * is refused anyway.
 *
 * Never throws: a failed charge must not turn a delivered answer into an error.
 */
export async function charge(db, storeId, { usd = 0, minimum = MIN_CREDITS_PER_TURN, kind = 'chat' } = {}) {
  const credits = Math.max(creditsForUsd(usd), minimum)
  try {
    const r = refs(db, storeId)
    await db.runTransaction(async (tx) => {
      const [m, t] = await Promise.all([tx.get(r.month), tx.get(r.topup)])
      const used = m.exists ? Number(m.data().used || 0) : 0
      const includedLeft = Math.max(MONTHLY_CREDITS - used, 0)
      const fromIncluded = Math.min(credits, includedLeft)
      let owed = round2(credits - fromIncluded)

      let lotsChanged = false
      const topupData = t.exists ? t.data() : null
      const stored = Array.isArray(topupData?.lots) ? topupData.lots.map((l) => ({ ...l })) : []
      let legacy = Number(topupData?.balance || 0)
      if (owed > 0) {
        const order = stored
          .map((l, i) => ({ l, i }))
          .filter(({ l }) => Number(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > Date.now()))
          .sort((a, b) => (a.l.expiresAt || Infinity) - (b.l.expiresAt || Infinity))
        for (const { i } of order) {
          if (owed <= 0) break
          const take = Math.min(owed, Number(stored[i].remaining))
          stored[i].remaining = round2(Number(stored[i].remaining) - take)
          owed = round2(owed - take)
          lotsChanged = true
        }
        if (owed > 0 && legacy > 0) {
          const take = Math.min(owed, legacy)
          legacy = round2(legacy - take)
          owed = round2(owed - take)
          lotsChanged = true
        }
      }

      tx.set(r.month, {
        month: r.month.id,
        included: MONTHLY_CREDITS,
        // Overflow that top-ups cannot cover still lands on `used`, so the
        // month reads as overspent rather than silently absorbing it.
        used: round2(used + fromIncluded + Math.max(owed, 0)),
        costUsd: FieldValue.increment(Number(usd) || 0),
        requests: FieldValue.increment(1),
        [`byKind.${kind}`]: FieldValue.increment(credits),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })

      if (lotsChanged) {
        tx.set(r.topup, { lots: stored, balance: legacy, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      }
    })
  } catch (err) {
    console.error('[sella-credits] charge failed:', err.message)
  }
  return credits
}
