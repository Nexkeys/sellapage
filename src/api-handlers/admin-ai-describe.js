// Admin console for the AI Description Engine (NVIDIA), which is a different
// thing from Sella AI (OpenRouter, admin-sella-ai.js). Read only.
//
// Two sources, on purpose:
//   - stores/{id}/aiUsage/{YYYY-MM-DD}: the per store daily counters the engine
//     has always written. These carry the full history, so totals and the "who
//     used it" list work from the moment this ships.
//   - aiDescribeLogs: one document per attempt, added with the logging change.
//     These carry the detail (model, key, speed, tokens, failures) and only
//     exist from that point on, which the response states plainly rather than
//     implying the engine was idle before.
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { describeKeysForAdmin } from './_lib/ai-describe-keys.js'
import { AI_DESCRIBE_LOGS, lagosDayKey } from './_lib/ai-describe-log.js'

const MAX_USAGE_DOCS = 20000
const MAX_LOGS = 2000
const DEFAULT_PAGE = 50

function lastDayKeys(todayKey, count) {
  const [y, m, d] = todayKey.split('-').map(Number)
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10))
}

const iso = (v) => v?.toDate?.()?.toISOString() || (typeof v === 'string' ? v : null)

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'ai-describe')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'summary'

    if (action === 'summary') {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 180)

      const [usageSnap, logsSnap] = await Promise.all([
        db.collectionGroup('aiUsage').select('count', 'plan', 'date').limit(MAX_USAGE_DOCS).get(),
        // Newest first, so a long history summarises the RECENT picture rather
        // than an arbitrary slice. Ordering on one field uses Firestore's
        // automatic single-field index, so nothing needs deploying.
        db.collection(AI_DESCRIBE_LOGS)
          .select('status', 'model', 'keyLabel', 'mode', 'durationMs', 'totalTokens', 'dayKey', 'createdAtMs', 'storeId')
          .orderBy('createdAtMs', 'desc')
          .limit(MAX_LOGS)
          .get(),
      ])

      const todayKey = lagosDayKey()
      const window = new Set(lastDayKeys(todayKey, days))
      const byDay = {}
      const byStore = {}
      let generationsAllTime = 0
      let generationsInWindow = 0

      usageSnap.docs.forEach((doc) => {
        const d = doc.data()
        const count = Number(d.count) || 0
        if (count <= 0) return
        const dayKey = d.date || doc.id
        const storeId = doc.ref.path.split('/')[1]
        generationsAllTime += count
        if (window.has(dayKey)) {
          generationsInWindow += count
          byDay[dayKey] = (byDay[dayKey] || 0) + count
        }
        const store = (byStore[storeId] ||= { storeId, total: 0, plan: d.plan || 'starter', lastDay: '' })
        store.total += count
        if (dayKey > store.lastDay) {
          store.lastDay = dayKey
          store.plan = d.plan || store.plan
        }
      })

      const series = lastDayKeys(todayKey, days).map((date) => ({ date, count: byDay[date] || 0 }))

      // Detail from the logs, which only cover requests made since logging shipped.
      const logs = logsSnap.docs.map((doc) => doc.data())
      const byKey = {}
      const byModel = {}
      const byStatus = {}
      const byMode = {}
      let durationSum = 0
      let durationCount = 0
      let tokenSum = 0
      logs.forEach((l) => {
        const status = l.status || 'unknown'
        byStatus[status] = (byStatus[status] || 0) + 1
        if (l.keyLabel) {
          const k = (byKey[l.keyLabel] ||= { label: l.keyLabel, total: 0, success: 0, failed: 0, tokens: 0 })
          k.total += 1
          if (status === 'success') k.success += 1
          else k.failed += 1
          k.tokens += Number(l.totalTokens) || 0
        }
        if (l.model) {
          const m = (byModel[l.model] ||= { model: l.model, total: 0, success: 0, failed: 0, msSum: 0, msCount: 0 })
          m.total += 1
          if (status === 'success') m.success += 1
          else m.failed += 1
          if (Number.isFinite(Number(l.durationMs))) { m.msSum += Number(l.durationMs); m.msCount += 1 }
        }
        if (l.mode) byMode[l.mode] = (byMode[l.mode] || 0) + 1
        if (status === 'success' && Number.isFinite(Number(l.durationMs))) {
          durationSum += Number(l.durationMs)
          durationCount += 1
        }
        tokenSum += Number(l.totalTokens) || 0
      })

      // Top stores, with names resolved only for the ones shown.
      const topStores = Object.values(byStore).sort((a, b) => b.total - a.total).slice(0, 10)
      const storeDocs = await Promise.all(topStores.map((s) => db.collection('stores').doc(s.storeId).get()))
      const top = topStores.map((s, i) => {
        const d = storeDocs[i]?.data() || {}
        return {
          ...s,
          storeName: d.storeName || d.handle || '',
          email: d.email || d.ownerEmail || '',
          plan: d.plan || s.plan,
        }
      })

      return res.status(200).json({
        success: true,
        summary: {
          generationsAllTime,
          generationsInWindow,
          days,
          today: byDay[todayKey] || 0,
          storesUsed: Object.keys(byStore).length,
          series,
          topStores: top,
          keys: describeKeysForAdmin().map((k) => ({ ...k, ...(byKey[k.label] || { total: 0, success: 0, failed: 0, tokens: 0 }) })),
          // A key that has logs but is no longer configured still shows, so a
          // removed key's history does not silently vanish.
          retiredKeys: Object.values(byKey).filter((k) => !describeKeysForAdmin().some((c) => c.label === k.label)),
          models: Object.values(byModel)
            .map((m) => ({ ...m, avgMs: m.msCount ? Math.round(m.msSum / m.msCount) : null }))
            .sort((a, b) => b.total - a.total),
          byStatus,
          byMode,
          avgDurationMs: durationCount ? Math.round(durationSum / durationCount) : null,
          tokensLogged: tokenSum,
          logCount: logs.length,
          logsTruncated: logsSnap.size >= MAX_LOGS,
          usageTruncated: usageSnap.size >= MAX_USAGE_DOCS,
        },
      })
    }

    if (action === 'logs') {
      // A nonsense limit falls back to the default rather than being clamped to
      // 1, which is what "?limit=-5" used to produce: one entry per page.
      const rawLimit = parseInt(req.query.limit)
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : DEFAULT_PAGE
      const page = Math.max(parseInt(req.query.page) || 1, 1)
      const status = String(req.query.status || '').trim()
      const keyLabel = String(req.query.key || '').trim()
      const mode = String(req.query.mode || '').trim()
      const search = String(req.query.search || '').trim().toLowerCase()

      // Newest first in the QUERY, not after the fact. Without this, Firestore
      // returns documents in id order (log ids are random), so once the
      // collection passed MAX_LOGS the window stopped being the newest entries
      // and page 1 could miss today's.
      //
      // Filtering and paging then happen inside that window, which keeps every
      // filter combination on one automatic index instead of a composite index
      // per filter. `truncated` says when a window was full, so the figure is
      // never silently partial.
      const snap = await db.collection(AI_DESCRIBE_LOGS)
        .orderBy('createdAtMs', 'desc')
        .limit(MAX_LOGS)
        .get()

      let rows = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          storeId: d.storeId || '',
          storeName: d.storeName || '',
          plan: d.plan || '',
          mode: d.mode || '',
          subject: d.subject || '',
          status: d.status || '',
          model: d.model || '',
          keyLabel: d.keyLabel || '',
          keyHint: d.keyHint || '',
          durationMs: d.durationMs ?? null,
          totalTokens: Number(d.totalTokens) || 0,
          attempts: Array.isArray(d.attempts) ? d.attempts : [],
          errorCode: d.errorCode || '',
          errorMessage: d.errorMessage || '',
          createdAt: iso(d.createdAt),
          createdAtMs: Number(d.createdAtMs) || 0,
        }
      })

      if (status) rows = rows.filter((r) => r.status === status)
      if (keyLabel) rows = rows.filter((r) => r.keyLabel === keyLabel)
      if (mode) rows = rows.filter((r) => r.mode === mode)
      if (search) {
        rows = rows.filter((r) =>
          r.storeName.toLowerCase().includes(search) ||
          r.storeId.toLowerCase().includes(search) ||
          r.subject.toLowerCase().includes(search) ||
          r.model.toLowerCase().includes(search))
      }

      rows.sort((a, b) => b.createdAtMs - a.createdAtMs)

      const total = rows.length
      const offset = (page - 1) * limit
      return res.status(200).json({
        success: true,
        logs: rows.slice(offset, offset + limit),
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        truncated: snap.size >= MAX_LOGS,
        windowSize: MAX_LOGS,
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-ai-describe] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
