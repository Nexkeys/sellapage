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
