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
//
// `kind="phone"` is the phone verified mark, same rules: phoneBadgeAt() decides.
import { ShieldCheck, PhoneCall } from 'lucide-react'
import {
  VERIFIED_LABEL, VERIFIED_LINE, VERIFIED_TITLE,
  PHONE_VERIFIED_LABEL, PHONE_VERIFIED_LINE, PHONE_VERIFIED_TITLE,
} from '../utils/storeDesign'

const GREEN = { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' }

const KINDS = {
  cac: { Icon: ShieldCheck, label: VERIFIED_LABEL, line: VERIFIED_LINE, title: VERIFIED_TITLE },
  phone: { Icon: PhoneCall, label: PHONE_VERIFIED_LABEL, line: PHONE_VERIFIED_LINE, title: PHONE_VERIFIED_TITLE },
}

export default function VerifiedBadge({
  kind = 'cac',
  variant = 'chip',
  tone = null,
  radius = '999px',
  size = 'sm',
  className = '',
  // Icon only below `sm`, for tight spots like a phone header that already
  // carries the business name and the CAC chip. The words stay for screen
  // readers and the title tooltip.
  compactOnMobile = false,
}) {
  const { Icon, label, line, title } = KINDS[kind] || KINDS.cac
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
        title={title}
      >
        <Icon size={icon + 2} strokeWidth={2} className="flex-shrink-0" />
        <span>{line}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1 px-2 py-0.5 ${className}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius, color: c.fg }}
      title={title}
    >
      <Icon size={icon} strokeWidth={2.2} className="flex-shrink-0" />
      <span className={`${text} font-bold whitespace-nowrap ${compactOnMobile ? 'sr-only sm:not-sr-only' : ''}`}>{label}</span>
    </span>
  )
}
