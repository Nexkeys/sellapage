// src/ops/tabs/CacDesk.jsx
//
// CAC Verification. Two queues:
//   Verifications  stores checking an RC/BN number they already have. The
//                  vendor gets 3 paid automatic tries (Prembly, verify-cac.js);
//                  after that their screen says "contact support", and they
//                  land at the top here as "Needs a person".
//   Registration   vendors asking Sellapage to register a business for them
//                  (cacRequests). Contact happens on WhatsApp or email.
import { useEffect, useMemo, useState } from 'react'
import { FileCheck, BadgeCheck, ShieldAlert, RotateCcw, XCircle, MessageCircle, Mail, Building2, CheckCircle2, X, ExternalLink, Hourglass, Copy } from 'lucide-react'
import { useOpsData, Ring } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Chips, Segmented, Pager, SearchBox, PlanPill, Pill, Empty, Notice, Btn, Drawer, Dialog, Field, useDebounced, useClientPages, useConfirm, timeAgo, fmtDate, waLink, waNumber, storeUrl } from './kit'

const PER_PAGE = 12
const MAX_TRIES = 3
const nameOf = (s) => s.businessName || s.storeName || 'Unnamed store'
const needsPerson = (s) => !s.cacVerified && s.cacRetryCount >= MAX_TRIES

function stateOf(s) {
  if (s.cacVerified) return { label: s.cacManual ? 'Verified by hand' : 'Verified', tone: 'green' }
  if (needsPerson(s)) return { label: 'Needs a person', tone: 'red' }
  if (s.cacStatus === 'rejected') return { label: 'Rejected', tone: 'red' }
  if (s.cacStatus === 'pending' || s.cacStatus === 'submitted') return { label: 'Waiting', tone: 'amber' }
  if (s.cacRetryCount > 0) return { label: 'Tried, not yet', tone: 'amber' }
  return { label: 'Not started', tone: 'slate' }
}

function Tries({ n }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${n} of ${MAX_TRIES} automatic tries used`}>
      {Array.from({ length: MAX_TRIES }).map((_, i) => <span key={i} className={`h-2 w-2 rounded-full ${i < n ? (n >= MAX_TRIES ? 'bg-red-500' : 'bg-amber-400') : 'bg-slate-200'}`} />)}
    </span>
  )
}

function VerifyForm({ s, onDone, onCancel }) {
  const [rc, setRc] = useState(s.cacRcNumber ? String(s.cacRcNumber) : '')
  const [name, setName] = useState(s.cacBusinessName || s.businessName || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const clean = rc.trim().toUpperCase().replace(/^(RC|BN|IT|LP|LLP)/, '').replace(/\s+/g, '')
  const valid = /^\d{3,12}$/.test(clean) && name.trim().length >= 3
  const save = async () => {
    setBusy(true); setErr('')
    const { ok, data } = await opsJson('/api/admin-cac?action=update', { method: 'POST', body: { storeId: s.id, status: 'verified', rcNumber: rc, businessName: name } })
    setBusy(false)
    if (!ok) { setErr(data.message || data.error || 'Could not verify.'); return }
    onDone(`${nameOf(s)} is verified. The badge shows on their store now.`)
  }
  return (
    <div className="space-y-3 rounded-2xl bg-forest-50/60 p-4 ring-1 ring-forest-100">
      <p className="text-[13px] font-bold text-dash-ink">Verify by hand</p>
      <p className="text-[12.5px] leading-relaxed text-slate-600">Check the number on the CAC public search (search.cac.gov.ng) or their certificate first. Only active businesses.</p>
      <label className="block"><span className="text-[12px] font-semibold text-slate-700">RC or BN number</span>
        <input value={rc} onChange={(e) => setRc(e.target.value)} placeholder="RC1234567" className="mt-1 h-11 w-full rounded-xl border border-dash-line bg-white px-3.5 font-mono text-[14px] uppercase outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-50" /></label>
      <label className="block"><span className="text-[12px] font-semibold text-slate-700">Registered business name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears on the certificate" className="mt-1 h-11 w-full rounded-xl border border-dash-line bg-white px-3.5 text-[14px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-50" /></label>
      <Notice tone="error">{err}</Notice>
      <div className="flex gap-2"><Btn icon={<BadgeCheck size={15} />} busy={busy} disabled={!valid} onClick={save}>Verify and show badge</Btn><Btn tone="ghost" onClick={onCancel}>Cancel</Btn></div>
    </div>
  )
}

function StoreDrawer({ s, onClose, onChanged, notify }) {
  const [mode, setMode] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  useEffect(() => { setMode(''); setErr('') }, [s?.id])
  if (!s) return null
  const st = stateOf(s)
  const post = async (body, label) => {
    setBusy(label); setErr('')
    const { ok, data } = await opsJson(`/api/admin-cac?action=${body.action}`, { method: 'POST', body: body.payload })
    setBusy('')
    if (!ok) { setErr(data.message || data.error || 'That did not go through.'); return false }
    return true
  }
  const moreTries = async () => {
    const { ok } = await confirm({ title: `Give ${nameOf(s)} 3 more tries?`, icon: <RotateCcw size={20} />, confirmLabel: 'Give 3 more tries',
      body: 'Their automatic checks reset to 3. Each automatic check costs Sellapage about ₦150 at Prembly, so do this when you expect it to pass (for example, they typed the number wrong).' })
    if (ok && await post({ action: 'retry-verify', payload: { storeId: s.id } }, 'retry')) { notify?.(`${nameOf(s)} has 3 tries again.`); onChanged() }
  }
  const reject = async () => {
    const { ok, reason } = await confirm({ title: s.cacVerified ? `Remove ${nameOf(s)}'s CAC badge?` : `Reject ${nameOf(s)}?`, tone: 'danger', icon: <XCircle size={20} />,
      confirmLabel: s.cacVerified ? 'Remove badge' : 'Reject', body: 'They get a notification with your reason.', reason: { label: 'Reason they will see', required: true, min: 5 } })
    if (ok && await post({ action: 'update', payload: { storeId: s.id, status: 'rejected', reason } }, 'reject')) { notify?.(s.cacVerified ? 'Badge removed.' : 'Rejected.'); onChanged() }
  }
  const wa = waLink(s.whatsappNumber, `Hello ${nameOf(s)}, this is Sellapage support about your CAC verification.`)
  return (
    <Drawer open onClose={onClose} title={nameOf(s)} sub={<span className="inline-flex items-center gap-2"><Pill tone={st.tone} dot>{st.label}</Pill><PlanPill plan={s.plan} /></span>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Automatic tries"><span className="inline-flex items-center gap-2"><Tries n={Math.min(s.cacRetryCount, MAX_TRIES)} /> {s.cacRetryCount} of {MAX_TRIES}</span></Field>
          <Field label="Last try">{s.cacLastRetryAt ? timeAgo(s.cacLastRetryAt) : 'Never'}</Field>
          <Field label="Registered name">{s.cacBusinessName}</Field>
          <Field label="RC / BN number">{s.cacRcNumber}</Field>
          <Field label="Verified on">{s.cacVerifiedAt ? fmtDate(s.cacVerifiedAt) : null}</Field>
          <Field label="Registered on">{s.cacRegistrationDate || null}</Field>
          <Field label="Email">{s.email}</Field>
          <Field label="WhatsApp">{s.whatsappNumber}</Field>
        </div>
        {s.cacRejectionReason && <Notice tone="warn">Last reason given: {s.cacRejectionReason}</Notice>}
        <div className="flex flex-wrap gap-2">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-semibold text-white hover:bg-[#1fba5a]"><MessageCircle size={15} /> WhatsApp</a>}
          {s.email && <a href={`mailto:${s.email}?subject=${encodeURIComponent('Your CAC verification on Sellapage')}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold ring-1 ring-dash-line hover:bg-slate-50"><Mail size={15} /> Email</a>}
          {s.storeName && <a href={storeUrl(s.storeName)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold ring-1 ring-dash-line hover:bg-slate-50"><ExternalLink size={15} /> Store</a>}
        </div>
        <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
        {mode === 'verify' ? <VerifyForm s={s} onCancel={() => setMode('')} onDone={(m) => { notify?.(m); onChanged() }} /> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {!s.cacVerified && <Btn icon={<BadgeCheck size={15} />} onClick={() => setMode('verify')}>Verify by hand</Btn>}
            {!s.cacVerified && s.cacRetryCount > 0 && <Btn tone="soft" icon={<RotateCcw size={15} />} busy={busy === 'retry'} onClick={moreTries}>Give 3 more tries</Btn>}
            <Btn tone="danger-soft" icon={<XCircle size={15} />} busy={busy === 'reject'} onClick={reject}>{s.cacVerified ? 'Remove badge' : 'Reject'}</Btn>
          </div>
        )}
      </div>
      {confirmUi}
    </Drawer>
  )
}

function Verifications({ notify }) {
  const [filter, setFilter] = useState('needs_help')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  const query = useDebounced(q)
  useEffect(() => { setPage(1) }, [filter, query])
  const { data, loading, error } = useOpsData(`/api/admin-cac?action=list&status=${filter}&page=${page}&limit=${PER_PAGE}&search=${encodeURIComponent(query)}&n=${nonce}`)
  const stats = data?.stats
  const rows = data?.stores || []
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))
  const pct = stats?.total ? Math.round((stats.verified / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      <section className="grid gap-4 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-4">
          <Ring value={pct} size={104} stroke={10}><div className="text-center"><p className="font-display text-[24px] font-extrabold text-dash-ink">{stats ? `${pct}%` : '-'}</p><p className="text-[10.5px] text-dash-muted">verified</p></div></Ring>
          <div className="md:hidden"><p className="text-[13px] font-bold text-dash-ink">{stats?.verified ?? '-'} of {stats?.total ?? '-'} stores</p><p className="text-[12px] text-dash-muted">carry the CAC badge</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { id: 'needs_help', label: 'Needs a person', v: stats?.needsHelp, sub: 'Used all 3 tries', cls: 'text-red-600 bg-red-50/60' },
            { id: 'verified', label: 'Verified', v: stats?.verified, sub: `of ${stats?.total ?? '-'} stores`, cls: 'text-emerald-700 bg-emerald-50/60' },
            { id: 'pending', label: 'Waiting', v: stats?.pending, sub: 'Marked for review', cls: 'text-amber-700 bg-amber-50/60' },
            { id: 'rejected', label: 'Rejected', v: stats?.rejected, sub: `${stats?.tried ?? 0} tried, not verified`, cls: 'text-slate-700 bg-slate-50' },
          ].map((t) => (
            <button key={t.id} type="button" onClick={() => setFilter(t.id)} className={`rounded-2xl p-3.5 text-left ring-1 transition ${t.cls} ${filter === t.id ? 'ring-2 ring-forest-600' : 'ring-transparent hover:ring-dash-line'}`}>
              <p className="text-[11.5px] font-semibold opacity-80">{t.label}</p>
              <p className="mt-1 font-display text-[24px] font-extrabold leading-none tabular-nums">{t.v ?? '-'}</p>
              <p className="mt-1 text-[11px] text-slate-500">{t.sub}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Chips value={filter} onChange={setFilter} options={[
          { id: 'needs_help', label: 'Needs a person', dot: 'bg-red-500' }, { id: 'pending', label: 'Waiting', dot: 'bg-amber-500' },
          { id: 'verified', label: 'Verified', dot: 'bg-emerald-500' }, { id: 'rejected', label: 'Rejected' }, { id: 'all', label: 'Every store' },
        ]} />
        <SearchBox value={q} onChange={setQ} placeholder="Store, registered name or RC number" busy={loading} className="lg:ml-auto lg:w-80" />
      </div>
      <Notice tone="error">{error}</Notice>

      {loading && !data ? <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
        : rows.length === 0 ? <Empty icon={<FileCheck size={22} />} title={filter === 'needs_help' ? 'Nobody is stuck' : 'Nothing here'} sub={filter === 'needs_help' ? 'Stores that use all 3 automatic tries show up here to be checked by hand.' : 'Pick another filter or search.'} />
          : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {rows.map((s) => {
                  const st = stateOf(s)
                  return (
                    <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex items-center gap-3.5 rounded-3xl border border-dash-line bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[14px] font-bold ${avatarTone(s.id)}`}>{initials(nameOf(s))}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-dash-ink">{nameOf(s)}</span>{s.cacVerified && <BadgeCheck size={16} className="flex-shrink-0 text-emerald-600" />}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-slate-500">{s.cacBusinessName ? `${s.cacBusinessName}${s.cacRcNumber ? ` · RC ${s.cacRcNumber}` : ''}` : `/${s.storeName}`}</span>
                        <span className="mt-1.5 flex items-center gap-2"><Pill tone={st.tone} dot>{st.label}</Pill>{!s.cacVerified && <Tries n={Math.min(s.cacRetryCount, MAX_TRIES)} />}{s.cacLastRetryAt && <span className="text-[11px] text-slate-400">{timeAgo(s.cacLastRetryAt)}</span>}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} />
            </>
          )}
      {open && <StoreDrawer s={open} notify={notify} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); setNonce((n) => n + 1) }} />}
    </div>
  )
}

const ENTITY = { 'business-name': 'Business Name', 'limited-company': 'Limited Company (LTD)', 'incorporated-trustees': 'Incorporated Trustees', 'not-sure': 'Not sure yet' }
const REQ_TONE = { new: 'amber', contacted: 'blue', completed: 'green', closed: 'slate' }
function opener(r) {
  const name = r.businessName || r.storeName || 'there'
  const type = ENTITY[r.entityType] || 'CAC registration'
  return `Hello ${name}, this is Sellapage. We received your request to register a ${type}${r.proposedName ? ` for "${r.proposedName}"` : ''}. I can take you through what is needed and the cost. Quick check first: does the name on your NIN match the name you want to register with exactly? That is the most common reason applications get rejected.`
}

function Registrations({ notify }) {
  const [filter, setFilter] = useState('open')
  const [nonce, setNonce] = useState(0)
  const [compose, setCompose] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const { data, loading, error } = useOpsData(`/api/admin-cac?action=requests&status=${filter}&n=${nonce}`)
  const rows = useMemo(() => data?.requests || [], [data])
  const pg = useClientPages(rows, 10)
  const setStatus = async (r, status) => {
    setBusy(`${r.id}:${status}`)
    const { ok } = await opsJson('/api/admin-cac?action=request-status', { method: 'POST', body: { requestId: r.id, status } })
    setBusy('')
    if (ok) { notify?.(status === 'completed' ? 'Marked done.' : status === 'closed' ? 'Closed.' : 'Marked contacted.'); setNonce((n) => n + 1) }
  }
  const send = (how) => {
    const r = compose
    if (how === 'wa') window.open(waLink(r.contactPhone, text), '_blank', 'noopener,noreferrer')
    else window.open(`mailto:${r.contactEmail}?subject=${encodeURIComponent('Your CAC registration request')}&body=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    if (r.status === 'new') setStatus(r, 'contacted')
    setCompose(null)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={filter} onChange={setFilter} options={[{ id: 'open', label: 'Open', count: data?.counts?.open }, { id: 'contacted', label: 'Contacted' }, { id: 'completed', label: 'Done' }, { id: 'all', label: 'All', count: data?.counts?.total }]} />
      </div>
      <Notice tone="error">{error}</Notice>
      {loading && !data ? <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />
        : rows.length === 0 ? <Empty icon={<Building2 size={22} />} title="No registration requests" sub="Vendors who ask Sellapage to register a business for them show up here." />
          : (
            <>
              <ol className="relative space-y-3 border-l-2 border-dashed border-forest-100 pl-5">
                {pg.rows.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[29px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-forest-600"><span className="h-1.5 w-1.5 rounded-full bg-forest-600" /></span>
                    <article className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-bold text-dash-ink">{r.businessName || r.storeName || 'Unnamed store'}</p>
                          <p className="mt-0.5 text-[12.5px] text-slate-600">Wants a <strong>{ENTITY[r.entityType] || r.entityType}</strong>{r.proposedName ? <> named &ldquo;{r.proposedName}&rdquo;</> : null}</p>
                        </div>
                        <div className="flex items-center gap-2"><Pill tone={REQ_TONE[r.status] || 'slate'} dot>{r.status}</Pill><span className="text-[11.5px] text-slate-400">{timeAgo(r.createdAt)}</span></div>
                      </div>
                      {r.notes && <p className="mt-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] italic text-slate-600">&ldquo;{r.notes}&rdquo;</p>}
                      <p className="mt-2 text-[12px] text-slate-500">{r.contactEmail} · {r.contactPhone}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn size="sm" tone="whatsapp" icon={<MessageCircle size={14} />} onClick={() => { setCompose(r); setText(opener(r)) }}>Contact</Btn>
                        {r.status !== 'completed' && <Btn size="sm" tone="soft" icon={<CheckCircle2 size={14} />} busy={busy === `${r.id}:completed`} onClick={() => setStatus(r, 'completed')}>Done</Btn>}
                        {r.status !== 'closed' && <Btn size="sm" tone="ghost" icon={<X size={14} />} busy={busy === `${r.id}:closed`} onClick={() => setStatus(r, 'closed')}>Close</Btn>}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
              <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={10} onPage={pg.setPage} />
            </>
          )}
      <Dialog open={!!compose} onClose={() => setCompose(null)} title={`Contact ${compose?.businessName || compose?.storeName || ''}`} icon={<MessageCircle size={20} />}
        footer={<>
          <Btn tone="soft" icon={<Mail size={15} />} disabled={!compose?.contactEmail} onClick={() => send('email')}>Email</Btn>
          <Btn tone="whatsapp" icon={<MessageCircle size={15} />} disabled={!waNumber(compose?.contactPhone)} onClick={() => send('wa')}>WhatsApp</Btn>
        </>}>
        <p className="text-[12.5px] text-slate-500">Sending marks them as contacted.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="mt-2 w-full rounded-2xl border border-dash-line bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed outline-none focus:border-forest-600 focus:bg-white" />
        <button type="button" onClick={() => navigator.clipboard?.writeText(text).catch(() => {})} className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-forest-600"><Copy size={12} /> Copy text</button>
      </Dialog>
    </div>
  )
}

export default function CacDesk({ notify }) {
  const [view, setView] = useState('verify')
  const reqs = useOpsData('/api/admin-cac?action=requests&status=open')
  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[
        { id: 'verify', label: 'Verifications', icon: <ShieldAlert size={15} /> },
        { id: 'register', label: 'Registration help', icon: <Hourglass size={15} />, count: reqs.data?.counts?.open },
      ]} />
      {view === 'verify' ? <Verifications notify={notify} /> : <Registrations notify={notify} />}
    </div>
  )
}
