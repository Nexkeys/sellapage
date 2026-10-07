// src/ops/tabs/ReportCases.jsx
//
// Store Reports as case files: what customers reported, with their evidence.
// The bar on top shows what kind of trouble comes in most; each case opens a
// side panel with the full story, the screenshots, the reporter's contacts
// and the notes and decision (/api/admin-reports).
import { useEffect, useState } from 'react'
import { Flag, ImageIcon, MessageCircle, Mail, Eye, CheckCircle2, Ban, RotateCcw, ExternalLink, User } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { Chips, Pager, Pill, Empty, Notice, Btn, Drawer, Field, Lightbox, timeAgo, fmtDateTime, waLink, title } from './kit'

const PER_PAGE = 10
const OFFENSE = {
  scam: { label: 'Scam', bar: 'bg-red-500', spine: 'bg-red-500', tone: 'red' },
  fake_products: { label: 'Fake products', bar: 'bg-amber-500', spine: 'bg-amber-500', tone: 'amber' },
  non_delivery: { label: 'Non-delivery', bar: 'bg-orange-500', spine: 'bg-orange-500', tone: 'amber' },
  identity_theft: { label: 'Identity theft', bar: 'bg-violet-500', spine: 'bg-violet-500', tone: 'violet' },
  counterfeit: { label: 'Counterfeit', bar: 'bg-pink-500', spine: 'bg-pink-500', tone: 'red' },
  other: { label: 'Other', bar: 'bg-slate-400', spine: 'bg-slate-400', tone: 'slate' },
}
const STATUS = { pending: ['Waiting', 'amber'], reviewed: ['Reviewed', 'blue'], resolved: ['Resolved', 'green'], dismissed: ['Dismissed', 'slate'] }
const off = (k) => OFFENSE[k] || OFFENSE.other

function Breakdown({ stats }) {
  const total = Object.keys(OFFENSE).reduce((n, k) => n + (stats?.[k] || 0), 0)
  if (!total) return null
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {Object.entries(OFFENSE).map(([k, o]) => (stats[k] ? <div key={k} className={`${o.bar} transition-all duration-700`} style={{ width: `${(stats[k] / total) * 100}%` }} title={`${o.label}: ${stats[k]}`} /> : null))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(OFFENSE).map(([k, o]) => (stats[k] ? <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"><span className={`h-2 w-2 rounded-full ${o.bar}`} />{o.label} <strong className="tabular-nums text-dash-ink">{stats[k]}</strong></span> : null))}
      </div>
    </div>
  )
}

function CaseDrawer({ r, onClose, onSaved }) {
  const [notes, setNotes] = useState(r?.adminNotes || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [img, setImg] = useState('')
  useEffect(() => { setNotes(r?.adminNotes || ''); setErr('') }, [r?.id, r?.adminNotes])
  if (!r) return null
  const o = off(r.offenseType)
  const save = async (status) => {
    setBusy(status); setErr('')
    const { ok, data } = await opsJson('/api/admin-reports?action=update', { method: 'POST', body: { reportId: r.id, status, adminNotes: notes } })
    setBusy('')
    if (!ok) { setErr(data.message || data.error || 'Could not save.'); return }
    onSaved(status)
  }
  const link = /^https?:\/\//.test(r.storeUrl) ? r.storeUrl : r.storeUrl ? `https://${r.storeUrl.replace(/^\/+/, '')}` : ''
  return (
    <Drawer open onClose={onClose} wide title={r.storeUrl || 'Reported store'} sub={<span className="inline-flex flex-wrap items-center gap-2"><Pill tone={o.tone}>{o.label}</Pill><Pill tone={(STATUS[r.status] || STATUS.pending)[1]} dot>{(STATUS[r.status] || STATUS.pending)[0]}</Pill><span>{fmtDateTime(r.createdAt)}</span></span>}
      footer={<>
        <Btn tone="soft" icon={<Eye size={15} />} busy={busy === 'reviewed'} onClick={() => save('reviewed')}>Reviewed</Btn>
        <Btn icon={<CheckCircle2 size={15} />} busy={busy === 'resolved'} onClick={() => save('resolved')}>Resolved</Btn>
        <Btn tone="ghost" icon={<Ban size={15} />} busy={busy === 'dismissed'} onClick={() => save('dismissed')}>Dismiss</Btn>
        {r.status !== 'pending' && <Btn tone="ghost" icon={<RotateCcw size={15} />} busy={busy === 'pending'} onClick={() => save('pending')}>Reopen</Btn>}
      </>}>
      <div className="space-y-5">
        <section>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">What happened</p>
          <p className="mt-1.5 whitespace-pre-wrap rounded-2xl bg-slate-50 px-4 py-3 text-[13.5px] leading-relaxed text-dash-ink ring-1 ring-slate-100">{r.description || 'No description given.'}</p>
        </section>
        {r.screenshotUrls?.length > 0 && (
          <section>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Evidence ({r.screenshotUrls.length})</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {r.screenshotUrls.map((u, i) => (
                <button key={u} type="button" onClick={() => setImg(u)} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-dash-line">
                  <img src={u} alt={`Evidence ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-dash-line p-4">
          <Field label="Reported by">{r.reporterName}</Field>
          <Field label="Met the store on">{title(r.whereMet)}</Field>
          <Field label="Email">{r.reporterEmail}</Field>
          <Field label="Phone">{r.reporterPhone}</Field>
          <div className="col-span-2 flex flex-wrap gap-2">
            {r.reporterPhone && <a href={waLink(r.reporterPhone, `Hello ${r.reporterName || ''}, this is Sellapage about the store you reported (${r.storeUrl}).`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-[12.5px] font-semibold text-white"><MessageCircle size={14} /> WhatsApp reporter</a>}
            {r.reporterEmail && <a href={`mailto:${r.reporterEmail}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] font-semibold ring-1 ring-dash-line"><Mail size={14} /> Email</a>}
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] font-semibold ring-1 ring-dash-line"><ExternalLink size={14} /> Open the store</a>}
          </div>
        </section>
        <label className="block">
          <span className="text-[12px] font-semibold text-slate-700">Notes (only the team sees these)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What you checked, who you spoke to, what was decided."
            className="mt-1.5 w-full resize-none rounded-2xl border border-dash-line bg-slate-50 px-4 py-3 text-[13.5px] outline-none focus:border-forest-600 focus:bg-white focus:ring-4 focus:ring-forest-50" />
          <span className="mt-1 block text-[11.5px] text-slate-400">Saved with whichever decision you press below.</span>
        </label>
        <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
      </div>
      <Lightbox src={img} onClose={() => setImg('')} />
    </Drawer>
  )
}

export default function ReportCases({ notify }) {
  const [status, setStatus] = useState('pending')
  const [offense, setOffense] = useState('all')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  useEffect(() => { setPage(1) }, [status, offense])
  const { data, loading, error } = useOpsData(`/api/admin-reports?action=list&page=${page}&limit=${PER_PAGE}&status=${status}&offense=${offense}&n=${nonce}`)
  const stats = data?.stats
  const rows = data?.reports || []
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-dash-muted">Reports received</p>
            <p className="font-display text-[34px] font-extrabold leading-none text-dash-ink">{stats?.total ?? '-'}</p>
          </div>
          <div className="flex gap-5 text-right">
            {[['Waiting', stats?.pending, 'text-amber-600'], ['Reviewed', stats?.reviewed, 'text-sky-600'], ['Resolved', stats?.resolved, 'text-emerald-600'], ['Dismissed', stats?.dismissed, 'text-slate-500']].map(([l, v, c]) => (
              <div key={l}><p className={`font-display text-[20px] font-extrabold tabular-nums ${c}`}>{v ?? '-'}</p><p className="text-[11px] text-dash-muted">{l}</p></div>
            ))}
          </div>
        </div>
        <Breakdown stats={stats} />
      </section>

      <div className="space-y-2">
        <Chips value={status} onChange={setStatus} options={[{ id: 'pending', label: 'Waiting', count: stats?.pending, dot: 'bg-amber-500' }, { id: 'reviewed', label: 'Reviewed', count: stats?.reviewed }, { id: 'resolved', label: 'Resolved', count: stats?.resolved }, { id: 'dismissed', label: 'Dismissed', count: stats?.dismissed }, { id: 'all', label: 'All', count: stats?.total }]} />
        <Chips size="sm" tone="green" value={offense} onChange={setOffense} options={[{ id: 'all', label: 'Every kind' }, ...Object.entries(OFFENSE).map(([id, o]) => ({ id, label: o.label, dot: o.bar }))]} />
      </div>
      <Notice tone="error">{error}</Notice>

      {loading && !data ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
        : rows.length === 0 ? <Empty icon={<Flag size={22} />} title={status === 'pending' ? 'No reports waiting' : 'Nothing here'} sub="Reports customers file from the Report a store page land here." />
          : (
            <>
              <div className="space-y-3">
                {rows.map((r) => {
                  const o = off(r.offenseType)
                  const [sl, st] = STATUS[r.status] || STATUS.pending
                  return (
                    <button key={r.id} type="button" onClick={() => setOpen(r)} className="relative flex w-full overflow-hidden rounded-3xl border border-dash-line bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className={`w-1.5 flex-shrink-0 ${o.spine}`} />
                      <span className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><span className="truncate text-[14.5px] font-bold text-dash-ink">{r.storeUrl || 'Unknown store'}</span><Pill tone={o.tone}>{o.label}</Pill><Pill tone={st} dot>{sl}</Pill></span>
                          <span className="mt-1 line-clamp-2 block text-[12.5px] leading-relaxed text-slate-600">{r.description}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-400"><span className="inline-flex items-center gap-1"><User size={12} />{r.reporterName || 'Anonymous'}</span><span>via {title(r.whereMet) || '-'}</span><span>{timeAgo(r.createdAt)}</span></span>
                        </span>
                        {r.screenshotUrls?.length > 0 && (
                          <span className="flex flex-shrink-0 -space-x-3">
                            {r.screenshotUrls.slice(0, 3).map((u) => <img key={u} src={u} alt="" loading="lazy" className="h-14 w-14 rounded-xl object-cover ring-2 ring-white" />)}
                            {r.screenshotUrls.length > 3 && <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-[12px] font-bold text-slate-500 ring-2 ring-white">+{r.screenshotUrls.length - 3}</span>}
                          </span>
                        )}
                        {!r.screenshotUrls?.length && <span className="hidden flex-shrink-0 items-center gap-1 text-[11.5px] text-slate-400 sm:inline-flex"><ImageIcon size={13} /> No evidence</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
              <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} />
            </>
          )}
      {open && <CaseDrawer r={open} onClose={() => setOpen(null)} onSaved={(s) => { notify?.(`Marked ${(STATUS[s] || STATUS.pending)[0].toLowerCase()}.`); setOpen(null); setNonce((n) => n + 1) }} />}
    </div>
  )
}
