// src/ops/tabs/QuotaClock.jsx
//
// Firestore Usage. On the free Spark plan Google refuses to give apps the
// usage numbers (Cloud Monitoring needs billing), so this screen says that
// plainly and shows what can be known: the daily limits, when they reset
// (midnight US Pacific, not Lagos), what in Ops costs reads, and a link to the
// live numbers in the Firebase console. The day billing is on, the live
// numbers from /api/admin-firestore-usage fill in here by themselves.
import { useCallback, useEffect, useState } from 'react'
import { Database, Clock, ExternalLink, BookOpen, PencilLine, Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Ring } from '../opsKit'
import { opsJson } from '../opsSession'
import { Notice, Meter } from './kit'

const LIMITS = [
  { id: 'reads', label: 'Reads', limit: 50000, icon: BookOpen },
  { id: 'writes', label: 'Writes', limit: 20000, icon: PencilLine },
  { id: 'deletes', label: 'Deletes', limit: 20000, icon: Trash2 },
]
// What the console itself spends, so a busy afternoon in Ops is never a mystery.
const COSTS = [
  ['Merchants list', 'One read per store, at most once a minute per server.'],
  ['Growth & Activation, Outreach', 'One read per store and per order, cached for 10 minutes.'],
  ['CAC Verification list', 'Up to 500 store reads each time it loads.'],
  ['Revenue', 'Every order, booking and subscription, each time it loads.'],
  ['Referrals and Payouts', 'Every referral reward and payout request, each load.'],
  ['Support Tickets', 'The tickets on screen plus three count reads.'],
]
const FIREBASE_USAGE = 'https://console.firebase.google.com/project/sellapage-7145d/firestore/usage'

/** The start of the current quota day: midnight in Los Angeles. */
function quotaDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value) % 24
  return new Date(now.getTime() - (get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000)
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t) }, [ms])
  return now
}

export default function QuotaClock() {
  const now = useNow()
  // Read directly: on the free plan the answer is success:false with the
  // reason, which the shared loader would throw away.
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async (fresh = false) => {
    setLoading(true)
    const { data: d } = await opsJson(`/api/admin-firestore-usage${fresh ? '?fresh=1' : ''}`)
    setData(d || {})
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])
  const start = quotaDayStart(now)
  const reset = new Date(start.getTime() + 24 * 3600e3)
  const left = Math.max(0, reset - now)
  const elapsedPct = 100 - (left / (24 * 3600e3)) * 100
  const hh = String(Math.floor(left / 3600e3)).padStart(2, '0')
  const mm = String(Math.floor((left % 3600e3) / 60e3)).padStart(2, '0')
  const ss = String(Math.floor((left % 60e3) / 1000)).padStart(2, '0')
  const live = data?.success === true
  const resetLocal = reset.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <section className="grid gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1305] via-[#3b2405] to-[#7c3f06] p-5 text-amber-50 sm:p-7 lg:grid-cols-[auto_1fr] lg:items-center">
        <Ring value={elapsedPct} size={168} stroke={12} color="#fbbf24" track="rgba(255,255,255,0.12)">
          <div className="text-center"><p className="font-mono text-[26px] font-bold tabular-nums tracking-tight">{hh}:{mm}<span className="text-[16px] opacity-70">:{ss}</span></p><p className="text-[11px] text-amber-100/70">until the reset</p></div>
        </Ring>
        <div>
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-200"><Clock size={15} /> Free quota day</p>
          <p className="mt-1.5 font-display text-[24px] font-extrabold leading-tight">Resets at {resetLocal} your time</p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-amber-100/80">Firebase starts each free day at midnight in California, not Lagos. When reads run out, stores stop loading for everyone until the reset, not only Ops.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={FIREBASE_USAGE} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-300 px-4 text-[13px] font-bold text-amber-950 hover:bg-amber-200"><ExternalLink size={15} /> Live numbers in Firebase</a>
            <button type="button" onClick={() => reload(true)} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/30 hover:bg-white/10 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Check again</button>
          </div>
        </div>
      </section>

      {!live && data && (
        <Notice tone="info">
          {data.needsBilling
            ? <>On the free (Spark) plan, Google does not let apps read these numbers, so they live in the Firebase console for now. This screen fills in by itself the day billing (Blaze) is switched on.</>
            : data.needsPermission ? <>The Firebase service account cannot read Cloud Monitoring yet. In Google Cloud IAM, give it the &quot;Monitoring Viewer&quot; role.</>
              : data.message || 'Usage could not be read right now.'}
        </Notice>
      )}

      {live && (data.reads?.willExceed || data.reads?.percent >= 80) && <Notice tone="error">Today is on track to run out of reads. When reads run out, stores stop loading, not just Ops.</Notice>}
      {live && data.spiking && <Notice tone="warn">Reads spiked in the last hour: {Number(data.lastHourReads).toLocaleString()}, more than double the day&apos;s average.</Notice>}

      <section className="grid gap-3 md:grid-cols-3">
        {LIMITS.map((l) => {
          const I = l.icon
          const m = live ? data[l.id] : null
          const tone = !m ? 'bg-slate-300' : m.percent >= 80 || m.willExceed ? 'bg-red-500' : m.percent >= 50 ? 'bg-amber-500' : 'bg-forest-600'
          return (
            <div key={l.id} className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-dash-muted"><I size={16} className="text-forest-600" />{l.label} a day</p>
              <p className="mt-2 font-display text-[28px] font-extrabold leading-none tabular-nums text-dash-ink">{m ? m.used.toLocaleString() : l.limit.toLocaleString()}</p>
              <p className="mt-1 text-[12px] text-slate-500">{m ? `of ${l.limit.toLocaleString()} free · about ${m.projected.toLocaleString()} by the reset` : 'free on the Spark plan'}</p>
              <Meter value={m ? m.used : 0} of={l.limit} tone={tone} className="mt-3 h-2.5" />
            </div>
          )
        })}
      </section>

      <section className="rounded-3xl border border-dash-line bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="flex items-center gap-2 text-[15px] font-bold text-dash-ink"><Database size={17} className="text-forest-600" /> What Ops costs in reads</p>
        <p className="mt-0.5 text-[12.5px] text-dash-muted">Opening these screens again and again on a busy day is what eats the quota.</p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {COSTS.map(([t, d]) => (
            <li key={t} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <span><span className="block text-[13px] font-semibold text-dash-ink">{t}</span><span className="text-[12px] text-slate-500">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
