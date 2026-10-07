// src/ops/tabs/TrialsStudio.jsx
//
// Free Trials: give a store free time on a paid plan, then pause, resume or
// stop it. A trial is paid features with no payment, so granting and stopping
// ask for the authenticator code (sudo mode), and the store is picked from a
// search, never typed as an id (/api/admin-trials). The vendor is emailed and
// notified on grant, pause and stop by the server.
import { useMemo, useState } from 'react'
import { Gift, Search, Pause, Play, XCircle, Check, CalendarClock, Sparkles, ShieldAlert } from 'lucide-react'
import { useOpsData } from '../opsKit'
import { opsJson } from '../opsSession'
import { initials, avatarTone } from '../opsUi'
import { Chips, Pager, PlanPill, Pill, Empty, Notice, Btn, Meter, useClientPages, useConfirm, fmtDate, timeAgo, title } from './kit'

const PLANS = ['growth', 'pro', 'premium']
const LENGTHS = [7, 14, 30, 60, 90]
const TONE = { active: ['Running', 'green'], paused: ['Paused', 'amber'], ended: ['Ended', 'slate'], revoked: ['Stopped', 'red'] }

function Step({ n, label, done, active }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition ${done ? 'bg-forest-600 text-white' : active ? 'bg-forest-50 text-forest-700 ring-2 ring-forest-600' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check size={14} /> : n}</span>
      <span className={`text-[12.5px] font-semibold ${active || done ? 'text-dash-ink' : 'text-slate-400'}`}>{label}</span>
    </span>
  )
}

function Grant({ onGranted }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState(null)
  const [plan, setPlan] = useState('premium')
  const [days, setDays] = useState(14)
  const [note, setNote] = useState('')
  const [override, setOverride] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const step = picked ? 2 : 1
  // Same rule as the server (_lib/trials.js grantTrial): a paid plan with an end date still ahead.
  const paidLive = picked && !['starter', 'free'].includes(picked.plan) && !!picked.planEndDate && new Date(picked.planEndDate) > new Date()
  const hasTrial = picked && ['active', 'paused'].includes(picked.trialStatus)

  const find = async () => {
    if (q.trim().length < 2) return
    setSearching(true); setMsg(null)
    const { ok, data } = await opsJson(`/api/admin-trials?action=find&q=${encodeURIComponent(q.trim().toLowerCase())}`)
    setSearching(false)
    setResults(ok ? data.stores || [] : [])
    if (!ok) setMsg({ ok: false, text: data.message || data.error || 'Search failed.' })
  }
  const grant = async () => {
    setBusy(true); setMsg(null)
    const { ok, data } = await opsJson('/api/admin-trials?action=grant', { method: 'POST', body: { storeId: picked.storeId, plan, days: Number(days), note, override } })
    setBusy(false)
    if (!ok) { setMsg({ ok: false, text: data.message || data.error || 'Could not grant that trial.' }); return }
    setMsg({ ok: true, text: `${picked.businessName || picked.storeName} is on ${title(plan)} until ${fmtDate(data.endsAt)}. They have been emailed.` })
    setPicked(null); setResults(null); setQ(''); setNote(''); setOverride(false)
    onGranted()
  }

  return (
    <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-rose-400 text-white shadow-sm"><Gift size={20} /></span>
        <div><p className="text-[15px] font-bold text-dash-ink">Give a free trial</p><p className="text-[12px] text-dash-muted">Paid features, free, for a set number of days</p></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Step n={1} label="Find the store" done={step > 1} active={step === 1} /><span className="h-px w-6 bg-slate-200" /><Step n={2} label="Plan and length" active={step === 2} /></div>

      {!picked ? (
        <div className="mt-4">
          <div className="flex gap-2">
            <label className="relative flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} placeholder="Start of the store link, e.g. bisibakes"
                className="h-11 w-full rounded-2xl border border-dash-line bg-white pl-10 pr-3 text-[13.5px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-50" /></label>
            <Btn tone="dark" busy={searching} disabled={q.trim().length < 2} onClick={find}>Find</Btn>
          </div>
          {results && (
            <ul className="mt-3 space-y-1.5">
              {results.length === 0 ? <li className="rounded-2xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-500">No store link starts with that. Store links are lowercase with no spaces.</li> : results.map((s) => (
                <li key={s.storeId}>
                  <button type="button" onClick={() => setPicked(s)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 ring-dash-line transition hover:bg-forest-50/50 hover:ring-forest-200">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${avatarTone(s.storeId)}`}>{initials(s.businessName || s.storeName)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-dash-ink">{s.businessName || s.storeName}</span><span className="text-[11.5px] text-slate-500">/{s.storeName}</span></span>
                    <PlanPill plan={s.plan} />{s.trialStatus && <Pill tone="amber">Trial {s.trialStatus}</Pill>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${avatarTone(picked.storeId)}`}>{initials(picked.businessName || picked.storeName)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-dash-ink">{picked.businessName || picked.storeName}</p><p className="text-[12px] text-slate-500">Now on {title(picked.plan)}{picked.planEndDate ? ` until ${fmtDate(picked.planEndDate)}` : ''}</p></div>
            <button type="button" onClick={() => setPicked(null)} className="text-[12.5px] font-semibold text-slate-500 hover:text-dash-ink">Change</button>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-700">Plan</p>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => <button key={p} type="button" onClick={() => setPlan(p)} className={`rounded-2xl px-3 py-3 text-[13px] font-bold capitalize ring-1 transition ${plan === p ? 'bg-forest-600 text-white ring-forest-600 shadow-sm' : 'bg-white text-slate-600 ring-dash-line hover:bg-slate-50'}`}>{p}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-700">Length</p>
            <div className="flex flex-wrap items-center gap-2">
              {LENGTHS.map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ring-1 transition ${Number(days) === d ? 'bg-dash-ink text-white ring-dash-ink' : 'bg-white text-slate-600 ring-dash-line'}`}>{d} days</button>)}
              <label className="flex items-center gap-1.5 text-[12.5px] text-slate-500"><input type="number" min="1" max="120" value={days} onChange={(e) => setDays(e.target.value)} className="h-9 w-20 rounded-xl border border-dash-line px-2.5 text-[13px] outline-none focus:border-forest-600" /> days</label>
            </div>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Why (optional). It is shown to the vendor in the email."
            className="h-11 w-full rounded-2xl border border-dash-line px-3.5 text-[13.5px] outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-50" />
          {(paidLive || hasTrial) && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-900 ring-1 ring-amber-100">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#b45309]" />
              <span><strong>{hasTrial ? 'They already have a trial.' : 'They are on a paid plan that has not ended.'}</strong> Tick to replace it. Their current plan is saved and handed back when this trial ends.</span>
            </label>
          )}
          <Btn size="lg" icon={<Sparkles size={16} />} busy={busy} disabled={!(Number(days) >= 1 && Number(days) <= 120) || ((paidLive || hasTrial) && !override)} onClick={grant} className="w-full">Give {title(plan)} free for {days} days</Btn>
        </div>
      )}
      {msg && <Notice tone={msg.ok ? 'ok' : 'error'} onClose={() => setMsg(null)} className="mt-3">{msg.text}</Notice>}
    </section>
  )
}

export default function TrialsStudio({ notify }) {
  const [filter, setFilter] = useState('active')
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmUi, confirm] = useConfirm()
  const { data, loading, error } = useOpsData(`/api/admin-trials?action=list&n=${nonce}`)
  const all = useMemo(() => data?.trials || [], [data])
  const rows = useMemo(() => (filter === 'all' ? all : all.filter((t) => (filter === 'ended' ? t.status === 'ended' || t.status === 'revoked' : t.status === filter))), [all, filter])
  const pg = useClientPages(rows, 8)

  const act = async (t, action) => {
    const name = t.businessName || t.storeName
    let reason = ''
    if (action === 'pause' || action === 'revoke') {
      const r = await confirm({
        title: action === 'pause' ? `Pause ${name}'s trial?` : `Stop ${name}'s trial?`, tone: action === 'revoke' ? 'danger' : 'warn',
        icon: action === 'pause' ? <Pause size={20} /> : <ShieldAlert size={20} />, confirmLabel: action === 'pause' ? 'Pause trial' : 'Stop trial',
        body: action === 'pause' ? `Their store goes back to ${title(t.returnsTo)} for now, and the ${t.daysLeft} day(s) left are kept for when you resume.` : `Their store goes back to ${title(t.returnsTo)} now. Nothing they made is deleted. They are emailed your reason.`,
        reason: { label: 'Reason they will see', required: action === 'revoke', min: 5 },
      })
      if (!r.ok) return
      reason = r.reason
    }
    setBusy(`${t.storeId}:${action}`); setErr('')
    const { ok, data: d } = await opsJson(`/api/admin-trials?action=${action}`, { method: 'POST', body: { storeId: t.storeId, ...(reason ? { reason } : {}) } })
    setBusy('')
    if (!ok) { setErr(d.message || d.error || 'That did not work.'); return }
    notify?.(action === 'pause' ? 'Trial paused.' : action === 'resume' ? 'Trial resumed.' : 'Trial stopped.')
    setNonce((n) => n + 1)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start"><Grant onGranted={() => setNonce((n) => n + 1)} /></div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Chips value={filter} onChange={setFilter} options={[
            { id: 'active', label: 'Running', count: data?.counts?.active, dot: 'bg-emerald-500' },
            { id: 'paused', label: 'Paused', count: data?.counts?.paused, dot: 'bg-amber-500' },
            { id: 'ended', label: 'Ended or stopped' }, { id: 'all', label: 'All', count: data?.counts?.total },
          ]} />
        </div>
        <Notice tone="error" onClose={() => setErr('')}>{err || error}</Notice>
        {loading && !data ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white ring-1 ring-dash-line" />)}</div>
          : rows.length === 0 ? <Empty icon={<CalendarClock size={22} />} title={filter === 'active' ? 'No trials running' : 'Nothing here'} sub="Trials you give show up here with the days they have left." />
            : (
              <>
                <ul className="space-y-3">
                  {pg.rows.map((t) => {
                    const [label, tone] = TONE[t.status] || TONE.ended
                    const total = Number(t.days) || 0
                    const used = total ? Math.max(0, total - (t.daysLeft || 0)) : 0
                    return (
                      <li key={t.storeId} className="rounded-3xl border border-dash-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${avatarTone(t.storeId)}`}>{initials(t.businessName || t.storeName)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2"><span className="truncate text-[14.5px] font-bold text-dash-ink">{t.businessName || t.storeName}</span><Pill tone={tone} dot>{label}</Pill><PlanPill plan={t.trialPlan} /></p>
                            <p className="mt-0.5 text-[12px] text-slate-500">Given {timeAgo(t.grantedAt)} · goes back to {title(t.returnsTo)} after{t.note ? ` · "${t.note}"` : ''}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {t.status === 'active' && <Btn size="sm" tone="soft" icon={<Pause size={13} />} busy={busy === `${t.storeId}:pause`} onClick={() => act(t, 'pause')}>Pause</Btn>}
                            {t.status === 'paused' && <Btn size="sm" icon={<Play size={13} />} busy={busy === `${t.storeId}:resume`} onClick={() => act(t, 'resume')}>Resume</Btn>}
                            {(t.status === 'active' || t.status === 'paused') && <Btn size="sm" tone="danger-soft" icon={<XCircle size={13} />} busy={busy === `${t.storeId}:revoke`} onClick={() => act(t, 'revoke')}>Stop</Btn>}
                          </div>
                        </div>
                        {(t.status === 'active' || t.status === 'paused') && total > 0 && (
                          <div className="mt-4">
                            <div className="mb-1.5 flex items-center justify-between text-[12px]"><span className="text-slate-500">{t.status === 'paused' ? 'Saved for later' : `Ends ${fmtDate(t.endsAt)}`}</span><span className="font-bold tabular-nums text-dash-ink">{t.daysLeft} of {total} days left</span></div>
                            <Meter value={used} of={total} tone={t.status === 'paused' ? 'bg-amber-400' : t.daysLeft <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-forest-600 to-emerald-400'} className="h-2.5" />
                          </div>
                        )}
                        {(t.status === 'ended' || t.status === 'revoked') && <p className="mt-3 text-[12px] text-slate-500">{t.status === 'revoked' ? 'Stopped' : 'Ended'} {fmtDate(t.endedAt)}{t.endedMessage ? `: ${t.endedMessage}` : ''}</p>}
                        {t.status === 'paused' && t.pausedReason && <p className="mt-2 text-[12px] text-amber-700">Paused because: {t.pausedReason}</p>}
                      </li>
                    )
                  })}
                </ul>
                <Pager page={pg.page} pages={pg.pages} total={pg.total} perPage={8} onPage={pg.setPage} />
              </>
            )}
      </div>
      {confirmUi}
    </div>
  )
}
