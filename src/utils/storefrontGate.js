// src/utils/storefrontGate.js
// Hides a public storefront until its phone number is verified.
//
// WHY: a script can call createUserWithEmailAndPassword directly against
// Firebase with the public web API key and then write its own stores/{uid} doc,
// never touching the signup form — so the signup phone step alone cannot stop
// it. This gate closes what such an account could actually GAIN: with no
// verified phone, the storefront simply never appears publicly, so a bot-made
// store is inert. Combined with signup verification, phone becomes a real wall.
//
// THREE CONDITIONS, all required before anything is hidden:
//   1. The gate is explicitly enabled (enableStorefrontGate).
//   2. The store is not grandfathered (phoneGateExempt).
//   3. The store has no verified phone (phoneVerified).
//
// Ordering matters and is deliberate. Every store that exists today has NO
// phoneVerified field, so enabling this before backfilling `phoneGateExempt`
// would hide the entire platform. The flag is therefore separate from
// smsAvailable: fix the sender ID, confirm a real SMS arrives, run
// scripts/backfill-phone-gate-exempt.js, and only THEN enable the gate.

/**
 * @param {object} store          the store document
 * @param {boolean} gateEnabled   from /api/public-config -> storefrontGate
 * @returns {boolean} true when the storefront must be hidden from the public
 */
export function isStorefrontHidden(store, gateEnabled) {
  if (!gateEnabled) return false
  if (!store) return false
  // Grandfathered: existed before the gate, server-marked, client cannot set it.
  if (store.phoneGateExempt === true) return false
  return store.phoneVerified !== true
}

/** Filters a list of stores for public listings (Live Stores, etc.). */
export function filterVisibleStores(stores, gateEnabled) {
  if (!gateEnabled) return stores
  return (stores || []).filter(s => !isStorefrontHidden(s, gateEnabled))
}

// Cached for the page lifetime: every storefront lookup asks, and this must not
// add a round-trip per call. Fails CLOSED-as-off — if the config can't be
// fetched we do NOT hide stores, because a config blip must never black out
// every storefront on the platform.
let gatePromise = null
export async function isStorefrontGateEnabled() {
  if (!gatePromise) {
    gatePromise = fetch('/api/public-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.storefrontGate === true)
      .catch(() => false)
  }
  return gatePromise
}
