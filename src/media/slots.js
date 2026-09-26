// src/media/slots.js
//
// Every place on the site that can show a photo or a video, in one list.
//
// HOW IT WORKS
// Each slot is a folder in media-src/ at the root of the project. Drop an image
// or a video into the folder, run `npm run media`, and it appears on the site.
// An empty folder means the page keeps showing what it shows today, so adding
// files never breaks anything and removing them puts the old design back.
//
// Adding a new place on the site is two steps: add an entry here, then put
// <MediaSlot name="..."> where it should appear. Nothing else.
//
// shape  what the frame on the page is shaped like, so a photo is taken the
//        right way round. landscape = wider than tall (laptop screens),
//        portrait = taller than wide (phone screens), square = equal sides.
// accepts  'image', 'video' or 'both'. A video in a slot that also has an
//        image uses that image as the still frame shown before it plays.

export const MEDIA_SLOTS = [
  // ── Homepage hero ─────────────────────────────────────────────────────
  {
    name: 'home-hero-main',
    where: 'Homepage, top of the page, the big laptop picture',
    shape: 'landscape',
    accepts: 'both',
    tip: 'A laptop screen recording of the dashboard, 10 to 15 seconds, or a screenshot.',
  },
  {
    name: 'home-hero-phone',
    where: 'Homepage, top of the page, the phone in front of the laptop',
    shape: 'portrait',
    accepts: 'both',
    tip: 'Record your phone screen: add a product, tap share, post to WhatsApp status. 10 to 15 seconds, no sound needed.',
  },

  // ── Homepage "What Sellapage does" cards ──────────────────────────────
  // One per card, in the order they appear. Each shows above the card title
  // in place of the small icon.
  { name: 'feature-store-page', where: 'Homepage card: Create Your Commerce Page', shape: 'landscape', accepts: 'both', tip: 'A storefront as a customer sees it.' },
  { name: 'feature-products', where: 'Homepage card: Manage Products & Services', shape: 'landscape', accepts: 'both', tip: 'The products list in the dashboard.' },
  { name: 'feature-payments', where: 'Homepage card: Accept Payments', shape: 'landscape', accepts: 'both', tip: 'The checkout screen.' },
  { name: 'feature-delivery', where: 'Homepage card: Manage Delivery', shape: 'landscape', accepts: 'both', tip: 'Delivery rates or a shipment being booked.' },
  { name: 'feature-customers', where: 'Homepage card: Customer CRM', shape: 'landscape', accepts: 'both', tip: 'The customers list.' },
  { name: 'feature-reviews', where: 'Homepage card: Reviews & Ratings', shape: 'landscape', accepts: 'both', tip: 'Stars on a product card.' },
  { name: 'feature-discounts', where: 'Homepage card: Discounts & Promos', shape: 'landscape', accepts: 'both', tip: 'A discount code being created.' },
  { name: 'feature-analytics', where: 'Homepage card: Analytics & Growth', shape: 'landscape', accepts: 'both', tip: 'The analytics charts.' },
  { name: 'feature-receipts', where: 'Homepage card: Receipts & Invoices', shape: 'landscape', accepts: 'both', tip: 'A generated receipt.' },
  { name: 'feature-loyalty', where: 'Homepage card: Loyalty Points', shape: 'landscape', accepts: 'both', tip: 'A points card.' },
  { name: 'feature-abandoned', where: 'Homepage card: Abandoned Checkout Recovery', shape: 'landscape', accepts: 'both', tip: 'The abandoned checkouts list.' },

  // ── Homepage mid-page and app section ─────────────────────────────────
  {
    name: 'home-showcase',
    where: 'Homepage, "Less chaos. More orders." section',
    shape: 'landscape',
    accepts: 'both',
    tip: 'The dashboard on a laptop.',
  },
  { name: 'home-app-1', where: 'Homepage, "Run your shop from your pocket", first phone', shape: 'portrait', accepts: 'both', tip: 'An app screen.' },
  { name: 'home-app-2', where: 'Homepage, "Run your shop from your pocket", second phone', shape: 'portrait', accepts: 'both', tip: 'Another app screen.' },

  // ── Homepage testimonials ─────────────────────────────────────────────
  // Real vendors, with their permission. Shown as a round photo beside their
  // words, so a face centred in the picture works best.
  { name: 'testimonial-1', where: 'Homepage, "Loved by Business Owners", first person', shape: 'square', accepts: 'image', tip: 'A real vendor, face centred, ideally with their product.' },
  { name: 'testimonial-2', where: 'Homepage, "Loved by Business Owners", second person', shape: 'square', accepts: 'image', tip: 'A real vendor, face centred.' },
  { name: 'testimonial-3', where: 'Homepage, "Loved by Business Owners", third person', shape: 'square', accepts: 'image', tip: 'A real vendor, face centred.' },

  // ── Vendor dashboard home ─────────────────────────────────────────────
  {
    name: 'dashboard-banner',
    where: 'Dashboard home, top right, the "Level up your store" banner',
    shape: 'landscape',
    accepts: 'image',
    tip: 'Products and a plant on a light background, fading to white on the right where the text sits.',
  },
  {
    name: 'dashboard-howto',
    where: 'Dashboard home, the "Watch how Sellapage works" card under Recent Activity',
    shape: 'landscape',
    accepts: 'image',
    tip: 'The still shown on the card. The card itself only appears once HOWTO_VIDEO_URL in src/media/howto.js is set.',
  },
]

export const SLOT_NAMES = new Set(MEDIA_SLOTS.map((s) => s.name))
