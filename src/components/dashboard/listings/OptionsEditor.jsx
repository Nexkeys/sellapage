// src/components/dashboard/listings/OptionsEditor.jsx
//
// Options & Extras for a product: "Choose one" groups (Size, Colour) and
// "Extras" groups (paid add-ons). Moved here unchanged in behaviour from the
// old Products.jsx when the Products screen was redesigned on 2026-09-26;
// only the styling is new. Server-side pricing at checkout reads the same
// shape (utils/productOptions.js normaliseGroups).
import { useState } from 'react'
import { Plus, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { VARIATION_DISPLAY_TYPES } from '../../../utils/categories'
import { GROUP_SINGLE, GROUP_MULTI, MAX_GROUPS, MAX_OPTIONS_PER_GROUP, LIMITS } from '../../../utils/productOptions'

export default function OptionsEditor({ form, setForm, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen || (form.variations?.length > 0))
  // Options are typed and added one at a time. The old field took a single
  // comma-separated string, which vendors read as one long answer rather than a
  // list, and which had nowhere to put a price.
  const [optionDrafts, setOptionDrafts] = useState({})

  const addGroup = (type = GROUP_SINGLE) => {
    setForm((p) => ({ ...p, variations: [...(p.variations || []), { groupName: '', displayType: 'pill', type, options: [] }] }))
  }
  const removeGroup = (index) => setForm((p) => ({ ...p, variations: p.variations.filter((_, i) => i !== index) }))
  const changeGroup = (index, field, value) =>
    setForm((p) => ({ ...p, variations: p.variations.map((g, i) => (i === index ? { ...g, [field]: value } : g)) }))
  const setGroupOptions = (index, updater) =>
    setForm((p) => ({
      ...p,
      variations: p.variations.map((g, i) => (i === index ? { ...g, options: updater(Array.isArray(g.options) ? g.options : []) } : g)),
    }))
  const addOption = (index) => {
    const label = String(optionDrafts[index] || '').trim().slice(0, LIMITS.optionLabel)
    if (!label) return
    setGroupOptions(index, (opts) => {
      if (opts.length >= MAX_OPTIONS_PER_GROUP) return opts
      // Typing the same option twice is a slip, not an intention.
      if (opts.some((o) => (o.label || '').toLowerCase() === label.toLowerCase())) return opts
      return [...opts, { label, value: label, price: '', stock: '' }]
    })
    setOptionDrafts((d) => ({ ...d, [index]: '' }))
  }
  const removeOption = (index, optIdx) => setGroupOptions(index, (opts) => opts.filter((_, i) => i !== optIdx))
  const optionField = (index, optIdx, field, value) =>
    setGroupOptions(index, (opts) => opts.map((o, i) => (i === optIdx ? { ...o, [field]: value } : o)))

  const groups = form.variations || []
  const input = 'rounded-lg border border-dash-line bg-white px-3 py-2 text-sm outline-none transition focus:border-forest-200 focus:ring-4 focus:ring-forest-50'

  return (
    <div className="overflow-hidden rounded-2xl border border-dash-line bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-slate-500">
          <SlidersHorizontal size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-dash-ink">
            Options & extras
            {groups.length > 0 && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold text-forest-600">{groups.length}</span>}
          </span>
          <span className="block text-xs text-dash-muted">Add sizes, colours, bundles or paid add-ons.</span>
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-dash-line px-4 pb-4 pt-3">
          {groups.length === 0 && (
            <p className="py-1 text-center text-xs leading-relaxed text-dash-muted">
              Use <span className="font-semibold text-dash-ink">Choose one</span> for a pick like Size or Colour, and{' '}
              <span className="font-semibold text-dash-ink">Extras</span> for paid add-ons like Chicken, Goat meat or Shaki.
            </p>
          )}

          {groups.map((group, idx) => {
            const isExtras = group.type === GROUP_MULTI
            const options = Array.isArray(group.options) ? group.options : []
            const isTextField = !isExtras && group.displayType === 'text-field'
            return (
              <div key={idx} className={`space-y-2.5 rounded-xl border p-3 ${isExtras ? 'border-amber-100 bg-amber-50/40' : 'border-dash-line bg-gray-50/70'}`}>
                <div className="flex items-center gap-2">
                  <input
                    value={group.groupName}
                    maxLength={LIMITS.groupName}
                    onChange={(e) => changeGroup(idx, 'groupName', e.target.value)}
                    placeholder={isExtras ? 'Extras heading (e.g. Add protein)' : 'Group name (e.g. Size)'}
                    className={`min-w-0 flex-1 ${input}`}
                  />
                  <button type="button" onClick={() => removeGroup(idx)} className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500" aria-label="Remove group">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={isExtras ? GROUP_MULTI : GROUP_SINGLE} onChange={(e) => changeGroup(idx, 'type', e.target.value)} className={`py-1.5 text-xs font-semibold ${input}`}>
                    <option value={GROUP_SINGLE}>Choose one</option>
                    <option value={GROUP_MULTI}>Extras (pick any)</option>
                  </select>
                  {!isExtras && (
                    <select value={group.displayType} onChange={(e) => changeGroup(idx, 'displayType', e.target.value)} className={`py-1.5 text-xs ${input}`}>
                      {VARIATION_DISPLAY_TYPES.map((dt) => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
                    </select>
                  )}
                </div>

                {isTextField ? (
                  <p className="text-[11px] text-dash-muted">The customer types their own answer here, so there is nothing to price.</p>
                ) : (
                  <>
                    {options.length > 0 && (
                      <div className="space-y-1.5">
                        {options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1.5 rounded-lg border border-dash-line bg-white px-2 py-1.5">
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-dash-ink">{opt.label}</span>
                            <span className="flex flex-shrink-0 items-center gap-1">
                              <span className="text-[11px] text-dash-muted">₦</span>
                              <input
                                type="number" min="0" inputMode="numeric" value={opt.price ?? ''}
                                onChange={(e) => optionField(idx, optIdx, 'price', e.target.value)}
                                placeholder="0" aria-label={`Extra price for ${opt.label}`}
                                className="w-20 rounded-md border border-dash-line px-2 py-1 text-xs outline-none focus:border-forest-200"
                              />
                            </span>
                            <input
                              type="number" min="0" inputMode="numeric" value={opt.stock ?? ''}
                              onChange={(e) => optionField(idx, optIdx, 'stock', e.target.value)}
                              placeholder="Qty" aria-label={`Stock left for ${opt.label}`}
                              className="w-16 flex-shrink-0 rounded-md border border-dash-line px-2 py-1 text-xs outline-none focus:border-forest-200"
                            />
                            <button type="button" onClick={() => removeOption(idx, optIdx)} className="flex-shrink-0 rounded p-1 text-slate-300 hover:text-red-500" aria-label={`Remove ${opt.label}`}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {options.length < MAX_OPTIONS_PER_GROUP && (
                      <div className="flex gap-1.5">
                        <input
                          value={optionDrafts[idx] || ''}
                          maxLength={LIMITS.optionLabel}
                          onChange={(e) => setOptionDrafts((d) => ({ ...d, [idx]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              // Enter must not submit the product form half-filled.
                              e.preventDefault()
                              addOption(idx)
                            }
                          }}
                          placeholder={isExtras ? 'e.g. Chicken 15pcs' : 'e.g. 5 litres'}
                          className={`min-w-0 flex-1 ${input}`}
                        />
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          disabled={!String(optionDrafts[idx] || '').trim()}
                          aria-label={`Add option to ${group.groupName || 'this group'}`}
                          className="flex-shrink-0 rounded-lg bg-forest px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] leading-relaxed text-dash-muted">
                      {isExtras
                        ? 'Price is added on top when a customer ticks it. Leave the price blank for a free extra.'
                        : 'Leave the price blank unless that choice costs more than the main price.'}
                      {' '}Qty is how many you have left; leave it blank if you are not counting. Set it to 0 to show it as sold out.
                    </p>
                  </>
                )}
              </div>
            )
          })}

          {groups.length < MAX_GROUPS && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => addGroup(GROUP_SINGLE)} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-forest-200 bg-forest-50 py-2.5 text-xs font-bold text-forest-600 transition hover:bg-forest-100">
                <Plus size={13} /> Choose one
              </button>
              <button type="button" onClick={() => addGroup(GROUP_MULTI)} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100">
                <Plus size={13} /> Add extras
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
