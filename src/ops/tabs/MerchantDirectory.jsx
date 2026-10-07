// src/ops/tabs/MerchantDirectory.jsx
//
// Merchants: every store, searchable by name, link, email or phone
// (/api/admin-health?action=directory, which pages on the server). A table on
// a wide screen, cards on a phone, and a side panel per store with contact
// links, plan dates, where it came from, and payout-account approval.
import { useEffect, useState } from 'react'
import { Store, Users, MessageCircle, Mail, ExternalLink, BadgeCheck, ShieldQuestion, Package, Wrench, Inbox, CalendarDays, Gift } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Chips, Pager, SearchBox, PlanPill, Pill, Empty, Notice, Btn, Drawer, Field, useDebounced, useConfirm, fmtDate, waLink, storeUrl } from './kit'

const PER_PAGE = 15

function PayoutState({ s }) {
  if (!s.subaccountCode) return <span className="text-[12px] text-slate-400">Not set up</span>
  return s.payoutsVerified ? <Pill tone="green" dot>Verified</Pill> : <Pill tone="amber" dot>To verify</Pill>
}

function Listings({ s }) {
  const p = s.listings?.products ?? 0
  const v = s.listings?.services ?? 0
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] tabular-nums text-slate-600">
      <span className="inline-flex items-center gap-1"><Package size={13} className="text-slate-400" />{p}</span>
      <span className="inline-flex items-center gap-1"><Wrench size={13} className="text-slate-400" />{v}</span>
    </span>
  )
}

function Source({ s }) {
  if (!s.referredBy) return <span className="text-[12px] text-slate-400">Direct</span>
  return <Pill tone="violet">{s.referredByReferralCode || s.referredByStoreName || 'Referred'}</Pill>
}

// storeName is the store's link (slug); businessName is what people call it.
const nameOf = (s) => s.businessName || s.storeName || s.handle || 'Unnamed store'
const linkOf = (s) => s.storeName || s.handle || ''

function Avatar({ s, size = 40 }) {
  const name = nameOf(s)
  return <span className={`flex flex-shrink-0 items-center justify-center rounded-2xl font-bold ${avatarTone(s.id)}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(name)}</span>
}

function Detail({ s, onApprove, busy }) {
  const wa = waLink(s.whatsappNumber, `Hello ${nameOf(s)}, this is Sellapage.`)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar s={s} size={56} />
        <div className="min-w-0">
          <p className="truncate font-display text-[20px] font-extrabold text-dash-ink">{nameOf(s)}</p>
          <p className="text-[12.5px] text-slate-500">/{linkOf(s)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5"><PlanPill plan={s.plan} />{s.isPlanExpired && <Pill tone="red">Plan ended</Pill>}{s.cacVerified && <Pill tone="green">CAC</Pill>}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-semibold text-white hover:bg-[#1fba5a]"><MessageCircle size={15} /> WhatsApp</a>}
        {s.ownerEmail && <a href={`mailto:${s.ownerEmail}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><Mail size={15} /> Email</a>}
        {linkOf(s) && <a href={storeUrl(linkOf(s))} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line hover:bg-slate-50"><ExternalLink size={15} /> Open store</a>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Products', s.listings?.products ?? 0, Package], ['Services', s.listings?.services ?? 0, Wrench], ['Leads', s.leadCount ?? 0, Inbox]].map(([l, v, I]) => (
          <div key={l} className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-100"><I size={15} className="mx-auto text-slate-400" /><p className="mt-1 font-display text-[20px] font-extrabold tabular-nums text-dash-ink">{v}</p><p className="text-[11px] text-slate-500">{l}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email">{s.ownerEmail}</Field>
        <Field label="WhatsApp">{s.whatsappNumber}</Field>
        <Field label="Joined">{fmtDate(s.createdAt)}</Field>
        <Field label="Plan ends">{s.planEndDate ? fmtDate(s.planEndDate) : s.plan === 'starter' ? 'Free plan' : 'No end date'}</Field>
        <Field label="Plan started">{s.planStartDate ? fmtDate(s.planStartDate) : null}</Field>
        <Field label="Came from">{s.referredBy ? `${s.referredByStoreName || 'A merchant'}${s.referredByReferralCode ? ` (${s.referredByReferralCode})` : ''}` : 'Signed up directly'}</Field>
      </div>
      <section className="rounded-2xl border border-dash-line p-4">
        <p className="flex items-center gap-2 text-[13px] font-bold text-dash-ink"><BadgeCheck size={16} className="text-forest-600" /> Payout account</p>
        {!s.subaccountCode ? <p className="mt-1.5 text-[12.5px] text-slate-500">They have not added a bank account for sales yet.</p> : (
          <>
            <p className="mt-1.5 text-[13px] text-slate-600">{s.payoutBankName || 'Bank'} {s.payoutAccountNumberMasked ? `· ${s.payoutAccountNumberMasked}` : ''}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <PayoutState s={s} />
              {!s.payoutsVerified && <Btn size="sm" icon={<BadgeCheck size={14} />} busy={busy} onClick={() => onApprove(s)}>Approve account</Btn>}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default function MerchantDirectory({ notify }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const query = useDebounced(q, 400)
  useEffect(() => { setPage(1) }, [query, filter])
  const { data, loading, error: loadError } = useOpsData(`/api/admin-health?action=directory&page=${page}&limit=${PER_PAGE}&search=${encodeURIComponent(query)}&payoutFilter=${filter}${nonce ? `&fresh=1&n=${nonce}` : ''}`)
  const stores = data?.stores || []
  const meta = data?.meta

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
        <Chips value={filter} onChange={setFilter} options={[{ id: 'all', label: 'Every merchant' }, { id: 'unverified', label: 'Payout to verify', dot: 'bg-amber-500' }]} />
        <p className="text-[12.5px] text-dash-muted lg:ml-auto"><Users size={13} className="mr-1 inline" />{meta ? `${meta.totalResults.toLocaleString()} merchant${meta.totalResults === 1 ? '' : 's'}` : '...'}</p>
      </div>
      <Notice tone="error" onClose={() => setError('')}>{error || loadError}</Notice>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-dash-line" />)}</div>
      ) : stores.length === 0 ? (
        <Empty icon={<Store size={22} />} title={query ? 'No merchant matches that' : 'No merchants here'} sub={query ? 'Try part of the store name, the link, an email or the last digits of a phone number.' : 'Pick another filter.'} />
      ) : (
        <>
          {/* wide screens: a table */}
          <div className="hidden overflow-hidden rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <tr><th className="px-5 py-3">Merchant</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Listings</th><th className="px-3 py-3">Leads</th><th className="px-3 py-3">Came from</th><th className="px-3 py-3">Joined</th><th className="px-5 py-3">Payout</th></tr>
              </thead>
              <tbody className="divide-y divide-dash-line">
                {stores.map((s) => (
                  <tr key={s.id} onClick={() => setOpen(s)} className="cursor-pointer transition hover:bg-forest-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar s={s} size={36} />
                        <div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-dash-ink">{nameOf(s)}</p><p className="truncate text-[11.5px] text-slate-400">/{linkOf(s)} {s.whatsappNumber ? `· ${s.whatsappNumber}` : ''}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><PlanPill plan={s.plan} />{s.isPlanExpired && <span className="text-[10.5px] font-semibold text-red-500">Ended</span>}</div></td>
                    <td className="px-3 py-3"><Listings s={s} /></td>
                    <td className="px-3 py-3 text-[13px] tabular-nums text-slate-600">{s.leadCount ?? 0}</td>
                    <td className="px-3 py-3"><Source s={s} /></td>
                    <td className="px-3 py-3 text-[12.5px] text-slate-500">{fmtDate(s.createdAt)}</td>
                    <td className="px-5 py-3"><PayoutState s={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* phones: cards */}
          <div className="grid gap-2.5 lg:hidden">
            {stores.map((s) => (
              <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex items-center gap-3 rounded-2xl border border-dash-line bg-white p-3.5 text-left active:bg-slate-50">
                <Avatar s={s} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-dash-ink">{nameOf(s)}</span><PlanPill plan={s.plan} /></span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500"><Listings s={s} /><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{fmtDate(s.createdAt)}</span>{s.referredBy && <span className="inline-flex items-center gap-1 text-violet-600"><Gift size={12} />Referred</span>}</span>
                </span>
                {s.subaccountCode && !s.payoutsVerified && <ShieldQuestion size={18} className="flex-shrink-0 text-amber-500" aria-label="Payout to verify" />}
              </button>
            ))}
          </div>
          <Pager page={meta?.currentPage || page} pages={meta?.totalPages || 1} total={meta?.totalResults} perPage={PER_PAGE} onPage={setPage} />
        </>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title="Merchant" sub={open ? `Joined ${fmtDate(open.createdAt)}` : ''}>
        {open && <Detail s={open} busy={busy} onApprove={approve} />}
      </Drawer>
      {confirmUi}
    </div>
  )
}
