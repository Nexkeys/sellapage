// src/components/dashboard/marketing/SeoTab.jsx
//
// Lets a vendor make their storefront findable by Google and describable by AI
// assistants, without touching code.
//
// What the vendor writes here is served as real HTML by storefront-render.js:
// title, meta description, Store/ItemList/FAQPage JSON-LD, and a crawlable text
// block. That is the whole point - a client-rendered page would show crawlers
// nothing, so none of this would be worth paying for.
//
// Two rules this UI is built around:
//   - Everything saved here appears ON the page as well as in the metadata.
//     Assistants discount structured data with no visible counterpart, so there
//     is deliberately no "keywords nobody sees" field.
//   - Downgrading never deletes anything. A Starter vendor still sees their
//     saved work, greyed out, with a clear route back.
import { useState, useEffect, useCallback } from 'react'
import {
  Search, Globe, Plus, X, Loader2, Check, AlertCircle, Lock,
  Sparkles, Link2, ChevronDown, ChevronUp, Eye,
} from 'lucide-react'
import { auth } from '../../../firebase/auth'

const EMPTY = {
  enabled: false, title: '', tagline: '', description: '', about: '',
  category: '', keywords: [], serviceAreas: [], socialLinks: [], faq: [],
}

const LIMITS = { title: 70, tagline: 60, description: 160, about: 1200, faqQ: 150, faqA: 500 }

/** Small chip editor used for keywords, delivery areas and social links. */
function ChipInput({ label, hint, values, onChange, placeholder, max, type = 'text' }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v || values.includes(v) || values.length >= max) return
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
      <div className="mt-1.5 flex gap-2">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || values.length >= max}
          className="flex-shrink-0 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          <Plus size={14} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
              <span className="truncate">{v}</span>
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-1 text-[10px] text-gray-400">{values.length} of {max}</p>
    </div>
  )
}

function Counter({ value, max }) {
  const over = value.length > max * 0.9
  return (
    <span className={`text-[10px] font-semibold ${over ? 'text-amber-600' : 'text-gray-400'}`}>
      {value.length}/{max}
    </span>
  )
}

export default function SeoTab({ store, storeUrl }) {
  const [form, setForm] = useState(EMPTY)
  const [meta, setMeta] = useState({ eligible: false, active: false, plan: 'starter', previousSlugs: [], customDomain: null, customDomainStatus: null, storeName: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)

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
        if (cancelled || !d.success) return
        setForm({ ...EMPTY, ...(d.seo || {}) })
        setMeta({
          eligible: d.eligible, active: d.active, plan: d.plan,
          previousSlugs: d.previousSlugs || [], customDomain: d.customDomain,
          customDomainStatus: d.customDomainStatus, storeName: d.storeName || '',
        })
      } catch {
        if (!cancelled) setError('Could not load your SEO settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authed])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const save = async (override) => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { ...form, ...(override || {}) }
      const r = await authed('/api/store-seo?action=save', { method: 'POST', body: JSON.stringify({ seo: payload }) })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save.'); return }
      setForm({ ...EMPTY, ...d.seo })
      setMeta((m) => ({ ...m, active: d.active }))
      setSuccess(d.active ? 'Saved. Your store is live for search engines and AI.' : 'Saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const publicUrl =
    meta.customDomain && meta.customDomainStatus === 'verified'
      ? `https://${meta.customDomain}`
      : storeUrl || `https://sellapage.com.ng/${meta.storeName}`

  const previewTitle = (form.title || `${store?.businessName || meta.storeName}${form.tagline ? ` - ${form.tagline}` : ''} | Sellapage`).slice(0, LIMITS.title)
  const previewDesc = form.description || store?.description || 'Add a description so search engines and AI know what you sell.'

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-100/70" />
        ))}
      </div>
    )
  }

  const locked = !meta.eligible
  const hasSavedWork = Boolean(form.title || form.description || form.about || form.keywords?.length)

  return (
    <div className="space-y-4">
      {/* Plan state. A downgraded vendor is told plainly that nothing was lost. */}
      {locked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {hasSavedWork ? 'Your SEO is paused, not deleted' : 'SEO is a Growth feature'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                {hasSavedWork
                  ? 'Everything you set up is still saved exactly as you left it. Upgrade to Growth and it goes live again immediately, with nothing to redo.'
                  : 'Upgrade to Growth to let Google and AI assistants find your store and describe what you sell.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* The master switch. */}
      <div className={`rounded-2xl border p-4 ${meta.active ? 'border-green-200 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe size={16} className={meta.active ? 'text-green-600' : 'text-gray-400'} />
              <p className="text-sm font-bold text-gray-900">Search engine and AI indexing</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {meta.active
                ? 'Your store page is being served to Google and AI assistants with everything below. Ask an AI about your store link and it will describe your business.'
                : 'Turn this on to let Google, ChatGPT, Claude, Perplexity and Gemini read your store and describe what you sell.'}
            </p>
          </div>
          <button
            type="button"
            disabled={locked || saving}
            onClick={() => { const next = !form.enabled; set('enabled', next); save({ enabled: next }) }}
            aria-label="Toggle indexing"
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${form.enabled ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${form.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
          <Link2 size={13} className="flex-shrink-0 text-gray-400" />
          <span className="truncate text-[11px] font-mono text-gray-600">{publicUrl}</span>
        </div>
        {meta.previousSlugs?.length > 0 && (
          <p className="mt-2 text-[11px] text-gray-500">
            Old addresses still redirect here: {meta.previousSlugs.map((s) => `/${s}`).join(', ')}
          </p>
        )}
      </div>

      {/* What a search result and an AI answer will look like. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="flex w-full items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Eye size={15} className="text-gray-400" /> Preview
          </span>
          {showPreview ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>
        {showPreview && (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">On Google</p>
              <p className="truncate text-sm font-medium text-blue-700">{previewTitle}</p>
              <p className="truncate text-[11px] text-green-700">{publicUrl}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{previewDesc}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">What an AI will say</p>
              <p className="text-xs leading-relaxed text-gray-700">
                {`${store?.businessName || meta.storeName}. ${previewDesc}`}
                {form.about ? ` ${form.about}` : ''}
                {form.serviceAreas?.length ? ` Delivers to ${form.serviceAreas.join(', ')}.` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <fieldset disabled={locked} className={locked ? 'opacity-60' : ''}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-900">How your store is described</p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">One-line summary</label>
                <Counter value={form.tagline} max={LIMITS.tagline} />
              </div>
              <p className="mt-0.5 text-[11px] text-gray-400">What you sell, in a few words. Appears next to your name in results.</p>
              <input
                value={form.tagline}
                maxLength={LIMITS.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="Handmade crochet wear in Lagos"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Search description</label>
                <Counter value={form.description} max={LIMITS.description} />
              </div>
              <p className="mt-0.5 text-[11px] text-gray-400">The sentence shown under your link on Google. Say what you sell and where you deliver.</p>
              <textarea
                value={form.description}
                maxLength={LIMITS.description}
                rows={2}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Chichi Store makes handmade crochet dresses, tops and bags in Lagos, with nationwide delivery."
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">About your business</label>
                <Counter value={form.about} max={LIMITS.about} />
              </div>
              <p className="mt-0.5 text-[11px] text-gray-400">
                This is the part AI assistants read most. Who you are, what you make, how you work, how long orders take.
              </p>
              <textarea
                value={form.about}
                maxLength={LIMITS.about}
                rows={4}
                onChange={(e) => set('about', e.target.value)}
                placeholder="Chichi Store is a Lagos crochet studio. Every piece is hand-crocheted to order, usually within 7 to 14 days."
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
            <ChipInput
              label="What people search for"
              hint="The words a customer would type. Use real phrases, not single words."
              values={form.keywords || []}
              onChange={(v) => set('keywords', v)}
              placeholder="crochet dresses in lagos"
              max={30}
            />
            <ChipInput
              label="Where you deliver"
              hint="Cities or states. Helps you show up for local searches."
              values={form.serviceAreas || []}
              onChange={(v) => set('serviceAreas', v)}
              placeholder="Lagos"
              max={12}
            />
            <ChipInput
              label="Your social profiles"
              hint="Links Google and AI use to confirm this is the same business."
              values={form.socialLinks || []}
              onChange={(v) => set('socialLinks', v)}
              placeholder="https://instagram.com/yourstore"
              max={8}
              type="url"
            />
          </div>

          {/* FAQ. The single highest-value block for being quoted by an AI. */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-900">Questions customers ask</p>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Answer the questions you get in DMs every day. These are what an AI quotes when someone asks about your store.
            </p>
            <div className="mt-3 space-y-2.5">
              {(form.faq || []).map((f, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={f.q}
                        maxLength={LIMITS.faqQ}
                        onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                        placeholder="How long does delivery take?"
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-green-400"
                      />
                      <textarea
                        value={f.a}
                        maxLength={LIMITS.faqA}
                        rows={2}
                        onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                        placeholder="Lagos orders arrive in 1 to 2 days. Other states take 3 to 5 working days."
                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
                      />
                    </div>
                    <button type="button" onClick={() => set('faq', form.faq.filter((_, j) => j !== i))} className="mt-1 flex-shrink-0 text-gray-300 hover:text-red-500" aria-label="Remove question">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {(form.faq?.length || 0) < 10 && (
              <button
                type="button"
                onClick={() => set('faq', [...(form.faq || []), { q: '', a: '' }])}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:border-green-300 hover:text-green-700"
              >
                <Plus size={13} /> Add a question
              </button>
            )}
          </div>
        </div>
      </fieldset>

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

      {!locked && (
        <div className="sticky bottom-3 z-10">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-300"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save SEO settings'}
          </button>
        </div>
      )}
    </div>
  )
}
