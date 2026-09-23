// src/components/admin/FirestoreUsageCard.jsx
// How much of today's free Firestore quota is gone, and whether today is going
// to end badly. Sits in System Health beside the Cloudinary card.
//
// The numbers come from Cloud Monitoring (see admin-firestore-usage.js), which
// is the same source the Firebase console reads, so this should agree with it.
import { useState, useEffect, useCallback } from 'react'
import { Database, RefreshCw, Loader2, AlertTriangle, TrendingUp } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-NG')

// Green until half gone, amber from there, red at four fifths. Red is set below
// 100 deliberately: by the time a bar is full the platform is already down, so
// the warning has to arrive while there is still a day left to act.
function toneFor(percent, willExceed) {
  if (percent >= 80 || willExceed) return { bar: 'bg-red-500', text: 'text-red-600', ring: 'border-red-200 bg-red-50' }
  if (percent >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600', ring: 'border-amber-200 bg-amber-50' }
  return { bar: 'bg-green-500', text: 'text-green-600', ring: 'border-gray-200 bg-white' }
}

function Meter({ label, data }) {
  if (!data) return null
  const tone = toneFor(data.percent, data.willExceed)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className={`text-xs font-bold ${tone.text}`}>
          {fmt(data.used)}
          <span className="text-gray-400 font-medium"> / {fmt(data.limit)}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone.bar} rounded-full transition-all`} style={{ width: `${data.percent}%` }} />
      </div>
      <p className="text-[11px] text-gray-500">
        {fmt(data.perHour)} per hour
        {data.willExceed ? (
          <span className="text-red-600 font-bold"> · on track for {fmt(data.projected)} by reset</span>
        ) : (
          <span> · about {fmt(data.projected)} by reset</span>
        )}
      </p>
    </div>
  )
}

export default function FirestoreUsageCard({ authHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    load(false)
  }, [load])

  const resetsLocal = data?.resetsAt
    ? new Date(data.resetsAt).toLocaleString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <Database size={15} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Firestore usage today</p>
            <p className="text-[11px] text-gray-500">
              Free plan{resetsLocal ? ` · resets ${resetsLocal} your time` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-50"
          aria-label="Refresh usage"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      {/* The 403 case is its own message, not an error, because nothing is
          broken: one IAM role has to be granted once. */}
      {data && data.needsPermission && (
        <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
          <p className="font-bold text-gray-900">Usage not connected yet</p>
          <p>{data.message}</p>
          <p className="text-gray-500">
            Google Cloud Console &gt; IAM &gt; find the firebase-adminsdk service account &gt; add the
            role &quot;Monitoring Viewer&quot;. Nothing else changes, and it costs nothing.
          </p>
        </div>
      )}

      {data && data.success && (
        <>
          {(data.reads.willExceed || data.reads.percent >= 80) && (
            <div className="flex items-start gap-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                {data.reads.willExceed
                  ? 'Today is on track to run out of reads. When reads run out, stores stop loading, not just admin.'
                  : 'Most of today’s reads are gone.'}
              </span>
            </div>
          )}

          {data.spiking && (
            <div className="flex items-start gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <TrendingUp size={14} className="mt-0.5 shrink-0" />
              <span>
                Reads spiked in the last hour: {fmt(data.lastHourReads)}, more than double the day&apos;s
                average. Something is looping or someone is scanning a big collection.
              </span>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <Meter label="Reads" data={data.reads} />
            <Meter label="Writes" data={data.writes} />
            <Meter label="Deletes" data={data.deletes} />
          </div>
        </>
      )}

      {loading && !data && <p className="text-xs text-gray-400">Loading usage…</p>}
    </div>
  )
}
