// src/ops/tabs/AnalyticsStudio.jsx
//
// Analytics: sign-ups over time, the plan mix, and the stores people visit
// most (/api/admin-analytics overview, signups, top-stores). Charts are
// recharts, which this tab loads on its own.
import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Store, CreditCard, Package, Inbox, LifeBuoy, Eye, MousePointerClick, Sparkles, ExternalLink } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { Segmented, PlanPill, Notice, Empty, CountUp, storeUrl } from './kit'

const PLAN_COLORS = { premium: '#f59e0b', pro: '#0f172a', growth: '#0b6b35', free: '#cbd5e1' }
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
const monthLabel = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })

function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-dash-ink px-3 py-2 text-[12px] text-white shadow-xl">
      <p className="text-white/70">{fmt(label)}</p>
      <p className="font-bold">{payload[0].value} sign-up{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  )
}

export default function AnalyticsStudio({ can, onTab }) {
  const [range, setRange] = useState('30')
  const overview = useOpsData('/api/admin-analytics?action=overview')
  const signups = useOpsData('/api/admin-analytics?action=signups&days=90&months=12')
  const top = useOpsData('/api/admin-analytics?action=top-stores&limit=10')
  const a = overview.data?.analytics
  const days = useMemo(() => signups.data?.days || [], [signups.data])
  const months = useMemo(() => signups.data?.months || [], [signups.data])

  const series = useMemo(() => (range === '12m' ? months.map((m) => ({ k: m.month, n: m.count })) : days.slice(-Number(range)).map((d) => ({ k: d.date, n: d.count }))), [range, days, months])
  const windowTotal = series.reduce((n, d) => n + d.n, 0)
  const quick = useMemo(() => {
    const last = (n) => days.slice(-n).reduce((s, d) => s + d.count, 0)
    return { today: last(1), week: last(7), month: last(30) }
  }, [days])

  const pie = useMemo(() => {
    if (!a) return []
    const b = a.planBreakdown || {}
    return [
      { id: 'premium', name: 'Premium', value: b.premium || 0 },
      { id: 'pro', name: 'Pro', value: b.pro || 0 },
      { id: 'growth', name: 'Growth', value: b.growth || 0 },
      { id: 'free', name: 'Free', value: a.freeStores || 0 },
    ].filter((x) => x.value > 0)
  }, [a])
  const paidPct = a?.totalStores ? Math.round((a.paidStores / a.totalStores) * 100) : 0
  const stores = top.data?.stores || []
  const maxViews = Math.max(1, ...stores.map((s) => s.totalViews))

  const kpis = [
    { icon: Store, label: 'Stores', v: a?.totalStores, tint: 'bg-sky-50 text-sky-600' },
    { icon: CreditCard, label: 'Paying', v: a?.paidStores, sub: a ? `${paidPct}% of stores${a.inGrace ? `, ${a.inGrace} in grace` : ''}` : '', tint: 'bg-emerald-50 text-emerald-600' },
    { icon: Package, label: 'Products', v: a?.totalProducts, tint: 'bg-violet-50 text-violet-600' },
    { icon: Inbox, label: 'Leads', v: a?.totalLeads, sub: 'Enquiries from storefronts', tint: 'bg-amber-50 text-amber-600' },
    { icon: LifeBuoy, label: 'Open tickets', v: a?.openTickets, tint: 'bg-rose-50 text-rose-600', go: can?.('tickets') ? 'tickets' : null },
  ]

  return (
    <div className="space-y-4">
      <Notice tone="error">{overview.error || signups.error || top.error}</Notice>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => {
          const I = k.icon
          const shell = `flex flex-col items-start rounded-3xl border border-dash-line bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${i === kpis.length - 1 ? 'col-span-2 md:col-span-1' : ''}`
          const inner = (
            <>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.tint}`}><I size={17} /></span>
              <p className="mt-3 text-[12px] font-semibold text-dash-muted">{k.label}</p>
              <p className="mt-0.5 font-display text-[26px] font-extrabold leading-none tabular-nums text-dash-ink">{k.v == null ? '-' : <CountUp value={k.v} />}</p>
              {k.sub && <p className="mt-1 text-[11.5px] text-slate-500">{k.sub}</p>}
            </>
          )
          return k.go
            ? <button key={k.label} type="button" onClick={() => onTab(k.go)} className={`${shell} transition hover:-translate-y-0.5 hover:shadow-md`}>{inner}</button>
            : <div key={k.label} className={shell}>{inner}</div>
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold text-dash-ink">Sign-ups</p>
              <p className="mt-0.5 text-[12.5px] text-dash-muted"><strong className="text-dash-ink">{windowTotal}</strong> in this view · {quick.today} today · {quick.week} this week · {signups.data?.totals?.allTime?.toLocaleString() ?? '-'} all time</p>
            </div>
            <Segmented value={range} onChange={setRange} options={[{ id: '30', label: '30 days' }, { id: '90', label: '90 days' }, { id: '12m', label: '12 months' }]} />
          </div>
          <div className="mt-4 h-72">
            {signups.loading && !signups.data ? <div className="h-full animate-pulse rounded-2xl bg-slate-50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="an-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b6b35" stopOpacity={0.3} /><stop offset="1" stopColor="#0b6b35" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#eef1f4" vertical={false} />
                  <XAxis dataKey="k" tickFormatter={range === '12m' ? monthLabel : dayLabel} tick={{ fontSize: 11, fill: '#7c8a99' }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7c8a99' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip fmt={range === '12m' ? monthLabel : dayLabel} />} cursor={{ stroke: '#a9e2c3' }} />
                  <Area type="monotone" dataKey="n" stroke="#0b6b35" strokeWidth={2.5} fill="url(#an-fill)" animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {signups.data?.totals?.undated > 0 && <p className="mt-2 text-[11.5px] text-slate-400">{signups.data.totals.undated} older stores have no sign-up date and are not in the chart.</p>}
        </section>

        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[15px] font-bold text-dash-ink">Plan mix</p>
          <p className="mt-0.5 text-[12.5px] text-dash-muted">Paid plans that have not ended</p>
          <div className="relative mx-auto mt-2 h-52 w-52">
            {pie.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pie} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none" animationDuration={900}>{pie.map((p) => <Cell key={p.id} fill={PLAN_COLORS[p.id]} />)}</Pie></PieChart>
              </ResponsiveContainer>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><p className="font-display text-[30px] font-extrabold leading-none text-dash-ink">{a ? `${paidPct}%` : '-'}</p><p className="text-[11.5px] text-dash-muted">paying</p></div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {pie.map((p) => <li key={p.id} className="flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAN_COLORS[p.id] }} />{p.name}</span><span className="font-bold tabular-nums text-dash-ink">{p.value.toLocaleString()}</span></li>)}
          </ul>
          {a?.lapsed > 0 && <p className="mt-3 text-[11.5px] text-slate-500">{a.lapsed} store{a.lapsed === 1 ? '' : 's'} had a paid plan that ended.</p>}
        </section>
      </div>

      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[15px] font-bold text-dash-ink">Most visited stores</p><p className="mt-0.5 text-[12.5px] text-dash-muted">Storefront visits, clicks, and how many visits went further than a glance</p></div>
          <Sparkles size={18} className="text-amber-500" />
        </div>
        {top.loading && !top.data ? <div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-50" />
          : stores.length === 0 ? <Empty icon={<Eye size={22} />} title="No visits counted yet" className="mt-4 border-none" />
            : (
              <ol className="mt-4 space-y-2">
                {stores.map((s, i) => (
                  <li key={s.id} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50 md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,2fr)_110px]">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold ${i === 0 ? 'bg-amber-400 text-amber-950' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-300 text-orange-950' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(s.id)}`}>{initials(s.storeName)}</span>
                      <span className="min-w-0"><a href={storeUrl(s.handle || s.storeName)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-[13.5px] font-semibold text-dash-ink hover:text-forest-600">{s.storeName}<ExternalLink size={11} className="flex-shrink-0 text-slate-300" /></a><PlanPill plan={s.plan} /></span>
                    </span>
                    <span className="col-span-2 md:col-span-1">
                      <span className="flex items-center justify-between text-[11.5px] text-slate-500"><span className="inline-flex items-center gap-1"><Eye size={12} />{s.totalViews.toLocaleString()} visits</span><span className="inline-flex items-center gap-1"><MousePointerClick size={12} />{s.totalClicks.toLocaleString()} clicks</span></span>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-gradient-to-r from-forest-600 to-emerald-400 transition-all duration-700" style={{ width: `${(s.totalViews / maxViews) * 100}%` }} /></span>
                    </span>
                    <span className="col-span-2 text-right md:col-span-1"><span className={`text-[15px] font-extrabold tabular-nums ${s.engagementRate >= 50 ? 'text-emerald-600' : s.engagementRate >= 20 ? 'text-amber-600' : 'text-slate-500'}`}>{s.engagementRate}%</span><span className="ml-1 text-[11px] text-slate-400">engaged</span></span>
                  </li>
                ))}
              </ol>
            )}
      </section>
    </div>
  )
}
