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
  // ── Homepage (2026-10-08 rebuild) ───────────────────────────────────
  // The hero itself is drawn in code (a live dashboard and phone), so it
  // needs no photo. These are the photos inside the feature cards.
  { name: 'home-hero-scene', where: 'Homepage, "A store that sells for you" card, the wide photo on the right', shape: 'landscape', accepts: 'image', tip: 'A Nigerian shop owner smiling at her phone, with products around her, bright and green. Keep the left side calm.' },
  { name: 'home-bookings', where: 'Homepage, "Bookings that fill your week" card, above the calendar', shape: 'landscape', accepts: 'image', tip: 'A salon owner checking her appointments on a tablet, mint green salon.' },
  { name: 'home-delivery', where: 'Homepage, "Book delivery without leaving your dashboard" card, left photo', shape: 'landscape', accepts: 'image', tip: 'A delivery rider handing a parcel to a smiling customer at her door.' },
  { name: 'home-mission', where: 'Homepage, "See everything happening in your business" card, the photo with features circling it', shape: 'landscape', accepts: 'image', tip: 'A Nigerian business owner checking orders on a phone, with a laptop and products on the table.' },
  { name: 'home-app-1', where: 'Homepage, "Run your shop from your pocket", first phone', shape: 'portrait', accepts: 'both', tip: 'An app screen.' },
  { name: 'home-app-2', where: 'Homepage, "Run your shop from your pocket", second phone', shape: 'portrait', accepts: 'both', tip: 'Another app screen.' },

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

  // ── Products and Services tabs ────────────────────────────────────────
  // Artwork from the 2026-09-26 Products designs. Each frame falls back to a
  // plain green panel when its folder is empty, so nothing breaks without it.
  { name: 'products-hero', where: 'Products and Services tabs, top banner, right side', shape: 'portrait', accepts: 'image', tip: 'Product boxes and a sneaker on a light green background.' },
  { name: 'products-marketing-phone', where: 'Products tab, "Turn browsing into buying" card', shape: 'portrait', accepts: 'image', tip: 'A phone showing a store.' },
  { name: 'products-empty-hero', where: 'Products and Services tabs with nothing added yet, top banner', shape: 'landscape', accepts: 'image', tip: 'A phone with a store and an Add Product button.' },
  { name: 'products-empty-art', where: 'Products and Services tabs with nothing added yet, above "No products added yet"', shape: 'landscape', accepts: 'image', tip: 'A product card with a sneaker and a small plant.' },
  { name: 'products-first-popper', where: 'Products and Services tabs with nothing added yet, "Good things start" card', shape: 'square', accepts: 'image', tip: 'A small party popper, 3D style.' },
  { name: 'products-growth-chart', where: 'Products and Services tabs, "Get more with Growth" card', shape: 'square', accepts: 'image', tip: 'Green rising bars with an arrow.' },

  // ── Billing tab ───────────────────────────────────────────────────────
  { name: 'billing-countdown-art', where: 'Billing tab, the plan countdown card, right side', shape: 'landscape', accepts: 'image', tip: 'A calendar on a green box, light background.' },
  { name: 'billing-banner-bag', where: 'Billing tab, "More tools. More growth." banner, left', shape: 'landscape', accepts: 'image', tip: 'A green Sellapage shopping bag with leaves and a rising arrow.' },
  { name: 'billing-script', where: 'Billing tab, "Built for Nigerian businesses" handwriting, right of the banner', shape: 'landscape', accepts: 'image', tip: 'Green handwriting on a transparent or white background.' },

  // ── Business Page tab ─────────────────────────────────────────────────
  { name: 'business-hero', where: 'Business Page tab, top banner, right side', shape: 'landscape', accepts: 'image', tip: 'A phone showing a store, with leaves.' },
  { name: 'business-brand-script', where: 'Business Page tab, "Your brand matters." handwriting in the side card', shape: 'landscape', accepts: 'image', tip: 'Dark green handwriting on a light background.' },
  { name: 'business-brand-leaves', where: 'Business Page tab, leaves along the right edge of the "Your brand matters" card', shape: 'portrait', accepts: 'image', tip: 'Green leaves, tall and narrow.' },

  // ── Referral Program tab ──────────────────────────────────────────────
  { name: 'referral-hero', where: 'Referral tab, top banner, right side', shape: 'landscape', accepts: 'image', tip: 'A megaphone with people cards and "Bring more businesses on board" handwriting.' },
  { name: 'referral-wallet', where: 'Referral tab, "Withdrawal details" card', shape: 'landscape', accepts: 'image', tip: 'A green wallet with naira notes.' },
  { name: 'referral-script', where: 'Referral tab, "It is easy, fast and rewarding!" handwriting on the bottom banner', shape: 'landscape', accepts: 'image', tip: 'Green handwriting with a curly arrow.' },

  // ── Support tab ───────────────────────────────────────────────────────
  { name: 'support-hero', where: 'Support tab, top banner, right side', shape: 'portrait', accepts: 'image', tip: 'A laptop with a chat bubble and "Real people. Real support." handwriting.' },
  { name: 'support-script', where: 'Support tab, "Your success matters to us" handwriting at the bottom', shape: 'landscape', accepts: 'image', tip: 'Green handwriting with a small heart.' },

  // ── Explore Stores page ───────────────────────────────────────────────
  { name: 'explore-hero', where: 'Explore Stores page, top banner, right side', shape: 'landscape', accepts: 'image', tip: 'A phone showing Sellapage stores, with plants and a "Shop Local, Grow Together" card.' },

  // ── Sign in / Create store ────────────────────────────────────────────
  { name: 'auth-hero', where: 'Sign in and Create Store pages, beside the form on desktop, behind it on phones', shape: 'landscape', accepts: 'image', tip: 'A phone showing a store, with Secure Checkout, Fast Delivery, Analytics and Happy Customers cards around it.' },
  { name: 'auth-otp-art', where: 'Code screen (SMS and email codes), left side', shape: 'landscape', accepts: 'image', tip: 'A phone with a Sellapage code notification and a green envelope bubble.' },
  { name: 'auth-script', where: 'Code screen, "Almost there!" handwriting under the list', shape: 'landscape', accepts: 'image', tip: 'Green handwriting with a small heart.' },

  // ── About page (2026-10-07 redesign) ──────────────────────────────────
  { name: 'about-hero', where: 'About page, top, the big photo on the right', shape: 'landscape', accepts: 'image', tip: 'A Nigerian businesswoman at a laptop, green blazer, plants, bright room.' },
  { name: 'about-mission', where: 'About page, "Our mission and vision", middle photo', shape: 'landscape', accepts: 'image', tip: 'A modern green glass building with palm trees and blue sky.' },
  { name: 'about-cta', where: 'About page, the green closing banner, right side', shape: 'landscape', accepts: 'image', tip: 'A proud boutique owner at her shop door holding her phone.' },
]

export const SLOT_NAMES = new Set(MEDIA_SLOTS.map((s) => s.name))
