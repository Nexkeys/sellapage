// src/utils/supplierLimits.js
// Limits on NEW suppliers (Nex, 2026-09-26). A supplier who takes the money and
// never ships costs Sellapage the whole refund (Paystack takes refunds from
// Sellapage's balance, Legal doc A4), so a new supplier's exposure is capped
// until they have a record:
//
//   - the supplier's share of any one order (wholesale x quantity, not counting
//     delivery) is at most maxSupplierShare
//   - at most maxOpenOrders paid orders not yet delivered, cancelled or refunded
//   - both lift automatically after graduateAfterDelivered delivered orders, or
//     earlier when an admin lifts them (Admin > Dropshipping > Suppliers)
//
// FAILS CLOSED. The counters live on the store and are written only by the
// server (locked in firestore.rules). A counter that is missing is 0, which is
// true for a new supplier. A counter that is present but not a whole number
// has been corrupted somehow, and is read as the WORST case: delivered as 0
// (still limited) and open as "full" (no new orders). A bug must never open
// the door wider.
//
// WHO CALLS WHAT
//   listingAvailability (utils/marketplace.js)  a listing whose wholesale
//       price alone is above the cap is unavailable everywhere ('over_limit')
//   /api/marketplace-listing save  refuses such a price with a field error
//   Phase 4 checkout-initialize AND the payment webhook transaction must call
//       checkNewOrder() on a FRESH store read; the webhook increments
//       supplierOpenOrders in the same transaction as the order
//   Phase 5 fulfilment decrements supplierOpenOrders on delivered / cancelled
//       / refunded, and increments supplierDeliveredOrders on delivered

export const NEW_SUPPLIER_LIMITS = Object.freeze({
  maxSupplierShare: 100000, // naira
  maxOpenOrders: 10,
  graduateAfterDelivered: 10,
})

/** Server-only store fields these limits read. Locked in firestore.rules. */
export const SUPPLIER_LIMIT_FIELDS = ['supplierDeliveredOrders', 'supplierOpenOrders', 'supplierLimitsLifted']

// undefined/null -> 0 (never counted yet); a whole number >= 0 -> itself;
// anything else -> null, meaning "corrupt".
const readCount = (v) => {
  if (v === undefined || v === null) return 0
  return Number.isInteger(v) && v >= 0 ? v : null
}

/**
 * Where this supplier stands.
 * @returns {{ limited, lifted, corrupt, delivered, open, maxSupplierShare, maxOpenOrders, remainingToGraduate }}
 */
export function supplierLimits(store) {
  const L = NEW_SUPPLIER_LIMITS
  const deliveredRaw = readCount(store?.supplierDeliveredOrders)
  const openRaw = readCount(store?.supplierOpenOrders)
  const corrupt = deliveredRaw === null || openRaw === null
  const delivered = deliveredRaw ?? 0
  const open = openRaw ?? Number.POSITIVE_INFINITY
  // Only a real boolean lifts them: 'true' as a string does not.
  const lifted = store?.supplierLimitsLifted === true
  const limited = !lifted && delivered < L.graduateAfterDelivered
  return {
    limited,
    lifted,
    corrupt,
    delivered,
    open,
    maxSupplierShare: limited ? L.maxSupplierShare : null,
    maxOpenOrders: limited ? L.maxOpenOrders : null,
    remainingToGraduate: limited ? L.graduateAfterDelivered - delivered : 0,
  }
}

const naira = (n) => `₦${Number(n).toLocaleString('en-NG')}`

/** Can a listing at this wholesale price be sold at all by this supplier? */
export function checkListingPrice(store, wholesalePrice) {
  const lim = supplierLimits(store)
  const w = Number(wholesalePrice)
  if (!lim.limited) return { ok: true }
  if (!Number.isFinite(w) || w > lim.maxSupplierShare) {
    return {
      ok: false,
      reason: 'over_limit',
      message: `New suppliers can list products up to ${naira(lim.maxSupplierShare)} wholesale until they have ${NEW_SUPPLIER_LIMITS.graduateAfterDelivered} delivered orders. You have ${lim.delivered}.`,
    }
  }
  return { ok: true }
}

/**
 * Can this supplier take one more order worth `supplierShare` (wholesale x
 * quantity for their items in the order, no delivery)? For Phase 4 checkout
 * and the payment webhook; see the header for the rules on calling it.
 */
export function checkNewOrder(store, supplierShare) {
  const lim = supplierLimits(store)
  if (!lim.limited) return { ok: true }
  const share = Number(supplierShare)
  if (!Number.isFinite(share) || share < 0 || share > lim.maxSupplierShare) {
    return {
      ok: false,
      reason: 'order_over_limit',
      message: `This supplier can take orders up to ${naira(lim.maxSupplierShare)} for now. Reduce the quantity.`,
    }
  }
  if (lim.open >= lim.maxOpenOrders) {
    return {
      ok: false,
      reason: 'too_many_open_orders',
      message: 'This supplier cannot take new orders right now. Please try again later.',
    }
  }
  return { ok: true }
}
