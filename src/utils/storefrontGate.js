// src/utils/storefrontGate.js
// Hides a public storefront until its phone number is verified.
//
// WHY: a script can call createUserWithEmailAndPassword directly against
// Firebase with the public web API key and then write its own stores/{uid} doc,
// never touching the signup form - so the signup phone step alone cannot stop
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

// A store is grandfathered out of BOTH gates by a server-set flag. Client
// writes to these are blocked in firestore.rules (verificationFields), because
// a self-exempting bot would make either gate decorative.
function isGrandfathered(store) {
  return store.phoneGateExempt === true || store.gateExempt === true
}

/**
 * @param {object} store  the store document
 * @param {object|boolean} gates
 *        `{ phone, email }` from /api/public-config. A bare boolean is still
 *        accepted and read as the phone gate, so any caller not yet updated
 *        keeps its exact previous behaviour.
 * @returns {boolean} true when the storefront must be hidden from the public
 */
export function isStorefrontHidden(store, gates) {
  const phoneGate = typeof gates === 'object' && gates !== null ? gates.phone === true : gates === true
  const emailGate = typeof gates === 'object' && gates !== null ? gates.email === true : false

  if (!phoneGate && !emailGate) return false
  if (!store) return false
  if (isGrandfathered(store)) return false

  // Either gate alone is enough to hide a store. They are independent on
  // purpose: the phone gate waits on Termii, the email gate does not.
  if (phoneGate && store.phoneVerified !== true) return true
  if (emailGate && !store.emailVerifiedAt) return true
  return false
}

/** Filters a list of stores for public listings (Live Stores, etc.). */
export function filterVisibleStores(stores, gates) {
  return (stores || []).filter(s => !isStorefrontHidden(s, gates))
}

// Cached for the page lifetime: every storefront lookup asks, and this must not
// add a round-trip per call. Fails CLOSED-as-off - if the config can't be
// fetched we do NOT hide stores, because a config blip must never black out
// every storefront on the platform.
let gatePromise = null
export async function isStorefrontGateEnabled() {
  if (!gatePromise) {
    gatePromise = fetch('/api/public-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => ({
        phone: d?.storefrontGate === true,
        email: d?.storefrontEmailGate === true,
      }))
      // Fails CLOSED-as-off for BOTH gates: a config blip must never black out
      // every storefront on the platform.
      .catch(() => ({ phone: false, email: false }))
  }
  return gatePromise
}
