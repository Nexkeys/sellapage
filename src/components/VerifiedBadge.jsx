// src/components/VerifiedBadge.jsx
//
// The CAC verified mark, in one place.
//
// WHY ONE COMPONENT
// This badge is a claim Sellapage makes about a business to that business's own
// customers. If the header, the footer and the crawlable HTML each spelled it
// out separately they would drift, and a trust mark that says three different
// things is not a trust mark. So the wording lives in storeDesign.js and the
// markup lives here.
//
// THIS COMPONENT NEVER DECIDES WHETHER TO SHOW. The caller asks
// verifiedBadgeAt(store, spot) first. That function is the only place the two
// gates live: the business is verified, and the vendor has placed it there.
import { ShieldCheck } from 'lucide-react'
import { VERIFIED_LABEL, VERIFIED_LINE, VERIFIED_TITLE } from '../utils/storeDesign'

const GREEN = { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' }

export default function VerifiedBadge({
  variant = 'chip',
  tone = null,
  radius = '999px',
  size = 'sm',
  className = '',
}) {
  const c = tone || GREEN
  const icon = size === 'lg' ? 14 : size === 'md' ? 12 : 10
  const text = size === 'lg' ? 'text-xs' : size === 'md' ? 'text-[11px]' : 'text-[10px]'

  // The footer wants a sentence, not a pill: "This store is CAC verified" reads
  // as a statement about the shop, which is what a customer scrolling to the
  // bottom is actually looking for.
  if (variant === 'line') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${text} font-semibold ${className}`}
        style={{ color: c.fg }}
        title={VERIFIED_TITLE}
      >
        <ShieldCheck size={icon + 2} strokeWidth={2} className="flex-shrink-0" />
        <span>{VERIFIED_LINE}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1 px-2 py-0.5 ${className}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, color: c.fg }}
      title={VERIFIED_TITLE}
    >
      <ShieldCheck size={icon} strokeWidth={2.2} className="flex-shrink-0" />
      <span className={`${text} font-bold whitespace-nowrap`}>{VERIFIED_LABEL}</span>
    </span>
  )
}
