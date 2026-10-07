// src/ops/OutreachTracker.jsx
//
// The Outreach Tracker tab (ops-outreach). From the CEO's plan:
//   Reactivation   merchants in a segment ("signed up, nothing set up"...)
//   Direct outreach prospects who have not signed up yet
//   Measure        Outreach -> Response -> Sign-up / came back -> Store
//                  complete -> Shared -> First customer, per message angle
//                  and per channel, so the message that works wins.
// The last steps tick themselves (from the merchant fact sheet): nobody has to
// remember to update them.
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Users, Search, X, Loader2, MessageCircle, Phone, Mail, Copy, Check, ChevronLeft, ChevronRight, Kanban, List, UserPlus, Send,
  Sparkles, Store, Share2, RefreshCcw, Instagram, Megaphone, Target, Trash2,
} from 'lucide-react'
import { Card, Ring, Shimmer, useOpsData } from './opsKit'
import { opsJson } from './opsSession'
import { ago } from './opsUi'
import SegmentDrawer from './SegmentDrawer'

const STATUSES = [
  { id: 'to_contact', label: 'To contact', dot: 'bg-slate-400' },
  { id: 'contacted', label: 'Contacted', dot: 'bg-sky-500' },
  { id: 'no_answer', label: 'No answer', dot: 'bg-amber-500' },
  { id: 'responded', label: 'Responded', dot: 'bg-violet-500' },
  { id: 'interested', label: 'Interested', dot: 'bg-emerald-500' },
  { id: 'not_interested', label: 'Not interested', dot: 'bg-rose-500' },
]
const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0]
const CHANNELS = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['call', 'Phone call'], ['sms', 'SMS'], ['email', 'Email'], ['community', 'Community'], ['in_person', 'In person'], ['other', 'Other']]
const channelLabel = (id) => CHANNELS.find((c) => c[0] === id)?.[1] || id
// The three angles from the CEO's plan, plus reactivation and referral.
const ANGLES = {
  storefront: { label: 'Storefront', icon: Store, text: (r, me) => `Hi ${first(r.name)}, this is ${first(me.name)} from Sellapage. You already sell through Instagram and WhatsApp. What if you had one link where customers could see everything you sell?` },
  orders: { label: 'Order management', icon: MessageCircle, text: (r, me) => `Hi ${first(r.name)}, ${first(me.name)} from Sellapage here. Still handling product enquiries and orders across WhatsApp chats? Sellapage gives your business a proper storefront and a clean order flow.` },
  presence: { label: 'Professional presence', icon: Sparkles, text: (r, me) => `Hi ${first(r.name)}, ${first(me.name)} from Sellapage. Give your customers one place to see your products and prices and order, instead of sending catalogues again and again.` },
  reactivation: { label: 'Let’s get your store live', icon: RefreshCcw, text: (r, me) => `Hi ${first(r.name)}, this is ${first(me.name)} from Sellapage. I saw you started ${r.business || 'your store'}. Can I help you get it live today? It takes about 10 minutes, and I'll walk you through it.` },
  referral: { label: 'Referral', icon: Share2, text: (r, me) => `Hi ${first(r.name)}, ${first(me.name)} from Sellapage. Do you know another business owner who could benefit from having a proper online storefront? If they join, you both get rewarded.` },
  other: { label: 'Other', icon: Megaphone, text: (r, me) => `Hi ${first(r.name)}, this is ${first(me.name)} from Sellapage.` },
}
function first(name) { return String(name || '').trim().split(/\s+/)[0] || 'there' }
const intlPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('234')) return d
  return `234${d.replace(/^0/, '')}`
}
const OUTCOMES = [['signedUp', 'Signed up', UserPlus], ['returned', 'Came back', RefreshCcw], ['completed', 'Store complete', Store], ['shared', 'Shared', Share2], ['interaction', 'First customer', Target]]

function OutcomeDots({ r }) {
  const list = OUTCOMES.filter(([k]) => (k === 'signedUp' ? r.kind === 'prospect' : k === 'returned' ? r.kind === 'merchant' : true))
  return (
    <span className="flex gap-1">
      {list.map(([k, l, Icon]) => <span key={k} title={l} className={`flex h-5 w-5 items-center justify-center rounded-full ${r.outcome?.[k] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}><Icon size={11} /></span>)}
    </span>
  )
}

function ContactCard({ r, onOpen }) {
  const Angle = ANGLES[r.angle]?.icon || Megaphone
  return (
    <button type="button" onClick={() => onOpen(r)} className="w-full rounded-2xl border border-dash-line bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-semibold text-dash-ink">{r.business || r.name}</p>
        <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.kind === 'prospect' ? 'bg-sky-50 text-sky-700' : 'bg-forest-50 text-forest-700'}`}>{r.kind === 'prospect' ? 'Prospect' : 'Merchant'}</span>
      </div>
      {r.business && r.name && <p className="truncate text-[11.5px] text-slate-500">{r.name}</p>}
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500"><Angle size={11} /> {ANGLES[r.angle]?.label} · {channelLabel(r.channel)}</p>
      {r.notes?.length > 0 && <p className="mt-1.5 line-clamp-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">{r.notes[r.notes.length - 1].text}</p>}
      <div className="mt-2 flex items-center justify-between"><OutcomeDots r={r} /><span className="text-[10.5px] text-slate-400">{ago(r.updatedAt)}</span></div>
    </button>
  )
}

function ContactDrawer({ r, me, onClose, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const [angle, setAngle] = useState(r.angle)
  const message = (ANGLES[angle] || ANGLES.other).text(r, me)
  const phone = intlPhone(r.phone)
  const save = async (body, label) => {
    setBusy(label)
    const { ok } = await opsJson('/api/ops-outreach?action=update', { method: 'POST', body: { id: r.id, ...body } })
    setBusy('')
    if (ok) { onChanged(); if (body.note) setNote('') }
  }
  const contactVia = (channel, href) => {
    if (r.status === 'to_contact') save({ status: 'contacted', channel, angle }, 'contact')
    if (href) window.open(href, '_blank', 'noopener')
  }
  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" role="dialog" aria-modal="true">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl animate-in slide-in-from-right-8 duration-200">
        <div className="bg-gradient-to-br from-[#034e22] to-[#0b6b35] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-200">{r.kind === 'prospect' ? 'Prospect' : 'Merchant'}{r.segmentAtContact ? ` · ${r.segmentAtContact.replace(/_/g, ' ')}` : ''}</p>
              <h2 className="mt-1 truncate font-display text-xl font-extrabold">{r.business || r.name}</h2>
              <p className="truncate text-[12.5px] text-green-100/85">{[r.name, r.phone, r.email, r.handle && `@${r.handle}`].filter(Boolean).join(' · ')}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-green-100 hover:bg-white/10" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {phone && <button type="button" onClick={() => contactVia('whatsapp', `https://wa.me/${phone}?text=${encodeURIComponent(message)}`)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-[12.5px] font-semibold text-white"><MessageCircle size={14} /> WhatsApp</button>}
            {phone && <a href={`tel:+${phone}`} onClick={() => contactVia('call')} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[12.5px] font-semibold ring-1 ring-white/20"><Phone size={14} /> Call</a>}
            {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent('Your Sellapage store')}&body=${encodeURIComponent(message)}`} onClick={() => contactVia('email')} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[12.5px] font-semibold ring-1 ring-white/20"><Mail size={14} /> Email</a>}
            {r.handle && r.kind === 'prospect' && <a href={`https://instagram.com/${r.handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[12.5px] font-semibold ring-1 ring-white/20"><Instagram size={14} /> Profile</a>}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button key={s.id} type="button" disabled={!!busy} onClick={() => save({ status: s.id }, s.id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${r.status === s.id ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line hover:bg-slate-50'}`}>
                  {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <span className={`h-2 w-2 rounded-full ${s.dot}`} />} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">What happened after</p>
            <ul className="grid grid-cols-2 gap-2">
              {OUTCOMES.filter(([k]) => (k === 'signedUp' ? r.kind === 'prospect' : k === 'returned' ? r.kind === 'merchant' : true)).map(([k, l, Icon]) => (
                <li key={k} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px] font-semibold ${r.outcome?.[k] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${r.outcome?.[k] ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}>{r.outcome?.[k] ? <Check size={13} strokeWidth={3} /> : <Icon size={12} />}</span> {l}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-slate-400">These tick by themselves when the merchant does it{r.contactedAt ? ` after ${new Date(r.contactedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ' after you contact them'}.</p>
            {r.store && <p className="mt-2 text-[12px] text-slate-500">Store now: {r.store.products} products · {r.store.visits} visits · {r.store.interactions} customers · last in {r.store.lastActiveAt ? ago(r.store.lastActiveAt) : 'never'}</p>}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Message</p>
              <select value={angle} onChange={(e) => { setAngle(e.target.value); save({ angle: e.target.value }, 'angle') }} className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] outline-none">
                {Object.entries(ANGLES).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
              </select>
            </div>
            <p className="rounded-2xl bg-forest-50/60 p-3.5 text-[13px] leading-relaxed text-slate-700 ring-1 ring-forest-100">{message}</p>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(message).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-600 hover:underline">{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy message</>}</button>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Notes</p>
            <ol className="space-y-2">
              {(r.notes || []).slice().reverse().map((n, i) => (
                <li key={i} className="rounded-2xl bg-slate-50 px-3 py-2.5"><p className="text-[13px] text-slate-700">{n.text}</p><p className="mt-1 text-[11px] text-slate-400">{n.byName} · {ago(n.at)}</p></li>
              ))}
              {!r.notes?.length && <li className="text-[12.5px] text-slate-400">No notes yet. What did they say?</li>}
            </ol>
            <div className="mt-2 flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) save({ note }, 'note') }} placeholder="e.g. Asked how delivery works, follow up Friday" className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-600" />
              <button type="button" disabled={!note.trim() || busy === 'note'} onClick={() => save({ note }, 'note')} className="rounded-xl bg-forest-600 px-3 text-white disabled:opacity-40" aria-label="Add note">{busy === 'note' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dash-line px-5 py-3 text-[11.5px] text-slate-400">
          <span>Added by {r.createdByName} {ago(r.createdAt)}</span>
          <button type="button" onClick={async () => { await opsJson('/api/ops-outreach?action=archive', { method: 'POST', body: { id: r.id } }); onChanged(); onClose() }} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"><Trash2 size={12} /> Remove from board</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ProspectModal({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', business: '', phone: '', email: '', handle: '', channel: 'instagram', angle: 'storefront', note: '', contacted: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { ok, data } = await opsJson('/api/ops-outreach?action=add-prospect', { method: 'POST', body: f })
    setBusy(false)
    if (!ok) { setError(data.message || 'Could not add them.'); return }
    onSaved()
  }
  const input = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:border-forest-600'
  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-lg rounded-t-[28px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[28px]">
        <div className="flex items-start justify-between"><div><h2 className="font-display text-lg font-extrabold text-dash-ink">Add a prospect</h2><p className="text-[12.5px] text-dash-muted">Someone who sells online but is not on Sellapage yet. We&apos;ll spot them when they sign up.</p></div><button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{error}</p>}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input value={f.name} onChange={set('name')} placeholder="Their name" className={input} />
          <input value={f.business} onChange={set('business')} placeholder="Business name" className={input} />
          <input value={f.phone} onChange={set('phone')} placeholder="Phone / WhatsApp" className={input} inputMode="tel" />
          <input value={f.handle} onChange={set('handle')} placeholder="@instagram or tiktok" className={input} />
          <input value={f.email} onChange={set('email')} placeholder="Email (optional)" className={`${input} sm:col-span-2`} type="email" />
          <select value={f.channel} onChange={set('channel')} className={input}>{CHANNELS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
          <select value={f.angle} onChange={set('angle')} className={input}>{Object.entries(ANGLES).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}</select>
          <textarea value={f.note} onChange={set('note')} rows={2} placeholder="Notes (what they sell, where you found them)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-600 sm:col-span-2" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-[13px] text-slate-600"><input type="checkbox" checked={f.contacted} onChange={set('contacted')} className="h-4 w-4 accent-[#0b6b35]" /> I&apos;ve already reached out to them</label>
        <button type="submit" disabled={busy} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-forest-600 text-[14px] font-semibold text-white hover:bg-forest disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <><UserPlus size={15} /> Add prospect</>}</button>
      </form>
    </div>,
    document.body,
  )
}

const SEGMENT_PICKS = [
  { id: 'not_set_up', label: 'Signed up, nothing set up', about: 'No logo, no description and no products yet.' },
  { id: 'no_products', label: 'Set up, no products', about: 'Has a logo or description but no products or services.' },
  { id: 'complete_not_shared', label: 'Has products, never shared', about: 'Products are in, but the store link was never shared.' },
  { id: 'shared_no_activity', label: 'Shared, no customers yet', about: 'Shared the store but no enquiry, order or booking yet.' },
  { id: 'went_quiet', label: 'Went quiet', about: 'Was set up or had customers, but no sign-in for 30+ days.' },
]

export default function OutreachTracker({ me }) {
  const [view, setView] = useState('board')
  const [filters, setFilters] = useState({ q: '', angle: '', channel: '', kind: '', mine: false, status: '' })
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [open, setOpen] = useState(null)
  const [prospect, setProspect] = useState(false)
  const [pickSeg, setPickSeg] = useState(false)
  const [segment, setSegment] = useState(null)
  const qs = new URLSearchParams({ action: 'list', page: String(view === 'board' ? 1 : page), limit: view === 'board' ? '50' : '15', n: String(nonce) })
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k === 'mine' ? 'owner' : k, k === 'mine' ? 'me' : v) })
  const list = useOpsData(`/api/ops-outreach?${qs}`)
  const stats = useOpsData(`/api/ops-outreach?action=stats&n=${nonce}`)
  const refresh = () => setNonce((n) => n + 1)
  const s = stats.data?.totals
  const responseRate = s?.contacted ? Math.round((s.responded / s.contacted) * 100) : 0
  const columns = useMemo(() => STATUSES.map((st) => ({ ...st, rows: (list.data?.rows || []).filter((r) => r.status === st.id) })), [list.data])
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1
  const current = open && (list.data?.rows || []).find((r) => r.id === open.id)

  return (
    <div className="space-y-5">
      {/* the pipeline at a glance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:items-start">
        <Card className="bg-gradient-to-br from-white to-[#f1faf4]">
          {!s ? <Shimmer className="h-28" /> : (
            <div className="flex flex-wrap items-center gap-5">
              <Ring value={responseRate} size={110} color="#7c3aed" track="#ede9fe"><span className="text-center"><span className="block font-display text-[24px] font-extrabold text-dash-ink">{responseRate}%</span><span className="block text-[10.5px] text-slate-500">reply rate</span></span></Ring>
              <dl className="grid flex-1 grid-cols-3 gap-3 text-center">
                {[['On the board', s.onBoard], ['Contacted', s.contacted], ['Replied', s.responded], ['Came back', s.returned], ['Signed up', s.signedUp], ['First customer', s.interaction]].map(([l, n]) => (
                  <div key={l}><dt className="text-[11px] text-slate-500">{l}</dt><dd className="font-display text-[22px] font-extrabold text-dash-ink">{n}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </Card>
        <Card title="Which message works" sub="Contacted, replied and wins (came back, signed up, completed or first customer) per angle.">
          {!stats.data ? <Shimmer className="h-28" /> : stats.data.byAngle.length === 0 ? <p className="py-6 text-center text-[13px] text-slate-500">Contact a few merchants and the winning message shows up here.</p> : (
            <ul className="space-y-3">
              {stats.data.byAngle.map((a) => {
                const wins = Math.max(a.returned + a.signedUp, a.completed, a.interaction)
                return (
                  <li key={a.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[12.5px]"><span className="truncate font-semibold text-dash-ink">{ANGLES[a.id]?.label || a.id}</span><span className="flex-shrink-0 text-slate-500">{a.contacted} contacted</span></div>
                    <div className="grid grid-cols-[52px_1fr_28px] items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      <span>Replied</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-violet-400 transition-all duration-700" style={{ width: `${a.contacted ? Math.min(100, (a.responded / a.contacted) * 100) : 0}%` }} /></span><span className="text-right font-semibold tabular-nums text-dash-ink">{a.responded}</span>
                      <span>Won</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${a.contacted ? Math.min(100, (wins / a.contacted) * 100) : 0}%` }} /></span><span className="text-right font-semibold tabular-nums text-dash-ink">{wins}</span>
                    </div>
                  </li>
                )
              })}
              {stats.data.byChannel.length > 0 && <li className="flex flex-wrap gap-1.5 pt-1">{stats.data.byChannel.map((c) => <span key={c.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] text-slate-600">{channelLabel(c.id)}: {c.responded}/{c.contacted}</span>)}</li>}
            </ul>
          )}
        </Card>
      </div>

      {/* controls */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(e) => { setFilters({ ...filters, q: e.target.value }); setPage(1) }} placeholder="Search name, business, phone" className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-forest-600" /></label>
        <div className="flex flex-wrap gap-2">
          <select value={filters.angle} onChange={(e) => { setFilters({ ...filters, angle: e.target.value }); setPage(1) }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none"><option value="">Every message</option>{Object.entries(ANGLES).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}</select>
          <select value={filters.kind} onChange={(e) => { setFilters({ ...filters, kind: e.target.value }); setPage(1) }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none"><option value="">Merchants and prospects</option><option value="merchant">Merchants</option><option value="prospect">Prospects</option></select>
          <button type="button" onClick={() => setFilters({ ...filters, mine: !filters.mine })} className={`h-10 rounded-xl px-3 text-[13px] font-semibold ring-1 ${filters.mine ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-gray-200'}`}>Mine</button>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setView('board')} className={`rounded-lg px-2.5 py-1.5 ${view === 'board' ? 'bg-white shadow-sm' : 'text-slate-500'}`} aria-label="Board view"><Kanban size={15} /></button>
            <button type="button" onClick={() => setView('list')} className={`rounded-lg px-2.5 py-1.5 ${view === 'list' ? 'bg-white shadow-sm' : 'text-slate-500'}`} aria-label="List view"><List size={15} /></button>
          </div>
          <button type="button" onClick={() => setPickSeg(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-forest-600 ring-1 ring-forest-200 hover:bg-forest-50"><Users size={15} /> Add merchants</button>
          <button type="button" onClick={() => setProspect(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-forest-600 px-3 text-[13px] font-semibold text-white hover:bg-forest"><Plus size={15} /> Prospect</button>
        </div>
      </div>

      {list.loading && !list.data ? <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-60" />)}</div> : list.data?.total === 0 && !filters.q && !filters.angle && !filters.kind && !filters.mine ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><Target size={24} /></span>
          <p className="mt-4 text-[15px] font-bold text-dash-ink">Your outreach board is empty</p>
          <p className="mt-1 max-w-md text-[13px] text-slate-500">Start with a segment from the growth plan (for example, merchants who signed up but never set up), or add a prospect you found on Instagram.</p>
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => setPickSeg(true)} className="rounded-xl bg-forest-600 px-4 py-2.5 text-[13px] font-semibold text-white">Add merchants</button><button type="button" onClick={() => setProspect(true)} className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-dash-ink ring-1 ring-dash-line">Add a prospect</button></div>
        </div>
      ) : view === 'board' ? (
        <div className="-mx-3 snap-x snap-mandatory overflow-x-auto px-3 pb-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3">
            {columns.map((c) => (
              <section key={c.id} className="flex min-h-[220px] w-[264px] flex-shrink-0 snap-start flex-col rounded-3xl bg-slate-100/70 p-2.5">
                <h3 className="mb-2 flex items-center gap-2 px-1.5 text-[12.5px] font-bold text-dash-ink"><span className={`h-2 w-2 rounded-full ${c.dot}`} />{c.label}<span className="ml-auto rounded-full bg-white px-2 text-[11px] font-semibold text-slate-500">{list.data?.counts?.[c.id] ?? c.rows.length}</span></h3>
                <div className="space-y-2">{c.rows.map((r) => <ContactCard key={r.id} r={r} onOpen={setOpen} />)}{!c.rows.length && <p className="px-2 py-6 text-center text-[11.5px] text-slate-400">Nobody here</p>}</div>
              </section>
            ))}
          </div>
          {list.data?.total > 50 && <p className="mt-2 text-center text-[12px] text-slate-500">Showing the 50 most recently updated. Switch to the list to see all {list.data.total}.</p>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-dash-line bg-white">
          <ul className="divide-y divide-dash-line">
            {(list.data?.rows || []).map((r) => {
              const st = statusOf(r.status)
              return (
                <li key={r.id}><button type="button" onClick={() => setOpen(r)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:flex-nowrap">
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-dash-ink">{r.business || r.name}</span><span className="block truncate text-[12px] text-slate-500">{[r.name, r.phone, channelLabel(r.channel), ANGLES[r.angle]?.label].filter(Boolean).join(' · ')}</span></span>
                  <OutcomeDots r={r} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600"><span className={`h-2 w-2 rounded-full ${st.dot}`} />{st.label}</span>
                  <span className="w-16 text-right text-[11px] text-slate-400">{ago(r.updatedAt)}</span>
                </button></li>
              )
            })}
            {list.data && !list.data.rows.length && <li className="px-4 py-10 text-center text-[13px] text-slate-500">Nothing matches.</li>}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-1.5 border-t border-dash-line py-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Previous"><ChevronLeft size={15} /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((n) => <button key={n} type="button" onClick={() => setPage(n)} className={`h-8 min-w-8 rounded-full px-2 text-[12.5px] font-semibold ${n === page ? 'bg-forest-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{n}</button>)}
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border border-gray-200 p-1.5 disabled:opacity-40" aria-label="Next"><ChevronRight size={15} /></button>
            </div>
          )}
        </div>
      )}

      {pickSeg && createPortal(
        <div className="fixed inset-0 z-[112] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[28px]">
            <div className="flex items-start justify-between"><div><h2 className="font-display text-lg font-extrabold text-dash-ink">Who do you want to reach?</h2><p className="text-[12.5px] text-dash-muted">Pick a segment, then tick the merchants to add.</p></div><button type="button" onClick={() => setPickSeg(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div>
            <ul className="mt-4 space-y-2">
              {SEGMENT_PICKS.map((sg) => <li key={sg.id}><button type="button" onClick={() => { setSegment(sg); setPickSeg(false) }} className="w-full rounded-2xl border border-dash-line p-3.5 text-left transition hover:border-forest-200 hover:bg-forest-50/40"><span className="block text-[13.5px] font-semibold text-dash-ink">{sg.label}</span><span className="block text-[12px] text-slate-500">{sg.about}</span></button></li>)}
            </ul>
          </div>
        </div>,
        document.body,
      )}
      {segment && <SegmentDrawer seg={segment} canOutreach onClose={() => setSegment(null)} onAdded={refresh} />}
      {prospect && <ProspectModal onClose={() => setProspect(false)} onSaved={() => { setProspect(false); refresh() }} />}
      {current && <ContactDrawer r={current} me={me} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  )
}
