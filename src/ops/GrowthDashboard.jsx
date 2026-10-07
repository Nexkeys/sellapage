// src/ops/GrowthDashboard.jsx
//
// Growth & Activation: the CEO's 30-day plan, measured (ops-insights growth).
//   Activation   activation rate, time to first customer, completion, sharing
//   Funnel       Signed up -> products -> complete -> shared -> first customer
//                -> came back, strict, with drop-off between each stage
//   Segments     the six groups from the reactivation plan, each a list she
//                can open, export, or hand to the Outreach Tracker
//   Channels     where merchants come from, judged by quality not volume
//   Cohorts      each week's sign-ups and how many of them activated
//   Retention    weekly / monthly active merchants, 30-day retention
//   Revenue      paid conversion, revenue per active merchant (Revenue access)
// Charts use recharts, loaded only when this tab opens.
import { useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Bar, Line, BarChart, Cell } from 'recharts'
import {
  Zap, Timer, Users, RefreshCcw, CreditCard, Wallet, Info, ArrowRight, PhoneCall,
  Store, Package, Share2, MessageCircle, Repeat, TrendingDown,
} from 'lucide-react'
import { Card, Shimmer, useOpsData, naira, compact } from './opsKit'
import SegmentDrawer from './SegmentDrawer'

const SEG_STYLE = {
  active: { icon: Zap, tone: 'from-emerald-500 to-green-600', soft: 'bg-emerald-50 text-emerald-700' },
  went_quiet: { icon: TrendingDown, tone: 'from-slate-500 to-slate-700', soft: 'bg-slate-100 text-slate-700' },
  shared_no_activity: { icon: Share2, tone: 'from-sky-500 to-blue-600', soft: 'bg-sky-50 text-sky-700' },
  complete_not_shared: { icon: Package, tone: 'from-violet-500 to-purple-600', soft: 'bg-violet-50 text-violet-700' },
  no_products: { icon: Store, tone: 'from-amber-500 to-orange-500', soft: 'bg-amber-50 text-amber-700' },
  not_set_up: { icon: Users, tone: 'from-rose-500 to-red-500', soft: 'bg-rose-50 text-rose-700' },
}
const STAGE_ICON = { registered: Users, products: Package, complete: Store, shared: Share2, interaction: MessageCircle, returning: Repeat }
const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })

function Kpi({ icon: Icon, label, value, note, accent = 'text-forest-600 bg-forest-50' }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dash-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon size={17} /></span>
      <p className="mt-3 text-[12px] font-medium text-slate-500">{label}</p>
      <p className="font-display text-[26px] font-extrabold leading-tight text-dash-ink">{value}</p>
      {note && <p className="mt-0.5 text-[11.5px] text-slate-400">{note}</p>}
    </div>
  )
}

export default function GrowthDashboard({ can, onTab, refreshKey }) {
  const [fresh, setFresh] = useState(0)
  const { data: g, loading, error, reload } = useOpsData(`/api/ops-insights?action=growth&r=${refreshKey}${fresh ? `&fresh=1&f=${fresh}` : ''}`)
  const [drawer, setDrawer] = useState(null)
  const [defs, setDefs] = useState(false)

  const funnel = useMemo(() => (g?.funnel || []).map((s, i, a) => ({ ...s, pct: a[0]?.n ? Math.round((s.n / a[0].n) * 100) : 0, step: i ? (a[i - 1].n ? Math.round((s.n / a[i - 1].n) * 100) : 0) : 100, lost: i ? a[i - 1].n - s.n : 0 })), [g])
  const worst = useMemo(() => funnel.slice(1).reduce((w, s) => (s.step < (w?.step ?? 101) ? s : w), null), [funnel])

  if (error && !g) return <div className="rounded-3xl bg-red-50 p-5 text-[13.5px] text-red-700">{error} <button type="button" onClick={reload} className="ml-2 font-semibold underline">Try again</button></div>
  if (loading && !g) return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-32" />)}</div><Shimmer className="h-72" /><Shimmer className="h-64" /></div>
  const k = g.kpis
  const updated = Math.max(0, Math.round((Date.now() - g.builtAt) / 60000))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-500 ring-1 ring-dash-line">Numbers from {updated ? `${updated} min ago` : 'just now'}</span>
        <button type="button" onClick={() => setFresh(Date.now())} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-forest-600 ring-1 ring-dash-line hover:bg-forest-50"><RefreshCcw size={13} /> Recount now</button>
        <button type="button" onClick={() => setDefs((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 ring-1 ring-dash-line hover:bg-slate-50"><Info size={13} /> How we count</button>
      </div>
      {defs && (
        <div className="grid grid-cols-1 gap-2 rounded-3xl bg-slate-900 p-5 text-[12.5px] leading-relaxed text-slate-200 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p><strong className="text-white">Complete:</strong> products, a logo and a description of 20+ characters.</p>
          <p><strong className="text-white">Shared:</strong> copied or shared their link (counted from 6 Oct 2026), or 5+ visits for older stores.</p>
          <p><strong className="text-white">First customer:</strong> at least one enquiry, order or booking.</p>
          <p><strong className="text-white">Activated:</strong> has products, shared, and at least one customer.</p>
          <p><strong className="text-white">Active:</strong> signed in to their dashboard in the last 30 days (7 for weekly).</p>
          <p><strong className="text-white">Came back:</strong> signed in again a day or more after signing up.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Kpi icon={Zap} label="Activation rate" value={`${k.activationRate}%`} note={`${k.activated} of ${k.merchants} merchants`} />
        <Kpi icon={Timer} label="Days to first customer" value={k.timeToActivationDays == null ? '-' : k.timeToActivationDays} note="median, activated merchants" accent="text-sky-600 bg-sky-50" />
        <Kpi icon={Users} label="Active merchants" value={`${k.wam} / ${k.mam}`} note="this week / this month" accent="text-violet-600 bg-violet-50" />
        <Kpi icon={RefreshCcw} label="30-day retention" value={`${k.retention30}%`} note={`of ${k.retentionBase} older than 30 days`} accent="text-amber-600 bg-amber-50" />
        <Kpi icon={CreditCard} label="Paid conversion" value={`${k.paidConversion}%`} note={`${k.paid} paying stores`} accent="text-rose-600 bg-rose-50" />
        <Kpi icon={Wallet} label="Revenue per active merchant" value={k.revenuePerActive == null ? 'Locked' : naira(k.revenuePerActive)} note={k.revenue30 == null ? 'Needs Revenue access' : `${naira(k.revenue30)} in 30 days`} accent="text-teal-600 bg-teal-50" />
      </div>

      {/* funnel */}
      <Card title="Activation funnel" sub="Each stage counts merchants who reached it and every stage before. Tap a stage to see who is in it.">
        <ol className="space-y-2.5">
          {funnel.map((s, i) => {
            const Icon = STAGE_ICON[s.id] || Users
            return (
              <li key={s.id}>
                {i > 0 && <p className="mb-1 ml-12 text-[11px] text-slate-400">{s.step}% moved on{s.lost ? ` · ${s.lost} stopped here` : ''}{worst?.id === s.id ? <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">biggest drop</span> : null}</p>}
                <button type="button" onClick={() => setDrawer({ id: s.id === 'registered' ? 'all' : s.id, label: s.label, about: `${s.n} merchants reached this stage (${s.any} in total, in any order).` })} className="group flex w-full items-center gap-3 text-left">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate font-semibold text-dash-ink group-hover:text-forest-700">{s.label}</span>
                      <span className="flex-shrink-0 font-bold tabular-nums text-dash-ink">{s.n.toLocaleString()} <span className="font-normal text-slate-500">({s.pct}%)</span></span>
                    </span>
                    <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-gradient-to-r from-forest-600 to-emerald-400 transition-all duration-700 group-hover:brightness-110" style={{ width: `${Math.max(s.pct, 1.5)}%` }} />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 text-[12px] text-slate-500">Also: {k.setUpRate}% have a logo or description, {k.shareRate}% shared their store ({k.sharedTracked} counted directly), {k.firstInteractionRate}% have had a customer.</p>
      </Card>

      {/* segments */}
      <div>
        <h3 className="mb-3 text-[15px] font-bold text-dash-ink">Merchant segments <span className="font-normal text-slate-500">from the reactivation plan</span></h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {g.segments.map((s) => {
            const st = SEG_STYLE[s.id]
            const share = k.merchants ? Math.round((s.n / k.merchants) * 100) : 0
            return (
              <div key={s.id} className="group relative overflow-hidden rounded-3xl border border-dash-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${st.tone} opacity-10 transition group-hover:scale-125`} />
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${st.tone} text-white shadow`}><st.icon size={18} /></span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.soft}`}>{share}%</span>
                </div>
                <p className="mt-3 font-display text-[30px] font-extrabold leading-none text-dash-ink">{s.n}</p>
                <p className="mt-1 text-[13.5px] font-semibold text-dash-ink">{s.label}</p>
                <p className="text-[12px] leading-snug text-slate-500">{s.about}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setDrawer(s)} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200">See list <ArrowRight size={12} /></button>
                  {can('outreach') && s.id !== 'active' && <button type="button" onClick={() => setDrawer(s)} className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-forest-600 hover:bg-forest-50"><PhoneCall size={12} /> Reach out</button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Channels by quality" sub="Sign-ups (bars) and the share that activated (line), from &quot;How did you hear about us?&quot;.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={g.channels.slice(0, 8)} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 11)}...` : v)} interval={0} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #eef1f4', fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="signups" name="Sign-ups" fill="#bbf7d0" radius={[8, 8, 0, 0]} />
                <Line yAxisId="r" dataKey="activationRate" name="Activated %" stroke="#0b6b35" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-[12px]">
              <thead><tr className="text-left text-slate-400"><th className="py-1.5 font-medium">Channel</th><th className="font-medium">Sign-ups</th><th className="font-medium">Products</th><th className="font-medium">Activated</th><th className="font-medium">Paid</th></tr></thead>
              <tbody className="divide-y divide-dash-line">
                {g.channels.map((c) => (
                  <tr key={c.id}><td className="py-2 pr-2 font-medium text-dash-ink">{c.label}</td><td>{c.signups}</td><td>{c.productRate}%</td><td className="font-semibold text-forest-700">{c.activationRate}%</td><td>{c.paidRate}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Weekly cohorts" sub="Each week's sign-ups, and how many went on to add products, share and activate.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={g.cohorts} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="week" tickFormatter={shortDay} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip labelFormatter={(v) => `Week of ${shortDay(v)}`} contentStyle={{ borderRadius: 14, border: '1px solid #eef1f4', fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="signups" name="Sign-ups" fill="#d1fae5" radius={[6, 6, 0, 0]} />
                <Line yAxisId="r" dataKey="products" name="Added products %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line yAxisId="r" dataKey="shared" name="Shared %" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line yAxisId="r" dataKey="activated" name="Activated %" stroke="#0b6b35" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Sign-ups, last 90 days" sub={`${g.signups.reduce((n, d) => n + d.n, 0)} new merchants.`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={g.signups} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs><linearGradient id="gd-sign" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b6b35" stopOpacity={0.35} /><stop offset="1" stopColor="#0b6b35" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip labelFormatter={shortDay} contentStyle={{ borderRadius: 14, border: '1px solid #eef1f4', fontSize: 12 }} />
                <Area dataKey="n" name="Sign-ups" stroke="#0b6b35" strokeWidth={2} fill="url(#gd-sign)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Customers in the last 30 days" sub={`${k.storesWithInteraction} stores have had at least one customer.`}>
          <div className="grid grid-cols-3 gap-2.5">
            {[['Enquiries', k.leads30, 'bg-sky-50 text-sky-700'], ['Orders', k.orders30, 'bg-emerald-50 text-emerald-700'], ['Bookings', k.bookings30, 'bg-violet-50 text-violet-700']].map(([l, n, c]) => (
              <div key={l} className={`rounded-2xl p-3 text-center ${c}`}><p className="font-display text-[26px] font-extrabold leading-none">{compact(n)}</p><p className="mt-1 text-[11.5px] font-semibold">{l}</p></div>
            ))}
          </div>
          {g.revenueByMonth && (
            <>
              <p className="mb-1 mt-4 text-[12.5px] font-semibold text-dash-ink">Plan revenue by month</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(g.revenueByMonth).sort().slice(-6).map(([m, v]) => ({ m, v }))} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(m) => new Date(`${m}-01`).toLocaleDateString('en-NG', { month: 'short' })} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={compact} />
                    <Tooltip formatter={(v) => naira(v)} contentStyle={{ borderRadius: 14, border: '1px solid #eef1f4', fontSize: 12 }} />
                    <Bar dataKey="v" name="Revenue" radius={[6, 6, 0, 0]}>{Object.keys(g.revenueByMonth).slice(-6).map((m, i) => <Cell key={m} fill={i % 2 ? '#16a34a' : '#0b6b35'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card title="Categories" sub="Where merchants come from by business type, and how many activate.">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {g.categories.map((c) => (
            <div key={c.label}>
              <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-slate-600">{c.label}</span><span className="font-semibold text-dash-ink">{c.signups} <span className="font-normal text-slate-400">· {c.signups ? Math.round((c.activated / c.signups) * 100) : 0}% active</span></span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-forest-600 to-emerald-400" style={{ width: `${(c.signups / Math.max(...g.categories.map((x) => x.signups), 1)) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>

      {can('outreach') && (
        <button type="button" onClick={() => onTab('outreach')} className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-[#034e22] to-[#0b6b35] p-5 text-left text-white transition hover:brightness-110">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><PhoneCall size={22} /></span>
          <span className="flex-1"><span className="block font-display text-lg font-extrabold">Turn these numbers into conversations</span><span className="block text-[13px] text-green-100/85">Open a segment, pick merchants, and work through them in the Outreach Tracker.</span></span>
          <ArrowRight size={20} />
        </button>
      )}

      {drawer && <SegmentDrawer seg={drawer} canOutreach={can('outreach')} onClose={() => setDrawer(null)} />}
    </div>
  )
}
