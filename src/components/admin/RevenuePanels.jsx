// The two halves of the admin Revenue tab.
//
// They answer different questions and must never be mixed up:
//   - Platform: money Sellapage itself earned (plan subscriptions, the service
//     charge on a delivery booking, dropshipping commission once it ships).
//   - Stores: money vendors earned through their storefronts.
//
// The old tab showed the Paystack balance and Paystack's total volume under
// "Platform Revenue". That volume is every naira charged through the
// integration, vendors' sales included, which is not Sellapage's income: a
// vendor's sale settles to the vendor's own subaccount and Sellapage's share of
// it is zero. Those two figures are still here, under "Not Sellapage income",
// clearly labelled.
import { Wallet, CreditCard, Truck, Boxes, Store, AlertCircle } from 'lucide-react'

const PLAN_LABEL = { growth: 'Growth', pro: 'Pro', premium: 'Premium', unknown: 'Unknown' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const monthLabel = (key) => {
  const [y, m] = String(key).split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

function Stat({ label, value, sub, icon: Icon, tone = 'gray' }) {
  const tones = {
    green: 'text-green-600',
    gray: 'text-gray-900',
    muted: 'text-gray-500',
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon size={11} className="text-gray-400" /> : null}
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-black ${tones[tone]}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] font-medium text-gray-400">{sub}</p> : null}
    </div>
  )
}

export function PlatformRevenue({ data }) {
  if (!data) return null
  const subs = data.subscriptions || {}
  const ship = data.shipments || {}
  const drop = data.dropshipping || {}
  const paystack = data.paystack || {}
  const months = (subs.byMonth || []).filter((m) => m.amount > 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
        <p className="text-[9px] font-bold uppercase tracking-wider text-green-700">Sellapage revenue</p>
        <p className="mt-1 text-3xl font-black text-green-700">{data.ownRevenueFormatted}</p>
        <p className="mt-1 text-[11px] font-medium text-green-800">
          Subscriptions and delivery service charges. Vendors' own sales are not counted here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Subscriptions"
          value={subs.totalFormatted}
          sub={`${Number(subs.count || 0).toLocaleString()} payments · ${subs.thisMonthFormatted} this month`}
          icon={CreditCard}
          tone="green"
        />
        <Stat
          label="Delivery charges"
          value={ship.totalFormatted}
          sub={`${Number(ship.count || 0).toLocaleString()} shipments booked · NGN ${Number(ship.serviceCharge || 0).toLocaleString('en-NG')} each`}
          icon={Truck}
          tone="green"
        />
        <Stat
          label="Dropshipping commission"
          value={drop.totalFormatted}
          sub="Coming soon: nothing charged yet"
          icon={Boxes}
          tone="muted"
        />
      </div>

      {(subs.byPlan || []).length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-xs font-bold text-gray-800">Subscription revenue by plan</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {subs.byPlan.map((p) => (
              <div key={p.plan} className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-bold text-gray-700">{PLAN_LABEL[p.plan] || p.plan}</span>
                <span className="text-xs font-black text-gray-900">NGN {Math.round(p.amount).toLocaleString('en-NG')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {months.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <h3 className="text-xs font-bold text-gray-800">Subscription revenue by month</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[...months].reverse().map((m) => (
              <div key={m.month} className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-gray-600">{monthLabel(m.month)}</span>
                <span className="text-xs font-black text-gray-900">NGN {Math.round(m.amount).toLocaleString('en-NG')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
        <div className="mb-2 flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Not Sellapage income</p>
            <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
              Money that passes through Paystack on the way to vendors. Shown for context only.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Vendor sales</p>
            <p className="mt-0.5 text-sm font-black text-gray-700">{data.merchantGrossFormatted}</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Paystack balance</p>
            <p className="mt-0.5 text-sm font-black text-gray-700">
              {paystack.hasApiKey ? paystack.balanceFormatted : 'No API key'}
            </p>
            <p className="text-[9px] text-gray-400">Sitting in the Sellapage Paystack account</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">All payments processed</p>
            <p className="mt-0.5 text-sm font-black text-gray-700">
              {paystack.hasApiKey ? paystack.allPaymentsVolumeFormatted : '-'}
            </p>
            <p className="text-[9px] text-gray-400">
              {paystack.hasApiKey ? `${Number(paystack.allPaymentsCount || 0).toLocaleString()} transactions, vendors included` : 'Needs the Paystack key'}
            </p>
          </div>
        </div>
      </div>

      {data.truncated && (
        <p className="text-[10px] font-semibold text-amber-700">
          Showing the first batch of records only. Tell your developer to add paging here.
        </p>
      )}
    </div>
  )
}

export function StoreRevenue({ data, planClasses }) {
  const stores = data?.stores || []
  const totals = data?.totals

  if (!stores.length) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-xs">
        No store revenue yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="All stores earned" value={totals.totalRevenueFormatted} sub={`${Number(totals.stores || 0).toLocaleString()} stores selling`} icon={Store} tone="green" />
          <Stat label="Products" value={totals.productRevenueFormatted} sub={`${Number(totals.orders || 0).toLocaleString()} orders`} icon={Wallet} />
          <Stat label="Services" value={totals.serviceRevenueFormatted} sub={`${Number(totals.bookings || 0).toLocaleString()} bookings`} icon={Wallet} />
          <Stat label="Dropshipping" value={totals.dropshippingRevenueFormatted} sub="Coming soon" icon={Boxes} tone="muted" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/80 text-[9px] font-black uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Store</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Bookings</th>
                <th className="px-4 py-2 text-right">Products</th>
                <th className="px-4 py-2 text-right">Services</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2">
                    <p className="max-w-[140px] truncate font-bold text-gray-900">{s.storeName || 'Unnamed'}</p>
                    <p className="max-w-[140px] truncate text-[10px] text-gray-400">{s.email || '-'}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${planClasses?.[s.plan] || planClasses?.starter || ''}`}>{s.plan}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">{Number(s.orders || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">{Number(s.bookings || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{s.productRevenueFormatted}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{s.serviceRevenueFormatted}</td>
                  <td className="px-4 py-2 text-right font-black text-green-600">{s.totalRevenueFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400">
        Counts paid orders and bookings, minus cancelled and refunded ones. Delivery fees and the
        checkout processing fee are left out, so these are earnings on goods and services.
      </p>
    </div>
  )
}
