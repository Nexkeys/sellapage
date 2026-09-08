// src/components/dashboard/CacHelpRequest.jsx
// "No CAC yet? We can help you register one."
//
// Rendered ABOVE the Pro paywall in CACVerificationTab on purpose. Verifying a
// CAC is Pro-gated, but the vendors who have no CAC at all are overwhelmingly on
// Starter and Growth. Putting the help behind the same gate would hide it from
// nearly everyone who needs it, and it is also a natural upgrade path: help them
// register, then they need Pro to display the badge.
//
// This submits a REQUEST. Nothing here talks to the CAC and no payment is taken.
// A human replies by WhatsApp or email from the admin panel, and quotes there,
// because the price depends on entity type and on CAC's own fees, which change.
import { useState, useEffect, useCallback } from 'react'
import {
  Building2, ChevronDown, Loader2, CheckCircle2, AlertCircle, Send, Clock,
} from 'lucide-react'

// Requirements are described, never priced. CAC revises its fees, and the
// Sellapage service fee sits on top, so any number baked in here goes stale
// silently and a vendor quotes you on it.
const ENTITY_TYPES = [
  {
    id: 'business-name',
    label: 'Business Name',
    tag: 'Most common',
    summary:
      'A registered trading name for a sole trader or a partnership. Fastest and cheapest to register.',
    good: 'Good for: one-person shops, small traders, side businesses.',
    watch:
      'It is not a separate legal entity, so you are personally responsible for the business debts.',
    needs: [
      'Your NIN, with your name matching the NIN records exactly',
      'A clear passport photo on a white background',
      'Your signature (a photo or scan is fine)',
      'Two proposed business names, in case the first is taken',
      'Business address and the nature of the business',
    ],
  },
  {
    id: 'limited-company',
    label: 'Limited Company (LTD)',
    tag: 'Most protection',
    summary:
      'A company that exists separately from you in law, with an RC number. What most people mean by "registering a company".',
    good: 'Good for: businesses taking on partners, seeking investment, or signing bigger contracts.',
    watch:
      'More paperwork and a higher fee, and you file returns with the CAC every year.',
    needs: [
      'NIN for every director and shareholder, names matching NIN records exactly',
      'Passport photo and signature for each person',
      'At least one director (a director may also be a shareholder)',
      'Two proposed company names',
      'Registered office address',
      'Share capital and how the shares are split between owners',
    ],
  },
  {
    id: 'incorporated-trustees',
    label: 'Incorporated Trustees',
    tag: 'Non-profit',
    summary:
      'For an association, NGO, church, club or foundation. Registers trustees rather than owners.',
    good: 'Good for: organisations that are not run for profit.',
    watch:
      'Takes longest of the three. It needs a constitution and newspaper publication before approval.',
    needs: [
      'NIN, photo and signature for every trustee',
      'A minimum of two trustees',
      'The organisation constitution',
      'Minutes of the meeting that appointed the trustees',
      'Proposed name and the address of the organisation',
    ],
  },
  {
    id: 'not-sure',
    label: 'I am not sure',
    tag: null,
    summary:
      'Tell us what your business does and we will advise which one fits before anything is paid for.',
    good: null,
    watch: null,
    needs: ['Just your contact details and a short description of the business'],
  },
]

export default function CacHelpRequest({ store, user }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [selected, setSelected] = useState(null)
  const [proposedName, setProposedName] = useState('')
  const [email, setEmail] = useState(store?.email || '')
  const [phone, setPhone] = useState(store?.whatsappNumber || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/cac-request', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) setExisting(data.request)
    } catch {
      // Non critical. Worst case the vendor sees the form and the server
      // rejects a duplicate with a clear message.
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    if (!selected) {
      setResult({ kind: 'err', text: 'Please choose what you want to register.' })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/cac-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entityType: selected,
          proposedName: proposedName.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          notes: notes.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setResult({ kind: 'ok', text: data.message })
        await load()
        setOpen(false)
      } else {
        setResult({ kind: 'err', text: data.message || data.error || 'Could not send that. Please try again.' })
      }
    } catch {
      setResult({ kind: 'err', text: 'Network problem. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  // Already asked. Showing the form again would invite duplicates and make it
  // look like the first request vanished.
  if (existing) {
    const label = ENTITY_TYPES.find((t) => t.id === existing.entityType)?.label || 'CAC registration'
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
        <div className="flex items-start gap-2.5">
          <Clock size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-800">We have your request</p>
            <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">
              You asked us about registering a <strong>{label}</strong>. We will contact
              you on the email and phone number you gave us. If it is urgent, reply to
              any Sellapage email and we will pick it up.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-50">
            <Building2 size={16} className="text-green-600" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">No CAC yet? We can help you register</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Tell us what you need and we will handle the registration for you.
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Surfaced first, because a name that does not match the NIN records
              is the single most common reason a registration is rejected. */}
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5">
            <p className="text-[11px] leading-relaxed text-amber-800">
              <strong>Before anything else:</strong> the CAC now checks identity strictly.
              The name on your NIN must match the name you register with, exactly. If they
              differ even slightly, fix your NIN record first or the application is rejected.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">What do you want to register?</p>
            <div className="space-y-2">
              {ENTITY_TYPES.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border transition-all ${
                    selected === t.id ? 'border-green-500 bg-green-50/50' : 'border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { setSelected(t.id); setExpanded(expanded === t.id ? null : t.id) }}
                    className="w-full text-left px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900">{t.label}</span>
                      {t.tag && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-2 py-0.5 flex-shrink-0">
                          {t.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{t.summary}</p>
                    <span className="text-[10px] font-bold text-green-600 mt-1.5 inline-block">
                      {expanded === t.id ? 'Hide details' : 'What is needed?'}
                    </span>
                  </button>

                  {expanded === t.id && (
                    <div className="border-t border-gray-100 px-3.5 py-3 space-y-2">
                      {t.good && <p className="text-[11px] text-gray-600">{t.good}</p>}
                      {t.watch && (
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          <strong>Worth knowing:</strong> {t.watch}
                        </p>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          You will need
                        </p>
                        <ul className="space-y-1">
                          {t.needs.map((n) => (
                            <li key={n} className="flex items-start gap-1.5 text-[11px] text-gray-600 leading-relaxed">
                              <CheckCircle2 size={11} className="text-green-500 flex-shrink-0 mt-0.5" />
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Preferred name <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text" value={proposedName}
                onChange={(e) => setProposedName(e.target.value)}
                placeholder="The name you want to register"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Email *</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone / WhatsApp *</label>
              <input
                type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Anything else <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What does your business do?"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          {result && (
            <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium ${
              result.kind === 'ok'
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {result.kind === 'ok'
                ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{result.text}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send request
            </button>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              No payment now. We will reply with the cost first.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
