// src/ops/tabs/MerchantProfile.jsx
//
// The Merchants side panel: one store, everything Sellapage knows about it
// (/api/admin-health?action=merchant, built in _lib/merchant-profile.js).
//   Overview   storefront numbers, a traffic chart, profile, payout account
//   Activity   online now or last seen, devices, one timeline of everything
//   Sales      orders, bookings and enquiries, by month and one by one
//   Billing    every naira they paid Sellapage: plans, Sella credits, delivery
//   Sella AI   credits used this month and every month before
//   Referrals  where they came from (code and owner) and who they brought
import { useMemo, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  MessageCircle, Mail, ExternalLink, BadgeCheck, Wrench, Inbox, Eye, MousePointerClick, CalendarCheck, ShoppingBag,
  Activity, Receipt, Bot, Gift, LayoutGrid, MonitorSmartphone, Smartphone, Monitor, Wifi, LogIn, UserPlus, Truck, CreditCard,
  Sparkles, Store, ShieldCheck, Globe, Users, Link2, CircleDot, Clock,
} from 'lucide-react'
import { useOpsData } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { HEARD_ABOUT_SOURCES } from '../../utils/heardAbout'
import { Segmented, Chips, Pager, PlanPill, Pill, Empty, Notice, Btn, Field, CopyText, CountUp, Meter, useClientPages, fmtDate, fmtDateTime, timeAgo, waLink, storeUrl, title } from './kit'

const ngn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`
const short = (n) => { const v = Number(n) || 0; return v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₦${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `₦${Math.round(v)}` }
const count = (n) => Math.round(Number(n) || 0).toLocaleString('en-NG')
const dayTick = (d) => { const [, m, day] = String(d).split('-').map(Number); return `${day}/${m}` }
const monthTick = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'short' })
const monthLong = (m) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
const TIP = { background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12, padding: '8px 10px' }
const heardLabel = (h) => {
  const s = HEARD_ABOUT_SOURCES.find((x) => x.id === h?.source)
  return s ? `${s.label}${h.detail ? ` (${h.detail})` : ''}` : ''
}

function Tile({ icon, label, value, text, sub, money = false, tone = 'text-forest-600', i = 0 }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3.5 ring-1 ring-dash-line animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${i * 45}ms` }}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dash-muted"><span className={tone}>{icon}</span><span className="truncate">{label}</span></p>
      <p className="mt-1.5 truncate font-display text-[22px] font-extrabold leading-none tabular-nums text-dash-ink">{text ?? <CountUp value={value} format={money ? ngn : count} />}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

function Card({ icon, heading, sub, right, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-3xl border border-dash-line bg-white p-4 sm:p-5 ${className}`}>
      {(heading || right) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><p className="flex items-center gap-2 text-[14px] font-bold text-dash-ink">{icon}{heading}</p>{sub && <p className="mt-0.5 text-[12px] text-dash-muted">{sub}</p>}</div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

function Presence({ p, compact = false }) {
  if (p.online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 ring-1 ring-emerald-100">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
        Online now{!compact && p.onlineDevices > 1 ? ` on ${p.onlineDevices} devices` : ''}
      </span>
    )
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600"><Clock size={12} />{p.lastActiveAt ? `Last seen ${timeAgo(p.lastActiveAt)}` : 'Not seen on the dashboard yet'}</span>
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview({ d, row, busy, onApprove }) {
  const [span, setSpan] = useState(30)
  const t = d.traffic
  const days = useMemo(() => t.days.slice(-span).map((x) => ({ ...x, clicks: x.productClicks + x.serviceClicks })), [t.days, span])
  const s = d.store
  const clicksAll = t.allTime.productClicks + t.allTime.serviceClicks || t.allTime.clicks
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile i={0} icon={<Eye size={14} />} label="Store views" value={t.allTime.views} sub={`${count(t.last30.views)} in the last 30 days`} />
        <Tile i={1} icon={<MousePointerClick size={14} />} label="Product clicks" value={t.allTime.productClicks || (s.vendorType === 'services' ? 0 : clicksAll)} sub={`${count(t.last30.productClicks)} in 30 days`} />
        <Tile i={2} icon={<Wrench size={14} />} label="Service clicks" value={t.allTime.serviceClicks} sub={`${count(t.last30.serviceClicks)} in 30 days`} />
        <Tile i={3} icon={<CalendarCheck size={14} />} label="Booking requests" value={t.allTime.bookingRequests} sub={`${count(t.last30.bookingRequests)} in 30 days`} />
        <Tile i={4} icon={<ShoppingBag size={14} />} label="Orders" value={d.sales.orders.count} sub={`${ngn(d.sales.orders.value)} paid`} tone="text-sky-600" />
        <Tile i={5} icon={<CalendarCheck size={14} />} label="Bookings" value={d.sales.bookings.count} sub={`${ngn(d.sales.bookings.value)} paid`} tone="text-sky-600" />
        <Tile i={6} icon={<Inbox size={14} />} label="Enquiries" value={d.sales.leads.count} sub={`${count(d.sales.leads.last30)} in 30 days`} tone="text-violet-600" />
        <Tile i={7} icon={<Receipt size={14} />} label="Paid Sellapage" value={d.billing.totals.all} money sub={`${d.billing.items.length} payment${d.billing.items.length === 1 ? '' : 's'}`} tone="text-amber-600" />
      </div>

      <Card icon={<Activity size={16} className="text-forest-600" />} heading="Storefront traffic" sub="Views and clicks per day, Lagos time"
        right={<Segmented value={span} onChange={setSpan} options={[{ id: 30, label: '30 days' }, { id: 90, label: '90 days' }]} />}>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 6, right: 4, left: -6, bottom: 0 }}>
              <defs>
                <linearGradient id="mpViews" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b6b35" stopOpacity={0.35} /><stop offset="100%" stopColor="#0b6b35" stopOpacity={0} /></linearGradient>
                <linearGradient id="mpClicks" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="#eef2f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={TIP} labelFormatter={(x) => fmtDate(`${x}T12:00:00`)} formatter={(v, n) => [count(v), n]} />
              <Area type="monotone" name="Views" dataKey="views" stroke="#0b6b35" strokeWidth={2} fill="url(#mpViews)" animationDuration={900} />
              <Area type="monotone" name="Clicks" dataKey="clicks" stroke="#0ea5e9" strokeWidth={2} fill="url(#mpClicks)" animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-600" />Views</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Product and service clicks</span><span>{count(t.allTime.engaged)} engaged visits all time</span></p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card icon={<Store size={16} className="text-forest-600" />} heading="Store">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Owner">{s.ownerName}</Field>
            <Field label="Email">{s.email}</Field>
            <Field label="WhatsApp">{s.phone ? <span className="inline-flex items-center gap-1">{s.phone}{s.phoneVerified && <ShieldCheck size={13} className="text-emerald-600" aria-label="Verified at sign-up" />}</span> : null}</Field>
            <Field label="Sells">{title(s.vendorType)}</Field>
            <Field label="Category">{s.category}</Field>
            <Field label="Listings">{`${count(s.listings.products)} products · ${count(s.listings.services)} services`}</Field>
            <Field label="Custom domain">{s.customDomain}</Field>
            <Field label="Team">{s.staff ? `${s.staff} staff` : null}</Field>
            <Field label="Joined">{fmtDateTime(s.createdAt)}</Field>
          </div>
          {s.description && <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-600">{s.description}</p>}
        </Card>
        <div className="space-y-4">
          <Card icon={<CreditCard size={16} className="text-forest-600" />} heading="Plan">
            <div className="flex flex-wrap items-center gap-2"><PlanPill plan={s.plan} />{s.paidNow ? <Pill tone="green" dot>Paying now</Pill> : s.planEnded ? <Pill tone="red">Plan ended</Pill> : <Pill>Free</Pill>}{s.billingPeriod && <Pill tone="blue">{title(s.billingPeriod)}</Pill>}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Started">{s.planStartDate ? fmtDate(s.planStartDate) : null}</Field>
              <Field label={s.planEnded ? 'Ended' : 'Ends'}>{s.planEndDate ? `${fmtDate(s.planEndDate)}${!s.planEnded ? ` (${Math.max(0, Math.ceil((s.planEndDate - Date.now()) / 864e5))} days)` : ''}` : s.plan === 'starter' ? 'Free plan' : null}</Field>
            </div>
          </Card>
          <Card icon={<BadgeCheck size={16} className="text-forest-600" />} heading="Payout account">
            {!s.subaccountCode ? <p className="text-[12.5px] text-slate-500">They have not added a bank account for sales yet.</p> : (
              <>
                <p className="text-[13px] text-slate-600">{s.payoutBankName || 'Bank'} {s.payoutAccountNumberMasked ? `· ${s.payoutAccountNumberMasked}` : ''}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  {s.payoutsVerified ? <Pill tone="green" dot>Verified</Pill> : <Pill tone="amber" dot>To verify</Pill>}
                  {!s.payoutsVerified && <Btn size="sm" icon={<BadgeCheck size={14} />} busy={busy} onClick={() => onApprove(row)}>Approve account</Btn>}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Activity ────────────────────────────────────────────────────────────────
const TL = {
  joined: [UserPlus, 'bg-forest-50 text-forest-600'],
  plan: [CreditCard, 'bg-amber-50 text-amber-600'],
  credits: [Sparkles, 'bg-violet-50 text-violet-600'],
  delivery: [Truck, 'bg-sky-50 text-sky-600'],
  order: [ShoppingBag, 'bg-emerald-50 text-emerald-600'],
  booking: [CalendarCheck, 'bg-emerald-50 text-emerald-600'],
  lead: [Inbox, 'bg-violet-50 text-violet-600'],
  signin: [LogIn, 'bg-slate-100 text-slate-500'],
  referral: [Gift, 'bg-pink-50 text-pink-600'],
}
const TL_GROUP = { money: ['plan', 'credits', 'delivery'], sales: ['order', 'booking', 'lead'], signins: ['signin', 'joined'], referrals: ['referral'] }

function DeviceIcon({ type }) {
  return type === 'Mobile' ? <Smartphone size={16} /> : type === 'Tablet' ? <MonitorSmartphone size={16} /> : <Monitor size={16} />
}

function ActivityView({ d }) {
  const p = d.presence
  const [group, setGroup] = useState('all')
  const rows = useMemo(() => (group === 'all' ? d.timeline : d.timeline.filter((x) => TL_GROUP[group].includes(x.kind))), [d.timeline, group])
  const pg = useClientPages(rows, 12)
  const devices = useClientPages(p.sessions, 5)
  return (
    <div className="space-y-4">
      <section className={`relative overflow-hidden rounded-3xl p-5 text-white ${p.online ? 'bg-gradient-to-br from-[#04542a] via-[#0b6b35] to-[#10a05a]' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Wifi size={24} />{p.online && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full bg-emerald-300 ring-2 ring-[#0b6b35]" />}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] font-extrabold leading-tight">{p.online ? 'Online now' : p.lastActiveAt ? `Last seen ${timeAgo(p.lastActiveAt)}` : 'Not seen on the dashboard yet'}</p>
            <p className="mt-0.5 text-[12.5px] text-white/70">{p.online ? `Using the dashboard${p.onlineDevices > 1 ? ` on ${p.onlineDevices} devices` : ''}. It checks in every 45 seconds while open.` : p.lastActiveAt ? fmtDateTime(p.lastActiveAt) : 'They have not opened their dashboard since sessions were tracked.'}</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[['Last sign-in', p.lastSignInAt ? timeAgo(p.lastSignInAt) : '-'], ['Account created', fmtDate(p.accountCreatedAt || d.store.createdAt)], ['Devices', count(p.devices)], ['Email', p.emailVerified ? 'Verified' : 'Not verified']].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/[0.08] px-3 py-2.5 ring-1 ring-white/10"><p className="text-[11px] text-white/60">{l}</p><p className="mt-0.5 truncate text-[14px] font-bold">{v}</p></div>
          ))}
        </div>
        {p.accountDisabled && <p className="relative mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-[12px] font-semibold text-red-100">Their login is disabled.</p>}
      </section>

      <Card icon={<MonitorSmartphone size={16} className="text-forest-600" />} heading="Devices and sign-ins" sub="Owner and staff, newest activity first">
        {p.sessions.length === 0 ? <p className="text-[12.5px] text-slate-500">No dashboard sessions recorded.</p> : (
          <>
            <ul className="divide-y divide-dash-line">
              {devices.rows.map((x) => {
                const live = !x.revoked && Date.now() - x.lastActiveAt <= 2 * 60 * 1000
                return (
                  <li key={x.id} className="flex items-center gap-3 py-2.5">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${live ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><DeviceIcon type={x.deviceType} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-dash-ink">{x.device}{x.staff && <Pill tone="violet">{x.who}</Pill>}{live && <Pill tone="green" dot>Live</Pill>}{x.revoked && <Pill>Signed out</Pill>}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{x.place || 'Location unknown'} · signed in {fmtDateTime(x.createdAt)}</p>
                    </div>
                    <span className="flex-shrink-0 text-right text-[11.5px] text-slate-500">{timeAgo(x.lastActiveAt)}</span>
                  </li>
                )
              })}
            </ul>
            <Pager page={devices.page} pages={devices.pages} onPage={devices.setPage} className="mt-2" />
          </>
        )}
      </Card>

      <Card icon={<Activity size={16} className="text-forest-600" />} heading="Timeline" sub="Everything they did on Sellapage, newest first">
        <Chips size="sm" value={group} onChange={(g) => { setGroup(g); pg.setPage(1) }} options={[{ id: 'all', label: 'Everything' }, { id: 'money', label: 'Payments' }, { id: 'sales', label: 'Sales and enquiries' }, { id: 'signins', label: 'Sign-ins' }, { id: 'referrals', label: 'Referrals' }]} />
        {pg.rows.length === 0 ? <p className="py-6 text-center text-[12.5px] text-slate-500">Nothing here yet.</p> : (
          <ol className="relative mt-3 space-y-3 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-dash-line">
            {pg.rows.map((x, i) => {
              const [Icon, cls] = TL[x.kind] || [CircleDot, 'bg-slate-100 text-slate-500']
              return (
                <li key={`${x.kind}-${x.at}-${i}`} className="relative flex items-start gap-3 animate-in fade-in slide-in-from-left-1 fill-mode-both" style={{ animationDelay: `${i * 25}ms` }}>
                  <span className={`relative z-[1] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ring-4 ring-white ${cls}`}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="break-words text-[13px] font-medium text-dash-ink">{x.text}</p>
                    <p className="text-[11.5px] text-slate-500">{fmtDateTime(x.at)}{x.paid === false ? ' · not paid' : ''}</p>
                  </div>
                  {x.amount != null && <span className="flex-shrink-0 pt-0.5 text-[12.5px] font-bold tabular-nums text-dash-ink">{ngn(x.amount)}</span>}
                </li>
              )
            })}
          </ol>
        )}
        <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={12} onPage={pg.setPage} className="mt-3 border-t border-dash-line pt-3" />
      </Card>
    </div>
  )
}

// ── Sales ───────────────────────────────────────────────────────────────────
const ORDER_TONE = { delivered: 'green', completed: 'green', confirmed: 'blue', dispatched: 'blue', pending: 'amber', cancelled: 'red', refunded: 'red', no_show: 'red' }

function Sales({ d }) {
  const [view, setView] = useState('orders')
  const list = view === 'orders' ? d.recent.orders : view === 'bookings' ? d.recent.bookings : d.recent.leads
  const pg = useClientPages(list, 10)
  const o = d.sales.orders
  const b = d.sales.bookings
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile icon={<ShoppingBag size={14} />} label="Order value (paid)" value={o.value} money sub={`${count(o.paid)} of ${count(o.count)} orders paid`} />
        <Tile i={1} icon={<CalendarCheck size={14} />} label="Booking value (paid)" value={b.value} money sub={`${count(b.paid)} of ${count(b.count)} bookings paid`} />
        <Tile i={2} icon={<Activity size={14} />} label="Last 30 days" value={o.last30Value + b.last30Value} money sub={`${count(o.last30 + b.last30)} orders and bookings`} tone="text-sky-600" />
        <Tile i={3} icon={<Clock size={14} />} label="Last sale" text={o.lastAt || b.lastAt ? timeAgo(Math.max(o.lastAt, b.lastAt)) : 'None yet'} sub={o.lastAt || b.lastAt ? fmtDateTime(Math.max(o.lastAt, b.lastAt)) : 'No orders or bookings'} tone="text-slate-500" />
      </div>
      <Card icon={<LayoutGrid size={16} className="text-forest-600" />} heading="By month" sub="Paid orders and bookings, last 12 months">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.sales.byMonth} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f0" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={short} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
              <Tooltip cursor={{ fill: 'rgba(11,107,53,0.05)' }} contentStyle={TIP} labelFormatter={monthLong}
                formatter={(v, n, item) => [`${ngn(v)} (${count(n === 'Orders' ? item.payload.orders : item.payload.bookings)})`, n]} />
              <Bar name="Orders" dataKey="ordersValue" stackId="a" fill="#0b6b35" radius={[0, 0, 0, 0]} animationDuration={800} />
              <Bar name="Bookings" dataKey="bookingsValue" stackId="a" fill="#38bdf8" radius={[6, 6, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card heading="One by one" right={<Segmented value={view} onChange={(v) => { setView(v); pg.setPage(1) }} options={[{ id: 'orders', label: 'Orders', count: d.recent.orders.length }, { id: 'bookings', label: 'Bookings', count: d.recent.bookings.length }, { id: 'leads', label: 'Enquiries', count: d.recent.leads.length }]} className="max-w-full overflow-x-auto" />}>
        {pg.rows.length === 0 ? <Empty icon={<Inbox size={20} />} title="Nothing yet" className="border-none py-8" /> : (
          <ul className="divide-y divide-dash-line">
            {pg.rows.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-dash-ink">{view === 'orders' ? (x.customer || 'A customer') : view === 'bookings' ? `${x.service || 'Service'}${x.customer ? ` · ${x.customer}` : ''}` : (x.interest || title(x.type) || 'Enquiry')}</p>
                  <p className="text-[11.5px] text-slate-500">{fmtDateTime(x.at)}{view === 'bookings' && x.when ? ` · for ${x.when}` : ''}{view === 'orders' && x.delivery ? ' · delivery booked' : ''}</p>
                </div>
                {view !== 'leads' && (
                  <span className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="text-[13px] font-bold tabular-nums text-dash-ink">{ngn(x.amount)}</span>
                    <span className="flex gap-1">{!x.paid && <Pill>Not paid</Pill>}{x.status && <Pill tone={ORDER_TONE[x.status] || 'slate'}>{title(x.status)}</Pill>}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={10} onPage={pg.setPage} className="mt-2 border-t border-dash-line pt-3" />
      </Card>
    </div>
  )
}

// ── Billing ─────────────────────────────────────────────────────────────────
const KIND = {
  plan: ['Plan subscriptions', 'bg-amber-400', CreditCard, 'amber'],
  credits: ['Sella credit packs', 'bg-violet-500', Sparkles, 'violet'],
  delivery: ['Delivery service charges', 'bg-sky-500', Truck, 'blue'],
}

function Billing({ d }) {
  const [kind, setKind] = useState('all')
  const items = useMemo(() => (kind === 'all' ? d.billing.items : d.billing.items.filter((x) => x.kind === kind)), [d.billing.items, kind])
  const pg = useClientPages(items, 10)
  const tot = d.billing.totals
  const all = tot.all || 1
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-[#1c1404] p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.28),transparent_60%)]" />
        <p className="relative text-[12.5px] font-semibold text-amber-200/90">Spent on Sellapage, all time</p>
        <p className="relative mt-1.5 font-display text-[38px] font-extrabold leading-none tabular-nums"><CountUp value={tot.all} format={ngn} /></p>
        <div className="relative mt-4 flex h-3 overflow-hidden rounded-full bg-white/10">
          {Object.keys(KIND).map((k) => <div key={k} className={`${KIND[k][1]} transition-all duration-700`} style={{ width: `${((tot[k] || 0) / all) * 100}%` }} />)}
        </div>
        <div className="relative mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(KIND).map(([k, [label, dot]]) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.07] px-3 py-2 ring-1 ring-white/10">
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-white/75"><span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} /><span className="truncate">{label}</span></span>
              <span className="text-[13px] font-bold tabular-nums">{ngn(tot[k])}</span>
            </div>
          ))}
        </div>
      </section>
      <Card heading="Billing history" sub="Every payment to Sellapage, newest first">
        <Chips size="sm" value={kind} onChange={(k) => { setKind(k); pg.setPage(1) }} options={[{ id: 'all', label: 'All', count: d.billing.items.length }, ...Object.entries(KIND).map(([id, [label]]) => ({ id, label, count: d.billing.items.filter((x) => x.kind === id).length }))]} />
        {pg.rows.length === 0 ? <Empty icon={<Receipt size={20} />} title="No payments to Sellapage" sub="Plan payments, Sella credit packs and delivery bookings show here." className="mt-3 border-none py-8" /> : (
          <ul className="mt-2 divide-y divide-dash-line">
            {pg.rows.map((x) => {
              const [, , Icon, tone] = KIND[x.kind] || KIND.plan
              return (
                <li key={x.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'violet' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] font-semibold text-dash-ink">{x.label}</p>
                    <p className="text-[11.5px] text-slate-500">{fmtDateTime(x.at)}{x.detail ? ` · ${x.detail}` : ''}</p>
                    {x.ref && <CopyText text={x.ref} className="mt-0.5 font-mono text-[10.5px] text-slate-400" />}
                  </div>
                  <span className="flex-shrink-0 pt-0.5 text-[13.5px] font-extrabold tabular-nums text-dash-ink">{ngn(x.amount)}</span>
                </li>
              )
            })}
          </ul>
        )}
        <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={10} onPage={pg.setPage} className="mt-2 border-t border-dash-line pt-3" />
      </Card>
    </div>
  )
}

// ── Sella AI ────────────────────────────────────────────────────────────────
function SellaView({ d }) {
  const s = d.sella
  const allowance = 1000
  const kinds = Object.entries(s.thisMonth.byKind || {}).sort((a, b) => b[1] - a[1])
  const kindMax = Math.max(1, ...kinds.map(([, v]) => v))
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e0b3a] via-[#2e1065] to-[#4c1d95] p-5 text-white sm:p-6">
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <p className="text-[12px] font-semibold text-violet-200">{monthLong(s.thisMonth.month)}</p>
            <p className="mt-1 font-display text-[34px] font-extrabold leading-none tabular-nums"><CountUp value={s.thisMonth.used} /></p>
            <p className="mt-1 text-[12px] text-violet-200/80">of {count(allowance)} monthly credits</p>
            <Meter value={s.thisMonth.used} of={allowance} tone="bg-violet-300" className="mt-3 h-2 bg-white/10" />
          </div>
          {[['Requests this month', count(s.thisMonth.requests)], ['All-time credits', count(s.allTime.used)]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10"><p className="text-[11.5px] text-violet-200/80">{l}</p><p className="mt-1 text-[20px] font-bold tabular-nums">{v}</p></div>
          ))}
        </div>
        <p className="relative mt-3 text-[11.5px] text-violet-200/70">{count(s.allTime.requests)} requests all time, real AI cost ${s.allTime.costUsd.toFixed(2)}. {s.topupLeft > 0 ? `${count(s.topupLeft)} bought credits left.` : 'No bought credits left.'}</p>
      </section>
      {s.months.length === 0 ? <Empty icon={<Bot size={22} />} title="They have not used Sella yet" /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card icon={<Bot size={16} className="text-violet-600" />} heading="Credits by month">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.months.slice(-12)} margin={{ top: 6, right: 4, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#f1eefb" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} contentStyle={TIP} labelFormatter={monthLong} formatter={(v, n, item) => [`${count(v)} credits, ${count(item.payload.requests)} requests`, 'Used']} />
                  <Bar dataKey="used" fill="#7c3aed" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card heading="This month, by feature">
            {kinds.length === 0 ? <p className="text-[12.5px] text-slate-500">Nothing used this month.</p> : (
              <ul className="space-y-2.5">{kinds.map(([k, v]) => (
                <li key={k}><div className="flex justify-between text-[12.5px]"><span className="font-semibold text-dash-ink">{title(k)}</span><span className="tabular-nums text-slate-500">{count(v)}</span></div><Meter value={v} of={kindMax} tone="bg-violet-500" className="mt-1 h-1.5" /></li>
              ))}</ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Referrals ───────────────────────────────────────────────────────────────
function Referrals({ d }) {
  const r = d.referral
  const pg = useClientPages(r.referred, 8)
  return (
    <div className="space-y-4">
      <Card icon={<Link2 size={16} className="text-forest-600" />} heading="Where they came from">
        {r.referredBy ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50/70 p-3.5 ring-1 ring-violet-100">
            <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${avatarTone(r.referredBy.id)}`}>{initials(r.referredBy.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-violet-700">Referred by</p>
              <p className="truncate text-[14px] font-bold text-dash-ink">{r.referredBy.name}</p>
              <p className="text-[11.5px] text-slate-500">{r.referredBy.slug ? `/${r.referredBy.slug}` : ''}</p>
            </div>
            {r.referredBy.code && <Pill tone="violet">Code {r.referredBy.code}</Pill>}
            {r.referredBy.slug && <a href={storeUrl(r.referredBy.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet-700 hover:underline">Open <ExternalLink size={12} /></a>}
          </div>
        ) : <p className="text-[13px] text-dash-ink">Signed up directly{r.heardAbout ? '' : ', no referral code.'}</p>}
        {r.heardAbout && <p className="mt-3 text-[12.5px] text-slate-600"><span className="font-semibold text-dash-ink">How they heard about us:</span> {heardLabel(r.heardAbout)}</p>}
      </Card>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile icon={<Users size={14} />} label="Stores they brought" value={r.referred.length} />
        <Tile i={1} icon={<CreditCard size={14} />} label="Of those, paying" value={r.referredPaying} />
        <Tile i={2} icon={<Gift size={14} />} label="Rewards earned" value={r.earned / 100} money tone="text-pink-600" />
        <Tile i={3} icon={<Receipt size={14} />} label="Balance to withdraw" value={r.available / 100} money tone="text-pink-600" />
      </div>
      <Card heading="Stores they referred" sub={r.code ? `Their code: ${r.code}` : 'They have not made a referral code yet'}>
        {r.referred.length === 0 ? <p className="text-[12.5px] text-slate-500">Nobody has signed up with their code yet.</p> : (
          <ul className="divide-y divide-dash-line">
            {pg.rows.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2.5">
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(x.id)}`}>{initials(x.name)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-dash-ink">{x.name}</p><p className="text-[11.5px] text-slate-500">Joined {fmtDate(x.joinedAt)}</p></div>
                {x.paying ? <PlanPill plan={x.plan} /> : <Pill>Free</Pill>}
              </li>
            ))}
          </ul>
        )}
        <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={8} onPage={pg.setPage} className="mt-2" />
      </Card>
    </div>
  )
}

// ── the panel ───────────────────────────────────────────────────────────────
export default function MerchantProfile({ row, busy, onApprove, nonce = 0 }) {
  const [view, setView] = useState('overview')
  const { data, loading, error, reload } = useOpsData(`/api/admin-health?action=merchant&storeId=${encodeURIComponent(row.id)}${nonce ? `&fresh=1&n=${nonce}` : ''}`)
  const s = data?.store
  const name = s?.name || row.businessName || row.storeName || 'Store'
  const slug = s?.slug || row.storeName || ''
  const phone = s?.phone || row.whatsappNumber
  const email = s?.email || row.ownerEmail
  const wa = waLink(phone, `Hello ${name}, this is Sellapage.`)
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3.5">
        {s?.logoUrl ? <img src={s.logoUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover ring-1 ring-dash-line" />
          : <span className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-[20px] font-bold ${avatarTone(row.id)}`}>{initials(name)}</span>}
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-[21px] font-extrabold leading-tight text-dash-ink">{name}</p>
          <p className="truncate text-[12.5px] text-slate-500">/{slug}{s?.customDomain ? ` · ${s.customDomain}` : ''}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PlanPill plan={s?.plan || row.plan} />
            {s && (s.paidNow ? <Pill tone="green" dot>Paying</Pill> : s.planEnded ? <Pill tone="red">Plan ended</Pill> : null)}
            {(s?.cacVerified || row.cacVerified) && <Pill tone="green">CAC</Pill>}
            {data && <Presence p={data.presence} compact />}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-semibold text-white hover:bg-[#1fba5a]"><MessageCircle size={15} /> WhatsApp</a>}
        {email && <a href={`mailto:${email}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><Mail size={15} /> Email</a>}
        {slug && <a href={storeUrl(slug)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><ExternalLink size={15} /> Open store</a>}
        {s?.customDomain && <a href={`https://${s.customDomain}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><Globe size={15} /> Domain</a>}
      </div>

      <div className="sticky -top-4 z-10 -mx-5 border-b border-dash-line bg-white/95 px-5 py-2 backdrop-blur">
        <Segmented value={view} onChange={setView} className="max-w-full overflow-x-auto [scrollbar-width:none]" options={[
          { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
          { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
          { id: 'sales', label: 'Sales', icon: <ShoppingBag size={14} /> },
          { id: 'billing', label: 'Billing', icon: <Receipt size={14} /> },
          { id: 'sella', label: 'Sella AI', icon: <Bot size={14} /> },
          { id: 'referrals', label: 'Referrals', icon: <Gift size={14} /> },
        ]} />
      </div>

      {error && <Notice tone="error">{error} <button type="button" onClick={reload} className="ml-1 font-semibold underline">Try again</button></Notice>}
      {loading && !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[86px] animate-pulse rounded-2xl bg-slate-100" />)}</div>
          <div className="h-60 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : data ? (
        <div key={view} className="animate-in fade-in duration-300">
          {view === 'overview' && <Overview d={data} row={row} busy={busy} onApprove={onApprove} />}
          {view === 'activity' && <ActivityView d={data} />}
          {view === 'sales' && <Sales d={data} />}
          {view === 'billing' && <Billing d={data} />}
          {view === 'sella' && <SellaView d={data} />}
          {view === 'referrals' && <Referrals d={data} />}
          <p className="mt-4 text-center text-[11px] text-slate-400">Read {timeAgo(data.builtAt)}. Opening the same store again within a minute shows the same reading.</p>
        </div>
      ) : null}
    </div>
  )
}
