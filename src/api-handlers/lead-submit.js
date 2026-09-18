// src/api-handlers/lead-submit.js
//
// Public, unauthenticated. The "Have a question?" form on every storefront.
//
// WHY THIS MOVED OFF THE BROWSER
// Leads used to be written straight from the customer's browser with the client
// SDK (src/firebase/leads.js), under an open `allow create` rule. That worked,
// but no server code ever saw a lead arrive, so there was nowhere to hang a
// notification: a customer could leave their number and the vendor would only
// find out the next time they happened to open the Leads tab. For a message
// that says "reply to me on WhatsApp", hours late is the same as never.
//
// It also let the browser choose storeName, so a lead could arrive labelled as
// any store. The name is now read from the store document.
//
// ABUSE MODEL, same layering as newsletter-subscribe.js
//   1. Honeypot field and a minimum fill time, answered with the same success a
//      person gets so a bot learns nothing.
//   2. Free in-memory limit per IP.
//   3. Durable per-IP and per-STORE daily limits. The per-store limit matters
//      more than it looks: every accepted lead now buzzes the vendor's phone,
//      so without it one script could ring a vendor's handset all night.
//   4. The same phone to the same store inside ten minutes is treated as a
//      double tap: success to the customer, no second record, no second push.
//
// Field shape is identical to what the client wrote before, so the Leads tab,
// store-data.js and Sella's context all read these documents unchanged.

import { getAdminDb } from './_lib/firebase-admin.js'
import { memoryRateLimit, durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { notifyStore } from './_lib/notifications.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_FILL_MS = 1500
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000
const LEAD_TYPES = ['product', 'service', 'general']

// Bounds match the old firestore.rules create rule exactly, so nothing that
// was accepted before is refused now.
const MAX_NAME = 200
const MAX_PHONE = 40
const MAX_INTEREST = 2000

const clean = (v, max) => String(v ?? '').trim().slice(0, max)

export default async function handler(req, res) {
  // Open CORS on purpose: vendors serve storefronts from their own custom
  // domains, and this form is on all of them. Same as checkout-initialize and
  // validate-discount, which the storefront also calls.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'invalid_json', message: 'Invalid request.' })
  }

  // Bot traps first: they cost nothing and short-circuit everything below.
  const elapsed = Number(body.elapsedMs)
  const trapped = String(body.hp || '').trim() !== ''
  const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS
  if (trapped || tooFast) return res.status(200).json({ success: true })

  const storeId = clean(body.storeId, 128)
  const name = clean(body.name, MAX_NAME)
  const phone = clean(body.phone, MAX_PHONE)
  const interest = clean(body.interest, MAX_INTEREST)
  const leadType = LEAD_TYPES.includes(body.leadType) ? body.leadType : 'general'

  if (!storeId || storeId.includes('/')) {
    return res.status(400).json({ error: 'invalid_store', message: 'Invalid request.' })
  }
  if (!name || !phone) {
    return res.status(400).json({ error: 'missing_fields', message: 'Please enter your name and phone number.' })
  }
  if (!/\d{6,}/.test(phone.replace(/[\s()+-]/g, ''))) {
    return res.status(400).json({ error: 'invalid_phone', message: 'Please enter a valid phone number.' })
  }

  const ip = clientKey(req)
  if (!memoryRateLimit('lead-submit', ip, 10, 60 * 60 * 1000)) {
    return tooManyRequests(res, 'Too many messages from this connection. Please try again later.')
  }

  try {
    const [perIp, perStore] = await Promise.all([
      durableRateLimit('lead_ip', ip, 20, DAY_MS),
      durableRateLimit('lead_store', storeId, 200, DAY_MS),
    ])
    if (!perIp || !perStore) {
      return tooManyRequests(res, 'Too many messages right now. Please try again later.')
    }

    const db = getAdminDb()
    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'store_not_found', message: 'This store could not be found.' })
    }
    const store = storeSnap.data() || {}
    const storeName = clean(store.businessName || store.storeName, 200)

    // Double-tap guard: one counter document per store and phone, allowing one
    // lead per window. Deliberately NOT a query over the store's leads, which
    // would read every lead a busy store has ever had on every submission.
    // Keyed on digits only, so "0801 234 5678" and "08012345678" are one person.
    const phoneKey = phone.replace(/\D/g, '').slice(-15)
    const firstInWindow = await durableRateLimit('lead_dup', `${storeId}_${phoneKey}`, 1, DUPLICATE_WINDOW_MS)
    if (!firstInWindow) return res.status(200).json({ success: true })

    const ref = await db.collection('leads').add({
      storeId,
      storeName,
      name,
      phone,
      interest,
      leadType,
      createdAt: new Date(),
    })

    // Never throws, and runs after the lead is safely saved: a notification
    // failure must never turn into "Could not send your message" for a
    // customer whose message was in fact received.
    //
    // The phone number is deliberately NOT in the push. Push text shows on a
    // locked screen, and the lead itself is one tap away in the app.
    await notifyStore(db, storeId, {
      type: 'new_lead',
      title: 'New lead 📩',
      body: interest
        ? `${name}: ${interest.slice(0, 100)}`
        : `${name} left their number and wants you to reach out.`,
      data: { leadId: ref.id, leadType },
    }, store)

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[lead-submit] error', err)
    return res.status(500).json({ error: 'server_error', message: 'Could not send your message. Please try again.' })
  }
}
