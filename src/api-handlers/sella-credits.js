// src/api-handlers/sella-credits.js
// Buying Sella credits, and the Sella billing history.
//
// POST /api/sella-credits { storeId, action, ... }
//   packs    -> { packs: [quote], canBuy, credits }
//   buy      -> { authorizationUrl, reference }     { packId }   owner + Premium only
//   verify   -> { status, message, credits? }       { reference } after returning from Paystack
//   history  -> { purchases: [...], credits }
//   receipt  -> PDF bytes                            { reference } paid purchases only
//   export   -> CSV bytes of the whole history
//
// Pricing and every payment check live in _lib/sella-topups.js. Credits are
// also granted by the Paystack webhook (paystack-webhook.js, transactionType
// "sella_credits"), so a vendor who closes the tab still gets them.
//
// Owner only, through resolveStoreAccess (standing convention): buying moves
// money and billing is an owner-only area, and the history shows payment cards.

import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { memoryRateLimit, tooManyRequests } from './_lib/rate-limit.js'
import { getBalance } from './_lib/sella-credits.js'
import { listQuotes, startPurchase, verifyPurchase, listPurchases, receiptPdf, PACKS } from './_lib/sella-topups.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }
  const storeId = String(body.storeId || '')
  const action = String(body.action || 'packs')
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!idToken) return res.status(401).json({ error: 'Please sign in again.' })
    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }

    const access = await resolveStoreAccess(decoded.uid, storeId, null, false)
    if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })
    if (access.role !== 'owner') return res.status(403).json({ error: 'Only the store owner can buy credits or see Sella billing.' })

    const db = getAdminDb()
    const store = (await db.collection('stores').doc(storeId).get()).data() || {}
    const isPremium = store.hasPremiumFeatures ?? (store.plan === 'premium')

    if (action === 'packs') {
      return res.status(200).json({ packs: listQuotes(), canBuy: isPremium, credits: await getBalance(db, storeId) })
    }

    if (action === 'buy') {
      if (!isPremium) return res.status(403).json({ error: 'Sella credits are available on the Premium plan.', premiumRequired: true })
      const packId = String(body.packId || '')
      if (!PACKS[packId]) return res.status(400).json({ error: 'Choose one of the credit packs.' })
      // A handful of attempts a minute is plenty for a person; more is a loop.
      if (!memoryRateLimit('sella-credits-buy', storeId, 5, 60000)) return tooManyRequests(res)
      const base = (process.env.APP_URL || 'https://www.sellapage.com.ng').replace(/\/$/, '')
      const r = await startPurchase(db, {
        storeId, store, packId, email: store.email, actorUid: decoded.uid,
        // Paystack appends &reference=... to this.
        callbackUrl: `${base}/dashboard?sellaCredits=1`,
      })
      if (!r.ok) return res.status(r.status).json({ error: r.error })
      return res.status(200).json({ authorizationUrl: r.authorizationUrl, reference: r.reference, quote: r.quote })
    }

    if (action === 'verify') {
      const r = await verifyPurchase(db, storeId, String(body.reference || ''))
      return res.status(200).json({ ...r, credits: await getBalance(db, storeId) })
    }

    if (action === 'history') {
      return res.status(200).json({ purchases: await listPurchases(db, storeId), credits: await getBalance(db, storeId), canBuy: isPremium })
    }

    if (action === 'receipt') {
      const file = await receiptPdf(db, storeId, String(body.reference || ''))
      if (!file) return res.status(404).json({ error: 'A receipt is only available for a completed payment.' })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(file.buffer)
    }

    if (action === 'export') {
      const rows = await listPurchases(db, storeId)
      const day = (ms) => (ms ? new Date(ms + 3600000).toISOString().slice(0, 10) : '')
      const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
      const lines = [['Date', 'Receipt', 'Pack', 'Credits', 'Price (NGN)', 'VAT (NGN)', 'Processing (NGN)', 'Total (NGN)', 'Status', 'Valid until', 'Reference']]
      for (const p of rows) {
        lines.push([day(p.paidAt || p.createdAt), p.receiptNumber, p.packName, p.credits, p.price, p.vat, p.processing, p.total, p.status, day(p.expiresAt), p.reference])
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="sella-credit-purchases-${day(Date.now())}.csv"`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send('﻿' + lines.map((r) => r.map(esc).join(',')).join('\r\n'))
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[sella-credits]', err?.message || err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
