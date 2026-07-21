// src/api-handlers/admin-sella-ai.js
// Super-admin visibility into Sella AI Business Partner usage across all vendors.
// GET ?action=usage  -> today's total + all-time total + per-store breakdown.

import { getAdminDb } from './_lib/firebase-admin.js'

const getTodayKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const adminToken = req.headers['x-admin-token']
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()
    const todayKey = getTodayKey()

    // All daily usage docs across every store (bounded; usage is one doc/store/day).
    const snap = await db.collectionGroup('sellaAiUsage').limit(2000).get()

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

    const storeIds = Object.keys(perStore)
    const storeDocs = await Promise.all(
      storeIds.slice(0, 200).map((id) =>
        db.collection('stores').doc(id).get().then((s) => ({ id, data: s.data(), exists: s.exists }))
      )
    )
    const nameById = {}
    storeDocs.forEach((s) => { if (s.exists) nameById[s.id] = s.data.businessName || s.data.storeName || s.id })

    const rows = storeIds
      .map((id) => ({
        storeId: id,
        businessName: nameById[id] || id,
        today: perStore[id].today,
        allTime: perStore[id].allTime,
        remainingToday: Math.max(50 - perStore[id].today, 0),
      }))
      .sort((a, b) => b.allTime - a.allTime)
      .slice(0, 100)

    return res.status(200).json({
      success: true,
      dailyLimit: 50,
      summary: {
        todayTotal,
        allTimeTotal,
        activeVendorsToday: activeToday,
        vendorsEverUsed: storeIds.length,
      },
      stores: rows,
    })
  } catch (err) {
    console.error('[admin-sella-ai] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
