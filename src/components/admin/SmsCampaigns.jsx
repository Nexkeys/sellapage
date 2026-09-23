// Promotional SMS to vendors' phones.
//
// Everything that costs money is shown before the money is spent: who it
// reaches, how many pages the text is, what it will cost, and what is in the
// Termii wallet. The preview is the exact text one vendor receives, opt-out
// link included, so the character count is never a guess.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sendWindow } from '../../utils/smsWindow'
import {
  MessageSquare, Send, Save, Trash2, Loader2, RefreshCw, AlertCircle, CheckCircle2,
  Link2, Users, Wallet, MousePointerClick, Copy, X, Clock, Ban, Search,
} from 'lucide-react'

const SmsChart = lazy(() => import('./SmsChart'))

const PLANS = ['free', 'starter', 'growth', 'pro', 'premium']
const naira = (n) => `NGN ${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
}

const EMPTY = { id: '', name: '', body: '', linkUrl: '', includeLink: false, filters: {} }

const OUTCOME_STYLE = {
  delivered: 'bg-green-50 text-green-700 border-green-200',
  dnd: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
}
const OUTCOME_LABEL = { delivered: 'Delivered', dnd: 'DND', failed: 'Not delivered', pending: 'Waiting' }

const when = (iso, ms) => {
  const d = iso ? new Date(iso) : ms ? new Date(ms) : null
  if (!d || isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SmsCampaigns({ authHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState(EMPTY)
  const [audience, setAudience] = useState(null)
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const bodyRef = useRef(null)
  // The message log: every individual text, with what Termii reported back.
  const [log, setLog] = useState(null)
  const [logOutcome, setLogOutcome] = useState('')
  const [logCampaign, setLogCampaign] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [logLoading, setLogLoading] = useState(false)
  // Numbers that tapped "Stop", and the control to put one back on.
  const [optOuts, setOptOuts] = useState(null)
  const [optOutsLoading, setOptOutsLoading] = useState(false)
  // Worked out in the browser and refreshed every minute, so the state is right
  // even when the tab has been open since before 8pm. The server still decides:
  // this only shows what it will say.
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(async () => {
    const headers = await authHeaders()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin-sms?action=overview', { headers })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not load SMS campaigns.')
      setData(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  const loadLog = useCallback(async () => {
    const headers = await authHeaders()
    setLogLoading(true)
    try {
      const params = new URLSearchParams({ action: 'messages', limit: '25', page: String(logPage) })
      if (logOutcome) params.set('outcome', logOutcome)
      if (logCampaign) params.set('campaignId', logCampaign)
      if (logSearch.trim()) params.set('search', logSearch.trim())
      const r = await fetch(`/api/admin-sms?${params}`, { headers })
      const d = await r.json().catch(() => ({}))
      if (r.ok) setLog(d)
    } catch {
      // The rest of the tab still works without the log.
    } finally {
      setLogLoading(false)
    }
  }, [authHeaders, logPage, logOutcome, logCampaign, logSearch])

  useEffect(() => { loadLog() }, [loadLog])

  const loadOptOuts = useCallback(async () => {
    const headers = await authHeaders()
    setOptOutsLoading(true)
    try {
      const r = await fetch('/api/admin-sms?action=opt-outs', { headers })
      const d = await r.json().catch(() => ({}))
      if (r.ok) setOptOuts(d)
    } catch {
      // The rest of the tab still works without the list.
    } finally {
      setOptOutsLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { loadOptOuts() }, [loadOptOuts])

  // Audience and costing follow what is typed, a moment behind it.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const headers = await authHeaders()
      if (cancelled) return
      setAudienceLoading(true)
      try {
        const r = await fetch('/api/admin-sms?action=audience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            filters: draft.filters,
            body: draft.body,
            includeLink: draft.includeLink,
            linkUrl: draft.linkUrl,
          }),
        })
        const d = await r.json().catch(() => ({}))
        if (!cancelled && r.ok) setAudience(d)
      } catch {
        // The composer still works without a live count.
      } finally {
        if (!cancelled) setAudienceLoading(false)
      }
    }, 450)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [authHeaders, draft.filters, draft.body, draft.includeLink, draft.linkUrl])

  const config = data?.config
  const quote = audience?.quote
  const liveWindow = sendWindow(new Date(clock))
  // Closed wins either way: if the server says closed, it is closed.
  const windowState = data?.window?.open === false ? data.window : liveWindow
  const canSend = Boolean(config?.ready) && Boolean(draft.id) && (audience?.count || 0) > 0 && windowState?.open

  const post = async (action, payload) => {
    const headers = await authHeaders()
    const r = await fetch(`/api/admin-sms?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Something went wrong.')
    return d
  }

  const save = async () => {
    setBusy('save'); setError(''); setNotice('')
    try {
      const d = await post('save', draft)
      setDraft((prev) => ({ ...prev, id: d.id }))
      setNotice('Saved.')
      load()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const sendTest = async () => {
    setBusy('test'); setError(''); setNotice('')
    try {
      // A tracked link points at the URL stored on the campaign, so the draft
      // has to exist before a test can follow it anywhere. Saved here rather
      // than asking, because the alternative is a test that lands on the home
      // page and looks like the link was ignored.
      let id = draft.id
      if (draft.includeLink && draft.linkUrl) {
        const saved = await post('save', draft)
        id = saved.id
        setDraft((prev) => ({ ...prev, id: saved.id }))
      }
      const d = await post('test', {
        id,
        phone: testPhone,
        body: draft.body,
        includeLink: draft.includeLink,
        linkUrl: draft.linkUrl,
      })
      const balance = Number.isFinite(d.balance) ? ` Termii balance now ${naira(d.balance)}.` : ''
      setNotice(`Test sent to ${testPhone}, ${d.pages} page${d.pages === 1 ? '' : 's'}.${balance}`)
      load()
      loadLog()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const optIn = async (row) => {
    if (!window.confirm(`Put ${row.local} back on the list?\n\nOnly do this for a number that opted out by mistake, or your own test number. Sending to someone who asked to be left alone is what gets a sender ID blocked.`)) return
    setBusy(`optin-${row.phone}`); setError(''); setNotice('')
    try {
      await post('opt-in', { phone: row.phone })
      setNotice(`${row.local} can receive promotional texts again.`)
      loadOptOuts()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const sendCampaign = async () => {
    const summary = `Send to ${audience?.count} vendor(s)?\n\n${quote?.pages} page(s) each, about ${naira(quote?.cost)} in total.\n\nThis cannot be undone.`
    if (!window.confirm(summary)) return
    setBusy('send'); setError(''); setNotice('')
    try {
      const d = await post('send', { id: draft.id })
      setNotice(`Sent to ${d.sent} of ${d.audience}. ${d.failed ? `${d.failed} failed.` : 'None failed.'} Balance now ${naira(d.balance)}.`)
      setDraft(EMPTY)
      load()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this draft?')) return
    try { await post('delete', { id }); if (draft.id === id) setDraft(EMPTY); load() } catch (e) { setError(e.message) }
  }

  const edit = (c) => {
    setDraft({ id: c.id, name: c.name, body: c.body, linkUrl: c.linkUrl, includeLink: c.includeLink, filters: c.filters || {} })
    setNotice('')
    setError('')
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const duplicate = (c) => {
    setDraft({ id: '', name: `${c.name} (copy)`, body: c.body, linkUrl: c.linkUrl, includeLink: c.includeLink, filters: c.filters || {} })
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const insertPlaceholder = () => {
    const el = bodyRef.current
    const token = config?.linkPlaceholder || '{link}'
    if (!el) { setDraft((p) => ({ ...p, body: `${p.body}${token}` })); return }
    const start = el.selectionStart ?? draft.body.length
    const end = el.selectionEnd ?? start
    const next = `${draft.body.slice(0, start)}${token}${draft.body.slice(end)}`
    setDraft((p) => ({ ...p, body: next }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) })
  }

  const togglePlan = (plan) => {
    setDraft((p) => {
      const plans = p.filters.plans || []
      const next = plans.includes(plan) ? plans.filter((x) => x !== plan) : [...plans, plan]
      return { ...p, filters: { ...p.filters, plans: next } }
    })
  }

  const campaigns = useMemo(() => data?.campaigns || [], [data])
  const drafts = useMemo(() => campaigns.filter((c) => c.status !== 'sent'), [campaigns])
  const history = useMemo(() => campaigns.filter((c) => c.status === 'sent'), [campaigns])
  const totals = data?.totals

  if (loading && !data) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100/70" />)}</div>
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-green-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">SMS Campaigns</h2>
            <p className="text-[10px] text-gray-400">Promotional texts to vendors' phones. Separate sender ID from sign-in codes.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {!config?.ready && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-amber-900">Not ready to send yet</p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-800">{config?.message}</p>
            <p className="mt-1 text-[10px] text-amber-700">
              You can still write, save and preview campaigns. Add <span className="font-mono">TERMII_PROMO_SENDER_ID</span> in Vercel and .env once Termii approves it.
            </p>
          </div>
        </div>
      )}

      {windowState?.open && (
        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2">
          <Clock size={13} className="shrink-0 text-green-600" />
          <p className="text-[11px] font-semibold text-green-800">
            Sending is open until {windowState.closesAt}. Promotional texts cannot be delivered between {windowState.closesAt} and {windowState.opensAt}.
          </p>
        </div>
      )}

      {windowState && !windowState.open && (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <Clock size={14} className="mt-0.5 shrink-0 text-gray-500" />
          <p className="text-[11px] font-medium text-gray-600">{windowState.reason}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          <p className="flex-1 text-xs font-medium text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-500" />
          <p className="flex-1 text-xs font-medium text-green-700">{notice}</p>
          <button onClick={() => setNotice('')} className="text-green-400 hover:text-green-600"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'Termii wallet', v: data?.wallet?.balance !== undefined ? naira(data.wallet.balance) : 'Unknown', s: `about ${config?.rate ? Math.floor((data?.wallet?.balance || 0) / config.rate) : 0} pages left`, i: Wallet },
          { l: 'Campaigns sent', v: Number(totals?.campaigns || 0).toLocaleString(), s: `${Number(totals?.sentMessages || 0).toLocaleString()} messages`, i: Send },
          { l: 'Link taps', v: Number(totals?.clicks || 0).toLocaleString(), s: `${totals?.clickRate || 0}% of messages`, i: MousePointerClick },
          {
            l: 'Blocked by DND',
            v: Number(totals?.dndBlocked || 0).toLocaleString(),
            s: totals?.delivered ? `${Number(totals.delivered).toLocaleString()} confirmed delivered` : 'Reported by Termii',
            i: Ban,
          },
          { l: 'Spent on SMS', v: naira(totals?.spend), s: totals?.failed ? `${totals.failed} failed` : 'No failures', i: Wallet },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-1.5">
              <s.i size={11} className="text-gray-400" />
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{s.l}</p>
            </div>
            <p className="mt-1 text-lg font-black text-gray-900">{s.v}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">{s.s}</p>
          </div>
        ))}
      </div>

      {(data?.series || []).length > 0 && (
        <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-gray-100/70" />}>
          <SmsChart series={data.series} />
        </Suspense>
      )}

      {/* Composer */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-gray-800">{draft.id ? 'Editing campaign' : 'New campaign'}</h3>
          {draft.id ? <button onClick={() => setDraft(EMPTY)} className="text-[10px] font-bold text-gray-400 hover:text-gray-700">Start a new one</button> : null}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Campaign name (only you see this)</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="September re-engagement"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Message</span>
            <textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              maxLength={480}
              placeholder={`Hi, your Sellapage store is waiting. Add your products and start selling today. ${config?.linkPlaceholder || '{link}'}`}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={insertPlaceholder} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50">
              <Link2 size={11} /> Insert link
            </button>
            <span className="text-[10px] text-gray-400">
              {config?.linkPlaceholder || '{link}'} becomes a short tracked link, so you can see who tapped.
            </span>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Where the link goes</span>
            <input
              value={draft.linkUrl}
              onChange={(e) => setDraft((p) => ({ ...p, linkUrl: e.target.value, includeLink: Boolean(e.target.value) }))}
              placeholder="https://www.sellapage.com.ng/dashboard"
              inputMode="url"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </label>

          {/* Counter + preview */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Length</p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {quote?.characters ?? 0} characters · {quote?.pages ?? 0} page{quote?.pages === 1 ? '' : 's'}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {quote?.remainingInPage ?? 0} left before the next page · {quote?.perPage ?? 160} per page
              </p>
              {quote?.unicode && (
                <p className="mt-1 text-[10px] font-semibold text-amber-700">
                  A special character (₦, emoji, curly quotes) cut the page to 70 characters. Use "NGN" to keep 160.
                </p>
              )}
              <p className="mt-1 text-[10px] text-gray-500">Opt-out link is added automatically and counted above.</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview on a phone</p>
              <div className="mt-2 rounded-xl rounded-tl-sm bg-white p-2.5 shadow-sm ring-1 ring-gray-200">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{config?.senderId || 'Sellapage'}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-snug text-gray-800">
                  {quote?.preview || 'Your message will appear here.'}
                </p>
              </div>
            </div>
          </div>

          {/* Audience */}
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Who gets it</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLANS.map((plan) => {
                const on = (draft.filters.plans || []).includes(plan)
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize transition-colors ${on ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    {plan}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, filters: { ...p.filters, verifiedOnly: !p.filters.verifiedOnly } }))}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${draft.filters.verifiedOnly ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Verified numbers only
              </button>
              {(draft.filters.plans?.length || draft.filters.verifiedOnly) ? (
                <button type="button" onClick={() => setDraft((p) => ({ ...p, filters: {} }))} className="rounded-full px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-700">
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="flex items-center gap-1 text-xs font-black text-gray-900">
                <Users size={12} className="text-gray-400" />
                {audienceLoading ? <Loader2 size={12} className="animate-spin text-gray-400" /> : Number(audience?.count || 0).toLocaleString()} recipients
              </p>
              <p className="text-[10px] text-gray-500">
                {Number(audience?.bySource?.verified || 0).toLocaleString()} verified · {Number(audience?.bySource?.whatsapp || 0).toLocaleString()} WhatsApp number
              </p>
              <p className="text-[10px] font-bold text-gray-900">Cost about {naira(quote?.cost)}</p>
              {audience?.affordable === false && <p className="text-[10px] font-bold text-red-600">More than the wallet holds</p>}
            </div>
            {audience?.skipped ? (
              <p className="mt-1 text-[10px] text-gray-400">
                Skipped: {audience.skipped.optedOut} opted out · {audience.skipped.noPhone} no number · {audience.skipped.badPhone} unusable · {audience.skipped.duplicate} duplicate
              </p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={busy === 'save' || !draft.body.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {draft.id ? 'Save changes' : 'Save draft'}
            </button>

            <div className="flex items-center gap-1.5">
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="08012345678"
                inputMode="tel"
                className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-medium outline-none"
              />
              <button
                onClick={sendTest}
                disabled={busy === 'test' || !config?.ready || !testPhone.trim() || !draft.body.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === 'test' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test send
              </button>
            </div>

            <button
              onClick={sendCampaign}
              disabled={busy === 'send' || !canSend}
              title={!draft.id ? 'Save the campaign first' : !windowState?.open ? windowState?.reason : ''}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {busy === 'send' ? <Loader2 size={12} className="animate-spin" /> : windowState?.open ? <Send size={12} /> : <Ban size={12} />}
              {busy === 'send' ? 'Sending...' : `Send to ${Number(audience?.count || 0).toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-4 py-2.5"><h3 className="text-xs font-bold text-gray-800">Drafts</h3></div>
          <div className="divide-y divide-gray-50">
            {drafts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-gray-900">{c.name}</p>
                  <p className="truncate text-[11px] text-gray-500">{c.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  <button onClick={() => edit(c)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50">Edit</button>
                  <button onClick={() => remove(c.id)} aria-label="Delete draft" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="border-b border-gray-100 px-4 py-2.5"><h3 className="text-xs font-bold text-gray-800">Sent campaigns</h3></div>
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare size={18} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-gray-900">Nothing sent yet</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Write a campaign above, test it on your own phone, then send.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-gray-900">{c.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${STATUS_STYLE.sent}`}>sent</span>
                    <button onClick={() => duplicate(c)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50">
                      <Copy size={10} /> Duplicate
                    </button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-snug text-gray-600">{c.body}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                  <span><span className="font-bold text-gray-900">{c.sent.toLocaleString()}</span> delivered{c.failed ? <span className="text-red-600"> · {c.failed} failed</span> : null}</span>
                  <span><span className="font-bold text-gray-900">{c.clicks.toLocaleString()}</span> taps{c.clickedBy ? ` · ${c.clickedBy} vendors` : ''}</span>
                  {(c.delivered || c.dndBlocked || c.undelivered) ? (
                    <span>
                      <span className="font-bold text-gray-900">{c.delivered.toLocaleString()}</span> delivered to handset
                      {c.dndBlocked ? <span className="text-amber-700"> · {c.dndBlocked} blocked by DND</span> : null}
                      {c.undelivered ? <span className="text-red-600"> · {c.undelivered} not delivered</span> : null}
                    </span>
                  ) : (
                    <span className="text-gray-400">Delivery reports pending</span>
                  )}
                  <span>{naira(c.cost)}</span>
                  <span>{c.sentAt ? new Date(c.sentAt).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                {c.error ? <p className="mt-1 text-[10px] text-red-600">{c.error}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message log: one row per text, with Termii's own verdict on it. */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
          <div>
            <h3 className="text-xs font-bold text-gray-800">Message log</h3>
            <p className="text-[10px] text-gray-400">Every text and what Termii reported back about it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
              <Search size={11} className="text-gray-400" />
              <input
                value={logSearch}
                onChange={(e) => { setLogSearch(e.target.value); setLogPage(1) }}
                placeholder="Store or number"
                className="w-28 bg-transparent text-[11px] font-medium outline-none placeholder-gray-400 sm:w-36"
              />
            </div>
            <select value={logOutcome} onChange={(e) => { setLogOutcome(e.target.value); setLogPage(1) }} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium outline-none">
              <option value="">All outcomes</option>
              <option value="delivered">Delivered</option>
              <option value="dnd">Blocked by DND</option>
              <option value="failed">Not delivered</option>
              <option value="pending">Awaiting report</option>
            </select>
            {history.length > 0 && (
              <select value={logCampaign} onChange={(e) => { setLogCampaign(e.target.value); setLogPage(1) }} className="max-w-[9rem] rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium outline-none">
                <option value="">All campaigns</option>
                {history.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {log?.counts && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-gray-50 bg-gray-50/60 px-4 py-2 text-[10px] font-semibold">
            <span className="text-green-700">{Number(log.counts.delivered).toLocaleString()} delivered</span>
            <span className="text-amber-700">{Number(log.counts.dnd).toLocaleString()} blocked by DND</span>
            <span className="text-red-600">{Number(log.counts.failed).toLocaleString()} not delivered</span>
            <span className="text-gray-500">{Number(log.counts.pending).toLocaleString()} awaiting report</span>
          </div>
        )}

        {logLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-300" /></div>}

        {!logLoading && !(log?.messages || []).length && (
          <div className="px-4 py-8 text-center">
            <MessageSquare size={18} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-gray-900">No messages yet</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Every text you send, including test sends, appears here with its delivery status.</p>
          </div>
        )}

        {!logLoading && (log?.messages || []).length > 0 && (
          <>
            <div className="divide-y divide-gray-50 lg:hidden">
              {log.messages.map((m) => (
                <div key={m.messageId} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-gray-900">{m.storeName || m.storeId || 'Unknown'}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${OUTCOME_STYLE[m.outcome] || OUTCOME_STYLE.pending}`}>{OUTCOME_LABEL[m.outcome] || m.outcome}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">{m.phone} · {m.pages ? `${m.pages} page${m.pages === 1 ? '' : 's'} · ` : ''}{when(m.sentAt, m.sentAtMs)}</p>
                  {m.status ? <p className="mt-0.5 truncate text-[10px] text-gray-400">{m.status}</p> : null}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80 text-[9px] font-black uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Number</th>
                    <th className="px-4 py-2">Outcome</th>
                    <th className="px-4 py-2">Termii status</th>
                    <th className="px-4 py-2 text-right">Pages</th>
                    <th className="px-4 py-2 text-right">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {log.messages.map((m) => (
                    <tr key={m.messageId} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2"><p className="max-w-[160px] truncate font-bold text-gray-900">{m.storeName || m.storeId || '-'}</p></td>
                      <td className="px-4 py-2 font-mono text-[10px] text-gray-500">{m.phone}</td>
                      <td className="px-4 py-2"><span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${OUTCOME_STYLE[m.outcome] || OUTCOME_STYLE.pending}`}>{OUTCOME_LABEL[m.outcome] || m.outcome}</span></td>
                      <td className="px-4 py-2"><p className="max-w-[240px] truncate text-[10px] text-gray-500">{m.status || 'No report yet'}</p></td>
                      <td className="px-4 py-2 text-right text-gray-600">{m.pages ?? '-'}</td>
                      <td className="px-4 py-2 text-right text-[10px] text-gray-400">{when(m.sentAt, m.sentAtMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2">
              <button onClick={() => setLogPage((n) => Math.max(1, n - 1))} disabled={log.page <= 1} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 disabled:opacity-50">Prev</button>
              <span className="text-center text-[10px] font-semibold text-gray-500">
                {log.page}/{log.totalPages} · {Number(log.total).toLocaleString()} messages
                {log.truncated ? <span className="block font-normal text-gray-400">newest 2,000 only</span> : null}
              </span>
              <button onClick={() => setLogPage((n) => n + 1)} disabled={log.page >= log.totalPages} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 disabled:opacity-50">Next</button>
            </div>
          </>
        )}
      </div>
      {/* Numbers that asked to be left alone, and the way back for a mistake. */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
          <div>
            <h3 className="text-xs font-bold text-gray-800">Opted out</h3>
            <p className="text-[10px] text-gray-400">Numbers that tapped Stop. They are skipped from every campaign and every test.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
            {Number(optOuts?.total || 0).toLocaleString()}
          </span>
        </div>

        {optOutsLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-300" /></div>}

        {!optOutsLoading && !(optOuts?.optOuts || []).length && (
          <div className="px-4 py-8 text-center">
            <Ban size={18} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-gray-900">Nobody has opted out</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Anyone who taps the Stop link in a message appears here, and stops receiving promotional texts straight away.</p>
          </div>
        )}

        {!optOutsLoading && (optOuts?.optOuts || []).length > 0 && (
          <div className="divide-y divide-gray-50">
            {optOuts.optOuts.map((row) => (
              <div key={row.phone} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-gray-900">{row.storeName || 'Not a vendor number'}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400">{row.local} · opted out {when(row.at, row.atMs)}</p>
                </div>
                <button
                  onClick={() => optIn(row)}
                  disabled={busy === `optin-${row.phone}`}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy === `optin-${row.phone}` ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Put back on
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] leading-snug text-gray-400">
        Promotional messages go out on the {config?.senderId ? `"${config.senderId}"` : 'promotional'} sender ID and Termii's generic route,
        which is separate from sign-in codes. Numbers registered on DND may not receive them, and MTN does not deliver
        promotional SMS between 8pm and 8am. Every message carries an opt-out link, and anyone who opts out is skipped
        from then on. Delivered, DND and not delivered come from Termii's delivery reports, which arrive after a send,
        so they fill in over the minutes that follow.
      </p>
    </div>
  )
}
