// src/components/admin/MarketplaceAdmin.jsx
// Dropshipping marketplace, Phase 0: everyone waiting for it. Stores that ticked
// supply/dropship come first, with the checks a supplier will need at launch,
// then people who joined from the public /dropshipping page.
// Same shape as NewsletterAdmin: own fetches, own state, authed through `authHeaders`.
import { useState, useCallback, useEffect } from 'react'
import {
  Boxes, Trash2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Loader2, Copy, Check, Search,
  Store, Globe, CheckCircle2, Circle,
} from 'lucide-react'
import { SkeletonRows } from '../Skeleton'
import MarketplaceAccess from './MarketplaceAccess'
import SupplierApplications from './SupplierApplications'

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

const ROLE_STYLES = {
  supply: 'bg-amber-50 text-amber-700',
  dropship: 'bg-blue-50 text-blue-700',
  both: 'bg-purple-50 text-purple-700',
}
const ROLE_LABELS = { supply: 'Supply', dropship: 'Dropship', both: 'Both' }

const CHECK_LABELS = {
  plan: 'Pro+',
  payout: 'Payout',
  cac: 'CAC',
  phone: 'Phone',
  pickup: 'Pickup',
}

const FILTERS = [
  { id: '', label: 'Everyone' },
  { id: 'supply', label: 'Suppliers' },
  { id: 'dropship', label: 'Dropshippers' },
]

const LIMIT = 20
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '')

export default function MarketplaceAdmin({ authHeaders }) {
  // Sub tabs: the waitlist (Phase 0), supplier applications (Phase 1) and
  // access (the stage + early access).
  const [view, setView] = useState('waitlist')
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callAdmin('waitlist', authHeaders, {
        query: `&page=${page}&limit=${LIMIT}&role=${role}&search=${encodeURIComponent(search)}`,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
      setCounts(data.counts || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, page, role, search])

  useEffect(() => {
    if (view !== 'waitlist') return undefined
    const t = setTimeout(() => { fetchItems() }, 350)
    return () => clearTimeout(t)
  }, [fetchItems, view])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const copyAll = async () => {
    setCopying(true)
    setError('')
    try {
      const data = await callAdmin('export', authHeaders)
      await navigator.clipboard.writeText((data.emails || []).join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      setError(`Could not copy the list. ${err.message}`)
    } finally {
      setCopying(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.email} from the waitlist?`)) return
    setBusyId(item.id)
    setError('')
    try {
      await callAdmin('delete', authHeaders, { method: 'POST', body: { id: item.id } })
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
          <h2 className="font-bold text-gray-800">Dropshipping Marketplace</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            The waitlist, supplier applications, and who can use the marketplace while it is being built.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {view === 'waitlist' && <button
            type="button"
            onClick={copyAll}
            disabled={copying || !counts.all}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {copying ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy all emails'}
          </button>}
          {view === 'waitlist' && <button
            type="button"
            onClick={fetchItems}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-gray-100 bg-white p-1">
        {[
          { id: 'waitlist', label: 'Waitlist' },
          { id: 'suppliers', label: 'Suppliers' },
          { id: 'access', label: 'Access' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              view === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'suppliers' && <SupplierApplications authHeaders={authHeaders} />}

      {view === 'access' && <MarketplaceAccess authHeaders={authHeaders} />}

      {view === 'waitlist' && (<>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { key: 'all', label: 'Total' },
          { key: 'supply', label: 'Want to supply' },
          { key: 'dropship', label: 'Want to dropship' },
          { key: 'stores', label: 'Existing stores' },
          { key: 'supplierReady', label: 'Suppliers ready', hint: 'Every check except the video' },
        ].map((c) => (
          <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3" title={c.hint}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
            <p className="mt-0.5 text-lg font-black text-gray-900">{counts[c.key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex gap-1 rounded-xl border border-gray-100 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => { setRole(f.id); setPage(1) }}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                role === f.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-100 bg-white p-3">
          <Search size={15} className="flex-shrink-0 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email, store or phone..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
          {loading && <Loader2 size={13} className="flex-shrink-0 animate-spin text-gray-300" />}
        </div>
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
          <Boxes size={20} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm font-semibold text-gray-600">{search || role ? 'No match' : 'Nobody is waiting yet'}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
            {search || role
              ? 'Try a different search or filter.'
              : 'People join from /dropshipping, and vendors from signup, Settings or the dashboard tabs.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
                  {item.kind === 'store' ? <Store size={13} className="text-gray-500" /> : <Globe size={13} className="text-gray-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-xs font-bold text-gray-900">{item.name || item.email}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLES[item.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[item.role] || item.role}
                    </span>
                    {item.kind === 'store' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">{item.plan}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500">
                    <a href={`mailto:${item.email}`} className="hover:text-green-700 hover:underline">{item.email}</a>
                    {item.phone ? <> · {item.phone}</> : null}
                    {item.storeName ? <> · <a href={`/${item.storeName}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-700 hover:underline">/{item.storeName}</a></> : null}
                  </p>
                  {item.sells ? <p className="mt-0.5 truncate text-[11px] text-gray-400">Sells: {item.sells}</p> : null}
                  {item.kind === 'store' && item.checks && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(CHECK_LABELS).map(([k, label]) => (
                        <span
                          key={k}
                          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            item.checks[k] ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {item.checks[k] ? <CheckCircle2 size={10} /> : <Circle size={10} />} {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.createdAt && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      {item.kind === 'store' ? `Store since ${fmtDate(item.createdAt)}` : `Joined ${fmtDate(item.createdAt)} from the public page`}
                    </p>
                  )}
                </div>
                {item.kind === 'page' && (
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={busyId === item.id}
                    aria-label={`Remove ${item.email}`}
                    className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    {busyId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
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
      </>)}
    </div>
  )
}
