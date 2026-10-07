// src/api-handlers/admin-sella-ai.js
// Super-admin visibility into Sella AI Business Partner usage across all vendors.
// GET ?action=usage  -> today's total + all-time total + per-store breakdown.

import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { monthKey, MONTHLY_CREDITS, NAIRA_PER_CREDIT, NGN_PER_USD } from './_lib/sella-credits.js'

// Mirrors DAILY_LIMIT in sella-ai.js. Vendors are now metered in monthly
// credits (_lib/sella-credits.js); this daily cap is only an abuse guard.
const DAILY_GUARD = 300

const getTodayKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'sella-ai')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const todayKey = getTodayKey()

    // All daily usage docs across every store (bounded; usage is one doc/store/day).
    // Credits: stores/{id}/sellaCredits/{YYYY-MM} (the month's pool, with the
    // real AI cost in USD) and stores/{id}/sellaCredits/topup (bought lots).
    const [snap, creditSnap] = await Promise.all([
      db.collectionGroup('sellaAiUsage').limit(2000).get(),
      db.collectionGroup('sellaCredits').limit(5000).get(),
    ])

    let todayTotal = 0
    let allTimeTotal = 0
    let activeToday = 0
    const perStore = {} // storeId -> { today, allTime }

    snap.docs.forEach((doc) => {
      const parts = doc.ref.path.split('/') // stores/{storeId}/sellaAiUsage/{dateKey}
      const storeId = parts[1]
      const count = Number(doc.data().count || 0)
      allTimeTotal += count
      if (!perStore[storeId]) perStore[storeId] = { today: 0, allTime: 0 }
      perStore[storeId].allTime += count
      if (doc.id === todayKey) {
        todayTotal += count
        activeToday += 1
        perStore[storeId].today += count
      }
    })

    // Counted before credits are merged in, so "ever used" stays what it was.
    const vendorsEverUsed = Object.keys(perStore).length

    // This month's credits, platform-wide and per store.
    const month = monthKey()
    const credits = { month, used: 0, costUsd: 0, requests: 0, byKind: {}, topupLeft: 0, storesWithTopup: 0 }
    const creditByStore = {}
    const now = Date.now()
    creditSnap.docs.forEach((doc) => {
      const storeId = doc.ref.path.split('/')[1]
      const d = doc.data() || {}
      if (doc.id === month) {
        const used = Number(d.used) || 0
        credits.used += used
        credits.costUsd += Number(d.costUsd) || 0
        credits.requests += Number(d.requests) || 0
        for (const [k, v] of Object.entries(d.byKind || {})) credits.byKind[k] = (credits.byKind[k] || 0) + (Number(v) || 0)
        creditByStore[storeId] = { ...(creditByStore[storeId] || {}), used, costUsd: Number(d.costUsd) || 0 }
        if (!perStore[storeId]) perStore[storeId] = { today: 0, allTime: 0 }
      } else if (doc.id === 'topup') {
        const lots = Array.isArray(d.lots) ? d.lots : []
        const left = lots.filter((l) => Number(l.remaining) > 0 && (!l.expiresAt || l.expiresAt > now)).reduce((n, l) => n + Number(l.remaining), 0)
          + (Number(d.balance) || 0)
        if (left > 0) {
          credits.topupLeft += left
          credits.storesWithTopup += 1
          creditByStore[storeId] = { ...(creditByStore[storeId] || {}), topupLeft: left }
        }
      }
    })
    const round = (n) => Math.round(n * 100) / 100
    credits.used = round(credits.used)
    credits.costUsd = round(credits.costUsd)
    credits.costNaira = Math.round(credits.costUsd * NGN_PER_USD)
    credits.topupLeft = round(credits.topupLeft)
    credits.monthlyAllowance = MONTHLY_CREDITS
    credits.nairaPerCredit = NAIRA_PER_CREDIT

    const storeIds = Object.keys(perStore)
    const ranked = storeIds
      .map((id) => ({
        storeId: id,
        today: perStore[id].today,
        allTime: perStore[id].allTime,
        remainingToday: Math.max(DAILY_GUARD - perStore[id].today, 0),
        creditsUsed: round(creditByStore[id]?.used || 0),
        creditsLeft: round(Math.max(MONTHLY_CREDITS - (creditByStore[id]?.used || 0), 0)),
        costUsd: round(creditByStore[id]?.costUsd || 0),
        topupLeft: round(creditByStore[id]?.topupLeft || 0),
      }))
      .sort((a, b) => b.creditsUsed - a.creditsUsed || b.allTime - a.allTime)
      .slice(0, 100)

    // Names only for the rows shown.
    const storeDocs = await Promise.all(ranked.map((r) => db.collection('stores').doc(r.storeId).get()))
    const rows = ranked.map((r, i) => {
      const d = storeDocs[i]?.exists ? storeDocs[i].data() || {} : {}
      return { ...r, businessName: d.businessName || d.storeName || r.storeId, storeName: d.storeName || '', plan: d.plan || 'starter' }
    })

    return res.status(200).json({
      success: true,
      dailyLimit: DAILY_GUARD,
      summary: {
        todayTotal,
        allTimeTotal,
        activeVendorsToday: activeToday,
        vendorsEverUsed,
      },
      stores: rows,
      credits,
    })
  } catch (err) {
    console.error('[admin-sella-ai] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
