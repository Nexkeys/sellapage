//src/components/dashboard/Settings.jsx/
//
// Settings, rebuilt on 2026-09-29 to the Settings design: a section menu on
// the left, the chosen section in the middle, and a status rail on the right.
//
// What changed besides the look:
//   - "Plan & Billing" is gone from here. It duplicated the Billing tab and
//     started payments without the Billing tab's checks; the rail links there.
//   - The store link is renamed through /api/store-seo?action=change-slug (in
//     Dashboard's handleSettingsSave), which refuses taken names and keeps the
//     old link redirecting. It used to be written straight to the store.
//   - Store category (businessCategory) is new, from the same 15 categories
//     products use; Explore Stores filters by it.
//   - Cover image is here too and free on every plan.
//   - Unsaved edits survive switching tabs (kept on this device until saved).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Save, Loader2, CheckCircle2, AlertCircle, Trash2, X, ArrowRight, Check, Shield, Lock, Store, Settings2, Globe,
  CreditCard, Bell, ShieldCheck, Users, Puzzle, SlidersHorizontal, ChevronRight, ExternalLink, Camera, Image as ImageIcon,
  Link2, Copy, QrCode, BarChart3, MessageCircle, Mail, Crown, Tag, KeyRound, Truck, Wallet, Percent, Target,
  Activity, Music2, Smartphone, Lightbulb, RotateCcw, Sparkles,
} from 'lucide-react'
import SessionsPanel from './SessionsPanel'
import PhoneVerifyCard from './PhoneVerifyCard'
import { vendorTypeForInterest } from '../../utils/marketplace'
import { NIGERIAN_MARKET_CATEGORIES } from '../../utils/categories'
import { uploadSingleImage } from '../../firebase/products'
import { resetPassword } from '../../firebase/auth'
import useConfetti from './ui/useConfetti'
import { trackStoreShare } from '../../utils/storeShare'

const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const input = 'w-full rounded-xl border border-dash-line bg-white px-4 py-2.5 text-sm text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-200 focus:ring-4 focus:ring-forest-50'
const SUPPORT_WHATSAPP = 'https://wa.me/2348120525256'
const NAME_MAX = 50
const DESC_SOFT_MAX = 200

const SECTIONS = [
  { id: 'profile', label: 'Business Profile', sub: 'Your store details and branding', icon: Store },
  { id: 'store', label: 'Store Settings', sub: 'Chat button and what you sell', icon: Settings2 },
  { id: 'links', label: 'Domain & Links', sub: 'Store link and custom domain', icon: Globe },
  { id: 'payments', label: 'Payments & Checkout', sub: 'Payouts, delivery and discounts', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', sub: 'Order alerts and emails', icon: Bell },
  { id: 'security', label: 'Security', sub: 'Phone, password and sessions', icon: ShieldCheck },
  { id: 'team', label: 'Team', sub: 'Manage your team members', icon: Users },
  { id: 'integrations', label: 'Integrations', sub: 'Ads, pixels and more', icon: Puzzle },
  { id: 'advanced', label: 'Advanced', sub: 'Delete your store', icon: SlidersHorizontal },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts.length === 1 ? parts[0][0] : parts[0][0] + parts[1][0]).toUpperCase()
}

const fromStore = (store) => ({
  ownerName: store?.ownerName || '',
  businessName: store?.businessName || '',
  storeName: store?.storeName || '',
  whatsappNumber: store?.whatsappNumber || '',
  showWhatsApp: store?.showWhatsApp !== false,
  description: store?.description || '',
  vendorType: store?.vendorType || 'products',
  businessCategory: store?.businessCategory || '',
  marketplaceInterest: { supply: store?.marketplaceInterest?.supply === true, dropship: store?.marketplaceInterest?.dropship === true },
})
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function Section({ title, sub, children, icon: Icon }) {
  return (
    <section className={`${card} p-4 sm:p-6`}>
      <div className="flex items-start gap-3">
        {Icon && <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><Icon size={18} /></span>}
        <div>
          <h2 className="text-[17px] font-semibold text-dash-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-dash-muted">{sub}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function LinkRow({ icon: Icon, title, sub, onClick, badge, locked }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-dash-line p-3.5 text-left transition hover:border-forest-200 hover:bg-forest-50/40">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-slate-600 group-hover:bg-white"><Icon size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink">{title}{badge && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{badge}</span>}</span>
        <span className="block text-xs text-dash-muted">{sub}</span>
      </span>
      {locked ? <Lock size={15} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-forest" />}
    </button>
  )
}

export default function SettingsTab({
  store, plan, planStatus, isGrowthOrPro, isPro, isPremium,
  onSave, saveLoading, saveError, saveSuccess,
  onDeleteAccount, deleteLoading, deleteError, onClearDeleteError,
  onLogoUpload, logoUploading, logoError,
  onWhatsAppToggle, onStoreSave, navigateTo, storeUrl = '',
}) {
  const draftKey = `sellapage_settings_draft_${store?.id}`
  const saved = useMemo(() => fromStore(store), [store])
  const [form, setForm] = useState(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(draftKey) || 'null')
      return d ? { ...fromStore(store), ...d } : fromStore(store)
    } catch { return fromStore(store) }
  })
  const [restored] = useState(() => { try { return !!sessionStorage.getItem(draftKey) } catch { return false } })
  const [section, setSection] = useState('profile')
  const [slugState, setSlugState] = useState({ slug: '', state: 'idle', message: '' })
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [toast, setToast] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [resetSent, setResetSent] = useState('idle')
  const [party, setParty] = useState(false)
  const canvasRef = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useConfetti(canvasRef, party && !reduced)

  const hasCustomDomain = !!store?.customDomain
  const dirty = !same(form, saved)
  const cover = store?.themeMetadata?.heroBannerUrl || ''

  // Keep unsaved edits for this browser tab session.
  useEffect(() => {
    try {
      if (dirty) sessionStorage.setItem(draftKey, JSON.stringify(form))
      else sessionStorage.removeItem(draftKey)
    } catch { /* not kept */ }
  }, [form, dirty, draftKey])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => { if (saveSuccess) setToast({ text: 'Saved. Your store is up to date.' }) }, [saveSuccess])

  // Live "is this link free?" for the store link field.
  const slug = form.storeName
  const slugChanged = slug && slug !== (store?.storeName || '')
  useEffect(() => {
    if (!slugChanged) return undefined
    if (!/^[a-z0-9](?:[a-z0-9-]{1,59}[a-z0-9])$/.test(slug) || slug.includes('--')) return undefined
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/signup-phone?action=slug&slug=${encodeURIComponent(slug)}`)
        const d = await r.json()
        if (!cancelled) setSlugState({ slug, state: d.available ? 'free' : 'taken', message: d.message || '' })
      } catch {
        if (!cancelled) setSlugState({ slug, state: 'unknown', message: '' })
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [slug, slugChanged])
  const slugFormatError = !slug ? 'Your store needs a link.'
    : slug.length < 3 ? 'Use at least 3 characters.'
      : slug.startsWith('-') || slug.endsWith('-') ? 'It can’t start or end with a hyphen.'
        : slug.includes('--') ? 'Use one hyphen at a time.' : ''
  const slugStatus = !slugChanged ? 'same' : slugFormatError ? 'bad' : slugState.slug === slug ? slugState.state : 'checking'

  // Profile completeness.
  const checks = [
    { id: 'logo', label: 'Logo', done: !!store?.logoUrl },
    { id: 'cover', label: 'Cover', done: !!cover },
    { id: 'desc', label: 'Description', done: saved.description.trim().length >= 30 },
    { id: 'cat', label: 'Category', done: !!saved.businessCategory },
    { id: 'phone', label: 'Verified phone', done: !!store?.phoneVerified },
  ]
  const doneCount = checks.filter((c) => c.done).length
  const prevDone = useRef(doneCount)
  useEffect(() => {
    if (prevDone.current < checks.length && doneCount === checks.length) {
      setParty(true)
      setToast({ text: 'Your profile is 100% complete. Looking sharp, boss!' })
      const t = setTimeout(() => setParty(false), 4500)
      prevDone.current = doneCount
      return () => clearTimeout(t)
    }
    prevDone.current = doneCount
    return undefined
  }, [doneCount, checks.length])

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e?.target ? e.target.value : e }))
  const submit = () => {
    if (!form.businessName.trim()) { setToast({ text: 'Your store needs a name.', bad: true }); setSection('profile'); return }
    if (slugChanged && (slugFormatError || slugStatus === 'taken')) { setToast({ text: slugFormatError || 'That store link is taken. Try another.', bad: true }); setSection('links'); return }
    onSave(form)
  }
  const discard = () => { setForm(saved); try { sessionStorage.removeItem(draftKey) } catch { /* fine */ } }

  const uploadCover = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type?.startsWith('image/')) { setCoverError('That file is not an image.'); return }
    if (file.size > 10 * 1024 * 1024) { setCoverError('Please choose an image under 10MB.'); return }
    setCoverUploading(true)
    setCoverError('')
    try {
      const url = await uploadSingleImage(file, 'sellapage/banners')
      if (!url) throw new Error('no url')
      await onStoreSave?.({ themeMetadata: { ...(store?.themeMetadata || {}), heroBannerUrl: url } })
      setToast({ text: 'Cover updated. Customers see it now.' })
    } catch {
      setCoverError('The cover did not upload. Check your connection and try again.')
    } finally {
      setCoverUploading(false)
    }
  }

  const sendReset = async () => {
    if (!store?.email) return
    setResetSent('sending')
    try { await resetPassword(store.email); setResetSent('sent') } catch { setResetSent('error') }
  }

  const copyLink = async () => {
    trackStoreShare(store?.id, 'settings')
    try { await navigator.clipboard.writeText(storeUrl) } catch { /* shown */ }
    setToast({ text: 'Store link copied. Go share it!' })
  }

  const closeDelete = useCallback(() => { setShowDelete(false); setDeleteStep(1); setDeletePassword('') }, [])
  const visibleSections = SECTIONS.filter((s) => !(s.id === 'team' && store?._isStaff))
  const planLabel = { starter: 'Free', free: 'Free', growth: 'Growth', pro: 'Pro', premium: 'Premium' }[plan] || 'Free'
  const live = planStatus !== 'expired' && store?.isActive !== false

  // ── Sections ────────────────────────────────────────────────────────────
  const profile = (
    <div className="space-y-4">
      <section className={`${card} overflow-hidden`}>
        <div className="relative grid gap-5 bg-gradient-to-r from-forest-50 via-[#eaf6ee] to-[#dcefe3] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-dash-ink text-2xl font-bold text-white ring-4 ring-white">
                {store?.logoUrl ? <img src={store.logoUrl} alt="Store logo" className="h-full w-full object-cover" /> : getInitials(store?.businessName)}
              </span>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-dash-line hover:text-forest" aria-label="Change logo">
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onLogoUpload(f) }} />
              </label>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-dash-ink">Store Logo</p>
              <p className="mt-0.5 text-[11px] text-dash-muted">Recommended 512 x 512 (PNG, JPG, up to 5MB)</p>
              {logoError && <p className="mt-1 text-[11px] text-red-600">{logoError}</p>}
            </div>
          </div>
          <div className="relative min-h-[120px] overflow-hidden rounded-2xl bg-white/60 ring-1 ring-white">
            {cover ? <img src={cover} alt="Store cover" className="absolute inset-0 h-full w-full object-cover" /> : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pb-12 text-forest-600/60"><ImageIcon size={24} /><span className="text-[11px]">No cover yet</span></div>
            )}
            {coverUploading && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/75 text-xs font-semibold text-forest"><Loader2 size={15} className="animate-spin" /> Uploading cover...</div>}
            <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
              <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10px] text-slate-600 backdrop-blur">Cover Banner, 1920 x 600, up to 10MB</span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-forest shadow ring-1 ring-forest-100 hover:bg-forest-50">
                <ImageIcon size={13} /> {cover ? 'Change Cover' : 'Add Cover'}
                <input type="file" accept="image/*" className="hidden" disabled={coverUploading} onChange={uploadCover} />
              </label>
            </div>
          </div>
        </div>
        {coverError && <p className="px-6 pt-3 text-[11px] text-red-600">{coverError}</p>}
        {/* Completeness */}
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-dash-ink">{doneCount === checks.length ? 'Your profile is complete' : `Profile ${Math.round((doneCount / checks.length) * 100)}% complete`}</p>
            <span className="text-xs tabular-nums text-dash-muted">{doneCount}/{checks.length}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-forest-600 to-green-400 transition-all duration-700" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {checks.map((c) => (
              <span key={c.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.done ? 'bg-forest-50 text-forest-600' : 'bg-gray-100 text-slate-500'}`}>
                {c.done ? <Check size={11} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />} {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Section title="Basic Information">
        <div className="space-y-5">
          <div>
            <label htmlFor="st-owner" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Your Name</label>
            <input id="st-owner" value={form.ownerName} maxLength={80} onChange={set('ownerName')} placeholder="e.g. Funmi Adeyemi" autoComplete="name" className={input} />
            <p className="mt-1 text-[11px] text-dash-muted">The person behind the store.</p>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between"><label htmlFor="st-name" className="text-[13px] font-semibold text-dash-ink">Store Name <span className="text-red-500">*</span></label><span className="text-[11px] tabular-nums text-slate-400">{form.businessName.length}/{NAME_MAX}</span></div>
            <input id="st-name" value={form.businessName} maxLength={NAME_MAX} onChange={set('businessName')} placeholder="e.g. Chioma Fabrics" className={input} />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between"><label htmlFor="st-desc" className="text-[13px] font-semibold text-dash-ink">Business Description</label><span className={`text-[11px] tabular-nums ${form.description.length > DESC_SOFT_MAX ? 'text-amber-600' : 'text-slate-400'}`}>{form.description.length}/{DESC_SOFT_MAX}</span></div>
            <textarea id="st-desc" rows={3} value={form.description} onChange={set('description')} placeholder="Your one-stop shop for... Quality products, fast delivery, great prices." className={`${input} resize-y`} />
            {form.description.length > DESC_SOFT_MAX && <p className="mt-1 text-[11px] text-amber-700">Shorter reads better on phones. Around {DESC_SOFT_MAX} characters is the sweet spot.</p>}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="st-cat" className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-dash-ink">Category {!form.businessCategory && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">New</span>}</label>
              <div className="relative">
                <Tag size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forest-600" />
                <select id="st-cat" value={form.businessCategory} onChange={set('businessCategory')} className={`${input} appearance-none pl-10`}>
                  <option value="">Pick what you mostly sell</option>
                  {NIGERIAN_MARKET_CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-dash-muted">Shoppers find you by this on Explore Stores.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-dash-ink">What you sell</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[['products', 'Products'], ['services', 'Services'], ['both', 'Both']].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setForm((p) => ({ ...p, vendorType: id }))} className={`rounded-xl border py-2.5 text-xs font-semibold transition ${form.vendorType === id ? 'border-forest bg-forest-50 text-forest' : 'border-dash-line text-slate-600 hover:border-forest-200'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="st-email" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Business Email</label>
              <input id="st-email" value={store?.email || ''} readOnly className={`${input} cursor-not-allowed bg-gray-50 text-slate-500`} />
              <p className="mt-1 text-[11px] text-dash-muted">Used for important notifications. To change it, message support.</p>
            </div>
            <div>
              <label htmlFor="st-wa" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">WhatsApp Number</label>
              <div className="relative">
                <MessageCircle size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#25D366]" />
                <input id="st-wa" value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="0801 234 5678" inputMode="tel" className={`${input} pl-10`} />
              </div>
              <p className="mt-1 text-[11px] text-dash-muted">Customers can reach you directly on WhatsApp.</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-forest-100 bg-forest-50/50 p-4 sm:flex-row sm:items-center">
        <Lightbulb size={20} className="flex-shrink-0 text-forest-600" />
        <p className="flex-1 text-xs leading-relaxed text-slate-600"><span className="block text-[13px] font-semibold text-dash-ink">Need help with your store setup?</span>Step-by-step guides and a real team are one tap away.</p>
        <button type="button" onClick={() => navigateTo?.('support')} className="inline-flex items-center gap-1.5 rounded-xl border border-forest-200 bg-white px-3.5 py-2 text-xs font-semibold text-forest hover:bg-forest-50">Visit Help Centre <ArrowRight size={13} /></button>
      </div>
    </div>
  )

  const storeSection = (
    <Section icon={Settings2} title="Store Settings" sub="How your store behaves for customers.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-dash-line p-4">
          <div>
            <p className="text-[14px] font-semibold text-dash-ink">Chat on WhatsApp button</p>
            <p className="text-xs text-dash-muted">Visitors see a button that opens a chat with you.</p>
          </div>
          <button type="button" role="switch" aria-checked={form.showWhatsApp} onClick={() => { const v = !form.showWhatsApp; setForm((p) => ({ ...p, showWhatsApp: v })); onWhatsAppToggle?.(v); setToast({ text: v ? 'Chat button is on your store.' : 'Chat button hidden.' }) }}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${form.showWhatsApp ? 'bg-forest-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.showWhatsApp ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="rounded-xl border border-dash-line p-4">
          <p className="text-[14px] font-semibold text-dash-ink">Dropshipping <span className="font-normal text-dash-muted">(optional)</span></p>
          <p className="mt-0.5 text-xs text-dash-muted">Needs Pro or Premium. <a href="/dropshipping" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-600 hover:underline">How it works</a></p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[['supply', 'I want to supply products to dropshippers'], ['dropship', "I want to dropship other suppliers' products"]].map(([key, label]) => {
              const on = form.marketplaceInterest?.[key] === true
              return (
                <label key={key} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${on ? 'border-forest bg-forest-50/60' : 'border-dash-line hover:border-forest-200'}`}>
                  <input type="checkbox" checked={on} onChange={(e) => { const next = { ...form.marketplaceInterest, [key]: e.target.checked }; setForm((p) => ({ ...p, marketplaceInterest: next, vendorType: vendorTypeForInterest(p.vendorType, next) })) }} className="mt-0.5 h-4 w-4 accent-[#034e22]" />
                  <span className={`text-xs font-medium ${on ? 'text-forest' : 'text-slate-600'}`}>{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )

  const linksSection = (
    <Section icon={Globe} title="Domain & Links" sub="Where customers find you.">
      <div className="space-y-4">
        <div>
          <label htmlFor="st-slug" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Store link</label>
          {hasCustomDomain && <p className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800"><Lock size={12} /> Locked while your custom domain is active. Remove it in Custom Domain to edit.</p>}
          <div className={`flex overflow-hidden rounded-xl border transition ${hasCustomDomain ? 'border-dash-line opacity-60' : slugStatus === 'taken' || slugStatus === 'bad' ? 'border-red-300 focus-within:ring-4 focus-within:ring-red-50' : 'border-dash-line focus-within:border-forest-200 focus-within:ring-4 focus-within:ring-forest-50'}`}>
            <span className="hidden flex-shrink-0 items-center border-r border-dash-line bg-gray-50 px-3 text-xs text-slate-500 sm:flex">{window.location.host}/</span>
            <input id="st-slug" value={form.storeName} disabled={hasCustomDomain} onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '') }))} placeholder="your-store" className="min-w-0 flex-1 px-3.5 py-2.5 text-sm outline-none disabled:cursor-not-allowed" />
            <span className="flex items-center pr-3">
              {slugStatus === 'checking' && <Loader2 size={15} className="animate-spin text-slate-400" />}
              {slugStatus === 'free' && <CheckCircle2 size={16} className="text-forest-600" />}
              {(slugStatus === 'taken' || slugStatus === 'bad') && <AlertCircle size={16} className="text-red-500" />}
            </span>
          </div>
          <p className={`mt-1.5 text-[11px] ${slugStatus === 'free' ? 'text-forest-600' : slugStatus === 'taken' || slugStatus === 'bad' ? 'text-red-600' : 'text-dash-muted'}`}>
            {slugStatus === 'same' ? `Your store is at ${window.location.host}/${store?.storeName}`
              : slugStatus === 'bad' ? slugFormatError
                : slugStatus === 'taken' ? (slugState.message || 'Another store already uses this link.')
                  : slugStatus === 'free' ? `${window.location.host}/${slug} is available. Your old link will keep redirecting here.`
                    : 'Checking...'}
          </p>
        </div>
        <LinkRow icon={Globe} title="Custom domain" sub={hasCustomDomain ? store.customDomain : 'Use yourbrand.com instead of a Sellapage link'} onClick={() => navigateTo?.('custom-domain')} badge={isPro ? null : 'Pro'} />
        <LinkRow icon={QrCode} title="Store QR code" sub="Generate, save and print it" onClick={() => navigateTo?.('online-store')} />
      </div>
    </Section>
  )

  const paymentsSection = (
    <Section icon={CreditCard} title="Payments & Checkout" sub="How you get paid and how orders reach customers.">
      <div className="space-y-2.5">
        <LinkRow icon={Wallet} title="Payouts" sub="Your bank for Paystack settlements" onClick={() => navigateTo?.(isPro ? 'payouts' : 'billing')} badge={isPro ? null : 'Pro'} locked={!isPro} />
        <LinkRow icon={Truck} title="Delivery" sub="Pickup address, zones and courier rates" onClick={() => navigateTo?.(isPro ? 'delivery' : 'billing')} badge={isPro ? null : 'Pro'} locked={!isPro} />
        <LinkRow icon={Percent} title="Discounts & promo codes" sub="Run sales customers can apply at checkout" onClick={() => navigateTo?.(isPro ? 'discounts' : 'billing')} badge={isPro ? null : 'Pro'} locked={!isPro} />
        <LinkRow icon={CreditCard} title="Billing & plan" sub={`You're on ${planLabel}. Renew, upgrade, receipts.`} onClick={() => navigateTo?.('billing')} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dash-muted">Customers pay a checkout fee of 1.5% + ₦100 (max ₦2,000) on top of your price, so you receive the full amount.</p>
    </Section>
  )

  const notifState = typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  const notificationsSection = (
    <Section icon={Bell} title="Notifications" sub="How we tell you what is happening in your store.">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-dash-line p-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${notifState === 'granted' ? 'bg-forest-50 text-forest-600' : 'bg-amber-50 text-amber-600'}`}><Smartphone size={18} /></span>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-dash-ink">Order alerts on this device</p>
            <p className="text-xs text-dash-muted">{notifState === 'granted' ? 'On. You hear about new orders and payments right away.' : notifState === 'denied' ? 'Blocked in your browser settings. Allow notifications for this site, then reload.' : notifState === 'unsupported' ? 'This browser cannot show alerts. The Sellapage app can.' : 'Off. Tap the bell at the top of the dashboard to turn them on.'}</p>
          </div>
          {notifState === 'granted' && <CheckCircle2 size={18} className="text-forest-600" />}
        </div>
        <div className="rounded-xl border border-dash-line p-4">
          <p className="text-[14px] font-semibold text-dash-ink">Emails we send you</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {['A morning and evening summary of your store', 'New orders, payments and bookings', 'Sign-ins from a new device', 'Plan reminders before your plan ends'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check size={13} className="text-forest-600" /> {t}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-dash-muted">Sent to {store?.email}. Want fewer emails? <button type="button" onClick={() => navigateTo?.('support')} className="font-semibold text-forest-600 hover:underline">Tell us</button>.</p>
        </div>
      </div>
    </Section>
  )

  const securitySection = (
    <div className="space-y-4">
      <PhoneVerifyCard store={store} />
      <Section icon={KeyRound} title="Password" sub="We email you a secure link to set a new one.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">The link goes to <span className="font-semibold text-dash-ink">{store?.email}</span>.</p>
          <button type="button" onClick={sendReset} disabled={resetSent === 'sending' || resetSent === 'sent'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-dash-line px-4 py-2 text-xs font-semibold text-dash-ink hover:bg-gray-50 disabled:opacity-70">
            {resetSent === 'sending' ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : resetSent === 'sent' ? <><CheckCircle2 size={13} className="text-forest-600" /> Link sent, check your inbox</> : <><Mail size={13} /> Send reset link</>}
          </button>
        </div>
        {resetSent === 'error' && <p className="mt-2 text-[11px] text-red-600">That did not send. Try again in a moment.</p>}
      </Section>
      <SessionsPanel />
    </div>
  )

  const teamSection = (
    <Section icon={Users} title="Team" sub="Give staff their own login with only the tabs they need.">
      {isPremium ? (
        <LinkRow icon={Users} title="Manage your team" sub="Invite staff, set roles, remove access" onClick={() => navigateTo?.('team')} />
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-forest-50 to-white p-5 ring-1 ring-forest-100">
          <Crown size={20} className="fill-amber-400 text-amber-500" />
          <p className="mt-2 text-[15px] font-semibold text-dash-ink">Run your store together</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">On Premium, your staff get their own logins and only the tabs you choose. No more sharing your password.</p>
          <button type="button" onClick={() => navigateTo?.('billing')} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white">See Premium <ArrowRight size={13} /></button>
        </div>
      )}
    </Section>
  )

  const integrationsSection = (
    <Section icon={Puzzle} title="Integrations" sub="Connect the tools that bring customers in.">
      <div className="space-y-2.5">
        <LinkRow icon={Target} title="Google Ads" sub="Run and track ads from your dashboard" onClick={() => navigateTo?.(isPremium ? 'google-ads' : 'billing')} badge={isPremium ? null : 'Premium'} locked={!isPremium} />
        <LinkRow icon={Activity} title="Meta Pixel" sub="Measure Facebook and Instagram ads" onClick={() => navigateTo?.(isPremium ? 'meta-pixel' : 'billing')} badge={isPremium ? null : 'Premium'} locked={!isPremium} />
        <LinkRow icon={Music2} title="TikTok" sub="Pixel and account connection" onClick={() => navigateTo?.(isPremium ? 'tiktok-pixel' : 'billing')} badge={isPremium ? null : 'Premium'} locked={!isPremium} />
        <LinkRow icon={Smartphone} title="Mobile app" sub="Your store in your pocket" onClick={() => navigateTo?.('mobile-app')} />
      </div>
    </Section>
  )

  const advancedSection = (
    <Section icon={SlidersHorizontal} title="Advanced" sub="Careful here.">
      <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
        <p className="text-[14px] font-semibold text-red-700">Delete your store</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">Permanently deletes your business page, every listing and all customer enquiries. This cannot be undone.</p>
        <button type="button" onClick={() => { onClearDeleteError?.(); setDeleteStep(1); setDeletePassword(''); setShowDelete(true) }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
          <Trash2 size={14} /> Delete Business Page
        </button>
        {deleteError && !showDelete && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
      </div>
    </Section>
  )

  const body = { profile, store: storeSection, links: linksSection, payments: paymentsSection, notifications: notificationsSection, security: securitySection, team: teamSection, integrations: integrationsSection, advanced: advancedSection }[section]
  const current = SECTIONS.find((s) => s.id === section)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden="true" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_300px]">
        {/* Menu */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="px-1">
            <h1 className="font-body text-[28px] font-bold tracking-tight text-dash-ink">Settings</h1>
            <p className="text-xs text-dash-muted">Manage your business, store and account preferences.</p>
          </div>
          <nav aria-label="Settings sections" className={`${card} -mx-1 flex gap-1 overflow-x-auto p-1.5 no-scrollbar lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible`}>
            {visibleSections.map((s) => {
              const on = section === s.id
              return (
                <button key={s.id} type="button" onClick={() => setSection(s.id)} aria-current={on ? 'page' : undefined}
                  className={`flex flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition lg:w-full ${on ? 'bg-forest-50' : 'hover:bg-gray-50'}`}>
                  <s.icon size={18} className={on ? 'text-forest' : 'text-slate-500'} />
                  <span className="min-w-0 flex-1">
                    <span className={`block whitespace-nowrap text-[13px] ${on ? 'font-semibold text-forest' : 'font-medium text-dash-ink'}`}>{s.label}</span>
                    <span className="hidden truncate text-[11px] text-dash-muted lg:block">{s.sub}</span>
                  </span>
                  <ChevronRight size={14} className={`hidden lg:block ${on ? 'text-forest' : 'text-slate-300'}`} />
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 space-y-4">
          <section className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}>
            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-dash-ink text-lg font-bold text-white">
                {store?.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={22} />}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[18px] font-semibold text-dash-ink">
                  <span className="truncate">{store?.businessName || 'Your store'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${live ? 'bg-forest-50 text-forest-600' : 'bg-amber-50 text-amber-700'}`}>{live ? 'Store Active' : 'Plan expired'}</span>
                </p>
                <p className="text-xs text-dash-muted">{current?.sub}</p>
              </div>
            </div>
            {storeUrl && <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-forest-200 px-4 py-2 text-xs font-semibold text-forest hover:bg-forest-50">View Store <ExternalLink size={13} /></a>}
          </section>

          {restored && dirty && (
            <p className="flex items-center gap-2 rounded-xl bg-forest-50/70 px-4 py-2.5 text-xs text-forest">
              <Sparkles size={14} /> We kept your unsaved changes from earlier. Save them, or discard to start fresh.
            </p>
          )}

          <div key={section} className="animate-in fade-in slide-in-from-bottom-1 duration-200">{body}</div>
        </div>

        {/* Rail */}
        <aside className="hidden space-y-4 2xl:block">
          <section className={`${card} p-5`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><ShieldCheck size={18} /></span>
              <div>
                <p className="text-[14px] font-semibold text-dash-ink">Store Status</p>
                <p className="text-xs text-dash-muted">{live ? 'Your store is live and visible to customers.' : 'Your plan has ended; your store is on the free plan.'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${live ? 'bg-forest text-white' : 'bg-amber-100 text-amber-800'}`}>{live ? 'Active' : 'Expired'}</span>
              {storeUrl && <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-dash-line px-3 py-1 text-xs font-medium text-forest hover:bg-forest-50">Preview Store <ArrowRight size={12} /></a>}
            </div>
          </section>
          <section className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><Link2 size={16} className="text-forest-600" /> Quick Links</p>
            <div className="mt-3 space-y-1">
              {[
                { icon: Link2, t: 'Your Storefront', s: storeUrl.replace(/^https?:\/\//, ''), go: () => window.open(storeUrl, '_blank', 'noopener') },
                { icon: Copy, t: 'Share Store Link', s: 'Copy it for your customers', go: copyLink },
                { icon: QrCode, t: 'Store QR Code', s: 'Generate and download', go: () => navigateTo?.('online-store') },
              ].map((x) => (
                <button key={x.t} type="button" onClick={x.go} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-gray-50">
                  <x.icon size={16} className="text-slate-500" />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] text-dash-ink">{x.t}</span><span className="block truncate text-[11px] text-dash-muted">{x.s}</span></span>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              ))}
            </div>
          </section>
          <section className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><BarChart3 size={16} className="text-forest-600" /> Store Analytics</p>
            <p className="mt-1 text-xs text-dash-muted">See how your store is performing.</p>
            <button type="button" onClick={() => navigateTo?.(isGrowthOrPro ? 'analytics' : 'billing')} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dash-line px-3.5 py-1.5 text-xs font-medium text-forest hover:bg-forest-50">
              {isGrowthOrPro ? <>View Analytics <ArrowRight size={12} /></> : <><Lock size={12} /> On Growth and up</>}
            </button>
          </section>
          <section className={`${card} p-5`}>
            <p className="text-[14px] font-semibold text-dash-ink">Need help?</p>
            <p className="mt-0.5 text-xs text-dash-muted">Our support team is always here to help you.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-white"><MessageCircle size={13} /> WhatsApp</a>
              <button type="button" onClick={() => navigateTo?.('support')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dash-line px-3 py-2 text-xs font-semibold text-dash-ink hover:bg-gray-50"><Mail size={13} /> Message</button>
            </div>
          </section>
          {!isPremium && (
            <section className="rounded-2xl bg-gradient-to-br from-forest-50 to-[#dcf3e5] p-5">
              <Crown size={18} className="fill-amber-400 text-amber-500" />
              <p className="mt-2 text-[15px] font-bold text-dash-ink">Grow faster with {isPro ? 'Premium' : 'Pro'}</p>
              <p className="mt-1 text-xs text-slate-600">Advanced tools, higher limits and dedicated support.</p>
              <button type="button" onClick={() => navigateTo?.('billing')} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white">Upgrade Plan <ArrowRight size={12} /></button>
            </section>
          )}
        </aside>
      </div>

      {/* Save bar */}
      {(dirty || saveLoading) && ['profile', 'store', 'links'].includes(section) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-dash-line bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur animate-in slide-in-from-bottom-2 duration-200 md:left-64">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-slate-600">
              {saveError ? <><AlertCircle size={14} className="text-red-500" /> <span className="text-red-600">{saveError}</span></> : <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> You have unsaved changes</>}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={discard} disabled={saveLoading} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dash-line px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-gray-50 sm:flex-none"><RotateCcw size={13} /> Discard</button>
              <button type="button" onClick={submit} disabled={saveLoading} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-forest/20 hover:bg-forest-700 disabled:opacity-70 sm:flex-none">
                {saveLoading ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className={`fixed bottom-24 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${toast.bad ? 'bg-red-600' : 'bg-dash-ink'}`}>
          {toast.bad ? <AlertCircle size={17} /> : <CheckCircle2 size={17} className="text-green-400" />}<span className="flex-1">{toast.text}</span>
        </div>
      )}

      {/* Delete */}
      {showDelete && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="st-del-title">
          <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">{deleteStep === 1 ? <Trash2 size={19} className="text-red-600" /> : <Shield size={19} className="text-red-600" />}</span>
              <button type="button" onClick={closeDelete} className="rounded-full p-1.5 text-slate-400 hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
            </div>
            {deleteStep === 1 ? (
              <div>
                <p id="st-del-title" className="text-lg font-bold text-dash-ink">We&apos;d hate to see you go, boss</p>
                <p className="mt-1 text-sm leading-relaxed text-dash-muted">Deleting your store removes everything below for good. If something isn&apos;t working, our team would love the chance to fix it first.</p>
                <ul className="mt-3 space-y-1.5">
                  {['All listings and images', 'All customer leads', 'Your page settings', 'Your business link'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-red-600"><X size={12} />{item}</li>
                  ))}
                </ul>
                <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:underline"><MessageCircle size={13} /> Talk to us before you go</a>
              </div>
            ) : (
              <div className="space-y-3">
                <p id="st-del-title" className="text-lg font-bold text-dash-ink">Are you absolutely sure?</p>
                <p className="text-sm text-dash-muted">You&apos;re about to delete <strong>{store?.businessName}</strong> and everything in it. There is no going back.</p>
                <div>
                  <label htmlFor="st-del-pw" className="mb-1.5 block text-sm font-semibold text-dash-ink">Enter your password to confirm</label>
                  <input id="st-del-pw" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" placeholder="Your account password" className="w-full rounded-xl border border-dash-line px-4 py-2.5 text-sm outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                </div>
                {deleteError && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={13} />{deleteError}</p>}
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={closeDelete} className="flex-1 rounded-xl border border-dash-line py-3 text-sm font-semibold text-dash-ink hover:bg-gray-50">Keep my store</button>
              <button type="button" onClick={() => { if (deleteStep === 1) setDeleteStep(2); else if (deletePassword.trim()) onDeleteAccount(deletePassword) }} disabled={deleteLoading || (deleteStep === 2 && !deletePassword.trim())} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70">
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}{deleteStep === 1 ? 'Continue' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
