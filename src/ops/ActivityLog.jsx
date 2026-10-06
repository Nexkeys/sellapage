// src/ops/ActivityLog.jsx
//
// Every sign-in, sign-out, timeout, failed attempt and change made in Sellapage
// Ops, newest first, with who (name and job title), when, from which device
// and IP, and what changed. Nobody can edit or delete entries: the log is
// written by the server only (opsAudit, closed in firestore.rules).
// Filter by person, kind and dates; page through 25 at a time; export CSV.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollText, Download, Loader2, ChevronLeft, ChevronRight, ChevronDown, LogIn, LogOut, ShieldAlert, ShieldCheck, UserCog, Ban, Activity, Filter, RotateCcw } from 'lucide-react'
import { opsJson, opsHeaders } from './opsSession'
import { ACTIVITY_LABELS, opsTab } from '../utils/opsAccess'
import { initials, avatarTone } from './opsUi'

const KINDS = [
  ['', 'Everything'],
  ['ops.login', 'Sign-ins'],
  ['ops.login_failed', 'Failed sign-ins'],
  ['ops.logout', 'Sign-outs'],
  ['ops.updated', 'Access changes'],
  ['ops.invited', 'Invites'],
  ['ops.paused', 'Pauses'],
  ['ops.deleted', 'Removals'],
  ['ops.step_up', 'Sensitive confirmations'],
  ['ops.denied', 'Blocked requests'],
  ['ops.session_ended', 'Sessions ended by an admin'],
]

function iconFor(action, result) {
  if (result === 'denied' || action === 'ops.denied') return { Icon: Ban, cls: 'bg-red-50 text-red-600' }
  if (result === 'failed') return { Icon: ShieldAlert, cls: 'bg-amber-50 text-amber-600' }
  if (action === 'ops.login') return { Icon: LogIn, cls: 'bg-emerald-50 text-emerald-700' }
  if (action === 'ops.logout') return { Icon: LogOut, cls: 'bg-slate-100 text-slate-500' }
  if (action.startsWith('ops.step_up') || action === 'ops.enrolled') return { Icon: ShieldCheck, cls: 'bg-sky-50 text-sky-700' }
  if (action.startsWith('ops.')) return { Icon: UserCog, cls: 'bg-violet-50 text-violet-700' }
  return { Icon: Activity, cls: 'bg-forest-50 text-forest-600' }
}

function label(row) {
  if (ACTIVITY_LABELS[row.action]) return ACTIVITY_LABELS[row.action]
  const [tab, act] = String(row.action).split('.')
  return `${opsTab(tab)?.label || tab}${act ? `: ${act.replace(/[-_]/g, ' ')}` : ''}`
}

function dayLabel(ms) {
  const d = new Date(ms)
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function Changes({ changes }) {
  if (!changes) return null
  const { before, after, request } = changes
  if (before || after) {
    const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
    return (
      <dl className="mt-2 space-y-1.5">
        {keys.map((k) => {
          const b = before?.[k]
          const a = after?.[k]
          if (k === 'tabs' && Array.isArray(a)) {
            const added = a.filter((t) => !(b || []).includes(t))
            const removed = (b || []).filter((t) => !a.includes(t))
            if (!added.length && !removed.length) return null
            return (
              <div key={k} className="flex flex-wrap items-center gap-1.5">
                <dt className="text-[11.5px] font-semibold text-slate-500">Tabs</dt>
                {added.map((t) => <dd key={`+${t}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">+ {opsTab(t)?.label || t}</dd>)}
                {removed.map((t) => <dd key={`-${t}`} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 line-through">{opsTab(t)?.label || t}</dd>)}
              </div>
            )
          }
          if (JSON.stringify(b) === JSON.stringify(a)) return null
          return (
            <div key={k} className="flex flex-wrap items-center gap-1.5 text-[12px]">
              <dt className="font-semibold capitalize text-slate-500">{k}</dt>
              <dd className="text-slate-400 line-through">{String(b ?? 'none')}</dd>
              <dd className="text-dash-ink">{String(a ?? 'none')}</dd>
            </div>
          )
        })}
      </dl>
    )
  }
  if (request) return <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-100">{JSON.stringify(request, null, 2)}</pre>
  return null
}

export default function ActivityLog() {
  const [people, setPeople] = useState([])
  const [uid, setUid] = useState('')
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [cursors, setCursors] = useState([null]) // cursor that starts each page
  const [page, setPage] = useState(0)
  const [next, setNext] = useState(null)
  const [open, setOpen] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => { opsJson('/api/ops-team?action=activity-people').then(({ ok, data }) => { if (ok) setPeople(data.people) }) }, [])

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (uid) p.set('uid', uid)
    if (kind) p.set('kind', kind)
    if (from) p.set('from', String(new Date(`${from}T00:00:00`).getTime()))
    if (to) p.set('to', String(new Date(`${to}T23:59:59.999`).getTime()))
    return p
  }, [uid, kind, from, to])

  const load = useCallback(async (cursor) => {
    setRows(null)
    setError('')
    const p = new URLSearchParams(params)
    p.set('limit', '25')
    if (cursor) p.set('cursor', cursor)
    const { ok, data } = await opsJson(`/api/ops-team?action=activity&${p}`)
    if (!ok) { setError(data.message || 'Could not load the log.'); setRows([]); return }
    setRows(data.rows)
    setNext(data.nextCursor)
  }, [params])

  // New filters start again from the newest entry.
  useEffect(() => { setCursors([null]); setPage(0); load(null) }, [load])

  const goto = (n) => {
    if (n < 0) return
    if (n > page) {
      if (!next) return
      setCursors((c) => { const copy = c.slice(0, n); copy[n] = next; return copy })
      setPage(n)
      load(next)
    } else {
      setPage(n)
      load(cursors[n])
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/ops-team?action=activity-export&${params}`, { headers: await opsHeaders() })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `sellapage-ops-activity-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not export the log. Try again.')
    } finally {
      setExporting(false)
    }
  }

  const grouped = useMemo(() => {
    const out = []
    for (const r of rows || []) {
      const day = dayLabel(r.at)
      if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] })
      out[out.length - 1].items.push(r)
    }
    return out
  }, [rows])
  const filtered = uid || kind || from || to

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight text-dash-ink"><ScrollText size={20} className="text-forest-600" /> Activity Log</h2>
          <p className="mt-0.5 text-[13px] text-dash-muted">Every sign-in and every change in Ops, with who, when and from where. Nobody can edit or delete it.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white p-3 ring-1 ring-dash-line sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 ring-1 ring-slate-100"><Filter size={14} className="text-slate-400" />
          <select value={uid} onChange={(e) => setUid(e.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-[13px] outline-none" aria-label="Person">
            <option value="">Everyone</option>
            {people.map((p) => <option key={p.uid} value={p.uid}>{p.name}{p.title ? ` (${p.title})` : ''}{p.status !== 'active' ? ` [${p.status === 'deleted' ? 'removed' : p.status}]` : ''}</option>)}
          </select></label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-xl bg-slate-50 px-3 text-[13px] outline-none ring-1 ring-slate-100" aria-label="Kind">
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} className="h-10 rounded-xl bg-slate-50 px-3 text-[13px] outline-none ring-1 ring-slate-100" aria-label="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} className="h-10 rounded-xl bg-slate-50 px-3 text-[13px] outline-none ring-1 ring-slate-100" aria-label="To" />
        <button type="button" disabled={!filtered} onClick={() => { setUid(''); setKind(''); setFrom(''); setTo('') }} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40"><RotateCcw size={13} /> Clear</button>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}

      {!rows ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-dash-line" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-[13.5px] text-dash-muted">{filtered ? 'Nothing matches these filters.' : 'Nothing recorded yet.'}</div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <section key={g.day}>
              <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{g.day}</h3>
              <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-dash-line">
                {g.items.map((r) => {
                  const { Icon, cls } = iconFor(r.action, r.result)
                  const isOpen = open === r.id
                  return (
                    <li key={r.id} className="border-b border-dash-line last:border-0">
                      <button type="button" onClick={() => setOpen(isOpen ? '' : r.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/70" aria-expanded={isOpen}>
                        <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${cls}`}><Icon size={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[13.5px] font-semibold text-dash-ink">{label(r)}</span>
                            {r.result !== 'ok' && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${r.result === 'denied' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{r.result}</span>}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-600">{r.summary}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-dash-muted">
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarTone(r.uid)}`}>{initials(r.name)}</span>
                            <span className="font-medium text-slate-600">{r.name || 'Unknown'}</span>{r.title && <span>· {r.title}</span>}
                          </span>
                        </span>
                        <span className="flex flex-shrink-0 flex-col items-end gap-1">
                          <span className="text-[12px] font-medium text-slate-500">{new Date(r.at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                          <ChevronDown size={14} className={`text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {isOpen && (
                        <div className="bg-slate-50/60 px-4 pb-4 pl-16 text-[12px] text-slate-600 animate-in fade-in duration-150">
                          <p><span className="text-slate-400">When:</span> {new Date(r.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'full', timeStyle: 'medium' })}</p>
                          <p><span className="text-slate-400">Device:</span> {r.device || 'unknown'} · <span className="text-slate-400">IP:</span> {r.ip || 'unknown'}</p>
                          {r.tab && <p><span className="text-slate-400">Tab:</span> {opsTab(r.tab)?.label || r.tab}</p>}
                          {r.target && <p><span className="text-slate-400">About:</span> {r.target.label || r.target.id} <span className="text-slate-400">({r.target.type})</span></p>}
                          <Changes changes={r.changes} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <nav className="flex items-center justify-center gap-2" aria-label="Pages">
        <button type="button" onClick={() => goto(page - 1)} disabled={page === 0 || !rows} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft size={14} /> Newer</button>
        <span className="rounded-full bg-forest-600 px-3 py-1.5 text-[12.5px] font-semibold text-white">Page {page + 1}</span>
        <button type="button" onClick={() => goto(page + 1)} disabled={!next || !rows} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 disabled:opacity-40">Older <ChevronRight size={14} /></button>
      </nav>
    </div>
  )
}
