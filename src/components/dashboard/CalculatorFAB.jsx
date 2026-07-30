// src/components/dashboard/CalculatorFAB.jsx
// A movable floating calculator, available on every dashboard screen for
// every plan (unlike Sella AI, which is Premium-only) — mounted once in
// DashboardLayout, same drag-to-reposition pattern as the Sella AI orb but
// anchored to the opposite corner by default so the two never start stacked.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Calculator as CalculatorIcon, X, Delete, History, Trash2 } from 'lucide-react'

const LS_FABPOS = 'sellapage_calc_fabpos'
const LS_HISTORY = 'sellapage_calc_history'
const MAX_HISTORY = 50

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function formatDisplay(value) {
  if (value === 'Error') return value
  const num = Number(value)
  if (Number.isNaN(num)) return '0'
  if (!Number.isFinite(num)) return 'Error'
  // Keep long results readable without silently truncating precision the
  // user actually typed (only rounds far past what a display can show).
  const str = Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-9 && num !== 0)
    ? num.toExponential(6)
    : String(Math.round(num * 1e10) / 1e10)
  return str.length > 16 ? Number(num.toPrecision(10)).toString() : str
}

function applyOp(a, b, op) {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? NaN : a / b
    default: return b
  }
}

export default function CalculatorFAB() {
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [fabPos, setFabPos] = useState(null)
  const [history, setHistory] = useState([])

  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [accumulator, setAccumulator] = useState(null)
  const [pendingOp, setPendingOp] = useState(null)
  // True right after "=" OR right after an operator is pressed — in both
  // cases the next digit typed must start a fresh number, not append to
  // whatever's on screen.
  const [awaitingOperand, setAwaitingOperand] = useState(false)

  const dragState = useRef({ dragging: false, moved: false, offX: 0, offY: 0 })

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_FABPOS) || 'null')
      if (p && typeof p.x === 'number') setFabPos(p)
    } catch { /* ignore */ }
    setHistory(loadHistory())
  }, [])

  const onPointerDown = (e) => {
    if (open) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragState.current = { dragging: true, moved: false, offX: e.clientX - rect.left, offY: e.clientY - rect.top }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const ds = dragState.current
    if (!ds.dragging) return
    ds.moved = true
    const size = 60
    let x = e.clientX - ds.offX
    let y = e.clientY - ds.offY
    x = Math.max(8, Math.min(window.innerWidth - size - 8, x))
    y = Math.max(8, Math.min(window.innerHeight - size - 8, y))
    setFabPos({ x, y })
  }
  const onPointerUp = (e) => {
    const ds = dragState.current
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (ds.dragging && ds.moved && fabPos) {
      localStorage.setItem(LS_FABPOS, JSON.stringify(fabPos))
    }
    if (ds.dragging && !ds.moved) setOpen(true)
    dragState.current.dragging = false
  }

  const pushHistory = (expr, result) => {
    const entry = { id: Date.now(), expr, result, at: new Date().toISOString() }
    const next = [entry, ...history].slice(0, MAX_HISTORY)
    setHistory(next)
    localStorage.setItem(LS_HISTORY, JSON.stringify(next))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(LS_HISTORY)
  }

  const inputDigit = (digit) => {
    if (awaitingOperand) {
      setDisplay(digit)
      setAwaitingOperand(false)
      return
    }
    setDisplay((prev) => (prev === '0' ? digit : prev.length >= 15 ? prev : prev + digit))
  }

  const inputDecimal = () => {
    if (awaitingOperand) {
      setDisplay('0.')
      setAwaitingOperand(false)
      return
    }
    setDisplay((prev) => (prev.includes('.') ? prev : prev + '.'))
  }

  const inputOperator = (op) => {
    const current = Number(display)
    if (accumulator !== null && pendingOp && !awaitingOperand) {
      // Chained operation (e.g. "5 + 3 +") — evaluate the pending one first.
      const result = applyOp(accumulator, current, pendingOp)
      setAccumulator(result)
      setExpression(`${formatDisplay(result)} ${op}`)
      setDisplay(formatDisplay(result))
    } else {
      // Either the first operator typed, or the operator was just changed
      // (e.g. "12 ×" then tapping "+" instead) — display is left as-is.
      setAccumulator(current)
      setExpression(`${formatDisplay(current)} ${op}`)
    }
    setPendingOp(op)
    setAwaitingOperand(true)
  }

  const evaluate = () => {
    if (pendingOp === null || accumulator === null) return
    const current = Number(display)
    const result = applyOp(accumulator, current, pendingOp)
    const exprText = `${expression} ${formatDisplay(current)}`
    const resultText = formatDisplay(result)
    pushHistory(exprText, resultText)
    setDisplay(resultText)
    setExpression(`${exprText} =`)
    setAccumulator(null)
    setPendingOp(null)
    setAwaitingOperand(true)
  }

  const clearAll = () => {
    setDisplay('0')
    setExpression('')
    setAccumulator(null)
    setPendingOp(null)
    setAwaitingOperand(false)
  }

  const backspace = () => {
    if (awaitingOperand) return
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)))
  }

  const toggleSign = () => setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : prev === '0' ? prev : `-${prev}`))

  const percent = () => setDisplay((prev) => formatDisplay(Number(prev) / 100))

  const reuseHistoryEntry = useCallback((entry) => {
    setDisplay(entry.result)
    setExpression(`${entry.expr} = (reused)`)
    setAccumulator(null)
    setPendingOp(null)
    setAwaitingOperand(true)
    setShowHistory(false)
  }, [])

  const fabStyle = fabPos
    ? { left: fabPos.x, top: fabPos.y, right: 'auto', bottom: 'auto' }
    : { left: 20, bottom: 20 }

  const KEY_BASE = 'flex items-center justify-center rounded-2xl text-lg font-bold transition-all active:scale-95 select-none'

  return (
    <>
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={fabStyle}
          className="fixed z-[55] flex h-[60px] w-[60px] touch-none items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-xl shadow-slate-900/30 ring-1 ring-white/10 transition-transform hover:scale-[1.03] active:scale-95"
          title="Calculator"
          aria-label="Open calculator"
        >
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-500/30 blur-md -z-10" />
          <CalculatorIcon size={24} strokeWidth={2} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-end sm:justify-start sm:p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />
          <div className="relative flex w-full flex-col overflow-hidden rounded-t-[26px] bg-slate-950 text-white shadow-2xl ring-1 ring-white/10 sm:h-auto sm:w-[340px] sm:rounded-[26px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 ring-1 ring-white/10">
                  <CalculatorIcon size={15} />
                </div>
                <p className="text-sm font-bold">Calculator</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className={`rounded-xl p-2 transition-colors ${showHistory ? 'bg-white/15 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                  aria-label="Toggle history"
                >
                  <History size={16} />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Close calculator">
                  <X size={16} />
                </button>
              </div>
            </div>

            {showHistory ? (
              <div className="flex max-h-[420px] flex-col">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Past Calculations</p>
                  {history.length > 0 && (
                    <button type="button" onClick={clearHistory} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-red-400">
                      <Trash2 size={11} /> Clear
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-3">
                  {history.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-gray-500">No calculations yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => reuseHistoryEntry(entry)}
                          className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <p className="truncate text-[11px] text-gray-500">{entry.expr}</p>
                          <p className="text-base font-bold tabular-nums">{entry.result}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Display */}
                <div className="flex flex-col items-end justify-end gap-1 px-5 pb-4 pt-6">
                  <p className="h-4 truncate text-xs font-medium text-gray-500">{expression || ' '}</p>
                  <p className="w-full truncate text-right text-4xl font-black tabular-nums">{display}</p>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-2 p-3 pb-5">
                  <button type="button" onClick={clearAll} className={`${KEY_BASE} bg-white/10 text-red-300 hover:bg-white/15`}>C</button>
                  <button type="button" onClick={toggleSign} className={`${KEY_BASE} bg-white/10 hover:bg-white/15`}>±</button>
                  <button type="button" onClick={percent} className={`${KEY_BASE} bg-white/10 hover:bg-white/15`}>%</button>
                  <button type="button" onClick={() => inputOperator('÷')} className={`${KEY_BASE} bg-amber-500/90 hover:bg-amber-500 ${pendingOp === '÷' ? 'ring-2 ring-white' : ''}`}>÷</button>

                  {['7', '8', '9'].map((d) => (
                    <button key={d} type="button" onClick={() => inputDigit(d)} className={`${KEY_BASE} bg-white/5 hover:bg-white/10`}>{d}</button>
                  ))}
                  <button type="button" onClick={() => inputOperator('×')} className={`${KEY_BASE} bg-amber-500/90 hover:bg-amber-500 ${pendingOp === '×' ? 'ring-2 ring-white' : ''}`}>×</button>

                  {['4', '5', '6'].map((d) => (
                    <button key={d} type="button" onClick={() => inputDigit(d)} className={`${KEY_BASE} bg-white/5 hover:bg-white/10`}>{d}</button>
                  ))}
                  <button type="button" onClick={() => inputOperator('−')} className={`${KEY_BASE} bg-amber-500/90 hover:bg-amber-500 ${pendingOp === '−' ? 'ring-2 ring-white' : ''}`}>−</button>

                  {['1', '2', '3'].map((d) => (
                    <button key={d} type="button" onClick={() => inputDigit(d)} className={`${KEY_BASE} bg-white/5 hover:bg-white/10`}>{d}</button>
                  ))}
                  <button type="button" onClick={() => inputOperator('+')} className={`${KEY_BASE} bg-amber-500/90 hover:bg-amber-500 ${pendingOp === '+' ? 'ring-2 ring-white' : ''}`}>+</button>

                  <button type="button" onClick={() => inputDigit('0')} className={`${KEY_BASE} col-span-1 bg-white/5 hover:bg-white/10`}>0</button>
                  <button type="button" onClick={inputDecimal} className={`${KEY_BASE} bg-white/5 hover:bg-white/10`}>.</button>
                  <button type="button" onClick={backspace} className={`${KEY_BASE} bg-white/10 hover:bg-white/15`}><Delete size={18} /></button>
                  <button type="button" onClick={evaluate} className={`${KEY_BASE} bg-green-600 hover:bg-green-500`}>=</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
