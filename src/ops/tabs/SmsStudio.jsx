// src/ops/tabs/SmsStudio.jsx
//
// SMS Campaigns: promotional texts to vendors through Termii, on the
// promotional sender ID (separate from sign-in codes). Same server as before
// (/api/admin-sms: overview, audience, save, delete, test, send, messages,
// opt-outs, opt-in); this is the console's screen for it:
//   - write with the cost and page count worked out as you type, and a phone
//     preview of exactly what lands (the server builds the preview)
//   - test on your own number, then send (asks for the authenticator code)
//   - how the texts did: activity by day, sent to tapped, campaigns side by
//     side, and when vendors tap (SmsInsights.jsx)
//   - drafts, sent campaigns, every message with Termii's delivery verdict,
//     and the numbers that opted out
// Promotional SMS cannot be delivered between 8pm and 8am (utils/smsWindow.js).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Wallet, Send, MousePointerClick, Ban, Link2, Save, Users, Copy, Trash2, Pencil, RefreshCw, Smartphone, AlertTriangle, FileText, ListChecks, CheckCircle2 } from 'lucide-react'
import { sendWindow } from '../../utils/smsWindow'
import { opsJson } from '../opsSession'
import { useOpsData } from '../opsKit'
import { Segmented, Chips, Pager, SearchBox, Pill, Empty, Notice, Btn, useConfirm, useDebounced, timeAgo, fmtDateTime } from './kit'
import SmsInsights from './SmsInsights'

const PLANS = ['free', 'starter', 'growth', 'pro', 'premium']
const EMPTY = { id: '', name: '', body: '', linkUrl: '', includeLink: false, filters: {} }
const OUTCOME = { delivered: ['Delivered', 'green'], dnd: ['Blocked by DND', 'amber'], failed: ['Not delivered', 'red'], pending: ['Waiting for report', 'slate'] }
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const INPUT = 'w-full rounded-2xl border border-dash-line bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

function Phone({ sender, text }) {
  return (
    <div className="mx-auto w-full max-w-[290px] rounded-[36px] border-[7px] border-slate-900 bg-slate-100 shadow-2xl">
      <div className="flex items-center gap-2 rounded-t-[28px] bg-white px-4 pb-3 pt-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-[12px] font-black text-white">{String(sender || 'S').slice(0, 1)}</span>
        <div><p className="text-[12.5px] font-bold text-slate-900">{sender || 'Sellapage'}</p><p className="text-[10px] text-slate-400">Text message</p></div>
      </div>
      <div className="min-h-[260px] space-y-2 p-3">
        <p className="text-center text-[10px] text-slate-400">Today</p>
        <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[12.5px] leading-snug text-slate-800 shadow-sm">
          <p className="whitespace-pre-wrap break-words">{text || 'Your message will appear here.'}</p>
        </div>
      </div>
    </div>
  )
}

function Log({ campaigns }) {
  const [outcome, setOutcome] = useState('')
  const [campaign, setCampaign] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(q)
  useEffect(() => { setPage(1) }, [outcome, campaign, search])
  const params = new URLSearchParams({ action: 'messages', limit: '25', page: String(page) })
  if (outcome) params.set('outcome', outcome)
  if (campaign) params.set('campaignId', campaign)
  if (search.trim()) params.set('search', search.trim())
  const { data, loading } = useOpsData(`/api/admin-sms?${params}`)
  const rows = data?.messages || []
  const c = data?.counts
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Chips size="sm" value={outcome} onChange={setOutcome} options={[{ id: '', label: 'All' }, { id: 'delivered', label: 'Delivered', count: c?.delivered }, { id: 'dnd', label: 'DND', count: c?.dnd }, { id: 'failed', label: 'Not delivered', count: c?.failed }, { id: 'pending', label: 'Waiting', count: c?.pending }]} />
        {campaigns.length > 0 && <select value={campaign} onChange={(e) => setCampaign(e.target.value)} className="h-9 rounded-xl border border-dash-line bg-white px-3 text-[12.5px] outline-none lg:max-w-[220px]"><option value="">Every campaign</option>{campaigns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
        <SearchBox value={q} onChange={setQ} placeholder="Store or number" busy={loading} className="lg:ml-auto lg:w-64" />
      </div>
      <section className="overflow-hidden rounded-3xl border border-dash-line bg-white">
        {loading && !data ? <div className="h-48 animate-pulse bg-slate-50" /> : rows.length === 0 ? <Empty icon={<MessageSquare size={22} />} title="No messages yet" sub="Every text you send, tests included, shows up here with what Termii reported." className="border-none" /> : (
          <ul className="divide-y divide-dash-line">
            {rows.map((m) => {
              const [label, tone] = OUTCOME[m.outcome] || OUTCOME.pending
              return (
                <li key={m.messageId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1.3fr)_auto]">
                  <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-dash-ink">{m.storeName || m.storeId || 'Not a vendor'}</span><span className="block font-mono text-[11px] text-slate-400 md:hidden">{m.phone}</span></span>
                  <span className="hidden font-mono text-[12px] text-slate-500 md:block">{m.phone}</span>
                  <span className="hidden truncate text-[12px] text-slate-500 md:block">{m.status || 'No report yet'}{m.pages ? ` · ${m.pages} page${m.pages === 1 ? '' : 's'}` : ''}</span>
                  <span className="flex flex-col items-end gap-0.5"><Pill tone={tone} dot>{label}</Pill><span className="text-[10.5px] text-slate-400">{timeAgo(m.sentAt || m.sentAtMs)}</span></span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <Pager page={data?.page || page} pages={data?.totalPages || 1} total={data?.total} perPage={25} onPage={setPage} />
      {data?.truncated && <p className="text-center text-[11.5px] text-slate-400">Searching the newest 2,000 messages.</p>}
    </div>
  )
}

function OptOuts({ notify }) {
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading } = useOpsData(`/api/admin-sms?action=opt-outs&n=${nonce}`)
  const rows = data?.optOuts || []
  const optIn = async (row) => {
    const { ok } = await confirm({ title: `Put ${row.local} back on the list?`, tone: 'warn', icon: <RefreshCw size={20} />, confirmLabel: 'Put back on',
      body: 'Only for a number that opted out by mistake, or your own test number. Texting people who asked to be left alone gets a sender ID blocked.', checklist: ['This number opted out by mistake, or it is mine.'] })
    if (!ok) return
    setBusy(row.phone)
    const res = await opsJson('/api/admin-sms?action=opt-in', { method: 'POST', body: { phone: row.phone } })
    setBusy('')
    if (!res.ok) { setErr(res.data.message || res.data.error || 'Could not change it.'); return }
    notify?.(`${row.local} can get promotional texts again.`)
    setNonce((n) => n + 1)
  }
  return (
    <section className="space-y-3">
      <Notice tone="info">Numbers that tapped Stop. They are skipped from every campaign and every test, straight away.</Notice>
      <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>
      <div className="overflow-hidden rounded-3xl border border-dash-line bg-white">
        {loading && !data ? <div className="h-32 animate-pulse bg-slate-50" /> : rows.length === 0 ? <Empty icon={<Ban size={22} />} title="Nobody has opted out" className="border-none" /> : (
          <ul className="divide-y divide-dash-line">{rows.map((r) => (
            <li key={r.phone} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{r.storeName || 'Not a vendor number'}</span><span className="font-mono text-[11.5px] text-slate-400">{r.local} · opted out {timeAgo(r.at || r.atMs)}</span></span>
              <Btn size="sm" tone="soft" icon={<RefreshCw size={13} />} busy={busy === r.phone} onClick={() => optIn(r)}>Put back on</Btn>
            </li>
          ))}</ul>
        )}
      </div>
      {confirmUi}
    </section>
  )
}

export default function SmsStudio({ notify }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState(EMPTY)
  const [audience, setAudience] = useState(null)
  const [counting, setCounting] = useState(false)
  const [busy, setBusy] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [view, setView] = useState('drafts')
  const [clock, setClock] = useState(() => Date.now())
  const bodyRef = useRef(null)
  const [confirmUi, confirm] = useConfirm()

  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(t) }, [])
  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data: d } = await opsJson('/api/admin-sms?action=overview')
    setLoading(false)
    if (ok || d?.config) setData(d)
    else setErr(d.message || d.error || 'Could not load SMS campaigns.')
  }, [])
  useEffect(() => { load() }, [load])

  // Count and cost follow what is typed, a moment behind it.
  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      setCounting(true)
      const { ok, data: d } = await opsJson('/api/admin-sms?action=audience', { method: 'POST', body: { filters: draft.filters, body: draft.body, includeLink: draft.includeLink, linkUrl: draft.linkUrl } })
      if (!live) return
      setCounting(false)
      if (ok) setAudience(d)
    }, 450)
    return () => { live = false; clearTimeout(t) }
  }, [draft.filters, draft.body, draft.includeLink, draft.linkUrl])

  const config = data?.config
  const quote = audience?.quote
  const liveWindow = sendWindow(new Date(clock))
  const windowState = data?.window?.open === false ? data.window : liveWindow
  const canSend = Boolean(config?.ready) && Boolean(draft.id) && (audience?.count || 0) > 0 && windowState?.open
  const campaigns = useMemo(() => data?.campaigns || [], [data])
  const drafts = campaigns.filter((c) => c.status !== 'sent')
  const sent = campaigns.filter((c) => c.status === 'sent')
  const totals = data?.totals

  const post = async (action, payload) => {
    const { ok, data: d } = await opsJson(`/api/admin-sms?action=${action}`, { method: 'POST', body: payload })
    if (!ok) throw new Error(d.message || d.error || 'Something went wrong.')
    return d
  }
  const run = async (label, fn) => { setBusy(label); setErr(''); try { await fn() } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const save = () => run('save', async () => { const d = await post('save', draft); setDraft((p) => ({ ...p, id: d.id })); notify?.('Saved.'); load() })
  const sendTest = () => run('test', async () => {
    let id = draft.id
    // A tracked link points at the URL saved on the campaign, so it must exist first.
    if (draft.includeLink && draft.linkUrl) { const saved = await post('save', draft); id = saved.id; setDraft((p) => ({ ...p, id: saved.id })) }
    const d = await post('test', { id, phone: testPhone, body: draft.body, includeLink: draft.includeLink, linkUrl: draft.linkUrl })
    notify?.(`Test sent to ${testPhone}, ${d.pages} page${d.pages === 1 ? '' : 's'}.${Number.isFinite(d.balance) ? ` Wallet now ${naira(d.balance)}.` : ''}`)
    load()
  })
  const sendCampaign = async () => {
    const { ok } = await confirm({ title: `Text ${Number(audience?.count || 0).toLocaleString()} vendors?`, tone: 'warn', icon: <Send size={20} />, confirmLabel: 'Send now',
      body: <>{quote?.pages} page{quote?.pages === 1 ? '' : 's'} each, about <strong>{naira(quote?.cost)}</strong> in total from the Termii wallet. This cannot be undone.</>,
      checklist: ['I sent a test to my own phone and read it.'] })
    if (!ok) return
    run('send', async () => { const d = await post('send', { id: draft.id }); notify?.(`Sent to ${d.sent} of ${d.audience}.${d.failed ? ` ${d.failed} failed.` : ''} Wallet now ${naira(d.balance)}.`); setDraft(EMPTY); setView('sent'); load() })
  }
  const remove = async (c) => {
    const { ok } = await confirm({ title: `Delete "${c.name}"?`, tone: 'danger', icon: <Trash2 size={20} />, confirmLabel: 'Delete', body: 'Only the draft is removed.' })
    if (ok) run(`del-${c.id}`, async () => { await post('delete', { id: c.id }); if (draft.id === c.id) setDraft(EMPTY); load() })
  }
  const edit = (c) => { setDraft({ id: c.id, name: c.name, body: c.body, linkUrl: c.linkUrl, includeLink: c.includeLink, filters: c.filters || {} }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const duplicate = (c) => { setDraft({ id: '', name: `${c.name} (copy)`, body: c.body, linkUrl: c.linkUrl, includeLink: c.includeLink, filters: c.filters || {} }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const insertLink = () => {
    const el = bodyRef.current
    const token = config?.linkPlaceholder || '{link}'
    if (!el) { setDraft((p) => ({ ...p, body: `${p.body}${token}` })); return }
    const start = el.selectionStart ?? draft.body.length
    const end = el.selectionEnd ?? start
    setDraft((p) => ({ ...p, body: `${p.body.slice(0, start)}${token}${p.body.slice(end)}` }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) })
  }
  const togglePlan = (plan) => setDraft((p) => { const plans = p.filters.plans || []; return { ...p, filters: { ...p.filters, plans: plans.includes(plan) ? plans.filter((x) => x !== plan) : [...plans, plan] } } })

  if (loading && !data) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>

  return (
    <div className="space-y-4">
      {!config?.ready && <Notice tone="warn"><strong>Not ready to send yet.</strong> {config?.message} You can still write, save and preview. Add TERMII_PROMO_SENDER_ID in Vercel once Termii approves it.</Notice>}
      {windowState && (windowState.open
        ? <Notice tone="ok">Sending is open until {windowState.closesAt}. Promotional texts cannot be delivered between {windowState.closesAt} and {windowState.opensAt}.</Notice>
        : <Notice tone="info">{windowState.reason}</Notice>)}
      <Notice tone="error" onClose={() => setErr('')}>{err}</Notice>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: 'Termii wallet', v: data?.wallet?.balance !== undefined ? naira(data.wallet.balance) : 'Unknown', s: `about ${config?.rate ? Math.floor((data?.wallet?.balance || 0) / config.rate).toLocaleString() : 0} pages left`, i: Wallet, hero: true },
          { l: 'Campaigns sent', v: Number(totals?.campaigns || 0).toLocaleString(), s: `${Number(totals?.sentMessages || 0).toLocaleString()} messages`, i: Send },
          { l: 'Link taps', v: Number(totals?.clicks || 0).toLocaleString(), s: `${totals?.clickRate || 0}% of messages`, i: MousePointerClick },
          { l: 'Blocked by DND', v: Number(totals?.dndBlocked || 0).toLocaleString(), s: totals?.delivered ? `${Number(totals.delivered).toLocaleString()} confirmed delivered` : 'Reported by Termii', i: Ban },
          { l: 'Spent on SMS', v: naira(totals?.spend), s: totals?.failed ? `${totals.failed} failed` : 'No failures', i: FileText },
        ].map((t) => (
          <div key={t.l} className={`rounded-3xl p-4 ${t.hero ? 'col-span-2 bg-gradient-to-br from-[#0b3d2c] to-[#0b6b35] text-white lg:col-span-1' : 'border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}>
            <p className={`flex items-center gap-1.5 text-[12px] font-semibold ${t.hero ? 'text-green-100/85' : 'text-dash-muted'}`}><t.i size={14} />{t.l}</p>
            <p className="mt-1.5 font-display text-[22px] font-extrabold leading-none tabular-nums">{t.v}</p>
            <p className={`mt-1 text-[11.5px] ${t.hero ? 'text-green-100/70' : 'text-slate-500'}`}>{t.s}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-[15px] font-bold text-dash-ink"><MessageSquare size={17} className="text-forest-600" />{draft.id ? 'Editing a campaign' : 'New campaign'}</p>{(draft.id || draft.body) && <button type="button" onClick={() => setDraft(EMPTY)} className="text-[12.5px] font-semibold text-slate-500 hover:text-dash-ink">Start over</button>}</div>
          <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Campaign name (only the team sees it)" className={INPUT} />
          <div>
            <textarea ref={bodyRef} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} rows={4} maxLength={480} placeholder={`Hi, your Sellapage store is waiting. Add your products and start selling today. ${config?.linkPlaceholder || '{link}'}`} className={`${INPUT} resize-none`} />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Btn size="sm" tone="soft" icon={<Link2 size={13} />} onClick={insertLink}>Insert link</Btn>
              <span className="text-[11.5px] text-slate-500">{config?.linkPlaceholder || '{link}'} becomes a short tracked link, so you can see who tapped.</span>
            </div>
          </div>
          <input value={draft.linkUrl} onChange={(e) => setDraft((p) => ({ ...p, linkUrl: e.target.value, includeLink: Boolean(e.target.value) }))} inputMode="url" placeholder="Where the link goes: https://www.sellapage.com.ng/dashboard" className={INPUT} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Length</p>
              <p className="mt-1 text-[14px] font-bold text-dash-ink">{quote?.characters ?? 0} characters · {quote?.pages ?? 0} page{quote?.pages === 1 ? '' : 's'}</p>
              <p className="text-[11.5px] text-slate-500">{quote?.remainingInPage ?? 0} left before the next page · {quote?.perPage ?? 160} a page</p>
              {quote?.unicode && <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-semibold text-amber-700"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />A special character (₦, an emoji, curly quotes) cut a page to 70 characters. Write NGN to keep 160.</p>}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Who gets it</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {PLANS.map((p) => <button key={p} type="button" onClick={() => togglePlan(p)} className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize ring-1 ${(draft.filters.plans || []).includes(p) ? 'bg-forest-600 text-white ring-forest-600' : 'bg-white text-slate-600 ring-dash-line'}`}>{p}</button>)}
                <button type="button" onClick={() => setDraft((p) => ({ ...p, filters: { ...p.filters, verifiedOnly: !p.filters.verifiedOnly } }))} className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${draft.filters.verifiedOnly ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}>Verified numbers only</button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-dash-ink"><Users size={14} className="text-forest-600" /><strong className="tabular-nums">{counting && !audience ? '...' : Number(audience?.count || 0).toLocaleString()}</strong> people · about <strong>{naira(quote?.cost)}</strong></p>
              {audience?.affordable === false && <p className="text-[11.5px] font-semibold text-red-600">More than the wallet holds.</p>}
              {audience?.skipped && <p className="mt-0.5 text-[11px] text-slate-400">Skipped: {audience.skipped.optedOut} opted out · {audience.skipped.noPhone} no number · {audience.skipped.badPhone} unusable · {audience.skipped.duplicate} repeated</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-dash-line pt-4">
            <Btn tone="soft" icon={<Save size={15} />} busy={busy === 'save'} disabled={!draft.body.trim()} onClick={save}>{draft.id ? 'Save changes' : 'Save draft'}</Btn>
            <span className="flex items-center gap-1.5">
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Your number" inputMode="tel" className="h-10 w-36 rounded-xl border border-dash-line px-3 text-[13px] outline-none focus:border-forest-600" />
              <Btn tone="soft" icon={<Smartphone size={15} />} busy={busy === 'test'} disabled={!config?.ready || !testPhone.trim() || !draft.body.trim()} onClick={sendTest}>Test</Btn>
            </span>
            <Btn className="sm:ml-auto" icon={windowState?.open ? <Send size={15} /> : <Ban size={15} />} busy={busy === 'send'} disabled={!canSend} onClick={sendCampaign} title={!draft.id ? 'Save the campaign first' : !windowState?.open ? windowState?.reason : ''}>
              Send to {Number(audience?.count || 0).toLocaleString()}
            </Btn>
          </div>
          {!draft.id && draft.body.trim() && <p className="-mt-2 text-[11.5px] text-slate-400">Save it first, then you can send it.</p>}
        </section>
        <section className="xl:sticky xl:top-24 xl:self-start"><p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-dash-muted"><Smartphone size={14} /> On a vendor&apos;s phone</p><Phone sender={config?.senderId} text={quote?.preview} /></section>
      </div>

      <SmsInsights data={data} />

      <Segmented value={view} onChange={setView} options={[
        { id: 'drafts', label: 'Drafts', icon: <Pencil size={14} />, count: drafts.length },
        { id: 'sent', label: 'Sent', icon: <CheckCircle2 size={14} />, count: sent.length },
        { id: 'log', label: 'Every message', icon: <ListChecks size={14} /> },
        { id: 'optouts', label: 'Opted out', icon: <Ban size={14} /> },
      ]} className="max-w-full overflow-x-auto" />

      {view === 'drafts' && (drafts.length === 0 ? <Empty icon={<Pencil size={22} />} title="No drafts" sub="Saved campaigns wait here until they are sent." /> : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{drafts.map((c) => (
          <li key={c.id} className="flex flex-col rounded-3xl border border-dash-line bg-white p-4">
            <p className="truncate text-[14px] font-bold text-dash-ink">{c.name || 'Untitled'}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12.5px] text-slate-600">{c.body}</p>
            <div className="mt-3 flex items-center gap-2"><Pill tone="slate">{c.status}</Pill><span className="flex-1" /><Btn size="sm" tone="soft" icon={<Pencil size={13} />} onClick={() => edit(c)}>Edit</Btn><button type="button" onClick={() => remove(c)} className="rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label="Delete draft"><Trash2 size={15} /></button></div>
          </li>
        ))}</ul>
      ))}
      {view === 'sent' && (sent.length === 0 ? <Empty icon={<Send size={22} />} title="Nothing sent yet" sub="Write a campaign, test it on your own phone, then send." /> : (
        <ul className="space-y-3">{sent.map((c) => (
          <li key={c.id} className="rounded-3xl border border-dash-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2"><p className="text-[14.5px] font-bold text-dash-ink">{c.name}</p><span className="text-[11.5px] text-slate-400">{fmtDateTime(c.sentAt)}</span><span className="flex-1" /><Btn size="sm" tone="soft" icon={<Copy size={13} />} onClick={() => duplicate(c)}>Use again</Btn></div>
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] text-slate-600">{c.body}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[['Sent', c.sent, 'text-dash-ink'], ['Reached handset', c.delivered, 'text-emerald-700'], ['DND', c.dndBlocked, 'text-amber-700'], ['Taps', c.clicks, 'text-sky-700'], ['Cost', naira(c.cost), 'text-dash-ink']].map(([l, v, cls]) => (
                <div key={l} className="rounded-2xl bg-slate-50 px-3 py-2"><p className="text-[10.5px] font-semibold text-slate-400">{l}</p><p className={`text-[15px] font-bold tabular-nums ${cls}`}>{typeof v === 'number' ? v.toLocaleString() : v ?? 0}</p></div>
              ))}
            </div>
            {c.failed ? <p className="mt-2 text-[12px] text-red-600">{c.failed} failed.</p> : null}
            {c.error ? <p className="mt-1 text-[12px] text-red-600">{c.error}</p> : null}
          </li>
        ))}</ul>
      ))}
      {view === 'log' && <Log campaigns={sent} />}
      {view === 'optouts' && <OptOuts notify={notify} />}

      <p className="text-[11.5px] leading-relaxed text-slate-400">Promotional texts go out on the {config?.senderId ? `"${config.senderId}"` : 'promotional'} sender ID, separate from sign-in codes. Numbers on DND may not get them, and MTN does not deliver promotional SMS between 8pm and 8am. Every message carries an opt-out link. Delivery results come from Termii a few minutes after a send.</p>
      {confirmUi}
    </div>
  )
}
