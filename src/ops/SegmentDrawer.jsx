// src/ops/SegmentDrawer.jsx
//
// A list of merchants in one segment or funnel stage (ops-insights segment),
// with search, sort, 20 per page, CSV export and "Add to outreach". Used by
// Growth & Activation and by the Outreach Tracker.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, Search, ChevronLeft, ChevronRight, Loader2, PhoneCall } from 'lucide-react'
import { Shimmer, useOpsData } from './opsKit'
import { opsJson, opsHeaders } from './opsSession'

const date = (t) => (t ? new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'never')

export default function SegmentDrawer({ seg, canOutreach, onClose, onAdded }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const path = `/api/ops-insights?action=segment&id=${seg.id}&q=${encodeURIComponent(q)}&sort=${sort}&page=${page}&limit=20`
  const { data, loading } = useOpsData(path)
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const exportCsv = async () => {
    const res = await fetch(`/api/ops-insights?action=segment&id=${seg.id}&q=${encodeURIComponent(q)}&sort=${sort}&format=csv`, { headers: await opsHeaders() })
    if (!res.ok) { setMsg('Could not export. Try again.'); return }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = `sellapage-${seg.id}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const toOutreach = async () => {
    setBusy(true)
    const { ok, data: d } = await opsJson('/api/ops-outreach?action=add-merchants', { method: 'POST', body: { storeIds: [...picked], angle: seg.id === 'went_quiet' || seg.id === 'not_set_up' || seg.id === 'no_products' ? 'reactivation' : 'storefront', channel: 'whatsapp' } })
    setBusy(false)
    setMsg(ok ? `${d.added} added to the Outreach Tracker${d.skipped ? ` (${d.skipped} already there)` : ''}.` : d.message || 'Could not add them.')
    if (ok) { setPicked(new Set()); onAdded?.(d.added) }
  }
  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" role="dialog" aria-modal="true">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl animate-in slide-in-from-right-8 duration-200">
        <div className="border-b border-dash-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-lg font-extrabold text-dash-ink">{seg.label}</h2><p className="text-[12.5px] text-dash-muted">{seg.about}</p></div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="relative min-w-[180px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search name, email, phone" className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-[13px] outline-none focus:border-forest-600" /></label>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} className="h-10 rounded-xl border border-gray-200 px-3 text-[13px] outline-none">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="quiet">Quietest first</option><option value="visits">Most visits</option>
            </select>
            <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} /> CSV</button>
          </div>
          {msg && <p className="mt-2 rounded-xl bg-forest-50 px-3 py-2 text-[12.5px] text-forest-700">{msg}</p>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && !data ? <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-14" />)}</div> : (
            <ul className="divide-y divide-dash-line">
              {(data?.rows || []).map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  {canOutreach && <input type="checkbox" checked={picked.has(r.id)} onChange={() => setPicked((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })} className="mt-1 h-4 w-4 accent-[#0b6b35]" aria-label={`Select ${r.name}`} />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-dash-ink">{r.name}{r.paid && <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-700">{r.plan}</span>}</p>
                    <p className="truncate text-[12px] text-slate-500">/{r.slug} {r.owner ? `· ${r.owner}` : ''} {r.phone ? `· ${r.phone}` : ''}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{r.products} products</span>
                      <span className={`rounded-full px-2 py-0.5 ${r.shared ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{r.shared ? `shared${r.shareCount ? ` x${r.shareCount}` : ''}` : 'not shared'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{r.visits} visits</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{r.leads + r.orders} customers</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400"><p>Joined {date(r.createdAt)}</p><p>Last in {date(r.lastActiveAt)}</p></div>
                </li>
              ))}
              {data && !data.rows.length && <li className="px-5 py-12 text-center text-[13px] text-slate-500">No merchants here.</li>}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-dash-line px-5 py-3">
          <span className="text-[12px] text-slate-500">{data ? `${data.total.toLocaleString()} merchant${data.total === 1 ? '' : 's'}` : ''}</span>
          {canOutreach && picked.size > 0 && (
            <button type="button" onClick={toOutreach} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-forest-600 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-forest disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />} Add {picked.size} to outreach
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button>
            <span className="px-2 text-[12.5px] font-semibold text-dash-ink">{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
