// src/ops/tabs/RevenueIncome.jsx
//
// Revenue > Sellapage income: only Sellapage's own money, from one ledger
// (/api/admin-revenue?action=income): plan payments, Sella credit packs and
// delivery service charges. Pick a range (7 days to all time) and a grouping
// (day, week, month, year); everything below follows, compared with the
// period before it. Grouping happens here in the browser, in Lagos time, so
// changing it costs no reads.
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, CreditCard, Sparkles, Truck, Package, Repeat, Users, Download, Receipt, Crown, CalendarRange } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { Segmented, Chips, Pager, SearchBox, PlanPill, Pill, Notice, Empty, CountUp, Meter, Btn, useClientPages, fmtDateTime, title } from './kit'

const ngn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
const short = (n) => { const v = Number(n) || 0; return v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₦${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `₦${Math.round(v)}` }
const DAY = 864e5
const SOURCES = {
  plan: { short: 'Plans', label: 'Plan subscriptions', color: '#f59e0b', dot: 'bg-amber-500', icon: CreditCard },
  credits: { short: 'Sella credits', label: 'Sella credit packs', color: '#8b5cf6', dot: 'bg-violet-500', icon: Sparkles },
  delivery: { short: 'Delivery', label: 'Delivery service charges', color: '#0ea5e9', dot: 'bg-sky-500', icon: Truck },
}
const RANGES = [['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['12m', '12M'], ['ytd', 'This year'], ['all', 'All time']]
const GROUPS = { '7d': ['day', 'week'], '30d': ['day', 'week'], '90d': ['day', 'week', 'month'], '12m': ['week', 'month'], ytd: ['week', 'month'], all: ['month', 'year'] }
const DEFAULT_GROUP = { '7d': 'day', '30d': 'day', '90d': 'week', '12m': 'month', ytd: 'month', all: 'month' }
const RANGE_TEXT = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months', ytd: 'This year', all: 'All time' }
const PERIOD_LABEL = { monthly: 'Monthly', quarterly: 'Every 3 months', biannual: 'Every 6 months', annual: 'Yearly' }

// Lagos calendar parts for a timestamp.
const LAGOS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' })
const dayKey = (t) => LAGOS.format(new Date(t))
const utc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d || 1) }
const keyOf = (t, g) => {
  const d = dayKey(t)
  if (g === 'day') return d
  if (g === 'month') return d.slice(0, 7)
  if (g === 'year') return d.slice(0, 4)
  const x = new Date(utc(d))
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)) // back to Monday
  return x.toISOString().slice(0, 10)
}
const nextKey = (k, g) => {
  if (g === 'year') return String(Number(k) + 1)
  if (g === 'month') { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7) }
  const x = new Date(utc(k)); x.setUTCDate(x.getUTCDate() + (g === 'week' ? 7 : 1)); return x.toISOString().slice(0, 10)
}
const tickOf = (k, g) => {
  if (g === 'year') return k
  if (g === 'month') return new Date(utc(k)).toLocaleDateString('en-NG', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  const [, m, d] = k.split('-').map(Number)
  return `${d}/${m}`
}
const labelOf = (k, g) => {
  if (g === 'year') return k
  if (g === 'month') return new Date(utc(k)).toLocaleDateString('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const s = new Date(utc(k)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return g === 'week' ? `Week of ${s}` : s
}

/** [start, end) of a range, in ms. */
function rangeWindow(range, firstAt) {
  const now = Date.now()
  const todayStart = utc(dayKey(now)) - 3600e3 // midnight in Lagos (UTC+1)
  if (range === 'all') return [firstAt || todayStart, now + 1]
  if (range === 'ytd') return [utc(`${dayKey(now).slice(0, 4)}-01-01`) - 3600e3, now + 1]
  if (range === '12m') { const [y, m] = dayKey(now).split('-').map(Number); return [Date.UTC(y - 1, m, 1) - 3600e3, now + 1] }
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range]
  return [todayStart - (days - 1) * DAY, now + 1]
}

function Delta({ now, before }) {
  if (before == null) return null
  if (!before) return now ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11.5px] font-bold text-emerald-300"><TrendingUp size={12} /> new</span> : null
  const pct = Math.round(((now - before) / before) * 100)
  const up = pct >= 0
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${up ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'}`}>{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{up ? '+' : ''}{pct}%</span>
}

function Tip({ active, payload, label, group, on }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] text-white shadow-xl">
      <p className="font-semibold">{labelOf(label, group)}</p>
      {Object.entries(SOURCES).filter(([k]) => on[k]).map(([k, s]) => <p key={k} className="mt-0.5 flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-white/70"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}</span><span className="tabular-nums">{ngn(row[k])}</span></p>)}
      <p className="mt-1 border-t border-white/10 pt-1 text-right font-bold tabular-nums">{ngn(row.total)}</p>
    </div>
  )
}

function exportCsv(rows, names) {
  const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`
  const lines = ['Date (Lagos),Store,Source,Detail,Amount (NGN),Reference'].concat(rows.map((e) => [
    new Date(e.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }), names[e.storeId] || '', SOURCES[e.kind]?.label || e.kind,
    e.kind === 'plan' ? `${title(e.plan)} ${PERIOD_LABEL[e.period] || e.period}` : e.kind === 'credits' ? `${e.pack} pack, ${e.credits} credits (VAT ${e.vat})` : `${e.courier} booking`,
    e.amount, e.ref,
  ].map(esc).join(',')))
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `sellapage-income-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function RevenueIncome() {
  const { data, loading, error, reload } = useOpsData('/api/admin-revenue?action=income')
  const [range, setRange] = useState('30d')
  const [group, setGroup] = useState('day')
  const [on, setOn] = useState({ plan: true, credits: true, delivery: true })
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const events = useMemo(() => data?.events || [], [data])
  const names = useMemo(() => data?.names || {}, [data])
  const firstAt = events.length ? events[events.length - 1].at : 0
  const pickRange = (r) => { setRange(r); setGroup(DEFAULT_GROUP[r]) }

  const view = useMemo(() => {
    const [start, end] = rangeWindow(range, firstAt)
    const len = end - start
    const inRange = events.filter((e) => e.at >= start && e.at < end)
    const before = range === 'all' ? null : events.filter((e) => e.at >= start - len && e.at < start)
    const sum = (list, f = () => true) => list.reduce((n, e) => (on[e.kind] && f(e) ? n + e.amount : n), 0)
    // Continuous buckets, so a quiet week shows as a gap, not a missing bar.
    const buckets = []
    const byKey = {}
    for (let k = keyOf(start, group), guard = 0; k <= keyOf(end - 1, group) && guard < 800; k = nextKey(k, group), guard++) {
      const row = { key: k, plan: 0, credits: 0, delivery: 0, total: 0 }
      buckets.push(row); byKey[k] = row
    }
    const bySource = { plan: 0, credits: 0, delivery: 0 }
    const byPlan = {}
    const byPeriod = {}
    const byStore = {}
    let count = 0
    let newPaying = 0
    inRange.forEach((e) => {
      bySource[e.kind] += e.amount
      if (!on[e.kind]) return
      count += 1
      const row = byKey[keyOf(e.at, group)]
      if (row) { row[e.kind] += e.amount; row.total += e.amount }
      if (e.kind === 'plan') {
        byPlan[e.plan] = (byPlan[e.plan] || 0) + e.amount
        byPeriod[e.period] = (byPeriod[e.period] || 0) + 1
        if (data?.firstPaidAt?.[e.storeId] === e.at) newPaying += 1
      }
      const s = (byStore[e.storeId] ||= { storeId: e.storeId, amount: 0, payments: 0, kinds: {} })
      s.amount += e.amount; s.payments += 1; s.kinds[e.kind] = (s.kinds[e.kind] || 0) + e.amount
    })
    const total = sum(inRange)
    return {
      start, end, inRange, buckets, total, prev: before ? sum(before) : null, count, newPaying,
      bySource, byPlan: Object.entries(byPlan).sort((a, b) => b[1] - a[1]), byPeriod: Object.entries(byPeriod).sort((a, b) => b[1] - a[1]),
      top: Object.values(byStore).sort((a, b) => b.amount - a.amount).slice(0, 8),
      best: buckets.reduce((b, r) => (r.total > (b?.total || 0) ? r : b), null),
    }
  }, [events, range, group, on, firstAt, data])

  const ledger = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return view.inRange.filter((e) => (kind === 'all' || e.kind === kind) && (!needle || String(names[e.storeId] || '').toLowerCase().includes(needle) || String(e.ref || '').toLowerCase().includes(needle)))
  }, [view.inRange, kind, q, names])
  const pg = useClientPages(ledger, 12)
  const r = data?.recurring
  const rangeLabel = RANGE_TEXT[range]

  if (error) return <Notice tone="error">{error} <button type="button" onClick={reload} className="ml-1 font-semibold underline">Try again</button></Notice>
  if (loading && !data) return <div className="space-y-3"><div className="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div></div>

  const sourceMax = Math.max(1, ...Object.values(view.bySource))
  const planTotal = view.byPlan.reduce((n, [, v]) => n + v, 0) || 1
  const periodTotal = view.byPeriod.reduce((n, [, v]) => n + v, 0) || 1

  return (
    <div className="space-y-4">
      {/* range and grouping */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]"><Segmented value={range} onChange={pickRange} options={RANGES.map(([id, label]) => ({ id, label }))} className="whitespace-nowrap" /></div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <CalendarRange size={15} className="text-slate-400" />
          <Segmented value={group} onChange={setGroup} options={GROUPS[range].map((g) => ({ id: g, label: title(g) }))} />
        </div>
      </div>

      {/* hero: total, change, stacked chart */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0b1f14] p-4 text-white sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.22),transparent_55%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-emerald-200/90"><Wallet size={15} /> Sellapage earned, {rangeLabel.toLowerCase()}</p>
            <p className="mt-2 flex flex-wrap items-center gap-3 font-display text-[36px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[44px]"><CountUp key={`${range}${JSON.stringify(on)}`} value={view.total} format={ngn} /><Delta now={view.total} before={view.prev} /></p>
            <p className="mt-2 text-[12.5px] text-emerald-100/70">{view.count.toLocaleString()} payment{view.count === 1 ? '' : 's'}{view.prev != null ? ` · ${ngn(view.prev)} the period before` : ''}{view.best?.total ? ` · best ${group}: ${labelOf(view.best.key, group)}` : ''}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SOURCES).map(([k, s]) => (
              <button key={k} type="button" aria-pressed={on[k]} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold ring-1 transition ${on[k] ? 'bg-white/10 text-white ring-white/20' : 'text-white/40 ring-white/10 line-through'}`}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={view.buckets} margin={{ top: 6, right: 0, left: -4, bottom: 0 }} barCategoryGap={view.buckets.length > 40 ? 1 : '18%'}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="key" tickFormatter={(k) => tickOf(k, group)} tick={{ fontSize: 10.5, fill: 'rgba(209,250,229,0.6)' }} tickLine={false} axisLine={false} minTickGap={14} />
              <YAxis tickFormatter={short} tick={{ fontSize: 10.5, fill: 'rgba(209,250,229,0.6)' }} tickLine={false} axisLine={false} width={52} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<Tip group={group} on={on} />} />
              {Object.entries(SOURCES).filter(([k]) => on[k]).map(([k, s], i, arr) => <Bar key={k} dataKey={k} stackId="a" fill={s.color} radius={i === arr.length - 1 ? [6, 6, 0, 0] : 0} animationDuration={700} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* recurring */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { i: Repeat, l: 'Monthly recurring (MRR)', v: r?.mrr, m: true, s: 'what paying stores are worth a month' },
          { i: TrendingUp, l: 'Yearly run rate (ARR)', v: r?.arr, m: true, s: 'MRR times 12' },
          { i: Users, l: 'Paying stores', v: r?.paying, s: r?.manual ? `${r.manual} on a plan given by hand` : `${r?.payingByPlan?.growth || 0} Growth · ${r?.payingByPlan?.pro || 0} Pro · ${r?.payingByPlan?.premium || 0} Premium` },
          { i: Crown, l: 'New paying stores', v: view.newPaying, s: `first plan payment, ${rangeLabel === 'All time' ? 'all time' : 'this range'}` },
        ].map((t, k) => (
          <div key={t.l} className="min-w-0 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${k * 50}ms` }}>
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dash-muted"><t.i size={14} className="flex-shrink-0 text-forest-600" /><span className="truncate">{t.l}</span></p>
            <p className="mt-2 font-display text-[22px] font-extrabold leading-none tabular-nums text-dash-ink sm:text-[24px]"><CountUp value={t.v || 0} format={t.m ? ngn : undefined} /></p>
            <p className="mt-1 truncate text-[11px] text-slate-500">{t.s}</p>
          </div>
        ))}
      </section>
      {r?.arppu > 0 && <p className="-mt-1 text-[12px] text-dash-muted">Average paying store brings in {ngn(r.arppu)} a month.</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">Where it came from</p>
          <p className="text-[12px] text-dash-muted">{rangeLabel}, every source</p>
          <ul className="mt-4 space-y-3.5">
            {Object.entries(SOURCES).map(([k, s]) => (
              <li key={k}>
                <div className="flex items-center justify-between gap-2 text-[12.5px]"><span className="flex min-w-0 items-center gap-2 font-semibold text-dash-ink"><s.icon size={14} style={{ color: s.color }} /><span className="truncate">{s.label}</span></span><span className="flex-shrink-0 font-bold tabular-nums">{ngn(view.bySource[k])}</span></div>
                <Meter value={view.bySource[k]} of={sourceMax} tone={s.dot} className="mt-1.5 h-2" />
              </li>
            ))}
            <li>
              <div className="flex items-center justify-between gap-2 text-[12.5px]"><span className="flex items-center gap-2 font-semibold text-dash-ink"><Package size={14} className="text-slate-400" />Dropshipping</span><span className="font-bold tabular-nums text-slate-400">{ngn(0)}</span></div>
              <p className="mt-1 text-[11.5px] text-slate-500">The 5% dropshipping commission is set, but no dropship order collects it yet, so nothing is earned here so far.</p>
            </li>
          </ul>
        </section>
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">Plans bought</p>
          <p className="text-[12px] text-dash-muted">Subscription money by plan, and how often people pay</p>
          {view.byPlan.length === 0 ? <p className="mt-6 text-center text-[12.5px] text-slate-400">No plan payments in this range.</p> : (
            <>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">{view.byPlan.map(([p, v]) => <div key={p} className={`${p === 'premium' ? 'bg-amber-400' : p === 'pro' ? 'bg-slate-900' : 'bg-forest-600'} transition-all duration-700`} style={{ width: `${(v / planTotal) * 100}%` }} />)}</div>
              <ul className="mt-3 space-y-2">{view.byPlan.map(([p, v]) => <li key={p} className="flex items-center justify-between text-[12.5px]"><PlanPill plan={p === 'unknown' ? 'Not recorded' : p} /><span className="font-bold tabular-nums">{ngn(v)} <span className="font-normal text-slate-400">{Math.round((v / planTotal) * 100)}%</span></span></li>)}</ul>
              <div className="mt-4 border-t border-dash-line pt-3">{view.byPeriod.map(([p, n]) => <p key={p} className="flex items-center justify-between text-[12px] text-slate-600"><span>{PERIOD_LABEL[p] || title(p)}</span><span className="tabular-nums">{n} payment{n === 1 ? '' : 's'} · {Math.round((n / periodTotal) * 100)}%</span></p>)}</div>
            </>
          )}
        </section>
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">Top paying stores</p>
          <p className="text-[12px] text-dash-muted">{rangeLabel}, everything they paid Sellapage</p>
          {view.top.length === 0 ? <p className="mt-6 text-center text-[12.5px] text-slate-400">Nobody paid in this range.</p> : (
            <ol className="mt-3 space-y-2.5">
              {view.top.map((s, i) => (
                <li key={s.storeId || i} className="flex items-center gap-2.5">
                  <span className="w-4 text-center text-[11.5px] font-bold tabular-nums text-slate-400">{i + 1}</span>
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarTone(s.storeId)}`}>{initials(names[s.storeId])}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold text-dash-ink">{names[s.storeId] || 'Unknown store'}</span>
                    <span className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">{Object.entries(s.kinds).map(([k, v]) => <span key={k} className={SOURCES[k].dot} style={{ width: `${(v / s.amount) * 100}%` }} />)}</span></span>
                  <span className="flex-shrink-0 text-right"><span className="block text-[12.5px] font-bold tabular-nums">{ngn(s.amount)}</span><span className="text-[10.5px] text-slate-400">{s.payments} payment{s.payments === 1 ? '' : 's'}</span></span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* the ledger */}
      <section className="rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:mr-2"><p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Receipt size={16} className="text-forest-600" /> Every payment</p><p className="text-[12px] text-dash-muted">{rangeLabel}, newest first</p></div>
          <SearchBox value={q} onChange={(v) => { setQ(v); pg.setPage(1) }} placeholder="Store or reference" className="lg:w-64" />
          <Chips size="sm" value={kind} onChange={(k) => { setKind(k); pg.setPage(1) }} options={[{ id: 'all', label: 'All' }, ...Object.entries(SOURCES).map(([id, s]) => ({ id, label: s.short, dot: s.dot }))]} />
          <Btn size="sm" tone="soft" icon={<Download size={14} />} disabled={!ledger.length} onClick={() => exportCsv(ledger, names)} className="lg:ml-auto">Export CSV</Btn>
        </div>
        {ledger.length === 0 ? <Empty icon={<Receipt size={22} />} title="No payments here" sub="Try a longer range or another source." className="mt-3 border-none" /> : (
          <>
            <div className="mt-3 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left">
                <thead className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Store</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Detail</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-dash-line text-[13px]">
                  {pg.rows.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDateTime(e.at)}</td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 font-semibold text-dash-ink">{names[e.storeId] || 'Unknown store'}</td>
                      <td className="px-3 py-2.5"><Pill tone={e.kind === 'plan' ? 'amber' : e.kind === 'credits' ? 'violet' : 'blue'}>{SOURCES[e.kind].label}</Pill></td>
                      <td className="max-w-[260px] truncate px-3 py-2.5 text-slate-500">{e.kind === 'plan' ? `${title(e.plan)}, ${(PERIOD_LABEL[e.period] || e.period).toLowerCase()}` : e.kind === 'credits' ? `${e.pack} pack, ${e.credits.toLocaleString()} credits` : `${e.courier} booking`}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-dash-ink">{ngn(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 divide-y divide-dash-line lg:hidden">
              {pg.rows.map((e) => {
                const S = SOURCES[e.kind]
                return (
                  <li key={e.id} className="flex items-center gap-3 px-1 py-2.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50" style={{ color: S.color }}><S.icon size={15} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{names[e.storeId] || 'Unknown store'}</span><span className="block truncate text-[11.5px] text-slate-500">{fmtDateTime(e.at)} · {e.kind === 'plan' ? `${title(e.plan)} plan` : e.kind === 'credits' ? `${e.pack} credits` : 'Delivery'}</span></span>
                    <span className="flex-shrink-0 text-[13px] font-bold tabular-nums">{ngn(e.amount)}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={12} onPage={pg.setPage} className="mt-3 border-t border-dash-line px-1 pt-3" />
      </section>
      {data?.truncated && <Notice tone="warn">There are more records than one read covers, so the oldest payments are not all counted. The totals are a floor.</Notice>}
      <p className="text-[11.5px] text-dash-muted">Sella credit packs count the pack price plus 7.5% VAT, which is what reaches Sellapage (the vendor pays Paystack&apos;s fee on top). Delivery is the {ngn(data?.serviceCharge || 250)} service charge on each booking. Vendors&apos; own sales are under Store sales, never here.</p>
    </div>
  )
}
