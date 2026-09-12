// src/components/dashboard/StoreDesignTab.jsx
//
// The Store Design builder. Add sections, reorder them, restyle each one, set
// how product and service cards look, and see the result before it goes live.
//
// The preview renders the SAME DesignedStorefront component the live storefront
// uses, with the vendor's real products, services, categories and reviews. It is
// not a mock-up. A separate preview renderer is how a vendor ends up publishing
// something they never actually saw.
//
// THE EDITOR FOLLOWS THE VENDOR.
// A products vendor is never offered a service list; a services vendor is never
// offered a product row or a product card panel. A "both" vendor gets both.
// Offering a section a vendor has no data for is how a builder produces an empty
// page and gets blamed for it.
//
// REORDERING WORKS ON A PHONE
// Up/down buttons are the primary control, not a fallback. HTML5 drag and drop
// does not fire on touch, and most Nigerian vendors are on a phone, so a
// drag-only builder would be unusable for the people it is built for. Drag is
// added on top for pointer devices.
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Check, AlertCircle, Lock, Plus, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, ChevronRight, Settings2, Palette, GripVertical, X,
  Smartphone, Tablet, Monitor, Package, CalendarClock, Type, AlertTriangle,
  Undo2, Redo2, Sparkles, BellRing, CalendarRange, RotateCcw, FileText, ExternalLink, Search,
  ShieldCheck,
} from 'lucide-react'
import { auth } from '../../firebase/auth'
import { getProducts } from '../../firebase/products'
import { getServices } from '../../firebase/services'
import { fetchStoreReviews } from '../../firebase/reviews'
import {
  SECTION_TYPES, FONT_OPTIONS, THEME_FIELDS, PRODUCT_CARD_FIELDS, SERVICE_CARD_FIELDS,
  POPUP_FIELDS, PRESETS, applyPreset, CUSTOM_PAGES, TRACKING_FIELDS, TRACKING_STATUSES,
  sectionsForVendor, vendorHasProducts, vendorHasServices, makeSection, defaultDesign,
  sectionEmptyReason, popupIssue,
  BADGE_FIELDS, VERIFIED_LABEL, VERIFIED_LINE,
} from '../../utils/storeDesign'
import DesignedStorefront from '../storefront/DesignedStorefront'

const inputCls =
  'mt-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none focus:border-green-400'

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-gray-600">{label}</span>
      <span className="flex flex-shrink-0 items-center gap-2">
        <span className="font-mono text-[10px] text-gray-400">{value}</span>
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
        />
      </span>
    </label>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1 text-[11px] font-semibold text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

/**
 * Renders one declared field list into controls. Used for the theme, both card
 * panels and every section, so a new setting in storeDesign.js gets an editor
 * with no new UI code here.
 */
function FieldList({ fields, values, onSet, categories = [] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const v = values?.[f.key]

        if (f.type === 'color') return <ColorField key={f.key} label={f.label} value={v} onChange={(x) => onSet(f.key, x)} />
        if (f.type === 'toggle') return <Toggle key={f.key} label={f.label} value={v} onChange={(x) => onSet(f.key, x)} />

        if (f.type === 'font' || f.type === 'select') {
          const opts = f.type === 'font'
            ? FONT_OPTIONS.map((o) => [o.id, o.label])
            // Without optionLabels this dropdown showed the vendor the raw
            // stored value, so "How often" read "everyVisit".
            : f.options.map((o) => [o, f.optionLabels?.[o] || o])
          return (
            <label key={f.key} className="block">
              <span className="text-[11px] font-semibold text-gray-600">{f.label}</span>
              <select value={v} onChange={(e) => onSet(f.key, e.target.value)} className={inputCls}>
                {opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
              </select>
              {f.help ? <span className="mt-1 block text-[10px] leading-snug text-gray-400">{f.help}</span> : null}
            </label>
          )
        }

        // A category picker built from the vendor's REAL categories. Typing a
        // category by hand is how a row silently renders empty.
        if (f.type === 'category') {
          return (
            <label key={f.key} className="block">
              <span className="text-[11px] font-semibold text-gray-600">{f.label}</span>
              <select value={v || ''} onChange={(e) => onSet(f.key, e.target.value)} className={inputCls}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {!categories.length && (
                <span className="mt-1 block text-[10px] text-gray-400">
                  You have no categories yet. Add one to a product or service first.
                </span>
              )}
            </label>
          )
        }

        const Tag = f.type === 'textarea' ? 'textarea' : 'input'
        return (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold text-gray-600">{f.label}</span>
            <Tag
              value={v || ''}
              maxLength={f.max}
              rows={f.type === 'textarea' ? 3 : undefined}
              inputMode={f.type === 'url' ? 'url' : undefined}
              placeholder={f.type === 'url' ? 'https://' : undefined}
              onChange={(e) => onSet(f.key, e.target.value)}
              className={inputCls}
            />
            {f.help ? <span className="mt-1 block text-[10px] leading-snug text-gray-400">{f.help}</span> : null}
          </label>
        )
      })}
    </div>
  )
}

/** A collapsible settings card. Keeps a long editor navigable on a phone. */
function Panel({ icon: Icon, title, hint, open, onToggle, children }) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 p-4 text-left"
      >
        <Icon size={15} className="flex-shrink-0 text-gray-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900">{title}</span>
          {hint ? <span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500">{hint}</span> : null}
        </span>
        <ChevronRight size={15} className={`flex-shrink-0 text-gray-300 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open ? <div className="border-t border-gray-100 p-4">{children}</div> : null}
    </div>
  )
}

const DEVICES = [
  { id: 'mobile', icon: Smartphone, width: 390, label: 'Phone' },
  { id: 'tablet', icon: Tablet, width: 768, label: 'Tablet' },
  { id: 'desktop', icon: Monitor, width: 0, label: 'Desktop' },
]

export default function StoreDesignTab({ store, storeUrl }) {
  const vendorType = String(store?.vendorType || 'products').toLowerCase()
  const hasProducts = vendorHasProducts(vendorType)
  const hasServices = vendorHasServices(vendorType)

  const [design, setDesign] = useState(() => defaultDesign(vendorType))
  const [meta, setMeta] = useState({ eligible: false, live: false, plan: 'starter', hasSaved: false })
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [openId, setOpenId] = useState(null)
  const [panel, setPanel] = useState('sections')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dirty, setDirty] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [device, setDevice] = useState('mobile')
  // Which of the two real storefronts the preview is simulating. Only ever
  // shown to a vendor who has both, because only they have two pages.
  // Undo/redo. Capped so a long session cannot grow without bound.
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])
  const [draft, setDraft] = useState(null)
  // Which layout the section list below is editing: the shop front, or one of
  // the vendor's extra pages.
  const [editing, setEditing] = useState(vendorHasProducts(vendorType) ? 'home' : 'service')

  const draftKey = `sp_design_draft_${store?.id || 'store'}`

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
        const [res, items, svcs] = await Promise.all([
          authed('/api/store-design?action=get').then((r) => r.json()).catch(() => null),
          hasProducts ? getProducts(store.id, 12).catch(() => []) : Promise.resolve([]),
          hasServices ? getServices(store.id, 12).catch(() => []) : Promise.resolve([]),
        ])
        if (cancelled) return
        if (res?.success) {
          setDesign(res.design || defaultDesign(vendorType))
          setMeta({ eligible: res.eligible, live: res.live, plan: res.plan, hasSaved: res.hasSaved })
        }
        setProducts(items || [])
        setServices(svcs || [])

        // The preview renders the SAME component as the live storefront, so it
        // needs the same reviews or the vendor styles a section they cannot
        // see. Best effort: an empty result just means the warning shows.
        fetchStoreReviews(store.id, [
          ...(items || []),
          ...(svcs || []).map((sv) => ({ ...sv, kind: 'service' })),
        ])
          .then((rows) => {
            if (!cancelled) setReviews(rows)
          })
          .catch(() => {})

        // A draft is offered, never applied silently: overwriting what a vendor
        // last published without asking is worse than losing an edit.
        try {
          const saved = localStorage.getItem(`sp_design_draft_${store.id}`)
          if (saved) setDraft(JSON.parse(saved))
        } catch {
          // Unreadable or unavailable storage just means no draft to offer.
        }
      } catch {
        if (!cancelled) setError('Could not load your design.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [store?.id, authed, vendorType, hasProducts, hasServices])

  // Autosave to this browser. Not a substitute for saving to the server, but it
  // means a closed tab or a dead battery does not cost an afternoon's work.
  useEffect(() => {
    if (!dirty) return
    const id = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(design))
      } catch {
        // Storage full or blocked: the beforeunload guard below still warns.
      }
    }, 800)
    return () => clearTimeout(id)
  }, [design, dirty, draftKey])

  // Leaving with unsaved work is the single most common way a builder loses a
  // vendor's afternoon.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (next) => {
    setPast((p) => [...p, design].slice(-40))
    setFuture([])
    setDesign(next)
    setDirty(true)
  }

  const undo = () => {
    if (!past.length) return
    setFuture((f) => [design, ...f].slice(0, 40))
    setDesign(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
    setDirty(true)
  }

  const redo = () => {
    if (!future.length) return
    setPast((p) => [...p, design].slice(-40))
    setDesign(future[0])
    setFuture((f) => f.slice(1))
    setDirty(true)
  }
  const setTheme = (k, v) => update({ ...design, theme: { ...design.theme, [k]: v } })
  const setCard = (which) => (k, v) => update({ ...design, [which]: { ...design[which], [k]: v } })

  const save = async (override) => {
    const payload = { ...design, ...(override || {}) }
    setSaving(true); setError(''); setSuccess('')
    try {
      const r = await authed('/api/store-design?action=save', {
        method: 'POST',
        body: JSON.stringify({ design: payload }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save.'); return }
      setDesign(d.design)
      setMeta((m) => ({ ...m, live: d.live, hasSaved: true }))
      setDirty(false)
      setDraft(null)
      try {
        localStorage.removeItem(draftKey)
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
      setSuccess(d.live ? 'Saved and live on your store page.' : 'Saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const move = (index, dir) => {
    const next = [...currentSections]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    setSections(next)
  }

  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return
    const next = [...currentSections]
    const from = next.findIndex((s) => s.id === dragId)
    const to = next.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSections(next)
    setDragId(null)
  }

  // Three kinds of layout live in one editor: the shop front, the service page
  // (a different business to a customer, so a different section list), and the
  // vendor's extra pages.
  const currentSections =
    editing === 'home'
      ? design.sections
      : editing === 'service'
      ? design.serviceSections || []
      : design.pages?.[editing]?.sections || []

  const setSections = (next) =>
    update(
      editing === 'home'
        ? { ...design, sections: next }
        : editing === 'service'
        ? { ...design, serviceSections: next }
        : {
            ...design,
            pages: { ...design.pages, [editing]: { ...design.pages[editing], sections: next } },
          },
    )

  const patchSection = (id, patch) =>
    setSections(currentSections.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  // Categories come from whichever catalogue the vendor actually has.
  const categories = useMemo(
    () => [...new Set([...products, ...services].map((p) => p.category).filter(Boolean))],
    [products, services]
  )

  // Every condition that makes a section render nothing, answered for THIS
  // store's real data. A vendor adding a section and seeing an empty preview
  // with no explanation is what made this necessary.
  const emptyReason = useCallback(
    (section) =>
      sectionEmptyReason(section, {
        products: products.length,
        services: services.length,
        categories: categories.length,
        reviews: reviews.length,
        tiktokVideos: Array.isArray(store?.tiktokVideos) ? store.tiktokVideos.length : 0,
      }),
    [products.length, services.length, categories.length, reviews.length, store?.tiktokVideos],
  )

  // A popup button whose label promises something its action does not do.
  const popupWarning = useMemo(
    () =>
      popupIssue(design?.popup, {
        hasWhatsapp: !!store?.whatsappNumber,
        hasEnquirySection: currentSections.some(
          (sec) => sec?.type === 'enquiry' && sec?.visible !== false,
        ),
      }),
    [design?.popup, store?.whatsappNumber, currentSections],
  )

  const stats = useMemo(() => {
    const out = []
    if (hasProducts && products.length) out.push({ value: `${products.length}+`, label: 'Products' })
    if (hasServices && services.length) out.push({ value: `${services.length}+`, label: 'Services' })
    if (categories.length) out.push({ value: `${categories.length}`, label: 'Categories' })
    return out
  }, [hasProducts, hasServices, products.length, services.length, categories.length])

  // A service page is never offered a product row, and the shop front is never
  // offered a service list, whatever the vendor sells.
  const allowedTypes = useMemo(() => {
    if (editing === 'home') return sectionsForVendor(hasProducts ? 'products' : vendorType)
    if (editing === 'service') return sectionsForVendor('services')
    return sectionsForVendor(vendorType)
  }, [vendorType, editing, hasProducts])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100/70" />)}
      </div>
    )
  }

  const locked = !meta.eligible
  const deviceWidth = DEVICES.find((d) => d.id === device)?.width || 0

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-gray-400" />
          <h1 className="font-display text-lg font-extrabold text-gray-900">Store Design</h1>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Build your store page section by section. Nothing changes for customers until you switch it on.
        </p>
      </header>

      {locked && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Lock size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">
              {meta.hasSaved ? 'Your design is paused, not deleted' : 'Store Design is a Premium feature'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              {meta.hasSaved
                ? 'Your store is showing the standard design for now. Everything you built is saved exactly as you left it and comes straight back when you upgrade.'
                : 'Upgrade to Premium to design your own store page and remove Sellapage branding from it.'}
            </p>
          </div>
        </div>
      )}

      {draft && !dirty && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">
          <RotateCcw size={16} className="flex-shrink-0 text-blue-600" />
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-blue-900">
            <span className="font-bold">You have unsaved changes from last time.</span>{' '}
            They are stored in this browser only.
          </p>
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={() => { update(draft); setDraft(null) }}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                try { localStorage.removeItem(draftKey) } catch { /* already gone */ }
              }}
              className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Master switch */}
      <div className={`mb-4 rounded-2xl border p-4 ${meta.live ? 'border-green-200 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Use my design</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {meta.live
                ? 'Your store page is showing this design instead of your theme.'
                : 'While this is off, your store keeps its current theme and nothing your customers see changes.'}
            </p>
          </div>
          <button
            type="button"
            disabled={locked || saving}
            onClick={() => { const next = !design.enabled; update({ ...design, enabled: next }); save({ enabled: next }) }}
            aria-label="Toggle store design"
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${design.enabled ? 'bg-green-600' : 'bg-gray-200'}`}
          >
            <span className={`pointer-events-none mt-0.5 inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${design.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <fieldset disabled={locked} className={locked ? 'opacity-60' : ''}>
        <Panel
          icon={Sparkles}
          title="Ready-made looks"
          hint="Pick a style to restyle your whole store at once. Your words are kept."
          open={panel === 'presets'}
          onToggle={() => setPanel(panel === 'presets' ? '' : 'presets')}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => update(applyPreset(design, preset.id))}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50/50"
              >
                <span className="flex flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  {preset.swatch.map((c) => (
                    <span key={c} className="block h-8 w-3.5" style={{ background: c }} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-gray-900">{preset.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-500">{preset.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
            A look changes colours, fonts and card styling only. Your headlines, answers and
            section order are left exactly as you wrote them, and you can undo it.
          </p>
        </Panel>

        <Panel
          icon={Type}
          title="Colours and type"
          hint="Fonts, colours, corners and width. These apply to the whole page."
          open={panel === 'theme'}
          onToggle={() => setPanel(panel === 'theme' ? '' : 'theme')}
        >
          <FieldList fields={THEME_FIELDS} values={design.theme} onSet={setTheme} />
        </Panel>

        {hasProducts && (
          <Panel
            icon={Package}
            title="Product cards"
            hint="How every product on your page looks: image shape, price, button."
            open={panel === 'product'}
            onToggle={() => setPanel(panel === 'product' ? '' : 'product')}
          >
            <FieldList fields={PRODUCT_CARD_FIELDS} values={design.productCard} onSet={setCard('productCard')} />
          </Panel>
        )}

        {hasServices && (
          <Panel
            icon={CalendarClock}
            title="Service booking cards"
            hint="How every service on your page looks: duration, price, booking button."
            open={panel === 'service'}
            onToggle={() => setPanel(panel === 'service' ? '' : 'service')}
          >
            <FieldList fields={SERVICE_CARD_FIELDS} values={design.serviceCard} onSet={setCard('serviceCard')} />
          </Panel>
        )}

        <Panel
          icon={ShieldCheck}
          title="CAC verified badge"
          hint={
            store?.cacVerified
              ? 'Your business is verified. Choose where the badge sits on your page.'
              : 'Shown once your business registration is verified.'
          }
          open={panel === 'badge'}
          onToggle={() => setPanel(panel === 'badge' ? '' : 'badge')}
        >
          {store?.cacVerified ? (
            <>
              <div className="mb-4 rounded-xl border border-green-100 bg-green-50/60 p-3">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="flex-shrink-0 text-green-600" />
                  <span className="text-[11px] font-bold text-green-700">{VERIFIED_LABEL}</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-green-800/70">
                  In the footer this reads &ldquo;{VERIFIED_LINE}&rdquo;. The wording is fixed
                  because it is our statement about your business, not marketing copy. Where it
                  goes, and what colour it is, is yours.
                </p>
              </div>

              <FieldList
                fields={BADGE_FIELDS}
                values={design.badge}
                onSet={(k, v) => update({ ...design, badge: { ...design.badge, [k]: v } })}
              />

              <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
                Badge style applies to the header and hero. In the footer it always takes your
                footer text colour, so it stays readable whatever background you pick.
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
              <p className="text-xs font-bold text-gray-800">Not verified yet</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                Verify your CAC registration in the CAC Verification tab. Once it goes through,
                the badge appears here and you can place it on your page. There is nothing to
                switch on from this screen.
              </p>
            </div>
          )}
        </Panel>

        <Panel
          icon={BellRing}
          title="Welcome popup"
          hint="One popup, shown once per visitor. Good for a first-order discount."
          open={panel === 'popup'}
          onToggle={() => setPanel(panel === 'popup' ? '' : 'popup')}
        >
          {popupWarning ? (
            <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-100 bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-700">
              <AlertTriangle size={12} className="mt-px flex-shrink-0" />
              <span>{popupWarning}</span>
            </p>
          ) : null}
          <FieldList
            fields={POPUP_FIELDS}
            values={design.popup}
            onSet={(k, v) => update({ ...design, popup: { ...design.popup, [k]: v } })}
          />
        </Panel>

        <Panel
          icon={Search}
          title="Order tracking page"
          hint="Customers paste their order ID and see where it is, in your words."
          open={panel === 'tracking'}
          onToggle={() => setPanel(panel === 'tracking' ? '' : 'tracking')}
        >
          <FieldList
            fields={TRACKING_FIELDS}
            values={design.tracking}
            onSet={(k, v) => update({ ...design, tracking: { ...design.tracking, [k]: v } })}
          />

          {design.tracking?.enabled && storeUrl ? (
            <a
              href={`${storeUrl}/track`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
            >
              <ExternalLink size={10} /> {`${storeUrl}/track`}
            </a>
          ) : null}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-900">What each status says</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
              You choose the words. Which status an order is in comes from your Orders tab and
              cannot be changed from here.
            </p>
            <div className="mt-3 space-y-3">
              {TRACKING_STATUSES.filter((st) =>
                st.kind === 'both' ||
                (st.kind === 'order' && hasProducts) ||
                (st.kind === 'booking' && hasServices),
              ).map((st) => (
                <label key={st.key} className="block">
                  <span className="text-[11px] font-semibold text-gray-600">{st.label}</span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={design.tracking?.messages?.[st.key] ?? st.default}
                    onChange={(e) =>
                      update({
                        ...design,
                        tracking: {
                          ...design.tracking,
                          messages: { ...design.tracking?.messages, [st.key]: e.target.value },
                        },
                      })
                    }
                    className={inputCls}
                  />
                </label>
              ))}
            </div>
          </div>
        </Panel>

        {/* Sections */}
        <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-4">
          {/* Which page is being built. The shop front always exists; the rest
              are extra pages the vendor switches on one at a time. */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              ...(hasProducts ? [{ key: 'home', label: 'Shop front' }] : []),
              ...(hasServices ? [{ key: 'service', label: 'Service page' }] : []),
              ...CUSTOM_PAGES,
            ].map((pg) => (
              <button
                key={pg.key}
                type="button"
                onClick={() => { setEditing(pg.key); setOpenId(null); setAdding(false) }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  editing === pg.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {pg.label}
              </button>
            ))}
          </div>

          {editing !== 'home' && editing !== 'service' && (
            <div className="mb-3 rounded-xl bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900">
                    Publish this page
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
                    {CUSTOM_PAGES.find((x) => x.key === editing)?.hint}
                  </p>
                  {design.pages?.[editing]?.enabled && storeUrl ? (
                    <a
                      href={`${storeUrl}/${CUSTOM_PAGES.find((x) => x.key === editing)?.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                    >
                      <ExternalLink size={10} />
                      {`${storeUrl}/${CUSTOM_PAGES.find((x) => x.key === editing)?.path}`}
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      ...design,
                      pages: {
                        ...design.pages,
                        [editing]: {
                          ...design.pages[editing],
                          enabled: !design.pages[editing]?.enabled,
                        },
                      },
                    })
                  }
                  aria-label="Publish this page"
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    design.pages?.[editing]?.enabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${design.pages?.[editing]?.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {!design.enabled && (
                <p className="mt-2 text-[10px] font-semibold text-amber-700">
                  Extra pages only go live while "Use my design" is on.
                </p>
              )}
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">Sections</p>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              {adding ? <X size={12} /> : <Plus size={12} />} {adding ? 'Close' : 'Add section'}
            </button>
          </div>

          {adding && (
            <div className="mb-3 grid grid-cols-1 gap-1.5 rounded-xl bg-gray-50 p-2 sm:grid-cols-2">
              {allowedTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSections([...currentSections, makeSection(type)])
                    setAdding(false)
                  }}
                  className="rounded-lg bg-white p-2.5 text-left transition-colors hover:bg-green-50"
                >
                  <p className="text-xs font-bold text-gray-900">{SECTION_TYPES[type].label}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{SECTION_TYPES[type].hint}</p>
                </button>
              ))}
            </div>
          )}

          {!currentSections.length && (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-xs font-bold text-gray-700">This page has no sections yet</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                Add one above to start building it.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {currentSections.map((section, i) => (
              <div
                key={section.id}
                draggable={!locked}
                onDragStart={() => setDragId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(section.id)}
                className={`rounded-xl border bg-white ${dragId === section.id ? 'border-green-400 opacity-60' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-1 p-2.5">
                  <GripVertical size={14} className="hidden flex-shrink-0 cursor-grab text-gray-300 sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${section.visible === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {SECTION_TYPES[section.type]?.label || section.type}
                    </p>
                    {emptyReason(section) ? (
                      <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-amber-600">
                        <AlertTriangle size={11} className="mt-px flex-shrink-0" />
                        <span>{emptyReason(section)}</span>
                      </p>
                    ) : null}
                    {section.hideOnMobile || section.scheduleStart || section.scheduleEnd ? (
                      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                        {[
                          section.hideOnMobile ? 'Desktop only' : '',
                          section.scheduleStart || section.scheduleEnd ? 'Scheduled' : '',
                        ].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  {/* Buttons, not drag, are the primary reorder control: HTML5
                      drag does not fire on touch and most vendors are on a phone. */}
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-400 disabled:opacity-30" aria-label="Move up">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === currentSections.length - 1} className="rounded p-1 text-gray-400 disabled:opacity-30" aria-label="Move down">
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => patchSection(section.id, { visible: section.visible === false })}
                    className="rounded p-1 text-gray-400"
                    aria-label="Show or hide"
                  >
                    {section.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === section.id ? null : section.id)}
                    className={`rounded p-1 ${openId === section.id ? 'text-green-600' : 'text-gray-400'}`}
                    aria-label="Edit settings"
                  >
                    <Settings2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSections(currentSections.filter((x) => x.id !== section.id))}
                    className="rounded p-1 text-gray-300 hover:text-red-500"
                    aria-label="Remove section"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {openId === section.id && (
                  <div className="space-y-3 border-t border-gray-100 p-3">
                    <FieldList
                      fields={SECTION_TYPES[section.type]?.fields || []}
                      values={section.settings}
                      categories={categories}
                      onSet={(k, v) => patchSection(section.id, { settings: { ...section.settings, [k]: v } })}
                    />
                    <div className="space-y-3 border-t border-gray-100 pt-3">
                      <Toggle
                        label="Hide this section on phones"
                        value={!!section.hideOnMobile}
                        onChange={(v) => patchSection(section.id, { hideOnMobile: v })}
                      />
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                        <CalendarRange size={12} className="text-gray-400" /> Show only between these dates
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-semibold text-gray-500">From</span>
                          <input
                            type="date"
                            value={section.scheduleStart || ''}
                            onChange={(e) => patchSection(section.id, { scheduleStart: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-semibold text-gray-500">Until</span>
                          <input
                            type="date"
                            value={section.scheduleEnd || ''}
                            onChange={(e) => patchSection(section.id, { scheduleEnd: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-400">
                        Leave both empty to always show it. Dates run to the end of the day.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Preview: the real renderer, the real catalogue. */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Preview</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              The same code your store page uses, with your real items.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-shrink-0 gap-1 rounded-xl bg-gray-100 p-1">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                aria-label={d.label}
                className={`rounded-lg px-2.5 py-1.5 transition-colors ${device === d.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
              >
                <d.icon size={14} />
              </button>
            ))}
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <div className="max-h-[540px] overflow-y-auto">
            {/* A real width, not a CSS transform: the storefront's own
                breakpoints then decide the layout, exactly as on a phone. */}
            <div
              className="mx-auto bg-white transition-all"
              style={deviceWidth ? { width: deviceWidth, maxWidth: '100%' } : undefined}
            >
              <DesignedStorefront
                design={{ ...design, sections: currentSections }}
                store={store}
                products={editing === 'service' ? [] : products}
                services={editing === 'service' ? services : []}
                catalogueKind={editing === 'service' ? 'services' : 'products'}
                categories={categories}
                reviews={reviews}
                stats={stats}
                helpLinks={[]}
                whatsappUrl={store?.whatsappNumber ? `https://wa.me/${String(store.whatsappNumber).replace(/\D/g, '')}` : ''}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
          <Check size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
          <p className="text-xs font-semibold text-green-700">{success}</p>
        </div>
      )}

      {!locked && (
        <div className="sticky bottom-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            aria-label="Undo"
            className="flex flex-shrink-0 items-center justify-center rounded-xl bg-white px-3.5 py-3 text-gray-700 shadow-lg ring-1 ring-gray-200 transition-colors disabled:text-gray-300 disabled:shadow-none"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length}
            aria-label="Redo"
            className="flex flex-shrink-0 items-center justify-center rounded-xl bg-white px-3.5 py-3 text-gray-700 shadow-lg ring-1 ring-gray-200 transition-colors disabled:text-gray-300 disabled:shadow-none"
          >
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !dirty}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-300 disabled:shadow-none"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : dirty ? 'Save design' : 'Saved'}
          </button>
        </div>
      )}
    </div>
  )
}
