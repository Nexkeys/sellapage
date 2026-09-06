// src/components/dashboard/marketing/GuaranteeTab.jsx
//
// Lets a vendor write one specific promise that a stranger can hold them to.
//
// Every other section of Marketing makes a vendor findable. This one is the
// only thing that helps close a stranger once they arrive, which the research
// says is the real bottleneck: roughly a quarter of Nigerian social-commerce
// shoppers report being scammed, buyers "doubt new service providers", and
// vendors spend most of their effort convincing people they are real.
//
// A new store has no reviews to lean on. The only credibility it can offer is a
// promise it is willing to be judged by.
//
// Free on every plan on purpose: the vendors who most need this are the new
// ones with nothing else to show, which is exactly the Starter cohort.
import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Loader2, Check, AlertCircle, Eye } from 'lucide-react'
import { auth } from '../../../firebase/auth'
import GuaranteeBadge from '../../GuaranteeBadge'

const EMPTY = { enabled: false, headline: '', details: '', days: 7 }

const LIMITS = { headline: 140, details: 400 }

// Written to be edited, not pasted. Each one names a specific failure and a
// specific remedy, which is what makes a promise believable.
const EXAMPLES = [
  'If it does not fit, send it back within 7 days and I will swap it free.',
  'If your order does not arrive by the day I promised, delivery is on me.',
  'If what you receive is not exactly what you saw here, I refund you in full.',
  'If it stops working within 30 days, I repair or replace it at no cost.',
]

const DAY_OPTIONS = [3, 7, 14, 30]

export default function GuaranteeTab({ store, storeUrl }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const authed = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken()
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await authed('/api/store-seo?action=get')
        const d = await r.json()
        if (cancelled) return
        if (d?.guarantee) setForm({ ...EMPTY, ...d.guarantee })
      } catch {
        if (!cancelled) setError('Could not load your guarantee.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authed])

  const save = async (override) => {
    const payload = { ...form, ...(override || {}) }
    if (payload.enabled && !payload.headline.trim()) {
      setError('Write the promise before switching it on.')
      return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const r = await authed('/api/store-seo?action=save-guarantee', {
        method: 'POST',
        body: JSON.stringify({ guarantee: payload }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save.'); return }
      setForm({ ...EMPTY, ...d.guarantee })
      setSuccess(d.guarantee?.enabled ? 'Live on your store page.' : 'Saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100/70" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${form.enabled ? 'border-green-200 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className={form.enabled ? 'text-green-600' : 'text-gray-400'} />
              <p className="text-sm font-bold text-gray-900">Show your guarantee</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {form.enabled
                ? 'Buyers see this right before they pay, and again at the bottom of your store page.'
                : 'A stranger who has never bought from you needs a reason to trust you. A clear promise is the fastest one you can give.'}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => { const next = !form.enabled; setForm((p) => ({ ...p, enabled: next })); save({ enabled: next }) }}
            aria-label="Toggle guarantee"
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${form.enabled ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${form.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Your promise</label>
            <span className={`text-[10px] font-semibold ${form.headline.length > LIMITS.headline * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
              {form.headline.length}/{LIMITS.headline}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Name what could go wrong and exactly what you will do about it. Vague promises convince nobody.
          </p>
          <textarea
            value={form.headline}
            maxLength={LIMITS.headline}
            rows={2}
            onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
            placeholder="If it does not fit, send it back within 7 days and I will swap it free."
            className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setForm((p) => ({ ...p, headline: ex.slice(0, LIMITS.headline) }))}
                className="rounded-lg border border-gray-200 px-2 py-1 text-left text-[10px] text-gray-500 hover:border-green-300 hover:text-green-700"
              >
                {ex.length > 46 ? `${ex.slice(0, 46)}...` : ex}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700">How long it lasts</label>
          <p className="mt-0.5 text-[11px] text-gray-400">
            A promise with a deadline is believable. One without a deadline reads as marketing.
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((p) => ({ ...p, days: d }))}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                  Number(form.days) === d ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Any conditions (optional)</label>
            <span className="text-[10px] font-semibold text-gray-400">{form.details.length}/{LIMITS.details}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Be honest about limits here rather than arguing later. Only promise what you will actually honour.
          </p>
          <textarea
            value={form.details}
            maxLength={LIMITS.details}
            rows={2}
            onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
            placeholder="Item must be unworn with tags on. You cover the return delivery."
            className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
          />
        </div>
      </div>

      {form.headline.trim() && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Eye size={15} className="text-gray-400" /> What buyers will see
          </p>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Before they pay</p>
          <GuaranteeBadge guarantee={{ ...form, enabled: true }} variant="inline" />
          <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">At the bottom of your store</p>
          <GuaranteeBadge guarantee={{ ...form, enabled: true }} variant="panel" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
          <Check size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
          <p className="text-xs font-semibold text-green-700">{success}</p>
        </div>
      )}

      <div className="sticky bottom-3 z-10">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-300"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save guarantee'}
        </button>
      </div>
    </div>
  )
}
