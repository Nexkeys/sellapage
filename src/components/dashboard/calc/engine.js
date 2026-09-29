// src/components/dashboard/calc/engine.js
//
// The maths behind the dashboard calculator. A small recursive-descent parser,
// never eval(): the expression is the vendor's own typing, but a calculator
// that could run code would be one paste away from a problem.
//
// Understands what the keypad can type:
//   numbers, + − × ÷ ^, ( ), π, e, postfix ! ² %,
//   sin cos tan asin acos atan log ln √ (and 10^ / e^ from Inv)
// "2π" and "3(4)" multiply, a missing ")" at the end is closed for you, and
// "200 + 10%" means 220, the way shop calculators work.

const FUNCS = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln']

export function tokenize(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ') { i++; continue }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      const raw = src.slice(i, j)
      if ((raw.match(/\./g) || []).length > 1) throw new Error('bad number')
      out.push({ t: 'num', v: Number(raw === '.' ? '0' : raw) })
      i = j
      continue
    }
    const fn = FUNCS.find((f) => src.startsWith(f, i))
    if (fn) { out.push({ t: 'fn', v: fn }); i += fn.length; continue }
    if (ch === 'π') { out.push({ t: 'num', v: Math.PI }); i++; continue }
    if (ch === 'e') { out.push({ t: 'num', v: Math.E }); i++; continue }
    if (ch === '√') { out.push({ t: 'fn', v: 'sqrt' }); i++; continue }
    if ('+−×÷^'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue }
    if (ch === '-') { out.push({ t: 'op', v: '−' }); i++; continue }
    if (ch === '*') { out.push({ t: 'op', v: '×' }); i++; continue }
    if (ch === '/') { out.push({ t: 'op', v: '÷' }); i++; continue }
    if ('!²%'.includes(ch)) { out.push({ t: 'post', v: ch }); i++; continue }
    if (ch === '(') { out.push({ t: 'lp' }); i++; continue }
    if (ch === ')') { out.push({ t: 'rp' }); i++; continue }
    throw new Error(`unexpected ${ch}`)
  }
  return out
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n) || n > 170) return NaN
  let r = 1
  for (let k = 2; k <= n; k++) r *= k
  return r
}

export function evaluate(src, { degrees = true } = {}) {
  const toks = tokenize(src)
  // Close any brackets left open at the end, as every phone calculator does.
  let depth = 0
  for (const t of toks) { if (t.t === 'lp') depth++; if (t.t === 'rp') depth-- }
  for (; depth > 0; depth--) toks.push({ t: 'rp' })

  let p = 0
  const peek = () => toks[p]
  const take = () => toks[p++]
  const rad = (x) => (degrees ? (x * Math.PI) / 180 : x)
  const deg = (x) => (degrees ? (x * 180) / Math.PI : x)
  const startsFactor = (t) => t && (t.t === 'num' || t.t === 'fn' || t.t === 'lp')

  const applyFn = (name, x) => {
    switch (name) {
      case 'sin': return Math.sin(rad(x))
      case 'cos': return Math.cos(rad(x))
      case 'tan': return Math.tan(rad(x))
      case 'asin': return deg(Math.asin(x))
      case 'acos': return deg(Math.acos(x))
      case 'atan': return deg(Math.atan(x))
      case 'log': return Math.log10(x)
      case 'ln': return Math.log(x)
      case 'sqrt': return Math.sqrt(x)
      default: return NaN
    }
  }

  // Each level returns { v, pct } so "a + b%" can mean a + a*b/100.
  function primary() {
    const t = take()
    if (!t) throw new Error('incomplete')
    if (t.t === 'num') return { v: t.v }
    if (t.t === 'lp') {
      const inner = expr()
      if (take()?.t !== 'rp') throw new Error('missing )')
      return { v: inner.v }
    }
    if (t.t === 'fn') {
      // "√9" and "sin(30)" both work; a function takes the next factor.
      const arg = peek()?.t === 'lp' ? primary() : postfix()
      return { v: applyFn(t.v, arg.v) }
    }
    if (t.t === 'op' && t.v === '−') return { v: -unary().v }
    throw new Error('unexpected')
  }
  function postfix() {
    let node = primary()
    while (peek()?.t === 'post') {
      const op = take().v
      if (op === '!') node = { v: factorial(node.v) }
      else if (op === '²') node = { v: node.v * node.v }
      else if (op === '%') node = { v: node.v / 100, pct: true }
    }
    return node
  }
  function power() {
    const base = postfix()
    if (peek()?.t === 'op' && peek().v === '^') {
      take()
      const exp = unary()
      return { v: Math.pow(base.v, exp.v) }
    }
    return base
  }
  function unary() {
    if (peek()?.t === 'op' && (peek().v === '−' || peek().v === '+')) {
      const sign = take().v === '−' ? -1 : 1
      return { v: sign * unary().v }
    }
    return power()
  }
  function term() {
    let left = unary()
    for (;;) {
      const t = peek()
      if (t?.t === 'op' && (t.v === '×' || t.v === '÷')) {
        take()
        const right = unary()
        left = { v: t.v === '×' ? left.v * right.v : left.v / right.v }
      } else if (startsFactor(t)) {
        left = { v: left.v * unary().v }
      } else return left
    }
  }
  function expr() {
    let left = term()
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '−')) {
      const op = take().v
      const right = term()
      const r = right.pct ? left.v * right.v : right.v
      left = { v: op === '+' ? left.v + r : left.v - r }
    }
    return left
  }

  const result = expr()
  if (p < toks.length) throw new Error('trailing')
  // Floating point dust: 0.1 + 0.2 shows 0.3, sin(180) shows 0.
  const v = Math.abs(result.v) < 1e-12 ? 0 : Number(result.v.toPrecision(12))
  if (!Number.isFinite(v)) throw new Error('not finite')
  return v
}

/** Evaluate without throwing: a number, or null while the typing is unfinished. */
export function tryEvaluate(src, opts) {
  if (!src || !src.trim()) return null
  try { return evaluate(src, opts) } catch { return null }
}

export function formatNumber(v, { decimals = 'auto', separators = true } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'Error'
  if (!Number.isFinite(v)) return 'Error'
  if (Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-7 && v !== 0)) return v.toExponential(6).replace(/\.?0+e/, 'e')
  const opts = decimals === 'auto'
    ? { maximumFractionDigits: 10 }
    : { minimumFractionDigits: Number(decimals), maximumFractionDigits: Number(decimals) }
  return v.toLocaleString('en-US', { ...opts, useGrouping: separators })
}

// ── Converters for the CONV tab ────────────────────────────────────────────

// Checkout fee, exactly as api-handlers/checkout-initialize.js charges it:
// 1.5% + ₦100, capped at ₦2,000, paid by the customer on top of the price.
export const checkoutFee = (price) => Math.min(Math.ceil(price * 0.015) + 100, 2000)

export const VAT_RATE = 0.075

export const UNITS = {
  weight: {
    label: 'Weight',
    units: { kg: ['Kilograms', 1], g: ['Grams', 0.001], lb: ['Pounds', 0.45359237], oz: ['Ounces', 0.028349523125] },
  },
  length: {
    label: 'Length',
    units: { m: ['Metres', 1], cm: ['Centimetres', 0.01], yd: ['Yards', 0.9144], ft: ['Feet', 0.3048], in: ['Inches', 0.0254] },
  },
  volume: {
    label: 'Volume',
    units: { l: ['Litres', 1], cl: ['Centilitres', 0.01], ml: ['Millilitres', 0.001], gal: ['Gallons (US)', 3.785411784], floz: ['Fluid ounces (US)', 0.0295735295625] },
  },
}

export function convertUnit(kind, value, from, to) {
  const u = UNITS[kind]?.units
  if (!u?.[from] || !u?.[to]) return null
  return (value * u[from][1]) / u[to][1]
}
