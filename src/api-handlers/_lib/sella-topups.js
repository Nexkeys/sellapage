// src/api-handlers/_lib/sella-topups.js
// Buying extra Sella credits with Paystack.
//
// DECISIONS (Nex, 2026-09-26):
//   - Three packs, and ONLY these three. The server owns every price; a client
//     only ever names a pack id. See PACKS.
//   - 7.5% VAT is charged on the credit price.
//   - The vendor pays the Paystack fee: the charge is grossed up so that, after
//     Paystack's local-card fee (1.5% + N100, capped at N2,000, plus 7.5% VAT
//     on that fee), Sellapage receives the credit price plus VAT.
//   - Premium only, owner only (it is a payment).
//   - Bought credits last 12 months (lots, _lib/sella-credits.js).
//   - No refunds.
//
// HOW A PAYMENT IS TRUSTED
// A purchase document is created BEFORE the vendor is sent to Paystack, keyed
// by our own reference. Credits are granted only when Paystack itself says the
// transaction succeeded (its signed webhook, or our server calling its verify
// API), for exactly the expected amount in naira, for a reference we issued to
// this store. Granting happens in a transaction that flips the purchase to
// "paid", so the webhook and the verify call can both arrive and credits are
// still added once.

import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { addTopupLot, topupRef, TOPUP_VALID_MONTHS } from './sella-credits.js'

export const PURCHASES = 'sellaCreditPurchases'
export const VAT_RATE = 0.075

// Prices in naira, excluding VAT and processing. Approved by Nex.
export const PACKS = {
  starter: { id: 'starter', name: 'Starter', credits: 300, price: 6000 },
  plus: { id: 'plus', name: 'Plus', credits: 1000, price: 18000 },
  max: { id: 'max', name: 'Max', credits: 3000, price: 50000 },
}

// Paystack Nigeria, local cards (paystack.com/pricing, checked 2026-09-26).
const PAYSTACK_PERCENT = 0.015
const PAYSTACK_FLAT = 100
const PAYSTACK_CAP = 2000
const PAYSTACK_FEE_VAT = 0.075

/** Paystack's fee on a charge of `amount` naira, VAT on the fee included. */
export function paystackFee(amount) {
  const fee = amount <= 2500 ? amount * PAYSTACK_PERCENT : Math.min(amount * PAYSTACK_PERCENT + PAYSTACK_FLAT, PAYSTACK_CAP)
  return fee * (1 + PAYSTACK_FEE_VAT)
}

/**
 * The full price of a pack, in naira. `total` is what the vendor pays;
 * Sellapage receives `price + vat` after Paystack takes its fee.
 */
export function quote(packId) {
  const pack = PACKS[packId]
  if (!pack) return null
  const vat = Math.round(pack.price * VAT_RATE * 100) / 100
  const target = pack.price + vat
  // Smallest whole-naira total whose net, after Paystack's fee, covers target.
  let total = Math.ceil((target + PAYSTACK_FLAT * (1 + PAYSTACK_FEE_VAT)) / (1 - PAYSTACK_PERCENT * (1 + PAYSTACK_FEE_VAT)))
  if (paystackFee(total) >= PAYSTACK_CAP * (1 + PAYSTACK_FEE_VAT)) total = Math.ceil(target + PAYSTACK_CAP * (1 + PAYSTACK_FEE_VAT))
  while (total - paystackFee(total) < target) total++
  return {
    packId: pack.id,
    name: pack.name,
    credits: pack.credits,
    price: pack.price,
    vat,
    processing: Math.round((total - target) * 100) / 100,
    total,
    totalKobo: total * 100,
    perCredit: Math.round((pack.price / pack.credits) * 100) / 100,
  }
}

export const listQuotes = () => Object.keys(PACKS).map(quote)

function newReference(storeId) {
  return `SELLA-${String(storeId).slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

const receiptNumber = (reference) => `SLC-${reference.split('-').slice(-2).join('')}`

/** Creates the pending purchase and starts the Paystack payment. */
export async function startPurchase(db, { storeId, store, packId, email, actorUid, callbackUrl }) {
  const q = quote(packId)
  if (!q) return { ok: false, status: 400, error: 'Choose one of the credit packs.' }
  if (!email) return { ok: false, status: 400, error: 'Your store has no email address on file, which Paystack needs for the receipt. Add one in Settings.' }
  if (!process.env.PAYSTACK_SECRET_KEY) return { ok: false, status: 503, error: 'Payments are not available right now.' }

  const reference = newReference(storeId)
  await db.collection(PURCHASES).doc(reference).set({
    storeId,
    businessName: store.businessName || '',
    email,
    packId: q.packId,
    packName: q.name,
    credits: q.credits,
    price: q.price,
    vat: q.vat,
    processing: q.processing,
    total: q.total,
    totalKobo: q.totalKobo,
    currency: 'NGN',
    status: 'pending',
    receiptNumber: receiptNumber(reference),
    createdBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  let data
  try {
    const resp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: q.totalKobo,
        currency: 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          transactionType: 'sella_credits',
          storeId,
          packId: q.packId,
          purchaseId: reference,
          app: 'sellapage',
          custom_fields: [
            { display_name: 'Purchase', variable_name: 'purchase', value: `${q.credits} Sella credits (${q.name})` },
          ],
        },
      }),
      signal: AbortSignal.timeout(20000),
    })
    data = await resp.json().catch(() => ({}))
    if (!resp.ok || !data?.status) throw new Error(data?.message || `Paystack ${resp.status}`)
  } catch (err) {
    console.error('[sella-topups] initialize failed:', err.message)
    await db.collection(PURCHASES).doc(reference).update({ status: 'failed', failureReason: 'Could not start the payment.', updatedAt: FieldValue.serverTimestamp() })
    return { ok: false, status: 502, error: 'Paystack could not start the payment. Please try again in a moment.' }
  }
  return { ok: true, reference, authorizationUrl: data.data.authorization_url, quote: q }
}

/**
 * Grants the credits for a Paystack transaction that says it succeeded,
 * after checking it against the purchase we issued. Idempotent.
 * @returns {Promise<{ok: boolean, state: 'paid'|'already'|'rejected', message?: string}>}
 */
export async function grantPurchase(db, tx) {
  const reference = String(tx?.reference || '')
  const ref = db.collection(PURCHASES).doc(reference)
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref)
    if (!snap.exists) return { ok: false, state: 'rejected', message: 'Unknown purchase reference.' }
    const p = snap.data()
    if (p.status === 'paid') return { ok: true, state: 'already' }

    // Strict checks: our reference, succeeded, naira, the exact amount.
    const problem =
      tx.status !== 'success' ? 'not successful'
        : tx.currency !== 'NGN' ? `currency ${tx.currency}`
          : Number(tx.amount) !== Number(p.totalKobo) ? `amount ${tx.amount} expected ${p.totalKobo}`
            : (tx.metadata?.storeId && tx.metadata.storeId !== p.storeId) ? 'store mismatch'
              : null
    if (problem) {
      t.update(ref, { status: 'rejected', failureReason: problem, updatedAt: FieldValue.serverTimestamp() })
      console.error('[sella-topups] rejected', reference, problem)
      return { ok: false, state: 'rejected', message: 'This payment did not match the credit pack, so no credits were added. Contact support with your receipt.' }
    }

    const tRef = topupRef(db, p.storeId)
    const topupSnap = await t.get(tRef)
    const paidAt = tx.paid_at ? new Date(tx.paid_at).getTime() : Date.now()
    const expires = new Date(paidAt)
    expires.setMonth(expires.getMonth() + TOPUP_VALID_MONTHS)
    addTopupLot(t, db, p.storeId, topupSnap.exists ? topupSnap.data() : null, {
      ref: reference, credits: p.credits, remaining: p.credits, boughtAt: paidAt, expiresAt: expires.getTime(),
    })
    t.update(ref, {
      status: 'paid',
      paidAt,
      expiresAt: expires.getTime(),
      channel: tx.channel || null,
      cardBrand: tx.authorization?.brand || tx.authorization?.card_type || null,
      cardLast4: tx.authorization?.last4 || null,
      bank: tx.authorization?.bank || null,
      paystackFeeKobo: Number(tx.fees || 0),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true, state: 'paid' }
  })
}

// Paystack transaction states, and what the vendor is told.
const PENDING_STATES = new Set(['ongoing', 'pending', 'processing', 'queued'])

/**
 * Asks Paystack about a purchase and settles it. Used when the vendor comes
 * back from the payment page (the webhook may not have arrived yet).
 * @returns {Promise<{status: 'paid'|'processing'|'failed'|'abandoned'|'pending'|'rejected', message: string, credits?: number}>}
 */
export async function verifyPurchase(db, storeId, reference) {
  const ref = db.collection(PURCHASES).doc(String(reference || ''))
  const snap = await ref.get()
  if (!snap.exists || snap.data().storeId !== storeId) return { status: 'failed', message: 'That payment was not found.' }
  const p = snap.data()
  if (p.status === 'paid') return { status: 'paid', credits: p.credits, message: `${Number(p.credits).toLocaleString('en-NG')} credits were added to your account.` }
  if (p.status === 'rejected') return { status: 'rejected', message: 'This payment did not match the credit pack, so no credits were added. Contact support with your receipt.' }

  let tx
  try {
    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(20000),
    })
    const json = await resp.json().catch(() => ({}))
    // Paystack answers 400 "Transaction reference not found" while the vendor
    // has not finished paying.
    if (!resp.ok) return { status: 'pending', message: 'Waiting for Paystack to confirm your payment.' }
    tx = json.data
  } catch {
    return { status: 'pending', message: 'Could not reach Paystack. Your credits will be added automatically once the payment is confirmed.' }
  }

  if (tx?.status === 'success') {
    const g = await grantPurchase(db, tx)
    if (g.ok) return { status: 'paid', credits: p.credits, message: `${Number(p.credits).toLocaleString('en-NG')} credits were added to your account.` }
    return { status: 'rejected', message: g.message }
  }
  if (PENDING_STATES.has(tx?.status)) {
    return { status: 'processing', message: 'Your bank is still confirming the payment. Your credits will be added automatically as soon as it clears.' }
  }
  const reason = String(tx?.gateway_response || '').trim()
  const state = tx?.status === 'abandoned' ? 'abandoned' : 'failed'
  await ref.update({ status: state, failureReason: reason || state, updatedAt: FieldValue.serverTimestamp() })
  return {
    status: state,
    message: state === 'abandoned'
      ? 'The payment was not completed, so you were not charged.'
      : `The payment did not go through${reason ? ` (${reason})` : ''}. You were not charged. Try again, or use another card.`,
  }
}

/** Purchase history for the billing screen (newest first). */
export async function listPurchases(db, storeId) {
  const snap = await db.collection(PURCHASES).where('storeId', '==', storeId).limit(200).get()
  return snap.docs
    .map((d) => {
      const p = d.data()
      return {
        reference: d.id,
        receiptNumber: p.receiptNumber,
        packName: p.packName,
        credits: p.credits,
        price: p.price,
        vat: p.vat,
        processing: p.processing,
        total: p.total,
        status: p.status,
        failureReason: p.status === 'failed' ? (p.failureReason || null) : null,
        createdAt: p.createdAt?.toMillis?.() || null,
        paidAt: p.paidAt || null,
        expiresAt: p.expiresAt || null,
        channel: p.channel || null,
        cardLast4: p.cardLast4 || null,
      }
    })
    // Pending attempts older than a day were abandoned without a word; they
    // add nothing to a vendor's history but clutter.
    .filter((p) => p.status !== 'pending' || (p.createdAt && Date.now() - p.createdAt < 86400000))
    .sort((a, b) => (b.paidAt || b.createdAt || 0) - (a.paidAt || a.createdAt || 0))
}

// ---------------------------------------------------------------- RECEIPT
const naira = (n) => `NGN ${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const lagosDate = (ms) => new Date(ms).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const pdfSafe = (v) => String(v ?? '').replace(/₦/g, 'NGN ').replace(/[–—]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '')

/** A PDF receipt for a paid purchase. */
export async function receiptPdf(db, storeId, reference) {
  const snap = await db.collection(PURCHASES).doc(String(reference || '')).get()
  if (!snap.exists || snap.data().storeId !== storeId) return null
  const p = snap.data()
  if (p.status !== 'paid') return null

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842]) // A4
  const green = rgb(0.086, 0.639, 0.29)
  const grey = rgb(0.42, 0.45, 0.5)
  const ink = rgb(0.07, 0.09, 0.13)
  let y = 780
  const text = (t, x, size = 10, f = font, color = ink) => page.drawText(pdfSafe(t), { x, y, size, font: f, color })
  const right = (t, xr, size = 10, f = font, color = ink) => {
    const w = f.widthOfTextAtSize(pdfSafe(t), size)
    page.drawText(pdfSafe(t), { x: xr - w, y, size, font: f, color })
  }

  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: green })
  text('Sellapage', 48, 22, bold, green); right('RECEIPT', 547, 14, bold, ink); y -= 20
  text('Sella AI credits', 48, 10, font, grey); right(p.receiptNumber, 547, 10, font, grey); y -= 36

  text('Billed to', 48, 9, bold, grey); text('Paid on', 330, 9, bold, grey); y -= 15
  text(p.businessName || 'Your store', 48, 11, bold); text(lagosDate(p.paidAt), 330, 11); y -= 14
  text(p.email || '', 48, 10, font, grey); y -= 14
  text(`Payment reference: ${snap.id}`, 48, 9, font, grey)
  if (p.cardLast4) text(`${String(p.cardBrand || 'Card').toUpperCase()} ending ${p.cardLast4}`, 330, 9, font, grey)
  else if (p.channel) text(`Paid by ${p.channel}`, 330, 9, font, grey)
  y -= 34

  page.drawRectangle({ x: 48, y: y - 6, width: 499, height: 22, color: rgb(0.94, 0.98, 0.95) })
  text('Description', 56, 9, bold); right('Amount', 539, 9, bold); y -= 30
  const row = (label, amount, strong = false) => {
    text(label, 56, 10, strong ? bold : font); right(naira(amount), 539, 10, strong ? bold : font); y -= 22
  }
  row(`${p.credits.toLocaleString('en-NG')} Sella AI credits (${p.packName} pack)`, p.price)
  row('VAT (7.5%)', p.vat)
  row('Payment processing (Paystack)', p.processing)
  page.drawLine({ start: { x: 48, y: y + 12 }, end: { x: 547, y: y + 12 }, thickness: 0.8, color: rgb(0.85, 0.87, 0.9) })
  y -= 4
  row('Total paid', p.total, true)
  y -= 18

  text(`Credits valid until ${new Date(p.expiresAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}.`, 48, 10); y -= 16
  text('Credits are non-refundable. Bought credits are used after your monthly included credits.', 48, 9, font, grey); y -= 40

  text('Sellapage | www.sellapage.com.ng', 48, 9, font, grey)
  return { buffer: Buffer.from(await doc.save()), filename: `sella-credits-receipt-${p.receiptNumber}.pdf` }
}
