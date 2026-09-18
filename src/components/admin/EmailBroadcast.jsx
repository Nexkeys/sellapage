// src/components/admin/EmailBroadcast.jsx
//
// Admin > Email Broadcast. Write an email (drag-and-drop designer, raw HTML, or
// both), preview it on a phone and a desktop, test it on yourself, choose the
// audience, then send it to the next N people who have not had it yet, now or
// on a schedule. Everything runs inside Sellapage; the server side is
// /api/admin-email, authorised on the 'email' tab.
//
// Sending from here reaches real inboxes and cannot be recalled, so the
// audience count and today's remaining Resend quota are always on screen
// before the button is pressed, and every send asks for confirmation.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, CalendarClock, CheckCircle2, Code2, Copy, Eye, Loader2, Mail, Monitor,
  Plus, RefreshCw, Send, Smartphone, Trash2, Users, Wand2, X,
} from 'lucide-react'
import { MERGE_TAGS, STARTER_HTML, previewHtml, wrapDocument } from './emailTemplate'

const EmailDesigner = lazy(() => import('./EmailDesigner'))

const INPUT = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500'
const BTN = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50'
const PLANS = ['starter', 'growth', 'pro', 'premium']
const SENDERS = [
  { value: 'info', label: 'info@sellapage.com.ng (updates)' },
  { value: 'hello', label: 'hello@sellapage.com.ng (newsletter)' },
]
const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-700',
  sent: 'bg-green-50 text-green-700',
}

const EMPTY_DRAFT = {
  id: null, name: 'Untitled', subject: '', preheader: '', sender: 'info',
  audience: { source: 'users', plans: [], vendorType: '', includeStaff: true, activeOnly: false },
  html: wrapDocument(STARTER_HTML), projectData: null, status: 'draft', counts: { sent: 0, failed: 0 }, history: [],
}

/** "2026-09-19T00:50" typed in Lagos time, as epoch ms. Lagos is UTC+1 all year. */
const lagosInputToMs = (value) => Date.parse(`${value}:00+01:00`)
const fmtLagos = (ms) => (ms ? new Date(ms).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function EmailBroadcast({ authHeaders }) {
  const [campaigns, setCampaigns] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [designKey, setDesignKey] = useState(0)
  const [mode, setMode] = useState('visual')
  const [codeHtml, setCodeHtml] = useState('')
  const [step, setStep] = useState('content')
  const [quota, setQuota] = useState(null)
  const [counts, setCounts] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [testTo, setTestTo] = useState('')
  const [sendCount, setSendCount] = useState(80)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleCount, setScheduleCount] = useState(80)
  const designerRef = useRef(null)

  const api = useCallback(async (action, { method = 'POST', body, query = '' } = {}) => {
    const r = await fetch(`/api/admin-email?action=${action}${query}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok && !data.sent) throw new Error(data.error || `Request failed (${r.status})`)
    return data
  }, [authHeaders])

  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const data = await api('list', { method: 'GET' })
      setCampaigns(data.campaigns || [])
    } catch (e) { setError(e.message) } finally { setListLoading(false) }
  }, [api])

  const loadQuota = useCallback(async () => {
    try {
      const data = await api('quota', { method: 'GET' })
      setQuota(data.quota)
    } catch (e) { setError(e.message) }
  }, [api])

  useEffect(() => { loadList(); loadQuota() }, [loadList, loadQuota])

  const flash = (msg) => { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 6000) }

  const openCampaign = async (id) => {
    setBusy('open'); setError(''); setCounts(null)
    try {
      const data = await api('get', { method: 'GET', query: `&id=${encodeURIComponent(id)}` })
      setDraft(data.campaign)
      setCodeHtml(data.campaign.html || '')
      setMode('visual'); setStep('content'); setDesignKey((k) => k + 1)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const newCampaign = () => {
    setDraft({ ...EMPTY_DRAFT, audience: { ...EMPTY_DRAFT.audience } })
    setCodeHtml(EMPTY_DRAFT.html)
    setMode('visual'); setStep('content'); setCounts(null); setDesignKey((k) => k + 1)
  }

  /** The current HTML and design, whichever view is open. */
  const collectContent = () => {
    if (mode === 'visual' && designerRef.current) {
      return { html: designerRef.current.getHtml(), projectData: designerRef.current.getProject() }
    }
    // Code or Preview: the code text is the source of truth. The design data
    // survives unless the code was actually edited (the textarea clears it),
    // so Design, Preview, Save still reopens exactly as designed.
    return { html: codeHtml, projectData: draft.projectData || null }
  }

  const switchMode = (next) => {
    if (next === mode) return
    if (mode === 'visual' && designerRef.current) {
      const html = designerRef.current.getHtml()
      setCodeHtml(html)
      setDraft((d) => ({ ...d, html, projectData: designerRef.current.getProject() }))
    }
    if (next === 'visual' && mode === 'code') {
      // Remount the designer from the edited code.
      setDraft((d) => ({ ...d, html: codeHtml, projectData: null }))
      setDesignKey((k) => k + 1)
    }
    setMode(next)
  }

  const save = async ({ quiet = false } = {}) => {
    if (!draft) return null
    setBusy('save'); setError('')
    try {
      const content = collectContent()
      const payload = {
        id: draft.id || undefined, name: draft.name, subject: draft.subject, preheader: draft.preheader,
        sender: draft.sender, audience: draft.audience, ...content,
      }
      const data = await api('save', { body: payload })
      setDraft((d) => ({ ...d, ...content, id: data.id }))
      if (!quiet) flash('Saved.')
      loadList()
      return data.id
    } catch (e) { setError(e.message); return null } finally { setBusy('') }
  }

  const countAudience = async () => {
    setBusy('count'); setError('')
    try {
      const data = await api('audience', { body: { audience: draft.audience, id: draft.id || undefined } })
      setCounts(data)
      const suggested = Math.max(1, Math.min(80, data.pending || 1, quota?.available ?? 80))
      setSendCount(suggested); setScheduleCount(Math.max(1, Math.min(80, data.pending || 1)))
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const sendTestNow = async () => {
    const id = await save({ quiet: true })
    if (!id) return
    const to = testTo.split(/[,\s]+/).filter(Boolean)
    setBusy('test'); setError('')
    try {
      const data = await api('test', { body: { id, to } })
      const failed = (data.results || []).filter((r) => !r.ok).map((r) => r.to)
      if (failed.length) setError(`Test failed for: ${failed.join(', ')}`)
      else flash(`Test sent to ${to.join(', ')}. Check the inbox (and spam).`)
      loadQuota()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const sendNow = async () => {
    const id = await save({ quiet: true })
    if (!id) return
    const n = Math.floor(Number(sendCount))
    const pendingNote = counts ? ` ${counts.pending} people in this audience have not had it yet.` : ''
    if (!window.confirm(`Send "${draft.subject}" to the next ${n} people now?${pendingNote} This cannot be recalled.`)) return
    setBusy('send'); setError('')
    try {
      const data = await api('send', { body: { id, count: n } })
      if (data.sent) flash(`Sent to ${data.sent}. ${data.pendingAfter} still to go in this audience.`)
      else setError(data.reason || data.error || 'Nothing was sent.')
      if (data.error && data.sent) setError(data.error)
      await Promise.all([openCampaign(id), loadQuota(), countAudience()])
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const schedule = async () => {
    const at = lagosInputToMs(scheduleAt)
    if (!Number.isFinite(at)) { setError('Pick a date and time.'); return }
    const id = await save({ quiet: true })
    if (!id) return
    setBusy('schedule'); setError('')
    try {
      await api('schedule', { body: { id, scheduledAt: at, count: Math.floor(Number(scheduleCount)) } })
      flash(`Scheduled for ${fmtLagos(at)} (Lagos). It sends even if nobody is online.`)
      await openCampaign(id)
      loadList()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const unschedule = async () => {
    setBusy('schedule'); setError('')
    try {
      await api('unschedule', { body: { id: draft.id } })
      flash('Schedule cancelled.')
      await openCampaign(draft.id); loadList()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const duplicate = async () => {
    if (!draft?.id) return
    setBusy('dup'); setError('')
    try {
      const data = await api('duplicate', { body: { id: draft.id } })
      await loadList(); await openCampaign(data.id)
      flash('Copied. This is a fresh draft: nobody has received it yet.')
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const remove = async () => {
    if (!draft?.id) { setDraft(null); return }
    if (!window.confirm(`Delete "${draft.name}"? Its send history goes with it.`)) return
    setBusy('delete'); setError('')
    try {
      await api('delete', { body: { id: draft.id } })
      setDraft(null); loadList(); flash('Deleted.')
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const setAudience = (patch) => { setDraft((d) => ({ ...d, audience: { ...d.audience, ...patch } })); setCounts(null) }
  const togglePlan = (p) => setAudience({ plans: draft.audience.plans.includes(p) ? draft.audience.plans.filter((x) => x !== p) : [...draft.audience.plans, p] })
  const copyTag = (tag) => { navigator.clipboard?.writeText(tag); flash(`${tag} copied. Paste it into any text.`) }

  const isScheduled = draft?.status === 'scheduled'
  const previewDoc = previewHtml(mode === 'visual' ? draft?.html : codeHtml)

  return (
    <div className="space-y-4">
      {/* Header + quota */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Mail size={18} className="text-green-600" /> Email Broadcast</h2>
          <p className="text-xs text-gray-500 mt-0.5">Design, test and send emails to users and newsletter subscribers. Sent emails cannot be recalled.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs min-w-[260px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-gray-700">Resend today</span>
            <button onClick={loadQuota} className="text-gray-400 hover:text-gray-700" title="Refresh"><RefreshCw size={13} /></button>
          </div>
          {!quota ? <p className="text-gray-400 mt-1">Loading...</p> : quota.unlimited ? (
            <p className="mt-1 text-gray-600">No daily limit on this plan.</p>
          ) : (
            <>
              <p className="mt-1 text-gray-600">
                Used <b>{quota.used ?? '?'}</b> of {quota.limit}. <b>{quota.reserve}</b> kept for logins.
              </p>
              <p className="mt-0.5"><b className="text-green-700">{quota.available}</b> can be sent now. Resets {fmtLagos(Date.parse(quota.resetsAt))} Lagos.</p>
              {quota.warning && <p className="mt-1 text-amber-700">{quota.warning}</p>}
            </>
          )}
        </div>
      </div>

      {error && <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg px-3 py-2"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}<button onClick={() => setError('')} className="ml-auto"><X size={13} /></button></div>}
      {notice && <div className="flex items-start gap-2 bg-green-50 border border-green-100 text-green-700 text-xs rounded-lg px-3 py-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
        {/* Campaign list */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 h-fit">
          <button onClick={newCampaign} className={`${BTN} w-full justify-center bg-green-600 text-white hover:bg-green-700`}><Plus size={14} /> New email</button>
          {listLoading ? <p className="text-xs text-gray-400 px-1 py-2">Loading...</p> : !campaigns.length ? (
            <p className="text-xs text-gray-400 px-1 py-2">No emails yet.</p>
          ) : campaigns.map((c) => (
            <button key={c.id} onClick={() => openCampaign(c.id)}
              className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${draft?.id === c.id ? 'border-green-500 bg-green-50/40' : 'border-gray-100 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-800 truncate">{c.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[c.status] || STATUS_STYLE.draft}`}>{c.status}</span>
              </div>
              <p className="text-[11px] text-gray-500 truncate">{c.subject || 'No subject yet'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {c.counts.sent} sent{c.counts.failed ? `, ${c.counts.failed} failed` : ''}
                {c.status === 'scheduled' && c.scheduledAt ? ` · ${fmtLagos(c.scheduledAt)}` : ''}
              </p>
            </button>
          ))}
        </div>

        {/* Editor */}
        {!draft ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
            Open an email on the left, or start a new one.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {[['content', 'Content'], ['audience', 'Audience'], ['send', 'Test & send']].map(([id, label], i) => (
                <button key={id} onClick={() => setStep(id)}
                  className={`${BTN} ${step === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i + 1}. {label}</button>
              ))}
              <div className="ml-auto flex gap-2">
                <button onClick={() => save()} disabled={!!busy} className={`${BTN} bg-green-600 text-white hover:bg-green-700`}>{busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save</button>
                {draft.id && <button onClick={duplicate} disabled={!!busy} className={`${BTN} bg-gray-100 text-gray-700 hover:bg-gray-200`}><Copy size={13} /> Duplicate</button>}
                <button onClick={remove} disabled={!!busy} className={`${BTN} bg-red-50 text-red-600 hover:bg-red-100`}><Trash2 size={13} /> Delete</button>
              </div>
            </div>

            {isScheduled && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-lg px-3 py-2">
                <CalendarClock size={14} /> Scheduled for {fmtLagos(draft.scheduledAt)} (Lagos) to the next {draft.scheduledCount}. Edits you save before then are what goes out.
              </div>
            )}
            {draft.lastScheduleNote && !isScheduled && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Last schedule: {draft.lastScheduleNote}</div>
            )}

            {/* 1. CONTENT */}
            <div className={step === 'content' ? 'space-y-3' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-gray-600">Name (only admins see this)
                  <input className={`${INPUT} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </label>
                <label className="text-xs font-bold text-gray-600">Send from
                  <select className={`${INPUT} mt-1`} value={draft.sender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })}>
                    {SENDERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-600 md:col-span-2">Subject line
                  <input className={`${INPUT} mt-1`} value={draft.subject} maxLength={200} placeholder="e.g. New: sell on your own domain" onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[['visual', 'Design', Wand2], ['code', 'Code', Code2], ['preview', 'Preview', Eye]].map(([id, label, Icon]) => (
                  <button key={id} onClick={() => switchMode(id)}
                    className={`${BTN} ${mode === id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Icon size={13} /> {label}</button>
                ))}
                <span className="text-[11px] text-gray-500 ml-2">Personalise:</span>
                {MERGE_TAGS.map((m) => (
                  <button key={m.tag} onClick={() => copyTag(m.tag)} title={`Copy ${m.tag}`}
                    className="text-[11px] font-mono px-2 py-1 rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100">{m.label}</button>
                ))}
              </div>

              {mode === 'visual' && (
                <Suspense fallback={<div className="h-[72vh] flex items-center justify-center text-sm text-gray-400"><Loader2 size={16} className="animate-spin mr-2" /> Loading the designer...</div>}>
                  <EmailDesigner key={designKey} ref={designerRef} initialProject={draft.projectData} initialHtml={draft.html} onError={setError} />
                </Suspense>
              )}
              {mode === 'code' && (
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-500">Edit the HTML directly. Switch back to Design and it rebuilds from this. Use inline styles and tables for layout: email apps ignore most modern CSS.</p>
                  <textarea value={codeHtml} spellCheck={false}
                    onChange={(e) => {
                      setCodeHtml(e.target.value)
                      // Hand-edited code no longer matches the saved design.
                      if (draft.projectData) setDraft((d) => ({ ...d, projectData: null }))
                    }}
                    className="w-full h-[68vh] font-mono text-xs bg-gray-950 text-green-100 rounded-xl p-4 outline-none" />
                </div>
              )}
              {mode === 'preview' && (
                <div className="flex flex-col lg:flex-row gap-4 items-start overflow-x-auto">
                  <div className="shrink-0">
                    <p className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1"><Smartphone size={12} /> Phone</p>
                    <iframe title="Phone preview" srcDoc={previewDoc} sandbox="" className="w-[375px] h-[640px] border-8 border-gray-900 rounded-[28px] bg-white" />
                  </div>
                  <div className="flex-1 min-w-[320px]">
                    <p className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1"><Monitor size={12} /> Desktop</p>
                    <iframe title="Desktop preview" srcDoc={previewDoc} sandbox="" className="w-full h-[640px] border border-gray-200 rounded-xl bg-white" />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-400">An unsubscribe link is added at the bottom automatically, unless you place {'{{unsubscribeUrl}}'} yourself.</p>
            </div>

            {/* 2. AUDIENCE */}
            <div className={step === 'audience' ? 'space-y-4' : 'hidden'}>
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">Who</p>
                <div className="flex flex-wrap gap-2">
                  {[['users', 'All users'], ['newsletter', 'Newsletter subscribers'], ['all', 'Everyone']].map(([id, label]) => (
                    <button key={id} onClick={() => setAudience({ source: id })}
                      className={`${BTN} ${draft.audience.source === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
                  ))}
                </div>
              </div>
              {draft.audience.source !== 'newsletter' && (
                <>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">Plans <span className="font-normal text-gray-400">(none selected means every plan)</span></p>
                    <div className="flex flex-wrap gap-2">
                      {PLANS.map((p) => (
                        <button key={p} onClick={() => togglePlan(p)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${draft.audience.plans.includes(p) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs font-bold text-gray-600">Sells
                      <select className={`${INPUT} mt-1`} value={draft.audience.vendorType} onChange={(e) => setAudience({ vendorType: e.target.value })}>
                        <option value="">Anything</option><option value="products">Products</option><option value="services">Services</option><option value="both">Both</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mt-5">
                      <input type="checkbox" checked={draft.audience.includeStaff} onChange={(e) => setAudience({ includeStaff: e.target.checked })} /> Include staff accounts
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mt-5">
                      <input type="checkbox" checked={draft.audience.activeOnly} onChange={(e) => setAudience({ activeOnly: e.target.checked })} /> Active stores only
                    </label>
                  </div>
                  {draft.audience.source === 'all' && (draft.audience.plans.length || draft.audience.vendorType) ? (
                    <p className="text-[11px] text-amber-700">Newsletter subscribers have no plan, so they are left out while a plan or "Sells" filter is set.</p>
                  ) : null}
                </>
              )}
              <div className="flex items-center gap-3">
                <button onClick={countAudience} disabled={!!busy} className={`${BTN} bg-green-600 text-white hover:bg-green-700`}>{busy === 'count' ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />} Count recipients</button>
                <span className="text-[11px] text-gray-400">Counting reads the whole user list, so it runs when you press it.</span>
              </div>
              {counts && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  {[['In this audience', counts.eligible], ['Already received', counts.alreadySent], ['Still to send', counts.pending], ['Unsubscribed (skipped)', counts.suppressed]].map(([label, n]) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg py-2">
                      <p className="text-lg font-black text-gray-900">{n}</p><p className="text-[10px] text-gray-500">{label}</p>
                    </div>
                  ))}
                  {counts.byKind && <p className="col-span-full text-[11px] text-gray-500">Still to send: {Object.entries(counts.byKind).map(([k, n]) => `${n} ${k === 'owner' ? 'store owners' : k === 'staff' ? 'staff' : 'newsletter subscribers'}`).join(', ') || 'none'}.</p>}
                </div>
              )}
            </div>

            {/* 3. TEST & SEND */}
            <div className={step === 'send' ? 'space-y-5' : 'hidden'}>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-600">Send a test to yourself first</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className={INPUT} placeholder="you@example.com, a second@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                  <button onClick={sendTestNow} disabled={!!busy || !testTo.trim()} className={`${BTN} bg-gray-900 text-white shrink-0`}>{busy === 'test' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send test</button>
                </div>
                <p className="text-[11px] text-gray-400">Up to 5 addresses. The subject starts with [Test] and personal fields show sample values. Tests count toward today's Resend quota.</p>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                <p className="text-xs font-bold text-gray-600">Send now to the next people who have not had it</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input type="number" min={1} max={500} className={`${INPUT} sm:w-32`} value={sendCount} onChange={(e) => setSendCount(e.target.value)} disabled={isScheduled} />
                  <button onClick={sendNow} disabled={!!busy || isScheduled} className={`${BTN} bg-green-600 text-white hover:bg-green-700 shrink-0`}>{busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send now</button>
                  <span className="text-[11px] text-gray-500">
                    {quota && !quota.unlimited ? `At most ${quota.available} today. Anything over that is not sent and stays for next time.` : ''}
                  </span>
                </div>
                {isScheduled && <p className="text-[11px] text-blue-700">Unschedule it below to send now instead.</p>}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1"><CalendarClock size={13} /> Schedule (Lagos time)</p>
                {isScheduled ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-700">Goes out {fmtLagos(draft.scheduledAt)} to the next {draft.scheduledCount}.</span>
                    <button onClick={unschedule} disabled={!!busy} className={`${BTN} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Unschedule</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input type="datetime-local" className={`${INPUT} sm:w-60`} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                      <input type="number" min={1} max={500} className={`${INPUT} sm:w-28`} value={scheduleCount} onChange={(e) => setScheduleCount(e.target.value)} />
                      <button onClick={schedule} disabled={!!busy || !scheduleAt} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700 shrink-0`}>{busy === 'schedule' ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />} Schedule</button>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Sends on the server at that time, even with every admin offline. Resend's free quota resets at 1:00am Lagos, so to use up a day's leftover emails, schedule for about 12:50am.
                    </p>
                  </>
                )}
              </div>

              {!!draft.history?.length && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-600 mb-1.5">History</p>
                  <div className="space-y-1">
                    {[...draft.history].reverse().map((h, i) => (
                      <p key={i} className="text-[11px] text-gray-600">
                        {fmtLagos(Date.parse(h.at))}: {h.sent} sent{h.failed ? `, ${h.failed} failed` : ''} ({h.trigger === 'schedule' ? 'scheduled' : 'sent manually'}, asked for {h.requested})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
