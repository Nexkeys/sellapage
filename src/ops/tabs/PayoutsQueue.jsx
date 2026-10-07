// src/ops/tabs/PayoutsQueue.jsx
//
// Payouts: referral earnings vendors asked to withdraw, drawn as transfer
// slips so the person paying can copy the account number and name straight
// into their bank app. Marking one paid or rejecting it asks for the
// authenticator code (sudo mode); rejecting puts the money back on the
// vendor's referral balance (admin-referrals.js process-withdrawal).
import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, XCircle, Landmark, Hourglass, Wallet, ArrowDownToLine } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { Chips, Pager, Pill, Empty, Notice, Btn, CopyText, CountUp, SearchBox, useClientPages, useConfirm, timeAgo, fmtDateTime, toMs, nairaKobo } from './kit'

const TONE = { pending: 'amber', processing: 'amber', completed: 'green', rejected: 'red' }
const LABEL = { pending: 'Waiting', processing: 'Processing', completed: 'Paid', rejected: 'Rejected' }

function Slip({ w, busy, onPay, onReject }) {
  const waiting = w.status === 'pending' || w.status === 'processing'
  return (
    <article className="relative overflow-hidden rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className={`h-1.5 ${waiting ? 'bg-gradient-to-r from-amber-400 to-amber-300' : w.status === 'completed' ? 'bg-gradient-to-r from-forest-600 to-emerald-400' : 'bg-red-400'}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-dash-ink">{w.storeName || 'Unknown store'}</p>
            <p className="mt-0.5 text-[11.5px] text-slate-400" title={fmtDateTime(w.createdAt)}>Asked {timeAgo(w.createdAt)}</p>
          </div>
          <Pill tone={TONE[w.status] || 'slate'} dot>{LABEL[w.status] || w.status}</Pill>
        </div>
        <p className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-dash-ink tabular-nums">{nairaKobo(w.amount)}</p>

        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500"><Landmark size={13} /> {w.bankName || 'Bank not given'}</p>
          {/* Stacked, not side by side: a full Nigerian account name (three
              names) does not fit half a card, and a cut-off name is the one
              thing the person paying must be able to read. */}
          <div className="mt-2.5 space-y-2.5">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Account number</p>
              {w.bankAccount ? <CopyText text={w.bankAccount} className="mt-0.5 font-mono text-[16px] font-bold tracking-wider text-dash-ink" /> : <p className="mt-0.5 text-slate-400">-</p>}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Account name</p>
              {w.bankAccountName ? <CopyText wrap text={w.bankAccountName} className="mt-0.5 text-[13.5px] font-semibold leading-snug text-dash-ink" /> : <p className="mt-0.5 text-slate-400">-</p>}
            </div>
          </div>
        </div>

        {w.note && <p className="mt-3 rounded-2xl bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">Reason given: {w.note}</p>}
        {w.status === 'completed' && <p className="mt-3 text-[12px] text-emerald-700">Paid {timeAgo(w.paidAt || w.processedAt)}{w.emailSent ? ', vendor emailed' : ''}.</p>}

        {waiting && w.status === 'pending' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn icon={<CheckCircle2 size={15} />} busy={busy === `${w.id}:completed`} onClick={() => onPay(w)}>Mark as paid</Btn>
            <Btn tone="danger-soft" icon={<XCircle size={15} />} busy={busy === `${w.id}:rejected`} onClick={() => onReject(w)}>Reject</Btn>
          </div>
        )}
      </div>
    </article>
  )
}

export default function PayoutsQueue({ notify }) {
  const [filter, setFilter] = useState('pending')
  const [q, setQ] = useState('')
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirmUi, confirm] = useConfirm()
  // Everything once (the handler caps it at 200), filtered here, so the totals
  // above never change with the filter.
  const { data, loading, error: loadError } = useOpsData(`/api/admin-referrals?action=withdrawals&status=all&limit=200&n=${nonce}`)
  const all = useMemo(() => data?.withdrawals || [], [data])
  const rows = useMemo(() => {
    const byStatus = filter === 'all' ? all : all.filter((w) => (filter === 'pending' ? w.status === 'pending' || w.status === 'processing' : w.status === filter))
    const needle = q.trim().toLowerCase()
    if (!needle) return byStatus
    const digits = needle.replace(/\D/g, '')
    return byStatus.filter((w) => [w.storeName, w.bankName, w.bankAccountName].some((v) => String(v || '').toLowerCase().includes(needle))
      || (digits.length >= 3 && String(w.bankAccount || '').includes(digits)))
  }, [all, filter, q])
  const pg = useClientPages(rows, 8)

  const sums = useMemo(() => {
    const s = { waiting: 0, waitingN: 0, paid: 0, paidN: 0, rejectedN: 0, oldest: 0, paidMonth: 0 }
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    for (const w of all) {
      if (w.status === 'pending' || w.status === 'processing') {
        s.waiting += Number(w.amount) || 0; s.waitingN += 1
        const t = toMs(w.createdAt); if (t && (!s.oldest || t < s.oldest)) s.oldest = t
      } else if (w.status === 'completed') {
        s.paid += Number(w.amount) || 0; s.paidN += 1
        if (toMs(w.paidAt || w.processedAt) >= monthStart.getTime()) s.paidMonth += Number(w.amount) || 0
      } else if (w.status === 'rejected') s.rejectedN += 1
    }
    return s
  }, [all])

  const act = async (w, status, note = '') => {
    setBusy(`${w.id}:${status}`); setError('')
    const res = await opsJson('/api/admin-referrals?action=process-withdrawal', { method: 'POST', body: { withdrawalId: w.id, status, note } })
    setBusy('')
    if (!res.ok) { setError(res.data.message || res.data.error || 'That did not go through.'); return }
    notify?.(status === 'completed' ? `${nairaKobo(w.amount)} marked as paid${res.data.emailSent ? ', vendor emailed' : ''}.` : `Rejected. ${nairaKobo(w.amount)} is back on their referral balance.`)
    setNonce((n) => n + 1)
  }
  const pay = async (w) => {
    const { ok } = await confirm({
      title: `Mark ${nairaKobo(w.amount)} as paid?`, icon: <Banknote size={20} />, confirmLabel: 'Yes, it is paid',
      body: <>Only after the transfer has left. {w.storeName || 'The vendor'} is emailed a payout confirmation.</>,
      checklist: [`I sent ${nairaKobo(w.amount)} to ${w.bankAccount || 'this account'} at ${w.bankName || 'their bank'}.`, `The name on the account matches: ${w.bankAccountName || 'not given'}.`],
    })
    if (ok) act(w, 'completed')
  }
  const reject = async (w) => {
    const { ok, reason } = await confirm({
      title: `Reject ${nairaKobo(w.amount)}?`, tone: 'danger', icon: <XCircle size={20} />, confirmLabel: 'Reject and refund balance',
      body: 'The amount goes back to their referral balance and they can ask again. They are emailed the reason.',
      reason: { label: 'Reason the vendor will see', placeholder: 'For example: the account name does not match the store owner.', required: true, min: 5 },
    })
    if (ok) act(w, 'rejected', reason)
  }

  const tiles = [
    { icon: <Hourglass size={18} />, label: 'Waiting to be paid', value: sums.waiting, sub: `${sums.waitingN} request${sums.waitingN === 1 ? '' : 's'}${sums.oldest ? `, oldest ${timeAgo(sums.oldest)}` : ''}`, tone: 'text-amber-200' },
    { icon: <ArrowDownToLine size={18} />, label: 'Paid this month', value: sums.paidMonth, sub: 'Since the 1st', tone: 'text-emerald-200' },
    { icon: <Wallet size={18} />, label: 'Paid all time', value: sums.paid, sub: `${sums.paidN} payout${sums.paidN === 1 ? '' : 's'}${sums.rejectedN ? `, ${sums.rejectedN} rejected` : ''}`, tone: 'text-white' },
  ]

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#023a19] via-[#034e22] to-[#0b6b35] p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-emerald-300/10" />
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-green-100/80">{t.icon}{t.label}</p>
              <p className={`mt-2 font-display text-[28px] font-extrabold leading-none tabular-nums ${t.tone}`}>{loading && !data ? '...' : <CountUp value={t.value / 100} format={(n) => `₦${Math.round(n).toLocaleString('en-NG')}`} />}</p>
              <p className="mt-1.5 text-[11.5px] text-green-100/70">{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={filter} onChange={setFilter} options={[
          { id: 'pending', label: 'Waiting', count: sums.waitingN, dot: 'bg-amber-500' },
          { id: 'completed', label: 'Paid', count: sums.paidN, dot: 'bg-emerald-500' },
          { id: 'rejected', label: 'Rejected', count: sums.rejectedN, dot: 'bg-red-500' },
          { id: 'all', label: 'All', count: all.length },
        ]} />
        <SearchBox value={q} onChange={setQ} placeholder="Store, bank, account name or number" className="lg:w-80" />
      </div>
      <Notice tone="error" onClose={() => setError('')}>{error || loadError}</Notice>

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
      ) : rows.length === 0 ? (
        <Empty icon={<Banknote size={22} />} title={q ? 'Nothing matches that search' : filter === 'pending' ? 'No one is waiting for money' : 'Nothing here'} sub={q ? 'Try the store name, the bank, or part of the account number.' : filter === 'pending' ? 'Withdrawal requests from the Referrals tab land here.' : 'Pick another filter.'} />

      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{pg.rows.map((w) => <Slip key={w.id} w={w} busy={busy} onPay={pay} onReject={reject} />)}</div>
          <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={8} onPage={pg.setPage} />
        </>
      )}
      {all.length >= 200 && <p className="text-center text-[12px] text-dash-muted">Showing the latest 200 requests.</p>}
      {confirmUi}
    </div>
  )
}
