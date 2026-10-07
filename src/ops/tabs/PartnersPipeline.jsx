// src/ops/tabs/PartnersPipeline.jsx
//
// Investors & Partners: enquiries from the public /partners page as a deal
// pipeline (new, contacted, in talks, closed, not a fit), each with notes the
// team keeps, and the traction figures shown on that page
// (/api/admin-partners). These are people's names and numbers attached to
// investment intentions: delete exists for erasure requests (super admins).
import { useEffect, useState } from 'react'
import { Rocket, MessageCircle, Mail, ExternalLink, Trash2, Save, Building, BarChart3 } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { ENQUIRY_STATUSES, INTEREST_OPTIONS, INVESTOR_TYPES, TICKET_SIZES, SOURCES, labelFor } from '../../utils/partnerEnquiry'
import PartnersFigures from './PartnersFigures'
import { Segmented, Chips, Pager, Pill, Empty, Notice, Btn, Drawer, Field, useConfirm, timeAgo, fmtDateTime, waLink } from './kit'

const PER_PAGE = 10
const STAGE = { new: ['amber', 'from-amber-400 to-amber-300'], contacted: ['blue', 'from-sky-500 to-sky-400'], in_talks: ['green', 'from-forest-600 to-emerald-400'], closed: ['slate', 'from-slate-500 to-slate-400'], not_a_fit: ['red', 'from-red-400 to-rose-300'] }
const INTEREST_TONE = { investor: 'green', strategic: 'violet', partner: 'blue', cofounder: 'gold' }

function EnquiryDrawer({ e, me, onClose, onChanged }) {
  const [notes, setNotes] = useState(e.adminNotes || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  useEffect(() => { setNotes(e.adminNotes || '') }, [e.id, e.adminNotes])
  const save = async (body, label) => {
    setBusy(label); setErr('')
    const { ok, data } = await opsJson('/api/admin-partners?action=update', { method: 'POST', body: { id: e.id, ...body } })
    setBusy('')
    if (!ok) { setErr(data.message || data.error || 'Could not save.'); return }
    onChanged(body.status ? `Moved to ${labelFor(ENQUIRY_STATUSES, body.status)}.` : 'Notes saved.', !!body.status)
  }
  const del = async () => {
    const { ok } = await confirm({ title: `Delete ${e.fullName}'s enquiry?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete for good', body: 'Use this when they ask for their details to be erased. It cannot be undone.' })
    if (!ok) return
    setBusy('del')
    const { ok: done, data } = await opsJson('/api/admin-partners?action=delete', { method: 'POST', body: { id: e.id } })
    setBusy('')
    if (!done) { setErr(data.message || data.error || 'Could not delete.'); return }
    onChanged('Enquiry deleted.', true, true)
  }
  return (
    <Drawer open onClose={onClose} title={e.fullName || 'Enquiry'} sub={<span className="inline-flex flex-wrap items-center gap-2"><Pill tone={INTEREST_TONE[e.interest] || 'slate'}>{labelFor(INTEREST_OPTIONS, e.interest)}</Pill><span>{fmtDateTime(e.createdAt)}</span></span>}
      footer={me?.isSuper ? <Btn tone="danger-soft" size="sm" icon={<Trash2 size={14} />} busy={busy === 'del'} onClick={del}>Delete (erasure request)</Btn> : null}>
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Stage</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {ENQUIRY_STATUSES.map((s) => (
              <button key={s.id} type="button" onClick={() => s.id !== e.status && save({ status: s.id }, s.id)} disabled={!!busy}
                className={`rounded-xl px-2 py-2 text-[12px] font-semibold ring-1 transition ${e.status === s.id ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line hover:bg-slate-50'}`}>{busy === s.id ? '...' : s.label}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.phone && <a href={waLink(e.phone, `Hello ${e.fullName}, this is Sellapage. Thank you for your interest in partnering with us.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-semibold text-white"><MessageCircle size={15} /> WhatsApp</a>}
          {e.email && <a href={`mailto:${e.email}?subject=${encodeURIComponent('Sellapage partnership')}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold ring-1 ring-dash-line"><Mail size={15} /> Email</a>}
          {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold ring-1 ring-dash-line"><ExternalLink size={15} /> Profile</a>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">{e.email}</Field>
          <Field label="Phone">{e.phone}</Field>
          <Field label="Organisation">{e.organisation}</Field>
          <Field label="Investor type">{e.investorType ? labelFor(INVESTOR_TYPES, e.investorType) : null}</Field>
          <Field label="Cheque size">{e.ticketSize ? labelFor(TICKET_SIZES, e.ticketSize) : null}</Field>
          <Field label="Heard from">{e.source ? labelFor(SOURCES, e.source) : null}</Field>
        </div>
        {e.message && <section><p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Their message</p><p className="mt-1.5 whitespace-pre-wrap rounded-2xl bg-slate-50 px-4 py-3 text-[13.5px] leading-relaxed text-dash-ink ring-1 ring-slate-100">{e.message}</p></section>}
        <label className="block">
          <span className="text-[12px] font-semibold text-slate-700">Team notes</span>
          <textarea value={notes} onChange={(ev) => setNotes(ev.target.value.slice(0, 2000))} rows={5} placeholder="Calls, what was promised, next step."
            className="mt-1.5 w-full resize-none rounded-2xl border border-dash-line bg-slate-50 px-4 py-3 text-[13.5px] outline-none focus:border-forest-600 focus:bg-white focus:ring-4 focus:ring-forest-50" />
        </label>
        <Btn icon={<Save size={15} />} busy={busy === 'notes'} disabled={notes === (e.adminNotes || '')} onClick={() => save({ adminNotes: notes }, 'notes')}>Save notes</Btn>
        <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
        {e.consentAt && <p className="text-[11.5px] text-slate-400">Agreed to be contacted on {fmtDateTime(e.consentAt)}.</p>}
      </div>
      {confirmUi}
    </Drawer>
  )
}

function Enquiries({ me, notify }) {
  const [status, setStatus] = useState('open')
  const [interest, setInterest] = useState('all')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  useEffect(() => { setPage(1) }, [status, interest])
  const { data, loading, error } = useOpsData(`/api/admin-partners?action=list&status=${status}&interest=${interest}&page=${page}&limit=${PER_PAGE}&n=${nonce}`)
  const counts = data?.counts || {}
  const ic = data?.interestCounts || {}
  const items = data?.items || []
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ENQUIRY_STATUSES.map((s) => {
          const [, grad] = STAGE[s.id] || STAGE.closed
          return (
            <button key={s.id} type="button" onClick={() => setStatus(status === s.id ? 'open' : s.id)} aria-pressed={status === s.id}
              className={`relative overflow-hidden rounded-3xl bg-white p-4 text-left ring-1 transition ${status === s.id ? 'ring-2 ring-forest-600 shadow-md' : 'ring-dash-line hover:-translate-y-0.5'}`}>
              <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${grad}`} />
              <p className="text-[12px] font-semibold text-dash-muted">{s.label}</p>
              <p className="mt-1 font-display text-[28px] font-extrabold leading-none tabular-nums text-dash-ink">{counts[s.id] ?? '-'}</p>
            </button>
          )
        })}
      </section>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Chips value={status} onChange={setStatus} options={[{ id: 'open', label: 'Open', count: counts.open }, { id: 'all', label: 'Everything', count: counts.all }]} />
        <Chips size="sm" tone="green" value={interest} onChange={setInterest} options={[{ id: 'all', label: 'Every kind', count: ic.all }, ...INTEREST_OPTIONS.map((o) => ({ id: o.id, label: o.label, count: ic[o.id] }))]} className="lg:ml-auto" />
      </div>
      <Notice tone="error">{error}</Notice>
      {loading && !data ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
        : items.length === 0 ? <Empty icon={<Rocket size={22} />} title="No enquiries here" sub="Investors and partners who write in from the Partners page show up here." />
          : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {items.map((e) => {
                  const [tone] = STAGE[e.status] || STAGE.closed
                  return (
                    <button key={e.id} type="button" onClick={() => setOpen(e)} className="flex flex-col rounded-3xl border border-dash-line bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex items-start gap-3">
                        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${avatarTone(e.id)}`}>{initials(e.fullName)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-bold text-dash-ink">{e.fullName}</span>
                          <span className="flex items-center gap-1 truncate text-[12px] text-slate-500"><Building size={12} />{e.organisation || 'Independent'}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</span>
                      </span>
                      {e.message && <span className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">{e.message}</span>}
                      <span className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Pill tone={INTEREST_TONE[e.interest] || 'slate'}>{labelFor(INTEREST_OPTIONS, e.interest)}</Pill>
                        <Pill tone={tone} dot>{labelFor(ENQUIRY_STATUSES, e.status)}</Pill>
                        {e.ticketSize && <Pill tone="slate">{labelFor(TICKET_SIZES, e.ticketSize)}</Pill>}
                        {e.adminNotes && <span className="text-[11px] text-slate-400">· has notes</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
              <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} />
            </>
          )}
      {open && <EnquiryDrawer e={open} me={me} onClose={() => setOpen(null)} onChanged={(msg, moved, gone) => { notify?.(msg); setNonce((n) => n + 1); if (gone) setOpen(null); else if (moved) setOpen(null) }} />}
    </div>
  )
}

export default function PartnersPipeline({ me, can, notify }) {
  const [view, setView] = useState('enquiries')
  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[{ id: 'enquiries', label: 'Enquiries', icon: <Rocket size={15} /> }, { id: 'figures', label: 'Partners page figures', icon: <BarChart3 size={15} /> }]} />
      {view === 'enquiries' ? <Enquiries me={me} notify={notify} /> : <PartnersFigures can={can} />}
    </div>
  )
}
