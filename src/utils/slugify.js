//src/utils/slugify.js/
// More robust than Login.jsx's inline storeName normalization -- collapses and
// trims dashes so titles like "  Hello, World!!  " -> "hello-world" cleanly.
// NFKD splits an accented letter into its base letter + a separate combining-mark
// character; that combining mark is not in a-z0-9 so the generic replace below
// strips it along with every other non-alphanumeric character -- no separate
// diacritics regex needed.
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function truncateSlug(slug, max = 80) {
  return String(slug || '').slice(0, max).replace(/-$/, '')
}
