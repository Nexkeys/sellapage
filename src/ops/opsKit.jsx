// src/ops/opsKit.jsx
//
// Small shared pieces for the Ops console: the icon for a tab (from the name
// in utils/opsAccess.js), a guard so one broken card cannot blank the console,
// a data hook, and three tiny SVG charts (sparkline, ring, bars) that cost
// nothing to load. Bigger charts use recharts inside their own tabs.
import { Component, useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  AlertTriangle, RefreshCw, Activity, Rocket, PhoneCall, BarChart3, Wallet, Store, TrendingUp, Banknote, Gift, Boxes, FileCheck, Flag,
  Star, Briefcase, Link2, Database, Bot, Sparkles, BookOpen, Mail, Megaphone, Bell, MessageSquare, Send, LifeBuoy, Shield, ScrollText,
  KeyRound, Circle,
} from 'lucide-react'
import { opsJson } from './opsSession'
import { initials, avatarTone } from './opsUi'

// Only the icons the tab list (utils/opsAccess.js) names. A new tab with a
// new icon name: add it here, or it shows a plain circle until you do.
const ICONS = {
  Activity, Rocket, PhoneCall, BarChart3, Wallet, Store, TrendingUp, Banknote, Gift, Boxes, FileCheck, Flag, Star, Briefcase, Link2,
  Database, Bot, Sparkles, BookOpen, Mail, Megaphone, Bell, MessageSquare, Send, LifeBuoy, Shield, ScrollText, KeyRound,
}

export function TabIcon({ name, ...props }) {
  const Icon = ICONS[name] || Circle
  return <Icon {...props} />
}

/** A card or a whole tab that crashed shows this instead of a blank page. */
export class OpsBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('[ops] view crashed', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-red-200 bg-red-50/40 px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle size={20} /></span>
        <p className="mt-3 text-[14px] font-semibold text-dash-ink">{this.props.label || 'This part'} could not load</p>
        <p className="mt-1 text-[12.5px] text-dash-muted">The rest of the console still works.</p>
        <button type="button" onClick={() => this.setState({ error: null })} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><RefreshCw size={13} /> Try again</button>
      </div>
    )
  }
}

/** GET an ops endpoint with loading / error / reload. */
export function useOpsData(path, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: !!enabled })
  const alive = useRef(true)
  const load = useCallback(async () => {
    if (!path) return
    setState((s) => ({ ...s, loading: true, error: '' }))
    const { ok, data } = await opsJson(path)
    if (!alive.current) return
    setState({ data: ok ? data : null, error: ok ? '' : data.message || data.error || 'Could not load.', loading: false })
  }, [path])
  useEffect(() => {
    alive.current = true
    if (enabled) load()
    return () => { alive.current = false }
  }, [load, enabled])
  return { ...state, reload: load }
}

export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
export const compact = (n) => {
  const v = Number(n) || 0
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`
  if (v >= 1e4) return `${(v / 1e3).toFixed(0)}k`
  return v.toLocaleString('en-NG')
}

export function Sparkline({ values = [], width = 120, height = 36, stroke = '#0b6b35', fill = true }) {
  const id = useId().replace(/:/g, '')
  if (!values.length) return <svg width={width} height={height} aria-hidden="true" />
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#sg${id})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="[stroke-dasharray:600] [stroke-dashoffset:600] motion-safe:animate-[sp-draw_1.2s_ease-out_forwards] motion-reduce:[stroke-dashoffset:0]" />
      <style>{'@keyframes sp-draw{to{stroke-dashoffset:0}}'}</style>
    </svg>
  )
}

export function Ring({ value = 0, size = 96, stroke = 9, color = '#0b6b35', track = '#e6f4ec', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = setTimeout(() => setShown(value), 60); return () => clearTimeout(t) }, [value])
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(shown, 100) / 100)} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/** Horizontal bars, each labelled, scaled to the largest. */
export function Bars({ rows = [], color = 'bg-forest-600', format = (v) => v }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]"><span className="truncate text-slate-600">{r.label}</span><span className="font-semibold tabular-nums text-dash-ink">{format(r.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${r.color || color} transition-all duration-700`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export function Card({ title, sub, icon, right, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="flex items-center gap-2 text-[15px] font-bold text-dash-ink">{icon}{title}</h3>}
            {sub && <p className="mt-0.5 text-[12px] text-dash-muted">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Shimmer({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
}

/** A person: their photo if they added one, otherwise their initials. */
export function Avatar({ person, size = 36, ring = false }) {
  const px = `${size}px`
  if (person?.photoUrl) return <img src={person.photoUrl} alt="" className={`flex-shrink-0 rounded-full object-cover ${ring ? 'ring-2 ring-white' : ''}`} style={{ width: px, height: px }} />
  return <span className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold ${avatarTone(person?.uid)} ${ring ? 'ring-2 ring-white' : ''}`} style={{ width: px, height: px, fontSize: size * 0.36 }}>{initials(person?.name)}</span>
}
