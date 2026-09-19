// src/components/dashboard/AnnouncementModal.jsx
//
// Full-screen overlay version of an announcement, for the ones that must not be
// missed (a WhatsApp community invite, a big launch). The small banner above the
// dashboard is easy to scroll past; this is not.
//
// Visual language deliberately follows ReviewPromptModal so the dashboard has
// one overlay style rather than two.
//
// Closing it only hides it for this visit. It shows again on the next reload
// until an admin switches it off or it expires (see AnnouncementBanner).
//
// When the admin uploaded an image it takes the place of the icon header. While
// it loads a shimmer holds its space, and if it fails the icon header returns,
// so a bad image never leaves a broken box on every vendor's screen.
import { useEffect, useState } from 'react'
import { X, Megaphone, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import { safeAnnouncementUrl, safeAnnouncementImage } from '../../utils/announcementLink'

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
  // 'loading' | 'loaded' | 'failed'. The parent keys this component by
  // announcement id, so a different announcement always starts at 'loading'.
  const image = safeAnnouncementImage(announcement?.imageUrl)
  const [imageState, setImageState] = useState('loading')

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
  const showImage = image && imageState !== 'failed'

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
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          className={`absolute right-4 top-4 z-10 rounded-full p-2 text-white transition-colors ${
            showImage ? 'bg-black/45 hover:bg-black/60' : 'bg-white/10 hover:bg-white/20'
          }`}
          aria-label="Close announcement"
        >
          <X size={18} />
        </button>

        {showImage ? (
          <>
            <div className="relative aspect-[2/1] w-full bg-gray-100">
              {imageState === 'loading' && (
                <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />
              )}
              <img
                src={image}
                alt=""
                onLoad={() => setImageState('loaded')}
                onError={() => setImageState('failed')}
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
            <div className="px-6 pt-6 text-center">
              <h2 id="announcement-modal-title" className="text-xl font-black leading-snug text-gray-900">
                {announcement.title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {announcement.message}
              </p>
            </div>
          </>
        ) : (
          <div className={`bg-gradient-to-br ${style.header} px-6 pb-9 pt-12 text-center text-white`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Icon size={28} />
            </div>
            <h2 id="announcement-modal-title" className="text-xl font-black leading-snug">
              {announcement.title}
            </h2>
            <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${style.sub}`}>
              {announcement.message}
            </p>
          </div>
        )}

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
