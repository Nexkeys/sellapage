// src/ops/tabs/EmailStudio.jsx
//
// Email Broadcast: design an email (drag-and-drop designer, raw HTML, or
// both), preview it on a phone and a desktop, test it on yourself, choose who
// gets it, then send to the next N people who have not had it, now or at a
// set time. Same server as before (/api/admin-email) and the same designer
// (components/admin/EmailDesigner.jsx, GrapesJS, loaded only when opened).
// Sending and scheduling ask for the authenticator code; Resend's daily quota
// is always on screen, with a share kept back for sign-in emails.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Mail, Plus, Save, Copy, Trash2, Wand2, Code2, Eye, Smartphone, Monitor, Users, Send, CalendarClock, Loader2, RefreshCw, CheckCircle2, History } from 'lucide-react'
import { opsJson } from '../opsSession'
import { MERGE_TAGS, STARTER_HTML, previewHtml, wrapDocument } from '../../components/admin/emailTemplate'
import { Pill, Empty, Notice, Btn, Segmented, Meter, useConfirm, timeAgo } from './kit'

const EmailDesigner = lazy(() => import('../../components/admin/EmailDesigner'))
const PLANS = ['starter', 'growth', 'pro', 'premium']
const SENDERS = [{ value: 'info', label: 'info@sellapage.com.ng (updates)' }, { value: 'hello', label: 'hello@sellapage.com.ng (newsletter)' }]
const STATUS = { draft: ['Draft', 'slate'], scheduled: ['Scheduled', 'blue'], partial: ['Part sent', 'amber'], sent: ['Sent', 'green'] }
const EMPTY = {
  id: null, name: 'Untitled', subject: '', preheader: '', sender: 'info',
  audience: { source: 'users', plans: [], vendorType: '', includeStaff: true, activeOnly: false },
  html: wrapDocument(STARTER_HTML), projectData: null, status: 'draft', counts: { sent: 0, failed: 0 }, history: [],
}
const INPUT = 'w-full rounded-2xl border border-dash-line bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-forest-600 focus:ring-4 focus:ring-forest-50'
/** "2026-09-19T00:50" typed in Lagos time, as epoch ms. Lagos is UTC+1 all year. */
const lagosInputToMs = (value) => Date.parse(`${value}:00+01:00`)
const fmtLagos = (ms) => (ms ? new Date(ms).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function EmailStudio({ notify }) {
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
  const [err, setErr] = useState('')
  const [testTo, setTestTo] = useState('')
  const [sendCount, setSendCount] = useState(80)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleCount, setScheduleCount] = useState(80)
  const designerRef = useRef(null)
  const [confirmUi, confirm] = useConfirm()

  // Same contract as the original screen: a send that delivered some emails
  // before stopping is still a result, not an error.
  const api = useCallback(async (action, { method = 'POST', body, query = '' } = {}) => {
    const { ok, status, data } = await opsJson(`/api/admin-email?action=${action}${query}`, { method, body })
    if (!ok && !data.sent && !(action === 'test' && data.results)) throw new Error(data.message || data.error || `Request failed (${status})`)
    return data
  }, [])
  const loadList = useCallback(async () => {
    setListLoading(true)
    try { setCampaigns((await api('list', { method: 'GET' })).campaigns || []) } catch (e) { setErr(e.message) } finally { setListLoading(false) }
  }, [api])
  const loadQuota = useCallback(async () => {
    try { setQuota((await api('quota', { method: 'GET' })).quota) } catch (e) { setErr(e.message) }
  }, [api])
  useEffect(() => { loadList(); loadQuota() }, [loadList, loadQuota])

  const openCampaign = async (id) => {
    setBusy('open'); setErr(''); setCounts(null)
    try {
      const data = await api('get', { method: 'GET', query: `&id=${encodeURIComponent(id)}` })
      setDraft(data.campaign); setCodeHtml(data.campaign.html || ''); setMode('visual'); setStep('content'); setDesignKey((k) => k + 1)
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const newCampaign = () => {
    setDraft({ ...EMPTY, audience: { ...EMPTY.audience } }); setCodeHtml(EMPTY.html); setMode('visual'); setStep('content'); setCounts(null); setDesignKey((k) => k + 1)
  }
  const collectContent = () => {
    if (mode === 'visual' && designerRef.current) return { html: designerRef.current.getHtml(), projectData: designerRef.current.getProject() }
    return { html: codeHtml, projectData: draft.projectData || null }
  }
  const switchMode = (next) => {
    if (next === mode) return
    if (mode === 'visual' && designerRef.current) {
      const html = designerRef.current.getHtml()
      setCodeHtml(html)
      setDraft((d) => ({ ...d, html, projectData: designerRef.current.getProject() }))
    }
    if (next === 'visual' && mode === 'code') { setDraft((d) => ({ ...d, html: codeHtml, projectData: null })); setDesignKey((k) => k + 1) }
    setMode(next)
  }
  const save = async ({ quiet = false } = {}) => {
    if (!draft) return null
    setBusy('save'); setErr('')
    try {
      const content = collectContent()
      const data = await api('save', { body: { id: draft.id || undefined, name: draft.name, subject: draft.subject, preheader: draft.preheader, sender: draft.sender, audience: draft.audience, ...content } })
      setDraft((d) => ({ ...d, ...content, id: data.id }))
      if (!quiet) notify?.('Saved.')
      loadList()
      return data.id
    } catch (e) { setErr(e.message); return null } finally { setBusy('') }
  }
  const countAudience = async () => {
    setBusy('count'); setErr('')
    try {
      const data = await api('audience', { body: { audience: draft.audience, id: draft.id || undefined } })
      setCounts(data)
      setSendCount(Math.max(1, Math.min(80, data.pending || 1, quota?.available ?? 80)))
      setScheduleCount(Math.max(1, Math.min(80, data.pending || 1)))
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const sendTest = async () => {
    const id = await save({ quiet: true })
    if (!id) return
    const to = testTo.split(/[,\s]+/).filter(Boolean)
    setBusy('test'); setErr('')
    try {
      const data = await api('test', { body: { id, to } })
      const failed = (data.results || []).filter((r) => !r.ok).map((r) => r.to)
      if (failed.length) setErr(`The test did not reach: ${failed.join(', ')}`)
      else notify?.(`Test sent to ${to.join(', ')}. Check the inbox and spam.`)
      loadQuota()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const sendNow = async () => {
    const n = Math.floor(Number(sendCount))
    const { ok } = await confirm({ title: `Send to the next ${n} people?`, tone: 'warn', icon: <Send size={20} />, confirmLabel: 'Send now',
      body: <>&ldquo;{draft.subject || 'No subject'}&rdquo;{counts ? <>. {counts.pending} people in this audience have not had it yet.</> : '.'} It cannot be recalled.</>,
      checklist: ['I sent a test to myself and read it on my phone.'] })
    if (!ok) return
    const id = await save({ quiet: true })
    if (!id) return
    setBusy('send'); setErr('')
    try {
      const data = await api('send', { body: { id, count: n } })
      if (data.sent) notify?.(`Sent to ${data.sent}. ${data.pendingAfter} still to go in this audience.`)
      else setErr(data.reason || data.error || 'Nothing was sent.')
      if (data.error && data.sent) setErr(data.error)
      await Promise.all([openCampaign(id), loadQuota()])
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const schedule = async () => {
    const at = lagosInputToMs(scheduleAt)
    if (!Number.isFinite(at)) { setErr('Pick a date and time.'); return }
    const id = await save({ quiet: true })
    if (!id) return
    setBusy('schedule'); setErr('')
    try {
      await api('schedule', { body: { id, scheduledAt: at, count: Math.floor(Number(scheduleCount)) } })
      notify?.(`Scheduled for ${fmtLagos(at)} Lagos time. It goes out even if nobody is online.`)
      await openCampaign(id); loadList()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const unschedule = async () => {
    setBusy('schedule'); setErr('')
    try { await api('unschedule', { body: { id: draft.id } }); notify?.('Schedule cancelled.'); await openCampaign(draft.id); loadList() } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const duplicate = async () => {
    setBusy('dup'); setErr('')
    try { const data = await api('duplicate', { body: { id: draft.id } }); await loadList(); await openCampaign(data.id); notify?.('Copied. This is a fresh draft that nobody has received.') } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const remove = async () => {
    if (!draft?.id) { setDraft(null); return }
    const { ok } = await confirm({ title: `Delete "${draft.name}"?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete', body: 'Its send history goes with it.' })
    if (!ok) return
    setBusy('delete'); setErr('')
    try { await api('delete', { body: { id: draft.id } }); setDraft(null); loadList(); notify?.('Deleted.') } catch (e) { setErr(e.message) } finally { setBusy('') }
  }
  const setAudience = (patch) => { setDraft((d) => ({ ...d, audience: { ...d.audience, ...patch } })); setCounts(null) }
  const togglePlan = (p) => setAudience({ plans: draft.audience.plans.includes(p) ? draft.audience.plans.filter((x) => x !== p) : [...draft.audience.plans, p] })
  const copyTag = (tag) => { navigator.clipboard?.writeText(tag).then(() => notify?.(`${tag} copied. Paste it into any text.`)).catch(() => {}) }

  const isScheduled = draft?.status === 'scheduled'
  const previewDoc = previewHtml(mode === 'visual' ? draft?.html : codeHtml)
  const steps = [['content', 'Write'], ['audience', 'Who gets it'], ['send', 'Test and send']]
  const stepIdx = steps.findIndex(([id]) => id === step)

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-br from-[#0c2a4a] to-[#1d4ed8] p-5 text-white">
          <span className="hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 sm:flex"><Mail size={26} /></span>
          <div className="min-w-[14rem] flex-1">
            <p className="font-display text-[18px] font-extrabold sm:text-[20px]">{campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} · {campaigns.reduce((t, c) => t + (c.counts?.sent || 0), 0).toLocaleString()} emails sent</p>
            <p className="text-[12.5px] text-blue-100/85">Design, test and send to users and newsletter subscribers. Sent emails cannot be recalled.</p>
          </div>
          <Btn tone="white" icon={<Plus size={15} />} onClick={newCampaign}>New email</Btn>
        </div>
        <div className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between"><p className="text-[13px] font-bold text-dash-ink">Resend today</p><button type="button" onClick={loadQuota} className="rounded-lg p-1 text-slate-400 hover:text-dash-ink" aria-label="Refresh quota"><RefreshCw size={14} /></button></div>
          {!quota ? <p className="mt-2 text-[12px] text-slate-400">Loading...</p> : quota.unlimited ? <p className="mt-2 text-[12.5px] text-slate-600">No daily limit on this plan.</p> : (
            <>
              <Meter value={(quota.used || 0) + (quota.reserve || 0)} of={quota.limit || 1} tone={quota.available < 20 ? 'bg-red-500' : 'bg-blue-600'} className="mt-2.5 h-2.5" />
              <p className="mt-2 text-[12px] text-slate-600"><strong className="text-blue-700">{quota.available}</strong> can go out now · {quota.used ?? '?'} of {quota.limit} used · {quota.reserve} kept for sign-ins</p>
              <p className="text-[11.5px] text-slate-400">Resets {fmtLagos(Date.parse(quota.resetsAt))} Lagos</p>
              {quota.warning && <p className="mt-1 text-[11.5px] text-amber-700">{quota.warning}</p>}
            </>
          )}
        </div>
      </section>
      <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2 xl:sticky xl:top-24 xl:self-start">
          {listLoading ? <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" /> : campaigns.length === 0 ? <Empty icon={<Mail size={22} />} title="No emails yet" action={<Btn size="sm" icon={<Plus size={14} />} onClick={newCampaign}>New email</Btn>} />
            : <ul className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">{campaigns.map((c) => {
              const [label, tone] = STATUS[c.status] || STATUS.draft
              return (
                <li key={c.id} className="w-64 flex-shrink-0 xl:w-auto">
                  <button type="button" onClick={() => openCampaign(c.id)} className={`w-full rounded-2xl p-3.5 text-left ring-1 transition ${draft?.id === c.id ? 'bg-blue-50/60 ring-2 ring-blue-500' : 'bg-white ring-dash-line hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-2"><span className="truncate text-[13px] font-bold text-dash-ink">{c.name}</span><Pill tone={tone} className="ml-auto">{label}</Pill></span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">{c.subject || 'No subject yet'}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{c.counts.sent} sent{c.counts.failed ? `, ${c.counts.failed} failed` : ''}{c.status === 'scheduled' && c.scheduledAt ? ` · ${fmtLagos(c.scheduledAt)}` : c.updatedAt ? ` · edited ${timeAgo(c.updatedAt)}` : ''}</span>
                  </button>
                </li>
              )
            })}</ul>}
        </aside>

        {!draft ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            {busy === 'open' ? <Loader2 className="animate-spin text-slate-400" /> : <><Mail size={28} className="text-blue-300" /><p className="mt-3 text-[14px] font-bold text-dash-ink">Open an email, or start a new one</p><Btn className="mt-4" icon={<Plus size={15} />} onClick={newCampaign}>New email</Btn></>}
          </div>
        ) : (
          <section className="min-w-0 space-y-4 rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <ol className="flex items-center gap-2">
                {steps.map(([id, label], i) => (
                  <li key={id} className="flex items-center gap-2">
                    <button type="button" onClick={() => setStep(id)} className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12.5px] font-semibold transition ${step === id ? 'bg-blue-600 text-white' : i < stepIdx ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step === id ? 'bg-white/20' : 'bg-white'}`}>{i < stepIdx ? <CheckCircle2 size={13} /> : i + 1}</span>{label}
                    </button>
                    {i < steps.length - 1 && <span className="hidden h-px w-4 bg-slate-200 sm:block" />}
                  </li>
                ))}
              </ol>
              <div className="ml-auto flex flex-wrap gap-2">
                <Btn size="sm" icon={<Save size={14} />} busy={busy === 'save'} disabled={!!busy && busy !== 'save'} onClick={() => save()}>Save</Btn>
                {draft.id && <Btn size="sm" tone="soft" icon={<Copy size={14} />} busy={busy === 'dup'} onClick={duplicate}>Duplicate</Btn>}
                <Btn size="sm" tone="danger-soft" icon={<Trash2 size={14} />} busy={busy === 'delete'} onClick={remove}>Delete</Btn>
              </div>
            </div>
            {isScheduled && <Notice tone="info"><CalendarClock size={14} className="mr-1 inline" />Scheduled for {fmtLagos(draft.scheduledAt)} Lagos time, to the next {draft.scheduledCount}. Whatever is saved by then is what goes out.</Notice>}
            {draft.lastScheduleNote && !isScheduled && <Notice tone="warn">Last schedule: {draft.lastScheduleNote}</Notice>}

            <div className={step === 'content' ? 'space-y-3' : 'hidden'}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-[12px] font-semibold text-slate-700">Name (only the team sees it)<input className={`${INPUT} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
                <label className="block text-[12px] font-semibold text-slate-700">Send from<select className={`${INPUT} mt-1`} value={draft.sender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })}>{SENDERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
                <label className="block text-[12px] font-semibold text-slate-700 md:col-span-2">Subject line<input className={`${INPUT} mt-1`} value={draft.subject} maxLength={200} placeholder="e.g. New: sell on your own domain" onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented value={mode} onChange={switchMode} options={[{ id: 'visual', label: 'Design', icon: <Wand2 size={14} /> }, { id: 'code', label: 'Code', icon: <Code2 size={14} /> }, { id: 'preview', label: 'Preview', icon: <Eye size={14} /> }]} />
                <span className="ml-1 text-[11.5px] text-slate-500">Personalise:</span>
                {MERGE_TAGS.map((m) => <button key={m.tag} type="button" onClick={() => copyTag(m.tag)} title={`Copy ${m.tag}`} className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] ring-1 ring-dash-line hover:bg-slate-100">{m.label}</button>)}
              </div>
              {mode === 'visual' && <Suspense fallback={<div className="flex h-[72vh] items-center justify-center text-[13px] text-slate-400"><Loader2 size={16} className="mr-2 animate-spin" /> Loading the designer...</div>}><div className="overflow-hidden rounded-2xl ring-1 ring-dash-line"><EmailDesigner key={designKey} ref={designerRef} initialProject={draft.projectData} initialHtml={draft.html} onError={setErr} /></div></Suspense>}
              {mode === 'code' && (
                <div className="space-y-1">
                  <p className="text-[11.5px] text-slate-500">Edit the HTML directly. Switch back to Design and it rebuilds from this. Use inline styles and tables: email apps ignore most modern CSS.</p>
                  <textarea value={codeHtml} spellCheck={false} onChange={(e) => { setCodeHtml(e.target.value); if (draft.projectData) setDraft((d) => ({ ...d, projectData: null })) }} className="h-[68vh] w-full rounded-2xl bg-slate-950 p-4 font-mono text-[12px] text-green-100 outline-none" />
                </div>
              )}
              {mode === 'preview' && (
                <div className="flex flex-col items-start gap-4 overflow-x-auto lg:flex-row">
                  <div className="flex-shrink-0"><p className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold text-slate-500"><Smartphone size={13} /> Phone</p><iframe title="Phone preview" srcDoc={previewDoc} sandbox="" className="h-[640px] w-[375px] max-w-full rounded-[30px] border-8 border-slate-900 bg-white" /></div>
                  <div className="w-full min-w-0 flex-1"><p className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold text-slate-500"><Monitor size={13} /> Desktop</p><iframe title="Desktop preview" srcDoc={previewDoc} sandbox="" className="h-[640px] w-full rounded-2xl border border-dash-line bg-white" /></div>
                </div>
              )}
              <p className="text-[11.5px] text-slate-400">An unsubscribe link is added at the bottom by itself, unless you place {'{{unsubscribeUrl}}'} yourself.</p>
            </div>

            <div className={step === 'audience' ? 'space-y-4' : 'hidden'}>
              <div><p className="mb-1.5 text-[12px] font-semibold text-slate-700">Who</p>
                <div className="flex flex-wrap gap-2">{[['users', 'All users'], ['newsletter', 'Newsletter subscribers'], ['all', 'Everyone']].map(([id, label]) => <button key={id} type="button" onClick={() => setAudience({ source: id })} className={`rounded-2xl px-4 py-2.5 text-[13px] font-semibold ring-1 transition ${draft.audience.source === id ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-dash-line hover:bg-slate-50'}`}>{label}</button>)}</div>
              </div>
              {draft.audience.source !== 'newsletter' && (
                <>
                  <div><p className="mb-1.5 text-[12px] font-semibold text-slate-700">Plans <span className="font-normal text-slate-400">(none picked means every plan)</span></p>
                    <div className="flex flex-wrap gap-1.5">{PLANS.map((p) => <button key={p} type="button" onClick={() => togglePlan(p)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ring-1 ${draft.audience.plans.includes(p) ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}>{p}</button>)}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="block text-[12px] font-semibold text-slate-700">Sells<select className={`${INPUT} mt-1`} value={draft.audience.vendorType} onChange={(e) => setAudience({ vendorType: e.target.value })}><option value="">Anything</option><option value="products">Products</option><option value="services">Services</option><option value="both">Both</option></select></label>
                    <label className="flex items-center gap-2 text-[13px] text-slate-700 md:mt-6"><input type="checkbox" checked={draft.audience.includeStaff} onChange={(e) => setAudience({ includeStaff: e.target.checked })} className="h-4 w-4 accent-[#1d4ed8]" /> Include store staff accounts</label>
                    <label className="flex items-center gap-2 text-[13px] text-slate-700 md:mt-6"><input type="checkbox" checked={draft.audience.activeOnly} onChange={(e) => setAudience({ activeOnly: e.target.checked })} className="h-4 w-4 accent-[#1d4ed8]" /> Live stores only</label>
                  </div>
                  {draft.audience.source === 'all' && (draft.audience.plans.length || draft.audience.vendorType) ? <Notice tone="warn">Newsletter subscribers have no plan, so they are left out while a plan or Sells filter is set.</Notice> : null}
                </>
              )}
              <div className="flex flex-wrap items-center gap-3"><Btn icon={<Users size={15} />} busy={busy === 'count'} onClick={countAudience}>Count who gets it</Btn><span className="text-[11.5px] text-slate-400">Counting reads the whole user list, so it only runs when pressed.</span></div>
              {counts && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[['In this audience', counts.eligible, 'text-dash-ink'], ['Already had it', counts.alreadySent, 'text-slate-500'], ['Still to send', counts.pending, 'text-blue-700'], ['Unsubscribed, skipped', counts.suppressed, 'text-slate-500']].map(([l, n, c]) => (
                    <div key={l} className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-100"><p className={`font-display text-[22px] font-extrabold tabular-nums ${c}`}>{n}</p><p className="text-[11px] text-slate-500">{l}</p></div>
                  ))}
                  {counts.byKind && <p className="col-span-full text-[12px] text-slate-500">Still to send: {Object.entries(counts.byKind).map(([k, n]) => `${n} ${k === 'owner' ? 'store owners' : k === 'staff' ? 'staff' : 'newsletter subscribers'}`).join(', ') || 'none'}.</p>}
                </div>
              )}
            </div>

            <div className={step === 'send' ? 'space-y-5' : 'hidden'}>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[13px] font-bold text-dash-ink">1. Send a test to yourself</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input className={INPUT} placeholder="you@example.com, second@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} /><Btn tone="dark" icon={<Send size={15} />} busy={busy === 'test'} disabled={!testTo.trim() || (!!busy && busy !== 'test')} onClick={sendTest}>Send test</Btn></div>
                <p className="mt-1.5 text-[11.5px] text-slate-400">Up to 5 addresses. The subject starts with [Test] and personal fields show sample values. Tests count toward today&apos;s quota.</p>
              </div>
              <div className="rounded-2xl p-4 ring-1 ring-dash-line">
                <p className="text-[13px] font-bold text-dash-ink">2. Send now to the next people who have not had it</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"><input type="number" min={1} max={500} className={`${INPUT} sm:w-32`} value={sendCount} onChange={(e) => setSendCount(e.target.value)} disabled={isScheduled} /><Btn icon={<Send size={15} />} busy={busy === 'send'} disabled={(!!busy && busy !== 'send') || isScheduled} onClick={sendNow}>Send now</Btn>
                  {quota && !quota.unlimited && <span className="text-[11.5px] text-slate-500">At most {quota.available} today. Anything over that waits for next time.</span>}</div>
                {isScheduled && <p className="mt-1.5 text-[11.5px] text-blue-700">Unschedule it below to send now instead.</p>}
              </div>
              <div className="rounded-2xl p-4 ring-1 ring-dash-line">
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-dash-ink"><CalendarClock size={15} /> Or schedule it (Lagos time)</p>
                {isScheduled ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-[13px] text-slate-700">Goes out {fmtLagos(draft.scheduledAt)} to the next {draft.scheduledCount}.</span><Btn tone="soft" busy={busy === 'schedule'} onClick={unschedule}>Unschedule</Btn></div>
                ) : (
                  <>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"><input type="datetime-local" className={`${INPUT} sm:w-60`} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} /><input type="number" min={1} max={500} className={`${INPUT} sm:w-28`} value={scheduleCount} onChange={(e) => setScheduleCount(e.target.value)} /><Btn tone="blue" icon={<CalendarClock size={15} />} busy={busy === 'schedule'} disabled={!scheduleAt || (!!busy && busy !== 'schedule')} onClick={schedule}>Schedule</Btn></div>
                    <p className="mt-1.5 text-[11.5px] text-slate-400">It sends from the server at that time, even with everyone offline. Resend&apos;s free quota resets at 1:00am Lagos, so to use a day&apos;s leftover emails, schedule for about 12:50am.</p>
                  </>
                )}
              </div>
              {!!draft.history?.length && (
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-dash-ink"><History size={15} /> History</p>
                  <ol className="mt-2 space-y-1.5 border-l-2 border-blue-100 pl-4">
                    {[...draft.history].reverse().map((h, i) => <li key={i} className="text-[12.5px] text-slate-600">{fmtLagos(Date.parse(h.at))}: <strong>{h.sent}</strong> sent{h.failed ? `, ${h.failed} failed` : ''} ({h.trigger === 'schedule' ? 'scheduled' : 'sent by hand'}, asked for {h.requested})</li>)}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {confirmUi}
    </div>
  )
}
