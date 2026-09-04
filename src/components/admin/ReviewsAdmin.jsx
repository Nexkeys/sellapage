// src/components/admin/ReviewsAdmin.jsx
// Self-contained Admin Reviews tab (own fetches/state, same shape as
// BlogAdmin.jsx) - moderates vendor-submitted platform reviews and controls
// the dashboard's full-screen review-prompt popup (on/off, platform-wide).
import { useState, useCallback, useEffect } from 'react'
import {
  Star, Check, X, Trash2, Loader2, AlertCircle, Film,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react'

// `authHeaders`: async fn returning the caller's Bearer ID token - see BlogAdmin.jsx.
async function callReviewsAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/platform-reviews-admin?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function ReviewsAdmin({ authHeaders }) {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [reviews, setReviews] = useState([])
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState(null)

  const [promptEnabled, setPromptEnabled] = useState(false)
  const [promptLoading, setPromptLoading] = useState(true)
  const [promptSaving, setPromptSaving] = useState(false)

  const LIMIT = 12

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callReviewsAdmin('list', authHeaders, {
        query: `&status=${statusFilter}&page=${page}&limit=${LIMIT}`,
      })
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      if (data.counts) setCounts((prev) => ({ ...prev, ...data.counts }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, statusFilter, page])

  const fetchPromptSetting = useCallback(async () => {
    setPromptLoading(true)
    try {
      const data = await callReviewsAdmin('get-prompt-settings', authHeaders)
      setPromptEnabled(!!data.enabled)
    } catch {
      /* non-blocking */
    } finally {
      setPromptLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { fetchReviews() }, [fetchReviews])
  useEffect(() => { fetchPromptSetting() }, [fetchPromptSetting])
  useEffect(() => { setPage(1) }, [statusFilter])

  const togglePrompt = async () => {
    const next = !promptEnabled
    setPromptSaving(true)
    try {
      await callReviewsAdmin('set-prompt-settings', authHeaders, { method: 'POST', body: { enabled: next } })
      setPromptEnabled(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setPromptSaving(false)
    }
  }

  const moderate = async (reviewId, status) => {
    setActingId(reviewId)
    try {
      await callReviewsAdmin('moderate', authHeaders, { method: 'POST', body: { reviewId, status } })
      await fetchReviews()
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  const toggleFeatured = async (reviewId, featured) => {
    setActingId(reviewId)
    try {
      await callReviewsAdmin('toggle-featured', authHeaders, { method: 'POST', body: { reviewId, featured } })
      await fetchReviews()
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  const remove = async (reviewId) => {
    if (!window.confirm('Delete this review permanently?')) return
    setActingId(reviewId)
    try {
      await callReviewsAdmin('delete', authHeaders, { method: 'POST', body: { reviewId } })
      await fetchReviews()
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-gray-800">Success Stories - Reviews</h2>
          <p className="text-xs text-gray-400 mt-0.5">Moderate vendor reviews of Sellapage before they appear publicly.</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5">
          <Sparkles size={14} className="text-green-600" />
          <span className="text-xs font-bold text-gray-700">Show review prompt to vendors</span>
          <button
            type="button"
            onClick={togglePrompt}
            disabled={promptLoading || promptSaving}
            className={`inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50 ${promptEnabled ? 'justify-end bg-green-600' : 'justify-start bg-gray-200'}`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition-all ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s} {counts[s] !== undefined ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16">
          <Loader2 size={24} className="animate-spin text-green-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">
          No {statusFilter !== 'all' ? statusFilter : ''} reviews.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{r.authorName}</p>
                  <p className="truncate text-[11px] text-gray-400">{r.storeName}</p>
                </div>
                <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                  {r.status}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} className={r.rating >= i ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'} />
                ))}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-4">{r.reviewText}</p>

              {(r.images?.length > 0 || r.videos?.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(r.images || []).map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                  {(r.videos || []).map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-400">
                      <Film size={16} />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-50 pt-3">
                {r.status !== 'approved' && (
                  <button type="button" onClick={() => moderate(r.id, 'approved')} disabled={actingId === r.id} className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-100 disabled:opacity-50">
                    <Check size={11} /> Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button type="button" onClick={() => moderate(r.id, 'rejected')} disabled={actingId === r.id} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">
                    <X size={11} /> Reject
                  </button>
                )}
                {r.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => toggleFeatured(r.id, !r.featured)}
                    disabled={actingId === r.id}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-50 ${r.featured ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Sparkles size={11} /> {r.featured ? 'Featured' : 'Feature'}
                  </button>
                )}
                <button type="button" onClick={() => remove(r.id)} disabled={actingId === r.id} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[11px] text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={13} /> Prev
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
