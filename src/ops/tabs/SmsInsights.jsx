// src/ops/tabs/SmsInsights.jsx
//
// SMS Campaigns > how the texts did, from /api/admin-sms?action=overview:
//   activity   sent, reached a handset, and link taps per Lagos day, over a
//              range, with the money spent each day in the tooltip
//   funnel     sent, then delivered (Termii's reports), then tapped, with
//              where the rest went (DND, not delivered, failed)
//   campaigns  every sent campaign side by side: tap rate, delivery rate,
//              cost per tap, best one marked
//   timing     the hour of the day and the day of the week vendors tap, to
//              pick when to send next (sending is only allowed 8am to 8pm)
import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, Filter, Trophy, Clock3, MousePointerClick, Banknote, Send } from 'lucide-react'
import { Segmented, Pill, Meter, fmtDate } from './kit'

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
const n = (v) => Number(v || 0).toLocaleString('en-NG')
const lagosDay = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const dayTick = (d) => { const [, m, x] = String(d).split('-').map(Number); return `${x}/${m}` }

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] text-white shadow-xl">
      <p className="font-semibold">{fmtDate(`${label}T12:00:00`)}</p>
      <p className="mt-1 text-white/80">{n(r.sent)} sent · {n(r.delivered)} reached a phone</p>
      <p className="text-white/80">{n(r.clicks)} taps{r.sent ? ` · ${pct(r.clicks, r.sent)}% of sent` : ''}</p>
      {r.spend > 0 && <p className="text-white/80">{naira(r.spend)} spent{r.campaigns ? ` on ${r.campaigns} campaign${r.campaigns === 1 ? '' : 's'}` : ''}</p>}
    </div>
  )
}

export default function SmsInsights({ data }) {
  const [range, setRange] = useState('30')
  const series = useMemo(() => {
    const rows = data?.series || []
    const by = Object.fromEntries(rows.map((r) => [r.date, r]))
    const first = rows[0]?.date
    const today = lagosDay(Date.now())
    const [y, m, d] = today.split('-').map(Number)
    const todayMs = Date.UTC(y, m - 1, d)
    const sinceFirst = first ? Math.round((todayMs - Date.parse(`${first}T00:00:00Z`)) / 864e5) + 1 : 14
    // "All" runs from the first send, at least two weeks, at most 400 days.
    const count = Math.min(400, range === 'all' ? Math.max(14, sinceFirst) : Number(range))
    return Array.from({ length: count }, (_, i) => {
      const key = new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10)
      return { sent: 0, clicks: 0, delivered: 0, dnd: 0, spend: 0, campaigns: 0, ...by[key], date: key }
    })
  }, [data, range])
  const t = data?.totals || {}
  const sent = (data?.campaigns || []).filter((c) => c.status === 'sent')
  const ranked = useMemo(() => sent.map((c) => ({ ...c, rate: pct(c.clicks, c.sent), delivery: pct(c.delivered, c.sent), perTap: c.clicks ? c.cost / c.clicks : null })).sort((a, b) => b.rate - a.rate), [sent])
  const hours = data?.byHour || []
  const hourMax = Math.max(1, ...hours.map((h) => h.clicks))
  const bestHour = hours.reduce((b, h) => (h.clicks > (b?.clicks || 0) ? h : b), null)
  const week = data?.byWeekday || []
  const weekMax = Math.max(1, ...week.map((w) => w.clicks))
  const rangeTotals = series.reduce((a, r) => ({ sent: a.sent + r.sent, clicks: a.clicks + r.clicks, spend: a.spend + r.spend }), { sent: 0, clicks: 0, spend: 0 })
  const lost = [['Blocked by DND', t.dndBlocked, 'bg-amber-400'], ['Not delivered', t.undelivered, 'bg-slate-400'], ['Failed to send', t.failed, 'bg-red-400']]
  const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`

  if (!sent.length && !(data?.series || []).length) return null

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Activity size={16} className="text-forest-600" /> How the texts did</p>
            <p className="text-[12px] text-dash-muted">{n(rangeTotals.sent)} sent · {n(rangeTotals.clicks)} taps ({pct(rangeTotals.clicks, rangeTotals.sent)}%) · {naira(rangeTotals.spend)} spent in this range</p>
          </div>
          <Segmented value={range} onChange={setRange} options={[{ id: '14', label: '14D' }, { id: '30', label: '30D' }, { id: '90', label: '90D' }, { id: 'all', label: 'All' }]} />
        </div>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 6, right: 4, left: -6, bottom: 0 }} barGap={1}>
              <CartesianGrid stroke="#eef2f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(11,107,53,0.05)' }} />
              <Bar dataKey="sent" fill="#bbf7d0" radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
              <Bar dataKey="delivered" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
              <Line type="monotone" dataKey="clicks" stroke="#14532d" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} animationDuration={900} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#bbf7d0]" />Sent</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#22c55e]" />Reached a phone</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#14532d]" />Link taps</span>
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Filter size={16} className="text-forest-600" /> From sent to tapped</p>
          <p className="text-[12px] text-dash-muted">Every campaign so far</p>
          <ul className="mt-4 space-y-3">
            {[['Sent', t.sentMessages, 'bg-forest-200', Send], ['Reached a phone', t.delivered, 'bg-emerald-500', null], ['Tapped the link', t.clicks, 'bg-forest-900', MousePointerClick]].map(([l, v, c], i) => (
              <li key={l}>
                <div className="flex items-baseline justify-between text-[12.5px]"><span className="font-semibold text-dash-ink">{l}</span><span className="tabular-nums text-slate-500"><strong className="text-dash-ink">{n(v)}</strong>{i ? ` · ${pct(v, t.sentMessages)}%` : ''}</span></div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c} transition-all duration-1000`} style={{ width: `${Math.max(2, pct(v, t.sentMessages || 1))}%` }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-dash-line pt-3">
            <p className="text-[11.5px] font-semibold text-slate-500">Where the rest went</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">{lost.map(([l, v, c]) => <span key={l} className={`${c} w-0`} style={{ flexGrow: Number(v) || 0 }} />)}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600">{lost.map(([l, v, c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} />{l} {n(v)}</span>)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Banknote size={12} />Cost per tap</p><p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-dash-ink">{t.clicks ? naira(t.spend / t.clicks) : '-'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Banknote size={12} />Cost per delivered text</p><p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-dash-ink">{t.delivered ? naira(t.spend / t.delivered) : '-'}</p></div>
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Clock3 size={16} className="text-forest-600" /> When vendors tap</p>
          <p className="text-[12px] text-dash-muted">{bestHour?.clicks ? `Busiest hour: ${hourLabel(bestHour.hour)} (Lagos time). Texts can go out 8am to 8pm.` : 'Shows once links are tapped.'}</p>
          <div className="mt-4 flex h-24 items-end gap-[3px]">
            {hours.map((h) => (
              <div key={h.hour} className="group relative flex-1" title={`${hourLabel(h.hour)}: ${h.clicks} taps`}>
                <div className={`w-full rounded-t ${h.hour >= 8 && h.hour < 20 ? 'bg-emerald-500' : 'bg-slate-300'} transition-all duration-700 group-hover:bg-forest-700`} style={{ height: `${Math.max(3, (h.clicks / hourMax) * 96)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
          <div className="mt-5 space-y-1.5">
            {week.map((w) => (
              <div key={w.day} className="flex items-center gap-2 text-[12px]"><span className="w-8 font-semibold text-slate-500">{w.day}</span><Meter value={w.clicks} of={weekMax} tone="bg-forest-600" className="h-2 flex-1" /><span className="w-8 text-right tabular-nums text-slate-500">{w.clicks}</span></div>
            ))}
          </div>
          {data?.clicksCapped && <p className="mt-3 text-[11px] text-slate-400">From the latest 2,000 taps.</p>}
        </section>
      </div>

      {ranked.length > 0 && (
        <section className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink"><Trophy size={16} className="text-amber-500" /> Campaigns side by side</p>
          <p className="text-[12px] text-dash-muted">Best tap rate first</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="py-2 pr-3">Campaign</th><th className="px-3 py-2">Tap rate</th><th className="px-3 py-2 text-right">Delivered</th><th className="px-3 py-2 text-right">Taps</th><th className="px-3 py-2 text-right">Cost</th><th className="py-2 pl-3 text-right">Per tap</th></tr></thead>
              <tbody className="divide-y divide-dash-line">{ranked.map((c, i) => (
                <tr key={c.id}>
                  <td className="py-2.5 pr-3"><p className="flex items-center gap-1.5 font-semibold text-dash-ink">{c.name || 'Untitled'}{i === 0 && c.clicks > 0 && <Pill tone="gold">Best</Pill>}</p><p className="text-[11px] text-slate-400">{fmtDate(c.sentAt)} · {n(c.sent)} sent</p></td>
                  <td className="w-40 px-3 py-2.5"><div className="flex items-center gap-2"><Meter value={c.rate} of={Math.max(1, ranked[0].rate)} tone="bg-forest-600" className="h-2 flex-1" /><span className="w-11 text-right font-bold tabular-nums">{c.rate}%</span></div></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.delivery}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{n(c.clicks)}{c.clickedBy ? <span className="text-slate-400"> ({n(c.clickedBy)} people)</span> : ''}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{naira(c.cost)}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold tabular-nums">{c.perTap != null ? naira(c.perTap) : '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
