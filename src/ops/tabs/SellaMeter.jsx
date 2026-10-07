// src/ops/tabs/SellaMeter.jsx
//
// Sella AI Usage: how vendors use Sella and what it really costs. Credits are
// charged at the real AI cost (OpenRouter's usage.cost, _lib/sella-credits.js),
// so "cost" here is money Sellapage actually spent, converted at the rate the
// credits use (/api/admin-sella-ai).
import { useMemo } from 'react'
import { Bot, Zap, Coins, Users, MessageSquare, Brain, Image as ImageIcon, FileText, Mic, AudioLines } from 'lucide-react'
import { useOpsData } from '../opsKit'
import SellaBot from '../SellaBot'
import { initials, avatarTone } from '../opsUi'
import { Pager, PlanPill, Empty, Notice, Meter, CountUp, useClientPages } from './kit'

const KIND = {
  chat: { label: 'Chat', icon: MessageSquare, bar: 'bg-violet-500' },
  deep: { label: 'Deep thinking', icon: Brain, bar: 'bg-fuchsia-500' },
  image: { label: 'Images', icon: ImageIcon, bar: 'bg-sky-500' },
  files: { label: 'Files', icon: FileText, bar: 'bg-amber-500' },
  speech: { label: 'Read aloud', icon: AudioLines, bar: 'bg-emerald-500' },
  voice: { label: 'Voice notes', icon: Mic, bar: 'bg-rose-500' },
}
const cr = (n) => Math.round(Number(n) || 0).toLocaleString('en-NG')

export default function SellaMeter() {
  const { data, loading, error } = useOpsData('/api/admin-sella-ai?action=usage')
  const s = data?.summary
  const c = data?.credits
  const stores = useMemo(() => data?.stores || [], [data])
  const pg = useClientPages(stores, 10)
  const kinds = Object.entries(c?.byKind || {}).sort((a, b) => b[1] - a[1])
  const kindMax = Math.max(1, ...kinds.map(([, v]) => v))
  const monthName = c?.month ? new Date(`${c.month}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : 'This month'

  return (
    <div className="space-y-4">
      <Notice tone="error">{error}</Notice>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1036] via-[#2e1065] to-[#4c1d95] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="hidden lg:block"><SellaBot size={130} /></div>
          <div>
            <p className="text-[12.5px] font-semibold text-violet-200">{monthName}</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div><p className="font-display text-[34px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.used} format={cr} /> : '-'}</p><p className="mt-1 text-[12px] text-violet-200/80">credits used</p></div>
              <div><p className="font-display text-[34px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.costNaira} format={(n) => `₦${cr(n)}`} /> : '-'}</p><p className="mt-1 text-[12px] text-violet-200/80">real AI cost (${(c?.costUsd || 0).toFixed(2)})</p></div>
              <div><p className="font-display text-[34px] font-extrabold leading-none tabular-nums">{c ? <CountUp value={c.requests} format={cr} /> : '-'}</p><p className="mt-1 text-[12px] text-violet-200/80">requests</p></div>
            </div>
            {c && <p className="mt-4 text-[12px] text-violet-100/70">Each vendor gets {cr(c.monthlyAllowance)} credits a month (1 credit is ₦{c.nairaPerCredit} of AI cost). {c.storesWithTopup ? `${c.storesWithTopup} vendor${c.storesWithTopup === 1 ? ' has' : 's have'} ${cr(c.topupLeft)} bought credits left.` : 'Nobody has bought extra credits yet.'}</p>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section className="space-y-3">
          {[
            { icon: <Zap size={17} />, label: 'Requests today', v: s?.todayTotal },
            { icon: <Users size={17} />, label: 'Vendors using Sella today', v: s?.activeVendorsToday },
            { icon: <Bot size={17} />, label: 'Requests all time', v: s?.allTimeTotal },
            { icon: <Coins size={17} />, label: 'Vendors who have ever used Sella', v: s?.vendorsEverUsed },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-3 rounded-3xl border border-dash-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">{t.icon}</span>
              <span className="flex-1 text-[13px] font-semibold text-slate-600">{t.label}</span>
              <span className="font-display text-[22px] font-extrabold tabular-nums text-dash-ink">{t.v == null ? '-' : cr(t.v)}</span>
            </div>
          ))}
          <div className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-[14px] font-bold text-dash-ink">Where the credits went</p>
            {kinds.length === 0 ? <p className="mt-2 text-[12.5px] text-slate-400">No credits used yet this month.</p> : (
              <ul className="mt-3 space-y-3">
                {kinds.map(([k, v]) => {
                  const m = KIND[k] || { label: k, icon: Bot, bar: 'bg-slate-400' }
                  const I = m.icon
                  return (
                    <li key={k}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-1.5 text-slate-600"><I size={13} />{m.label}</span><span className="font-bold tabular-nums text-dash-ink">{cr(v)}</span></div>
                      <Meter value={v} of={kindMax} tone={m.bar} />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
          <p className="px-2 pt-1 text-[14px] font-bold text-dash-ink">Vendors by credits this month</p>
          <p className="px-2 text-[12px] text-dash-muted">A daily cap of {data?.dailyLimit ?? '-'} requests stops runaway use.</p>
          {loading && !data ? <div className="mt-3 h-64 animate-pulse rounded-2xl bg-slate-50" />
            : stores.length === 0 ? <Empty icon={<Bot size={22} />} title="Nobody has used Sella yet" className="mt-3 border-none" />
              : (
                <>
                  <ul className="mt-3 divide-y divide-dash-line">
                    {pg.rows.map((r) => (
                      <li key={r.storeId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto]">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(r.storeId)}`}>{initials(r.businessName)}</span>
                          <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-dash-ink">{r.businessName}</span><span className="flex items-center gap-1.5"><PlanPill plan={r.plan} /><span className="text-[11px] text-slate-400">{cr(r.today)} today · {cr(r.allTime)} all time</span></span></span>
                        </span>
                        <span className="col-span-2 md:col-span-1">
                          <span className="mb-1 flex justify-between text-[11px] text-slate-500"><span>{cr(r.creditsUsed)} of {cr(c?.monthlyAllowance || 0)} credits</span>{r.topupLeft > 0 && <span className="text-violet-600">+{cr(r.topupLeft)} bought</span>}</span>
                          <Meter value={r.creditsUsed} of={c?.monthlyAllowance || 1} tone={r.creditsLeft <= 0 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'} />
                        </span>
                        <span className="row-start-1 text-right md:row-auto"><span className="block text-[13.5px] font-bold tabular-nums text-dash-ink">${(r.costUsd || 0).toFixed(2)}</span><span className="text-[11px] text-slate-400">AI cost</span></span>
                      </li>
                    ))}
                  </ul>
                  <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={10} onPage={pg.setPage} className="mt-2 border-t border-dash-line px-2 pt-3" />
                </>
              )}
        </section>
      </div>
    </div>
  )
}
