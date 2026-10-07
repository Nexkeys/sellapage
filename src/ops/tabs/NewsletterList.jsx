// src/ops/tabs/NewsletterList.jsx
//
// Newsletter subscribers: where they signed up, the list itself (searchable,
// paged), and the whole list out as a copy or a CSV file
// (/api/admin-newsletter list, export, delete).
import { useEffect, useState } from 'react'
import { Mail, Copy, Download, Trash2, Check, Users } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { Pager, SearchBox, Pill, Empty, Notice, Btn, CountUp, useDebounced, useConfirm, timeAgo, title } from './kit'

const PER_PAGE = 20
const SOURCE_COLORS = ['bg-forest-600', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-slate-400']

export default function NewsletterList({ notify }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmUi, confirm] = useConfirm()
  const search = useDebounced(q)
  useEffect(() => { setPage(1) }, [search])
  const { data, loading, error } = useOpsData(`/api/admin-newsletter?action=list&page=${page}&limit=${PER_PAGE}&search=${encodeURIComponent(search)}&n=${nonce}`)
  const counts = data?.counts || {}
  const sources = Object.entries(counts).filter(([k]) => k !== 'all').sort((a, b) => b[1] - a[1])
  const items = data?.items || []
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))

  const exportAll = async (how) => {
    setBusy(how); setErr('')
    const { ok, data: d } = await opsJson('/api/admin-newsletter?action=export')
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'Could not get the list.'); return }
    const emails = d.emails || []
    if (how === 'copy') {
      try { await navigator.clipboard.writeText(emails.join(', ')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setErr('Your browser blocked copying. Use Download instead.') }
    } else {
      const blob = new Blob([`email\n${emails.join('\n')}\n`], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sellapage-newsletter-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }
  }
  const remove = async (r) => {
    const { ok } = await confirm({ title: `Remove ${r.email}?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Remove', body: 'They stop getting the newsletter. Use this when someone asks to be removed.' })
    if (!ok) return
    setBusy(r.id)
    const res = await opsJson('/api/admin-newsletter?action=delete', { method: 'POST', body: { id: r.id } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not remove.'); return }
    notify?.(`${r.email} removed.`)
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-forest-600 to-emerald-400 text-white shadow-lg shadow-forest/20"><Mail size={28} /></span>
          <div><p className="font-display text-[34px] font-extrabold leading-none tabular-nums text-dash-ink">{counts.all == null ? '-' : <CountUp value={counts.all} />}</p><p className="mt-1 text-[12.5px] text-dash-muted">people on the list</p></div>
        </div>
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{sources.map(([k, v], i) => <div key={k} className={`${SOURCE_COLORS[i % SOURCE_COLORS.length]} transition-all duration-700`} style={{ width: `${(v / (counts.all || 1)) * 100}%` }} />)}</div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">{sources.map(([k, v], i) => <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"><span className={`h-2 w-2 rounded-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]}`} />{title(k)} <strong className="tabular-nums text-dash-ink">{v}</strong></span>)}</div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox value={q} onChange={setQ} placeholder="Search an email" busy={loading} className="sm:max-w-md sm:flex-1" />
        <div className="flex gap-2 sm:ml-auto">
          <Btn tone="soft" icon={copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} busy={busy === 'copy'} disabled={!counts.all} onClick={() => exportAll('copy')}>{copied ? 'Copied' : 'Copy all'}</Btn>
          <Btn tone="dark" icon={<Download size={15} />} busy={busy === 'csv'} disabled={!counts.all} onClick={() => exportAll('csv')}>Download CSV</Btn>
        </div>
      </div>
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>

      <section className="rounded-3xl border border-dash-line bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-3">
        {loading && !data ? <div className="h-64 animate-pulse rounded-2xl bg-slate-50" /> : items.length === 0 ? <Empty icon={<Users size={22} />} title={search ? 'No email matches that' : 'Nobody has subscribed yet'} className="border-none" /> : (
          <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {items.map((r) => (
              <li key={r.id} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-slate-50">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-[12px] font-bold uppercase text-forest-700">{r.email.slice(0, 1)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium text-dash-ink">{r.email}</span><span className="flex items-center gap-1.5 text-[11.5px] text-slate-400"><Pill tone="slate">{title(r.source)}</Pill>{timeAgo(r.createdAt)}</span></span>
                <button type="button" onClick={() => remove(r)} disabled={busy === r.id} className="rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600 group-hover:text-slate-500 disabled:opacity-40" aria-label={`Remove ${r.email}`}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} className="mt-2 border-t border-dash-line px-2 pt-3" />
      </section>
      {confirmUi}
    </div>
  )
}
