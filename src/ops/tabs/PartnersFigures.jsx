// src/ops/tabs/PartnersFigures.jsx
//
// Investors & Partners > Partners page figures: the traction numbers on the
// public /partners page, edited here so a new number never needs a deploy.
// Same data and validation as before (/api/admin-partners get-content and
// save-content, utils/partnersContent.js); the console's own layout:
//   left   each figure as a card (value, what it measures, a small note),
//          reorder, remove, add up to six, and the "as of" date
//   right  a live preview drawn like the public page, and the platform's real
//          numbers today, to copy into a figure in one tap (only for people
//          who can open Analytics, which is where those numbers come from)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus, ExternalLink, RotateCcw, Save, Check, CalendarDays, Sparkles, Eye } from 'lucide-react'
import { opsJson } from '../opsSession'
import { useOpsData } from '../opsKit'
import { MAX_STATS, STAT_LIMITS, formatAsOf, todayIso, validateTraction, hasTractionErrors } from '../../utils/partnersContent'
import { Btn, Notice, fmtDateTime } from './kit'

let keySeq = 0
const withKeys = (stats) => (stats || []).map((s) => ({ value: s.value || '', label: s.label || '', note: s.note || '', _k: ++keySeq }))
const strip = (stats) => stats.map(({ _k, ...s }) => s)
const snapshot = (stats, asOf) => JSON.stringify({ stats: strip(stats), asOf })
const INPUT = 'mt-1 h-11 w-full rounded-xl border bg-white px-3 text-[13.5px] text-dash-ink outline-none transition focus:ring-4'
const tone = (bad) => (bad ? 'border-red-300 focus:border-red-400 focus:ring-red-50' : 'border-dash-line focus:border-forest-600 focus:ring-forest-50')
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M+` : n >= 1e4 ? `${Math.floor(n / 1e3)}k+` : n.toLocaleString('en-NG'))

function Live({ onUse }) {
  const { data, error } = useOpsData('/api/admin-analytics?action=overview')
  const a = data?.analytics
  if (error || !a) return null
  const rows = [
    [compact(a.totalStores), 'Stores on Sellapage'],
    [compact(a.paidStores), 'Paying stores'],
    [compact(a.totalProducts), 'Products listed'],
    [compact(a.totalLeads), 'Customer enquiries'],
  ]
  return (
    <section className="rounded-3xl border border-dash-line bg-white p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-dash-ink"><Sparkles size={15} className="text-forest-600" /> Real numbers today</p>
      <p className="mt-0.5 text-[12px] text-dash-muted">From the platform right now. Tap one to add it as a figure.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {rows.map(([v, l]) => (
          <li key={l}><button type="button" onClick={() => onUse(v, l)} className="w-full rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-100 transition hover:bg-forest-50 hover:ring-forest-200">
            <span className="block font-display text-[18px] font-extrabold text-dash-ink">{v}</span><span className="block truncate text-[11.5px] text-slate-500">{l}</span>
          </button></li>
        ))}
      </ul>
    </section>
  )
}

export default function PartnersFigures({ can }) {
  const [stats, setStats] = useState([])
  const [asOf, setAsOf] = useState('')
  const [baseline, setBaseline] = useState('')
  const [meta, setMeta] = useState({ saved: false, updatedAt: null })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const apply = useCallback((traction) => {
    const keyed = withKeys(traction?.stats)
    setStats(keyed)
    setAsOf(traction?.asOf || '')
    setBaseline(snapshot(keyed, traction?.asOf || ''))
    setShowErrors(false)
  }, [])
  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    const { ok, data } = await opsJson('/api/admin-partners?action=get-content')
    setLoading(false)
    if (!ok) { setLoadError(data.message || data.error || 'Could not load the figures.'); return }
    apply(data.traction)
    setMeta({ saved: !!data.saved, updatedAt: data.updatedAt || null })
  }, [apply])
  useEffect(() => { load() }, [load])

  const dirty = !loading && !loadError && snapshot(stats, asOf) !== baseline
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const errors = useMemo(() => validateTraction({ stats: strip(stats), asOf }).errors, [stats, asOf])
  const shown = showErrors ? errors : { rows: {} }

  const touch = () => setJustSaved(false)
  const edit = (k, field, v) => { setStats((p) => p.map((s) => (s._k === k ? { ...s, [field]: v } : s))); touch() }
  const move = (i, dir) => { setStats((p) => { const j = i + dir; if (j < 0 || j >= p.length) return p; const n = [...p];[n[i], n[j]] = [n[j], n[i]]; return n }); touch() }
  const remove = (k) => { setStats((p) => p.filter((s) => s._k !== k)); touch() }
  const add = (value = '', label = '') => { setStats((p) => (p.length >= MAX_STATS ? p : [...p, { value, label, note: '', _k: ++keySeq }])); touch() }
  const save = async () => {
    setShowErrors(true); setSaveError('')
    if (hasTractionErrors(errors)) return
    setSaving(true)
    const { ok, data } = await opsJson('/api/admin-partners?action=save-content', { method: 'POST', body: { traction: { stats: strip(stats), asOf } } })
    setSaving(false)
    if (!ok) { setSaveError(data.message || data.error || 'Could not save.'); return }
    apply(data.traction)
    setMeta({ saved: true, updatedAt: data.updatedAt || new Date().toISOString() })
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  if (loading) return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"><div className="h-96 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" /><div className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" /></div>
  if (loadError) return <Notice tone="error">{loadError} <button type="button" onClick={load} className="ml-1 font-semibold underline">Try again</button></Notice>

  const cols = stats.length === 1 ? 'grid-cols-1' : stats.length === 4 ? 'grid-cols-2' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <section className="flex flex-col gap-3 rounded-3xl border border-dash-line bg-white p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-dash-ink">Traction on the Partners page</p>
            <p className="mt-0.5 text-[12px] text-dash-muted">{meta.saved ? `Last saved ${fmtDateTime(meta.updatedAt)}.` : 'Showing the launch figures; nothing saved from here yet.'} Saved figures reach the live page within about a minute.</p>
          </div>
          <label className="block flex-shrink-0">
            <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400"><CalendarDays size={12} /> Figures as of</span>
            <span className="mt-1 flex gap-1.5">
              <input type="date" max={todayIso()} value={asOf} onChange={(e) => { setAsOf(e.target.value); touch() }} className={`h-10 rounded-xl border bg-white px-3 text-[13px] outline-none focus:ring-4 ${tone(shown.asOf)}`} />
              <Btn size="md" tone="soft" onClick={() => { setAsOf(todayIso()); touch() }}>Today</Btn>
            </span>
            {shown.asOf && <span className="mt-1 block text-[11px] text-red-600">{shown.asOf}</span>}
          </label>
        </section>

        {stats.map((s, i) => {
          const err = shown.rows[i] || {}
          return (
            <article key={s._k} className="rounded-3xl border border-dash-line bg-white p-4 animate-in fade-in slide-in-from-bottom-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-forest-50 text-[11.5px] font-bold text-forest-700">{i + 1}</span>
                <span className="truncate text-[12.5px] font-semibold text-slate-500">{s.label || 'New figure'}</span>
                <span className="ml-auto flex items-center gap-0.5">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move figure ${i + 1} up`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-dash-ink disabled:opacity-30"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === stats.length - 1} aria-label={`Move figure ${i + 1} down`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-dash-ink disabled:opacity-30"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => remove(s._k)} disabled={stats.length <= 1} aria-label={`Remove figure ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="block min-w-0"><span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Figure</span>
                  <input value={s.value} maxLength={STAT_LIMITS.value} placeholder="145" onChange={(e) => edit(s._k, 'value', e.target.value)} className={`${INPUT} font-display text-[16px] font-extrabold ${tone(err.value)}`} />
                  {err.value && <span className="mt-1 block text-[11px] text-red-600">{err.value}</span>}</label>
                <label className="block min-w-0"><span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">What it measures</span>
                  <input value={s.label} maxLength={STAT_LIMITS.label} placeholder="Stores on Sellapage" onChange={(e) => edit(s._k, 'label', e.target.value)} className={`${INPUT} ${tone(err.label)}`} />
                  {err.label && <span className="mt-1 block text-[11px] text-red-600">{err.label}</span>}</label>
                <label className="block min-w-0"><span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Small note <span className="normal-case tracking-normal text-slate-300">optional</span></span>
                  <input value={s.note} maxLength={STAT_LIMITS.note} placeholder="and growing" onChange={(e) => edit(s._k, 'note', e.target.value)} className={`${INPUT} ${tone(false)}`} /></label>
              </div>
            </article>
          )
        })}
        {showErrors && errors.stats && <p className="text-[12px] text-red-600">{errors.stats}</p>}
        <button type="button" onClick={() => add()} disabled={stats.length >= MAX_STATS} className="flex w-full items-center justify-center gap-1.5 rounded-3xl border border-dashed border-slate-300 bg-white/70 py-3.5 text-[13px] font-semibold text-slate-500 transition hover:border-forest-300 hover:bg-forest-50/50 hover:text-forest-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={15} /> {stats.length >= MAX_STATS ? `Up to ${MAX_STATS} figures` : 'Add a figure'}
        </button>
        <Notice tone="error" onClose={() => setSaveError('')}>{saveError}</Notice>
        {showErrors && hasTractionErrors(errors) && !saveError && <Notice tone="warn">Fix the highlighted fields before saving.</Notice>}
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-dash-line bg-white/95 p-3 shadow-lg backdrop-blur">
          {dirty ? <p className="mr-auto text-[12px] font-semibold text-amber-600">Unsaved changes</p> : <p className="mr-auto text-[12px] text-slate-400">{justSaved ? 'Saved and live.' : 'No changes.'}</p>}
          <Btn size="sm" tone="ghost" icon={<RotateCcw size={13} />} disabled={!dirty || saving} onClick={() => apply(JSON.parse(baseline))}>Discard</Btn>
          <Btn size="sm" icon={justSaved ? <Check size={14} /> : <Save size={14} />} busy={saving} disabled={!dirty && meta.saved} onClick={save}>{justSaved ? 'Saved' : 'Save and publish'}</Btn>
        </div>
      </div>

      <div className="min-w-0 space-y-4 xl:sticky xl:top-24">
        <section className="overflow-hidden rounded-3xl border border-dash-line bg-[#f8faf9]">
          <div className="flex items-center justify-between gap-2 border-b border-dash-line bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-dash-ink"><Eye size={15} className="text-forest-600" /> What visitors see</p>
            <a href="https://sellapage.com.ng/partners" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 hover:underline">Live page <ExternalLink size={12} /></a>
          </div>
          <div className="px-4 py-6 sm:px-6">
            <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.2em] text-forest-600">Traction</p>
            <p className="mt-1 text-center font-display text-[22px] font-extrabold text-dash-ink">Where we are today</p>
            <div className={`mx-auto mt-5 grid gap-2.5 ${cols}`}>
              {stats.map((s, i) => (
                <div key={s._k} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm animate-in fade-in zoom-in-95 fill-mode-both" style={{ animationDelay: `${i * 60}ms` }}>
                  <p className="break-words font-display text-[22px] font-extrabold text-forest-600">{s.value || '...'}</p>
                  <p className="mt-1 break-words text-[12.5px] font-semibold text-slate-800">{s.label || 'What it measures'}</p>
                  {s.note && <p className="mt-0.5 break-words text-[11px] text-slate-400">{s.note}</p>}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11.5px] text-slate-400">{formatAsOf(asOf) ? `Figures as of ${formatAsOf(asOf)}.` : 'Pick the "as of" date.'}</p>
          </div>
        </section>
        {can?.('analytics') && stats.length < MAX_STATS && <Live onUse={(v, l) => add(v, l)} />}
      </div>
    </div>
  )
}
