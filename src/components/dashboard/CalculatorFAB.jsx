// src/components/dashboard/CalculatorFAB.jsx
// The dashboard calculator, available to every plan, opened from the
// "Calculator" item in the sidebar (DashboardLayout). The file keeps its old
// name so existing imports and history stay valid.
//
// Rebuilt on 2026-09-29 to the calculator design: a dark keypad with orange
// operators, an optional scientific row, and four tabs along the bottom:
//   TAPE  every sum you have done, tap one to use its answer again
//   CALC  the calculator (expressions with brackets, % the shop way)
//   CONV  business tools (profit, checkout fee, VAT, discount) and units
//   SET   degrees/radians, decimals, separators, key vibration
// The maths lives in ./calc/engine.js (a parser, never eval). History and
// settings stay on this device only.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X, History, Calculator as CalcIcon, ArrowLeftRight, Settings2, Delete, Copy, Check, ChevronDown,
  ArrowUpDown, CornerDownLeft, FlaskConical, TrendingUp, Receipt, Percent, Tag,
} from 'lucide-react'
import { tryEvaluate, formatNumber, checkoutFee, VAT_RATE, UNITS, convertUnit } from './calc/engine'

const LS_HISTORY = 'sellapage_calc_history'
const LS_SETTINGS = 'sellapage_calc_settings'
const MAX_HISTORY = 100
const ORANGE = '#f5a33b'

const readJson = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fallback } catch { return fallback } }
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

const DEFAULT_SETTINGS = { degrees: true, decimals: 'auto', separators: true, vibrate: true, scientific: false }

// The design's monospaced look. Loaded only the first time the calculator
// opens, so nobody else pays for the font.
let fontLoaded = false
function useMonoFont(open) {
  useEffect(() => {
    if (!open || fontLoaded) return
    fontLoaded = true
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap'
    document.head.appendChild(link)
  }, [open])
}
const MONO = { fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }

const OPS = ['+', '−', '×', '÷', '^']
const endsWithOp = (s) => OPS.some((o) => s.endsWith(o))

function Key({ label, onClick, kind = 'num', wide = false, active = false, small = false, aria }) {
  // Round keys, as in the design; "0" is the one pill.
  const base = small
    ? 'h-9 rounded-full text-[12px]'
    : wide
      ? 'col-span-2 h-full rounded-full justify-start pl-7 text-[21px]'
      : `aspect-square w-full rounded-full ${kind === 'op' || kind === 'eq' ? 'text-[26px]' : 'text-[21px]'}`
  const look = {
    num: 'bg-[#2a2b2e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_3px_6px_rgba(0,0,0,0.45)] hover:bg-[#323337]',
    fn: 'bg-[#393a3e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_3px_6px_rgba(0,0,0,0.45)] hover:bg-[#424347]',
    sci: 'bg-[#26272a] text-[#d7d7da] hover:bg-[#2f3034]',
    op: 'bg-[#232427] text-[#f5a33b] ring-[1.5px] ring-[#f5a33b] shadow-[0_3px_6px_rgba(0,0,0,0.45)] hover:bg-[#2b2a27]',
    eq: 'bg-[#f5a33b] text-[#1c1d1f] shadow-[0_4px_14px_rgba(245,163,59,0.35)] hover:bg-[#f7ae50]',
  }[kind]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria || String(label)}
      style={kind === 'op' ? { color: ORANGE, boxShadow: `inset 0 0 0 1.5px ${ORANGE}, 0 3px 6px rgba(0,0,0,.45)` } : undefined}
      className={`flex select-none items-center justify-center font-medium transition-[transform,background-color] duration-100 active:scale-[0.93] ${base} ${look} ${active ? 'bg-[#3a3326]' : ''}`}
    >
      {label}
    </button>
  )
}

function Field({ label, value, onChange, suffix, prefix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8b90]">{label}</span>
      <span className="flex items-center rounded-2xl bg-[#26272a] px-4 ring-1 ring-white/5 focus-within:ring-[#f5a33b]/60">
        {prefix && <span className="mr-1.5 text-[#8a8b90]">{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          placeholder="0"
          className="h-12 w-full bg-transparent text-[18px] text-white outline-none placeholder:text-[#55565b]"
          style={MONO}
        />
        {suffix && <span className="ml-1.5 text-[#8a8b90]">{suffix}</span>}
      </span>
    </label>
  )
}

function Result({ label, value, big = false, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[12px] text-[#8a8b90]">{label}</span>
      <span className={`tabular-nums ${big ? 'text-[24px] text-white' : 'text-[15px] text-[#e9e9eb]'} ${tone || ''}`} style={MONO}>{value}</span>
    </div>
  )
}

export default function CalculatorFAB({ open = false, onClose = () => {}, besideNav = false }) {
  useMonoFont(open)
  const [tab, setTab] = useState('calc')
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readJson(LS_SETTINGS, {}) }))
  const [history, setHistory] = useState(() => {
    const raw = readJson(LS_HISTORY, [])
    return Array.isArray(raw) ? raw : []
  })
  const [expr, setExpr] = useState('')
  const [evaluated, setEvaluated] = useState(null) // { expr, value } right after "="
  const [inv, setInv] = useState(false)
  const [flash, setFlash] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [pop, setPop] = useState(0)

  const saveSettings = (patch) => setSettings((s) => { const n = { ...s, ...patch }; writeJson(LS_SETTINGS, n); return n })
  const fmt = useCallback((v) => formatNumber(v, { decimals: settings.decimals, separators: settings.separators }), [settings.decimals, settings.separators])
  const preview = useMemo(() => tryEvaluate(expr, { degrees: settings.degrees }), [expr, settings.degrees])

  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(''), 1600)
    return () => clearTimeout(t)
  }, [flash])

  const buzz = () => { if (settings.vibrate) try { navigator.vibrate?.(8) } catch { /* not supported */ } }

  // ── Typing ──────────────────────────────────────────────────────────────
  const append = (s) => {
    buzz()
    setExpr((cur) => {
      let base = cur
      if (evaluated) {
        // After "=", a digit starts fresh; an operator carries the answer on.
        base = /^[0-9.(πe√]|^sin|^cos|^tan|^log|^ln|^a/.test(s) ? '' : String(evaluated.value)
        setEvaluated(null)
      }
      if (OPS.includes(s)) {
        if (!base) return s === '−' ? '−' : base
        // A second operator replaces the first, except a minus after an
        // operator or bracket, which starts a negative number.
        if (endsWithOp(base) && !(s === '−' && !base.endsWith('−'))) return base.slice(0, -1) + s
        if (base.endsWith('(') && s !== '−') return base
      }
      if (s === '.') {
        const seg = base.split(/[+−×÷^()]/).pop()
        if (seg.includes('.')) return base
        if (!seg) return `${base}0.`
      }
      if (base.length >= 80) return base
      return base + s
    })
  }
  const backspace = () => {
    buzz()
    if (evaluated) { setEvaluated(null); return }
    setExpr((cur) => {
      const fn = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '10^(', 'e^(', '√('].find((f) => cur.endsWith(f))
      return fn ? cur.slice(0, -fn.length) : cur.slice(0, -1)
    })
  }
  const clearAll = () => { buzz(); setExpr(''); setEvaluated(null) }
  const toggleSign = () => {
    buzz()
    setExpr((cur) => {
      const src = evaluated ? String(evaluated.value) : cur
      setEvaluated(null)
      const m = src.match(/(^|[+−×÷^(])(−?)(\d*\.?\d+)$/)
      if (!m) return src
      const head = src.slice(0, src.length - m[0].length) + m[1]
      return head + (m[2] ? '' : '−') + m[3]
    })
  }
  const equals = () => {
    buzz()
    if (!expr) return
    const v = tryEvaluate(expr, { degrees: settings.degrees })
    if (v === null) { setFlash('Check that sum, something is missing'); return }
    const entry = { id: Date.now(), expr, result: fmt(v), value: v, at: new Date().toISOString() }
    setHistory((h) => { const next = [entry, ...h].slice(0, MAX_HISTORY); writeJson(LS_HISTORY, next); return next })
    setEvaluated({ expr, value: v })
    setExpr('')
    setPop((n) => n + 1)
  }

  const sci = (name) => {
    const map = inv
      ? { sin: 'asin(', cos: 'acos(', tan: 'atan(', log: '10^(', ln: 'e^(' }
      : { sin: 'sin(', cos: 'cos(', tan: 'tan(', log: 'log(', ln: 'ln(' }
    append(map[name])
  }

  // Keyboard, only while the calculator tab is showing and not in a field.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (tab !== 'calc') return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (/^[0-9]$/.test(k) || k === '.') { e.preventDefault(); append(k) }
      else if (k === '+') { e.preventDefault(); append('+') }
      else if (k === '-') { e.preventDefault(); append('−') }
      else if (k === '*' || k === 'x') { e.preventDefault(); append('×') }
      else if (k === '/') { e.preventDefault(); append('÷') }
      else if (k === '^') { e.preventDefault(); append('^') }
      else if (k === '(' || k === ')' || k === '%' || k === '!') { e.preventDefault(); append(k) }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals() }
      else if (k === 'Backspace') { e.preventDefault(); backspace() }
      else if (k === 'Delete') { e.preventDefault(); clearAll() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(String(text).replace(/,/g, '')); setFlash('Copied') } catch { setFlash('Could not copy on this device') }
  }
  const sendToCalc = (v) => { setEvaluated({ expr: 'Ans', value: Number(v) }); setExpr(''); setTab('calc'); setFlash('Ready on the calculator') }

  // ── Display text ────────────────────────────────────────────────────────
  const topLine = evaluated ? evaluated.expr : expr ? expr : history[0] ? `${history[0].expr} =` : ''
  const bigLine = evaluated
    ? fmt(evaluated.value)
    : expr
      ? (preview !== null && /[+−×÷^!²%(]|sin|cos|tan|log|ln|√/.test(expr) ? fmt(preview) : expr.replace(/(\d+)(\.\d*)?/g, (m, a, b) => (settings.separators ? Number(a).toLocaleString('en-US') : a) + (b || '')))
      : '0'
  // "124×12" reads as "124 × 12", like the design. Display only.
  const spaced = (t) => String(t)
    .replace(/([+×÷^])/g, ' $1 ')
    .replace(/([0-9.)πe!²%])−/g, '$1 − ')
    .replace(/\s+/g, ' ')
    .trim()
  const bigSize = bigLine.length > 16 ? 'text-[26px]' : bigLine.length > 11 ? 'text-[34px]' : 'text-[46px]'

  // ── Converter state ─────────────────────────────────────────────────────
  const [convMode, setConvMode] = useState('business')
  const [tool, setTool] = useState('profit')
  const [f, setF] = useState({ cost: '', sell: '', price: '', vatAmt: '', vatMode: 'add', disc: '', discPct: '' })
  const [unitKind, setUnitKind] = useState('length')
  const [unitVal, setUnitVal] = useState('1')
  const [unitFrom, setUnitFrom] = useState('yd')
  const [unitTo, setUnitTo] = useState('m')
  const n = (v) => Number(v) || 0
  const naira = (v) => `₦${formatNumber(v, { decimals: 2, separators: true }).replace(/\.00$/, '')}`

  if (!open) return null

  const tabs = [
    { id: 'tape', label: 'Tape', icon: History },
    { id: 'calc', label: 'Calc', icon: CalcIcon },
    { id: 'conv', label: 'Conv', icon: ArrowLeftRight },
    { id: 'set', label: 'Set', icon: Settings2 },
  ]

  return (
    <div className={`fixed inset-0 z-[65] flex items-end justify-center sm:items-end sm:justify-start sm:p-5 sm:pointer-events-none ${besideNav ? 'md:pl-[276px]' : ''}`}>
      <style>{'@keyframes calc-pop{0%{transform:scale(.96);opacity:.4}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}.calc-pop{animation:calc-pop .28s ease-out}@media (prefers-reduced-motion: reduce){.calc-pop{animation:none}}'}</style>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sm:hidden" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Calculator"
        className="relative flex h-[90vh] max-h-[720px] w-full flex-col overflow-hidden rounded-t-[30px] bg-[#1c1d1f] text-white shadow-2xl ring-1 ring-white/10 sm:pointer-events-auto sm:h-[700px] sm:max-h-[calc(100vh-40px)] sm:w-[360px] sm:rounded-[30px] animate-in slide-in-from-bottom-4 fade-in duration-200"
        style={MONO}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <span className="mx-auto h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2">
          <p className="text-[17px] text-white">
            {tab === 'tape' ? 'History Tape' : tab === 'conv' ? 'Convert' : tab === 'set' ? 'Settings' : 'Calculator'}
          </p>
          <div className="flex items-center gap-1.5">
            {tab === 'tape' && history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2500); return }
                  setHistory([]); writeJson(LS_HISTORY, []); setConfirmClear(false); setFlash('Tape cleared')
                }}
                className="rounded-full bg-[#3a2c1a] px-3 py-1 text-[12px] font-medium text-[#f5a33b] transition hover:bg-[#473520]"
              >
                {confirmClear ? 'Tap again' : 'Clear'}
              </button>
            )}
            {tab === 'calc' && (
              <button type="button" onClick={() => saveSettings({ scientific: !settings.scientific })} aria-pressed={settings.scientific}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] transition ${settings.scientific ? 'bg-[#3a2c1a] text-[#f5a33b]' : 'bg-white/5 text-[#a5a6ab] hover:text-white'}`}>
                <FlaskConical size={13} /> Sci
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-full p-2 text-[#8a8b90] transition hover:bg-white/10 hover:text-white" aria-label="Close calculator"><X size={17} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'calc' && (
            <div className="flex h-full flex-col px-4 pb-3">
              <div className="flex flex-1 flex-col items-end justify-end gap-1 px-1 pb-3 pt-2">
                <p className="w-full truncate text-right text-[14px] text-[#8a8b90]">{topLine ? spaced(topLine) : ' '}</p>
                <div className="flex w-full items-center justify-end gap-1">
                  {expr && !evaluated && (
                    <button type="button" onClick={backspace} className="rounded-full p-1.5 text-[#6f7075] transition hover:bg-white/5 hover:text-white" aria-label="Delete last"><Delete size={17} /></button>
                  )}
                  {(expr || evaluated) && (
                    <button type="button" onClick={() => copy(bigLine)} className="rounded-full p-1.5 text-[#6f7075] transition hover:bg-white/5 hover:text-white" aria-label="Copy result"><Copy size={15} /></button>
                  )}
                  <p key={pop} className={`calc-pop min-w-0 truncate text-right tabular-nums text-white ${bigSize}`}>{bigLine}</p>
                </div>
                {expr && !evaluated && preview === null && /[+−×÷^(]$/.test(expr) === false && /[+−×÷^]/.test(expr) && (
                  <p className="text-[11px] text-[#c78a3a]">Keep going, that sum isn&apos;t finished</p>
                )}
              </div>

              {settings.scientific && (
                <div className="mb-3 grid grid-cols-5 gap-2 border-b border-white/5 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {['sin', 'cos', 'tan', 'log', 'ln'].map((k) => (
                    <Key key={k} small kind="sci" label={inv ? (k === 'log' ? '10ˣ' : k === 'ln' ? 'eˣ' : `${k}⁻¹`) : k} onClick={() => sci(k)} />
                  ))}
                  <Key small kind="sci" label="(" onClick={() => append('(')} />
                  <Key small kind="sci" label=")" onClick={() => append(')')} />
                  <Key small kind="sci" label="x²" onClick={() => append('²')} aria="square" />
                  <Key small kind="sci" label="√" onClick={() => append('√(')} aria="square root" />
                  <Key small kind="sci" label="^" onClick={() => append('^')} aria="power" />
                  <Key small kind="sci" label="π" onClick={() => append('π')} />
                  <Key small kind="sci" label="e" onClick={() => append('e')} />
                  <Key small kind="sci" label="x!" onClick={() => append('!')} aria="factorial" />
                  <Key small kind="sci" label={settings.degrees ? 'Deg' : 'Rad'} onClick={() => saveSettings({ degrees: !settings.degrees })} aria="switch degrees and radians" />
                  <Key small kind="sci" label="Inv" active={inv} onClick={() => setInv((v) => !v)} aria="inverse functions" />
                </div>
              )}

              <div className={`mx-auto grid w-full grid-cols-4 ${settings.scientific ? 'max-w-[272px] gap-2.5' : 'max-w-[312px] gap-3'}`}>
                <Key kind="fn" label={expr || evaluated ? 'C' : 'AC'} onClick={clearAll} aria="clear" />
                <Key kind="fn" label="+/-" onClick={toggleSign} aria="change sign" />
                <Key kind="fn" label="%" onClick={() => append('%')} aria="percent" />
                <Key kind="op" label="÷" onClick={() => append('÷')} aria="divide" />
                {['7', '8', '9'].map((d) => <Key key={d} label={d} onClick={() => append(d)} />)}
                <Key kind="op" label="×" onClick={() => append('×')} aria="times" />
                {['4', '5', '6'].map((d) => <Key key={d} label={d} onClick={() => append(d)} />)}
                <Key kind="op" label="−" onClick={() => append('−')} aria="minus" />
                {['1', '2', '3'].map((d) => <Key key={d} label={d} onClick={() => append(d)} />)}
                <Key kind="op" label="+" onClick={() => append('+')} aria="plus" />
                <Key label="0" wide onClick={() => append('0')} />
                <Key label="." onClick={() => append('.')} aria="decimal point" />
                <Key kind="eq" label="=" onClick={equals} aria="equals" />
              </div>
            </div>
          )}

          {tab === 'tape' && (
            <div className="px-5 pb-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#26272a]"><History size={22} className="text-[#f5a33b]" /></span>
                  <p className="mt-4 text-[14px] text-white">Your tape is empty</p>
                  <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-[#8a8b90]">Every sum you finish lands here, so you never lose a total you worked out for a customer.</p>
                  <button type="button" onClick={() => setTab('calc')} className="mt-4 rounded-full bg-[#f5a33b] px-4 py-2 text-[12px] font-medium text-[#1c1d1f]">Start calculating</button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id}>
                      <div className="group flex items-end gap-2 rounded-2xl px-2 py-3 transition hover:bg-white/[0.03]">
                        <button type="button" onClick={() => sendToCalc(h.value ?? String(h.result).replace(/,/g, ''))} className="min-w-0 flex-1 text-right" aria-label={`Use ${h.result}`}>
                          <p className="truncate text-[13px] text-[#8a8b90]">{spaced(String(h.expr).replace(/ =$/, ''))}</p>
                          <p className="mt-0.5 truncate text-[24px] tabular-nums text-white">{h.result}</p>
                        </button>
                        <div className="flex flex-col gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <button type="button" onClick={() => copy(h.result)} className="rounded-full p-1.5 text-[#8a8b90] hover:bg-white/10 hover:text-white" aria-label="Copy"><Copy size={13} /></button>
                          <button type="button" onClick={() => sendToCalc(h.value ?? String(h.result).replace(/,/g, ''))} className="rounded-full p-1.5 text-[#8a8b90] hover:bg-white/10 hover:text-[#f5a33b]" aria-label="Use answer"><CornerDownLeft size={13} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'conv' && (
            <div className="space-y-4 px-5 pb-5">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-[#26272a] p-1">
                {[['business', 'Business'], ['units', 'Units']].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setConvMode(id)} className={`rounded-full py-2 text-[12px] transition ${convMode === id ? 'bg-[#f5a33b] text-[#1c1d1f]' : 'text-[#a5a6ab] hover:text-white'}`}>{label}</button>
                ))}
              </div>

              {convMode === 'business' ? (
                <>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[['profit', 'Profit', TrendingUp], ['fee', 'Fee', Receipt], ['vat', 'VAT', Percent], ['disc', 'Discount', Tag]].map(([id, label, Icon]) => (
                      <button key={id} type="button" onClick={() => setTool(id)} className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] transition ${tool === id ? 'bg-[#3a2c1a] text-[#f5a33b] ring-1 ring-[#f5a33b]/40' : 'bg-[#26272a] text-[#a5a6ab] hover:text-white'}`}>
                        <Icon size={16} /> {label}
                      </button>
                    ))}
                  </div>

                  {tool === 'profit' && (() => {
                    const cost = n(f.cost); const sell = n(f.sell); const profit = sell - cost
                    const margin = sell ? (profit / sell) * 100 : 0; const markup = cost ? (profit / cost) * 100 : 0
                    const ready = cost > 0 && sell > 0
                    return (
                      <div className="space-y-3">
                        <Field label="Cost price" prefix="₦" value={f.cost} onChange={(v) => setF((p) => ({ ...p, cost: v }))} />
                        <Field label="Selling price" prefix="₦" value={f.sell} onChange={(v) => setF((p) => ({ ...p, sell: v }))} />
                        <div className="rounded-2xl bg-[#232427] p-4">
                          <Result big label="Profit per sale" value={ready ? naira(profit) : '₦0'} tone={profit < 0 ? 'text-red-400' : ''} />
                          <Result label="Margin" value={ready ? `${margin.toFixed(1)}%` : '0%'} />
                          <Result label="Markup" value={ready ? `${markup.toFixed(1)}%` : '0%'} />
                          {ready && (
                            <p className={`mt-2 text-[12px] ${profit < 0 ? 'text-red-400' : margin >= 30 ? 'text-[#7ee0a1]' : 'text-[#c9a46a]'}`}>
                              {profit < 0 ? 'You are selling at a loss on this one.' : margin >= 30 ? 'Healthy margin. Nice work, boss.' : 'Thin margin. Delivery or fees could eat it up.'}
                            </p>
                          )}
                        </div>
                        {ready && <button type="button" onClick={() => sendToCalc(profit)} className="w-full rounded-full bg-white/5 py-2.5 text-[12px] text-[#e9e9eb] hover:bg-white/10">Use profit on calculator</button>}
                      </div>
                    )
                  })()}

                  {tool === 'fee' && (() => {
                    const price = n(f.price); const fee = price > 0 ? checkoutFee(price) : 0
                    return (
                      <div className="space-y-3">
                        <Field label="Your price" prefix="₦" value={f.price} onChange={(v) => setF((p) => ({ ...p, price: v }))} />
                        <div className="rounded-2xl bg-[#232427] p-4">
                          <Result label="Checkout fee (1.5% + ₦100, max ₦2,000)" value={naira(fee)} />
                          <Result big label="Customer pays" value={naira(price + fee)} />
                          <Result label="You receive" value={naira(price)} tone="text-[#7ee0a1]" />
                          <p className="mt-2 text-[12px] leading-relaxed text-[#8a8b90]">Sellapage checkout adds the fee on top, so the full price lands with you.</p>
                        </div>
                      </div>
                    )
                  })()}

                  {tool === 'vat' && (() => {
                    const a = n(f.vatAmt); const adding = f.vatMode === 'add'
                    const vat = adding ? a * VAT_RATE : a - a / (1 + VAT_RATE)
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#26272a] p-1">
                          {[['add', 'Add VAT'], ['remove', 'Price includes VAT']].map(([id, label]) => (
                            <button key={id} type="button" onClick={() => setF((p) => ({ ...p, vatMode: id }))} className={`rounded-full py-2 text-[11px] transition ${f.vatMode === id ? 'bg-white/10 text-white' : 'text-[#8a8b90]'}`}>{label}</button>
                          ))}
                        </div>
                        <Field label="Amount" prefix="₦" value={f.vatAmt} onChange={(v) => setF((p) => ({ ...p, vatAmt: v }))} />
                        <div className="rounded-2xl bg-[#232427] p-4">
                          <Result label="VAT at 7.5%" value={naira(vat)} />
                          <Result big label={adding ? 'Total with VAT' : 'Price before VAT'} value={naira(adding ? a + vat : a - vat)} />
                        </div>
                      </div>
                    )
                  })()}

                  {tool === 'disc' && (() => {
                    const price = n(f.disc); const pct = Math.min(100, n(f.discPct)); const off = (price * pct) / 100
                    return (
                      <div className="space-y-3">
                        <Field label="Original price" prefix="₦" value={f.disc} onChange={(v) => setF((p) => ({ ...p, disc: v }))} />
                        <Field label="Discount" suffix="%" value={f.discPct} onChange={(v) => setF((p) => ({ ...p, discPct: v }))} />
                        <div className="rounded-2xl bg-[#232427] p-4">
                          <Result big label="Sale price" value={naira(price - off)} />
                          <Result label="Customer saves" value={naira(off)} tone="text-[#7ee0a1]" />
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (() => {
                const kind = UNITS[unitKind]
                const out = convertUnit(unitKind, n(unitVal), unitFrom, unitTo)
                const sel = 'h-11 w-full appearance-none rounded-2xl bg-[#26272a] px-4 text-[13px] text-white outline-none ring-1 ring-white/5 focus:ring-[#f5a33b]/60'
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(UNITS).map(([id, u]) => (
                        <button key={id} type="button" onClick={() => { setUnitKind(id); const keys = Object.keys(u.units); setUnitFrom(keys[0]); setUnitTo(keys[1]) }}
                          className={`rounded-2xl py-2.5 text-[12px] transition ${unitKind === id ? 'bg-[#3a2c1a] text-[#f5a33b] ring-1 ring-[#f5a33b]/40' : 'bg-[#26272a] text-[#a5a6ab] hover:text-white'}`}>{u.label}</button>
                      ))}
                    </div>
                    <Field label="Value" value={unitVal} onChange={setUnitVal} />
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <label className="relative block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8b90]">From</span>
                        <select value={unitFrom} onChange={(e) => setUnitFrom(e.target.value)} className={sel}>
                          {Object.entries(kind.units).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-[#8a8b90]" />
                      </label>
                      <button type="button" onClick={() => { setUnitFrom(unitTo); setUnitTo(unitFrom) }} className="mb-1 rounded-full bg-[#26272a] p-2.5 text-[#f5a33b] hover:bg-[#2f3034]" aria-label="Swap units"><ArrowUpDown size={15} /></button>
                      <label className="relative block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8b90]">To</span>
                        <select value={unitTo} onChange={(e) => setUnitTo(e.target.value)} className={sel}>
                          {Object.entries(kind.units).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute bottom-3.5 right-3 text-[#8a8b90]" />
                      </label>
                    </div>
                    <div className="rounded-2xl bg-[#232427] p-4 text-right">
                      <p className="text-[12px] text-[#8a8b90]">{formatNumber(n(unitVal), { decimals: 'auto' })} {kind.units[unitFrom][0].toLowerCase()} =</p>
                      <p className="mt-1 text-[30px] tabular-nums text-white">{out === null ? '0' : formatNumber(out, { decimals: 'auto' }).replace(/(\.\d{4})\d+/, '$1')}</p>
                      <p className="text-[12px] text-[#f5a33b]">{kind.units[unitTo][0].toLowerCase()}</p>
                    </div>
                    {out !== null && <button type="button" onClick={() => sendToCalc(Number(out.toPrecision(10)))} className="w-full rounded-full bg-white/5 py-2.5 text-[12px] text-[#e9e9eb] hover:bg-white/10">Use on calculator</button>}
                  </div>
                )
              })()}
            </div>
          )}

          {tab === 'set' && (
            <div className="space-y-2 px-5 pb-5">
              {[
                { k: 'degrees', label: 'Angles in degrees', sub: 'Off means radians, for trig on the scientific row' },
                { k: 'separators', label: 'Thousand separators', sub: 'Shows 1,488 instead of 1488' },
                { k: 'scientific', label: 'Show scientific keys', sub: 'sin, cos, log, brackets and powers' },
                ...(typeof navigator !== 'undefined' && navigator.vibrate ? [{ k: 'vibrate', label: 'Vibrate on key press', sub: 'A tiny tap you can feel' }] : []),
              ].map((o) => (
                <button key={o.k} type="button" role="switch" aria-checked={!!settings[o.k]} onClick={() => saveSettings({ [o.k]: !settings[o.k] })}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#232427] px-4 py-3.5 text-left">
                  <span>
                    <span className="block text-[13px] text-white">{o.label}</span>
                    <span className="block text-[11px] text-[#8a8b90]">{o.sub}</span>
                  </span>
                  <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${settings[o.k] ? 'bg-[#f5a33b]' : 'bg-[#3a3b3f]'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settings[o.k] ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                </button>
              ))}
              <div className="rounded-2xl bg-[#232427] px-4 py-3.5">
                <p className="text-[13px] text-white">Decimal places</p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {['auto', '0', '2', '4'].map((d) => (
                    <button key={d} type="button" onClick={() => saveSettings({ decimals: d })} className={`rounded-full py-1.5 text-[12px] transition ${settings.decimals === d ? 'bg-[#f5a33b] text-[#1c1d1f]' : 'bg-[#2c2d31] text-[#a5a6ab] hover:text-white'}`}>{d === 'auto' ? 'Auto' : d}</button>
                  ))}
                </div>
              </div>
              <p className="px-1 pt-2 text-[11px] leading-relaxed text-[#6f7075]">Your tape and settings stay on this device. Keyboard works too: numbers, + - * /, Enter, Backspace.</p>
            </div>
          )}
        </div>

        {/* Toast */}
        {flash && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-white px-3.5 py-1.5 text-[12px] text-[#1c1d1f] shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#16a34a]" /> {flash}</span>
          </div>
        )}

        {/* Tabs */}
        <nav className="grid grid-cols-4 border-t border-white/5 bg-[#1a1b1d] px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
              className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] uppercase tracking-wider transition ${tab === t.id ? 'text-[#f5a33b]' : 'text-[#6f7075] hover:text-[#b5b6bb]'}`}>
              <t.icon size={17} strokeWidth={tab === t.id ? 2.2 : 1.7} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
