// src/ops/tabs/SellaMeter.jsx
//
// Sella AI Usage: who uses Sella, when, for what, and what it really costs,
// laid out the way AI providers show usage (a range, a grouping, a metric,
// a breakdown by feature, a per-customer table and a request log).
//   Overview      this month against the allowance, history by day or month,
//                 active vendors, new vendors, every feature
//   Vendors       every store that ever used Sella: this month, all time,
//                 today, first and last use, bought credits; opens a panel
//   Activity log  every charged request (logged from 7 Oct 2026)
// Credits are charged at real AI cost (_lib/sella-credits.js), so cost here is
// money Sellapage actually spent (/api/admin-sella-ai).
import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Bot, Zap, Coins, Users, MessageSquare, Brain, Image as ImageIcon, FileText, Mic, AudioLines, Film, FileUp, Crown, UserPlus,
  LayoutGrid, ListOrdered, ScrollText, Download, ArrowDownUp, CalendarClock, Sparkles, Loader2,
} from 'lucide-react'
import { useOpsData } from '../opsKit'
import SellaBot from '../SellaBot'
import { initials, avatarTone } from '../opsUi'
import { Segmented, Chips, Pager, PlanPill, Pill, Empty, Notice, Meter, CountUp, SearchBox, Btn, Drawer, useClientPages, fmtDate, fmtDateTime, timeAgo, title } from './kit'

const KIND = {
  chat: { label: 'Chat', icon: MessageSquare, bar: 'bg-violet-500', color: '#8b5cf6' },
  deep: { label: 'Deep thinking', icon: Brain, bar: 'bg-fuchsia-500', color: '#d946ef' },
  image: { label: 'Images', icon: ImageIcon, bar: 'bg-sky-500', color: '#0ea5e9' },
  files: { label: 'Files', icon: FileText, bar: 'bg-amber-500', color: '#f59e0b' },
  speech: { label: 'Read aloud', icon: AudioLines, bar: 'bg-emerald-500', color: '#10b981' },
  voice: { label: 'Voice notes', icon: Mic, bar: 'bg-rose-500', color: '#f43f5e' },
  import: { label: 'Imports', icon: FileUp, bar: 'bg-indigo-500', color: '#6366f1' },
  video: { label: 'Videos', icon: Film, bar: 'bg-slate-700', color: '#334155' },
}
const kindOf = (k) => KIND[k] || { label: title(k), icon: Sparkles, bar: 'bg-slate-400', color: '#94a3b8' }
const cr = (n) => Math.round(Number(n) || 0).toLocaleString('en-NG')
const ngn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
const TIP = { background: '#1e1036', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 10px' }
const DAY = 864e5
const lagosDay = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const dayTick = (d) => { const [, m, x] = String(d).split('-').map(Number); return `${x}/${m}` }
const monthTick = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
const monthLong = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
const METRIC = { credits: ['Credits', (v) => cr(v)], requests: ['Requests', (v) => cr(v)], cost: ['Real cost', (v) => ngn(v)] }

function fillDays(days, count) {
  const by = Object.fromEntries(days.map((d) => [d.date, d]))
  const today = lagosDay(Date.now())
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const key = new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10)
    return by[key] || { date: key, requests: 0, credits: 0, usd: 0, stores: 0, byKind: {} }
  })
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview({ data, rate, onOpen }) {
  const [range, setRange] = useState('30')
  const [metric, setMetric] = useState('credits')
  const daily = range === '30' || range === '90'
  const series = useMemo(() => {
    const val = (x) => (metric === 'credits' ? x.credits : metric === 'requests' ? x.requests : x.usd * rate)
    if (daily) return fillDays(data.days, Number(range)).map((x) => ({ key: x.date, value: val(x), stores: x.stores }))
    const months = range === '12' ? data.months.slice(-12) : data.months
    return months.map((x) => ({ key: x.month, value: val(x), stores: x.stores, newStores: x.newStores, ...Object.fromEntries(Object.entries(x.byKind || {}).map(([k, v]) => [`k_${k}`, v])) }))
  }, [data, range, metric, daily, rate])
  const total = series.reduce((n, x) => n + x.value, 0)
  const kindKeys = useMemo(() => [...new Set(data.months.flatMap((m) => Object.keys(m.byKind || {})))], [data.months])
  const stackKinds = !daily && metric === 'credits' && kindKeys.length > 0
  const c = data.credits
  const kinds = Object.entries(c.byKind || {}).sort((a, b) => b[1] - a[1])
  const kindMax = Math.max(1, ...kinds.map(([, v]) => v))
  const allKinds = Object.entries(data.stores.reduce((a, s) => { for (const [k, v] of Object.entries(s.byKind || {})) a[k] = (a[k] || 0) + v; return a }, {})).sort((a, b) => b[1] - a[1])
  const top = data.stores.slice().sort((a, b) => b.monthCredits - a.monthCredits).filter((s) => s.monthCredits > 0).slice(0, 6)
  const active = useMemo(() => fillDays(data.days, 30), [data.days])

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:mr-auto">
            <p className="text-[14px] font-bold text-dash-ink">Usage history</p>
            <p className="text-[12px] text-dash-muted">{METRIC[metric][0]}: <strong className="text-dash-ink">{METRIC[metric][1](total)}</strong> {daily ? `in the last ${range} days` : range === '12' ? 'in the last 12 months' : `since ${data.months[0] ? monthLong(data.months[0].month) : 'the start'}`}</p>
          </div>
          <Segmented value={metric} onChange={setMetric} options={[{ id: 'credits', label: 'Credits' }, { id: 'requests', label: 'Requests' }, { id: 'cost', label: 'Cost' }]} />
          <Segmented value={range} onChange={setRange} options={[{ id: '30', label: '30D' }, { id: '90', label: '90D' }, { id: '12', label: '12M' }, { id: 'all', label: 'All time' }]} />
        </div>
        <div className="mt-4 h-64">
          {series.length === 0 ? <Empty icon={<Bot size={20} />} title="No usage yet" className="h-full border-none" /> : (
            <ResponsiveContainer width="100%" height="100%">
              {daily ? (
                <AreaChart data={series} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
                  <defs><linearGradient id="smArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#f1eefb" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={dayTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis tickFormatter={(v) => (metric === 'cost' ? `₦${cr(v)}` : cr(v))} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip contentStyle={TIP} labelFormatter={(k) => fmtDate(`${k}T12:00:00`)} formatter={(v, n, it) => [`${METRIC[metric][1](v)} · ${it.payload.stores} vendor${it.payload.stores === 1 ? '' : 's'}`, METRIC[metric][0]]} />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#smArea)" animationDuration={900} />
                </AreaChart>
              ) : (
                <BarChart data={series} margin={{ top: 6, right: 4, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="#f1eefb" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={monthTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => (metric === 'cost' ? `₦${cr(v)}` : cr(v))} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} contentStyle={TIP} labelFormatter={monthLong} formatter={(v, n) => [METRIC[metric][1](v), n]} />
                  {stackKinds ? kindKeys.map((k, i) => <Bar key={k} name={kindOf(k).label} dataKey={`k_${k}`} stackId="a" fill={kindOf(k).color} radius={i === kindKeys.length - 1 ? [6, 6, 0, 0] : 0} animationDuration={800} />)
                    : <Bar name={METRIC[metric][0]} dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} animationDuration={800} />}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        {stackKinds && <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-500">{kindKeys.map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${kindOf(k).bar}`} />{kindOf(k).label}</span>)}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">Vendors using Sella each day</p>
          <p className="text-[12px] text-dash-muted">Last 30 days · {data.summary.active30} different vendors</p>
          <div className="mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={active} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} contentStyle={TIP} labelFormatter={(k) => fmtDate(`${k}T12:00:00`)} formatter={(v) => [cr(v), 'Vendors']} />
                <Bar dataKey="stores" fill="#a78bfa" radius={[4, 4, 0, 0]} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">Where the credits went</p>
          <p className="text-[12px] text-dash-muted">This month</p>
          {kinds.length === 0 ? <p className="mt-6 text-center text-[12.5px] text-slate-400">No credits used yet this month.</p> : (
            <ul className="mt-3 space-y-2.5">{kinds.map(([k, v]) => { const K = kindOf(k); return (
              <li key={k}><div className="flex items-center justify-between gap-2 text-[12.5px]"><span className="flex items-center gap-1.5 font-semibold text-dash-ink"><K.icon size={13} />{K.label}</span><span className="tabular-nums text-slate-500">{cr(v)} · {Math.round((v / Math.max(1, c.used)) * 100)}%</span></div><Meter value={v} of={kindMax} tone={K.bar} className="mt-1 h-1.5" /></li>
            ) })}</ul>
          )}
          {allKinds.length > 0 && <p className="mt-4 border-t border-dash-line pt-3 text-[11.5px] text-slate-500">All time: {allKinds.map(([k, v]) => `${kindOf(k).label} ${Math.round((v / allKinds.reduce((n, [, x]) => n + x, 0)) * 100)}%`).join(' · ')}</p>}
          {allKinds.length > 0 && <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">{allKinds.map(([k, v]) => <span key={k} className={`w-0 ${kindOf(k).bar}`} style={{ flexGrow: v }} />)}</div>}
        </section>
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-dash-ink"><Crown size={15} className="text-amber-500" /> Highest users this month</p>
          <p className="text-[12px] text-dash-muted">By credits</p>
          {top.length === 0 ? <p className="mt-6 text-center text-[12.5px] text-slate-400">Nobody yet this month.</p> : (
            <ol className="mt-3 space-y-2.5">{top.map((s, i) => (
              <li key={s.storeId}><button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-2.5 rounded-xl text-left hover:bg-violet-50/50">
                <span className="w-4 text-center text-[11.5px] font-bold text-slate-400">{i + 1}</span>
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarTone(s.storeId)}`}>{initials(s.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold text-dash-ink">{s.name}</span><Meter value={s.monthCredits} of={top[0].monthCredits} tone="bg-violet-500" className="mt-1 h-1" /></span>
                <span className="flex-shrink-0 text-[12px] font-bold tabular-nums">{cr(s.monthCredits)}</span>
              </button></li>
            ))}</ol>
          )}
        </section>
      </div>

      {data.months.length > 1 && (
        <section className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <p className="text-[14px] font-bold text-dash-ink">Month by month</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12.5px]">
              <thead className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="py-2 pr-3">Month</th><th className="px-3 py-2 text-right">Vendors</th><th className="px-3 py-2 text-right">New</th><th className="px-3 py-2 text-right">Requests</th><th className="px-3 py-2 text-right">Credits</th><th className="py-2 pl-3 text-right">Real cost</th></tr></thead>
              <tbody className="divide-y divide-dash-line">{data.months.slice().reverse().map((m) => (
                <tr key={m.month}><td className="py-2 pr-3 font-semibold text-dash-ink">{monthLong(m.month)}</td><td className="px-3 py-2 text-right tabular-nums">{m.stores}</td><td className="px-3 py-2 text-right tabular-nums text-violet-700">{m.newStores ? `+${m.newStores}` : '-'}</td><td className="px-3 py-2 text-right tabular-nums">{cr(m.requests)}</td><td className="px-3 py-2 text-right font-bold tabular-nums">{cr(m.credits)}</td><td className="py-2 pl-3 text-right tabular-nums text-slate-600">{ngn(m.usd * rate)} <span className="text-slate-400">(${m.usd.toFixed(2)})</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ── Vendors ─────────────────────────────────────────────────────────────────
const SORTS = [['month', 'Most credits this month'], ['all', 'Most credits all time'], ['requests', 'Most requests'], ['cost', 'Highest cost'], ['recent', 'Used most recently'], ['first', 'Newest users']]
const SHOWS = [['all', 'Everyone'], ['today', 'Used today'], ['week', 'Last 7 days'], ['quiet', 'Quiet 30+ days'], ['topup', 'Bought credits'], ['near', 'Near the limit']]

function exportCsv(rows) {
  const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`
  const lines = ['Store,Plan,Credits this month,Left this month,Requests all time,Credits all time,Real cost all time (USD),Today,Last 7 days,First used,Last used,Bought credits left']
    .concat(rows.map((s) => [s.name, s.plan, s.monthCredits, s.monthLeft, s.requests, s.allTimeCredits, s.allTimeUsd, s.today, s.last7, s.firstDay, s.lastDay, s.topupLeft].map(esc).join(',')))
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `sellapage-sella-usage-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Vendors({ data, allowance, onOpen }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('month')
  const [show, setShow] = useState('all')
  const since7 = lagosDay(Date.now() - 6 * DAY)
  const since30 = lagosDay(Date.now() - 29 * DAY)
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = data.stores.filter((s) => !needle || `${s.name} ${s.slug}`.toLowerCase().includes(needle))
    if (show === 'today') list = list.filter((s) => s.today > 0)
    else if (show === 'week') list = list.filter((s) => s.lastDay >= since7)
    else if (show === 'quiet') list = list.filter((s) => s.lastDay && s.lastDay < since30)
    else if (show === 'topup') list = list.filter((s) => s.topupLeft > 0)
    else if (show === 'near') list = list.filter((s) => s.monthCredits >= allowance * 0.8)
    const by = {
      month: (a, b) => b.monthCredits - a.monthCredits || b.allTimeCredits - a.allTimeCredits,
      all: (a, b) => b.allTimeCredits - a.allTimeCredits,
      requests: (a, b) => b.requests - a.requests,
      cost: (a, b) => b.allTimeUsd - a.allTimeUsd,
      recent: (a, b) => (b.lastAt || 0) - (a.lastAt || 0) || b.lastDay.localeCompare(a.lastDay),
      first: (a, b) => b.firstDay.localeCompare(a.firstDay),
    }[sort]
    return list.slice().sort(by)
  }, [data.stores, q, sort, show, since7, since30, allowance])
  const pg = useClientPages(rows, 12)
  useEffect(() => { pg.setPage(1) }, [q, sort, show]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center">
        <SearchBox value={q} onChange={setQ} placeholder="Search a store" className="sm:flex-1 lg:max-w-sm" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <label className="inline-flex h-10 min-w-0 items-center gap-2 rounded-2xl bg-white pl-3 pr-1 text-[12.5px] font-semibold text-dash-ink ring-1 ring-dash-line">
            <ArrowDownUp size={14} className="flex-shrink-0 text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-full min-w-0 cursor-pointer bg-transparent outline-none" aria-label="Sort vendors">{SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
          </label>
          <Btn size="sm" tone="soft" icon={<Download size={14} />} onClick={() => exportCsv(rows)} disabled={!rows.length}>CSV</Btn>
        </div>
      </div>
      <Chips size="sm" value={show} onChange={setShow} options={SHOWS.map(([id, label]) => ({ id, label }))} className="mt-3 px-1" />
      {rows.length === 0 ? <Empty icon={<Users size={22} />} title="Nobody here" sub="Try another filter." className="mt-3 border-none" /> : (
        <>
          <div className="mt-3 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-left text-[12.5px]">
              <thead className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">This month</th><th className="px-3 py-2 text-right">Today</th><th className="px-3 py-2 text-right">7 days</th><th className="px-3 py-2 text-right">All-time credits</th><th className="px-3 py-2 text-right">Requests</th><th className="px-3 py-2 text-right">Real cost</th><th className="px-3 py-2">Last used</th></tr></thead>
              <tbody className="divide-y divide-dash-line">{pg.rows.map((s) => (
                <tr key={s.storeId} onClick={() => onOpen(s)} className="cursor-pointer transition hover:bg-violet-50/40">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarTone(s.storeId)}`}>{initials(s.name)}</span><div className="min-w-0"><p className="max-w-[200px] truncate font-semibold text-dash-ink">{s.name}</p><div className="flex items-center gap-1"><PlanPill plan={s.plan} />{s.topupLeft > 0 && <Pill tone="violet">+{cr(s.topupLeft)} bought</Pill>}</div></div></div></td>
                  <td className="w-44 px-3 py-2.5"><div className="flex justify-between text-[11.5px]"><span className="font-bold tabular-nums text-dash-ink">{cr(s.monthCredits)}</span><span className="text-slate-400">of {cr(allowance)}</span></div><Meter value={s.monthCredits} of={allowance} tone={s.monthCredits >= allowance ? 'bg-red-500' : s.monthCredits >= allowance * 0.8 ? 'bg-amber-500' : 'bg-violet-500'} className="mt-1 h-1.5" /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{cr(s.today)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{cr(s.last7)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{cr(s.allTimeCredits)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{cr(s.requests)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">${s.allTimeUsd.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{s.lastAt ? timeAgo(s.lastAt) : s.lastDay ? fmtDate(`${s.lastDay}T12:00:00`) : '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-2 lg:hidden">{pg.rows.map((s) => (
            <li key={s.storeId}><button type="button" onClick={() => onOpen(s)} className="w-full rounded-2xl border border-dash-line p-3 text-left active:bg-slate-50">
              <div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[11.5px] font-bold ${avatarTone(s.storeId)}`}>{initials(s.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{s.name}</span><span className="text-[11px] text-slate-500">Last used {s.lastAt ? timeAgo(s.lastAt) : s.lastDay ? fmtDate(`${s.lastDay}T12:00:00`) : '-'}</span></span><PlanPill plan={s.plan} /></div>
              <div className="mt-2.5 flex justify-between text-[11.5px]"><span><strong className="tabular-nums text-dash-ink">{cr(s.monthCredits)}</strong> <span className="text-slate-400">of {cr(allowance)} this month</span></span><span className="tabular-nums text-slate-500">{cr(s.allTimeCredits)} all time</span></div>
              <Meter value={s.monthCredits} of={allowance} tone="bg-violet-500" className="mt-1 h-1.5" />
            </button></li>
          ))}</ul>
        </>
      )}
      <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={12} onPage={pg.setPage} className="mt-3 border-t border-dash-line px-1 pt-3" />
    </section>
  )
}

// ── Activity log ────────────────────────────────────────────────────────────
function LogTable({ rows, rate, showStore = true }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
          <thead className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-3 py-2">When</th>{showStore && <th className="px-3 py-2">Vendor</th>}<th className="px-3 py-2">Who</th><th className="px-3 py-2">Feature</th><th className="px-3 py-2 text-right">Credits</th><th className="px-3 py-2 text-right">Real cost</th></tr></thead>
          <tbody className="divide-y divide-dash-line">{rows.map((r) => { const K = kindOf(r.kind); return (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fmtDateTime(r.at)}</td>
              {showStore && <td className="max-w-[200px] truncate px-3 py-2.5 font-semibold text-dash-ink">{r.storeName || 'Unknown store'}</td>}
              <td className="px-3 py-2.5">{r.actorRole && r.actorRole !== 'owner' ? <Pill tone="violet">{r.actorLabel || 'Staff'}</Pill> : <span className="text-slate-500">Owner</span>}</td>
              <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 font-medium text-dash-ink"><span className={`h-2 w-2 rounded-full ${K.bar}`} />{K.label}</span></td>
              <td className="px-3 py-2.5 text-right font-bold tabular-nums">{r.credits}{r.fromTopup > 0 && <span className="ml-1 text-[10.5px] font-semibold text-violet-600">({r.fromTopup} bought)</span>}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{ngn((r.usd || 0) * rate)} <span className="text-slate-400">${Number(r.usd || 0).toFixed(4)}</span></td>
            </tr>
          ) })}</tbody>
        </table>
      </div>
      <ul className="divide-y divide-dash-line lg:hidden">{rows.map((r) => { const K = kindOf(r.kind); return (
        <li key={r.id} className="flex items-center gap-3 py-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50" style={{ color: K.color }}><K.icon size={15} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{showStore ? r.storeName || 'Unknown store' : K.label}</span><span className="block truncate text-[11.5px] text-slate-500">{fmtDateTime(r.at)} · {showStore ? K.label : r.actorRole !== 'owner' ? r.actorLabel || 'Staff' : 'Owner'}</span></span>
          <span className="flex-shrink-0 text-right"><span className="block text-[13px] font-bold tabular-nums">{r.credits}</span><span className="text-[10.5px] text-slate-400">credits</span></span>
        </li>
      ) })}</ul>
    </>
  )
}

function ActivityLog({ stores, rate }) {
  const [kind, setKind] = useState('')
  const [storeId, setStoreId] = useState('')
  const [cursors, setCursors] = useState([''])
  const cursor = cursors[cursors.length - 1]
  useEffect(() => { setCursors(['']) }, [kind, storeId])
  const params = new URLSearchParams({ action: 'log', limit: '25' })
  if (kind) params.set('kind', kind)
  if (storeId) params.set('storeId', storeId)
  if (cursor) params.set('cursor', cursor)
  const { data, loading, error } = useOpsData(`/api/admin-sella-ai?${params}`)
  const rows = data?.rows || []
  return (
    <section className="rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-center">
        <Chips size="sm" value={kind} onChange={setKind} options={[{ id: '', label: 'Every feature' }, ...Object.entries(KIND).map(([id, k]) => ({ id, label: k.label, dot: k.bar }))]} />
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="h-10 min-w-0 rounded-2xl border border-dash-line bg-white px-3 text-[12.5px] font-semibold text-dash-ink outline-none lg:ml-auto lg:w-64" aria-label="Show one vendor">
          <option value="">Every vendor</option>
          {stores.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.storeId} value={s.storeId}>{s.name}</option>)}
        </select>
      </div>
      <Notice tone="error" className="mt-3">{error}</Notice>
      <div className="mt-3">
        {loading && !data ? <div className="h-64 animate-pulse rounded-2xl bg-slate-50" /> : rows.length === 0
          ? <Empty icon={<ScrollText size={22} />} title="No requests here yet" sub="Every charged Sella request is listed here from 7 October 2026, when this log started. Earlier usage is in the daily and monthly totals." className="border-none" />
          : <LogTable rows={rows} rate={rate} />}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dash-line px-1 pt-3">
        <p className="text-[12px] text-dash-muted">Page {cursors.length}{loading && data ? <Loader2 size={12} className="ml-1.5 inline animate-spin" /> : null}</p>
        <div className="flex gap-2">
          <Btn size="sm" tone="soft" disabled={cursors.length <= 1} onClick={() => setCursors((c) => c.slice(0, -1))}>Newer</Btn>
          <Btn size="sm" tone="soft" disabled={!data?.nextCursor} onClick={() => setCursors((c) => [...c, data.nextCursor])}>Older</Btn>
        </div>
      </div>
    </section>
  )
}

// ── one vendor ──────────────────────────────────────────────────────────────
function StorePanel({ row, rate, allowance }) {
  const { data, loading, error } = useOpsData(`/api/admin-sella-ai?action=store&storeId=${encodeURIComponent(row.storeId)}`)
  const days = useMemo(() => (data ? fillDays(data.days, 60) : []), [data])
  if (error) return <Notice tone="error">{error}</Notice>
  if (loading && !data) return <div className="space-y-3"><div className="h-28 animate-pulse rounded-3xl bg-slate-100" /><div className="h-48 animate-pulse rounded-3xl bg-slate-100" /></div>
  const b = data.balance
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center gap-3">
        <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-[17px] font-bold ${avatarTone(row.storeId)}`}>{initials(data.store.name)}</span>
        <div className="min-w-0"><p className="truncate font-display text-[20px] font-extrabold text-dash-ink">{data.store.name}</p><div className="mt-1 flex flex-wrap gap-1.5"><PlanPill plan={data.store.plan} /><Pill tone={data.store.staffAccess ? 'violet' : 'slate'}>{data.store.staffAccess ? 'Staff can use Sella' : 'Owner only'}</Pill>{data.store.assistantName !== 'Sella AI' && <Pill tone="blue">Named &ldquo;{data.store.assistantName}&rdquo;</Pill>}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[['This month', `${cr(b.used)} / ${cr(b.included)}`], ['Left now', cr(b.remaining)], ['Bought, left', cr(b.topup)], ['All time', cr(row.allTimeCredits)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-violet-50/60 p-3 ring-1 ring-violet-100"><p className="text-[11px] font-semibold text-violet-700/80">{l}</p><p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-dash-ink">{v}</p></div>
        ))}
      </div>
      <Meter value={b.used} of={allowance} tone="bg-violet-500" className="h-2" />
      <p className="-mt-2 text-[11.5px] text-slate-500">Resets {fmtDate(b.resetsAt)}{b.topupNextExpiry ? ` · ${cr(b.topupNextExpiry.credits)} bought credits expire ${fmtDate(b.topupNextExpiry.at)}` : ''} · first used {row.firstDay ? fmtDate(`${row.firstDay}T12:00:00`) : '-'}</p>
      <section className="rounded-3xl border border-dash-line p-4">
        <p className="text-[13.5px] font-bold text-dash-ink">Last 60 days</p>
        <div className="mt-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} contentStyle={TIP} labelFormatter={(k) => fmtDate(`${k}T12:00:00`)} formatter={(v, n, it) => [`${cr(v)} requests · ${cr(it.payload.credits)} credits`, 'Used']} />
              <Bar dataKey="requests" fill="#7c3aed" radius={[4, 4, 0, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {data.months.length > 0 && (
        <section className="rounded-3xl border border-dash-line p-4">
          <p className="text-[13.5px] font-bold text-dash-ink">Every month</p>
          <ul className="mt-2 divide-y divide-dash-line">{data.months.slice().reverse().map((m) => (
            <li key={m.month} className="flex items-center gap-3 py-2 text-[12.5px]"><span className="w-32 flex-shrink-0 font-semibold text-dash-ink">{monthLong(m.month)}</span><Meter value={m.credits} of={Math.max(allowance, ...data.months.map((x) => x.credits))} tone="bg-violet-500" className="h-1.5 flex-1" /><span className="w-24 flex-shrink-0 text-right tabular-nums">{cr(m.credits)} cr · {cr(m.requests)}</span></li>
          ))}</ul>
        </section>
      )}
      <section className="rounded-3xl border border-dash-line p-4">
        <p className="text-[13.5px] font-bold text-dash-ink">Recent requests</p>
        {data.log.length === 0 ? <p className="mt-2 text-[12.5px] text-slate-500">No requests logged yet (the log started on 7 October 2026).</p> : <div className="mt-2"><LogTable rows={data.log} rate={rate} showStore={false} /></div>}
      </section>
    </div>
  )
}

export default function SellaMeter() {
  const { data, loading, error } = useOpsData('/api/admin-sella-ai?action=usage')
  const [view, setView] = useState('overview')
  const [open, setOpen] = useState(null)
  const s = data?.summary
  const c = data?.credits
  const rate = c?.ngnPerUsd || 1400
  const allowance = c?.monthlyAllowance || 1000
  const monthName = c?.month ? new Date(`${c.month}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : 'This month'

  return (
    <div className="space-y-4">
      <Notice tone="error">{error}</Notice>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1036] via-[#2e1065] to-[#4c1d95] p-4 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="hidden lg:block"><SellaBot size={130} /></div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-violet-200">{monthName}</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><p className="font-display text-[36px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.used} /> : '...'}</p><p className="mt-1 text-[12.5px] text-violet-200/80">credits used</p></div>
              <div><p className="font-display text-[36px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.costNaira} format={ngn} /> : '...'}</p><p className="mt-1 text-[12.5px] text-violet-200/80">real AI cost (${c?.costUsd?.toFixed?.(2) ?? '0.00'})</p></div>
              <div><p className="font-display text-[36px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.requests} /> : '...'}</p><p className="mt-1 text-[12.5px] text-violet-200/80">requests</p></div>
            </div>
            <p className="mt-4 text-[12.5px] text-violet-100/85">Each vendor gets {cr(allowance)} credits a month (1 credit is ₦{c?.nairaPerCredit ?? 10} of AI cost). {c?.storesWithTopup ? `${c.storesWithTopup} vendor${c.storesWithTopup === 1 ? ' has' : 's have'} ${cr(c.topupLeft)} bought credits left.` : 'Nobody has bought extra credits yet.'}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { icon: Zap, label: 'Requests today', v: s?.todayTotal, sub: s ? `${cr(s.todayCredits)} credits` : '' },
          { icon: Users, label: 'Vendors today', v: s?.activeVendorsToday, sub: s ? `${s.active7} in 7 days` : '' },
          { icon: CalendarClock, label: 'Active 30 days', v: s?.active30, sub: s ? `of ${s.vendorsEverUsed} who ever used it` : '' },
          { icon: UserPlus, label: 'New this month', v: s?.newThisMonth, sub: 'first month using Sella' },
          { icon: Bot, label: 'Requests all time', v: s?.allTimeTotal, sub: s?.firstDay ? `since ${fmtDate(`${s.firstDay}T12:00:00`)}` : '' },
          { icon: Coins, label: 'Credits all time', v: s?.allTimeCredits, sub: s ? `${ngn(s.allTimeUsd * rate)} real cost` : '' },
        ].map((t, i) => (
          <div key={t.label} className="min-w-0 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dash-muted"><t.icon size={14} className="flex-shrink-0 text-violet-600" /><span className="truncate">{t.label}</span></p>
            <p className="mt-2 font-display text-[22px] font-extrabold leading-none tabular-nums text-dash-ink">{s ? <CountUp value={t.v || 0} /> : '-'}</p>
            {t.sub && <p className="mt-1 truncate text-[11px] text-slate-500">{t.sub}</p>}
          </div>
        ))}
      </section>
      {s?.topThisMonth && <p className="-mt-1 flex items-center gap-1.5 text-[12.5px] text-dash-muted"><Crown size={13} className="flex-shrink-0 text-amber-500" /><span>Highest user this month: <button type="button" className="font-semibold text-dash-ink hover:underline" onClick={() => setOpen(data.stores.find((x) => x.storeId === s.topThisMonth.storeId))}>{s.topThisMonth.name}</button>{`, ${cr(s.topThisMonth.credits)} credits.`}</span></p>}

      <Segmented value={view} onChange={setView} options={[
        { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
        { id: 'vendors', label: 'Vendors', icon: <ListOrdered size={14} />, count: data?.stores?.length },
        { id: 'log', label: 'Activity log', icon: <ScrollText size={14} /> },
      ]} />

      {loading && !data ? <div className="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />
        : !data ? null
          : data.stores.length === 0 && view !== 'log' ? <Empty icon={<Bot size={22} />} title="Nobody has used Sella yet" sub="Premium vendors see Sella in their dashboard. Usage shows here from their first message." />
            : view === 'overview' ? <Overview data={data} rate={rate} onOpen={setOpen} />
              : view === 'vendors' ? <Vendors data={data} allowance={allowance} onOpen={setOpen} />
                : <ActivityLog stores={data.stores} rate={rate} />}
      {data?.truncated && <Notice tone="warn">There are more usage records than one read covers, so the oldest days are not all counted.</Notice>}

      <Drawer open={!!open} onClose={() => setOpen(null)} wide title="Sella usage" sub={open ? `Daily cap ${data?.dailyLimit || 300} requests, a guard against runaway use` : ''}>
        {open && <StorePanel key={open.storeId} row={open} rate={rate} allowance={allowance} />}
      </Drawer>
    </div>
  )
}
