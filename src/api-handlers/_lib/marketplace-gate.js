// src/api-handlers/_lib/marketplace-gate.js
//
// THE LOCK, server side. Every Dropshipping Marketplace handler from Phase 1
// on calls this FIRST, before reading anything else, so half-built features
// cannot be reached while vendors are still being shown "coming soon".
//
//   coming_soon  nobody, every call refused. The default, so a database with
//                no setting at all (and a fresh environment) is locked.
//   testing      only stores with `marketplaceTester: true`, which an admin
//                switches on per store. Everyone else still sees coming soon.
//   live         everyone, subject to plan and supplier approval.
//
// WHERE THE STAGE LIVES: `platformSettings/marketplace.stage`, set from the
// admin panel (Dropshipping > Access), the same pattern as the partners page
// and the review prompt. That is what "run it from the admin panel" needs; an
// environment variable would mean a redeploy for every change.
//
// `DROPSHIPPING_STAGE` still wins WHEN SET, as a break-glass lock that no
// admin account can undo, and for local development. Unset in normal running.
//
// `marketplaceTester` is server-only (locked in firestore.rules), so a vendor
// cannot let themselves in either.
//
// Phase 0 (the coming-soon page, the two tabs and the waitlist) deliberately
// does NOT call this: it is meant to be visible to everyone at every stage.
import { getAdminDb } from './firebase-admin.js'
import { cleanStage, marketplaceUnlocked, MARKETPLACE_STAGES } from '../../utils/marketplace.js'

export const SETTINGS_DOC = 'marketplace'

/** The environment override, or null when it is not set to a valid stage. */
export function stageOverride() {
  const raw = String(process.env.DROPSHIPPING_STAGE || '').trim().toLowerCase()
  return MARKETPLACE_STAGES.includes(raw) ? raw : null
}

// One Firestore read per minute per warm instance, not one per request: this
// runs on public endpoints and the Spark plan's daily read quota is an outage
// when it runs out. A stage change reaches the server within a minute.
const CACHE_MS = 60 * 1000
let cached = { stage: null, at: 0 }

export function clearStageCache() {
  cached = { stage: null, at: 0 }
}

export async function marketplaceStage() {
  const override = stageOverride()
  if (override) return override

  if (cached.stage && Date.now() - cached.at < CACHE_MS) return cached.stage
  try {
    const snap = await getAdminDb().collection('platformSettings').doc(SETTINGS_DOC).get()
    const stage = cleanStage(snap.exists ? snap.data().stage : null)
    cached = { stage, at: Date.now() }
    return stage
  } catch (err) {
    // Fails CLOSED. A Firestore blip must never open a half-built marketplace.
    console.error('[marketplace-gate] could not read the stage:', err.message)
    return 'coming_soon'
  }
}

/** @param {object|null} store the store document, for the 'testing' stage */
export async function storeCanUseMarketplace(store) {
  return marketplaceUnlocked(await marketplaceStage(), store)
}

/**
 * Refuses the request when the marketplace is locked for this store, and
 * resolves true so the caller can `if (await refuseIfLocked(res, store)) return`.
 *
 * 503, not 403: it is not a permission problem, it is "not open yet", and the
 * same wording a vendor sees on the coming-soon page.
 */
export async function refuseIfLocked(res, store) {
  const stage = await marketplaceStage()
  if (marketplaceUnlocked(stage, store)) return false
  res.status(503).json({
    error: 'marketplace_not_open',
    message: 'The Dropshipping Marketplace is not open yet. Join the waitlist and we will let you know.',
    stage,
  })
  return true
}
