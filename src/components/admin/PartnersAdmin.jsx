// src/components/admin/PartnersAdmin.jsx
// Self-contained Admin tab for enquiries from the public /partners page
// (investors, strategic and distribution partners, co-founders). Same shape as
// ReviewsAdmin.jsx: its own fetches and state, authed through `authHeaders`.
import { useState, useCallback, useEffect } from 'react'
import {
  Mail, MessageCircle, Trash2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  ExternalLink, RefreshCw, Loader2, Check,
} from 'lucide-react'
import { SkeletonRows } from '../Skeleton'
import PartnersTractionEditor from './PartnersTractionEditor'
import {
  ENQUIRY_STATUSES,
  INTEREST_OPTIONS,
  INVESTOR_TYPES,
  TICKET_SIZES,
  SOURCES,
  labelFor,
} from '../../utils/partnerEnquiry'

async function callPartnersAdmin(action, authHeaders, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/admin-partners?action=${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const STATUS_STYLES = {
  new: 'bg-amber-50 text-amber-700 border-amber-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  in_talks: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  not_a_fit: 'bg-red-50 text-red-600 border-red-200',
}

const INTEREST_STYLES = {
  investor: 'bg-emerald-50 text-emerald-700',
  strategic: 'bg-indigo-50 text-indigo-700',
  partner: 'bg-sky-50 text-sky-700',
  cofounder: 'bg-purple-50 text-purple-700',
}

const STATUS_FILTERS = [{ id: 'open', label: 'Open' }, ...ENQUIRY_STATUSES, { id: 'all', label: 'All' }]
const INTEREST_FILTERS = [{ id: 'all', label: 'Everyone' }, ...INTEREST_OPTIONS]
const LIMIT = 10

// Nigerian numbers are usually typed with a leading 0; wa.me needs the country code.
const whatsappLink = (phone) => {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) d = `234${d.slice(1)}`
  return `https://wa.me/${d}`
}

const fmtDate = (value) =>
  value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : ''

function Detail({ label, children }) {
  if (!children) return null
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="mt-0.5 break-words text-xs text-gray-700">{children}</div>
    </div>
  )
}

export default function PartnersAdmin({ authHeaders }) {
  const [status, setStatus] = useState('open')
  const [interest, setInterest] = useState('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({})
  const [interestCounts, setInterestCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [view, setView] = useState('enquiries')
  const [tractionDirty, setTractionDirty] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callPartnersAdmin('list', authHeaders, {
        query: `&status=${status}&interest=${interest}&page=${page}&limit=${LIMIT}`,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
      setCounts(data.counts || {})
      setInterestCounts(data.interestCounts || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, status, interest, page])

  useEffect(() => { fetchItems() }, [fetchItems])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Clamp if the list shrank under us, e.g. the last item on a page was closed.
  useEffect(() => { if (!loading && page > totalPages) setPage(totalPages) }, [loading, page, totalPages])

  const pickStatus = (id) => { setStatus(id); setPage(1) }
  const pickInterest = (id) => { setInterest(id); setPage(1) }

  const changeStatus = async (item, next) => {
    if (next === item.status) return
    setBusyId(item.id)
    setError('')
    setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: next } : r)))
    try {
      await callPartnersAdmin('update', authHeaders, { method: 'POST', body: { id: item.id, status: next } })
      await fetchItems()
    } catch (err) {
      setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: item.status } : r)))
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const saveNotes = async (item) => {
    const value = notes[item.id] ?? item.adminNotes
    setBusyId(item.id)
    setError('')
    try {
      await callPartnersAdmin('update', authHeaders, { method: 'POST', body: { id: item.id, adminNotes: value } })
      setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, adminNotes: value } : r)))
      setNotes((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      setSavedId(item.id)
      setTimeout(() => setSavedId((id) => (id === item.id ? null : id)), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete the enquiry from ${item.fullName} permanently? Use this when someone asks for their details to be erased. This cannot be undone.`)) return
    setBusyId(item.id)
    setError('')
    try {
      await callPartnersAdmin('delete', authHeaders, { method: 'POST', body: { id: item.id } })
      if (expanded === item.id) setExpanded(null)
      await fetchItems()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const switchView = (next) => {
    if (next === view) return
    // Switching unmounts the editor, which would silently throw edits away.
    if (view === 'traction' && tractionDirty && !window.confirm('You have unsaved traction changes. Discard them?')) return
    setTractionDirty(false)
    setView(next)
  }

  const viewSwitch = (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="tablist" aria-label="Investors and partners sections">
      {[
        { id: 'enquiries', label: `Enquiries${counts.open ? ` (${counts.open})` : ''}` },
        { id: 'traction', label: 'Page traction' },
      ].map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={view === v.id}
          onClick={() => switchView(v.id)}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${view === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  )

  if (view === 'traction') {
    return (
      <div className="space-y-4">
        {viewSwitch}
        <PartnersTractionEditor authHeaders={authHeaders} onDirtyChange={setTractionDirty} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {viewSwitch}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-800">Investors & Partners</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Enquiries from the public /partners page. Visible to super admins only.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchItems}
          disabled={loading}
          aria-label="Refresh"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pickStatus(s.id)}
            className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${status === s.id ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {s.label} {counts[s.id] !== undefined ? `(${counts[s.id]})` : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {INTEREST_FILTERS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => pickInterest(o.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${interest === o.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {o.label} {interestCounts[o.id] !== undefined ? `(${interestCounts[o.id]})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <SkeletonRows count={5} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-gray-600">No enquiries here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
            {counts.all
              ? 'Try another filter.'
              : 'Share sellapage.com.ng/partners with investors and partners. Submissions appear here and are emailed to you.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const open = expanded === item.id
            const draft = notes[item.id] ?? item.adminNotes
            const notesDirty = draft !== item.adminNotes
            const wa = whatsappLink(item.phone)
            const busy = busyId === item.id
            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : item.id)}
                  aria-expanded={open}
                  className="w-full px-4 py-3.5 text-left hover:bg-gray-50/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{item.fullName}</p>
                      <p className="truncate text-[11px] text-gray-400">
                        {item.organisation || item.email} · {fmtDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${INTEREST_STYLES[item.interest] || 'bg-gray-100 text-gray-600'}`}>
                        {labelFor(INTEREST_OPTIONS, item.interest)}
                      </span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[item.status] || STATUS_STYLES.new}`}>
                        {labelFor(ENQUIRY_STATUSES, item.status)}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold sm:hidden ${INTEREST_STYLES[item.interest] || 'bg-gray-100 text-gray-600'}`}>
                    {labelFor(INTEREST_OPTIONS, item.interest)}
                  </span>
                  {!open && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.message}</p>}
                </button>

                {open && (
                  <div className="space-y-4 border-t border-gray-50 px-4 py-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Detail label="Email">
                        <a href={`mailto:${item.email}?subject=${encodeURIComponent('Re: your Sellapage enquiry')}`} className="font-semibold text-green-700 hover:underline">
                          {item.email}
                        </a>
                      </Detail>
                      <Detail label="Phone">{item.phone}</Detail>
                      <Detail label="Organisation">{item.organisation}</Detail>
                      <Detail label="Investor type">{labelFor(INVESTOR_TYPES, item.investorType)}</Detail>
                      <Detail label="Typical size">{labelFor(TICKET_SIZES, item.ticketSize)}</Detail>
                      <Detail label="Heard via">{labelFor(SOURCES, item.source)}</Detail>
                      <Detail label="Link">
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-700 hover:underline">
                            {item.link.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                          </a>
                        )}
                      </Detail>
                      <Detail label="Consent given">{fmtDate(item.consentAt)}</Detail>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{item.message}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${item.email}?subject=${encodeURIComponent('Re: your Sellapage enquiry')}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[11px] font-bold text-white"
                      >
                        <Mail size={12} /> Email
                      </a>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-[11px] font-bold text-white">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
                      <div>
                        <label htmlFor={`pa-status-${item.id}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Status
                        </label>
                        <select
                          id={`pa-status-${item.id}`}
                          value={item.status}
                          disabled={busy}
                          onChange={(e) => changeStatus(item, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
                        >
                          {ENQUIRY_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`pa-notes-${item.id}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Private notes
                        </label>
                        <textarea
                          id={`pa-notes-${item.id}`}
                          rows={3}
                          maxLength={2000}
                          value={draft}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Call booked, follow up date, what they asked for..."
                          className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
                      <button
                        type="button"
                        onClick={() => saveNotes(item)}
                        disabled={busy || !notesDirty}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-green-700 disabled:opacity-40"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : savedId === item.id ? <Check size={12} /> : null}
                        {savedId === item.id ? 'Saved' : 'Save notes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busy}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[11px] text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={13} /> Prev
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
