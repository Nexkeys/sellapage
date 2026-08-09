// src/api-handlers/_lib/rate-limit.js
// Two-tier rate limiting, designed around the Firebase Spark (free) plan.
//
// WHY TWO TIERS
// Spark allows 50,000 reads and 20,000 writes per day, and with no Blaze/PAYG
// billing attached, exceeding those does not cost money — it stops the database
// until midnight Pacific. A limiter that writes a Firestore document on every
// request would therefore consume the very quota it exists to protect, and
// under a flood it would *accelerate* the outage it is meant to prevent.
//
//   Tier 1 (memoryRateLimit) — per-instance in-memory counter. Costs nothing.
//     Imperfect: Vercel runs several concurrent instances and cold starts reset
//     the map, so it under-counts. That's an acceptable trade: it absorbs the
//     bulk of naive floods for free, which is what matters on a free tier.
//
//   Tier 2 (durableRateLimit) — Firestore-backed, accurate across instances.
//     Costs 1 read + 1 write per call, so it is reserved for endpoints where a
//     bypass is genuinely expensive (paid third-party APIs, money movement,
//     credential brute force).
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './firebase-admin.js'

/**
 * Best-effort caller identity: the authenticated uid where available,
 * otherwise the client IP.
 *
 * Note X-Forwarded-For is client-supplied and therefore spoofable; it is used
 * here only for rate limiting (where the worst case is an attacker rotating the
 * header to evade a limit) and must not be relied on for audit or authorization.
 */
export function clientKey(req) {
  const fwd = req.headers['x-forwarded-for']
  const ip = fwd ? String(fwd).split(',')[0].trim() : req.socket?.remoteAddress
  return ip || 'unknown'
}

const buckets = new Map()

/**
 * Tier 1 — free, in-memory, per warm instance.
 * @returns {boolean} true if the call is allowed
 */
export function memoryRateLimit(bucket, key, max, windowMs) {
  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const id = `${bucket}:${key}:${window}`

  const hits = (buckets.get(id) || 0) + 1
  buckets.set(id, hits)

  // Opportunistic sweep so a long-lived warm instance can't grow unbounded.
  if (buckets.size > 5000) {
    for (const k of buckets.keys()) {
      const w = Number(k.slice(k.lastIndexOf(':') + 1))
      if (w < window) buckets.delete(k)
    }
  }

  return hits <= max
}

/**
 * Tier 2 — durable and accurate across instances. Costs 1 read + 1 write.
 * Use sparingly; see the note at the top of this file.
 * @returns {Promise<boolean>} true if the call is allowed
 */
export async function durableRateLimit(bucket, key, max, windowMs) {
  const db = getAdminDb()
  const window = Math.floor(Date.now() / windowMs)
  const ref = db.collection('rateLimits').doc(`${bucket}_${key}_${window}`)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const count = snap.exists ? (snap.data().count || 0) : 0
      if (count >= max) return false
      tx.set(
        ref,
        {
          count: count + 1,
          expiresAt: (window + 1) * windowMs,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return true
    })
  } catch (err) {
    // Fail open: a limiter outage must not take down checkout or bank setup.
    console.error('[rate-limit] durable check failed, allowing request:', err.message)
    return true
  }
}

/** Standard 429 response. */
export function tooManyRequests(res, message = 'Too many requests. Please slow down and try again.') {
  return res.status(429).json({ error: 'rate_limited', message })
}
