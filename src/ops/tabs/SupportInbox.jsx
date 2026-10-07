// src/ops/tabs/SupportInbox.jsx
//
// Support Tickets as an inbox: the queue on the left, the conversation on the
// right (a sheet on a phone). Replies go out by email from support@ through
// /api/admin-tickets?action=reply and stay on the ticket, so whoever opens it
// next sees what was already said. WhatsApp opens with the context typed in.
import { useEffect, useMemo, useState } from 'react'
import { Inbox, Mail, MessageCircle, Send, CheckCircle2, PlayCircle, RotateCcw, Clock, Store, ExternalLink } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Pager, SearchBox, PlanPill, Pill, Empty, Notice, Btn, Drawer, useDebounced, useMedia, timeAgo, fmtDateTime, waLink, title, storeUrl } from './kit'

const PER_PAGE = 20
const STATUS = {
  open: { label: 'Open', tone: 'red', dot: 'bg-red-500' },
  in_progress: { label: 'In progress', tone: 'amber', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', tone: 'green', dot: 'bg-emerald-500' },
}
const statusOf = (t) => STATUS[t?.status] || STATUS.open

function Lane({ id, label, count, active, onClick, tone }) {
  const tones = {
    all: ['from-slate-50 to-white', 'text-dash-ink'],
    open: ['from-red-50 to-white', 'text-red-600'],
    in_progress: ['from-amber-50 to-white', 'text-amber-600'],
    resolved: ['from-emerald-50 to-white', 'text-emerald-600'],
  }[tone || id]
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`relative min-w-[120px] flex-1 overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-left ring-1 transition ${tones[0]} ${active ? 'ring-2 ring-forest-600 shadow-md' : 'ring-dash-line hover:-translate-y-0.5 hover:shadow-sm'}`}>
      <p className="text-[11.5px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-[26px] font-extrabold leading-none tabular-nums ${tones[1]}`}>{count ?? '-'}</p>
    </button>
  )
}

function TicketRow({ t, active, onOpen }) {
  const s = statusOf(t)
  const name = t.businessName || t.storeName || 'Unknown store'
  return (
    <button type="button" onClick={() => onOpen(t)} aria-current={active ? 'true' : undefined}
      className={`flex w-full gap-3 rounded-2xl p-3 text-left transition ${active ? 'bg-forest-50 ring-1 ring-forest-200' : 'hover:bg-slate-50'}`}>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarTone(t.storeId || name)}`}>{initials(name)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-[13.5px] ${t.status === 'open' ? 'font-bold text-dash-ink' : 'font-semibold text-slate-700'}`}>{name}</span>
          <span className="ml-auto flex-shrink-0 text-[11px] text-slate-400">{timeAgo(t.createdAt)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">{t.message || 'No message'}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          <span className="text-[11px] font-semibold text-slate-500">{s.label}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-500">{title(t.category)}</span>
          {t.replies?.length > 0 && <span className="text-[11px] text-forest-600">· {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</span>}
        </span>
      </span>
    </button>
  )
}

function Conversation({ t, onChanged, notify }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setReply(''); setError('') }, [t?.id])
  if (!t) return null
  const name = t.businessName || t.storeName || 'there'
  const s = statusOf(t)
  const waText = `Hello ${name}, this is Sellapage support about your message: "${String(t.message || '').slice(0, 140)}"`

  const setStatus = async (status) => {
    setBusy(status); setError('')
    const { ok, data } = await opsJson('/api/admin-tickets?action=update', { method: 'POST', body: { ticketId: t.id, status } })
    setBusy('')
    if (!ok) { setError(data.message || data.error || 'Could not update the ticket.'); return }
    notify?.(status === 'resolved' ? 'Ticket resolved.' : status === 'in_progress' ? 'Marked in progress.' : 'Ticket reopened.')
    onChanged({ ...t, status })
  }
  const send = async () => {
    setBusy('reply'); setError('')
    const { ok, data } = await opsJson('/api/admin-tickets?action=reply', { method: 'POST', body: { ticketId: t.id, message: reply } })
    setBusy('')
    if (!ok) { setError(data.message || data.error || 'The reply did not send.'); return }
    notify?.(`Reply emailed to ${t.email || 'the vendor'}.`)
    setReply('')
    onChanged({ ...t, status: data.status || t.status, replies: [...(t.replies || []), { at: new Date().toISOString(), byName: 'You', message: reply, channel: 'email' }] })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-dash-line pb-3">
        <Pill tone={s.tone} dot>{s.label}</Pill>
        <PlanPill plan={t.plan} />
        <Pill tone="slate">{title(t.category)}</Pill>
        <span className="ml-auto text-[11.5px] text-slate-400">{fmtDateTime(t.createdAt)}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
        <div className="flex gap-2.5">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(t.storeId || name)}`}>{initials(name)}</span>
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3">
            <p className="text-[11.5px] font-semibold text-slate-500">{name}</p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-dash-ink">{t.message}</p>
          </div>
        </div>
        {(t.replies || []).map((r, i) => (
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-forest-600 px-4 py-3 text-white shadow-sm">
              <p className="text-[11.5px] font-semibold text-green-100/90">{r.byName || 'Support'} · by {r.channel || 'email'} · {timeAgo(r.at)}</p>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{r.message}</p>
            </div>
          </div>
        ))}
        <div className="rounded-2xl bg-slate-50 p-3 text-[12.5px] text-slate-600 ring-1 ring-slate-100">
          <p className="flex items-center gap-1.5 font-semibold text-dash-ink"><Store size={13} /> {t.storeName ? `/${t.storeName}` : 'Store'}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {t.email && <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 hover:text-forest-600"><Mail size={12} /> {t.email}</a>}
            {t.whatsappNumber && <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {t.whatsappNumber}</span>}
            {t.storeName && <a href={storeUrl(t.storeName)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-forest-600"><ExternalLink size={12} /> Open store</a>}
          </div>
        </div>
      </div>

      <div className="border-t border-dash-line pt-3">
        <Notice tone="error" onClose={() => setError('')} className="mb-2">{error}</Notice>
        <label className="sr-only" htmlFor={`reply-${t.id}`}>Reply</label>
        <textarea id={`reply-${t.id}`} value={reply} onChange={(e) => setReply(e.target.value.slice(0, 4000))} rows={3}
          placeholder={t.email ? `Write a reply. It is emailed to ${t.email} from support.` : 'This vendor has no email on the ticket. Reply on WhatsApp.'}
          disabled={!t.email}
          className="w-full resize-none rounded-2xl border border-dash-line bg-slate-50 px-4 py-3 text-[13.5px] outline-none transition focus:border-forest-600 focus:bg-white focus:ring-4 focus:ring-forest-50 disabled:opacity-60" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Btn icon={<Send size={15} />} busy={busy === 'reply'} disabled={!t.email || reply.trim().length < 2} onClick={send}>Send email</Btn>
          {t.whatsappNumber && <a href={waLink(t.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-semibold text-white hover:bg-[#1fba5a]"><MessageCircle size={15} /> WhatsApp</a>}
          <span className="flex-1" />
          {t.status === 'open' && <Btn tone="soft" icon={<PlayCircle size={15} />} busy={busy === 'in_progress'} onClick={() => setStatus('in_progress')}>Start</Btn>}
          {t.status !== 'resolved' && <Btn tone="dark" icon={<CheckCircle2 size={15} />} busy={busy === 'resolved'} onClick={() => setStatus('resolved')}>Resolve</Btn>}
          {t.status === 'resolved' && <Btn tone="soft" icon={<RotateCcw size={15} />} busy={busy === 'open'} onClick={() => setStatus('open')}>Reopen</Btn>}
        </div>
      </div>
    </div>
  )
}

export default function SupportInbox({ notify }) {
  const [status, setStatus] = useState('open')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [openId, setOpenId] = useState(null)
  // The open ticket as last seen, so it stays on screen after an action moves
  // it out of the current lane (resolving an open ticket, say).
  const [pinned, setPinned] = useState(null)
  const query = useDebounced(q)
  useEffect(() => { setPage(1) }, [status, query])
  const path = `/api/admin-tickets?action=list&status=${status}&page=${page}&limit=${PER_PAGE}&search=${encodeURIComponent(query)}&n=${nonce}`
  const { data, loading, error } = useOpsData(path)
  const tickets = useMemo(() => data?.tickets || [], [data])
  const stats = data?.stats
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE))
  const current = tickets.find((t) => t.id === openId) || (pinned?.id === openId ? pinned : null)

  // On a wide screen the first ticket opens by itself.
  const wide = useMedia('(min-width: 1024px)')
  useEffect(() => { if (wide && !openId && tickets.length) setOpenId(tickets[0].id) }, [wide, openId, tickets])
  // Narrowing the window would otherwise pop the selected ticket open as a sheet.
  useEffect(() => { if (!wide) setOpenId(null) }, [wide])

  const changed = (t) => { setPinned(t); setNonce((n) => n + 1) }
  const open = (t) => { setOpenId(t.id); setPinned(t) }

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Lane id="open" label="Open" count={stats?.open} active={status === 'open'} onClick={() => setStatus('open')} />
        <Lane id="in_progress" label="In progress" count={stats?.inProgress} active={status === 'in_progress'} onClick={() => setStatus('in_progress')} />
        <Lane id="resolved" label="Resolved" count={stats?.resolved} active={status === 'resolved'} onClick={() => setStatus('resolved')} />
        <Lane id="all" label="Everything" count={stats?.total} active={status === 'all'} onClick={() => setStatus('all')} />
      </div>

      <Notice tone="error">{error}</Notice>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="flex min-h-[420px] min-w-0 flex-col rounded-3xl border border-dash-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:h-[calc(100dvh-250px)] lg:min-h-[560px]">
          <SearchBox value={q} onChange={setQ} placeholder="Search message, store, email or phone" busy={loading} />
          <div className="mt-2 flex-1 space-y-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
            {loading && !data ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-slate-50" />)
              : tickets.length === 0 ? <Empty icon={<Inbox size={22} />} title={query ? 'No ticket matches that' : status === 'open' ? 'Inbox zero' : 'Nothing here'} sub={query ? 'Try a store name, an email or part of the message.' : status === 'open' ? 'Every vendor message has been picked up.' : 'Pick another lane above.'} className="mt-2 border-none" />
                : tickets.map((t) => <TicketRow key={t.id} t={t} active={t.id === openId} onOpen={open} />)}
          </div>
          <Pager page={page} pages={pages} total={data?.total} perPage={PER_PAGE} onPage={setPage} className="mt-3 border-t border-dash-line pt-3" />
        </section>

        <section className="hidden rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block lg:h-[calc(100dvh-250px)] lg:min-h-[560px]">
          {current ? <Conversation t={current} onChanged={changed} notify={notify} />
            : <Empty icon={<Clock size={22} />} title="Pick a ticket" sub="The message, what was already said and the reply box open here." className="h-full border-none" />}
        </section>
      </div>

      {!wide && (
        <Drawer open={!!current} onClose={() => setOpenId(null)} title={current?.businessName || current?.storeName || 'Ticket'} sub={current?.email}>
          <Conversation t={current} onChanged={changed} notify={notify} />
        </Drawer>
      )}
    </div>
  )
}
