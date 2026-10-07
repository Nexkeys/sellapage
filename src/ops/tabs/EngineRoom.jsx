// src/ops/tabs/EngineRoom.jsx
//
// AI Description Engine (NVIDIA, separate from Sella): is it answering, how
// fast, which API key and model is doing the work, who uses it most, and every
// request with its errors (/api/admin-ai-describe summary + logs). Read only.
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Sparkles, Gauge, KeyRound, Cpu, Store, ChevronDown, AlertTriangle } from 'lucide-react'
import { useOpsData, Ring } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { Segmented, Chips, Pager, SearchBox, PlanPill, Pill, Empty, Notice, CountUp, Meter, useDebounced, timeAgo, fmtDateTime, title } from './kit'

const STATUS = { success: ['Delivered', 'green'], failed: ['Failed', 'red'], rate_limited: ['Rate limited', 'amber'] }
const ms = (v) => (v == null ? '-' : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })

function LogRow({ l }) {
  const [open, setOpen] = useState(false)
  const [label, tone] = STATUS[l.status] || [title(l.status), 'slate']
  return (
    <li className="border-b border-dash-line last:border-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_90px_80px_20px]">
        <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-dash-ink">{l.subject || 'Untitled item'}</span><span className="block truncate text-[11.5px] text-slate-500">{l.storeName || l.storeId} · {title(l.mode) || 'describe'} · {timeAgo(l.createdAt || l.createdAtMs)}</span></span>
        <span className="hidden min-w-0 truncate font-mono text-[11.5px] text-slate-500 md:block">{l.model || '-'}</span>
        <span className="hidden text-right text-[12px] tabular-nums text-slate-600 md:block">{ms(l.durationMs)}</span>
        <span className="text-right"><Pill tone={tone} dot>{label}</Pill></span>
        <ChevronDown size={15} className={`hidden text-slate-400 transition md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-3 bg-slate-50/70 px-4 py-3 text-[12.5px] text-slate-600 sm:grid-cols-2 animate-in fade-in">
          <p><span className="text-slate-400">When:</span> {fmtDateTime(l.createdAt || l.createdAtMs)}</p>
          <p><span className="text-slate-400">Key:</span> {l.keyLabel || '-'} {l.keyHint ? `(${l.keyHint})` : ''}</p>
          <p><span className="text-slate-400">Tokens:</span> {l.totalTokens.toLocaleString()}</p>
          <p><span className="text-slate-400">Plan:</span> {l.plan || '-'}</p>
          {l.errorMessage && <p className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-red-700"><AlertTriangle size={13} className="mr-1 inline" />{l.errorCode ? `${l.errorCode}: ` : ''}{l.errorMessage}</p>}
          {l.attempts?.length > 1 && <p className="sm:col-span-2"><span className="text-slate-400">Tries:</span> {l.attempts.map((a, i) => `${a.model || a.keyLabel || i + 1} ${a.status || ''}`).join(' → ')}</p>}
        </div>
      )}
    </li>
  )
}

function Logs({ keys }) {
  const [status, setStatus] = useState('')
  const [key, setKey] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(q)
  useEffect(() => { setPage(1) }, [status, key, search])
  const { data, loading, error } = useOpsData(`/api/admin-ai-describe?action=logs&page=${page}&limit=25&status=${status}&key=${encodeURIComponent(key)}&search=${encodeURIComponent(search)}`)
  const rows = data?.logs || []
  return (
    <section className="rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
      <div className="flex flex-col gap-3 px-1 pb-3 lg:flex-row lg:items-center">
        <p className="text-[14px] font-bold text-dash-ink">Every request</p>
        <Chips size="sm" value={status} onChange={setStatus} options={[{ id: '', label: 'All' }, { id: 'success', label: 'Delivered' }, { id: 'failed', label: 'Failed' }, { id: 'rate_limited', label: 'Rate limited' }]} />
        {keys.length > 1 && <Chips size="sm" tone="green" value={key} onChange={setKey} options={[{ id: '', label: 'Every key' }, ...keys.map((k) => ({ id: k.label, label: k.label }))]} />}
        <SearchBox value={q} onChange={setQ} placeholder="Store, item or model" busy={loading} className="lg:ml-auto lg:w-72" />
      </div>
      <Notice tone="error">{error}</Notice>
      {loading && !data ? <div className="h-64 animate-pulse rounded-2xl bg-slate-50" /> : rows.length === 0 ? <Empty icon={<Sparkles size={22} />} title="No requests match" className="border-none" /> : <ul>{rows.map((l) => <LogRow key={l.id} l={l} />)}</ul>}
      <Pager page={page} pages={data?.totalPages || 1} total={data?.total} perPage={25} onPage={setPage} className="mt-2 border-t border-dash-line px-1 pt-3" />
      {data?.truncated && <p className="mt-2 text-center text-[11.5px] text-slate-400">Searching the latest {data.windowSize.toLocaleString()} requests.</p>}
    </section>
  )
}

export default function EngineRoom() {
  const [days, setDays] = useState('30')
  const { data, loading, error } = useOpsData(`/api/admin-ai-describe?action=summary&days=${days}`)
  const s = data?.summary
  const okN = s?.byStatus?.success || 0
  const allN = Object.values(s?.byStatus || {}).reduce((n, v) => n + v, 0)
  const rate = allN ? Math.round((okN / allN) * 100) : 0
  const keys = [...(s?.keys || []), ...(s?.retiredKeys || []).map((k) => ({ ...k, retired: true }))]

  return (
    <div className="space-y-4">
      <Notice tone="error">{error}</Notice>
      <section className="grid grid-cols-1 gap-4 rounded-3xl bg-[#07131f] p-5 text-white sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-5">
          <Ring value={rate} size={128} stroke={11} color={rate >= 90 ? '#34d399' : rate >= 70 ? '#fbbf24' : '#f87171'} track="rgba(255,255,255,0.1)">
            <div className="text-center"><p className="font-display text-[28px] font-extrabold leading-none">{s ? `${rate}%` : '-'}</p><p className="mt-1 text-[10.5px] text-sky-100/70">delivered</p></div>
          </Ring>
          <div className="lg:hidden"><p className="text-[13px] text-sky-100/80">of the last {allN.toLocaleString()} logged requests</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Today', s?.today], [`Last ${s?.days ?? days} days`, s?.generationsInWindow], ['All time', s?.generationsAllTime], ['Stores using it', s?.storesUsed]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/10"><p className="text-[11.5px] text-sky-100/70">{l}</p><p className="mt-1 font-display text-[24px] font-extrabold leading-none tabular-nums">{v == null ? '-' : <CountUp value={v} />}</p></div>
          ))}
          <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/10 md:col-span-4">
            <Gauge size={18} className="text-sky-300" /><span className="text-[12.5px] text-sky-100/80">Average answer in <strong className="text-white">{ms(s?.avgDurationMs)}</strong> · {(s?.tokensLogged || 0).toLocaleString()} tokens logged</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[15px] font-bold text-dash-ink">Descriptions written per day</p><Segmented value={days} onChange={setDays} options={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} /></div>
        <div className="mt-4 h-56">
          {loading && !data ? <div className="h-full animate-pulse rounded-2xl bg-slate-50" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s?.series || []} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: '#7c8a99' }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7c8a99' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: 'none', background: '#0f172a', color: '#fff', fontSize: 12 }} labelFormatter={dayLabel} formatter={(v) => [v, 'Descriptions']} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><KeyRound size={16} className="text-sky-600" /> API keys</p>
          <ul className="mt-3 space-y-3">
            {keys.length === 0 && <li className="text-[12.5px] text-slate-400">No keys configured.</li>}
            {keys.map((k) => (
              <li key={k.label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold text-dash-ink">{k.label}</span>{k.retired ? <Pill tone="slate">Removed</Pill> : <span className="font-mono text-[11px] text-slate-400">{k.hint || k.env}</span>}</div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-emerald-500" style={{ width: `${k.total ? (k.success / k.total) * 100 : 0}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${k.total ? (k.failed / k.total) * 100 : 0}%` }} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-slate-500">{k.total.toLocaleString()} requests · {k.failed} failed · {k.tokens.toLocaleString()} tokens</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Cpu size={16} className="text-sky-600" /> Models</p>
          <ul className="mt-3 space-y-3">
            {(s?.models || []).length === 0 && <li className="text-[12.5px] text-slate-400">Nothing logged yet.</li>}
            {(s?.models || []).slice(0, 6).map((m) => (
              <li key={m.model}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]"><span className="truncate font-mono text-slate-600">{m.model}</span><span className="flex-shrink-0 font-bold tabular-nums text-dash-ink">{ms(m.avgMs)}</span></div>
                <Meter value={m.success} of={m.total} tone="bg-sky-500" />
                <p className="mt-1 text-[11px] text-slate-400">{m.total} requests, {m.total ? Math.round((m.success / m.total) * 100) : 0}% delivered</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Store size={16} className="text-sky-600" /> Top stores</p>
          <ol className="mt-3 space-y-2">
            {(s?.topStores || []).length === 0 && <li className="text-[12.5px] text-slate-400">Nobody yet.</li>}
            {(s?.topStores || []).map((t, i) => (
              <li key={t.storeId} className="flex items-center gap-2.5">
                <span className="w-5 text-center text-[12px] font-bold text-slate-400">{i + 1}</span>
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarTone(t.storeId)}`}>{initials(t.storeName)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{t.storeName || t.storeId}</span><PlanPill plan={t.plan} /></span>
                <span className="text-[13px] font-bold tabular-nums text-dash-ink">{t.total.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {s?.logCount === 0 && s?.generationsAllTime > 0 && <Notice tone="info">The daily counts go back to the start; request-by-request detail only exists from when logging was switched on.</Notice>}
      <Logs keys={keys} />
    </div>
  )
}
