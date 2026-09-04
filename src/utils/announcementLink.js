// src/utils/announcementLink.js
//
// Announcement call-to-action links are typed by an admin and then rendered as
// an `href` on every vendor's dashboard. That makes the URL field the one part
// of an announcement that can do real damage: a `javascript:` URL saved here
// would be stored XSS running on every merchant's session, and `data:` can
// carry a whole phishing page.
//
// So the scheme is checked in two places on purpose:
//   - server side in admin-announcements.js, so bad input is never stored;
//   - client side here, because the `active` read is public and unauthenticated,
//     and documents written before this validation existed are still in the
//     collection. Never trust a stored URL just because a server wrote it.

const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Returns the normalised URL when it is safe to use as an href, otherwise null.
 * WhatsApp, Instagram, Telegram and the rest are ordinary https links, so the
 * allowlist covers every case an announcement actually needs.
 */
export function safeAnnouncementUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return null

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return null // relative or malformed: refuse rather than guess a scheme
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol.toLowerCase())) return null
  return parsed.toString()
}

export { ALLOWED_SCHEMES }
