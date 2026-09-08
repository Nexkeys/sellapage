// src/components/admin/CacRequests.jsx
// Vendors asking Sellapage to register a business with the CAC for them.
//
// Distinct from CAC verification: those vendors already have an RC number and
// want the badge. These have no CAC at all and want one.
//
// There is no in-app fulfilment and no payment here on purpose. The admin
// contacts the vendor by WhatsApp or email, quotes them, and handles the
// registration outside the product. This screen exists to make that contact one
// click instead of copying details by hand.
import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Loader2, MessageCircle, Mail, Check, X, Copy, ExternalLink,
} from 'lucide-react'

const ENTITY_LABEL = {
  'business-name': 'Business Name',
  'limited-company': 'Limited Company (LTD)',
  'incorporated-trustees': 'Incorporated Trustees',
  'not-sure': 'Not sure yet',
}

const STATUS_STYLE = {
  new: 'bg-amber-50 text-amber-700 border-amber-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
}

/** wa.me needs an international number with no plus and no separators. */
function toWaNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('234') && d.length === 13) return d
  if (d.startsWith('0') && d.length === 11) return `234${d.slice(1)}`
  if (d.length === 10) return `234${d}`
  return d.length >= 11 ? d : null
}

function buildMessage(r) {
  const name = r.businessName || r.storeName || 'there'
  const type = ENTITY_LABEL[r.entityType] || 'CAC registration'
  const named = r.proposedName ? ` for "${r.proposedName}"` : ''
  return `Hello ${name}, this is Sellapage. We received your request to register a ${type}${named}. `
    + `I can take you through what is needed and the cost. `
    + `Quick check first: does the name on your NIN match the name you want to register with exactly? `
    + `That is the most common reason applications get rejected.`
}

export default function CacRequests({ authHeaders }) {
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({ open: 0, total: 0 })
  const [statusFilter, setStatusFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin-cac?action=requests&status=${statusFilter}`, {
        headers: await authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setRequests(data.requests || [])
        setCounts(data.counts || { open: 0, total: 0 })
      }
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [authHeaders, statusFilter])

  useEffect(() => { load() }, [load])

  const setStatus = async (requestId, status) => {
    setActing(requestId)
    try {
      await fetch('/api/admin-cac?action=request-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ requestId, status }),
      })
      await load()
    } catch {
      /* surfaced by the row not changing */
    } finally {
      setActing(null)
    }
  }

  const openCompose = (r) => {
    setComposing(r)
    setMessage(buildMessage(r))
    setCopied(false)
  }

  // Marks contacted on the way out, so the list reflects reality without the
  // admin having to remember a second click.
  const sendWhatsApp = () => {
    const wa = toWaNumber(composing.contactPhone)
    if (wa) {
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    }
    setStatus(composing.id, 'contacted')
    setComposing(null)
  }

  const sendEmail = () => {
    const subject = encodeURIComponent('Your CAC registration request')
    window.open(
      `mailto:${composing.contactEmail}?subject=${subject}&body=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setStatus(composing.id, 'contacted')
    setComposing(null)
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
            <Building2 size={15} className="text-green-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">Registration requests</p>
            <p className="text-[11px] text-gray-400">
              {counts.open} open of {counts.total} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {['open', 'contacted', 'completed', 'all'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-bold capitalize transition-all ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={20} className="animate-spin text-green-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-14 text-center text-sm text-gray-400">
          No {statusFilter !== 'all' ? statusFilter : ''} requests.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {requests.map((r) => (
            <div key={r.id} className="p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">
                      {r.businessName || r.storeName || 'Unnamed store'}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[r.status] || STATUS_STYLE.new}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Wants: <strong>{ENTITY_LABEL[r.entityType] || r.entityType}</strong>
                    {r.proposedName && <> as &ldquo;{r.proposedName}&rdquo;</>}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {r.contactEmail} · {r.contactPhone}
                  </p>
                  {r.notes && (
                    <p className="text-[11px] text-gray-500 mt-1 italic">&ldquo;{r.notes}&rdquo;</p>
                  )}
                  {r.storeName && (
                    <a
                      href={`https://sellapage.com.ng/${r.storeName}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-green-600 hover:underline"
                    >
                      View store <ExternalLink size={9} />
                    </a>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openCompose(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#25D366] px-2.5 py-1 text-[11px] font-bold text-[#1fa855] hover:bg-green-50"
                  >
                    <MessageCircle size={11} /> Contact
                  </button>
                  {r.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, 'completed')}
                      disabled={acting === r.id}
                      title="Mark completed"
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-40"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  {r.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, 'closed')}
                      disabled={acting === r.id}
                      title="Close without action"
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {composing && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setComposing(null)} aria-hidden="true" />
          <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="text-sm font-bold text-gray-900">
                Contact {composing.businessName || composing.storeName}
              </p>
              <button type="button" onClick={() => setComposing(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="text-[11px] text-gray-500">
                <p>{composing.contactEmail}</p>
                <p>{composing.contactPhone}</p>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* blocked */ }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-green-600"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy text'}
              </button>
            </div>

            <div className="flex gap-2 border-t border-gray-100 px-5 py-3.5">
              <button
                type="button"
                onClick={sendWhatsApp}
                disabled={!toWaNumber(composing.contactPhone)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white hover:bg-[#1fba5a] disabled:bg-gray-200 disabled:text-gray-400"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button
                type="button"
                onClick={sendEmail}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Mail size={14} /> Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
