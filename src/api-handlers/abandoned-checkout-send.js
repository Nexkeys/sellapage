// src/api-handlers/abandoned-checkout-send.js
// Sends one recovery email, triggered by the vendor pressing Send in the
// dashboard. Manual by design for now.
//
// This handler is deliberately thin. Every rule that protects the customer
// (Premium, toggle on, not already paid, not already reminded, and the 24 hour
// per-customer throttle) lives inside sendRecoveryEmail in _lib. If automated
// recovery is added later, the cron calls that same function and none of those
// guarantees have to be duplicated or kept in sync between two callers.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { sendEmail } from './_lib/send-email.js'
import { sendRecoveryEmail } from './_lib/abandoned-checkout.js'

// Human readable reasons. The vendor pressed a button, so "nothing happened"
// is never an acceptable answer.
const REASONS = {
  not_enabled: 'Abandoned checkout recovery is switched off for this store.',
  not_found: 'That checkout record no longer exists.',
  already_paid: 'This customer has already completed their order.',
  already_sent: 'A reminder has already been sent for this checkout.',
  no_email: 'No email address was captured for this checkout.',
  throttled: 'This customer was already emailed in the last 24 hours. Try again tomorrow.',
  send_failed: 'The email could not be sent. Please try again shortly.',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { storeId, reference } = body
  if (!storeId || !reference) {
    return res.status(400).json({ error: 'storeId and reference are required' })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Sending mail to a customer is a write-shaped action, so it needs write
    // access to the orders tab rather than read.
    const access = await resolveStoreAccess(decoded.uid, storeId, 'orders', true)
    if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })

    // WhatsApp is a DIFFERENT thing from the email, and is recorded separately
    // on purpose. The message leaves the vendor's own WhatsApp via a wa.me link,
    // so all we can honestly say is that they opened it. We cannot confirm it was
    // sent, and we cannot enforce the 24 hour throttle the way we do for email,
    // because nothing goes through our server. Recording it as `reminderSent`
    // would claim more than we know and would also lock them out of the email.
    if (req.query.action === 'log-whatsapp') {
      try {
        await db
          .collection('stores').doc(storeId)
          .collection('abandonedCheckouts').doc(reference)
          .update({ whatsappClickedAt: new Date() })
      } catch {
        // Record gone or already swept. Nothing to log, nothing to report.
      }
      return res.status(200).json({ success: true })
    }

    const result = await sendRecoveryEmail(
      db,
      storeId,
      storeSnap.data() || {},
      reference,
      sendEmail,
    )

    if (!result.ok) {
      return res.status(400).json({
        error: result.reason,
        message: REASONS[result.reason] || 'The reminder could not be sent.',
      })
    }

    return res.status(200).json({ success: true, message: 'Reminder sent.' })
  } catch (err) {
    console.error('[abandoned-checkout-send] error', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
