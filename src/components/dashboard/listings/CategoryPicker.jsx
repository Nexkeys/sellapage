// src/components/dashboard/listings/CategoryPicker.jsx
//
// Category dropdown for the product form: the Nigerian market categories plus
// the vendor's own, with "Create custom category" at the bottom. Behaviour
// moved unchanged from the old Products.jsx; the look is the new design's.
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Loader2, Check } from 'lucide-react'
import { NIGERIAN_MARKET_CATEGORIES } from '../../../utils/categories'

export default function CategoryPicker({ value, onChange, customCategories = [], onSaveCustomCategory, invalid, id }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const all = [...NIGERIAN_MARKET_CATEGORIES, ...customCategories.map((c) => ({ id: c.id, label: c.name }))]

  const create = async () => {
    const name = draft.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      const ok = await onSaveCustomCategory?.(name)
      if (ok === null) {
        setError('That did not save. Check your connection and try again.')
        return
      }
      onChange(name)
      setDraft('')
      setCreating(false)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-left text-sm transition focus:outline-none focus:ring-4 ${
          invalid ? 'border-red-300 focus:ring-red-50' : 'border-dash-line hover:border-forest-200 focus:border-forest-200 focus:ring-forest-50'
        }`}
      >
        <span className={value ? 'text-dash-ink' : 'text-slate-400'}>{value || 'Select a category'}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-dash-line bg-white py-1 shadow-xl shadow-gray-200/70">
          {all.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="option"
              aria-selected={value === cat.label}
              onClick={() => { onChange(cat.label); setOpen(false) }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-forest-50 ${value === cat.label ? 'font-semibold text-forest' : 'text-slate-700'}`}
            >
              {cat.label}
              {value === cat.label && <Check size={14} />}
            </button>
          ))}
          <div className="border-t border-dash-line">
            {!creating ? (
              <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-forest-600 transition hover:bg-forest-50">
                <Plus size={14} /> Create custom category
              </button>
            ) : (
              <div className="p-3">
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
                    placeholder="Category name"
                    className="min-w-0 flex-1 rounded-lg border border-dash-line px-3 py-2 text-sm outline-none focus:border-forest-200"
                    autoFocus
                  />
                  <button type="button" onClick={create} disabled={saving || !draft.trim()} className="rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
                {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
