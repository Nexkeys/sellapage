// src/api-handlers/loyalty-public.js
// Unauthenticated loyalty endpoints, used by the storefront checkout.
//
// Deliberately a SEPARATE file from loyalty-vendor.js rather than one handler
// with an `action=` switch. Mixing public and authenticated branches in one file
// is how an auth check eventually goes missing on one path, and the thing being
// guarded here spends money.
//
// Two actions, both rate limited:
//   lookup  - given a code, return the balance so checkout can offer to spend it
//   recover - given an email, EMAIL the code back. Never returns it in the body.
import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import {
  getCardByCode,
  findCardByEmail,
  isLoyaltyActive,
  readLoyaltyConfig,
  formatCode,
} from './_lib/loyalty.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = {}
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const action = req.query.action || 'lookup'
  const { storeId } = body
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const db = getAdminDb()
    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })

    const storeData = storeSnap.data() || {}

    // Answers identically whether the store is not Premium or simply has the
    // feature off, so this cannot be used to probe which stores pay for what.
    if (!isLoyaltyActive(storeData)) {
      return res.status(200).json({ enabled: false })
    }

    const config = readLoyaltyConfig(storeData)

    if (action === 'lookup') {
      // A code is a bearer token for money, so this is the endpoint someone
      // would grind to find a live one. Tight limit per IP.
      if (!memoryRateLimit('loyalty-lookup', clientKey(req), 10, 60000)) {
        return tooManyRequests(res)
      }

      const card = await getCardByCode(db, storeId, body.code)

      // Same shape for "no such code" and "frozen card", so nothing here reveals
      // whether a given code exists.
      if (!card || card.frozen === true) {
        return res.status(200).json({ enabled: true, found: false })
      }

      const points = Number(card.points) || 0
      return res.status(200).json({
        enabled: true,
        found: true,
        code: card.id,
        points,
        redeemValue: config.redeemValue,
        minRedeem: config.minRedeem,
        maxValue: Math.floor(points * config.redeemValue),
        eligible: points >= config.minRedeem && points > 0,
      })
    }

    if (action === 'recover') {
      if (!memoryRateLimit('loyalty-recover', clientKey(req), 5, 300000)) {
        return tooManyRequests(res)
      }

      const email = String(body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email is required' })

      const card = await findCardByEmail(db, storeId, email)

      // The code is NEVER returned in this response, and the reply is identical
      // whether or not a card was found. Returning it would make this two oracles
      // at once: confirm which emails shop at a given store, and hand over a
      // token that spends money. Only the inbox owner learns anything.
      if (card && card.frozen !== true) {
        const brand = escapeHtml(storeData.businessName || 'Sellapage')
        sendEmail(
          email,
          `Your ${storeData.businessName || 'loyalty'} points code`,
          `
            <div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;">
              <div style="background:#16a34a;padding:24px;">
                <h1 style="color:#fff;font-size:22px;margin:0;font-weight:bold;">${brand}</h1>
              </div>
              <div style="padding:32px;color:#111827;">
                <h2 style="font-size:20px;margin:0 0 12px 0;">Here is your code again</h2>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
                  <p style="margin:0 0 6px 0;font-size:11px;color:#16a34a;font-weight:bold;letter-spacing:1px;">YOUR CODE</p>
                  <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:3px;color:#111827;">${formatCode(card.id)}</p>
                  <p style="margin:10px 0 0 0;font-size:13px;color:#6b7280;">Balance: ${Number(card.points) || 0} points</p>
                </div>
                <p style="color:#6b7280;font-size:13px;margin:0;">
                  If you did not ask for this, you can ignore it. Nothing has changed on your account.
                </p>
              </div>
            </div>
          `,
        ).catch(() => {})
      }

      return res.status(200).json({
        enabled: true,
        sent: true,
        message: 'If that email has a card with this store, we have sent the code to it.',
      })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[loyalty-public] error', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
