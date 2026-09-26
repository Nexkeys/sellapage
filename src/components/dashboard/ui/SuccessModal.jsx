// src/components/dashboard/ui/SuccessModal.jsx
//
// "It worked" for actions a vendor should not have to wonder about: a saved
// setting, a sent campaign, a published page. Closes itself after a few
// seconds unless it carries an action button, and always on Escape.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessModal({ open, title = 'Done', message, actionLabel, onAction, onClose, autoCloseMs = 2600 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const t = !actionLabel && autoCloseMs ? setTimeout(() => onClose?.(), autoCloseMs) : null
    return () => {
      window.removeEventListener('keydown', onKey)
      if (t) clearTimeout(t)
    }
  }, [open, actionLabel, autoCloseMs, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50">
          <CheckCircle2 size={28} className="text-forest-600" />
        </span>
        <h2 id="success-title" className="mt-4 font-display text-lg font-bold text-dash-ink">{title}</h2>
        {message && <p className="mt-1.5 text-sm leading-relaxed text-dash-muted">{message}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="w-full rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
            >
              {actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50"
          >
            {actionLabel ? 'Close' : 'Great'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
