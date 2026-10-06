// src/ops/TeamAccess.jsx
//
// Team & Access: who can open Sellapage Ops, what each person can open, and
// their sessions. Invite (name, job title, email, tabs), change access,
// revoke tabs, pause, resume, remove, see and end sessions, and approve lost-
// authenticator resets. The server (ops-team.js) enforces every rule shown
// here; risky actions ask for the authenticator code (handled by OpsApp).
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  UserPlus, Crown, ShieldCheck, ShieldAlert, PauseCircle, PlayCircle, Trash2, MonitorSmartphone, Pencil, Mail, Clock,
  Search, X, Loader2, Check, AlertTriangle, RefreshCw, KeyRound, ChevronLeft, ChevronRight, Lock, Send, Users,
} from 'lucide-react'
import { opsJson } from './opsSession'
import { OPS_TABS, OPS_GROUPS, ROLE_TEMPLATES, opsTab } from '../utils/opsAccess'
import { initials, avatarTone, ago } from './opsUi'

const PER_PAGE = 8
const TITLE_SUGGESTIONS = ['CEO', 'CTO', 'COO', 'Customer Support Officer', 'System Analyst', 'Finance Officer', 'Operations Manager', 'Marketing Lead', 'Growth Associate', 'Compliance Officer']
const STATUS = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  paused: { label: 'Paused', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
  deleted: { label: 'Removed', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

function Sheet({ title, sub, onClose, children, footer }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" role="dialog" aria-modal="true">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl animate-in slide-in-from-right-8 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-dash-line px-5 py-4">
          <div className="min-w-0"><h2 className="font-display text-lg font-extrabold text-dash-ink">{title}</h2>{sub && <p className="mt-0.5 text-[12.5px] text-dash-muted">{sub}</p>}</div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-dash-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

function Confirm({ title, children, confirmLabel, tone = 'forest', busy, disabled, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-3xl">
        <h3 className="font-display text-lg font-extrabold text-dash-ink">{title}</h3>
        <div className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{children}</div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy || disabled}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 ${tone === 'red' ? 'bg-red-600 hover:bg-red-700' : tone === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-forest-600 hover:bg-forest'}`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Invite or edit: name, title, super admin, templates, grouped tab picker. */
function AccessForm({ me, person, onClose, onSaved }) {
  const editing = !!person
  const [name, setName] = useState(person?.name || '')
  const [title, setTitle] = useState(person?.title || '')
  const [email, setEmail] = useState(person?.email || '')
  const [isSuper, setIsSuper] = useState(person?.isSuper === true)
  const [tabs, setTabs] = useState(new Set(person?.tabs || []))
  const [template, setTemplate] = useState(person?.template || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmRisky, setConfirmRisky] = useState(null)
  const mine = new Set(me.isSuper ? OPS_TABS.map((t) => t.id) : me.tabs)
  const canGive = (id) => me.isSuper || mine.has(id) || (person?.tabs || []).includes(id)

  const toggle = (id) => setTabs((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const applyTemplate = (t) => { setTemplate(t.id); setTabs(new Set(t.tabs.filter(canGive))) }
  const groupAll = (gid, on) => setTabs((prev) => { const n = new Set(prev); OPS_TABS.filter((t) => t.group === gid && canGive(t.id)).forEach((t) => (on ? n.add(t.id) : n.delete(t.id))); return n })

  const save = async (confirmed = false) => {
    setError('')
    if (name.trim().length < 2) { setError('Enter their full name.'); return }
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    if (!isSuper && tabs.size === 0) { setError('Tick at least one tab, or make them a super admin.'); return }
    const newlyRisky = isSuper ? [] : [...tabs].filter((id) => opsTab(id)?.risky && !(person?.tabs || []).includes(id))
    if ((newlyRisky.length || (isSuper && !person?.isSuper)) && !confirmed) { setConfirmRisky({ tabs: newlyRisky, superNew: isSuper && !person?.isSuper }); return }
    setBusy(true)
    const body = editing
      ? { uid: person.uid, name: name.trim(), title: title.trim(), tabs: [...tabs], template, ...(me.isSuper ? { isSuper } : {}) }
      : { name: name.trim(), title: title.trim(), email: email.trim(), tabs: [...tabs], template, isSuper }
    const { ok, data } = await opsJson(`/api/ops-team?action=${editing ? 'update' : 'invite'}`, { method: 'POST', body })
    setBusy(false)
    setConfirmRisky(null)
    if (!ok) { setError(data.message || 'Could not save.'); return }
    onSaved(editing ? `${name.trim()}'s access is updated.` : data.emailed === false ? `Invite created, but the email did not send. Use Resend.` : `Invite sent to ${email.trim()}. It works for 48 hours.`)
  }

  return (
    <Sheet title={editing ? `Edit ${person.name}` : 'Invite staff'} sub={editing ? 'Changes apply on their very next click.' : 'They get an email link, choose a password and set up an authenticator.'} onClose={onClose}
      footer={<div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={() => save(false)} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest-600 py-2.5 text-[13.5px] font-semibold text-white hover:bg-forest disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : editing ? <><Check size={15} /> Save access</> : <><Send size={15} /> Send invite</>}
        </button>
      </div>}>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] text-red-700 ring-1 ring-red-100">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[12.5px] font-semibold text-dash-ink">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Deola Benedict" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-[14px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10" /></label>
        <label className="block"><span className="mb-1 block text-[12.5px] font-semibold text-dash-ink">Job title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} list="ops-titles" placeholder="e.g. Customer Support Officer" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-[14px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10" />
          <datalist id="ops-titles">{TITLE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist></label>
      </div>
      {!editing && (
        <label className="mt-3 block"><span className="mb-1 block text-[12.5px] font-semibold text-dash-ink">Work email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deola@sellapage.com.ng" className="h-11 w-full rounded-xl border border-gray-200 px-3 text-[14px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10" />
          <span className="mt-1 block text-[11.5px] text-dash-muted">Must not be an email that already runs a Sellapage store.</span></label>
      )}

      {me.isSuper && (
        <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 ring-1 transition ${isSuper ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-100'}`}>
          <input type="checkbox" checked={isSuper} onChange={(e) => setIsSuper(e.target.checked)} disabled={editing && person.uid === me.uid} className="mt-0.5 h-4 w-4 accent-[#d97706]" />
          <span><span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-dash-ink"><Crown size={14} className="text-amber-500" /> Super admin</span>
            <span className="block text-[12px] text-slate-500">Opens everything, including Team &amp; Access. Keep this to the founders.</span></span>
        </label>
      )}

      {!isSuper && (
        <>
          <p className="mb-2 mt-5 text-[12.5px] font-semibold text-dash-ink">Start from a role <span className="font-normal text-dash-muted">(then tick or untick anything)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${template === t.id ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-forest-50 hover:text-forest-600'}`}>{t.label}</button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {OPS_GROUPS.map((g) => {
              const items = OPS_TABS.filter((t) => t.group === g.id)
              const onCount = items.filter((t) => tabs.has(t.id)).length
              return (
                <div key={g.id} className="rounded-2xl ring-1 ring-dash-line">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500">{g.label} <span className="font-medium normal-case tracking-normal text-slate-400">{onCount}/{items.length}</span></span>
                    <button type="button" onClick={() => groupAll(g.id, onCount < items.length)} className="text-[12px] font-semibold text-forest-600 hover:underline">{onCount < items.length ? 'Tick all' : 'Clear'}</button>
                  </div>
                  <div className="grid grid-cols-1 gap-px border-t border-dash-line bg-dash-line sm:grid-cols-2">
                    {items.map((t) => {
                      const allowed = canGive(t.id)
                      return (
                        <label key={t.id} className={`flex items-start gap-2.5 bg-white px-3.5 py-2.5 ${allowed ? 'cursor-pointer hover:bg-forest-50/40' : 'cursor-not-allowed opacity-50'}`} title={allowed ? t.risky || '' : 'You can only give tabs you have yourself.'}>
                          <input type="checkbox" checked={tabs.has(t.id)} disabled={!allowed} onChange={() => toggle(t.id)} className="mt-0.5 h-4 w-4 accent-[#0b6b35]" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-[13px] font-medium text-dash-ink">{t.label}{t.risky && <ShieldAlert size={13} className="text-amber-500" aria-label="Sensitive" />}{!allowed && <Lock size={12} className="text-slate-400" />}</span>
                            {t.risky && <span className="block text-[11px] leading-snug text-amber-700/90">{t.risky}</span>}
                          </span>
                        </label>
                      )
                    })}
                    {items.length % 2 === 1 && <span aria-hidden="true" className="hidden bg-white sm:block" />}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {confirmRisky && (
        <Confirm title="Give sensitive access?" confirmLabel="Yes, give access" tone="amber" busy={busy} onCancel={() => setConfirmRisky(null)} onConfirm={() => save(true)}>
          <p>{name.trim() || 'This person'} will be able to:</p>
          <ul className="mt-2 space-y-1.5">
            {confirmRisky.superNew && <li className="flex gap-2"><Crown size={14} className="mt-0.5 flex-shrink-0 text-amber-500" /> <span><strong>Open everything</strong> as a super admin, including changing anyone&apos;s access.</span></li>}
            {confirmRisky.tabs.map((id) => <li key={id} className="flex gap-2"><ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-amber-500" /> <span><strong>{opsTab(id).label}:</strong> {opsTab(id).risky}</span></li>)}
          </ul>
          <p className="mt-3 text-[12.5px] text-slate-500">This is recorded in the Activity Log with your name.</p>
        </Confirm>
      )}
    </Sheet>
  )
}

function SessionsSheet({ person, onClose, onToast }) {
  const [rows, setRows] = useState(null)
  const [busyId, setBusyId] = useState('')
  const load = useCallback(async () => {
    const { ok, data } = await opsJson(`/api/ops-team?action=sessions&uid=${encodeURIComponent(person.uid)}`)
    setRows(ok ? data.sessions : [])
  }, [person.uid])
  useEffect(() => { load() }, [load])
  const end = async (id) => {
    setBusyId(id)
    const { ok, data } = await opsJson('/api/ops-team?action=end-session', { method: 'POST', body: { sessionId: id } })
    setBusyId('')
    if (ok) { onToast('Session ended. They are signed out on that device.'); load() } else onToast(data.message || 'Could not end that session.')
  }
  const reason = { logout: 'Signed out', idle: 'Timed out (idle)', expired: 'Reached 12 hours', paused: 'Access paused', deleted: 'Access removed', ended_by_admin: 'Ended by an admin', authenticator_reset: 'Authenticator reset' }
  return (
    <Sheet title={`${person.name}'s sessions`} sub="The last 20 sign-ins. End any you do not recognise." onClose={onClose}>
      {!rows ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-forest-600" /></div>
        : rows.length === 0 ? <p className="py-10 text-center text-[13.5px] text-dash-muted">No sign-ins yet.</p>
          : (
            <ul className="space-y-2">
              {rows.map((s) => (
                <li key={s.id} className="flex items-start gap-3 rounded-2xl p-3.5 ring-1 ring-dash-line">
                  <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${s.live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><MonitorSmartphone size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-dash-ink">{s.device || 'Unknown device'}
                      {s.live && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active</span>}
                      {s.current && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">This device</span>}</p>
                    <p className="mt-0.5 text-[12px] text-dash-muted">IP {s.ip || 'unknown'} · signed in {new Date(s.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    <p className="text-[12px] text-dash-muted">{s.live ? `Last active ${ago(s.lastSeenAt)}` : reason[s.endReason] || (s.endedAt ? 'Ended' : 'Expired')}</p>
                  </div>
                  {s.live && !s.current && (
                    <button type="button" onClick={() => end(s.id)} disabled={busyId === s.id} className="rounded-xl bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                      {busyId === s.id ? <Loader2 size={13} className="animate-spin" /> : 'Sign out'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
    </Sheet>
  )
}

export default function TeamAccess({ me }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('active')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(null) // { person } | { person: null }
  const [sessionsOf, setSessionsOf] = useState(null)
  const [action, setAction] = useState(null) // { kind, person }
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { ok, data: d } = await opsJson('/api/ops-team?action=list')
    if (ok) { setData(d); setError('') } else setError(d.message || 'Could not load the team.')
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t) }, [toast])

  const people = useMemo(() => {
    const list = (data?.staff || []).filter((p) => (filter === 'all' ? true : p.status === filter))
    const needle = q.trim().toLowerCase()
    return list.filter((p) => !needle || `${p.name} ${p.title} ${p.email}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.isSuper - a.isSuper) || a.name.localeCompare(b.name))
  }, [data, filter, q])
  const pages = Math.max(1, Math.ceil(people.length / PER_PAGE))
  const shown = people.slice((Math.min(page, pages) - 1) * PER_PAGE, Math.min(page, pages) * PER_PAGE)
  const counts = useMemo(() => {
    const s = data?.staff || []
    return { active: s.filter((p) => p.status === 'active').length, paused: s.filter((p) => p.status === 'paused').length, deleted: s.filter((p) => p.status === 'deleted').length, supers: s.filter((p) => p.isSuper && p.status === 'active').length }
  }, [data])

  const post = async (act, body, done) => {
    setBusy(true)
    const { ok, data: d } = await opsJson(`/api/ops-team?action=${act}`, { method: 'POST', body })
    setBusy(false)
    if (!ok) { setToast(d.message || 'That did not work.'); return false }
    setToast(done)
    load()
    return true
  }

  const runAction = async () => {
    const p = action.person
    const ok = action.kind === 'pause' ? await post('pause', { uid: p.uid, reason }, `${p.name} is paused and signed out everywhere.`)
      : action.kind === 'resume' ? await post('resume', { uid: p.uid }, `${p.name} can sign in again.`)
        : await post('delete', { uid: p.uid, reason }, `${p.name} has been removed. Their history stays in the Activity Log.`)
    if (ok) { setAction(null); setReason(''); setTyped('') }
  }

  if (error && !data) return <div className="rounded-2xl bg-red-50 p-4 text-[13.5px] text-red-700">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Try again</button></div>
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-forest-600" /></div>

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight text-dash-ink"><Users size={20} className="text-forest-600" /> Team &amp; Access</h2>
          <p className="mt-0.5 text-[13px] text-dash-muted">Who can open Sellapage Ops, what they can open, and where they are signed in.</p>
        </div>
        <button type="button" onClick={() => setForm({ person: null })} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm hover:bg-forest"><UserPlus size={16} /> Invite staff</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Active', counts.active, 'text-emerald-700'], ['Super admins', counts.supers, 'text-amber-600'], ['Paused', counts.paused, 'text-amber-700'], ['Pending invites', data.invites.length, 'text-sky-700']].map(([l, n, c]) => (
          <div key={l} className="rounded-2xl bg-white p-4 ring-1 ring-dash-line"><p className="text-[12px] font-medium text-dash-muted">{l}</p><p className={`mt-1 font-display text-2xl font-extrabold ${c}`}>{n}</p></div>
        ))}
      </div>

      {data.resets.length > 0 && (
        <div className="space-y-2">
          {data.resets.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center">
              <KeyRound size={18} className="flex-shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1 text-[13.5px] text-amber-900"><strong>{r.name}</strong> asked to reset their authenticator {ago(r.createdAt)} from {r.device || 'a device'}. Call them to confirm it is really them before approving.</div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => post('reject-reset', { requestId: r.id }, 'Reset declined.')} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 ring-1 ring-amber-200">Decline</button>
                <button type="button" disabled={busy} onClick={() => post('approve-reset', { requestId: r.id }, `${r.name} can now sign in and set up a new authenticator.`)} className="rounded-xl bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white">Approve reset</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search name, job title or email" className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-forest-600" />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 no-scrollbar">
          {[['active', `Active ${counts.active}`], ['paused', `Paused ${counts.paused}`], ['deleted', `Removed ${counts.deleted}`], ['all', 'All']].map(([id, l]) => (
            <button key={id} type="button" onClick={() => { setFilter(id); setPage(1) }} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${filter === id ? 'bg-white text-dash-ink shadow-sm' : 'text-slate-500 hover:text-dash-ink'}`}>{l}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-[13.5px] text-dash-muted">No one here yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((p) => {
            const self = p.uid === me.uid
            const locked = p.isSuper && !me.isSuper
            const st = STATUS[p.status] || STATUS.active
            return (
              <article key={p.uid} className={`flex flex-col rounded-2xl bg-white p-4 ring-1 transition hover:shadow-md ${p.status === 'deleted' ? 'opacity-70 ring-dash-line' : 'ring-dash-line'}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${avatarTone(p.uid)}`}>{initials(p.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold text-dash-ink">
                      {p.name}
                      {self && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">You</span>}
                      {p.isSuper && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 ring-1 ring-amber-100"><Crown size={11} /> Super admin</span>}
                    </p>
                    <p className="truncate text-[12.5px] font-medium text-forest-700">{p.title || 'No job title yet'}</p>
                    <p className="truncate text-[12px] text-dash-muted">{p.email}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.isSuper ? <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-100">Every tab</span>
                    : p.tabs.slice(0, 5).map((id) => <span key={id} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-100">{opsTab(id)?.label || id}</span>)}
                  {!p.isSuper && p.tabs.length > 5 && <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 ring-1 ring-slate-100">+{p.tabs.length - 5} more</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-dash-muted">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> Last active {ago(p.lastSeenAt || p.lastLoginAt)}</span>
                  <span className={`inline-flex items-center gap-1 ${p.totpEnabled ? 'text-emerald-700' : 'text-amber-700'}`}><ShieldCheck size={12} /> {p.totpEnabled ? `Authenticator on · ${p.recoveryLeft} recovery codes` : 'Authenticator not set up'}</span>
                  {p.status === 'paused' && p.pausedReason && <span className="text-amber-700">Paused: {p.pausedReason}</span>}
                </div>
                {p.status !== 'deleted' && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-dash-line pt-3">
                    <button type="button" onClick={() => setSessionsOf(p)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"><MonitorSmartphone size={14} /> Sessions</button>
                    {!self && !locked && (
                      <>
                        <button type="button" onClick={() => setForm({ person: p })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-forest-600 hover:bg-forest-50"><Pencil size={14} /> Edit access</button>
                        {p.status === 'paused'
                          ? <button type="button" onClick={() => setAction({ kind: 'resume', person: p })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-emerald-700 hover:bg-emerald-50"><PlayCircle size={14} /> Resume</button>
                          : <button type="button" onClick={() => setAction({ kind: 'pause', person: p })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-amber-700 hover:bg-amber-50"><PauseCircle size={14} /> Pause</button>}
                        <button type="button" onClick={() => setAction({ kind: 'delete', person: p })} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove</button>
                      </>
                    )}
                    {locked && <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-slate-400"><Lock size={12} /> Only a super admin can change this</span>}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-1.5" aria-label="Pages">
          <button type="button" onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page <= 1} className="rounded-full border border-gray-200 bg-white p-2 disabled:opacity-40" aria-label="Previous"><ChevronLeft size={15} /></button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => setPage(n)} className={`h-9 min-w-9 rounded-full px-2 text-[13px] font-semibold ${n === page ? 'bg-forest-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{n}</button>
          ))}
          <button type="button" onClick={() => setPage((n) => Math.min(pages, n + 1))} disabled={page >= pages} className="rounded-full border border-gray-200 bg-white p-2 disabled:opacity-40" aria-label="Next"><ChevronRight size={15} /></button>
        </nav>
      )}

      {data.invites.length > 0 && (
        <section className="rounded-2xl bg-white ring-1 ring-dash-line">
          <h3 className="flex items-center gap-2 border-b border-dash-line px-4 py-3 text-[13.5px] font-bold text-dash-ink"><Mail size={15} className="text-sky-600" /> Pending invites</h3>
          <ul className="divide-y divide-dash-line">
            {data.invites.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-dash-ink">{i.name} {i.isSuper && <Crown size={12} className="inline text-amber-500" />} <span className="font-normal text-dash-muted">· {i.title || 'No job title'}</span></p>
                  <p className="text-[12px] text-dash-muted">{i.email} · invited by {i.createdByName || 'a super admin'} {ago(i.createdAt)} · {i.expired ? <span className="font-semibold text-red-600">expired</span> : `expires ${new Date(i.expiresAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" disabled={busy} onClick={() => post('resend-invite', { inviteId: i.id }, `A fresh link was sent to ${i.email}.`)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-200"><RefreshCw size={13} /> Resend</button>
                  <button type="button" disabled={busy} onClick={() => post('cancel-invite', { inviteId: i.id }, 'Invite cancelled. The link no longer works.')} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50">Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && <AccessForm me={me} person={form.person} onClose={() => setForm(null)} onSaved={(msg) => { setForm(null); setToast(msg); load() }} />}
      {sessionsOf && <SessionsSheet person={sessionsOf} onClose={() => setSessionsOf(null)} onToast={setToast} />}
      {action && (
        <Confirm
          title={action.kind === 'pause' ? `Pause ${action.person.name}?` : action.kind === 'resume' ? `Restore ${action.person.name}'s access?` : `Remove ${action.person.name}?`}
          confirmLabel={action.kind === 'pause' ? 'Pause access' : action.kind === 'resume' ? 'Restore access' : 'Remove for good'}
          tone={action.kind === 'delete' ? 'red' : action.kind === 'pause' ? 'amber' : 'forest'}
          busy={busy}
          disabled={action.kind === 'delete' && typed.trim().toLowerCase() !== action.person.name.split(' ')[0].toLowerCase()}
          onCancel={() => { setAction(null); setReason(''); setTyped('') }}
          onConfirm={runAction}
        >
          {action.kind === 'pause' && <p>They are signed out everywhere and cannot sign in until you resume them. Their tabs are kept.</p>}
          {action.kind === 'resume' && <p>They can sign in again with their password and authenticator, with the same tabs as before.</p>}
          {action.kind === 'delete' && <p className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-500" /> Their login stops working for good and every session ends. Their history stays in the Activity Log. To bring them back later, invite them again.</p>}
          {action.kind !== 'resume' && (
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Reason (recorded in the Activity Log)"
              className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-[13.5px] outline-none focus:border-forest-600" />
          )}
          {action.kind === 'delete' && (
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type "${action.person.name.split(' ')[0]}" to confirm`} className="mt-2 h-10 w-full rounded-xl border border-gray-200 px-3 text-[13.5px] outline-none focus:border-red-400" />
          )}
        </Confirm>
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-[120] max-w-[92vw] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-[13px] text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">{toast}</div>}
    </div>
  )
}
