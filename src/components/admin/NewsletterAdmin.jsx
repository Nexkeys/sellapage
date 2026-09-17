// src/components/admin/NewsletterAdmin.jsx
// Everyone who asked for selling tips through the footer box. Same shape as
// ReviewsAdmin and PartnersAdmin: own fetches, own state, authed through
// `authHeaders`.
import { useState, useCallback, useEffect } from 'react'
import {
  Mail, Trash2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Loader2, Copy, Check, Search,
} from 'lucide-react'
import { SkeletonRows } from '../Skeleton'

async function callNewsletterAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/admin-newsletter?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const SOURCE_STYLES = {
  footer: 'bg-green-50 text-green-700',
  home: 'bg-blue-50 text-blue-700',
  blog: 'bg-purple-50 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}

const LIMIT = 20

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : ''

export default function NewsletterAdmin({ authHeaders }) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callNewsletterAdmin('list', authHeaders, {
        query: `&page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
      setCounts(data.counts || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, page, search])

  // Typing in the search box should not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { fetchItems() }, 350)
    return () => clearTimeout(t)
  }, [fetchItems])

  // Page resets where the search actually changes, not in an effect that would
  // render once with the old page and again with page 1.
  const onSearch = (value) => {
    setSearch(value)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const copyAll = async () => {
    setCopying(true)
    setError('')
    try {
      const data = await callNewsletterAdmin('export', authHeaders)
      const emails = (data.emails || []).join(', ')
      await navigator.clipboard.writeText(emails)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      setError(`Could not copy the list. ${err.message}`)
    } finally {
      setCopying(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.email} from the list? Use this when someone asks to be taken off.`)) return
    setBusyId(item.id)
    setError('')
    try {
      await callNewsletterAdmin('delete', authHeaders, { method: 'POST', body: { id: item.id } })
      await fetchItems()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-800">Newsletter</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            People who asked for selling tips through the footer box.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copyAll}
            disabled={copying || !counts.all}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {copying ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy all emails'}
          </button>
          <button
            type="button"
            onClick={fetchItems}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { key: 'all', label: 'Total' },
          { key: 'footer', label: 'From footer' },
          { key: 'home', label: 'From home' },
          { key: 'other', label: 'Other' },
        ].map((c) => (
          <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
            <p className="mt-0.5 text-lg font-black text-gray-900">{counts[c.key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3">
        <Search size={15} className="flex-shrink-0 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search an email address..."
          className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
        />
        {loading && <Loader2 size={13} className="flex-shrink-0 animate-spin text-gray-300" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <SkeletonRows count={6} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center">
          <Mail size={20} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm font-semibold text-gray-600">
            {search ? 'No match' : 'Nobody has signed up yet'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
            {search
              ? 'Try a different address.'
              : 'The box sits in the footer of every public page. Sign ups appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={`mailto:${item.email}`}
                    className="block truncate text-xs font-bold text-gray-900 hover:text-green-700 hover:underline"
                  >
                    {item.email}
                  </a>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    Joined {fmtDate(item.createdAt)}
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SOURCE_STYLES[item.source] || SOURCE_STYLES.other}`}>
                  {item.source}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={busyId === item.id}
                  aria-label={`Remove ${item.email}`}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  {busyId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 disabled:opacity-40"
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <span className="text-[10px] font-semibold text-gray-500">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 disabled:opacity-40"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
