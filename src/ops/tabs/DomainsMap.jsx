// src/ops/tabs/DomainsMap.jsx
//
// Custom Domains: stores on their own web address, and whether each address
// works yet. Read only on purpose: a domain is connected and checked by the
// vendor's own Online Store tab (which also talks to Vercel); changing the
// status here would not change what Vercel serves.
import { useMemo, useState } from 'react'
import { Globe, CheckCircle2, Hourglass, AlertTriangle, ExternalLink, Link2 } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { Chips, Pager, SearchBox, Pill, Empty, Notice, useClientPages, fmtDate, storeUrl } from './kit'

const STATE = {
  verified: { label: 'Working', tone: 'green', color: '#10b981', icon: CheckCircle2 },
  pending: { label: 'Waiting for DNS', tone: 'amber', color: '#f59e0b', icon: Hourglass },
  failed: { label: 'Not working', tone: 'red', color: '#ef4444', icon: AlertTriangle },
}

function Donut({ parts, size = 132 }) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1
  const r = 52
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" className="-rotate-90" aria-hidden="true">
      <circle cx="66" cy="66" r={r} fill="none" stroke="#eef1f4" strokeWidth="16" />
      {parts.map((p) => {
        const len = (p.value / total) * c
        const el = <circle key={p.id} cx="66" cy="66" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray 0.9s ease' }} />
        offset += len
        return p.value ? el : null
      })}
    </svg>
  )
}

export default function DomainsMap() {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const { data, loading, error } = useOpsData('/api/admin-domains?action=list&page=1&limit=500')
  const stats = data?.stats
  const all = useMemo(() => data?.stores || [], [data])
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return all.filter((s) => (filter === 'all' || s.domainStatus === filter) && (!t || `${s.customDomain} ${s.storeName} ${s.handle}`.toLowerCase().includes(t)))
  }, [all, filter, q])
  const pg = useClientPages(rows, 12)
  const parts = Object.entries(STATE).map(([id, s]) => ({ id, value: stats?.[id] || 0, color: s.color }))
  const share = stats?.totalStores ? ((stats.total / stats.totalStores) * 100).toFixed(1) : null

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-5 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="relative mx-auto h-[132px] w-[132px]">
          <Donut parts={parts} />
          <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="font-display text-[28px] font-extrabold leading-none text-dash-ink">{stats?.total ?? '-'}</p><p className="text-[11px] text-dash-muted">domains</p></div>
        </div>
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">{share != null ? <><strong className="text-dash-ink">{share}%</strong> of {stats.totalStores.toLocaleString()} stores use their own address.</> : 'Stores using their own web address.'}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(STATE).map(([id, s]) => {
              const I = s.icon
              return (
                <button key={id} type="button" onClick={() => setFilter(filter === id ? 'all' : id)} className={`rounded-2xl p-3 text-left ring-1 transition ${filter === id ? 'ring-2 ring-forest-600' : 'ring-dash-line hover:bg-slate-50'}`}>
                  <I size={16} style={{ color: s.color }} />
                  <p className="mt-1.5 font-display text-[22px] font-extrabold leading-none tabular-nums text-dash-ink">{stats?.[id] ?? '-'}</p>
                  <p className="mt-1 text-[11.5px] text-slate-500">{s.label}</p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Chips value={filter} onChange={setFilter} options={[{ id: 'all', label: 'Every domain' }, ...Object.entries(STATE).map(([id, s]) => ({ id, label: s.label, dot: id === 'verified' ? 'bg-emerald-500' : id === 'pending' ? 'bg-amber-500' : 'bg-red-500' }))]} />
        <SearchBox value={q} onChange={setQ} placeholder="Domain or store" className="sm:ml-auto sm:w-72" />
      </div>
      <Notice tone="error">{error}</Notice>

      {loading && !data ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
        : rows.length === 0 ? <Empty icon={<Globe size={22} />} title={all.length ? 'No domain matches' : 'No custom domains yet'} sub={all.length ? 'Try another filter.' : 'When a store connects its own address from Online Store, it shows up here.'} />
          : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {pg.rows.map((s) => {
                  const st = STATE[s.domainStatus] || STATE.pending
                  return (
                    <article key={s.id} className="flex items-center gap-3.5 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: `${st.color}1a`, color: st.color }}><Globe size={20} /></span>
                      <div className="min-w-0 flex-1">
                        <a href={`https://${s.customDomain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate font-mono text-[13.5px] font-semibold text-dash-ink hover:text-forest-600">{s.customDomain}<ExternalLink size={12} className="flex-shrink-0 text-slate-400" /></a>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-slate-500"><Link2 size={12} /> <a href={storeUrl(s.handle || s.storeName)} target="_blank" rel="noopener noreferrer" className="truncate hover:text-forest-600">{s.storeName}</a></p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <Pill tone={st.tone} dot>{st.label}</Pill>
                        {s.domainVerifiedAt && <span className="text-[11px] text-slate-400">since {fmtDate(s.domainVerifiedAt)}</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
              <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={12} onPage={pg.setPage} />
            </>
          )}
    </div>
  )
}
