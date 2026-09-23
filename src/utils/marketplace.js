// src/utils/marketplace.js
// Dropshipping marketplace, Phase 0 (coming soon + waitlist). Shared by the
// dashboard tabs, Settings, signup, the public page and the API handlers, so
// "who is interested" and "who is ready" mean the same thing everywhere.
// Build plan: Docs/Dropshipping-Marketplace-Plan.md.

export const MARKETPLACE_ROLES = ['supply', 'dropship', 'both']

/**
 * THE LOCK. `DROPSHIPPING_STAGE` decides who sees anything beyond "coming
 * soon", so the marketplace can be built and tested in production while every
 * vendor keeps seeing the Phase 0 page.
 *
 *   coming_soon (default)  everybody sees "coming soon". Every marketplace
 *                          handler refuses. This is what an unset variable
 *                          means, so a fresh environment is always locked.
 *   testing                only stores with `marketplaceTester: true` (set by
 *                          the server, locked in firestore.rules) get the real
 *                          thing. Everyone else still sees "coming soon".
 *   live                   everyone, subject to plan and supplier approval.
 *
 * The browser copy is cosmetic: it only decides which screen to draw. Every
 * server handler asks again (_lib/marketplace-gate.js), so flipping the
 * variable is the only way in, and a vendor cannot make themselves a tester.
 */
export const MARKETPLACE_STAGES = ['coming_soon', 'testing', 'live']

export function cleanStage(value) {
  const s = String(value || '').trim().toLowerCase()
  return MARKETPLACE_STAGES.includes(s) ? s : 'coming_soon'
}

/** Can THIS store use the real marketplace yet? */
export function marketplaceUnlocked(stage, store) {
  const s = cleanStage(stage)
  if (s === 'live') return true
  if (s === 'testing') return store?.marketplaceTester === true
  return false
}

export const MARKETPLACE_TABS = {
  supply: { id: 'supplier-hub', label: 'Supplier Hub' },
  dropship: { id: 'dropship', label: 'Dropship Marketplace' },
}

/**
 * `stores/{uid}.marketplaceInterest` is { supply, dropship }. It records
 * interest only and grants nothing, which is why the owner may write it.
 */
export function readInterest(store) {
  const m = store?.marketplaceInterest
  return { supply: m?.supply === true, dropship: m?.dropship === true }
}

export function interestFromRole(role) {
  return { supply: role === 'supply' || role === 'both', dropship: role === 'dropship' || role === 'both' }
}

export function roleFromInterest(interest) {
  if (interest?.supply && interest?.dropship) return 'both'
  if (interest?.supply) return 'supply'
  if (interest?.dropship) return 'dropship'
  return null
}

/** Only ever `true` booleans survive; anything else reads as not interested. */
export function cleanInterest(raw) {
  return { supply: raw?.supply === true, dropship: raw?.dropship === true }
}

/**
 * A dropshipper sells products, so ticking "dropship" on a services-only store
 * makes it a products-and-services store. Everything else is left alone.
 */
export function vendorTypeForInterest(vendorType, interest) {
  const t = ['products', 'services', 'both'].includes(vendorType) ? vendorType : 'products'
  return interest?.dropship && t === 'services' ? 'both' : t
}

const hasPro = (store) =>
  store?.hasProFeatures ?? ['pro', 'premium'].includes(String(store?.plan || 'starter').toLowerCase())

/**
 * What each side will need at launch (plan decisions B1, B10). Shown now as a
 * checklist so vendors can get ready while the marketplace is coming soon.
 * `tab` is the dashboard tab that fixes an unmet item.
 */
export function readiness(store, role) {
  const items = [
    { key: 'plan', label: 'Pro or Premium plan', done: !!hasPro(store), tab: 'billing' },
    { key: 'payout', label: 'Payout bank account set up', done: !!store?.subaccountCode, tab: 'payouts' },
  ]
  if (role === 'supply') {
    items.push(
      { key: 'cac', label: 'CAC verified', done: store?.cacVerified === true, tab: 'cac-verification' },
      { key: 'phone', label: 'Phone number verified', done: store?.phoneVerified === true, tab: 'settings' },
      {
        key: 'pickup',
        label: 'Pickup address for deliveries',
        done: !!String(store?.pickupAddress?.streetAddress || '').trim(),
        tab: 'delivery',
      },
      { key: 'video', label: 'A short video of your stock (at launch)', done: false, pending: true },
    )
  }
  return items
}
