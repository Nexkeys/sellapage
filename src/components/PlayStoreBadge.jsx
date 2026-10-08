// src/components/PlayStoreBadge.jsx
//
// "Get it on Google Play" button, drawn in markup rather than loading Google's
// badge image, so it stays crisp at any size, needs no extra download, and
// cannot break if the hosted asset moves.
//
// NOTE FOR LATER: Google's brand guidelines ask for the official badge artwork
// on store listings. This shape and wording follow it closely; swap in the
// official PNG here if they ever ask.

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.nexkeys.sellapage&pcampaignid=web_share'

/** The Play triangle, in its four brand colours. */
function PlayGlyph({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <path fill="#00D0FF" d="M47 19.5C39 24 34 33 34 45v422c0 12 5 21 13 25.5L279 256 47 19.5z" />
      <path fill="#FFCE00" d="M395 197l-78-44-70 71 70 71 78-44c22-13 22-41 0-54z" />
      <path fill="#FF3A44" d="M317 153L47 19.5c-1.5-1-3-1.5-4.5-2L247 224l70-71z" />
      <path fill="#00E676" d="M42.5 494.5c1.5-.5 3-1 4.5-2L317 359l-70-71-204.5 206.5z" />
    </svg>
  )
}

/**
 * `tone`:
 *   dark  - black pill, for light backgrounds
 *   light - white pill, for dark or coloured backgrounds
 */
export default function PlayStoreBadge({ tone = 'dark', className = '', label = 'Download the Sellapage app on Google Play' }) {
  const isLight = tone === 'light'
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all ${
        isLight
          ? 'border-white/20 bg-white text-gray-900 hover:bg-gray-100'
          : 'border-gray-800 bg-gray-950 text-white hover:bg-gray-900'
      } ${className}`}
    >
      <PlayGlyph className="w-6 h-6 flex-shrink-0" />
      <span className="text-left leading-none">
        <span className={`block text-[9px] font-medium uppercase tracking-wide ${isLight ? 'text-gray-500' : 'text-gray-300'}`}>
          Get it on
        </span>
        <span className="block font-display text-base font-bold leading-tight">Google Play</span>
      </span>
    </a>
  )
}

/**
 * The iPhone app is not out yet. This says so plainly, sits beside the Play
 * badge in the same shape, and is deliberately not a link (and not Apple's
 * official badge, which may only be used once the app is live).
 */
export function AppStoreSoon({ tone = 'dark', className = '' }) {
  const isLight = tone === 'light'
  return (
    <span
      aria-label="iPhone app coming soon"
      className={`inline-flex cursor-default items-center gap-3 rounded-xl border px-4 py-2.5 ${
        isLight ? 'border-gray-200 bg-white/70 text-gray-500' : 'border-white/15 bg-white/5 text-white/70'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M16.37 1.43c0 1.14-.42 2.2-1.24 3.03-.86.88-1.9 1.39-3.02 1.3-.13-1.09.4-2.24 1.2-3.05.88-.9 2.06-1.4 3.06-1.28zM20.5 17.07c-.56 1.29-.83 1.87-1.55 3.01-1 1.6-2.42 3.6-4.17 3.61-1.56.02-1.96-1.02-4.08-1-2.12.01-2.56 1.02-4.12 1-1.75-.02-3.09-1.82-4.09-3.42C-.3 15.82-.6 10.6 1.29 7.84c1.34-1.96 3.46-3.1 5.45-3.1 2.03 0 3.3 1.11 4.98 1.11 1.62 0 2.61-1.12 4.95-1.12 1.77 0 3.65.97 4.99 2.64-4.38 2.4-3.67 8.66.84 9.7z" />
      </svg>
      <span className="text-left leading-none">
        <span className="block text-[9px] font-medium uppercase tracking-wide opacity-80">Coming soon</span>
        <span className="block font-display text-base font-bold leading-tight">iPhone app</span>
      </span>
    </span>
  )
}
