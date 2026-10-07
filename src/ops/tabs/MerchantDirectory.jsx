// src/ops/tabs/MerchantDirectory.jsx
//
// Merchants: every store, searchable by name, link, email or phone, with
// filters (plan, where they came from, when they joined, payout account, what
// they sell, CAC) and sorting, all applied on the server
// (/api/admin-health?action=directory, which pages there too). A table on a
// wide screen, cards on a phone. A row opens the merchant panel
// (MerchantProfile.jsx): activity, sales, billing, Sella and referrals.
import { useEffect, useMemo, useState } from 'react'
import { Store, Users, Package, Wrench, CalendarDays, Gift, ShieldQuestion, SlidersHorizontal, X, ArrowDownUp, BadgeCheck } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { HEARD_ABOUT_SOURCES } from '../../utils/heardAbout'
import { Chips, Pager, SearchBox, PlanPill, Pill, Empty, Notice, Btn, Drawer, useDebounced, useConfirm, fmtDate, timeAgo } from './kit'
import MerchantProfile from './MerchantProfile'

const PER_PAGE = 15

const FILTERS = [
  { key: 'plan', label: 'Plan', options: [['', 'Any plan'], ['paid', 'Paying now'], ['free', 'Free'], ['growth', 'Growth'], ['pro', 'Pro'], ['premium', 'Premium'], ['ended', 'Paid plan ended']] },
  { key: 'source', label: 'Came from', options: [['', 'Anywhere'], ['referred', 'A referral code'], ['direct', 'No referral code'], ...HEARD_ABOUT_SOURCES.filter((s) => s.id !== 'merchant_referral').map((s) => [s.id, s.label])] },
  { key: 'joined', label: 'Joined', options: [['', 'Any time'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']] },
  { key: 'payoutFilter', label: 'Payout account', options: [['', 'Any'], ['unverified', 'To verify'], ['verified', 'Verified'], ['none', 'Not set up']] },
  { key: 'kind', label: 'Sells', options: [['', 'Anything'], ['products', 'Products'], ['services', 'Services']] },
  { key: 'cac', label: 'CAC', options: [['', 'Any'], ['yes', 'CAC verified']] },
]
const SORTS = [['', 'Newest first'], ['oldest', 'Oldest first'], ['name', 'Name, A to Z'], ['plan_end', 'Paid plan ending soonest']]
const NONE = { plan: '', source: '', joined: '', payoutFilter: '', kind: '', cac: '' }

function PayoutState({ s }) {
  if (!s.subaccountCode) return <span className="text-[12px] text-slate-400">Not set up</span>
  return s.payoutsVerified ? <Pill tone="green" dot>Verified</Pill> : <Pill tone="amber" dot>To verify</Pill>
}

function Listings({ s }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] tabular-nums text-slate-600">
      <span className="inline-flex items-center gap-1"><Package size={13} className="text-slate-400" />{s.listings?.products ?? 0}</span>
      <span className="inline-flex items-center gap-1"><Wrench size={13} className="text-slate-400" />{s.listings?.services ?? 0}</span>
    </span>
  )
}

const heard = (id) => HEARD_ABOUT_SOURCES.find((x) => x.id === id)?.label || ''
function Source({ s }) {
  if (s.referredBy) return <span className="flex flex-col items-start gap-0.5"><Pill tone="violet">{s.referredByReferralCode || 'Referral'}</Pill>{s.referredByStoreName && <span className="max-w-[140px] truncate text-[10.5px] text-slate-500">by {s.referredByStoreName}</span>}</span>
  return <span className="text-[12px] text-slate-500">{heard(s.heardAboutSource) || 'Direct'}</span>
}

// storeName is the store's link (slug); businessName is what people call it.
const nameOf = (s) => s.businessName || s.storeName || s.handle || 'Unnamed store'
const linkOf = (s) => s.storeName || s.handle || ''

function Avatar({ s, size = 40 }) {
  return (
    <span className="relative flex-shrink-0">
      <span className={`flex items-center justify-center rounded-2xl font-bold ${avatarTone(s.id)}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(nameOf(s))}</span>
      {s.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />}
    </span>
  )
}

function LastSeen({ s }) {
  if (s.online) return <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Online</span>
  return <span className="text-[12px] text-slate-500">{s.lastActiveAt ? timeAgo(s.lastActiveAt) : 'Never'}</span>
}

export default function MerchantDirectory({ notify }) {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(NONE)
  const [sort, setSort] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const query = useDebounced(q, 400)
  const active = Object.entries(filters).filter(([, v]) => v)
  const filterKey = JSON.stringify(filters) + sort
  useEffect(() => { setPage(1) }, [query, filterKey])
  const params = useMemo(() => {
    const p = new URLSearchParams({ action: 'directory', page: String(page), limit: String(PER_PAGE), search: query })
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
    if (sort) p.set('sort', sort)
    if (nonce) { p.set('fresh', '1'); p.set('n', String(nonce)) }
    return p.toString()
  }, [page, query, filters, sort, nonce])
  const { data, loading, error: loadError } = useOpsData(`/api/admin-health?${params}`)
  const stores = data?.stores || []
  const meta = data?.meta
  const setFilter = (key, v) => setFilters((f) => ({ ...f, [key]: v }))
  const labelOf = (key, v) => FILTERS.find((f) => f.key === key)?.options.find(([id]) => id === v)?.[1] || v

  const approve = async (s) => {
    const { ok } = await confirm({
      title: `Approve ${nameOf(s)}'s payout account?`, icon: <BadgeCheck size={20} />, confirmLabel: 'Approve',
      body: <>{s.payoutBankName || 'Their bank'} {s.payoutAccountNumberMasked || ''}. Approve only when the account name matches the business or the owner.</>,
      checklist: ['The account name matches this store or its owner.'],
    })
    if (!ok) return
    setBusy(true); setError('')
    const res = await opsJson('/api/admin-health?action=verify_payout', { method: 'POST', body: { storeId: s.id, verified: true } })
    setBusy(false)
    if (!res.ok) { setError(res.data.message || res.data.error || 'Could not approve it.'); return }
    notify?.(`${nameOf(s)}'s payout account is approved.`)
    setOpen({ ...s, payoutsVerified: true })
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBox value={q} onChange={setQ} placeholder="Search by store name, link, email or phone" busy={loading} className="lg:max-w-xl lg:flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-[13px] font-semibold ring-1 transition ${showFilters || active.length ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-dash-ink ring-dash-line hover:bg-slate-50'}`}>
            <SlidersHorizontal size={15} /> Filters{active.length > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[11px] tabular-nums">{active.length}</span>}
          </button>
          <label className="relative inline-flex h-11 items-center gap-2 rounded-2xl bg-white pl-3.5 pr-2 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line">
            <ArrowDownUp size={15} className="text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-full cursor-pointer appearance-none bg-transparent pr-2 outline-none" aria-label="Sort merchants">
              {SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </label>
        </div>
        <p className="text-[12.5px] text-dash-muted lg:ml-auto"><Users size={13} className="mr-1 inline" />{meta ? `${meta.totalResults.toLocaleString()} merchant${meta.totalResults === 1 ? '' : 's'}` : '...'}</p>
      </div>

      {showFilters && (
        <section className="grid grid-cols-1 gap-4 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] animate-in fade-in slide-in-from-top-1 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
          {FILTERS.map((f) => (
            <div key={f.key} className="min-w-0">
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{f.label}</p>
              <Chips size="sm" value={filters[f.key]} onChange={(v) => setFilter(f.key, v)} options={f.options.map(([id, label]) => ({ id, label }))} className="flex-wrap" />
            </div>
          ))}
          <div className="flex items-end justify-end gap-2 sm:col-span-2 xl:col-span-3">
            {active.length > 0 && <Btn size="sm" tone="ghost" onClick={() => setFilters(NONE)}>Clear all</Btn>}
            <Btn size="sm" tone="soft" onClick={() => setShowFilters(false)}>Done</Btn>
          </div>
        </section>
      )}
      {!showFilters && active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map(([k, v]) => (
            <button key={k} type="button" onClick={() => setFilter(k, '')} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-[12px] font-semibold text-forest-700 ring-1 ring-forest-100 hover:bg-forest-100">
              {FILTERS.find((f) => f.key === k)?.label}: {labelOf(k, v)} <X size={12} />
            </button>
          ))}
          <button type="button" onClick={() => setFilters(NONE)} className="px-2 text-[12px] font-semibold text-slate-500 hover:text-dash-ink">Clear</button>
        </div>
      )}
      <Notice tone="error" onClose={() => setError('')}>{error || loadError}</Notice>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-dash-line" />)}</div>
      ) : stores.length === 0 ? (
        <Empty icon={<Store size={22} />} title={query || active.length ? 'No merchant matches that' : 'No merchants here'} sub={query ? 'Try part of the store name, the link, an email or the last digits of a phone number.' : 'Loosen a filter.'} action={active.length ? <Btn size="sm" tone="soft" onClick={() => setFilters(NONE)}>Clear filters</Btn> : null} />
      ) : (
        <>
          {/* wide screens: a table */}
          <div className="hidden overflow-x-auto rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
            <table className="w-full min-w-[940px] text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <tr><th className="px-5 py-3">Merchant</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Listings</th><th className="px-3 py-3">Leads</th><th className="px-3 py-3">Came from</th><th className="px-3 py-3">Last seen</th><th className="px-3 py-3">Joined</th><th className="px-5 py-3">Payout</th></tr>
              </thead>
              <tbody className="divide-y divide-dash-line">
                {stores.map((s, i) => (
                  <tr key={s.id} onClick={() => setOpen(s)} style={{ animationDelay: `${i * 20}ms` }} className="cursor-pointer transition animate-in fade-in fill-mode-both hover:bg-forest-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar s={s} size={36} />
                        <div className="min-w-0"><p className="max-w-[260px] truncate text-[13.5px] font-semibold text-dash-ink">{nameOf(s)}</p><p className="max-w-[260px] truncate text-[11.5px] text-slate-400">/{linkOf(s)} {s.whatsappNumber ? `· ${s.whatsappNumber}` : ''}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><PlanPill plan={s.plan} />{s.isPlanExpired && <span className="text-[10.5px] font-semibold text-red-500">Ended</span>}</div></td>
                    <td className="px-3 py-3"><Listings s={s} /></td>
                    <td className="px-3 py-3 text-[13px] tabular-nums text-slate-600">{s.leadCount ?? 0}</td>
                    <td className="px-3 py-3"><Source s={s} /></td>
                    <td className="px-3 py-3"><LastSeen s={s} /></td>
                    <td className="px-3 py-3 text-[12.5px] text-slate-500">{fmtDate(s.createdAt)}</td>
                    <td className="px-5 py-3"><PayoutState s={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* phones: cards */}
          <div className="grid grid-cols-1 gap-2.5 lg:hidden">
            {stores.map((s) => (
              <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex items-center gap-3 rounded-2xl border border-dash-line bg-white p-3.5 text-left active:bg-slate-50">
                <Avatar s={s} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-dash-ink">{nameOf(s)}</span><PlanPill plan={s.plan} /></span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500"><Listings s={s} /><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{fmtDate(s.createdAt)}</span>{s.referredBy && <span className="inline-flex items-center gap-1 text-violet-600"><Gift size={12} />{s.referredByReferralCode || 'Referred'}</span>}<LastSeen s={s} /></span>
                </span>
                {s.subaccountCode && !s.payoutsVerified && <ShieldQuestion size={18} className="flex-shrink-0 text-amber-500" aria-label="Payout to verify" />}
              </button>
            ))}
          </div>
          <Pager page={meta?.currentPage || page} pages={meta?.totalPages || 1} total={meta?.totalResults} perPage={PER_PAGE} onPage={setPage} />
        </>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} wide="xl" title="Merchant" sub={open ? `Joined ${fmtDate(open.createdAt)}` : ''}>
        {open && <MerchantProfile key={open.id} row={open} busy={busy} onApprove={approve} nonce={nonce} />}
      </Drawer>
      {confirmUi}
    </div>
  )
}
