// src/ops/tabs/ReferralNetwork.jsx
//
// Referrals: who brings whom. Every store that signed up with a referral code
// counts, free or paying (admin-referrals.js builds the network from each
// store's `referredBy`; rewards only exist once a referred store pays). A
// podium for the top three, the programme's numbers, a funnel from referred to
// paying, and a ranked, searchable leaderboard that opens to show each
// referrer's stores. Money amounts from the server are kobo.
import { useEffect, useState } from 'react'
import { TrendingUp, Users, Wallet, Hourglass, ChevronDown, Trophy, Mail, MessageCircle, CreditCard, Sprout, ArrowDownUp, ExternalLink } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { Pager, PlanPill, Pill, Empty, Notice, CountUp, Chips, SearchBox, useClientPages, useDebounced, nairaKobo, fmtDate, waLink, storeUrl } from './kit'

const PER_PAGE = 10
const MEDAL = [
  { ring: 'from-yellow-300 to-amber-500', text: 'text-amber-900', h: 'h-28', label: '1st' },
  { ring: 'from-slate-200 to-slate-400', text: 'text-slate-800', h: 'h-20', label: '2nd' },
  { ring: 'from-orange-300 to-orange-600', text: 'text-orange-950', h: 'h-14', label: '3rd' },
]
const SORTS = [['referred', 'Most stores referred'], ['paying', 'Most paying stores'], ['earned', 'Most earned'], ['recent', 'Newest referral']]

function Podium({ top }) {
  if (!top.length) return <p className="py-10 text-center text-[13px] text-green-100/80">Nobody has referred a store yet.</p>
  // 2nd, 1st, 3rd from left to right, like a real podium.
  const order = [top[1], top[0], top[2]].map((r, i) => (r ? { r, m: MEDAL[[1, 0, 2][i]] } : null))
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-6">
      {order.map((x, i) => (x ? (
        <div key={x.r.referrerId} className="flex w-[30%] max-w-[144px] flex-col items-center" style={{ animation: `rn-rise .7s ${0.15 * i}s both cubic-bezier(.2,.8,.2,1)` }}>
          <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-lg sm:h-14 sm:w-14 ${x.m.ring}`}>
            <span className={`flex h-full w-full items-center justify-center rounded-full bg-white text-[14px] font-extrabold ${avatarTone(x.r.referrerId)}`}>{initials(x.r.storeName)}</span>
          </span>
          <p className="mt-2 w-full truncate text-center text-[12.5px] font-bold text-white sm:text-[13px]">{x.r.storeName}</p>
          <p className="text-[11px] text-green-100/80">{x.r.totalReferrals} referred · {x.r.paying} paying</p>
          <div className={`mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b pt-2 ${x.m.ring} ${x.m.h}`}>
            <span className={`text-[12px] font-extrabold ${x.m.text}`}>{x.m.label}</span>
            <span className={`text-[11.5px] font-bold tabular-nums ${x.m.text}`}>{nairaKobo(x.r.totalEarned)}</span>
          </div>
        </div>
      ) : <div key={i} className="w-[30%] max-w-[144px]" />))}
      <style>{'@keyframes rn-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}'}</style>
    </div>
  )
}

function Funnel({ s }) {
  const steps = [
    ['Signed up with a code', s.totalReferrals, 'bg-forest-600'],
    ['Paid at least once', s.referredEverPaid, 'bg-emerald-400'],
    ['Paying right now', s.referredPaying, 'bg-amber-400'],
  ]
  const top = Math.max(1, s.totalReferrals)
  return (
    <ul className="space-y-3">
      {steps.map(([l, v, c], i) => (
        <li key={l}>
          <div className="flex items-baseline justify-between gap-2 text-[12.5px]"><span className="font-semibold text-dash-ink">{l}</span><span className="tabular-nums text-slate-500"><strong className="text-dash-ink">{Number(v || 0).toLocaleString()}</strong>{i > 0 ? ` · ${Math.round(((v || 0) / top) * 100)}%` : ''}</span></div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c} transition-all duration-1000`} style={{ width: `${Math.max(2, ((v || 0) / top) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

function Referred({ list }) {
  const pg = useClientPages(list, 8)
  return (
    <>
      <ol className="relative space-y-2.5 border-l-2 border-forest-100 pl-4">
        {pg.rows.map((v) => (
          <li key={v.storeId} className="relative flex items-center justify-between gap-3">
            <span className={`absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${v.paying ? 'bg-forest-600' : 'bg-slate-300'}`} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-semibold text-dash-ink">{v.storeName}</span>{v.slug && <a href={storeUrl(v.slug)} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-forest-600" aria-label={`Open ${v.storeName}`}><ExternalLink size={12} /></a>}</span>
              <span className="text-[11.5px] text-slate-500">Joined {fmtDate(v.createdAt)}{v.everPaid && !v.paying ? ' · paid before, plan ended' : ''}</span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">{v.paying ? <PlanPill plan={v.plan} /> : <Pill>Free</Pill>}<span className={`w-16 text-right text-[12.5px] font-bold tabular-nums ${v.rewardAmount ? 'text-emerald-700' : 'text-slate-300'}`}>{nairaKobo(v.rewardAmount)}</span></span>
          </li>
        ))}
      </ol>
      <Pager page={pg.page} pages={pg.pages} onPage={pg.setPage} className="mt-3" />
    </>
  )
}

function Row({ rf, rank }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-col gap-3 p-4 text-left lg:flex-row lg:items-center">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-6 flex-shrink-0 text-center font-display text-[15px] font-extrabold tabular-nums text-slate-400">{rank}</span>
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${avatarTone(rf.referrerId)}`}>{initials(rf.storeName)}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5"><span className="truncate text-[14px] font-semibold text-dash-ink">{rf.storeName}</span>{rf.referralCode && <Pill tone="violet">{rf.referralCode}</Pill>}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
              <span className="flex h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-slate-100"><span className="h-full bg-forest-600" style={{ width: `${(rf.paying / Math.max(1, rf.totalReferrals)) * 100}%` }} /></span>
              <span>{rf.totalReferrals} referred · <span className="font-semibold text-forest-700">{rf.paying} paying</span> · {rf.free} free</span>
            </span>
          </span>
          <ChevronDown size={16} className={`flex-shrink-0 text-slate-400 transition lg:hidden ${open ? 'rotate-180' : ''}`} />
        </span>
        <span className="grid grid-cols-4 gap-2 pl-9 text-right lg:w-[420px] lg:pl-0">
          {[['Earned', rf.totalEarned, 'text-dash-ink'], ['Balance', rf.availableBalance, 'text-emerald-700'], ['Waiting', rf.pendingPayoutAmount, 'text-amber-600'], ['Paid', rf.paidOutAmount, 'text-slate-600']].map(([l, v, c]) => (
            <span key={l} className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{l}</span><span className={`block truncate text-[12.5px] font-bold tabular-nums sm:text-[13px] ${c}`}>{nairaKobo(v)}</span></span>
          ))}
        </span>
        <ChevronDown size={16} className={`hidden flex-shrink-0 text-slate-400 transition lg:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-dash-line px-4 pb-4 pt-3 animate-in fade-in slide-in-from-top-1">
          <div className="mb-3 flex flex-wrap gap-2">
            {rf.whatsappNumber && <a href={waLink(rf.whatsappNumber, `Hello ${rf.storeName}, this is Sellapage. Thank you for bringing other stores to Sellapage!`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-[12px] font-semibold text-white"><MessageCircle size={13} /> Thank them on WhatsApp</a>}
            {rf.email && <a href={`mailto:${rf.email}`} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-xl bg-white px-3 text-[12px] font-semibold ring-1 ring-dash-line"><Mail size={13} className="flex-shrink-0" /> <span className="truncate">{rf.email}</span></a>}
          </div>
          {rf.referredVendors.length ? <Referred list={rf.referredVendors} /> : <p className="text-[12.5px] text-slate-500">The stores behind these rewards no longer exist.</p>}
        </div>
      )}
    </li>
  )
}

export default function ReferralNetwork() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [show, setShow] = useState('all')
  const [sort, setSort] = useState('referred')
  const search = useDebounced(q, 350)
  useEffect(() => { setPage(1) }, [search, show, sort])
  const stats = useOpsData('/api/admin-referrals?action=stats')
  const top = useOpsData('/api/admin-referrals?action=referrers&page=1&limit=3&sort=referred')
  const list = useOpsData(`/api/admin-referrals?action=referrers&page=${page}&limit=${PER_PAGE}&sort=${sort}&show=${show}&search=${encodeURIComponent(search)}`)
  const s = stats.data?.stats
  const rows = list.data?.referrers || []
  const pages = Math.max(1, Math.ceil((list.data?.total || 0) / PER_PAGE))
  const plans = s?.planBreakdown || {}
  const planMax = Math.max(1, ...Object.values(plans))
  const money = (v) => `₦${Math.round(v).toLocaleString('en-NG')}`

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#023a19] via-[#075a2b] to-[#0b6b35] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-green-100"><Trophy size={16} className="text-amber-300" /> Top referrers</p>
          <p className="text-[12px] text-green-100/70">{s ? `${s.referrers} vendor${s.referrers === 1 ? ' has' : 's have'} brought ${s.totalReferrals} store${s.totalReferrals === 1 ? '' : 's'}` : '...'}</p>
        </div>
        <div className="mt-6">{top.loading && !top.data ? <div className="h-48" /> : <Podium top={top.data?.referrers || []} />}</div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: <Users size={17} />, label: 'Stores referred', v: s?.totalReferrals, sub: 'free and paying' },
          { icon: <CreditCard size={17} />, label: 'Paying now', v: s?.referredPaying, sub: s ? `${s.conversionRate}% have paid at least once` : '' },
          { icon: <Sprout size={17} />, label: 'Still on free', v: s?.referredFree, sub: 'room to convert' },
          { icon: <TrendingUp size={17} />, label: 'Rewards earned', v: (s?.totalRewardsEarned || 0) / 100, m: true, sub: s ? `${money((s.totalPaidOut || 0) / 100)} paid out` : '' },
        ].map((t, i) => (
          <div key={t.label} className="min-w-0 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="flex items-center gap-2 text-[12px] font-semibold text-dash-muted"><span className="text-forest-600">{t.icon}</span><span className="truncate">{t.label}</span></p>
            <p className="mt-2 font-display text-[22px] font-extrabold leading-none tabular-nums text-dash-ink sm:text-[26px]">{s ? <CountUp value={t.v || 0} format={(n) => (t.m ? money(n) : Math.round(n).toLocaleString('en-NG'))} /> : '-'}</p>
            {t.sub && <p className="mt-1 truncate text-[11.5px] text-slate-500">{t.sub}</p>}
          </div>
        ))}
      </section>

      {s && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-[14px] font-bold text-dash-ink">From referred to paying</p>
            <p className="mb-4 mt-0.5 text-[12px] text-dash-muted">Every store that used a referral code</p>
            <Funnel s={s} />
            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-slate-500"><Hourglass size={13} className="text-amber-500" />{money((s.totalPendingPayoutAmount || 0) / 100)} waiting to be paid out in {s.pendingWithdrawals} request{s.pendingWithdrawals === 1 ? '' : 's'}. <Wallet size={13} className="ml-1 text-forest-600" />{money((s.totalPaidOut || 0) / 100)} paid.</p>
          </section>
          <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-[14px] font-bold text-dash-ink">What referred stores pay for now</p>
            <p className="mt-0.5 text-[12px] text-dash-muted">{s.referredFree} of {s.totalReferrals} are still on the free plan</p>
            <div className="mt-4 flex items-end gap-4 sm:gap-6">
              {[['starter', s.referredFree], ['growth', plans.growth], ['pro', plans.pro], ['premium', plans.premium]].map(([p, n]) => (
                <div key={p} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[13px] font-bold tabular-nums text-dash-ink">{n || 0}</span>
                  <div className="flex h-28 w-full max-w-[100px] items-end"><div className={`w-full rounded-t-xl ${p === 'premium' ? 'bg-gradient-to-t from-amber-500 to-yellow-300' : p === 'pro' ? 'bg-gradient-to-t from-slate-900 to-slate-600' : p === 'growth' ? 'bg-gradient-to-t from-forest-600 to-emerald-400' : 'bg-gradient-to-t from-slate-300 to-slate-200'} transition-all duration-700`} style={{ height: `${Math.max(4, ((n || 0) / Math.max(planMax, s.referredFree || 1)) * 100)}%` }} /></div>
                  {p === 'starter' ? <Pill>Free</Pill> : <PlanPill plan={p} />}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Notice tone="error">{stats.error || list.error}</Notice>
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <p className="text-[14px] font-bold text-dash-ink lg:mr-2">Leaderboard</p>
          <SearchBox value={q} onChange={setQ} placeholder="Store, code or email" busy={list.loading} className="lg:w-72" />
          <Chips value={show} onChange={setShow} options={[{ id: 'all', label: 'Everyone' }, { id: 'paying', label: 'Has paying stores' }, { id: 'free_only', label: 'Only free so far' }]} />
          <label className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white pl-3.5 pr-2 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line lg:ml-auto">
            <ArrowDownUp size={15} className="text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-full min-w-0 cursor-pointer bg-transparent pr-1 outline-none" aria-label="Sort referrers">{SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
          </label>
        </div>
        {list.loading && !list.data ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
          : rows.length === 0 ? <Empty icon={<Trophy size={22} />} title={search || show !== 'all' ? 'Nobody matches that' : 'No referrals yet'} sub="When a store signs up with a vendor's referral code, that vendor shows up here, whether the new store pays or not." />
            : <ul className="space-y-2.5">{rows.map((rf, i) => <Row key={rf.referrerId} rf={rf} rank={(page - 1) * PER_PAGE + i + 1} />)}</ul>}
        <Pager page={page} pages={pages} total={list.data?.total} perPage={PER_PAGE} onPage={setPage} />
      </section>
    </div>
  )
}
