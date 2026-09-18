// src/api-handlers/newsletter-subscribe.js
//
// Public, unauthenticated. The "Get free tips on selling" box in the footer.
// Until now that box did nothing at all: it had no handler, so every address
// typed into it was thrown away.
//
// ABUSE MODEL, same layering as partner-enquiry.js
//   1. Honeypot field and a minimum fill time, answered with the same success a
//      person gets so a bot learns nothing.
//   2. Free in-memory limit per IP.
//   3. Durable per-IP and global daily limits, because this writes to Firestore
//      and the Spark plan's write quota is an outage when it runs out.
//
// IDEMPOTENT ON PURPOSE. The document id IS the address, so subscribing twice
// updates one record instead of filling the list with duplicates, and the
// original join date survives.
//
// NO CONFIRMATION EMAIL IS SENT. Nothing here mails the address, so this cannot
// be used to bomb a stranger's inbox with "welcome" messages.

import { getAdminDb } from './_lib/firebase-admin.js'
import { memoryRateLimit, durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_FILL_MS = 1500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SOURCES = ['footer', 'home', 'blog', 'other']

/**
 * A Firestore document id built from the address.
 *
 * Ids cannot contain "/" and cannot be "." or "..", and a stray character must
 * never split one person across two records, so everything outside a safe set
 * collapses to "_".
 */
const idForEmail = (email) =>
  email.toLowerCase().replace(/[^a-z0-9@._+-]/g, '_').slice(0, 200) || 'unknown'

export default async function handler(req, res) {
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

  const email = String(body.email || '').trim().toLowerCase().slice(0, 160)
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Please enter a valid email address.' })
  }

  const source = SOURCES.includes(body.source) ? body.source : 'other'
  const ip = clientKey(req)

  if (!memoryRateLimit('newsletter-subscribe', ip, 10, 60 * 60 * 1000)) {
    return tooManyRequests(res, 'Too many sign ups from this connection. Please try again later.')
  }

  try {
    const [perIp, global] = await Promise.all([
      durableRateLimit('newsletter_ip', ip, 10, DAY_MS),
      durableRateLimit('newsletter_global', 'all', 500, DAY_MS),
    ])
    if (!perIp || !global) {
      return tooManyRequests(res, 'Too many sign ups right now. Please try again later.')
    }

    const db = getAdminDb()
    const ref = db.collection('newsletterSubscribers').doc(idForEmail(email))

    // Signing up again is a fresh, explicit opt-in, so it lifts an earlier
    // unsubscribe (emailSuppressions uses the same id scheme). Without this a
    // person who unsubscribed once could never receive the newsletter again.
    await db.collection('emailSuppressions').doc(idForEmail(email)).delete().catch(() => {})
    const existing = await ref.get()
    const now = new Date()

    if (existing.exists) {
      // Already on the list. Touch the record, tell them it worked, and say
      // nothing that confirms to a stranger whether an address is subscribed.
      await ref.set({ lastSeenAt: now, status: 'subscribed' }, { merge: true })
      return res.status(200).json({ success: true })
    }

    await ref.set({
      email,
      source,
      status: 'subscribed',
      createdAt: now,
      lastSeenAt: now,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[newsletter-subscribe] error', err)
    return res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' })
  }
}
