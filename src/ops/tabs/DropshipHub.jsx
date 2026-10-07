// src/ops/tabs/DropshipHub.jsx
//
// Dropshipping marketplace, three views (/api/admin-marketplace):
//   Suppliers  the review queue: video, the checks the server ran, terms and
//              agreement, new-supplier limits, and the decision (a no needs a
//              reason; the vendor is shown it and notified)
//   Waitlist   everyone waiting: stores that ticked supply/dropship, with
//              their readiness, and people from the public page
//   Access     who can use the marketplace at all (super admins move the
//              stage) and which stores have early access while testing
import { useEffect, useMemo, useState } from 'react'
import { Boxes, Store, ClipboardList, KeyRound, CheckCircle2, XCircle, Ban, Undo2, ExternalLink, Clock, Copy, Check, Trash2, Lock, FlaskConical, Globe, Search, Video, FileText, ShieldCheck, Circle } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Segmented, Chips, Pager, SearchBox, PlanPill, Pill, Empty, Notice, Btn, useConfirm, useDebounced, fmtDate, timeAgo, storeUrl } from './kit'

const CHECKS = { plan: 'Pro or Premium', payout: 'Payout account', cac: 'CAC verified', phone: 'Phone verified', pickup: 'Pickup address' }
const SUP = { pending: ['Waiting', 'amber'], approved: ['Approved', 'green'], rejected: ['Rejected', 'red'], suspended: ['Suspended', 'red'] }

function Checklist({ checks }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {Object.entries(checks || {}).map(([k, done]) => (
        <li key={k} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
          {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}{CHECKS[k] || k}
        </li>
      ))}
    </ul>
  )
}

function Suppliers({ notify }) {
  const [view, setView] = useState('pending')
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error } = useOpsData(`/api/admin-marketplace?action=suppliers&status=${view}&n=${nonce}`)
  const rows = data?.suppliers || []
  const act = async (r, decision) => {
    const name = r.name || r.storeName
    let reason = ''
    if (decision === 'reject' || decision === 'suspend') {
      const res = await confirm({ title: decision === 'reject' ? `Reject ${name}?` : `Suspend ${name}?`, tone: 'danger', icon: decision === 'reject' ? <XCircle size={20} /> : <Ban size={20} />,
        confirmLabel: decision === 'reject' ? 'Reject' : 'Suspend', body: decision === 'suspend' ? 'Every one of their marketplace listings goes off at once. Nothing is deleted; lifting the suspension brings them back.' : 'They can fix it and apply again.',
        reason: { label: 'Why? The vendor is shown this.', required: true, min: 5 } })
      if (!res.ok) return
      reason = res.reason
    } else if (decision === 'approve') {
      const res = await confirm({ title: `Approve ${name} as a supplier?`, icon: <ShieldCheck size={20} />, confirmLabel: 'Approve', body: 'Other stores will be able to sell their products. Watch the video and read their terms first.', checklist: ['I watched their video and read their terms.'] })
      if (!res.ok) return
    }
    setBusy(`${r.storeId}:${decision}`); setErr('')
    const { ok, data: d } = await opsJson('/api/admin-marketplace?action=supplier-decision', { method: 'POST', body: { storeId: r.storeId, decision, reason } })
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'That did not go through.'); return }
    notify?.({ approve: 'Approved. They can list products now.', reject: 'Rejected. They have been told why.', suspend: 'Suspended. Their listings are off.', unsuspend: 'Suspension lifted.' }[decision])
    setNonce((n) => n + 1)
  }
  const limits = async (r) => {
    setBusy(`${r.storeId}:limits`)
    const { ok, data: d } = await opsJson('/api/admin-marketplace?action=set-limits', { method: 'POST', body: { storeId: r.storeId, lifted: !r.limits.lifted } })
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'Could not change limits.'); return }
    notify?.(r.limits.lifted ? 'New-supplier limits are back on.' : 'New-supplier limits lifted.')
    setNonce((n) => n + 1)
  }
  return (
    <div className="space-y-4">
      <Chips value={view} onChange={setView} options={[{ id: 'pending', label: 'Waiting', dot: 'bg-amber-500' }, { id: 'approved', label: 'Approved', dot: 'bg-emerald-500' }, { id: 'rejected', label: 'Rejected' }, { id: 'suspended', label: 'Suspended', dot: 'bg-red-500' }, { id: 'all', label: 'Everyone' }]} />
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>
      {loading && !data ? <div className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />
        : rows.length === 0 ? <Empty icon={<Store size={22} />} title={view === 'pending' ? 'No applications waiting' : 'Nobody here'} sub="Supplier applications from the Supplier Hub land here, oldest first." />
          : (
            <ul className="space-y-4">
              {rows.map((r) => {
                const [label, tone] = SUP[r.status] || SUP.pending
                return (
                  <li key={r.storeId} className="overflow-hidden rounded-3xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
                      <div className="space-y-4 p-5">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[14px] font-bold ${avatarTone(r.storeId)}`}>{initials(r.name || r.storeName)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-bold text-dash-ink">{r.name || r.storeName}</span><Pill tone={tone} dot>{label}</Pill><PlanPill plan={r.plan} /></p>
                            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p>
                            {r.appliedAt && <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-slate-400"><Clock size={11} /> Applied {fmtDate(r.appliedAt)}</p>}
                          </div>
                          {r.storeName && <a href={storeUrl(r.storeName)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-slate-600 ring-1 ring-dash-line hover:bg-slate-50"><ExternalLink size={13} /> Store</a>}
                        </div>
                        <Checklist checks={r.checks} />
                        <p className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold ${r.agreementVersion === r.agreementCurrent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><FileText size={13} />{r.agreementVersion ? `Supplier agreement v${r.agreementVersion}${r.agreementVersion === r.agreementCurrent ? '' : ` (current is v${r.agreementCurrent})`}` : 'Has not accepted the supplier agreement'}</p>
                        {r.notes && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[13px] text-slate-600">{r.notes}</p>}
                        {r.terms ? (
                          <div className="rounded-2xl border border-dash-line p-4">
                            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Their terms, version {r.terms.version}</p>
                            <ul className="mt-1.5 space-y-1">{r.terms.summary.map((l) => <li key={l} className="text-[12.5px] text-slate-600">· {l}</li>)}</ul>
                            {r.terms.extraTerms && <p className="mt-2 whitespace-pre-line text-[12.5px] text-slate-500">{r.terms.extraTerms}</p>}
                          </div>
                        ) : <p className="text-[12px] font-semibold text-amber-700">No supplier terms saved yet.</p>}
                        {(r.rejectionReason || r.suspendedReason) && <Notice tone="warn">{r.suspendedReason || r.rejectionReason}</Notice>}
                        {r.limits && (r.status === 'approved' || r.status === 'suspended') && (
                          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600">
                            <span className="flex-1">{r.limits.lifted ? 'New-supplier limits were lifted by a person.' : r.limits.limited ? `New-supplier limits apply: ${r.limits.delivered} of 10 orders delivered.` : `Graduated: ${r.limits.delivered} orders delivered.`}{r.limits.open != null ? ` ${r.limits.open} waiting to ship.` : ''}</span>
                            <Btn size="sm" tone="soft" busy={busy === `${r.storeId}:limits`} onClick={() => limits(r)}>{r.limits.lifted ? 'Put limits back' : 'Lift limits'}</Btn>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {r.status === 'pending' && <><Btn icon={<CheckCircle2 size={15} />} busy={busy === `${r.storeId}:approve`} onClick={() => act(r, 'approve')}>Approve</Btn><Btn tone="danger-soft" icon={<XCircle size={15} />} onClick={() => act(r, 'reject')}>Reject</Btn></>}
                          {r.status === 'approved' && <Btn tone="danger-soft" icon={<Ban size={15} />} onClick={() => act(r, 'suspend')}>Suspend</Btn>}
                          {r.status === 'suspended' && <Btn tone="soft" icon={<Undo2 size={15} />} busy={busy === `${r.storeId}:unsuspend`} onClick={() => act(r, 'unsuspend')}>Lift suspension</Btn>}
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-slate-950 p-3 lg:min-h-full">
                        {r.videoUrl ? <video src={r.videoUrl} controls preload="none" className="max-h-80 w-full rounded-2xl bg-black" />
                          : <p className="flex flex-col items-center gap-2 py-10 text-[12.5px] text-slate-400"><Video size={24} />No video yet</p>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      {confirmUi}
    </div>
  )
}

function Waitlist({ notify }) {
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const search = useDebounced(q)
  useEffect(() => { setPage(1) }, [role, search])
  const { data, loading, error } = useOpsData(`/api/admin-marketplace?action=waitlist&page=${page}&limit=20&role=${role}&search=${encodeURIComponent(search)}&n=${nonce}`)
  const c = data?.counts || {}
  const items = data?.items || []
  const copyAll = async () => {
    setBusy('copy')
    const { ok, data: d } = await opsJson('/api/admin-marketplace?action=export')
    setBusy('')
    if (!ok) { setErr('Could not get the emails.'); return }
    try { await navigator.clipboard.writeText((d.emails || []).join(', ')); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setErr('Your browser blocked copying.') }
  }
  const remove = async (it) => {
    const { ok } = await confirm({ title: `Remove ${it.email}?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Remove', body: 'Only sign-ups from the public page can be removed. Stores change their own interest in Settings.' })
    if (!ok) return
    setBusy(it.id)
    const res = await opsJson('/api/admin-marketplace?action=delete', { method: 'POST', body: { id: it.id } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not remove.'); return }
    notify?.('Removed from the waitlist.')
    setNonce((n) => n + 1)
  }
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {[['Everyone', c.all], ['Want to supply', c.supply], ['Want to dropship', c.dropship], ['Stores', c.stores], ['Ready to supply', c.supplierReady]].map(([l, v], i) => (
          <div key={l} className={`rounded-3xl p-4 ${i === 4 ? 'col-span-2 bg-gradient-to-br from-forest-600 to-emerald-500 text-white lg:col-span-1' : 'border border-dash-line bg-white'}`}><p className={`text-[12px] font-semibold ${i === 4 ? 'text-green-50' : 'text-dash-muted'}`}>{l}</p><p className="mt-1 font-display text-[26px] font-extrabold leading-none tabular-nums">{v ?? '-'}</p></div>
        ))}
      </section>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Chips value={role} onChange={setRole} options={[{ id: '', label: 'Everyone' }, { id: 'supply', label: 'Suppliers' }, { id: 'dropship', label: 'Dropshippers' }]} />
        <SearchBox value={q} onChange={setQ} placeholder="Name, email, store or phone" busy={loading} className="lg:w-80" />
        <Btn tone="soft" className="lg:ml-auto" icon={copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} busy={busy === 'copy'} disabled={!c.all} onClick={copyAll}>{copied ? 'Copied' : 'Copy all emails'}</Btn>
      </div>
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>
      <section className="rounded-3xl border border-dash-line bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-3">
        {loading && !data ? <div className="h-64 animate-pulse rounded-2xl bg-slate-50" /> : items.length === 0 ? <Empty icon={<ClipboardList size={22} />} title="Nobody here" className="border-none" /> : (
          <ul className="divide-y divide-dash-line">
            {items.map((it) => (
              <li key={it.id} className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${it.kind === 'store' ? 'bg-forest-50 text-forest-600' : 'bg-sky-50 text-sky-600'}`}>{it.kind === 'store' ? <Store size={16} /> : <Globe size={16} />}</span>
                  <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold text-dash-ink">{it.name || it.storeName || it.email}</span><span className="block truncate text-[11.5px] text-slate-500">{it.email}{it.phone ? ` · ${it.phone}` : ''}{it.sells ? ` · sells ${it.sells}` : ''}</span></span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 pl-12 sm:pl-0">
                  <Pill tone={it.role === 'both' ? 'violet' : it.role === 'supply' ? 'amber' : 'blue'}>{it.role === 'both' ? 'Both' : it.role === 'supply' ? 'Supply' : 'Dropship'}</Pill>
                  {it.kind === 'store' && <PlanPill plan={it.plan} />}
                  {it.kind === 'store' && <span className="flex gap-0.5" title="Supplier checks">{Object.entries(it.checks || {}).map(([k, d]) => <span key={k} title={CHECKS[k]} className={`h-2 w-2 rounded-full ${d ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}</span>}
                  <span className="text-[11px] text-slate-400">{timeAgo(it.createdAt)}</span>
                  {it.kind === 'page' && <button type="button" onClick={() => remove(it)} disabled={busy === it.id} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label="Remove"><Trash2 size={14} /></button>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} pages={Math.max(1, Math.ceil((data?.total || 0) / 20))} total={data?.total} perPage={20} onPage={setPage} className="mt-2 border-t border-dash-line px-2 pt-3" />
      </section>
      {confirmUi}
    </div>
  )
}

const STAGES = [
  { id: 'coming_soon', label: 'Closed', icon: Lock, blurb: 'Nobody can use it. Vendors see the waitlist page.' },
  { id: 'testing', label: 'Testing', icon: FlaskConical, blurb: 'Only stores with early access below.' },
  { id: 'live', label: 'Live', icon: Globe, blurb: 'Every Pro and Premium vendor. Suppliers still need approval.' },
]

function Access({ notify }) {
  const [nonce, setNonce] = useState(0)
  const { data, loading, error } = useOpsData(`/api/admin-marketplace?action=access&n=${nonce}`)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [confirmUi, confirm] = useConfirm()
  const testers = useMemo(() => data?.testers || [], [data])
  const idx = STAGES.findIndex((s) => s.id === data?.stage)
  const setStage = async (s) => {
    const { ok } = await confirm({ title: `Move the marketplace to ${s.label}?`, tone: s.id === 'live' ? 'warn' : 'default', icon: <s.icon size={20} />, confirmLabel: `Move to ${s.label}`, body: s.blurb })
    if (!ok) return
    setBusy(s.id); setErr('')
    const res = await opsJson('/api/admin-marketplace?action=set-stage', { method: 'POST', body: { stage: s.id } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not change the stage.'); return }
    notify?.(`The marketplace is now ${s.label}.`)
    setNonce((n) => n + 1)
  }
  const find = async () => {
    setBusy('find'); setErr('')
    const res = await opsJson(`/api/admin-marketplace?action=find-store&q=${encodeURIComponent(q.trim().toLowerCase())}`)
    setBusy('')
    setFound(res.ok ? res.data.stores || [] : [])
  }
  const toggle = async (st, on) => {
    setBusy(st.storeId)
    const res = await opsJson('/api/admin-marketplace?action=set-tester', { method: 'POST', body: { storeId: st.storeId, on } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not change early access.'); return }
    notify?.(on ? `${st.name || st.storeName} has early access.` : 'Early access removed.')
    setFound((f) => f && f.map((x) => (x.storeId === st.storeId ? { ...x, isTester: on } : x)))
    setNonce((n) => n + 1)
  }
  return (
    <div className="space-y-4">
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>
      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[15px] font-bold text-dash-ink">Who can use the marketplace</p>
        {data?.lockedByEnv && <Notice tone="warn" className="mt-3">The DROPSHIPPING_STAGE setting in Vercel is set, so it decides the stage. Remove it there to switch here.</Notice>}
        {!loading && data && !data.canSetStage && <p className="mt-1 text-[12.5px] text-dash-muted">Only a super admin can move the stage.</p>}
        <ol className="relative mt-5 grid gap-3 md:grid-cols-3">
          {STAGES.map((s, i) => {
            const I = s.icon
            const here = i === idx
            const can = data?.canSetStage && !data?.lockedByEnv && !here
            return (
              <li key={s.id}>
                <button type="button" disabled={!can || busy === s.id} onClick={() => setStage(s)} className={`flex h-full w-full flex-col rounded-3xl p-4 text-left ring-1 transition ${here ? 'bg-forest-600 text-white ring-forest-600 shadow-lg' : i < idx ? 'bg-forest-50 text-forest-700 ring-forest-100' : 'bg-white text-slate-600 ring-dash-line'} ${can ? 'hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'}`}>
                  <span className="flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${here ? 'bg-white/15' : 'bg-white ring-1 ring-dash-line'}`}><I size={17} /></span><span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-70">Step {i + 1}</span></span>
                  <span className="mt-3 text-[16px] font-bold">{s.label}{here ? ' (now)' : ''}</span>
                  <span className={`mt-1 text-[12.5px] ${here ? 'text-green-50/90' : 'text-slate-500'}`}>{s.blurb}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="flex items-center gap-2 text-[15px] font-bold text-dash-ink"><KeyRound size={17} className="text-forest-600" /> Early access ({testers.length})</p>
        <p className="mt-0.5 text-[12.5px] text-dash-muted">Used while the stage is Testing.</p>
        <div className="mt-3 flex gap-2">
          <label className="relative flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q.trim().length >= 2 && find()} placeholder="Exact store link, email or store id" className="h-11 w-full rounded-2xl border border-dash-line pl-10 pr-3 text-[13.5px] outline-none focus:border-forest-600" /></label>
          <Btn tone="dark" busy={busy === 'find'} disabled={q.trim().length < 2} onClick={find}>Find</Btn>
        </div>
        {found && <ul className="mt-3 space-y-2">{found.length === 0 ? <li className="text-[12.5px] text-slate-500">No store has exactly that link, email or id.</li> : found.map((st) => (
          <li key={st.storeId} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5"><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{st.name || st.storeName}</span><span className="text-[11.5px] text-slate-500">{st.email} · /{st.storeName}</span></span><Btn size="sm" tone={st.isTester ? 'soft' : 'primary'} busy={busy === st.storeId} onClick={() => toggle(st, !st.isTester)}>{st.isTester ? 'Remove access' : 'Give access'}</Btn></li>
        ))}</ul>}
        <ul className="mt-4 divide-y divide-dash-line">
          {testers.map((t) => (
            <li key={t.storeId} className="flex items-center gap-3 py-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(t.storeId)}`}>{initials(t.name || t.storeName)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-dash-ink">{t.name || t.storeName}</span><span className="text-[11.5px] text-slate-500">{t.email}</span></span>
              <PlanPill plan={t.plan} />
              <button type="button" role="switch" aria-checked="true" aria-label="Remove early access" disabled={busy === t.storeId} onClick={() => toggle(t, false)} className="relative inline-flex h-7 w-12 items-center rounded-full bg-forest-600 disabled:opacity-50"><span className="inline-block h-5 w-5 translate-x-6 rounded-full bg-white shadow" /></button>
            </li>
          ))}
          {!loading && testers.length === 0 && <li className="py-3 text-[12.5px] text-slate-400">No store has early access.</li>}
        </ul>
      </section>
      {confirmUi}
    </div>
  )
}

export default function DropshipHub({ notify }) {
  const [view, setView] = useState('suppliers')
  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[{ id: 'suppliers', label: 'Suppliers', icon: <Boxes size={15} /> }, { id: 'waitlist', label: 'Waitlist', icon: <ClipboardList size={15} /> }, { id: 'access', label: 'Access', icon: <KeyRound size={15} /> }]} className="max-w-full overflow-x-auto" />
      {view === 'suppliers' ? <Suppliers notify={notify} /> : view === 'waitlist' ? <Waitlist notify={notify} /> : <Access notify={notify} />}
    </div>
  )
}
