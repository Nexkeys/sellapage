// src/components/admin/SupplierApplications.jsx
// Dropshipping Marketplace > Suppliers. The review queue.
//
// Approving a store here lets other people's shops sell its stock, so this
// screen shows the whole picture in one place: the video, the checks the
// server ran, and what the vendor said. Every decision is written by
// /api/admin-marketplace (action supplier-decision) and notifies the vendor.
import { useState, useCallback, useEffect } from 'react'
import {
  Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle, Ban, Undo2, Store, ExternalLink, Clock,
} from 'lucide-react'

async function callAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/admin-marketplace?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const VIEWS = [
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'all', label: 'Everyone' },
]

const CHECK_LABELS = { plan: 'Pro+', payout: 'Payout', cac: 'CAC', phone: 'Phone', pickup: 'Pickup' }

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-red-100 text-red-800',
}

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '')

export default function SupplierApplications({ authHeaders }) {
  const [view, setView] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  // { storeId, decision } while an admin types the reason for a no.
  const [asking, setAsking] = useState(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callAdmin('suppliers', authHeaders, { query: `&status=${view}` })
      setRows(data.suppliers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, view])

  // Deferred a tick so the first load does not set state during the effect.
  useEffect(() => {
    const t = setTimeout(() => { load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  const decide = async (storeId, decision, why = '') => {
    setBusyId(storeId)
    setError('')
    try {
      await callAdmin('supplier-decision', authHeaders, {
        method: 'POST',
        body: { storeId, decision, reason: why },
      })
      setAsking(null)
      setReason('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-50 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <Store size={22} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm font-semibold text-gray-700">
            {view === 'pending' ? 'No applications waiting' : 'Nobody here yet'}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {view === 'pending' ? 'New supplier applications land here.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.storeId} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    {r.name || r.storeName || r.storeId}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ''}
                    {r.plan ? ` · ${r.plan}` : ''}
                  </p>
                  {r.appliedAt && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock size={10} /> Applied {fmtDate(r.appliedAt)}
                    </p>
                  )}
                </div>
                {r.storeName && (
                  <a
                    href={`/${r.storeName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Store <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {Object.entries(r.checks || {}).map(([key, done]) => (
                  <span
                    key={key}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {CHECK_LABELS[key] || key}
                  </span>
                ))}
              </div>

              {r.notes && <p className="mt-2.5 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">{r.notes}</p>}

              {r.terms ? (
                <div className="mt-2.5 rounded-lg border border-gray-100 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Terms, version {r.terms.version}</p>
                  <ul className="mt-1 space-y-0.5">
                    {r.terms.summary.map((line) => (
                      <li key={line} className="text-xs text-gray-600">· {line}</li>
                    ))}
                  </ul>
                  {r.terms.extraTerms && (
                    <p className="mt-1.5 whitespace-pre-line text-xs text-gray-500">{r.terms.extraTerms}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2.5 text-[11px] font-semibold text-amber-700">No supplier terms saved.</p>
              )}

              {(r.rejectionReason || r.suspendedReason) && (
                <p className="mt-2.5 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">
                  {r.suspendedReason || r.rejectionReason}
                </p>
              )}

              {r.videoUrl && (
                // Cloudinary only: the handler refuses any other host, so this
                // player can never be pointed somewhere else by a vendor.
                <video src={r.videoUrl} controls preload="none" className="mt-3 w-full max-w-md rounded-lg bg-black" />
              )}

              {asking?.storeId === r.storeId ? (
                <div className="mt-3 rounded-xl border border-gray-200 p-3">
                  <label className="block text-xs font-bold text-gray-700">
                    Why? The vendor is shown this.
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 500))}
                      rows={2}
                      autoFocus
                      className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={reason.trim().length < 5 || busyId === r.storeId}
                      onClick={() => decide(r.storeId, asking.decision, reason.trim())}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {busyId === r.storeId ? <Loader2 size={12} className="animate-spin" /> : null}
                      Confirm {asking.decision}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAsking(null); setReason('') }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.storeId}
                        onClick={() => decide(r.storeId, 'approve')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyId === r.storeId ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAsking({ storeId: r.storeId, decision: 'reject' }); setReason('') }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => { setAsking({ storeId: r.storeId, decision: 'suspend' }); setReason('') }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      <Ban size={12} /> Suspend
                    </button>
                  )}
                  {r.status === 'suspended' && (
                    <button
                      type="button"
                      disabled={busyId === r.storeId}
                      onClick={() => decide(r.storeId, 'unsuspend')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {busyId === r.storeId ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                      Lift suspension
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
