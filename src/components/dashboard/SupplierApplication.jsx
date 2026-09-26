// src/components/dashboard/SupplierApplication.jsx
// Dropshipping Marketplace, Phase 1: applying to become a supplier.
//
// Shown inside Supplier Hub, and only once the marketplace is unlocked for
// this store (MarketplaceTab decides that). Every requirement is drawn from
// /api/supplier-application, never from the local store document, so the form
// says the same thing the server will say when Submit is pressed.
//
// The server re-checks all of it anyway: nothing here is a gate, it is a
// screen.
import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2, Circle, Loader2, Upload, Video, AlertCircle, Clock, ShieldCheck, Ban, ArrowRight, RefreshCw,
} from 'lucide-react'
import { uploadVideo, SUPPLIER_VIDEO_MAX_BYTES, SUPPLIER_VIDEO_MAX_SECONDS } from '../../firebase/products'
import { callMarketplace } from '../../utils/marketplaceApi'
import { termsSummary } from '../../utils/supplierTerms'
import SupplierTermsForm from './SupplierTermsForm'
import SupplierListings from './SupplierListings'
import AgreementAccept from './AgreementAccept'

const MB = Math.round(SUPPLIER_VIDEO_MAX_BYTES / (1024 * 1024))

const callApi = (action, opts) => callMarketplace('supplier-application', action, opts)

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '')

/** One coloured panel per status, so the vendor never has to guess. */
const PANELS = {
  pending: {
    Icon: Clock,
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    iconTone: 'text-amber-600',
    title: 'Your application is with our team',
    lead: 'We watch every supplier video ourselves, so this takes a little time. You will get a notification the moment there is a decision.',
  },
  approved: {
    Icon: ShieldCheck,
    tone: 'border-green-200 bg-green-50 text-green-900',
    iconTone: 'text-green-600',
    title: 'You are an approved supplier',
    lead: 'List your products below. Dropshippers can add them to their stores once the marketplace opens.',
  },
  rejected: {
    Icon: AlertCircle,
    tone: 'border-red-200 bg-red-50 text-red-900',
    iconTone: 'text-red-600',
    title: 'Your application was not approved',
    lead: 'Here is what our team flagged. Fix it and you can apply again.',
  },
  suspended: {
    Icon: Ban,
    tone: 'border-red-200 bg-red-50 text-red-900',
    iconTone: 'text-red-600',
    title: 'Your supplier account is suspended',
    lead: 'Your listings are unavailable to dropshippers. Please contact support to sort it out.',
  },
}

export default function SupplierApplication({ navigateTo }) {
  const [state, setState] = useState(null)
  // Read once per mount: a re-render must not silently move the cooldown.
  const [now] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [videoUrl, setVideoUrl] = useState('')
  const [videoName, setVideoName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState('')
  const [editingTerms, setEditingTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setState(await callApi('status'))
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Deferred a tick so the first load does not set state during the effect.
  useEffect(() => {
    const t = setTimeout(() => { load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  const pickVideo = async (event) => {
    const file = event.target.files?.[0]
    // Clearing the input lets the same file be chosen again after an error.
    event.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadVideo(file, 'sellapage/marketplace/suppliers', {
        maxBytes: SUPPLIER_VIDEO_MAX_BYTES,
        maxSeconds: SUPPLIER_VIDEO_MAX_SECONDS,
      })
      setVideoUrl(url)
      setVideoName(file.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await callApi('apply', { method: 'POST', body: { videoUrl, notes } })
      await load()
      setVideoUrl('')
      setVideoName('')
      setNotes('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-8">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <p className="text-sm text-gray-600">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    )
  }

  const status = state?.status || 'none'
  const checks = state?.checks || []
  // The video is part of the checklist from the server, but it is answered by
  // the upload below rather than by another tab, so it is drawn separately.
  // Answered on this screen (agreement, terms, video), so not drawn as checklist rows.
  const setupChecks = checks.filter((c) => !['video', 'terms', 'agreement'].includes(c.key))
  const setupDone = setupChecks.every((c) => c.done)
  const hasTerms = (state?.termsVersion || 0) > 0
  const agreed = state?.agreement?.ok === true
  const canSubmit = setupDone && agreed && hasTerms && !!videoUrl && !submitting && !uploading

  const reapplyAt = state?.canReapplyAt ? new Date(state.canReapplyAt) : null
  const waiting = reapplyAt && reapplyAt.getTime() > now
  const showForm = status === 'none' || (status === 'rejected' && !waiting)

  // A downgraded supplier gets the "upgrade to regain access" banner in the
  // listings below; "list your products below" above it would contradict it.
  const panel = status === 'approved' && state?.sellBlockedBy === 'plan' ? null : PANELS[status]

  return (
    <div className="space-y-4">
      {panel && (
        <div className={`rounded-2xl border p-4 sm:p-5 ${panel.tone}`}>
          <div className="flex items-start gap-3">
            <panel.Icon size={20} className={`mt-0.5 flex-shrink-0 ${panel.iconTone}`} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold">{panel.title}</h2>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{panel.lead}</p>

              {status === 'pending' && state.appliedAt && (
                <p className="mt-2 text-xs opacity-75">Sent on {fmtDate(state.appliedAt)}.</p>
              )}
              {status === 'rejected' && state.rejectionReason && (
                <p className="mt-2 rounded-lg bg-white/70 p-2.5 text-xs font-medium">{state.rejectionReason}</p>
              )}
              {status === 'suspended' && state.suspendedReason && (
                <p className="mt-2 rounded-lg bg-white/70 p-2.5 text-xs font-medium">{state.suspendedReason}</p>
              )}
              {status === 'rejected' && waiting && (
                <p className="mt-2 text-xs opacity-75">You can apply again from {fmtDate(state.canReapplyAt)}.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-gray-900">
            {status === 'rejected' ? 'Apply again' : 'Apply to supply'}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Every supplier is reviewed by a person. Finish these and send us a short video of your stock.
          </p>

          <ul className="mt-3 divide-y divide-gray-50">
            {setupChecks.map((c) => (
              <li key={c.key} className="flex items-center gap-3 py-2.5">
                {c.done ? (
                  <CheckCircle2 size={17} className="flex-shrink-0 text-green-600" />
                ) : (
                  <Circle size={17} className="flex-shrink-0 text-gray-300" />
                )}
                <span className={`min-w-0 flex-1 text-sm ${c.done ? 'text-gray-500' : 'font-medium text-gray-800'}`}>
                  {c.label}
                </span>
                {!c.done && c.tab && (
                  <button
                    type="button"
                    onClick={() => navigateTo?.(c.tab)}
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    {c.key === 'plan' ? 'Upgrade' : 'Set up'} <ArrowRight size={11} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl border border-gray-200 p-4">
            {agreed ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CheckCircle2 size={16} className="text-green-600" />
                Marketplace Supplier Agreement accepted (version {state.agreement.accepted})
              </p>
            ) : (
              <AgreementAccept kind="supplier" onAccepted={() => load()} />
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {hasTerms ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} className="text-gray-300" />}
              Your supplier terms
            </p>
            {hasTerms && !editingTerms ? (
              <div className="mt-2">
                <ul className="space-y-1">
                  {termsSummary(state.terms).map((line) => (
                    <li key={line} className="text-xs leading-relaxed text-gray-600">· {line}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setEditingTerms(true)}
                  className="mt-2 text-[11px] font-bold text-gray-500 hover:text-gray-700"
                >
                  Change my terms
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <SupplierTermsForm
                  initial={state?.terms}
                  onCancel={hasTerms ? () => setEditingTerms(false) : undefined}
                  onSaved={() => { setEditingTerms(false); load() }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <Video size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">A short video of your stock</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  Walk through what you have in stock and say your business name out loud. Up to{' '}
                  {SUPPLIER_VIDEO_MAX_SECONDS} seconds and {MB}MB.
                </p>

                {videoUrl ? (
                  <div className="mt-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 size={13} /> {videoName || 'Video ready'}
                    </p>
                    <video src={videoUrl} controls className="mt-2 w-full max-w-sm rounded-lg bg-black" />
                    <button
                      type="button"
                      onClick={() => { setVideoUrl(''); setVideoName('') }}
                      className="mt-2 text-[11px] font-bold text-gray-500 hover:text-gray-700"
                    >
                      Choose a different video
                    </button>
                  </div>
                ) : (
                  <label
                    className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploading ? 'Uploading…' : 'Upload video'}
                    <input type="file" accept="video/*" className="hidden" onChange={pickVideo} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-bold text-gray-700">Anything we should know? (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="What you sell, how much stock you hold, how fast you ship."
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </label>

          {error && (
            <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Send my application
          </button>
          {!canSubmit && !submitting && (
            <p className="mt-2 text-xs text-gray-400">
              {!setupDone || !hasTerms || !agreed ? 'Finish everything above to send the application.' : 'Upload your video to send the application.'}
            </p>
          )}
        </div>
      )}

      {(status === 'approved' || status === 'suspended') && (
        <SupplierListings state={state} onReload={load} navigateTo={navigateTo} />
      )}
    </div>
  )
}
