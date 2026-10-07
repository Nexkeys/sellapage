// src/ops/tabs/ReferralNetwork.jsx
//
// Referrals: who brings whom. A podium for the top three, the programme's
// money (earned, paid, waiting), which plans referred stores bought, and a
// ranked leaderboard that opens to show each referrer's stores
// (/api/admin-referrals stats + referrers; amounts are kobo).
import { useState } from 'react'
import { TrendingUp, Users, Wallet, Hourglass, ChevronDown, Trophy, Mail, MessageCircle } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { initials, avatarTone } from '../opsUi'
import { Pager, PlanPill, Pill, Empty, Notice, CountUp, nairaKobo, fmtDate, waLink } from './kit'

const PER_PAGE = 10
const MEDAL = [
  { ring: 'from-yellow-300 to-amber-500', text: 'text-amber-900', h: 'h-28', label: '1st' },
  { ring: 'from-slate-200 to-slate-400', text: 'text-slate-800', h: 'h-20', label: '2nd' },
  { ring: 'from-orange-300 to-orange-600', text: 'text-orange-950', h: 'h-14', label: '3rd' },
]

function Podium({ top }) {
  if (!top.length) return null
  // 2nd, 1st, 3rd from left to right, like a real podium.
  const order = [top[1], top[0], top[2]].map((r, i) => (r ? { r, m: MEDAL[[1, 0, 2][i]] } : null))
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {order.map((x, i) => (x ? (
        <div key={x.r.referrerId} className="flex w-28 flex-col items-center sm:w-36" style={{ animation: `rn-rise .7s ${0.15 * i}s both cubic-bezier(.2,.8,.2,1)` }}>
          <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-lg ${x.m.ring}`}>
            <span className={`flex h-full w-full items-center justify-center rounded-full bg-white text-[15px] font-extrabold ${avatarTone(x.r.referrerId)}`}>{initials(x.r.storeName)}</span>
          </span>
          <p className="mt-2 w-full truncate text-center text-[13px] font-bold text-white">{x.r.storeName}</p>
          <p className="text-[11.5px] text-green-100/80">{x.r.totalReferrals} referral{x.r.totalReferrals === 1 ? '' : 's'}</p>
          <div className={`mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b pt-2 ${x.m.ring} ${x.m.h}`}>
            <span className={`text-[12px] font-extrabold ${x.m.text}`}>{x.m.label}</span>
            <span className={`text-[12.5px] font-bold tabular-nums ${x.m.text}`}>{nairaKobo(x.r.totalEarned)}</span>
          </div>
        </div>
      ) : <div key={i} className="w-28 sm:w-36" />))}
      <style>{'@keyframes rn-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}'}</style>
    </div>
  )
}

function Row({ rf, rank }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-7 flex-shrink-0 text-center font-display text-[15px] font-extrabold tabular-nums text-slate-400">{rank}</span>
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${avatarTone(rf.referrerId)}`}>{initials(rf.storeName)}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-dash-ink">{rf.storeName}</span>{rf.referralCode && <Pill tone="violet">{rf.referralCode}</Pill>}</span>
            <span className="text-[12px] text-slate-500">{rf.totalReferrals} store{rf.totalReferrals === 1 ? '' : 's'} referred</span>
          </span>
        </span>
        <span className="grid grid-cols-4 gap-3 pl-10 text-right sm:w-[420px] sm:pl-0">
          {[['Earned', rf.totalEarned, 'text-dash-ink'], ['Balance', rf.availableBalance, 'text-emerald-700'], ['Waiting', rf.pendingPayoutAmount, 'text-amber-600'], ['Paid', rf.paidOutAmount, 'text-slate-600']].map(([l, v, c]) => (
            <span key={l}><span className="block text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">{l}</span><span className={`block text-[13px] font-bold tabular-nums ${c}`}>{nairaKobo(v)}</span></span>
          ))}
        </span>
        <ChevronDown size={16} className={`hidden flex-shrink-0 text-slate-400 transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-dash-line px-4 pb-4 pt-3 animate-in fade-in slide-in-from-top-1">
          <div className="mb-3 flex flex-wrap gap-2">
            {rf.whatsappNumber && <a href={waLink(rf.whatsappNumber, `Hello ${rf.storeName}, this is Sellapage. Thank you for bringing other stores to Sellapage!`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-[12px] font-semibold text-white"><MessageCircle size={13} /> Thank them on WhatsApp</a>}
            {rf.email && <a href={`mailto:${rf.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-[12px] font-semibold ring-1 ring-dash-line"><Mail size={13} /> {rf.email}</a>}
          </div>
          <ol className="relative space-y-2 border-l-2 border-forest-100 pl-4">
            {rf.referredVendors.map((v, i) => (
              <li key={i} className="relative flex items-center justify-between gap-3">
                <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-forest-600 ring-2 ring-white" />
                <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-dash-ink">{v.storeName}</span><span className="text-[11.5px] text-slate-500">{fmtDate(v.createdAt)}</span></span>
                <span className="flex flex-shrink-0 items-center gap-2"><PlanPill plan={v.plan} /><span className="text-[12.5px] font-bold tabular-nums text-emerald-700">{nairaKobo(v.rewardAmount)}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  )
}

export default function ReferralNetwork() {
  const [page, setPage] = useState(1)
  const stats = useOpsData('/api/admin-referrals?action=stats')
  // Page one is sorted by earnings, so it also feeds the podium: one read of
  // the referral records instead of two (each call reads all of them).
  const first = useOpsData(`/api/admin-referrals?action=referrers&page=1&limit=${PER_PAGE}`)
  const later = useOpsData(`/api/admin-referrals?action=referrers&page=${page}&limit=${PER_PAGE}`, { enabled: page > 1 })
  const list = page > 1 ? later : first
  const top = { data: first.data ? { referrers: (first.data.referrers || []).slice(0, 3) } : null, loading: first.loading }
  const s = stats.data?.stats
  const rows = list.data?.referrers || []
  const pages = Math.max(1, Math.ceil((list.data?.total || 0) / PER_PAGE))
  const plans = s?.planBreakdown || {}
  const planMax = Math.max(1, ...Object.values(plans))

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#023a19] via-[#075a2b] to-[#0b6b35] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-green-100"><Trophy size={16} className="text-amber-300" /> Top referrers</p>
          <p className="text-[12px] text-green-100/70">{list.data?.total ?? '-'} vendors have referred someone</p>
        </div>
        <div className="mt-6">{top.loading && !top.data ? <div className="h-48" /> : <Podium top={top.data?.referrers || []} />}</div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { icon: <Users size={17} />, label: 'Stores referred', v: s?.totalReferrals, money: false },
          { icon: <TrendingUp size={17} />, label: 'Rewards earned', v: s?.totalRewardsEarned, money: true },
          { icon: <Wallet size={17} />, label: 'Paid out', v: s?.totalPaidOut, money: true },
          { icon: <Hourglass size={17} />, label: 'Waiting to be paid', v: s?.totalPendingPayoutAmount, money: true, sub: s ? `${s.pendingWithdrawals} request${s.pendingWithdrawals === 1 ? '' : 's'}` : '' },
        ].map((t) => (
          <div key={t.label} className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-dash-muted"><span className="text-forest-600">{t.icon}</span>{t.label}</p>
            <p className="mt-2 font-display text-[21px] font-extrabold leading-none tabular-nums text-dash-ink sm:text-[26px]">{s ? <CountUp value={t.money ? (t.v || 0) / 100 : t.v || 0} format={(n) => (t.money ? `₦${Math.round(n).toLocaleString('en-NG')}` : Math.round(n).toLocaleString('en-NG'))} /> : '-'}</p>
            {t.sub && <p className="mt-1 text-[11.5px] text-slate-500">{t.sub}</p>}
          </div>
        ))}
      </section>

      {s && Object.keys(plans).length > 0 && (
        <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[14px] font-bold text-dash-ink">What referred stores bought</p>
          <div className="mt-4 flex items-end gap-6">
            {['growth', 'pro', 'premium'].map((p) => (
              <div key={p} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[13px] font-bold tabular-nums text-dash-ink">{plans[p] || 0}</span>
                <div className="flex h-28 w-full max-w-[120px] items-end"><div className={`w-full rounded-t-xl ${p === 'premium' ? 'bg-gradient-to-t from-amber-500 to-yellow-300' : p === 'pro' ? 'bg-gradient-to-t from-slate-900 to-slate-600' : 'bg-gradient-to-t from-forest-600 to-emerald-400'} transition-all duration-700`} style={{ height: `${Math.max(4, ((plans[p] || 0) / planMax) * 100)}%` }} /></div>
                <PlanPill plan={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Notice tone="error">{stats.error || list.error}</Notice>
      <section className="space-y-3">
        <p className="text-[14px] font-bold text-dash-ink">Leaderboard</p>
        {list.loading && !list.data ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
          : rows.length === 0 ? <Empty icon={<Trophy size={22} />} title="No referrals yet" sub="When a vendor's referral link brings a paying store, they show up here." />
            : <ul className="space-y-2.5">{rows.map((rf, i) => <Row key={rf.referrerId} rf={rf} rank={(page - 1) * PER_PAGE + i + 1} />)}</ul>}
        <Pager page={page} pages={pages} total={list.data?.total} perPage={PER_PAGE} onPage={setPage} />
      </section>
    </div>
  )
}
