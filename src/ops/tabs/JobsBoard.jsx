// src/ops/tabs/JobsBoard.jsx
//
// Job Listings as the board vendors' posts will appear on, so the person
// approving sees what the public will see. Approving or rejecting emails and
// notifies the vendor (/api/admin-jobs); a rejection needs a reason, because
// the vendor is told what to fix.
import { useMemo, useState } from 'react'
import { Briefcase, MapPin, Wallet, Clock, CheckCircle2, XCircle, ExternalLink, ListChecks } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { Chips, Pager, Pill, Empty, Notice, Btn, Drawer, Field, useClientPages, useConfirm, timeAgo, fmtDateTime, title, storeUrl } from './kit'

const TONE = { pending: ['Waiting', 'amber'], approved: ['Live', 'green'], rejected: ['Rejected', 'red'] }

function JobCard({ j, onOpen }) {
  const [label, tone] = TONE[j.status] || TONE.pending
  return (
    <button type="button" onClick={() => onOpen(j)} className="group flex flex-col overflow-hidden rounded-3xl border border-dash-line bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-forest-50 via-white to-emerald-50">
        {j.imageUrl ? <img src={j.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <span className="absolute inset-0 flex items-center justify-center text-forest-600/30"><Briefcase size={44} /></span>}
        <span className="absolute left-3 top-3"><Pill tone={tone} dot className="bg-white/90 backdrop-blur">{label}</Pill></span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-dash-ink">{j.title || 'Untitled job'}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{j.businessName}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {j.location && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] text-slate-600"><MapPin size={12} />{j.location}</span>}
          {j.pay && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] text-emerald-700"><Wallet size={12} />{j.pay}</span>}
          {j.jobType && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11.5px] text-violet-700">{title(j.jobType)}</span>}
        </div>
        <p className="mt-auto pt-3 text-[11.5px] text-slate-400">{timeAgo(j.createdAt)}</p>
      </div>
    </button>
  )
}

export default function JobsBoard({ notify }) {
  const [filter, setFilter] = useState('pending')
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error } = useOpsData(`/api/admin-jobs?action=list&status=${filter}&n=${nonce}`)
  const jobs = useMemo(() => data?.jobs || [], [data])
  const pg = useClientPages(jobs, 9)
  const stats = data?.stats

  const decide = async (j, status) => {
    let reason = ''
    if (status === 'rejected') {
      const r = await confirm({ title: `Reject "${j.title}"?`, tone: 'danger', icon: <XCircle size={20} />, confirmLabel: 'Reject and tell them',
        body: `${j.businessName || 'The vendor'} gets an email and a notification with your reason, and can fix it and send it again.`, reason: { label: 'What they need to fix', required: true, min: 8 } })
      if (!r.ok) return
      reason = r.reason
    }
    setBusy(status); setErr('')
    const { ok, data: d } = await opsJson('/api/admin-jobs?action=update', { method: 'POST', body: { jobId: j.id, status, rejectionReason: reason } })
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'Could not save.'); return }
    notify?.(status === 'approved' ? `"${j.title}" is live on the Jobs page.` : 'Rejected. The vendor has been told why.')
    setOpen(null)
    setNonce((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips value={filter} onChange={setFilter} options={[
          { id: 'pending', label: 'Waiting', count: stats?.pending, dot: 'bg-amber-500' },
          { id: 'approved', label: 'Live', count: stats?.approved, dot: 'bg-emerald-500' },
          { id: 'rejected', label: 'Rejected', count: stats?.rejected, dot: 'bg-red-500' },
          { id: 'all', label: 'All', count: stats?.total },
        ]} />
        <a href="https://sellapage.com.ng/jobs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest-600 hover:underline"><ExternalLink size={13} /> Public Jobs page</a>
      </div>
      <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>

      {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
        : jobs.length === 0 ? <Empty icon={<Briefcase size={22} />} title={filter === 'pending' ? 'No jobs waiting' : 'Nothing here'} sub="Jobs vendors post from their dashboard wait here before going live." />
          : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pg.rows.map((j) => <JobCard key={j.id} j={j} onOpen={setOpen} />)}</div>
              <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={9} onPage={pg.setPage} />
            </>
          )}

      <Drawer open={!!open} onClose={() => setOpen(null)} wide title={open?.title || 'Job'} sub={open ? `${open.businessName} · posted ${fmtDateTime(open.createdAt)}` : ''}
        footer={open?.status === 'pending' ? <>
          <Btn icon={<CheckCircle2 size={15} />} busy={busy === 'approved'} onClick={() => decide(open, 'approved')}>Approve, put it live</Btn>
          <Btn tone="danger-soft" icon={<XCircle size={15} />} busy={busy === 'rejected'} onClick={() => decide(open, 'rejected')}>Reject</Btn>
        </> : null}>
        {open && (
          <div className="space-y-5">
            {open.imageUrl && <img src={open.imageUrl} alt="" className="max-h-64 w-full rounded-2xl object-cover" />}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pay">{open.pay}</Field>
              <Field label="Location">{open.location}</Field>
              <Field label="Type">{title(open.jobType)}</Field>
              <Field label="Category">{title(open.category)}</Field>
              <Field label="Start">{open.availabilityTimeline}</Field>
              <Field label="Status">{(TONE[open.status] || TONE.pending)[0]}</Field>
            </div>
            {open.mustHaves && <section><p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400"><ListChecks size={13} /> Must-haves</p><p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-dash-ink">{open.mustHaves}</p></section>}
            {open.description && <section><p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Description</p><p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-dash-ink">{open.description}</p></section>}
            {open.rejectionReason && <Notice tone="warn">Rejected because: {open.rejectionReason}</Notice>}
            {open.storeSlug && <a href={storeUrl(open.storeSlug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-600 hover:underline"><ExternalLink size={14} /> See {open.businessName}&apos;s store</a>}
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400"><Clock size={12} /> Posted {timeAgo(open.createdAt)}</p>
          </div>
        )}
      </Drawer>
      {confirmUi}
    </div>
  )
}
