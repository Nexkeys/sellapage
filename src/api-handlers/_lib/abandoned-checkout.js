// src/api-handlers/_lib/abandoned-checkout.js
// Abandoned checkout recovery. See Docs/ABANDONED-CHECKOUT-PLAN.md.
//
// WHY A RECORD HAS TO BE CREATED AT ALL
// checkout-initialize.js writes nothing: it prices the cart, calls Paystack and
// returns a URL. Nothing reaches Firestore until the webhook fires on a
// SUCCESSFUL payment. So an abandoned checkout has, until now, left no trace
// anywhere. There was nothing to send a reminder about.
//
// This is abandoned CHECKOUT, not abandoned CART. A cart that was never taken
// through checkout has no name, email or phone attached anywhere on the server,
// so there is nobody to contact. Someone who reached Paystack and did not pay
// has given us everything, and was one tap from paying.
import { createHash } from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'

const COLLECTION = 'abandonedCheckouts'

/** Mirrors the gate used in sella-ai.js:357 and _lib/loyalty.js. */
export function isPremiumStore(storeData) {
  return (storeData?.hasPremiumFeatures ?? (storeData?.plan === 'premium')) === true
}

/**
 * Premium AND explicitly switched on.
 *
 * The toggle gates COLLECTION, not just sending. A vendor who has not opted in
 * does not accumulate their customers' names, emails, phone numbers and basket
 * contents at all. Filtering only at send time would mean quietly building that
 * pile for every Premium store on the off chance they want it later, which is
 * the wrong default for data you did not need to hold.
 */
export function isRecoveryActive(storeData) {
  return isPremiumStore(storeData) && storeData?.abandonedRecoveryEnabled === true
}

function ref(db, storeId, reference) {
  return db.collection('stores').doc(storeId).collection(COLLECTION).doc(reference)
}

/**
 * Records a checkout that has been handed off to Paystack but not yet paid.
 *
 * Written only when the store is Premium AND has explicitly switched recovery
 * on. Recording for everyone would mean holding customer names, emails and phone
 * numbers for hundreds of vendors who never asked for the feature, which is the
 * wrong default quite apart from the write cost on the free tier.
 *
 * Never throws. A failure here must never cost a customer their checkout, since
 * this runs immediately before the Paystack URL is returned.
 */
export async function recordCheckoutAttempt(db, storeId, storeData, attempt) {
  try {
    if (!isRecoveryActive(storeData)) return false
    if (!attempt?.reference || !attempt?.customerEmail) return false

    await ref(db, storeId, attempt.reference).set({
      reference: attempt.reference,
      customerName: attempt.customerName || '',
      customerEmail: String(attempt.customerEmail).trim().toLowerCase(),
      customerPhone: attempt.customerPhone || '',
      cartItems: Array.isArray(attempt.cartItems) ? attempt.cartItems : [],
      subtotal: Number(attempt.subtotal) || 0,
      grandTotal: Number(attempt.grandTotal) || 0,
      kind: attempt.kind === 'booking' ? 'booking' : 'product',
      // Drives the cron's single field query. See markRecovered below for why
      // a recovered checkout also sets this to true.
      reminderSent: false,
      createdAt: Timestamp.now(),
      recoveredAt: null,
    })

    // Occasional retention sweep. The vendor opening the tab is the primary
    // trigger, but a store whose vendor never opens it would otherwise keep
    // customer contact details forever. This function is already fire and
    // forget from checkout-initialize, so the cost is invisible to the shopper.
    if (Math.random() < 0.1) sweepExpired(db, storeId)

    return true
  } catch (err) {
    console.error('[abandoned-checkout] record failed', err)
    return false
  }
}

/**
 * Marks a checkout as paid, called from the webhook once an order exists.
 *
 * Sets `reminderSent: true` as well as `recoveredAt`. That is deliberate rather
 * than sloppy: the cron finds work with a single equality query on
 * `reminderSent`, which needs no composite index. A recovered checkout setting
 * the same flag drops out of that query permanently, so "already paid" never has
 * to be a second filter. booking-reminder-cron.js:47 uses the same trick, with a
 * note that missing composite indexes have caused outages in this codebase.
 *
 * Never throws: a paid order must not fail over its own bookkeeping.
 */
export async function markRecovered(db, storeId, reference, customerEmail) {
  const stamp = { recoveredAt: Timestamp.now(), reminderSent: true }
  let marked = false

  // 1. Exact reference match. Covers the customer who returns to the SAME
  //    Paystack link (still open in a tab, or from Paystack's own email) and
  //    pays it. update() not set(): if no record exists, which is the normal
  //    case for a store without recovery enabled, there is nothing to mark and
  //    creating one would invent an abandoned checkout that never happened.
  if (reference) {
    try {
      await ref(db, storeId, reference).update(stamp)
      marked = true
    } catch {
      // NOT_FOUND is expected and not an error.
    }
  }

  // 2. Match on the customer instead.
  //
  //    Without this the recovered count would sit at 0 forever, and the feature
  //    would look broken while working perfectly. The reminder email links to
  //    the STORE, not back to the original Paystack link, so a customer who acts
  //    on it starts a brand new checkout with a brand new reference. Step 1 then
  //    stamps a document that does not exist, and the record they actually
  //    abandoned stays unpaid permanently.
  //
  //    Single field equality only. Filtering `recoveredAt == null` in the query
  //    as well would need a composite index, and missing composite indexes have
  //    caused outages in this codebase, so that half is done in memory. The
  //    result set is one customer's own abandoned checkouts at one store, so it
  //    is tiny.
  const email = String(customerEmail || '').trim().toLowerCase()
  if (!email) return marked

  try {
    const snap = await db
      .collection('stores').doc(storeId).collection(COLLECTION)
      .where('customerEmail', '==', email)
      .limit(20)
      .get()

    const open = snap.docs.filter((d) => !d.data().recoveredAt)
    if (open.length === 0) return marked

    const batch = db.batch()
    open.forEach((d) => batch.update(d.ref, stamp))
    await batch.commit()
    return true
  } catch (err) {
    console.error('[abandoned-checkout] recovery match by email failed', err)
    return marked
  }
}

// ---------------------------------------------------------------- Throttle

/**
 * Throttle key: sha256 of the lowercased email.
 *
 * Hashed rather than used raw because Firestore document ids cannot hold
 * arbitrary strings, and because the existing `customers` collection derives its
 * ids by truncating an email to 20 characters, which collides for anyone sharing
 * a prefix. Two customers sharing a throttle would mean one of them silently
 * never receives a reminder. A hash cannot collide, and keeps the address itself
 * out of the document id.
 */
function throttleKey(email) {
  return createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex')
}

const THROTTLE_WINDOW_MS = 24 * 60 * 60 * 1000

// ------------------------------------------------------------------- Send

/**
 * Sends one recovery email, enforcing every rule that protects the customer.
 *
 * DELIBERATELY the single entry point for sending. The dashboard button calls
 * it today. If automated recovery is added later, the cron calls this same
 * function and none of the guarantees below have to be reimplemented or kept in
 * sync between two callers.
 *
 * Returns { ok, reason } rather than throwing, so callers can report precisely
 * why nothing was sent.
 */
export async function sendRecoveryEmail(db, storeId, storeData, reference, sendEmail) {
  if (!isRecoveryActive(storeData)) return { ok: false, reason: 'not_enabled' }

  const snap = await ref(db, storeId, reference).get()
  if (!snap.exists) return { ok: false, reason: 'not_found' }

  const record = snap.data()
  if (record.recoveredAt) return { ok: false, reason: 'already_paid' }
  if (record.reminderSent === true) return { ok: false, reason: 'already_sent' }
  if (!record.customerEmail) return { ok: false, reason: 'no_email' }

  // Per CUSTOMER, not per checkout. Someone with two abandoned checkouts must
  // not receive two emails.
  const throttleRef = db
    .collection('stores').doc(storeId)
    .collection('reminderThrottle').doc(throttleKey(record.customerEmail))

  const throttleSnap = await throttleRef.get()
  if (throttleSnap.exists) {
    const last = throttleSnap.data().lastSentAt?.toMillis?.() || 0
    if (Date.now() - last < THROTTLE_WINDOW_MS) {
      return { ok: false, reason: 'throttled' }
    }
  }

  try {
    await sendEmail(
      record.customerEmail,
      `You left something behind at ${storeData.businessName || 'our store'}`,
      buildRecoveryHtml(storeData, record),
    )
  } catch (err) {
    console.error('[abandoned-checkout] send failed', err)
    return { ok: false, reason: 'send_failed' }
  }

  // Written only AFTER a successful send. Writing the throttle first would burn
  // the customer's 24 hour window on an email that never arrived.
  await snap.ref.update({
    reminderSent: true,
    reminderSentAt: Timestamp.now(),
    reminderCount: (Number(record.reminderCount) || 0) + 1,
  })
  await throttleRef.set({ lastSentAt: Timestamp.now() }, { merge: true })

  return { ok: true, reason: 'sent' }
}

// --------------------------------------------------------------- Template

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

/**
 * The recovery email.
 *
 * The incentive line is CONDITIONAL. If the store runs loyalty, it names the
 * real number of points that order would earn, computed from that store's own
 * configured rate. If it does not, the mail stays warm but promises nothing.
 * Inventing a discount would be making an offer on the vendor's behalf that they
 * never configured and would still have to honour.
 */
function buildRecoveryHtml(storeData, record) {
  const brand = esc(storeData.businessName || 'our store')
  const name = esc((record.customerName || '').split(' ')[0] || 'there')
  const slug = storeData.storeName || ''
  const link = `https://sellapage.com.ng/${encodeURIComponent(slug)}`

  const items = Array.isArray(record.cartItems) ? record.cartItems : []
  const rows = items.map((i) => `
    <tr>
      <td style="padding:8px 0;color:#374151;font-size:14px;">${esc(i.name)} x${Number(i.quantity) || 1}</td>
      <td style="padding:8px 0;color:#111827;font-size:14px;text-align:right;">${naira(Number(i.price) * (Number(i.quantity) || 1))}</td>
    </tr>`).join('')

  const loyaltyOn = storeData.loyaltyEnabled === true &&
    (storeData.hasPremiumFeatures ?? (storeData.plan === 'premium')) === true
  const earnRate = Number(storeData.loyaltyEarnRate) || 100
  const points = Math.floor((Number(record.subtotal) || 0) / earnRate)

  const incentive = loyaltyOn && points > 0
    ? `<p style="margin:0 0 20px 0;color:#166534;font-size:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
         Complete this order and you will earn <strong>${points} loyalty point${points === 1 ? '' : 's'}</strong> to spend next time.
       </p>`
    : `<p style="margin:0 0 20px 0;color:#6b7280;font-size:14px;">
         Your items are still waiting. It only takes a moment to finish.
       </p>`

  return `
    <div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;">
      <div style="background:#16a34a;padding:24px;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:bold;">${brand}</h1>
      </div>
      <div style="padding:32px;color:#111827;">
        <h2 style="font-size:20px;margin:0 0 12px 0;">Hello ${name}, you left something behind</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px 0;">
          You started an order with ${brand} but did not finish checking out. We have kept it for you.
        </p>
        ${items.length ? `
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px 0;">
          <h3 style="color:#374151;font-size:13px;font-weight:bold;margin:0 0 12px 0;">Still in your basket</h3>
          <table style="width:100%;border-collapse:collapse;">${rows}
            <tr>
              <td style="padding:12px 0 0 0;border-top:1px solid #e5e7eb;font-size:16px;font-weight:bold;">Total</td>
              <td style="padding:12px 0 0 0;border-top:1px solid #e5e7eb;font-size:16px;font-weight:bold;text-align:right;">${naira(record.grandTotal)}</td>
            </tr>
          </table>
        </div>` : ''}
        ${incentive}
        <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;font-weight:bold;border-radius:10px;font-size:15px;">
          Complete my order
        </a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px 0;"/>
        <p style="color:#9ca3af;font-size:11px;margin:0;">
          You are receiving this once because you started an order with ${brand}.
          If you did not mean to, you can ignore it and we will not email you about this again.
        </p>
      </div>
    </div>`
}

// --------------------------------------------------------------- Retention

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const SWEEP_CAP = 100

/**
 * Deletes records older than 30 days.
 *
 * Lazy rather than scheduled, matching the pattern already used for referral
 * pending balances and the store-secrets migrations. Two callers: the vendor
 * opening the tab (deterministic), and roughly one in ten record writes (which
 * catches stores whose vendor never opens it). Both fire and forget.
 *
 * Capped per pass so this can never become a large write burst on the free tier,
 * where a delete costs quota exactly like any other write.
 */
export async function sweepExpired(db, storeId) {
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - RETENTION_MS)
    const snap = await db
      .collection('stores').doc(storeId).collection(COLLECTION)
      .where('createdAt', '<', cutoff)
      .limit(SWEEP_CAP)
      .get()

    if (snap.empty) return 0

    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    return snap.size
  } catch (err) {
    console.error('[abandoned-checkout] sweep failed', err)
    return 0
  }
}
