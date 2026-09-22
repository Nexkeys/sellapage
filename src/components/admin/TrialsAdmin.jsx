// src/components/admin/TrialsAdmin.jsx
// Grant, pause, resume and revoke free trials. Same shape as NewsletterAdmin
// and PartnersAdmin: own fetches, own state, authed through `authHeaders`.
//
// Every refusal from the API (already on a paid plan, already has a trial)
// comes back as success:false with wording meant for a human, and is shown as
// written rather than translated again here.
import { useState, useCallback, useEffect } from 'react'
import {
  Gift, Search, Loader2, AlertCircle, RefreshCw, Pause, Play, XCircle, Clock,
} from 'lucide-react'
import { SkeletonRows } from '../Skeleton'

const PLANS = ['growth', 'pro', 'premium']
const LENGTHS = [7, 14, 30, 60, 90]

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  ended: 'bg-gray-100 text-gray-600 border-gray-200',
  revoked: 'bg-red-50 text-red-600 border-red-200',
}

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '-'

export default function TrialsAdmin({ authHeaders }) {
  const [trials, setTrials] = useState([])
  const [counts, setCounts] = useState({ active: 0, paused: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Grant form
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState(null)
  const [plan, setPlan] = useState('premium')
  const [days, setDays] = useState(14)
  const [note, setNote] = useState('')
  const [override, setOverride] = useState(false)
  const [granting, setGranting] = useState(false)
  const [formMsg, setFormMsg] = useState(null)

  const [busyId, setBusyId] = useState(null)

  const call = useCallback(
    async (action, { method = 'GET', body, query: qs = '' } = {}) => {
      const res = await fetch(`/api/admin-trials?action=${action}${qs}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      return data
    },
    [authHeaders],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await call('list')
      setTrials(data.trials || [])
      setCounts(data.counts || { active: 0, paused: 0, total: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [call])

  useEffect(() => {
    load()
  }, [load])

  const search = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    setResults([])
    try {
      const data = await call('find', { query: `&q=${encodeURIComponent(query.trim())}` })
      setResults(data.stores || [])
    } catch (err) {
      setFormMsg({ ok: false, text: err.message })
    } finally {
      setSearching(false)
    }
  }

  const grant = async () => {
    if (!picked) return
    setGranting(true)
    setFormMsg(null)
    try {
      const data = await call('grant', {
        method: 'POST',
        body: { storeId: picked.storeId, plan, days: Number(days), note, override },
      })
      if (data.success) {
        setFormMsg({
          ok: true,
          text: `${picked.storeName} is on ${plan} until ${fmtDate(data.endsAt)}.`,
        })
        setPicked(null)
        setQuery('')
        setResults([])
        setNote('')
        setOverride(false)
        load()
      } else {
        setFormMsg({ ok: false, text: data.message || 'Could not grant that trial.' })
      }
    } catch (err) {
      setFormMsg({ ok: false, text: err.message })
    } finally {
      setGranting(false)
    }
  }

  const act = async (action, row) => {
    // Revoking drops a vendor off paid features straight away, so it asks first.
    if (action === 'revoke') {
      const back = row.returnsTo === 'starter' ? 'the free Starter plan' : `their ${row.returnsTo} plan`
      if (!window.confirm(`End ${row.storeName}'s ${row.trialPlan} trial now? They go back to ${back}.`)) return
    }
    setBusyId(row.storeId)
    try {
      const data = await call(action, { method: 'POST', body: { storeId: row.storeId } })
      if (!data.success) setError(data.message || 'That did not work.')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Gift size={18} className="text-green-600" />
          <h2 className="font-bold text-gray-900">Free Trials</h2>
          <span className="text-xs text-gray-500">
            {counts.active} running, {counts.paused} paused
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Grant form. A trial is a real upgrade with no payment behind it, so
          the vendor is picked from a search rather than typed by hand: pasting
          the wrong store id would hand paid features to a stranger. */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold text-gray-900">Grant a trial</p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search store name"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
          <button
            type="button"
            onClick={search}
            disabled={searching || query.trim().length < 2}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Find
          </button>
        </div>

        {results.length > 0 && (
          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
            {results.map((s) => (
              <button
                key={s.storeId}
                type="button"
                onClick={() => {
                  setPicked(s)
                  setResults([])
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-gray-900 font-medium">
                  {s.storeName}
                  <span className="text-gray-400 font-normal"> · {s.businessName}</span>
                </span>
                <span className="text-[11px] uppercase font-bold text-gray-500">{s.plan}</span>
              </button>
            ))}
          </div>
        )}

        {picked && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="text-sm">
              <span className="font-bold text-gray-900">{picked.storeName}</span>
              <span className="text-gray-500"> · currently {picked.plan}</span>
              {picked.planEndDate && (
                <span className="text-gray-500"> until {fmtDate(picked.planEndDate)}</span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border capitalize ${
                    plan === p
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {LENGTHS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    Number(days) === d
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {d} days
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="120"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              />
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why (optional, kept on the record)"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Override an existing trial or a live paid plan. Their current plan is saved and
                handed back when this trial ends.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={grant}
                disabled={granting}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {granting ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                Grant {plan} for {days} days
              </button>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="px-3 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {formMsg && (
          <p className={`text-xs font-medium ${formMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {formMsg.text}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonRows count={4} />
      ) : trials.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No trials granted yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {trials.map((t) => (
            <div key={t.storeId} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">{t.storeName}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      STATUS_STYLES[t.status] || STATUS_STYLES.ended
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[11px] uppercase font-bold text-gray-500">
                    {t.trialPlan}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.status === 'active' && (
                    <>
                      <Clock size={11} className="inline mb-0.5" /> {t.daysLeft} day
                      {t.daysLeft === 1 ? '' : 's'} left, ends {fmtDate(t.endsAt)} ·{' '}
                    </>
                  )}
                  {t.status === 'paused' && <>{t.daysLeft} days banked · </>}
                  {(t.status === 'ended' || t.status === 'revoked') && (
                    <>
                      {t.status === 'revoked' ? 'Revoked' : 'Ended'} {fmtDate(t.endedAt)} · now on{' '}
                      {t.landedOn || t.currentPlan} ·{' '}
                    </>
                  )}
                  returns to {t.returnsTo}
                  {t.note ? ` · ${t.note}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {busyId === t.storeId ? (
                  <Loader2 size={15} className="animate-spin text-gray-400" />
                ) : (
                  <>
                    {t.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => act('pause', t)}
                        className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                      >
                        <Pause size={13} />
                        Pause
                      </button>
                    )}
                    {t.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => act('resume', t)}
                        className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700"
                      >
                        <Play size={13} />
                        Resume
                      </button>
                    )}
                    {(t.status === 'active' || t.status === 'paused') && (
                      <button
                        type="button"
                        onClick={() => act('revoke', t)}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                      >
                        <XCircle size={13} />
                        Revoke
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
