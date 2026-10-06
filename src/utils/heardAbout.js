// src/utils/heardAbout.js
//
// "How did you hear about us?" on the Create Store form. One list for the form
// and the server (signup-phone.js), so the admin numbers can only ever contain
// these ids. `details` are optional follow-up chips; "other" needs free text.
//
// Saved on the store as `heardAbout: { source, detail, at }` and locked in
// firestore.rules, so a vendor cannot rewrite it later.
export const HEARD_ABOUT_SOURCES = [
  { id: 'merchant_referral', label: 'A merchant referred me' },
  { id: 'news', label: 'News or a blog' },
  { id: 'ai', label: 'An AI assistant', details: ['ChatGPT', 'Gemini', 'Claude', 'Meta AI', 'Copilot', 'Grok'] },
  { id: 'google', label: 'Google search' },
  { id: 'social', label: 'Social media', details: ['Instagram', 'TikTok', 'Facebook', 'X (Twitter)', 'WhatsApp', 'YouTube', 'LinkedIn'] },
  { id: 'word_of_mouth', label: 'Word of mouth' },
  { id: 'other', label: 'Other', needsText: true },
]

export const heardAboutSource = (id) => HEARD_ABOUT_SOURCES.find((s) => s.id === id) || null

/** { source, detail } from anything a client sent, or null if it is not one of ours. */
export function cleanHeardAbout(value) {
  const source = heardAboutSource(String(value?.source || ''))
  if (!source) return null
  const raw = String(value?.detail || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  // A chip detail must be one of the chips; free text only for "other".
  const detail = source.details ? (source.details.includes(raw) ? raw : '') : source.needsText ? raw : ''
  if (source.needsText && detail.length < 2) return null
  return { source: source.id, detail }
}
