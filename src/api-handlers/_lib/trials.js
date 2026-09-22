// src/api-handlers/_lib/trials.js
//
// Admin-granted free trials: grant, pause, resume, revoke, and the expiry that
// expiry-cron.js runs once a day.
//
// HOW A TRIAL IS MODELLED
// A trial is a paid plan with no payment. Granting one writes exactly the same
// entitlement fields a Paystack payment writes (plan, planStatus, planEndDate,
// the limits and the hasXFeatures booleans), so every plan gate in the codebase
// keeps working without knowing trials exist. The bookkeeping that makes it a
// TRIAL rather than a purchase lives in one `trial` map on the store document.
//
// WHY NO GRACE PERIOD
// graceUntil exists so a paying vendor whose card failed does not lose their
// shop while they sort the bank out. A trial ending is not a failure, so
// graceUntil is set equal to planEndDate: the trial stops the day it says it
// will. Note that it is still SET, never left undefined - expiry-cron skips any
// store whose graceUntil is missing, so a trial without one would run forever.
//
// WHAT HAPPENS WHEN IT ENDS
// The vendor is returned to whatever they were on before, not dumped on
// Starter. A Growth vendor trialling Premium goes back to Growth with their
// paid end date intact. Only a vendor who had nothing to return to lands on
// Starter. Anything else would mean a trial silently destroying a plan someone
// had paid for.
import { Timestamp } from 'firebase-admin/firestore'
import { setStoreCardsFrozen } from './loyalty.js'

// Mirrors PLAN_LIMITS in paystack-webhook.js. Deliberately a copy: that file is
// the live payment path and is not worth touching to share a constant. If the
// tiers ever change, BOTH must change.
export const PLAN_LIMITS = {
  growth: {
    maxProducts: 50,
    maxImagesPerProduct: 10,
    maxJobListings: 25,
    hasGrowthFeatures: true,
    hasProFeatures: false,
    hasPremiumFeatures: false,
  },
  pro: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    maxJobListings: 50,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: false,
  },
  premium: {
    maxProducts: 999999,
    maxImagesPerProduct: 50,
    maxJobListings: 999999,
    hasGrowthFeatures: true,
    hasProFeatures: true,
    hasPremiumFeatures: true,
  },
}

// Mirrors STARTER_RESET in expiry-cron.js, same reasoning as above.
export const STARTER_RESET = {
  plan: 'starter',
  planStatus: 'expired',
  maxProducts: 15,
  maxImagesPerProduct: 3,
  hasGrowthFeatures: false,
  hasProFeatures: false,
  hasPremiumFeatures: false,
}

export const TRIAL_PLANS = Object.keys(PLAN_LIMITS)
const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_TRIAL_DAYS = 120

/** True when the store currently has a trial that is running (not paused). */
export function hasActiveTrial(data) {
  return data?.trial?.status === 'active'
}

/** True when a trial exists in any state that still owns the plan fields. */
export function hasLiveTrial(data) {
  return data?.trial?.status === 'active' || data?.trial?.status === 'paused'
}

/**
 * Captures what the store was on before a trial, so the exact same state can be
 * handed back when the trial ends. Stored as ISO strings rather than Timestamps
 * because this sits inside a map and is read back by both the API and the cron.
 */
function snapshotPlan(data) {
  return {
    plan: data.plan || 'starter',
    planStatus: data.planStatus || null,
    billingPeriod: data.billingPeriod || null,
    planEndDate: data.planEndDate?.toDate ? data.planEndDate.toDate().toISOString() : null,
    graceUntil: data.graceUntil?.toDate ? data.graceUntil.toDate().toISOString() : null,
    maxProducts: data.maxProducts ?? null,
    maxImagesPerProduct: data.maxImagesPerProduct ?? null,
    maxJobListings: data.maxJobListings ?? null,
    hasGrowthFeatures: data.hasGrowthFeatures === true,
    hasProFeatures: data.hasProFeatures === true,
    hasPremiumFeatures: data.hasPremiumFeatures === true,
  }
}

/**
 * Turns a snapshot back into the store fields it came from.
 *
 * A snapshot whose paid time has already run out is NOT restored: handing back
 * an expired Premium would leave the vendor on a paid tier they no longer own,
 * and expiry-cron would only notice on its next pass. Starter is the honest
 * landing place in that case.
 */
export function restoreFields(previous) {
  if (!previous || !previous.plan || previous.plan === 'starter' || previous.plan === 'free') {
    return { ...STARTER_RESET, landedOn: 'starter' }
  }

  const endMs = previous.planEndDate ? Date.parse(previous.planEndDate) : 0
  if (!endMs || endMs <= Date.now()) {
    return { ...STARTER_RESET, landedOn: 'starter' }
  }

  return {
    plan: previous.plan,
    planStatus: 'active',
    billingPeriod: previous.billingPeriod || null,
    planEndDate: Timestamp.fromMillis(endMs),
    graceUntil: previous.graceUntil
      ? Timestamp.fromMillis(Date.parse(previous.graceUntil))
      : Timestamp.fromMillis(endMs + 2 * DAY_MS),
    maxProducts: previous.maxProducts ?? PLAN_LIMITS[previous.plan]?.maxProducts ?? 15,
    maxImagesPerProduct:
      previous.maxImagesPerProduct ?? PLAN_LIMITS[previous.plan]?.maxImagesPerProduct ?? 3,
    maxJobListings: previous.maxJobListings ?? PLAN_LIMITS[previous.plan]?.maxJobListings ?? 0,
    hasGrowthFeatures: previous.hasGrowthFeatures === true,
    hasProFeatures: previous.hasProFeatures === true,
    hasPremiumFeatures: previous.hasPremiumFeatures === true,
    landedOn: previous.plan,
  }
}

/**
 * Grants a trial.
 *
 * Refuses to overwrite a plan the vendor paid for unless `override` is set, so
 * a mis-click cannot wipe out someone's live Premium. The previous plan is
 * always snapshotted first, and given back when the trial ends.
 */
export async function grantTrial(db, storeId, { plan, days, adminUid, note = '', override = false }) {
  if (!TRIAL_PLANS.includes(plan)) return { ok: false, error: 'bad_plan' }

  const length = Math.floor(Number(days))
  if (!Number.isFinite(length) || length < 1 || length > MAX_TRIAL_DAYS) {
    return { ok: false, error: 'bad_days' }
  }

  const storeRef = db.collection('stores').doc(storeId)
  const snap = await storeRef.get()
  if (!snap.exists) return { ok: false, error: 'not_found' }

  const data = snap.data() || {}

  if (hasLiveTrial(data) && !override) return { ok: false, error: 'trial_exists' }

  // A live PAID plan is only replaced deliberately. Note this reads the stored
  // end date rather than planStatus, because a vendor mid-grace still paid.
  const paidEndMs = data.planEndDate?.toMillis?.() || 0
  const onPaidPlan = data.plan && data.plan !== 'starter' && data.plan !== 'free' && paidEndMs > Date.now()
  if (onPaidPlan && !hasLiveTrial(data) && !override) {
    return { ok: false, error: 'on_paid_plan', currentPlan: data.plan, paidUntil: new Date(paidEndMs).toISOString() }
  }

  // On an override of a running trial, keep the ORIGINAL snapshot. Re-reading
  // the live fields here would snapshot the trial itself, and the vendor would
  // later be "restored" onto a free plan they never bought.
  const previous = hasLiveTrial(data) ? data.trial?.previous || snapshotPlan(data) : snapshotPlan(data)

  const startedAt = Timestamp.now()
  const endsAt = Timestamp.fromMillis(startedAt.toMillis() + length * DAY_MS)

  await storeRef.update({
    plan,
    planStatus: 'active',
    planStartDate: startedAt,
    planEndDate: endsAt,
    // Equal to the end date on purpose: no grace on a trial, but never absent,
    // or expiry-cron skips the store and the trial never ends.
    graceUntil: endsAt,
    ...PLAN_LIMITS[plan],
    trial: {
      status: 'active',
      plan,
      days: length,
      startedAt,
      endsAt,
      grantedBy: adminUid,
      grantedAt: startedAt,
      note: String(note || '').slice(0, 300),
      previous,
      // Reminder bookkeeping. expiry-cron flips these so a vendor is never sent
      // the same warning twice.
      remindedFive: false,
      remindedOne: false,
    },
  })

  // A trial is a real upgrade: if their loyalty cards were frozen by a previous
  // downgrade, they work again for the length of the trial.
  try {
    await setStoreCardsFrozen(db, storeId, false)
  } catch {
    // Never fail a grant on this. The cards unfreeze on the next paid event too.
  }

  return { ok: true, plan, endsAt: endsAt.toDate().toISOString(), days: length }
}

/**
 * Pauses a running trial: the vendor drops back to their previous plan now, and
 * the unused days are banked. Used when a vendor abuses a trial, or asks to
 * hold it until they are ready to use it properly.
 */
export async function pauseTrial(db, storeId, { adminUid }) {
  const storeRef = db.collection('stores').doc(storeId)
  const snap = await storeRef.get()
  if (!snap.exists) return { ok: false, error: 'not_found' }

  const data = snap.data() || {}
  if (data.trial?.status !== 'active') return { ok: false, error: 'no_active_trial' }

  const endsMs = data.trial.endsAt?.toMillis?.() || 0
  const remainingMs = Math.max(0, endsMs - Date.now())
  const restored = restoreFields(data.trial.previous)
  const { landedOn, ...fields } = restored

  await storeRef.update({
    ...fields,
    'trial.status': 'paused',
    'trial.pausedAt': Timestamp.now(),
    'trial.pausedBy': adminUid,
    'trial.remainingMs': remainingMs,
  })

  if (landedOn === 'starter') {
    try {
      await setStoreCardsFrozen(db, storeId, true)
    } catch {
      // Cosmetic next to the downgrade itself.
    }
  }

  return { ok: true, landedOn, daysBanked: Math.ceil(remainingMs / DAY_MS) }
}

/** Resumes a paused trial for exactly the days that were banked. */
export async function resumeTrial(db, storeId, { adminUid }) {
  const storeRef = db.collection('stores').doc(storeId)
  const snap = await storeRef.get()
  if (!snap.exists) return { ok: false, error: 'not_found' }

  const data = snap.data() || {}
  if (data.trial?.status !== 'paused') return { ok: false, error: 'no_paused_trial' }

  const remainingMs = Number(data.trial.remainingMs) || 0
  if (remainingMs <= 0) return { ok: false, error: 'nothing_left' }

  const plan = data.trial.plan
  if (!TRIAL_PLANS.includes(plan)) return { ok: false, error: 'bad_plan' }

  const now = Timestamp.now()
  const endsAt = Timestamp.fromMillis(now.toMillis() + remainingMs)

  await storeRef.update({
    plan,
    planStatus: 'active',
    planEndDate: endsAt,
    graceUntil: endsAt,
    ...PLAN_LIMITS[plan],
    'trial.status': 'active',
    'trial.endsAt': endsAt,
    'trial.resumedAt': now,
    'trial.resumedBy': adminUid,
    'trial.remainingMs': 0,
    // Fresh window, so the warnings are owed again.
    'trial.remindedFive': false,
    'trial.remindedOne': false,
  })

  try {
    await setStoreCardsFrozen(db, storeId, false)
  } catch {
    // See grantTrial.
  }

  return { ok: true, plan, endsAt: endsAt.toDate().toISOString() }
}

/**
 * Ends a trial now and hands the vendor back their previous plan.
 *
 * Shared by the admin Revoke button and by expiry-cron when the clock runs out,
 * so a revoked trial and an expired one leave the store in exactly the same
 * state. `reason` only changes what is recorded, never what is written.
 */
export async function endTrial(db, storeId, { reason = 'expired', adminUid = null } = {}) {
  const storeRef = db.collection('stores').doc(storeId)
  const snap = await storeRef.get()
  if (!snap.exists) return { ok: false, error: 'not_found' }

  const data = snap.data() || {}
  if (!hasLiveTrial(data)) return { ok: false, error: 'no_trial' }

  const restored = restoreFields(data.trial.previous)
  const { landedOn, ...fields } = restored

  await storeRef.update({
    ...fields,
    trial: {
      ...data.trial,
      status: reason === 'revoked' ? 'revoked' : 'ended',
      endedAt: Timestamp.now(),
      endedBy: adminUid,
      endedReason: reason,
      landedOn,
      remainingMs: 0,
    },
  })

  if (landedOn === 'starter') {
    try {
      await setStoreCardsFrozen(db, storeId, true)
    } catch {
      // Cosmetic next to the downgrade itself.
    }
  }

  return { ok: true, landedOn, trialPlan: data.trial.plan }
}
