// src/components/admin/PartnersTractionEditor.jsx
// Edits the traction figures on the public /partners page, so a new number
// never needs a code change or a deploy. Validates live with the same function
// the server runs before saving (src/utils/partnersContent.js).
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUp, ArrowDown, Trash2, Plus, AlertCircle, Loader2, Check, ExternalLink, RotateCcw,
} from 'lucide-react'
import { SkeletonRows } from '../Skeleton'
import {
  MAX_STATS,
  STAT_LIMITS,
  formatAsOf,
  todayIso,
  validateTraction,
  hasTractionErrors,
} from '../../utils/partnersContent'

async function callAdmin(action, authHeaders, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin-partners?action=${action}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong')
  return data
}

// Rows get a local key so React keeps focus in the right input when a row is
// moved or removed. Stripped before anything is compared or saved.
let keySeq = 0
const withKeys = (stats) => (stats || []).map((s) => ({ value: s.value || '', label: s.label || '', note: s.note || '', _k: ++keySeq }))
const strip = (stats) => stats.map(({ _k, ...s }) => s)
const snapshot = (stats, asOf) => JSON.stringify({ stats: strip(stats), asOf })

const INPUT =
  'w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20'
const tone = (bad) => (bad ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-green-500')

function Err({ children }) {
  if (!children) return null
  return <p className="mt-1 text-[11px] text-red-600">{children}</p>
}

export default function PartnersTractionEditor({ authHeaders, onDirtyChange }) {
  const [stats, setStats] = useState([])
  const [asOf, setAsOf] = useState('')
  const [baseline, setBaseline] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
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
    setLoading(true)
    setLoadError('')
    try {
      const data = await callAdmin('get-content', authHeaders)
      apply(data.traction)
      setIsSaved(!!data.saved)
      setUpdatedAt(data.updatedAt || null)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, apply])

  useEffect(() => { load() }, [load])

  const dirty = !loading && !loadError && snapshot(stats, asOf) !== baseline
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  // Closing or reloading the tab with unsaved figures asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const errors = useMemo(() => validateTraction({ stats: strip(stats), asOf }).errors, [stats, asOf])
  const shown = showErrors ? errors : { rows: {} }

  const edit = (k, field, v) => {
    setStats((prev) => prev.map((s) => (s._k === k ? { ...s, [field]: v } : s)))
    setJustSaved(false)
  }
  const move = (i, dir) => {
    setStats((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setJustSaved(false)
  }
  const remove = (k) => { setStats((prev) => prev.filter((s) => s._k !== k)); setJustSaved(false) }
  const add = () => {
    setStats((prev) => (prev.length >= MAX_STATS ? prev : [...prev, { value: '', label: '', note: '', _k: ++keySeq }]))
    setJustSaved(false)
  }
  const discard = () => apply(JSON.parse(baseline))

  const save = async () => {
    setShowErrors(true)
    setSaveError('')
    if (hasTractionErrors(errors)) return
    setSaving(true)
    try {
      const data = await callAdmin('save-content', authHeaders, {
        method: 'POST',
        body: { traction: { stats: strip(stats), asOf } },
      })
      apply(data.traction)
      setIsSaved(true)
      setUpdatedAt(data.updatedAt || new Date().toISOString())
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SkeletonRows count={4} />

  if (loadError) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center">
        <AlertCircle size={20} className="mx-auto text-red-400" />
        <p className="mt-2 text-sm text-gray-600">Could not load the page traction. {loadError}</p>
        <button type="button" onClick={load} className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white">
          Try again
        </button>
      </div>
    )
  }

  const asOfLabel = formatAsOf(asOf)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800">Traction on the Investors & Partners page</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {isSaved
                ? `Last saved ${updatedAt ? new Date(updatedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}. `
                : 'Showing the launch figures. Nothing has been saved from here yet. '}
              Saved changes reach the live page within about a minute.
            </p>
          </div>
          <a
            href="/partners"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
          >
            View live page <ExternalLink size={11} />
          </a>
        </div>

        <div className="mt-4 max-w-xs">
          <label htmlFor="pt-asof" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Figures as of
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="pt-asof"
              type="date"
              max={todayIso()}
              value={asOf}
              onChange={(e) => { setAsOf(e.target.value); setJustSaved(false) }}
              className={`${INPUT} ${tone(shown.asOf)}`}
            />
            <button
              type="button"
              onClick={() => { setAsOf(todayIso()); setJustSaved(false) }}
              className="flex-shrink-0 rounded-lg border border-gray-200 px-3 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
            >
              Today
            </button>
          </div>
          <Err>{shown.asOf}</Err>
          <p className="mt-1 text-[11px] text-gray-400">Update this every time you change a figure.</p>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => {
          const rowErr = shown.rows[i] || {}
          return (
            <div key={s._k} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Figure {i + 1}</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move figure ${i + 1} up`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === stats.length - 1} aria-label={`Move figure ${i + 1} down`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" onClick={() => remove(s._k)} disabled={stats.length <= 1} aria-label={`Remove figure ${i + 1}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr_1fr]">
                <div>
                  <label htmlFor={`pt-v-${s._k}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Figure</label>
                  <input id={`pt-v-${s._k}`} value={s.value} maxLength={STAT_LIMITS.value} placeholder="e.g. 145" onChange={(e) => edit(s._k, 'value', e.target.value)} className={`mt-1 ${INPUT} ${tone(rowErr.value)}`} />
                  <Err>{rowErr.value}</Err>
                </div>
                <div>
                  <label htmlFor={`pt-l-${s._k}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">What it measures</label>
                  <input id={`pt-l-${s._k}`} value={s.label} maxLength={STAT_LIMITS.label} placeholder="e.g. Users signed up" onChange={(e) => edit(s._k, 'label', e.target.value)} className={`mt-1 ${INPUT} ${tone(rowErr.label)}`} />
                  <Err>{rowErr.label}</Err>
                </div>
                <div>
                  <label htmlFor={`pt-n-${s._k}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Small note <span className="normal-case tracking-normal">(optional)</span></label>
                  <input id={`pt-n-${s._k}`} value={s.note} maxLength={STAT_LIMITS.note} placeholder="e.g. and growing" onChange={(e) => edit(s._k, 'note', e.target.value)} className={`mt-1 ${INPUT} ${tone(false)}`} />
                </div>
              </div>
            </div>
          )
        })}

        {showErrors && errors.stats && (
          <p className="text-xs text-red-600">{errors.stats}</p>
        )}

        <button
          type="button"
          onClick={add}
          disabled={stats.length >= MAX_STATS}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-300 bg-white py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> {stats.length >= MAX_STATS ? `Maximum of ${MAX_STATS} figures` : 'Add a figure'}
        </button>
      </div>

      {/* Preview, styled like the public page, so what gets saved is what visitors see. */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview</p>
        <div className={`grid gap-2.5 ${stats.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${stats.length === 4 ? 'lg:grid-cols-4' : stats.length > 2 ? 'lg:grid-cols-3' : ''}`}>
          {stats.map((s) => (
            <div key={s._k} className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="truncate text-xl font-extrabold text-green-600">{s.value || '...'}</p>
              <p className="mt-1 truncate text-xs font-semibold text-gray-800">{s.label || 'What it measures'}</p>
              {s.note && <p className="mt-0.5 truncate text-[11px] text-gray-400">{s.note}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-gray-400">
          {asOfLabel ? `Figures as of ${asOfLabel}.` : 'No date chosen'}
        </p>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600" role="alert">
          <AlertCircle size={14} className="flex-shrink-0" /> {saveError}
        </div>
      )}
      {showErrors && hasTractionErrors(errors) && !saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700" role="alert">
          <AlertCircle size={14} className="flex-shrink-0" /> Fix the highlighted fields before saving.
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-sm backdrop-blur">
        {dirty && <p className="mr-auto text-[11px] font-semibold text-amber-600">Unsaved changes</p>}
        <button
          type="button"
          onClick={discard}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <RotateCcw size={12} /> Discard
        </button>
        <button
          type="button"
          onClick={save}
          disabled={(!dirty && isSaved) || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : justSaved ? <Check size={12} /> : null}
          {saving ? 'Saving...' : justSaved ? 'Saved' : 'Save and publish'}
        </button>
      </div>
    </div>
  )
}
