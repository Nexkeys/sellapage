// src/api-handlers/marketplace-waitlist.js
//
// Dropshipping marketplace, Phase 0: "Join the waitlist" on the public
// /dropshipping page. POST only.
//
// TWO KINDS OF CALLER
//   - Signed in as a store OWNER (Authorization: Bearer <id token>): the
//     interest is recorded on the store itself (`marketplaceInterest`), which
//     is also what the Settings checkboxes and signup write. No waitlist
//     document, because the store already is the record. Email and name come
//     from the store, never from the request.
//   - Anyone else: one document per email in `marketplaceWaitlist` (server
//     only in firestore.rules).
//
// ABUSE MODEL, same layering as newsletter-subscribe.js for the anonymous path:
// honeypot + minimum fill time answered with a fake success, a free in-memory
// per-IP limit, then durable per-IP and global daily limits.
//
// IDEMPOTENT: joining again merges into the same record (roles are unioned,
// the first join date survives) and never confirms to a stranger whether an
// address was already on the list.
//
// NOTHING IS EMAILED, so this cannot be used to send mail to a stranger.

import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { getBearerToken, parseJsonBody } from './_lib/http.js'
import { memoryRateLimit, durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { normaliseNgMobile } from '../utils/phone.js'
import { MARKETPLACE_ROLES, interestFromRole, roleFromInterest, readInterest } from '../utils/marketplace.js'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_FILL_MS = 1500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Same id scheme as newsletterSubscribers, so one person is one record.
const idForEmail = (email) =>
  email.toLowerCase().replace(/[^a-z0-9@._+-]/g, '_').slice(0, 200) || 'unknown'

const mergeInterest = (a, b) => ({ supply: a.supply || b.supply, dropship: a.dropship || b.dropship })

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed.' })

  let body
  try {
    body = parseJsonBody(req) || {}
  } catch {
    return res.status(400).json({ error: 'invalid_json', message: 'Invalid request.' })
  }

  const role = MARKETPLACE_ROLES.includes(body.role) ? body.role : null
  if (!role) {
    return res.status(400).json({ error: 'invalid_role', field: 'role', message: 'Choose whether you want to supply, dropship or both.' })
  }

  const ip = clientKey(req)
  if (!memoryRateLimit('marketplace-waitlist', ip, 10, 60 * 60 * 1000)) {
    return tooManyRequests(res, 'Too many sign ups from this connection. Please try again later.')
  }

  try {
    const db = getAdminDb()

    // ---- signed-in store owner ----------------------------------------
    const idToken = getBearerToken(req)
    if (idToken) {
      let uid
      try {
        uid = (await getAdminAuth().verifyIdToken(idToken)).uid
      } catch {
        return res.status(401).json({ error: 'unauthorized', message: 'Your session has expired. Please sign in again.' })
      }
      const ref = db.collection('stores').doc(uid)
      const snap = await ref.get()
      // Staff and accounts without a store fall through to the public path
      // below, using the email they type, like any visitor.
      if (snap.exists) {
        const interest = mergeInterest(readInterest(snap.data()), interestFromRole(role))
        await ref.set({ marketplaceInterest: interest }, { merge: true })
        return res.status(200).json({ success: true, linked: true, role: roleFromInterest(interest) })
      }
    }

    // ---- public visitor ------------------------------------------------
    // Bot traps first: they cost nothing and short-circuit everything below.
    const elapsed = Number(body.elapsedMs)
    const trapped = String(body.hp || '').trim() !== ''
    const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS
    if (trapped || tooFast) return res.status(200).json({ success: true })

    const name = clean(body.name, 80)
    const email = clean(body.email, 160).toLowerCase()
    const sells = clean(body.sells, 120)
    const phoneRaw = clean(body.phone, 40)
    const phone = phoneRaw ? normaliseNgMobile(phoneRaw) : ''

    if (!name) return res.status(400).json({ error: 'missing_name', field: 'name', message: 'Please enter your name.' })
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'invalid_email', field: 'email', message: 'Please enter a valid email address.' })
    }
    if (phoneRaw && !phone) {
      return res.status(400).json({
        error: 'invalid_phone',
        field: 'phone',
        message: 'Enter a valid Nigerian mobile number, or leave it empty.',
      })
    }

    const [perIp, global] = await Promise.all([
      durableRateLimit('mkt_waitlist_ip', ip, 10, DAY_MS),
      durableRateLimit('mkt_waitlist_global', 'all', 500, DAY_MS),
    ])
    if (!perIp || !global) {
      return tooManyRequests(res, 'Too many sign ups right now. Please try again later.')
    }

    const ref = db.collection('marketplaceWaitlist').doc(idForEmail(email))
    const existing = await ref.get()
    const now = new Date()

    if (existing.exists) {
      const prev = existing.data()
      const interest = mergeInterest(interestFromRole(prev.role), interestFromRole(role))
      await ref.set(
        {
          role: roleFromInterest(interest),
          name,
          ...(phone ? { phone } : {}),
          ...(sells ? { sells } : {}),
          lastSeenAt: now,
        },
        { merge: true },
      )
      return res.status(200).json({ success: true })
    }

    await ref.set({
      email,
      name,
      role,
      phone: phone || '',
      sells,
      source: 'page',
      createdAt: now,
      lastSeenAt: now,
    })
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[marketplace-waitlist] error', err)
    return res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' })
  }
}
