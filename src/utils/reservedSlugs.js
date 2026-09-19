//src/utils/reservedSlugs.js/
// Static top-level routes registered in src/App.jsx. React Router v6 always resolves
// a static path (e.g. /jobs) over the dynamic /:storeName storefront route regardless
// of a vendor's storeName, so a vendor who grabbed one of these words would have their
// store permanently unreachable at that URL. Checked at signup (Login.jsx + api signup-phone.js).
export const RESERVED_SLUGS = [
  'jobs',
  'blog', // reserved ahead of the Blog module (Phase 2) so it can't be grabbed in the meantime
  'login',
  'register',
  'dashboard',
  'admin',
  'about',
  'contact',
  'pricing',
  'terms',
  'privacy-policy',
  'report-store',
  'live-stores',
  'reset-password',
  'review',
  'tools',
  'compare',
  'billing',
  // Added 2026-09-05: these are live routes in App.jsx but were never reserved,
  // so a vendor could take one as their store name and React Router would
  // resolve the static page instead, leaving their storefront unreachable.
  'success-stories',
  'account-recovery',
  'join-team',
  // Added 2026-09-15 with the Investors & Partners page. Checked in production
  // first: no store owned this slug.
  'partners',
  // Added 2026-09-19 with the Dropshipping Marketplace page. Checked in
  // production first: no store owned this slug, current or previous.
  'dropshipping',
]

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.includes(String(slug || '').trim().toLowerCase())
}
