// src/ops/tabs/RevenueLedger.jsx
//
// Revenue, in three views that never get mixed up:
//   Sellapage income  what Sellapage itself earned: plan subscriptions, Sella
//                     credit packs and delivery service charges, by day, week,
//                     month or year (RevenueIncome.jsx, admin-revenue income)
//   Store sales       what each store sold through Sellapage, which is the
//                     vendors' money, not ours (store-revenue, paged)
//   Paystack          every successful payment through the Paystack account,
//                     vendors' sales included, straight from Paystack
import { useState } from 'react'
import { Wallet, Store, Receipt } from 'lucide-react'
import { useOpsData } from '../opsKit'
import RevenueIncome from './RevenueIncome'
import { initials, avatarTone } from '../opsUi'
import { Segmented, Pager, PlanPill, Pill, Notice, Empty, fmtDateTime, title, storeUrl } from './kit'

const ngn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
const short = (n) => { const v = Number(n) || 0; return v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₦${Math.round(v / 1e3)}k` : `₦${v}` }

function StoreSales() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useOpsData(`/api/admin-revenue?action=store-revenue&page=${page}&limit=12`)
  const t = data?.totals
  const rows = data?.stores || []
  const max = Math.max(1, ...rows.map((r) => r.totalRevenue))
  return (
    <div className="space-y-4">
      <Notice tone="error">{error}</Notice>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Stores that sold', t?.stores, false], ['Orders and bookings', t ? t.orders + t.bookings : null, false], ['Products sold', t?.productRevenue, true], ['Services sold', t?.serviceRevenue, true]].map(([l, v, money]) => (
          <div key={l} className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"><p className="text-[12px] font-semibold text-dash-muted">{l}</p><p className="mt-1 font-display text-[22px] font-extrabold tabular-nums text-dash-ink">{v == null ? '-' : money ? short(v) : v.toLocaleString()}</p></div>
        ))}
      </section>
      <section className="rounded-3xl border border-dash-line bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-3">
        {loading && !data ? <div className="h-64 animate-pulse rounded-2xl bg-slate-50" /> : rows.length === 0 ? <Empty icon={<Store size={22} />} title="No paid orders yet" className="border-none" /> : (
          <ol className="divide-y divide-dash-line">
            {rows.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 sm:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,2fr)_120px]">
                <span className="text-center font-display text-[14px] font-extrabold tabular-nums text-slate-400">{(page - 1) * 12 + i + 1}</span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(r.id)}`}>{initials(r.storeName)}</span>
                  <span className="min-w-0"><a href={storeUrl(r.handle || r.storeName)} target="_blank" rel="noopener noreferrer" className="block truncate text-[13.5px] font-semibold text-dash-ink hover:text-forest-600">{r.storeName || 'Store'}</a><span className="text-[11.5px] text-slate-500">{r.orders} order{r.orders === 1 ? '' : 's'}{r.bookings ? ` · ${r.bookings} booking${r.bookings === 1 ? '' : 's'}` : ''}</span></span>
                </span>
                <span className="col-span-3 sm:col-span-1">
                  <span className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <span className="h-full bg-forest-600 transition-all duration-700" style={{ width: `${(r.productRevenue / max) * 100}%` }} title={`Products ${ngn(r.productRevenue)}`} />
                    <span className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${(r.serviceRevenue / max) * 100}%` }} title={`Services ${ngn(r.serviceRevenue)}`} />
                  </span>
                  <span className="mt-1 flex gap-3 text-[11px] text-slate-500"><span>Products {short(r.productRevenue)}</span>{r.serviceRevenue > 0 && <span>Services {short(r.serviceRevenue)}</span>}{r.deliveryCollected > 0 && <span>Delivery {short(r.deliveryCollected)}</span>}</span>
                </span>
                <span className="row-start-1 text-right sm:row-auto"><span className="block text-[14px] font-extrabold tabular-nums text-dash-ink">{ngn(r.totalRevenue)}</span><PlanPill plan={r.plan} /></span>
              </li>
            ))}
          </ol>
        )}
        <Pager page={page} pages={data?.totalPages || 1} total={data?.total} perPage={12} onPage={setPage} className="border-t border-dash-line px-2 pt-3" />
      </section>
      <p className="flex items-center gap-1.5 text-[12px] text-dash-muted"><span className="h-2 w-2 rounded-full bg-forest-600" /> Products <span className="ml-2 h-2 w-2 rounded-full bg-sky-400" /> Services · paid orders that were not cancelled or refunded, delivery and card fees taken out.</p>
    </div>
  )
}

function Paystack() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useOpsData(`/api/admin-revenue?action=transactions&page=${page}&limit=25`)
  const rows = data?.transactions || []
  if (data && data.hasApiKey === false) return <Empty icon={<Receipt size={22} />} title="Paystack is not connected here" sub="PAYSTACK_SECRET_KEY is not set on this environment." />
  return (
    <div className="space-y-3">
      <Notice tone="info">Every successful payment through Sellapage&apos;s Paystack account, newest first. Most of this is vendors&apos; sales, which settle straight to their own accounts.</Notice>
      <Notice tone="error">{error}</Notice>
      <section className="overflow-hidden rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {loading && !data ? <div className="h-64 animate-pulse bg-slate-50" /> : rows.length === 0 ? <Empty icon={<Receipt size={22} />} title="No payments found" className="border-none" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-5 py-3">When</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Goes to</th><th className="px-3 py-3 text-right">Fee</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-dash-line text-[13px]">
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-600">{fmtDateTime(t.paidAt)}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-dash-ink">{t.customer || '-'}</td>
                    <td className="px-3 py-3"><Pill tone="slate">{title(t.channel) || '-'}</Pill></td>
                    <td className="px-3 py-3">{t.subaccount ? <Pill tone="blue">A store</Pill> : <Pill tone="green">Sellapage</Pill>}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-500">{ngn(t.fees)}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-dash-ink">{ngn(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Pager page={page} pages={data?.meta?.pageCount || 1} total={data?.meta?.total} perPage={25} onPage={setPage} />
    </div>
  )
}

export default function RevenueLedger() {
  const [view, setView] = useState('income')
  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[
        { id: 'income', label: 'Sellapage income', icon: <Wallet size={15} /> },
        { id: 'stores', label: 'Store sales', icon: <Store size={15} /> },
        { id: 'paystack', label: 'Paystack', icon: <Receipt size={15} /> },
      ]} className="max-w-full overflow-x-auto" />
      {view === 'income' ? <RevenueIncome /> : view === 'stores' ? <StoreSales /> : <Paystack />}
    </div>
  )
}
