// src/utils/marketplaceStage.js
// Browser side of the Dropshipping Marketplace lock. Reads the stage from
// /api/public-config once per page, the same cached-promise pattern as
// storefrontGate.js, so no screen adds a round-trip of its own.
//
// COSMETIC ONLY. It decides which screen to draw. Every marketplace handler
// checks again server-side (_lib/marketplace-gate.js), so nothing here can
// open a feature, and failing to reach the config keeps everything locked.
import { cleanStage, marketplaceUnlocked } from './marketplace'

let stagePromise = null

export function fetchMarketplaceStage() {
  if (!stagePromise) {
    stagePromise = fetch('/api/public-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => cleanStage(d?.dropshippingStage))
      // Fails CLOSED: a config blip shows "coming soon", never a half-built
      // feature.
      .catch(() => 'coming_soon')
  }
  return stagePromise
}

/** Resolves true only when this store may use the real marketplace. */
export async function isMarketplaceUnlocked(store) {
  return marketplaceUnlocked(await fetchMarketplaceStage(), store)
}
