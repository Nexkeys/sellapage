// src/api-handlers/tiktok-events-config.js
//
// Stores the vendor's TikTok Events API access token.
//
//   GET  ?action=get    is a token set?  (never returns the token itself)
//   POST ?action=save   save a token     (Premium only)
//   POST ?action=clear  remove it        (Premium only)
//
// WHY THIS NEEDS A HANDLER AT ALL, WHEN THE PIXEL ID DOES NOT
// `tiktokPixelId` is public by design - it is visible in the page source of
// every site that uses one - so the TikTok Pixel tab writes it straight from
// the browser with updateStore(), exactly like `metaPixelId`.
//
// The Events API token is the opposite. It can write conversion events into the
// vendor's advertising account, so it is a credential. Clients cannot write to
// stores/{id}/private/* (firestore.rules denies it outright), and it must never
// land on the world-readable store document - that is the exact mistake finding
// C-05 in Docs/Security-Reviews.MD was raised for. So it goes through here, on
// the Admin SDK, and lives in private/tiktokAds via _lib/store-secrets.js.
//
// THE TOKEN IS NEVER RETURNED. `get` answers only "is one set, and when was it
// saved". A vendor who loses their token regenerates it in TikTok Ads Manager;
// there is no reason for this endpoint to be able to hand it back, and every
// reason for it not to be.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import {
  getTikTokEventsToken,
  setTikTokEventsToken,
  clearTikTokEventsToken,
} from './_lib/store-secrets.js'

const TIKTOK_PLANS = new Set(['premium'])
const TAB_ID = 'tiktok-pixel'

/**
 * TikTok does not publish a fixed token format, so this checks for the things a
 * vendor actually pastes by mistake rather than pretending to know the shape:
 * a whole curl command, a URL, the pixel id, or an empty box.
 */
function validateToken(raw) {
  const token = String(raw || '').trim()
  if (!token) return { ok: false, message: 'Paste your Events API access token.' }
  if (/\s/.test(token)) {
    return { ok: false, message: 'That contains spaces or line breaks, so it is not just the token. Copy only the token itself, with nothing around it.' }
  }
  if (/^https?:\/\//i.test(token)) {
    return { ok: false, message: 'That is a web address, not an access token. The token is the long code TikTok shows once when you click Generate Access Token.' }
  }
  if (/^[A-Z0-9]{20}$/.test(token.toUpperCase())) {
    return { ok: false, message: 'That looks like your Pixel ID, not the Events API token. The Pixel ID goes in the field above; the token is longer.' }
  }
  if (token.length < 20 || token.length > 512) {
    return { ok: false, message: `That does not look like an access token. TikTok's tokens are long. You pasted ${token.length} characters.` }
  }
  return { ok: true, token }
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = req.query.action || 'get'

  try {
    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.replace('Bearer ', '').trim()
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!decoded?.uid) return res.status(401).json({ error: 'Unauthorized' })

    let body = {}
    if (req.method === 'POST') {
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }

    // Falls back to the caller's own uid so an owner never has to send it.
    const storeId = String(body.storeId || req.query.storeId || decoded.uid)

    // Standing convention (Changelog-README.md, 2026-07-29): authorize through
    // resolveStoreAccess, never a raw uid === storeId comparison, so this tab is
    // staff-capable the moment an owner grants it in the Role Builder.
    const needsWrite = action === 'save' || action === 'clear'
    const access = await resolveStoreAccess(decoded.uid, storeId, TAB_ID, needsWrite)
    if (!access.allowed) {
      return res.status(403).json({
        error: 'forbidden',
        message: access.reason === 'read_only'
          ? 'Your role has view-only access to this section.'
          : 'You do not have access to this store.',
      })
    }

    const db = getAdminDb()
    const snap = await db.collection('stores').doc(storeId).get()
    if (!snap.exists) return res.status(404).json({ error: 'Store not found' })

    const store = snap.data()
    const plan = String(store.plan || 'starter').toLowerCase()
    const eligible = TIKTOK_PLANS.has(plan)

    if (action === 'get') {
      const existing = await getTikTokEventsToken(db, storeId)
      const meta = await db
        .collection('stores').doc(storeId)
        .collection('private').doc('tiktokAds').get()
      return res.status(200).json({
        success: true,
        plan,
        eligible,
        // Deliberately a boolean. The token itself is never sent back.
        hasToken: !!existing,
        updatedAt: meta.exists ? meta.data().updatedAt || null : null,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    // Plan gate enforced HERE, not only in the UI. The tab being hidden is a
    // convenience; this is the control.
    if (!eligible) {
      return res.status(403).json({
        error: 'plan_required',
        message: 'Server-side TikTok tracking is a Premium feature.',
      })
    }

    if (action === 'save') {
      const check = validateToken(body.eventsToken)
      if (!check.ok) return res.status(400).json({ error: 'invalid_token', message: check.message })

      await setTikTokEventsToken(db, storeId, check.token)
      return res.status(200).json({
        success: true,
        hasToken: true,
        message: 'Saved. Paid orders will now be sent to TikTok from our server as well as the browser.',
      })
    }

    if (action === 'clear') {
      await clearTikTokEventsToken(db, storeId)
      return res.status(200).json({
        success: true,
        hasToken: false,
        message: 'Removed. Only the browser pixel is sending events now.',
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[tiktok-events-config] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
