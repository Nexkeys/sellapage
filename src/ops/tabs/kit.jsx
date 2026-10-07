// src/ops/tabs/kit.jsx
//
// Building blocks for the console's tab screens (Phase 3). Every tab draws its
// own layout; these are only the parts that must behave the same everywhere:
// paging, filters, search, status pills, empty states, side drawers, and a
// confirmation dialog that replaces the browser's confirm()/prompt() (those
// cannot hold a checklist, a required reason, or the console's styling).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Search, X, Check, Copy, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

// ── formatting ──────────────────────────────────────────────────────────────
// Accepts ms, ISO strings, and Firestore Timestamps as they arrive in JSON
// ({ _seconds } from the Admin SDK, { seconds } from the web SDK).
export const toDate = (v) => {
  if (!v) return null
  if (typeof v === 'object' && !(v instanceof Date)) {
    const secs = v._seconds ?? v.seconds
    if (secs == null) return null
    return new Date(secs * 1000)
  }
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
export const toMs = (v) => toDate(v)?.getTime() || 0
export const fmtDate = (v) => toDate(v)?.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) || '-'
export const fmtDateTime = (v) => toDate(v)?.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) || '-'
export function timeAgo(v) {
  const d = toDate(v)
  if (!d) return '-'
  const s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  if (s < 30 * 86400) return `${Math.round(s / 86400)}d ago`
  return fmtDate(d)
}
export const plural = (n, one, many = `${one}s`) => `${Number(n || 0).toLocaleString('en-NG')} ${Number(n) === 1 ? one : many}`
export const title = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
/** Money stored in kobo, shown in naira. */
export const nairaKobo = (k) => `₦${Math.round((Number(k) || 0) / 100).toLocaleString('en-NG')}`

/** wa.me wants 234XXXXXXXXXX: no plus, no spaces, no leading 0. */
export function waNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('234')) return d
  if (d.startsWith('0')) return `234${d.slice(1)}`
  if (d.length === 10) return `234${d}`
  return d
}
export const waLink = (phone, text = '') => {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : ''
}
export const storeUrl = (slug) => (slug ? `https://sellapage.com.ng/${slug}` : '')

// ── hooks ───────────────────────────────────────────────────────────────────
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

/** True while a CSS media query matches, following resizes. */
export function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [on, setOn] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const m = window.matchMedia(query)
    const fn = () => setOn(m.matches)
    fn()
    m.addEventListener?.('change', fn)
    return () => m.removeEventListener?.('change', fn)
  }, [query])
  return on
}

/** Pages a list that is already in memory. The page is clamped while drawing,
 *  so a page emptied by an action never leaves a blank screen. */
export function useClientPages(rows, perPage = 12) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil((rows?.length || 0) / perPage))
  const safe = Math.min(page, pages)
  const slice = useMemo(() => (rows || []).slice((safe - 1) * perPage, safe * perPage), [rows, safe, perPage])
  return { page: safe, pages, setPage, rows: slice, total: rows?.length || 0 }
}

// ── controls ────────────────────────────────────────────────────────────────
export function Pager({ page, pages, total, perPage, onPage, className = '' }) {
  if (!pages || pages <= 1) {
    return total != null ? <p className={`text-center text-[12px] text-dash-muted ${className}`}>{plural(total, 'item')}</p> : null
  }
  // 1 ... 4 5 6 ... 12, never more than seven buttons.
  const nums = []
  const push = (n) => nums.push(n)
  const lo = Math.max(2, page - 1)
  const hi = Math.min(pages - 1, page + 1)
  push(1)
  if (lo > 2) push('a')
  for (let n = lo; n <= hi; n++) push(n)
  if (hi < pages - 1) push('b')
  push(pages)
  const from = total != null && perPage ? (page - 1) * perPage + 1 : null
  const to = total != null && perPage ? Math.min(page * perPage, total) : null
  return (
    <nav className={`flex flex-col items-center gap-2 sm:flex-row sm:justify-between ${className}`} aria-label="Pages">
      {from != null ? <p className="text-[12px] text-dash-muted">{from.toLocaleString()} to {to.toLocaleString()} of {total.toLocaleString()}</p> : <span />}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 ring-1 ring-dash-line transition hover:bg-slate-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
        {nums.map((n) => (typeof n === 'number' ? (
          <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}
            className={`hidden h-9 min-w-[36px] rounded-xl px-2 text-[13px] font-semibold tabular-nums transition sm:inline-block ${n === page ? 'bg-forest-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{n}</button>
        ) : <span key={n} className="hidden px-1 text-slate-400 sm:inline">...</span>))}
        <span className="px-2 text-[13px] font-semibold tabular-nums text-slate-600 sm:hidden">{page} / {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 ring-1 ring-dash-line transition hover:bg-slate-50 disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </nav>
  )
}

/** A row of filter chips that scrolls sideways on a phone. */
export function Chips({ value, onChange, options, tone = 'dark', size = 'md', className = '' }) {
  const on = tone === 'green' ? 'bg-forest-600 text-white ring-forest-600' : 'bg-dash-ink text-white ring-dash-ink'
  return (
    <div className={`-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full font-semibold ring-1 transition ${size === 'sm' ? 'px-2.5 py-1 text-[11.5px]' : 'px-3.5 py-1.5 text-[12.5px]'} ${value === o.id ? on : 'bg-white text-slate-600 ring-dash-line hover:bg-slate-50'}`}>
          {o.dot && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />}
          {o.label}
          {o.count != null && <span className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${value === o.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{Number(o.count).toLocaleString()}</span>}
        </button>
      ))}
    </div>
  )
}

/** Two to four big choices side by side (a segmented control). */
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex max-w-full overflow-x-auto rounded-2xl bg-slate-100 p-1 [scrollbar-width:none] ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition ${value === o.id ? 'bg-white text-dash-ink shadow-sm' : 'text-slate-500 hover:text-dash-ink'}`}>
          {o.icon}{o.label}
          {o.count != null && <span className="rounded-full bg-slate-200/70 px-1.5 text-[10.5px] tabular-nums text-slate-600">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search', busy = false, className = '' }) {
  return (
    <label className={`relative block ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="search"
        className="h-11 w-full rounded-2xl border border-dash-line bg-white pl-10 pr-10 text-[13.5px] text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50" />
      {busy ? <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        : value ? <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear search"><X size={14} /></button> : null}
    </label>
  )
}

const PILL = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200/60',
  dark: 'bg-dash-ink text-white ring-dash-ink',
  gold: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
}
export function Pill({ tone = 'slate', children, dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ${PILL[tone] || PILL.slate} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}{children}
    </span>
  )
}
const PLAN_TONE = { premium: 'gold', pro: 'dark', growth: 'green', starter: 'slate', free: 'slate' }
export const PlanPill = ({ plan }) => <Pill tone={PLAN_TONE[String(plan || 'starter').toLowerCase()] || 'slate'}>{title(plan || 'starter')}</Pill>

export function Empty({ icon, title: heading, sub, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center ${className}`}>
      {icon && <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">{icon}</span>}
      <p className="mt-3 text-[14.5px] font-bold text-dash-ink">{heading}</p>
      {sub && <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-dash-muted">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const NOTE = {
  error: ['border-red-100 bg-red-50 text-red-700', AlertTriangle],
  ok: ['border-emerald-100 bg-emerald-50 text-emerald-800', CheckCircle2],
  warn: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
  info: ['border-sky-100 bg-sky-50 text-sky-900', Info],
}
export function Notice({ tone = 'info', children, onClose, className = '' }) {
  if (!children) return null
  const [cls, Icon] = NOTE[tone] || NOTE.info
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13px] animate-in fade-in slide-in-from-top-1 ${cls} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {onClose && <button type="button" onClick={onClose} className="rounded-full p-0.5 opacity-60 hover:opacity-100" aria-label="Dismiss"><X size={14} /></button>}
    </div>
  )
}

export function Btn({ tone = 'primary', size = 'md', busy = false, icon, children, className = '', ...props }) {
  const tones = {
    primary: 'bg-forest-600 text-white hover:bg-forest shadow-sm shadow-forest/10',
    dark: 'bg-dash-ink text-white hover:bg-slate-800',
    soft: 'bg-white text-dash-ink ring-1 ring-dash-line hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    'danger-soft': 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    whatsapp: 'bg-[#25D366] text-white hover:bg-[#1fba5a]',
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    white: 'bg-white text-blue-900 hover:bg-blue-50 shadow-sm',
  }
  const sizes = { sm: 'h-8 px-3 text-[12px] rounded-xl gap-1.5', md: 'h-10 px-4 text-[13px] rounded-xl gap-2', lg: 'h-12 px-6 text-[14px] rounded-2xl gap-2' }
  return (
    <button type="button" disabled={busy || props.disabled} {...props}
      className={`inline-flex flex-shrink-0 items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone] || tones.primary} ${sizes[size] || sizes.md} ${className}`}>
      {busy ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" /> : icon}{children}
    </button>
  )
}

/** Copies on click; falls back to selecting the text when the browser says no. */
// `wrap` lets a long value (an account name) run onto a second line instead
// of being cut off.
export function CopyText({ text, label, className = '', wrap = false }) {
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1600) } catch {
      const r = document.createRange(); r.selectNodeContents(ref.current); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
    }
  }
  return (
    <button type="button" onClick={copy} className={`group inline-flex min-w-0 max-w-full ${wrap ? 'items-start' : 'items-center'} gap-1.5 text-left ${className}`} title="Copy">
      <span ref={ref} className={wrap ? 'min-w-0 break-words' : 'truncate'}>{label ?? text}</span>
      {done ? <Check size={13} className="flex-shrink-0 text-emerald-600" /> : <Copy size={13} className="flex-shrink-0 text-slate-400 group-hover:text-forest-600" />}
    </button>
  )
}

// ── overlays ────────────────────────────────────────────────────────────────
// Overlays stack (a confirm dialog over a side panel): Escape closes only the
// one on top.
const escapeStack = []
function useEscape(open, onClose) {
  // The latest onClose, without re-registering (which would reorder the stack).
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  useEffect(() => {
    if (!open) return undefined
    const token = {}
    escapeStack.push(token)
    const k = (e) => { if (e.key === 'Escape' && escapeStack[escapeStack.length - 1] === token) { e.stopPropagation(); close.current?.() } }
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      const i = escapeStack.indexOf(token)
      if (i >= 0) escapeStack.splice(i, 1)
      document.body.style.overflow = prev
    }
  }, [open])
}

/** A side panel on desktop, a bottom sheet on a phone. */
export function Drawer({ open, onClose, title: heading, sub, children, footer, wide = false }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[120] font-body" role="dialog" aria-modal="true" aria-label={typeof heading === 'string' ? heading : 'Details'}>
      <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} aria-label="Close" />
      <aside className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:rounded-none sm:rounded-l-[28px] sm:slide-in-from-bottom-0 sm:slide-in-from-right ${wide === 'xl' ? 'sm:max-w-[min(1000px,94vw)]' : wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 flex-shrink-0 rounded-full bg-slate-200 sm:hidden" />
        <header className="flex flex-shrink-0 items-start gap-3 border-b border-dash-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[18px] font-extrabold leading-tight text-dash-ink">{heading}</h2>
            {sub && <div className="mt-0.5 text-[12.5px] text-dash-muted">{sub}</div>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-dash-ink" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-shrink-0 flex-wrap items-center gap-2 border-t border-dash-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

export function Dialog({ open, onClose, title: heading, children, footer, icon, tone = 'default' }) {
  useEscape(open, onClose)
  if (!open) return null
  const ring = { danger: 'bg-red-50 text-red-600', warn: 'bg-amber-50 text-amber-600', default: 'bg-forest-50 text-forest-600' }[tone] || 'bg-forest-50 text-forest-600'
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center font-body sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof heading === 'string' ? heading : 'Confirm'}>
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 sm:max-w-md sm:rounded-[28px]">
        <div className="overflow-y-auto px-6 pb-2 pt-6">
          <div className="flex items-start gap-3">
            {icon && <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${ring}`}>{icon}</span>}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[18px] font-extrabold leading-snug text-dash-ink">{heading}</h2>
              <div className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{children}</div>
            </div>
          </div>
        </div>
        {footer && <div className="flex flex-shrink-0 flex-col-reverse gap-2 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * const [confirmUi, confirm] = useConfirm()
 * const { ok, reason } = await confirm({ title, body, confirmLabel, tone,
 *   reason: { label, placeholder, required, min }, checklist: ['...'] })
 * Render {confirmUi} once in the tab.
 */
export function useConfirm() {
  const [ask, setAsk] = useState(null)
  const [reason, setReason] = useState('')
  const [ticks, setTicks] = useState({})
  const resolver = useRef(null)
  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setReason(opts?.reason?.initial || '')
    setTicks({})
    setAsk(opts)
  }), [])
  const close = (ok) => {
    const r = resolver.current
    resolver.current = null
    setAsk(null)
    r?.({ ok, reason: reason.trim() })
  }
  const min = ask?.reason?.required ? Math.max(1, ask.reason.min || 1) : 0
  const listOk = !ask?.checklist?.length || ask.checklist.every((_, i) => ticks[i])
  const ready = reason.trim().length >= min && listOk
  const ui = (
    <Dialog open={!!ask} onClose={() => close(false)} title={ask?.title} icon={ask?.icon} tone={ask?.tone === 'danger' ? 'danger' : ask?.tone === 'warn' ? 'warn' : 'default'}
      footer={<>
        <Btn tone="soft" onClick={() => close(false)}>{ask?.cancelLabel || 'Cancel'}</Btn>
        <Btn tone={ask?.tone === 'danger' ? 'danger' : 'primary'} disabled={!ready} onClick={() => close(true)}>{ask?.confirmLabel || 'Confirm'}</Btn>
      </>}>
      {ask?.body}
      {ask?.checklist?.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ask.checklist.map((c, i) => (
            <li key={c}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 ring-1 ring-slate-100 hover:bg-slate-100">
                <input type="checkbox" checked={!!ticks[i]} onChange={(e) => setTicks((t) => ({ ...t, [i]: e.target.checked }))} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#0b6b35]" />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {ask?.reason && (
        <label className="mt-3 block">
          <span className="text-[12px] font-semibold text-slate-700">{ask.reason.label}{ask.reason.required ? '' : ' (optional)'}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, ask.reason.max || 500))} rows={3} placeholder={ask.reason.placeholder || ''} autoFocus
            className="mt-1.5 w-full resize-none rounded-2xl border border-dash-line bg-slate-50 px-3.5 py-2.5 text-[13.5px] text-dash-ink outline-none focus:border-forest-600 focus:bg-white focus:ring-4 focus:ring-forest-50" />
          {min > 1 && reason.trim().length < min && <span className="mt-1 block text-[11.5px] text-slate-400">At least {min} characters.</span>}
        </label>
      )}
    </Dialog>
  )
  return [ui, confirm]
}

/** A labelled value inside a drawer. */
export function Field({ label, children, className = '' }) {
  if (children == null || children === '' || children === false) return null
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="mt-0.5 break-words text-[13.5px] text-dash-ink">{children}</div>
    </div>
  )
}

/** Image lightbox for evidence and media. */
export function Lightbox({ src, onClose }) {
  useEscape(!!src, onClose)
  if (!src) return null
  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4 animate-in fade-in" role="dialog" aria-modal="true" aria-label="Image" onClick={onClose}>
      <img src={src} alt="" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X size={20} /></button>
    </div>,
    document.body,
  )
}

/** A big number that counts up once when it appears. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-NG'), ms = 900 }) {
  const [v, setV] = useState(0)
  const target = Number(value) || 0
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setV(target); return undefined }
    const start = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return <>{format(v)}</>
}

/** Thin bar, scaled to `of`. */
export function Meter({ value, of, tone = 'bg-forest-600', className = 'h-2' }) {
  const pct = of > 0 ? Math.min(100, (Number(value) / of) * 100) : 0
  return <div className={`overflow-hidden rounded-full bg-slate-100 ${className}`}><div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
}
