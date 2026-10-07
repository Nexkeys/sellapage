// src/components/dashboard/marketing/SeoTab.jsx
//
// Lets a vendor make their storefront findable by Google and describable by AI
// assistants, without touching code. Redesigned 2026-10-07 from Nex's mockup:
// the settings on the left, and on the right a "Discovery health" score, a
// Google result preview, what an AI assistant would say, and Save.
//
// What the vendor writes here is served as real HTML by storefront-render.js:
// title, meta description, Store/ItemList/FAQPage JSON-LD, and a crawlable text
// block. That is the whole point - a client-rendered page would show crawlers
// nothing, so none of this would be worth paying for.
//
// Two rules this UI is built around:
//   - Everything saved here appears ON the page as well as in the metadata.
//     Assistants discount structured data with no visible counterpart.
//   - Downgrading never deletes anything. A Starter vendor still sees their
//     saved work, greyed out, with a clear route back.
// Nothing saves by itself: changes go live when the vendor presses Save.
import { useState, useEffect, useCallback } from 'react'
import {
  Search, Globe, Plus, X, Loader2, Check, AlertCircle, Lock, Sparkles, Link2, ExternalLink, Store, MapPin, Users,
  MessageCircleQuestion, Lightbulb, Save, CheckCircle2, Circle, Instagram, Facebook, Twitter, Youtube, Linkedin, Trash2, Bot,
} from 'lucide-react'
import { auth } from '../../../firebase/auth'

const EMPTY = {
  enabled: false, title: '', tagline: '', description: '', about: '',
  category: '', keywords: [], serviceAreas: [], socialLinks: [], faq: [],
}

const LIMITS = { title: 70, tagline: 60, description: 160, about: 1200, faqQ: 150, faqA: 500 }
const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

function socialIcon(url) {
  const u = String(url).toLowerCase()
  if (u.includes('instagram')) return [Instagram, 'text-pink-600']
  if (u.includes('facebook') || u.includes('fb.com')) return [Facebook, 'text-blue-600']
  if (u.includes('twitter') || u.includes('x.com')) return [Twitter, 'text-gray-900']
  if (u.includes('youtube')) return [Youtube, 'text-red-600']
  if (u.includes('linkedin')) return [Linkedin, 'text-sky-700']
  return [Link2, 'text-gray-500']
}

function Card({ icon: Icon, title, sub, required, right, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && <Icon size={18} className="mt-0.5 flex-shrink-0 text-gray-500" />}
          <div className="min-w-0">
            <p className="text-[14.5px] font-bold text-gray-900">{title}{required && <span className="ml-0.5 text-red-500">*</span>}</p>
            {sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}

function Counter({ value, max }) {
  const over = value.length > max * 0.9
  return <span className={`flex-shrink-0 text-[11px] font-semibold tabular-nums ${over ? 'text-amber-600' : 'text-gray-400'}`}>{value.length}/{max}</span>
}

/** Pills with an inline "Add" field, for keywords, delivery areas and links. */
function Chips({ values, onChange, placeholder, max, addLabel, type = 'text', render }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v || values.includes(v) || values.length >= max) return
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12.5px] font-semibold text-forest-700 ring-1 ring-forest-100">
              {render ? render(v) : <span className="truncate">{v}</span>}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="flex-shrink-0 rounded-full text-forest-600 hover:text-red-600"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
      {adding ? (
        <div className="mt-2.5 flex gap-2">
          <input autoFocus type={type} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } if (e.key === 'Escape') setAdding(false) }}
            placeholder={placeholder} className={`${INPUT} min-w-0 flex-1 py-2`} />
          <button type="button" onClick={add} disabled={!draft.trim() || values.length >= max} className="flex-shrink-0 rounded-xl bg-forest-600 px-3.5 text-[12.5px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400">Add</button>
          <button type="button" onClick={() => { setAdding(false); setDraft('') }} className="flex-shrink-0 rounded-xl px-2 text-gray-400 hover:text-gray-700" aria-label="Cancel"><X size={16} /></button>
        </div>
      ) : values.length < max && (
        <button type="button" onClick={() => setAdding(true)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition hover:border-forest-200 hover:text-forest-700">
          <Plus size={14} /> {addLabel}
        </button>
      )}
      <p className="mt-1.5 text-[11px] text-gray-400">{values.length} of {max}</p>
    </div>
  )
}

/** The seven things that make a store easy to find, as a ring and a checklist. */
function Health({ form }) {
  const items = [
    ['Summary', form.tagline.trim().length >= 10, `${form.tagline.length}/${LIMITS.tagline} chars`],
    ['Search description', form.description.trim().length >= 50, `${form.description.length}/${LIMITS.description} chars`],
    ['About your business', form.about.trim().length >= 100, `${form.about.length}/${LIMITS.about} chars`],
    ['Keywords', (form.keywords || []).length >= 3, `${(form.keywords || []).length} added`],
    ['Delivery areas', (form.serviceAreas || []).length >= 1, `${(form.serviceAreas || []).length} added`],
    ['Social profiles', (form.socialLinks || []).length >= 1, `${(form.socialLinks || []).length} added`],
    ['Questions answered', (form.faq || []).filter((f) => f.q.trim() && f.a.trim()).length >= 2, `${(form.faq || []).filter((f) => f.q.trim() && f.a.trim()).length} added`],
  ]
  const done = items.filter(([, ok]) => ok).length
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <p className="text-[16px] font-bold text-gray-900">Discovery health</p>
      <p className="mt-0.5 text-[12.5px] text-gray-500">{done === items.length ? 'Your store is well set up for search and AI.' : `${items.length - done} more to go for full marks.`}</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-24 w-24 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#eef2f0" strokeWidth="7" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="#0b6b35" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / items.length)} className="transition-[stroke-dashoffset] duration-700" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-[22px] font-extrabold leading-none text-gray-900">{done}/{items.length}</span><span className="mt-0.5 text-[9.5px] text-gray-500">set up</span></span>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {items.map(([label, ok, note]) => (
            <li key={label} className="flex items-center gap-2 text-[12.5px]">
              {ok ? <CheckCircle2 size={15} className="flex-shrink-0 text-forest-600" /> : <Circle size={15} className="flex-shrink-0 text-gray-300" />}
              <span className={`min-w-0 flex-1 truncate ${ok ? 'text-gray-800' : 'text-gray-500'}`}>{label}</span>
              <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-400">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function SeoTab({ store, storeUrl, onStatusChange }) {
  const [form, setForm] = useState(EMPTY)
  const [meta, setMeta] = useState({ eligible: false, active: false, plan: 'starter', previousSlugs: [], customDomain: null, customDomainStatus: null, storeName: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dirty, setDirty] = useState(false)

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
        onStatusChange?.({ eligible: d.eligible, active: d.active })
      } catch {
        if (!cancelled) setError('Could not load your SEO settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setDirty(true) }

  const save = async (override) => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { ...form, ...(override || {}) }
      const r = await authed('/api/store-seo?action=save', { method: 'POST', body: JSON.stringify({ seo: payload }) })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save.'); return }
      setForm({ ...EMPTY, ...d.seo })
      setMeta((m) => ({ ...m, active: d.active }))
      setDirty(false)
      onStatusChange?.({ eligible: true, active: d.active })
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

  const name = store?.businessName || meta.storeName
  const previewTitle = (form.title || `${name}${form.tagline ? ` | ${form.tagline}` : ''}`).slice(0, LIMITS.title)
  const previewDesc = form.description || store?.description || 'Add a description so search engines and AI know what you sell.'
  const searchTerm = form.keywords?.[0] || `${name}`

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-100/70" />)}</div>
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-100/70" />)}</div>
      </div>
    )
  }

  const locked = !meta.eligible
  const hasSavedWork = Boolean(form.title || form.description || form.about || form.keywords?.length)

  return (
    <div className="grid grid-cols-1 items-start gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        {/* Plan state. A downgraded vendor is told plainly that nothing was lost. */}
        {locked && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Lock size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">{hasSavedWork ? 'Your SEO is paused, not deleted' : 'Get found is a Growth feature'}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                {hasSavedWork
                  ? 'Everything you set up is still saved exactly as you left it. Upgrade to Growth and it goes live again immediately, with nothing to redo.'
                  : 'Upgrade to Growth to let Google and AI assistants find your store and describe what you sell.'}
              </p>
            </div>
          </div>
        )}

        {/* The master switch. */}
        <section className={`flex items-center gap-3 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${meta.active ? 'border-forest-200 bg-forest-50/60' : 'border-gray-100 bg-white'}`}>
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${meta.active ? 'bg-forest-100 text-forest-700' : 'bg-gray-100 text-gray-400'}`}><Globe size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold text-gray-900">Search engine and AI indexing</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">
              {meta.active
                ? 'Google and AI assistants can find and understand your store, with everything below.'
                : 'Turn this on to let Google, ChatGPT, Claude, Perplexity and Gemini read your store and describe what you sell.'}
            </p>
          </div>
          <span className="flex flex-shrink-0 items-center gap-2">
            <span className={`hidden text-[12px] font-bold sm:inline ${form.enabled ? 'text-forest-700' : 'text-gray-400'}`}>{form.enabled ? 'On' : 'Off'}</span>
            <button type="button" role="switch" aria-checked={form.enabled} disabled={locked || saving}
              onClick={() => { const next = !form.enabled; set('enabled', next); save({ enabled: next }) }} aria-label="Search engine and AI indexing"
              className={`relative inline-flex h-7 w-12 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${form.enabled ? 'bg-forest-600' : 'bg-gray-200'}`}>
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${form.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </span>
        </section>

        <fieldset disabled={locked} className={`min-w-0 space-y-4 ${locked ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card icon={Link2} title="Store URL" sub="Your public store link. This is what search engines and customers find.">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-gray-700">{publicUrl}</span>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-gray-400 hover:text-forest-700" aria-label="Open your store"><ExternalLink size={15} /></a>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-forest-700"><CheckCircle2 size={14} /> Looks good</p>
              {meta.previousSlugs?.length > 0 && <p className="mt-1.5 text-[11.5px] text-gray-500">Old addresses still redirect here: {meta.previousSlugs.map((s) => `/${s}`).join(', ')}</p>}
            </Card>
            <Card icon={Search} title="What people search for" required sub="The words a customer would type. Use real phrases, not single words.">
              <Chips values={form.keywords || []} onChange={(v) => set('keywords', v)} placeholder="crochet dresses in lagos" max={30} addLabel="Add keyword" />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card icon={Store} title="Business information" sub="What people see in search results and AI answers.">
              <div className="space-y-4">
                <label className="block">
                  <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-gray-800">One-line summary <span className="text-red-500">*</span></span><Counter value={form.tagline} max={LIMITS.tagline} /></span>
                  <span className="mt-0.5 block text-[11.5px] text-gray-500">What you sell, in a few words. Shown next to your name in results.</span>
                  <input value={form.tagline} maxLength={LIMITS.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Handmade crochet wear in Lagos" className={`${INPUT} mt-1.5`} />
                </label>
                <label className="block">
                  <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-gray-800">Search description <span className="text-red-500">*</span></span><Counter value={form.description} max={LIMITS.description} /></span>
                  <span className="mt-0.5 block text-[11.5px] text-gray-500">The sentence under your link on Google. Say what you sell and where you deliver.</span>
                  <textarea value={form.description} maxLength={LIMITS.description} rows={3} onChange={(e) => set('description', e.target.value)} placeholder="Chichi Store makes handmade crochet dresses, tops and bags in Lagos, with nationwide delivery." className={`${INPUT} mt-1.5 resize-y`} />
                </label>
                <label className="block">
                  <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-gray-800">About your business <span className="text-red-500">*</span></span><Counter value={form.about} max={LIMITS.about} /></span>
                  <span className="mt-0.5 block text-[11.5px] text-gray-500">The part AI assistants read most: who you are, what you make, how you work, how long orders take.</span>
                  <textarea value={form.about} maxLength={LIMITS.about} rows={5} onChange={(e) => set('about', e.target.value)} placeholder="Chichi Store is a Lagos crochet studio. Every piece is hand-crocheted to order, usually within 7 to 14 days." className={`${INPUT} mt-1.5 resize-y`} />
                </label>
                <p className="flex items-start gap-2 rounded-xl bg-forest-50/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-forest-800"><Lightbulb size={15} className="mt-0.5 flex-shrink-0 text-forest-600" />These details help search engines understand your business and show the right information to people searching for what you sell.</p>
              </div>
            </Card>
            <div className="space-y-4">
              <Card icon={MapPin} title="Where you deliver" required sub="Cities or states. Helps you show up in local searches.">
                <Chips values={form.serviceAreas || []} onChange={(v) => set('serviceAreas', v)} placeholder="Lagos" max={12} addLabel="Add location" />
              </Card>
              <Card icon={Users} title="Your social profiles" sub="Links Google and AI use to confirm this is the same business.">
                <Chips values={form.socialLinks || []} onChange={(v) => set('socialLinks', v)} placeholder="https://instagram.com/yourstore" max={8} addLabel="Add profile" type="url"
                  render={(v) => { const [I, cls] = socialIcon(v); return <><I size={13} className={`flex-shrink-0 ${cls}`} /><span className="truncate">{v.replace(/^https?:\/\/(www\.)?/, '')}</span></> }} />
              </Card>
            </div>
          </div>

          {/* FAQ. The single highest-value block for being quoted by an AI. */}
          <Card icon={MessageCircleQuestion} title="Questions customers ask" sub="Answer the questions you get in DMs every day. These are what an AI quotes when someone asks about your store.">
            <div className="space-y-2.5">
              {(form.faq || []).map((f, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <Search size={15} className="mt-2.5 flex-shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input value={f.q} maxLength={LIMITS.faqQ} onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="How long does delivery take?" className={`${INPUT} py-2 text-[13px] font-semibold`} />
                    <textarea value={f.a} maxLength={LIMITS.faqA} rows={2} onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} placeholder="Lagos orders arrive in 1 to 2 days. Other states take 3 to 5 working days." className={`${INPUT} resize-y py-2 text-[13px]`} />
                  </div>
                  <button type="button" onClick={() => set('faq', form.faq.filter((_, j) => j !== i))} className="mt-2 flex-shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label="Remove question"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {(form.faq?.length || 0) < 10 && (
              <button type="button" onClick={() => set('faq', [...(form.faq || []), { q: '', a: '' }])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition hover:border-forest-200 hover:text-forest-700">
                <Plus size={14} /> Add a question
              </button>
            )}
          </Card>
        </fieldset>
      </div>

      {/* ── Right: health, previews, save ── */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
        <Health form={form} />

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <p className="text-[16px] font-bold text-gray-900">Search preview</p>
          <p className="mt-0.5 text-[12.5px] text-gray-500">How your store might appear on Google. It is a preview, not live, and Google may show it differently.</p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="font-display text-[22px] font-bold leading-none tracking-tight" aria-hidden="true"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600"><Search size={13} className="flex-shrink-0 text-gray-400" /><span className="truncate">{searchTerm}</span></span>
          </div>
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
            <p className="flex items-center gap-2 truncate text-[11.5px] text-gray-600"><Globe size={13} className="flex-shrink-0 text-gray-400" />{publicUrl.replace(/^https?:\/\//, '')}</p>
            <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-[#1a0dab]">{previewTitle}</p>
            <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-gray-600">{previewDesc}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-gray-900"><Bot size={17} className="text-forest-600" /> AI assistant preview</p>
          <p className="mt-0.5 text-[12.5px] text-gray-500">How assistants such as ChatGPT, Gemini and others could describe your business.</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-forest-50/60 p-3.5 ring-1 ring-forest-100">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Sparkles size={15} /></span>
            <p className="text-[12.5px] leading-relaxed text-gray-700">
              {`${name}. ${previewDesc}`}
              {form.about ? ` ${form.about.slice(0, 260)}${form.about.length > 260 ? '...' : ''}` : ''}
              {form.serviceAreas?.length ? ` Delivers to ${form.serviceAreas.join(', ')}.` : ''}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Based on your store information.</p>
        </section>

        {error && <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3"><AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" /><p className="text-xs font-semibold text-red-700">{error}</p></div>}
        {success && <div className="flex items-start gap-2 rounded-xl border border-forest-100 bg-forest-50 p-3"><Check size={14} className="mt-0.5 flex-shrink-0 text-forest-600" /><p className="text-xs font-semibold text-forest-700">{success}</p></div>}

        {!locked && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg shadow-gray-200/50 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-30 max-lg:shadow-2xl">
            <p className={`min-w-0 flex-1 text-[12px] ${dirty ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{dirty ? 'You have changes that are not saved yet.' : 'Changes go live when you save.'}</p>
            <button type="button" onClick={() => save()} disabled={saving} className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-forest px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:bg-gray-300">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saving ? 'Saving...' : 'Save SEO settings'}
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
