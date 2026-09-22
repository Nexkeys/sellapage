// AI Description Engine console.
//
// This is the NVIDIA description/job-post engine vendors use from the "Generate
// with AI" button, NOT Sella AI (that has its own tab). It answers: how much is
// it used, by whom, which model and which API key served it, how fast, and what
// is failing.
//
// Two reading rules, stated on screen rather than implied:
//   - Totals come from the per store daily counters, which go back to the
//     beginning.
//   - Model, key, speed and failure detail come from the per request log, which
//     only starts from the day logging shipped.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Sparkles, KeyRound, Loader2, RefreshCw, AlertCircle, Search, Store, Cpu, Timer, X,
} from 'lucide-react'

const STATUS_STYLES = {
  success: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  rate_limited: 'bg-amber-50 text-amber-700 border-amber-200',
}
const STATUS_LABEL = { success: 'Delivered', failed: 'Failed', rate_limited: 'Rate limited' }
const MODE_LABEL = { description: 'Description', job: 'Job post' }

const shortModel = (m) => String(m || '').split('/').pop() || '-'
const ms = (v) => (v === null || v === undefined ? '-' : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)
const when = (iso, msFallback) => {
  const d = iso ? new Date(iso) : msFallback ? new Date(msFallback) : null
  if (!d || isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Card({ label, value, sub, icon: Icon, tone = 'gray' }) {
  const tones = { green: 'text-green-600', gray: 'text-gray-900', red: 'text-red-600' }
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon size={11} className="text-gray-400" /> : null}
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-black ${tones[tone]}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] font-medium text-gray-400 leading-snug">{sub}</p> : null}
    </div>
  )
}

export default function AiDescribeConsole({ authHeaders }) {
  const [summary, setSummary] = useState(null)
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [logLoading, setLogLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [truncated, setTruncated] = useState(false)

  const loadSummary = useCallback(async () => {
    const headers = await authHeaders()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin-ai-describe?action=summary&days=30', { headers })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not load the AI engine summary.')
      setSummary(d.summary)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  const loadLogs = useCallback(async () => {
    const headers = await authHeaders()
    setLogLoading(true)
    try {
      const params = new URLSearchParams({ action: 'logs', limit: '25', page: String(page) })
      if (status) params.set('status', status)
      if (keyFilter) params.set('key', keyFilter)
      if (search.trim()) params.set('search', search.trim())
      const r = await fetch(`/api/admin-ai-describe?${params}`, { headers })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not load the log.')
      setLogs(d.logs || [])
      setMeta({ page: d.page || 1, totalPages: d.totalPages || 1, total: d.total || 0 })
      setTruncated(Boolean(d.truncated))
    } catch (e) {
      setError(e.message)
    } finally {
      setLogLoading(false)
    }
  }, [authHeaders, page, status, keyFilter, search])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadLogs() }, [loadLogs])

  const refresh = () => { loadSummary(); loadLogs() }

  const keys = summary?.keys || []
  const retired = summary?.retiredKeys || []
  const models = summary?.models || []
  const top = summary?.topStores || []
  const failures = useMemo(
    () => Object.entries(summary?.byStatus || {}).filter(([s]) => s !== 'success').reduce((n, [, c]) => n + c, 0),
    [summary],
  )

  if (loading && !summary) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100/70" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">AI Description Engine</h2>
            <p className="text-[10px] text-gray-400">Product and service descriptions, and job posts. Separate from Sella AI.</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading || logLoading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200"
        >
          {loading || logLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          <p className="flex-1 text-xs font-medium text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Descriptions generated" value={Number(summary?.generationsAllTime || 0).toLocaleString()} sub="All time" icon={Sparkles} tone="green" />
        <Card label="Last 30 days" value={Number(summary?.generationsInWindow || 0).toLocaleString()} sub={`${Number(summary?.today || 0).toLocaleString()} today`} icon={Sparkles} />
        <Card label="Vendors using it" value={Number(summary?.storesUsed || 0).toLocaleString()} sub="Stores that generated at least once" icon={Store} />
        <Card label="Average speed" value={summary?.avgDurationMs ? ms(summary.avgDurationMs) : '-'} sub={failures ? `${failures.toLocaleString()} failed of ${Number(summary?.logCount || 0).toLocaleString()} logged` : 'No failures logged'} icon={Timer} tone={failures ? 'red' : 'gray'} />
      </div>

      {/* Keys: the whole point of the registry, one row each */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
          <KeyRound size={12} className="text-gray-400" />
          <h3 className="text-xs font-bold text-gray-800">API keys</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {keys.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">No API key configured. The engine cannot run.</p>}
          {keys.map((k) => (
            <div key={k.env} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold capitalize text-gray-900">{k.label}</p>
                <p className="font-mono text-[10px] text-gray-400">{k.env} · {k.hint}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-gray-400">Requests</p>
                  <p className="text-xs font-black text-gray-900">{Number(k.total || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-gray-400">Failed</p>
                  <p className={`text-xs font-black ${k.failed ? 'text-red-600' : 'text-gray-400'}`}>{Number(k.failed || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-gray-400">Tokens</p>
                  <p className="text-xs font-black text-gray-900">{Number(k.tokens || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {retired.map((k) => (
            <div key={`retired-${k.label}`} className="flex items-center justify-between gap-2 bg-gray-50/60 px-4 py-2">
              <p className="text-[11px] font-semibold capitalize text-gray-500">{k.label} <span className="font-normal text-gray-400">(no longer configured)</span></p>
              <p className="text-[11px] font-bold text-gray-500">{Number(k.total || 0).toLocaleString()} requests</p>
            </div>
          ))}
        </div>
        <p className="border-t border-gray-50 px-4 py-2 text-[10px] text-gray-400">
          Add another key as NVIDIA_API_KEY_2 (or NVIDIA_API_KEY_BACKUP) in Vercel. It appears here and the engine fails over to it automatically.
        </p>
      </div>

      {models.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
            <Cpu size={12} className="text-gray-400" />
            <h3 className="text-xs font-bold text-gray-800">Models</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {models.map((m) => (
              <div key={m.model} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <p className="min-w-0 truncate font-mono text-[11px] text-gray-700">{shortModel(m.model)}</p>
                <p className="text-[11px] text-gray-500">
                  <span className="font-bold text-gray-900">{Number(m.total).toLocaleString()}</span> calls
                  {m.failed ? <span className="text-red-600"> · {m.failed} failed</span> : null}
                  {m.avgMs ? ` · ${ms(m.avgMs)} avg` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-xs font-bold text-gray-800">Vendors using it most</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {top.map((s, i) => (
              <div key={s.storeId} className="flex items-center justify-between gap-2 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-gray-900">{i + 1}. {s.storeName || s.storeId}</p>
                  <p className="truncate text-[10px] text-gray-400">{s.email || s.storeId} · last used {s.lastDay || '-'}</p>
                </div>
                <p className="shrink-0 text-xs font-black text-gray-900">{Number(s.total).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The log itself */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
          <h3 className="text-xs font-bold text-gray-800">Generation log</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
              <Search size={11} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Store or item"
                className="w-28 bg-transparent text-[11px] font-medium outline-none placeholder-gray-400 sm:w-40"
              />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium outline-none">
              <option value="">All statuses</option>
              <option value="success">Delivered</option>
              <option value="failed">Failed</option>
              <option value="rate_limited">Rate limited</option>
            </select>
            {keys.length > 1 && (
              <select value={keyFilter} onChange={(e) => { setKeyFilter(e.target.value); setPage(1) }} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium outline-none">
                <option value="">All keys</option>
                {keys.map((k) => <option key={k.env} value={k.label}>{k.label}</option>)}
              </select>
            )}
          </div>
        </div>

        {logLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-300" /></div>}

        {!logLoading && logs.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Sparkles size={18} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-gray-900">No generations logged yet</p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {summary?.generationsAllTime ? 'Older generations were counted before logging existed. New ones appear here.' : 'Nothing has been generated yet.'}
            </p>
          </div>
        )}

        {!logLoading && logs.length > 0 && (
          <>
            {/* Phones: one card per entry. A table cannot be read at 390px. */}
            <div className="divide-y divide-gray-50 lg:hidden">
              {logs.map((l) => (
                <button key={l.id} type="button" onClick={() => setOpenId(openId === l.id ? null : l.id)} className="w-full px-4 py-2.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-gray-900">{l.storeName || l.storeId || 'Unknown store'}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${STATUS_STYLES[l.status] || 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      {STATUS_LABEL[l.status] || l.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500">{l.subject || '-'}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {MODE_LABEL[l.mode] || l.mode} · {shortModel(l.model)} · {l.keyLabel || 'no key'} · {ms(l.durationMs)} · {when(l.createdAt, l.createdAtMs)}
                  </p>
                  {openId === l.id && (
                    <div className="mt-2 rounded-lg bg-gray-50 p-2">
                      <p className="text-[10px] text-gray-500">Tokens: {l.totalTokens || 0}</p>
                      {l.errorMessage && <p className="mt-1 text-[10px] text-red-600">{l.errorCode}: {l.errorMessage}</p>}
                      {l.attempts?.length > 1 && (
                        <p className="mt-1 text-[10px] text-gray-500">
                          Tried: {l.attempts.map((a) => `${shortModel(a.model)}/${a.keyLabel} ${a.outcome}`).join(' → ')}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80 text-[9px] font-black uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Model</th>
                    <th className="px-4 py-2">Key</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Speed</th>
                    <th className="px-4 py-2 text-right">Tokens</th>
                    <th className="px-4 py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((l) => (
                    <tr key={l.id} className="cursor-pointer hover:bg-gray-50/60" onClick={() => setOpenId(openId === l.id ? null : l.id)}>
                      <td className="px-4 py-2">
                        <p className="max-w-[140px] truncate font-bold text-gray-900">{l.storeName || l.storeId || '-'}</p>
                        <p className="text-[9px] text-gray-400">{l.plan}</p>
                      </td>
                      <td className="px-4 py-2"><p className="max-w-[180px] truncate text-gray-600">{l.subject || '-'}</p>
                        {openId === l.id && l.errorMessage ? <p className="max-w-[240px] truncate text-[10px] text-red-600">{l.errorCode}: {l.errorMessage}</p> : null}
                        {openId === l.id && l.attempts?.length > 1 ? <p className="max-w-[240px] truncate text-[10px] text-gray-400">{l.attempts.map((a) => `${shortModel(a.model)}/${a.keyLabel} ${a.outcome}`).join(' → ')}</p> : null}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{MODE_LABEL[l.mode] || l.mode}</td>
                      <td className="px-4 py-2"><span className="font-mono text-[10px] text-gray-600">{shortModel(l.model)}</span></td>
                      <td className="px-4 py-2 capitalize text-gray-600">{l.keyLabel || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${STATUS_STYLES[l.status] || 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                          {STATUS_LABEL[l.status] || l.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{ms(l.durationMs)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{Number(l.totalTokens || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-[10px] text-gray-400">{when(l.createdAt, l.createdAtMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-center text-[10px] font-semibold text-gray-500">
                {meta.page}/{meta.totalPages} · {Number(meta.total).toLocaleString()} entries
                {truncated ? <span className="block font-normal text-gray-400">newest 2,000 only</span> : null}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-[10px] leading-snug text-gray-400">
        Totals count every generation ever made. Model, key, speed and failure detail come from the
        per request log, which starts from the day logging was added, so older generations are counted
        but have no log entry.
      </p>
    </div>
  )
}
