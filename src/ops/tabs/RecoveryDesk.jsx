// src/ops/tabs/RecoveryDesk.jsx
//
// Account Recovery as an identity desk. Approving hands someone a 30-minute
// link that changes a store's login email AND password, so the Approve button
// only works after the person ticks what they checked, and writes a note for
// the Activity Log. Every decision also asks for the authenticator code
// (sudo mode, utils/opsAccess.js STEP_UP_ACTIONS.recovery).
import { useMemo, useState } from 'react'
import { KeyRound, ShieldCheck, ShieldAlert, Unlock, XCircle, MessageCircle, Mail, Globe, Clock, Fingerprint, SearchX } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { Chips, Pager, PlanPill, Pill, Empty, Notice, Btn, useClientPages, useConfirm, timeAgo, fmtDateTime, waLink } from './kit'

const FILTERS = [
  { id: 'pending', label: 'Waiting', dot: 'bg-amber-500' },
  { id: 'no_match', label: 'No store matched', dot: 'bg-slate-400' },
  { id: 'approved', label: 'Approved', dot: 'bg-sky-500' },
  { id: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
  { id: 'rejected', label: 'Rejected', dot: 'bg-red-500' },
  { id: 'all', label: 'All' },
]
const TONE = { pending: 'amber', approved: 'blue', completed: 'green', rejected: 'red', no_match: 'slate' }
const CHECKS = [
  'I matched their CAC details, recent orders or store history to the person asking.',
  'I reached them on the WhatsApp or phone number already on the store, not only the one they typed.',
  'The new email they want is theirs, and they understand every device will be signed out.',
]

function Card({ r, busy, onDecide }) {
  const name = r.businessName || r.storeName || 'Unknown store'
  return (
    <article className="flex flex-col rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-md">
      <header className="flex items-start gap-3">
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${r.status === 'no_match' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
          {r.status === 'no_match' ? <SearchX size={20} /> : <Fingerprint size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-dash-ink">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone={TONE[r.status] || 'slate'} dot>{FILTERS.find((f) => f.id === r.status)?.label || r.status}</Pill>
            {r.plan && <PlanPill plan={r.plan} />}
            {r.cacVerified && <Pill tone="green">CAC verified</Pill>}
          </div>
        </div>
        <span className="flex-shrink-0 text-[11.5px] text-slate-400" title={fmtDateTime(r.createdAtMs)}>{timeAgo(r.createdAtMs)}</span>
      </header>

      {r.status === 'no_match' && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 ring-1 ring-amber-100">
          No store matched what they typed: <span className="break-all font-mono font-semibold">{r.submittedIdentifier || '-'}</span>. Usually a typo. Contact them and confirm their store link.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-2.5 text-[13px] sm:grid-cols-2">
        {r.status !== 'no_match' && (
          <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Login email now</dt>
            <dd className="mt-0.5 truncate font-mono text-dash-ink">{r.currentEmailMasked || '-'}</dd>
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">They want it sent to</dt>
          <dd className="mt-0.5 truncate font-semibold text-dash-ink">{r.contactEmail || '-'}</dd>
        </div>
      </dl>

      {r.reason && <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl border-l-4 border-forest-200 bg-forest-50/50 px-4 py-3 text-[13px] leading-relaxed text-slate-700">{r.reason}</blockquote>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
        {r.contactPhone && <a href={waLink(r.contactPhone, `Hello, this is Sellapage support about your account recovery request for ${name}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1fa855] hover:underline"><MessageCircle size={13} /> {r.contactPhone}</a>}
        {r.contactEmail && <a href={`mailto:${r.contactEmail}`} className="inline-flex items-center gap-1 hover:text-forest-600"><Mail size={13} /> Email</a>}
        {r.storeName && <span className="inline-flex items-center gap-1"><Globe size={13} /> /{r.storeName}</span>}
        <span className="inline-flex items-center gap-1"><Clock size={13} /> from IP {r.requestIp || '-'}</span>
      </div>

      {r.adminNote && <p className="mt-3 text-[12px] italic text-slate-500">Note: {r.adminNote}</p>}

      {r.status === 'pending' && (
        <footer className="mt-4 flex flex-wrap gap-2 border-t border-dash-line pt-4">
          <Btn icon={<ShieldCheck size={15} />} busy={busy === `${r.id}:approve`} onClick={() => onDecide(r, 'approve')}>Approve</Btn>
          <Btn tone="soft" icon={<Unlock size={15} />} busy={busy === `${r.id}:unlock`} onClick={() => onDecide(r, 'unlock')}>Just unlock</Btn>
          <Btn tone="danger-soft" icon={<XCircle size={15} />} busy={busy === `${r.id}:reject`} onClick={() => onDecide(r, 'reject')} className="sm:ml-auto">Reject</Btn>
        </footer>
      )}
    </article>
  )
}

export default function RecoveryDesk({ notify }) {
  const [filter, setFilter] = useState('pending')
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error: loadError } = useOpsData(`/api/admin-recovery?action=list&status=${filter}&n=${nonce}`)
  const rows = useMemo(() => data?.requests || [], [data])
  const pg = useClientPages(rows, 8)

  const decide = async (r, decision) => {
    const name = r.businessName || r.storeName || 'this store'
    const ask = {
      approve: {
        title: `Approve recovery for ${name}?`, tone: 'warn', icon: <ShieldAlert size={20} />, confirmLabel: 'Approve and send link',
        body: <>A single-use link valid for 30 minutes goes to <strong>{r.contactEmail}</strong>. It lets them set a new login email and password, and signs out every device. The current email is told.</>,
        checklist: CHECKS, reason: { label: 'Note for the Activity Log', placeholder: 'How you confirmed it was them', required: true, min: 10 },
      },
      unlock: {
        title: `Just unlock ${name}?`, icon: <Unlock size={20} />, confirmLabel: 'Unlock',
        body: 'This only clears the failed sign-in lock. Their email and password stay the same, so they must still know the password. Use it when someone locked themselves out and then remembered.',
        reason: { label: 'Note for the Activity Log', required: true, min: 5 },
      },
      reject: {
        title: `Reject the request for ${name}?`, tone: 'danger', icon: <XCircle size={20} />, confirmLabel: 'Reject',
        body: 'Nothing changes on the store. Say why, for the record.',
        reason: { label: 'Reason', required: true, min: 5 },
      },
    }[decision]
    const { ok, reason } = await confirm(ask)
    if (!ok) return
    setBusy(`${r.id}:${decision}`); setError('')
    const res = await opsJson(`/api/admin-recovery?action=${decision}`, { method: 'POST', body: { requestId: r.id, note: reason } })
    setBusy('')
    if (!res.ok) { setError(res.data.message || res.data.error || 'That did not go through.'); return }
    notify?.(decision === 'approve' ? `Recovery link sent to ${r.contactEmail}.` : decision === 'unlock' ? `${name} is unlocked.` : 'Request rejected.')
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a1d05] to-[#5b3b06] p-5 text-amber-50 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/20"><KeyRound size={26} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[18px] font-extrabold">Verify the person before you approve</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-100/85">Approving lets the requester take over the store&apos;s login. Check CAC details, recent orders or the WhatsApp number already on the store first. The store&apos;s current email is told at request and at approval.</p>
        </div>
        <div className="flex gap-3 sm:flex-col sm:text-right">
          <div><p className="font-display text-[28px] font-extrabold leading-none text-amber-200">{filter === 'pending' ? rows.length : '-'}</p><p className="text-[11.5px] text-amber-100/70">waiting now</p></div>
        </div>
      </section>

      <Chips value={filter} onChange={setFilter} options={FILTERS} />
      <Notice tone="error" onClose={() => setError('')}>{error || loadError}</Notice>

      {loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
      ) : rows.length === 0 ? (
        <Empty icon={<ShieldCheck size={22} />} title={filter === 'pending' ? 'Nobody is locked out' : 'Nothing here'} sub={filter === 'pending' ? 'New recovery requests from the sign-in page land here.' : 'Pick another filter.'} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">{pg.rows.map((r) => <Card key={r.id} r={r} busy={busy} onDecide={decide} />)}</div>
          <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={8} onPage={pg.setPage} />
        </>
      )}
      {confirmUi}
    </div>
  )
}
