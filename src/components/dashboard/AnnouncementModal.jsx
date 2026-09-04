// src/components/dashboard/AnnouncementModal.jsx
//
// Full-screen overlay version of an announcement, for the ones that must not be
// missed (a WhatsApp community invite, a big launch). The small banner above the
// dashboard is easy to scroll past; this is not.
//
// Visual language deliberately follows ReviewPromptModal so the dashboard has
// one overlay style rather than two.
//
// Dismissal is persistent per announcement id, unlike ReviewPromptModal which
// reappears on every load. An overlay that came back on every single reload
// forever would be punishing, and the vendor has usually already acted on it.
import { useEffect } from 'react'
import { X, Megaphone, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import { safeAnnouncementUrl } from '../../utils/announcementLink'

const TYPE_STYLES = {
  info: {
    header: 'from-blue-500 to-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
    sub: 'text-blue-50',
    icon: Megaphone,
  },
  warning: {
    header: 'from-amber-500 to-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    sub: 'text-amber-50',
    icon: AlertTriangle,
  },
  promo: {
    header: 'from-purple-500 to-purple-700',
    button: 'bg-purple-600 hover:bg-purple-700',
    sub: 'text-purple-50',
    icon: Sparkles,
  },
}

export default function AnnouncementModal({ announcement, onDismiss }) {
  // Close on Escape, and stop the page behind from scrolling while open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onDismiss])

  if (!announcement) return null

  const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info
  const Icon = style.icon
  // Re-checked here rather than trusted: the announcements read is public and
  // documents written before URL validation existed are still in the collection.
  const href = safeAnnouncementUrl(announcement.ctaUrl)
  const label = (announcement.ctaLabel || '').trim() || 'Learn More'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
      onClick={onDismiss}
    >
      {/* Clicking the panel itself must not close it, only the backdrop. */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Close announcement"
        >
          <X size={18} />
        </button>

        <div className={`bg-gradient-to-br ${style.header} px-6 pb-9 pt-12 text-center text-white`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Icon size={28} />
          </div>
          <h2 id="announcement-modal-title" className="text-xl font-black leading-snug">
            {announcement.title}
          </h2>
          <p className={`mt-2 text-sm leading-relaxed ${style.sub}`}>
            {announcement.message}
          </p>
        </div>

        <div className="space-y-2.5 p-6">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDismiss}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.99] ${style.button}`}
            >
              {label} <ArrowRight size={15} />
            </a>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            {href ? 'Maybe Later' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  )
}
