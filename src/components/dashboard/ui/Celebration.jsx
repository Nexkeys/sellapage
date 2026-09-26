// src/components/dashboard/ui/Celebration.jsx
//
// The full-screen party for a vendor's FIRST product or service. Shown once
// per store (Dashboard.jsx keeps the "already celebrated" flag), because the
// first listing is the moment a signup becomes a shop, and the next step,
// dressing up the Business Page and sharing the link, is what gets the first
// order.
//
// The confetti is hand-drawn on one canvas: no package, about 160 particles,
// and it stops itself after a few seconds so a cheap phone is not left
// animating behind the card. With reduced motion switched on there is no
// confetti at all, only the card.
import { useEffect, useRef, useState } from 'react'
import useConfetti from './useConfetti'
import { createPortal } from 'react-dom'
import { PartyPopper, Store, Link2, Check, Plus, X } from 'lucide-react'

export default function Celebration({ open, kind = 'product', name, storeUrl, onGoToBusinessPage, onAddAnother, onClose }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useConfetti(canvasRef, open && !reduced)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard blocked: the link is shown on the card to copy by hand */
    }
  }

  const noun = kind === 'service' ? 'service' : 'product'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
      <div className="absolute inset-0 bg-forest-900/55 backdrop-blur-[3px] animate-in fade-in duration-300" onClick={onClose} />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[101]" aria-hidden="true" />
      <div className="relative z-[102] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-dash-muted transition hover:bg-gray-100 hover:text-dash-ink"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="relative bg-gradient-to-b from-forest-50 to-white px-6 pb-2 pt-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest text-white shadow-lg shadow-forest/30">
            <PartyPopper size={30} />
          </span>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-forest-600">You are officially open</p>
          <h2 id="celebrate-title" className="mt-1.5 font-display text-2xl font-extrabold leading-tight text-dash-ink text-balance">
            Your first {noun} is live!
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dash-muted">
            {name ? <><span className="font-semibold text-dash-ink">{name}</span> is</> : `Your ${noun} is`} now on your store page,
            ready for customers. That is the hardest step done.
          </p>
        </div>

        <div className="px-6 pb-6 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-dash-muted">Your next two steps</p>
          <ol className="mt-3 space-y-2.5">
            <li className="flex gap-3 rounded-2xl border border-dash-line p-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest">1</span>
              <p className="text-[13px] leading-snug text-dash-ink">
                <span className="font-semibold">Dress up your Business Page.</span>{' '}
                <span className="text-dash-muted">Add your logo and a cover photo so buyers trust you at first glance.</span>
              </p>
            </li>
            <li className="flex gap-3 rounded-2xl border border-dash-line p-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest">2</span>
              <p className="text-[13px] leading-snug text-dash-ink">
                <span className="font-semibold">Share your link.</span>{' '}
                <span className="text-dash-muted">Post it on your WhatsApp status and Instagram bio today. Every share is a chance at your first order.</span>
              </p>
            </li>
          </ol>

          <div className="mt-5 grid gap-2.5">
            <button
              type="button"
              onClick={onGoToBusinessPage}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 active:scale-[0.99]"
            >
              <Store size={16} /> Set up my Business Page
            </button>
            {storeUrl && (
              <button
                type="button"
                onClick={copy}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  copied ? 'border-forest bg-forest-50 text-forest' : 'border-dash-line text-dash-ink hover:border-forest-200 hover:bg-forest-50'
                }`}
              >
                {copied ? <Check size={16} /> : <Link2 size={16} />}
                {copied ? 'Link copied, go share it!' : 'Copy my store link'}
              </button>
            )}
            {onAddAnother && (
              <button
                type="button"
                onClick={onAddAnother}
                className="mx-auto mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-dash-muted transition hover:text-forest"
              >
                <Plus size={13} /> Add another {noun}
              </button>
            )}
          </div>
          {storeUrl && <p className="mt-3 truncate text-center text-[11px] text-dash-muted">{storeUrl}</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
