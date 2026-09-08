// src/components/dashboard/StoreDesignTab.jsx
//
// The Store Design builder. Add sections, reorder them, restyle each one, and
// see the result before anything goes live.
//
// The preview renders the SAME DesignedStorefront component the live storefront
// uses, with the vendor's real products, categories and reviews. It is not a
// mock-up. A separate preview renderer is how a vendor ends up publishing
// something they never actually saw.
//
// REORDERING WORKS ON A PHONE
// Up/down buttons are the primary control, not a fallback. HTML5 drag and drop
// does not fire on touch, and most Nigerian vendors are on a phone, so a
// drag-only builder would be unusable for the people it is built for. Drag is
// added on top for pointer devices.
import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Check, AlertCircle, Lock, Plus, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, Settings2, Palette, GripVertical, X,
} from 'lucide-react'
import { auth } from '../../firebase/auth'
import { getProducts } from '../../firebase/products'
import {
  SECTION_TYPES, SECTION_ORDER, FONT_OPTIONS, makeSection, defaultDesign,
} from '../../utils/storeDesign'
import DesignedStorefront from '../storefront/DesignedStorefront'

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

/** Settings are generated from the section's declared fields, never hand-written. */
function SectionSettings({ section, onChange }) {
  const def = SECTION_TYPES[section.type]
  if (!def) return null
  const set = (key, value) =>
    onChange({ ...section, settings: { ...section.settings, [key]: value } })

  return (
    <div className="space-y-3 border-t border-gray-100 p-3">
      {def.fields.map((f) => {
        const v = section.settings?.[f.key]
        if (f.type === 'color') return <ColorField key={f.key} label={f.label} value={v} onChange={(x) => set(f.key, x)} />
        if (f.type === 'toggle') {
          return (
            <label key={f.key} className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 text-[11px] font-semibold text-gray-600">{f.label}</span>
              <button
                type="button"
                onClick={() => set(f.key, !v)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${v ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${v ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          )
        }
        if (f.type === 'select') {
          return (
            <label key={f.key} className="block">
              <span className="text-[11px] font-semibold text-gray-600">{f.label}</span>
              <select
                value={v}
                onChange={(e) => set(f.key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
              >
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
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
              rows={f.type === 'textarea' ? 2 : undefined}
              onChange={(e) => set(f.key, e.target.value)}
              className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
            />
          </label>
        )
      })}
    </div>
  )
}

export default function StoreDesignTab({ store, storeUrl }) {
  const [design, setDesign] = useState(defaultDesign())
  const [meta, setMeta] = useState({ eligible: false, live: false, plan: 'starter', hasSaved: false })
  const [products, setProducts] = useState([])
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dirty, setDirty] = useState(false)
  const [dragId, setDragId] = useState(null)

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
        const [res, items] = await Promise.all([
          authed('/api/store-design?action=get').then((r) => r.json()).catch(() => null),
          getProducts(store.id, 12).catch(() => []),
        ])
        if (cancelled) return
        if (res?.success) {
          setDesign(res.design || defaultDesign())
          setMeta({ eligible: res.eligible, live: res.live, plan: res.plan, hasSaved: res.hasSaved })
        }
        setProducts(items || [])
      } catch {
        if (!cancelled) setError('Could not load your design.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [store?.id, authed])

  const update = (next) => { setDesign(next); setDirty(true) }

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
      setSuccess(d.live ? 'Saved and live on your store page.' : 'Saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const move = (index, dir) => {
    const next = [...design.sections]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    update({ ...design, sections: next })
  }

  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return
    const next = [...design.sections]
    const from = next.findIndex((s) => s.id === dragId)
    const to = next.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update({ ...design, sections: next })
    setDragId(null)
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]
  const stats = [
    { value: `${products.length}+`, label: 'Products' },
    { value: `${categories.length}+`, label: 'Categories' },
  ]

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100/70" />)}
      </div>
    )
  }

  const locked = !meta.eligible

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
        {/* Global type and background */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-900">Fonts and background</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Headings', 'fontHeading'],
              ['Body text', 'fontBody'],
            ].map(([label, key]) => (
              <label key={key} className="block">
                <span className="text-[11px] font-semibold text-gray-600">{label}</span>
                <select
                  value={design.theme[key]}
                  onChange={(e) => update({ ...design, theme: { ...design.theme, [key]: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none focus:border-green-400"
                >
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
            ))}
            <div className="flex items-end">
              <div className="w-full">
                <ColorField
                  label="Page background"
                  value={design.theme.pageBg}
                  onChange={(v) => update({ ...design, theme: { ...design.theme, pageBg: v } })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
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
              {SECTION_ORDER.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    update({ ...design, sections: [...design.sections, makeSection(type)] })
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

          <div className="space-y-2">
            {design.sections.map((section, i) => (
              <div
                key={section.id}
                draggable={!locked}
                onDragStart={() => setDragId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(section.id)}
                className={`rounded-xl border bg-white ${dragId === section.id ? 'border-green-400 opacity-60' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <GripVertical size={14} className="hidden flex-shrink-0 cursor-grab text-gray-300 sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${section.visible === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {SECTION_TYPES[section.type]?.label || section.type}
                    </p>
                  </div>
                  {/* Buttons, not drag, are the primary reorder control: HTML5
                      drag does not fire on touch and most vendors are on a phone. */}
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-400 disabled:opacity-30" aria-label="Move up">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === design.sections.length - 1} className="rounded p-1 text-gray-400 disabled:opacity-30" aria-label="Move down">
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ ...design, sections: design.sections.map((x) => x.id === section.id ? { ...x, visible: x.visible === false } : x) })}
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
                    onClick={() => update({ ...design, sections: design.sections.filter((x) => x.id !== section.id) })}
                    className="rounded p-1 text-gray-300 hover:text-red-500"
                    aria-label="Remove section"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {openId === section.id && (
                  <SectionSettings
                    section={section}
                    onChange={(next) => update({ ...design, sections: design.sections.map((x) => x.id === next.id ? next : x) })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Preview: the real renderer, the real products. */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Preview</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          This is the same code your store page uses, with your real products. What you see here is what customers get.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
          <div className="max-h-[540px] overflow-y-auto">
            <DesignedStorefront
              design={design}
              store={store}
              products={products}
              categories={categories}
              reviews={[]}
              stats={stats}
              whatsappUrl={store?.whatsappNumber ? `https://wa.me/${String(store.whatsappNumber).replace(/\D/g, '')}` : ''}
            />
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
        <div className="sticky bottom-3 z-10">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !dirty}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-300 disabled:shadow-none"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : dirty ? 'Save design' : 'Saved'}
          </button>
        </div>
      )}
    </div>
  )
}
