// src/components/receipts/TemplateSelector.jsx
import { Lock, Check } from 'lucide-react'
import { RECEIPT_TEMPLATES } from '../../utils/receiptTemplates'

export default function TemplateSelector({ selectedId, onSelect, locked }) {
  return (
    <div className="space-y-2">
      {locked && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
          Templates are a Growth+ feature. Upgrade to unlock all 6 — Free/Starter receipts use a plain layout.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RECEIPT_TEMPLATES.map((t) => {
          const isSelected = selectedId === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !locked && onSelect(t.id)}
              disabled={locked}
              className={`relative overflow-hidden rounded-2xl border-2 p-2.5 text-left transition-all sm:p-3 ${
                isSelected ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-100 hover:border-gray-200'
              } ${locked ? 'cursor-not-allowed' : ''}`}
            >
              {locked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <Lock size={16} className="text-gray-400" />
                </div>
              )}
              {isSelected && !locked && (
                <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
                  <Check size={11} strokeWidth={3} />
                </div>
              )}

              {/* mini mockup */}
              <div className={`mb-2 overflow-hidden rounded-lg border border-gray-100 bg-white ${locked ? 'opacity-50 blur-[1px]' : ''}`}>
                <div className="h-5" style={{ backgroundColor: t.defaultColors.primary }} />
                <div className="space-y-1 p-1.5">
                  <div className="h-1.5 w-3/4 rounded bg-gray-200" />
                  <div className="h-1.5 w-1/2 rounded bg-gray-100" />
                  <div className="h-1.5 w-full rounded bg-gray-100" />
                  <div className="h-1.5 w-2/3 rounded bg-gray-100" />
                </div>
              </div>
              <p className="text-xs font-bold text-gray-900">{t.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-gray-400">{t.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
