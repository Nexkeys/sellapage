// src/components/admin/UsageTab.jsx
// The full Firestore usage screen: today against the free limits, a chart of
// the day in 15-minute steps, where it went, and the days before it.
//
// The chart is drawn as inline SVG rather than pulling in a charting library.
// This is one bar series on one admin screen; a library would add far more to
// every visitor's bundle than it is worth here.
import { useState, useEffect, useCallback } from 'react'
import {
  Database, RefreshCw, Loader2, AlertTriangle, TrendingUp, Check, Link2,
} from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-NG')

function tone(percent, willExceed) {
  if (percent >= 80 || willExceed) return { bar: 'bg-red-500', text: 'text-red-600', fill: '#ef4444' }
  if (percent >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600', fill: '#f59e0b' }
  return { bar: 'bg-green-500', text: 'text-green-600', fill: '#22c55e' }
}

function Big({ label, data }) {
  if (!data) return null
  const t = tone(data.percent, data.willExceed)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${t.text}`}>{fmt(data.used)}</p>
      <p className="text-[11px] text-gray-400">of {fmt(data.limit)} free today</p>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
        <div className={`h-full ${t.bar} rounded-full`} style={{ width: `${data.percent}%` }} />
      </div>
      <p className="text-[11px] text-gray-500 mt-1.5">
        {fmt(data.perHour)}/hr
        {data.willExceed ? (
          <span className="text-red-600 font-bold"> · heading for {fmt(data.projected)}</span>
        ) : (
          <span> · about {fmt(data.projected)} by reset</span>
        )}
      </p>
    </div>
  )
}

/** Reads per 15 minutes across the quota day. Bars, because the value is a
 *  count within a bucket rather than a continuous measurement. */
function DayChart({ slots, quotaDayStart }) {
  if (!slots?.length) return null
  const max = Math.max(...slots.map((s) => s.reads), 1)
  const W = 960
  const H = 140
  const barW = W / 96

  const label = (minute) => {
    if (!quotaDayStart) return ''
    const at = new Date(new Date(quotaDayStart).getTime() + minute * 60000)
    return at.toLocaleTimeString('en-NG', { hour: 'numeric', hour12: true })
  }

  // Every 4 hours, in the viewer's own clock, since the quota day starts at an
  // odd local hour (8am or 9am in Lagos).
  const ticks = slots.filter((s) => s.slot % 16 === 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-bold text-gray-900">Reads through the day</p>
        <p className="text-[11px] text-gray-400">15-minute steps · peak {fmt(max)}</p>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full min-w-[520px]" role="img" aria-label="Reads per 15 minutes today">
          {slots.map((s) => {
            const h = Math.max(s.reads > 0 ? 2 : 0, (s.reads / max) * H)
            return (
              <rect
                key={s.slot}
                x={s.slot * barW}
                y={H - h}
                width={Math.max(1, barW - 1)}
                height={h}
                fill="#22c55e"
                opacity={0.85}
              >
                <title>{`${label(s.minute)} · ${fmt(s.reads)} reads`}</title>
              </rect>
            )
          })}
          <line x1="0" y1={H} x2={W} y2={H} stroke="#e5e7eb" strokeWidth="1" />
          {ticks.map((s) => (
            <text key={s.slot} x={s.slot * barW} y={H + 13} fontSize="10" fill="#9ca3af">
              {label(s.minute)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function UsageTab({ authHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncOpen, setSyncOpen] = useState(false)
  const [form, setForm] = useState({ reads: '', writes: '', deletes: '' })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  const load = useCallback(async (fresh) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin-firestore-usage${fresh ? '?fresh=1' : ''}`, {
        headers: { ...(await authHeaders()) },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not load usage')
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { load(false) }, [load])

  const sync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/admin-firestore-usage?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          reads: Number(form.reads) || 0,
          writes: Number(form.writes) || 0,
          deletes: Number(form.deletes) || 0,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.success) {
        setSyncMsg({ ok: true, text: 'Synced. Counting continues from that figure.' })
        setSyncOpen(false)
        setForm({ reads: '', writes: '', deletes: '' })
        load(true)
      } else {
        setSyncMsg({ ok: false, text: json.message || json.error || 'Could not sync.' })
      }
    } catch (err) {
      setSyncMsg({ ok: false, text: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const resetsLocal = data?.resetsAt
    ? new Date(data.resetsAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">Firestore usage</h2>
          {resetsLocal && (
            <span className="text-xs text-gray-500">Free plan · resets {resetsLocal} your time</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSyncOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900"
          >
            <Link2 size={13} />
            Sync with Firebase
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* The honest statement of what this number is. Kept at the top, not
          buried under the charts, because everything below is read in its
          light. */}
      {data?.partial && (
        <div className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
          <p className="text-gray-700">
            <span className="font-bold text-gray-900">Counted by Sellapage.</span>{' '}
            Cloud Monitoring needs billing, so Google will not serve these numbers on the free plan.
            This counts the crons, the admin panel, storefronts and dashboards. It does not count
            batched writes or anything done in the Firebase console, so treat it as a floor.
          </p>
          {data.synced ? (
            <p className="text-green-700 font-medium flex items-center gap-1">
              <Check size={12} />
              Anchored to Firebase&apos;s figure of {fmt(data.syncedBaseline?.reads)} reads, synced{' '}
              {new Date(data.syncedAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })}.
              Counted since: {fmt((data.reads?.used || 0) - (data.syncedBaseline?.reads || 0))}.
            </p>
          ) : (
            <p className="text-gray-500">
              Not anchored today. Open Firebase &gt; Firestore &gt; Usage, then press &quot;Sync with
              Firebase&quot; above and type what it says, and today&apos;s figure starts from there.
            </p>
          )}
        </div>
      )}

      {syncOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Type what Firebase shows right now</p>
          <p className="text-[11px] text-gray-500">
            From Firebase console &gt; Firestore &gt; Usage, the totals for the current quota
            period. Everything counted after this is added on top, and what was already counted
            before it is subtracted, so nothing is counted twice.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['reads', 'writes', 'deletes'].map((k) => (
              <label key={k} className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{k}</span>
                <input
                  type="number"
                  min="0"
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            7.2k means 7200. Type the exact number if the console shows one.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save baseline
            </button>
            <button
              type="button"
              onClick={() => setSyncOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {syncMsg && (
        <p className={`text-xs font-medium ${syncMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
          {syncMsg.text}
        </p>
      )}

      {data?.success && (
        <>
          {(data.reads.willExceed || data.reads.percent >= 80) && (
            <div className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {data.reads.willExceed
                  ? 'Today is on track to run out of reads. When reads run out, stores stop loading, not just admin.'
                  : 'Most of today’s reads are gone.'}
              </span>
            </div>
          )}

          {data.spiking && (
            <div className="flex items-start gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <TrendingUp size={15} className="mt-0.5 shrink-0" />
              <span>
                Reads spiked in the last hour: {fmt(data.lastHourReads)}, over double the day&apos;s
                average. Check &quot;Where it went&quot; below.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Big label="Reads" data={data.reads} />
            <Big label="Writes" data={data.writes} />
            <Big label="Deletes" data={data.deletes} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Last 30 min', data.last30Reads],
              ['Last hour', data.lastHourReads],
              ['Per hour today', data.reads?.perHour],
              ['Hours into the day', data.hoursElapsed],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(value)}</p>
              </div>
            ))}
          </div>

          <DayChart slots={data.slots} quotaDayStart={data.quotaDayStart} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-900 mb-2">Where it went today</p>
              {data.byLabel?.length ? (
                <div className="space-y-2">
                  {data.byLabel.map((row) => {
                    const top = data.byLabel[0].reads || 1
                    return (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-gray-700 truncate">{row.label}</span>
                          <span className="text-gray-500 shrink-0">
                            {fmt(row.reads)} reads{row.writes ? ` · ${fmt(row.writes)} writes` : ''}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gray-400 rounded-full"
                            style={{ width: `${Math.round((row.reads / top) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nothing counted yet today.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-900 mb-2">Previous days</p>
              {data.history?.length ? (
                <div className="space-y-1.5">
                  {data.history.slice(1).map((d) => {
                    const pct = Math.min(100, Math.round((d.reads / 50000) * 100))
                    return (
                      <div key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 text-gray-500">{d.day.slice(5)}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${tone(pct, false).bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-20 text-right shrink-0 text-gray-700 font-medium">
                          {d.recorded ? fmt(d.reads) : '-'}
                        </span>
                      </div>
                    )
                  })}
                  <p className="text-[10px] text-gray-400 pt-1">
                    Reads per quota day. A dash means nothing was recorded that day.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No history yet. It builds from today.</p>
              )}
            </div>
          </div>
        </>
      )}

      {loading && !data && <p className="text-sm text-gray-400">Loading usage…</p>}
    </div>
  )
}
