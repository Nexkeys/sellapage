// src/api-handlers/_lib/stock.js
//
// Counts stock down when an order is PAID, and reports when an item crosses
// into low stock or sells out.
//
// WHY THIS EXISTS
// Stock used to be a number the vendor typed and nothing else touched. It hid
// the buy button at 0, but only when the vendor remembered to lower it by hand,
// so a product with "3 left" could be sold thirty times, and a low-stock alert
// had nothing to fire on: the number never moved. This is the missing half.
//
// RULES
//   - Only stock the vendor actually set is counted. null or blank means "I am
//     not counting these" and stays untouched, exactly as before.
//   - Runs on a PAID order only (the Paystack webhook), never at checkout
//     start, so an abandoned payment never eats stock.
//   - Never below zero.
//   - Options and extras with their own stock count down too, by the units
//     actually taken: 2 pots with 3 chickens each is 6 chickens.
//   - Alerts fire on CROSSINGS only, so one product produces at most two
//     notifications per restock: when it drops to LOW_STOCK_THRESHOLD or below,
//     and when it hits zero. Not one per order all the way down.
//
// ONCE PER ORDER. The webhook's own guard skips a reference it has seen, but
// two copies of one webhook arriving together can both pass that check. The
// decrement therefore runs in a transaction that stamps `stockAppliedAt` on the
// order and refuses a second pass.

// Matches the dashboard, which already badges a product amber at 5 left.
export const LOW_STOCK_THRESHOLD = 5

/** Stock: null means "not tracked", a number means "this many left". */
export function readStock(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/** 'sold_out', 'low', or null. Crossings only. */
export function crossing(before, after) {
  if (before > 0 && after === 0) return 'sold_out'
  if (before > LOW_STOCK_THRESHOLD && after <= LOW_STOCK_THRESHOLD) return 'low'
  return null
}

// Same trimming normaliseGroups applies, so a label saved as "Chicken " still
// matches the "Chicken" the customer chose.
const norm = (v, max = 40) => String(v ?? '').trim().slice(0, max)

/**
 * Pure. The new fields for ONE product after the paid lines for it.
 *
 * @param product the product document data
 * @param lines   this order's cart lines for this product: { quantity, options }
 * @returns { update, alerts } update is {} when nothing is tracked
 */
export function planDecrement(product, lines) {
  const update = {}
  const alerts = []

  const units = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)

  const before = readStock(product?.stock)
  if (before !== null && units > 0) {
    const after = Math.max(0, before - units)
    if (after !== before) {
      update.stock = after
      const kind = crossing(before, after)
      if (kind) alerts.push({ kind, option: null, stock: after })
    }
  }

  // Units taken per option: option qty is per unit of the product, so it is
  // multiplied by how many of the product were bought.
  const taken = new Map()
  for (const line of lines) {
    for (const opt of Array.isArray(line.options) ? line.options : []) {
      if (opt?.free) continue
      const key = `${norm(opt.groupName)}|${norm(opt.label)}`
      const qty = (Number(opt.qty) || 1) * (Number(line.quantity) || 0)
      taken.set(key, (taken.get(key) || 0) + qty)
    }
  }

  if (taken.size && Array.isArray(product?.variations)) {
    let changed = false
    const variations = product.variations.map((group) => {
      if (!Array.isArray(group?.options)) return group
      return {
        ...group,
        options: group.options.map((option) => {
          const qty = taken.get(`${norm(group.groupName)}|${norm(option?.label)}`)
          const optBefore = readStock(option?.stock)
          if (!qty || optBefore === null) return option
          const optAfter = Math.max(0, optBefore - qty)
          if (optAfter === optBefore) return option
          changed = true
          const kind = crossing(optBefore, optAfter)
          if (kind) alerts.push({ kind, option: norm(option.label), stock: optAfter })
          return { ...option, stock: optAfter }
        }),
      }
    })
    if (changed) update.variations = variations
  }

  return { update, alerts }
}

/**
 * Applies one paid order's lines to stock. Never throws; returns the alerts to
 * send (with productId and name), or [] on any failure.
 *
 * A failure here must not fail the webhook: the customer has paid, and the
 * order is already recorded. Worst case the vendor corrects a number by hand,
 * which is what they did before this existed.
 */
export async function applyStockForOrder(db, storeId, orderRef, cartItems) {
  const byProduct = new Map()
  for (const item of Array.isArray(cartItems) ? cartItems : []) {
    const id = String(item?.id || item?.productId || '')
    if (!id || id.includes('/')) continue
    if (!byProduct.has(id)) byProduct.set(id, [])
    byProduct.get(id).push(item)
  }
  if (!byProduct.size) return []

  try {
    return await db.runTransaction(async (tx) => {
      const productsCol = db.collection('stores').doc(storeId).collection('products')
      const ids = [...byProduct.keys()]

      // All reads before any write, as transactions require.
      const [orderSnap, ...productSnaps] = await tx.getAll(orderRef, ...ids.map((id) => productsCol.doc(id)))
      if (orderSnap.exists && orderSnap.data()?.stockAppliedAt) return []

      const alerts = []
      productSnaps.forEach((snap, i) => {
        if (!snap.exists) return
        const product = snap.data() || {}
        const { update, alerts: productAlerts } = planDecrement(product, byProduct.get(ids[i]))
        if (Object.keys(update).length) tx.update(snap.ref, update)
        for (const a of productAlerts) {
          alerts.push({ ...a, productId: snap.id, name: product.name || 'A product' })
        }
      })

      tx.update(orderRef, { stockAppliedAt: new Date().toISOString() })
      return alerts
    })
  } catch (err) {
    console.error('[stock] decrement failed:', err?.message || err)
    return []
  }
}

/** Wording for one alert. No dashes, per the house rule. */
export function stockAlertMessage(alert) {
  const what = alert.option ? `${alert.name} (${alert.option})` : alert.name
  if (alert.kind === 'sold_out') {
    return { title: 'Sold out 📦', body: `${what} just sold out. Restock it to keep selling.` }
  }
  return { title: 'Running low 📦', body: `${what} is down to ${alert.stock} left.` }
}
