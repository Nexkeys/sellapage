// src/utils/storeDesign.js
//
// Schema, defaults and sanitiser for the Store Design builder.
//
// Shared by the dashboard editor, the storefront renderer and the server
// handler on purpose: one definition of what a section is means the preview a
// vendor sees and the page a customer gets cannot drift apart.
//
// WHAT THIS IS, AND WHAT IT IS NOT
// This is the Shopify model: an ordered list of sections, each with its own
// settings, that the vendor reorders, shows, hides and restyles. It is not a
// free-form canvas like Wix, where any element can sit at any pixel. Shopify's
// own editor is a section list too, which is why this is achievable and still
// gives a vendor control over "any damn part" of the page.
//
// NOTHING HERE TOUCHES COMMERCE. Sections describe presentation only. Ordering,
// checkout, delivery and payments run through exactly the same code whether the
// design is on or off.

export const FONT_OPTIONS = [
  { id: 'bricolage', label: 'Bricolage Grotesque', stack: "'Bricolage Grotesque', system-ui, sans-serif" },
  { id: 'dmsans', label: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { id: 'montserrat', label: 'Montserrat', stack: "'Montserrat', system-ui, sans-serif" },
  { id: 'playfair', label: 'Playfair Display', stack: "'Playfair Display', Georgia, serif" },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', system-ui, sans-serif" },
  { id: 'system', label: 'System default', stack: 'system-ui, -apple-system, sans-serif' },
]

export const fontStack = (id) =>
  (FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]).stack

/**
 * Every section type the builder can place, with its editable fields.
 *
 * `fields` drives the settings panel automatically, so adding a section type
 * here gives it an editor with no extra UI code. Keeping that generated rather
 * than hand-written is what stops the editor and the renderer disagreeing.
 */
export const SECTION_TYPES = {
  announcement: {
    label: 'Announcement bar',
    hint: 'Scrolling strip across the very top. Good for free delivery or a sale.',
    fields: [
      { key: 'text', label: 'Message', type: 'text', max: 120, default: 'FREE DELIVERY ON ORDERS OVER 50,000' },
      { key: 'speed', label: 'Scroll speed', type: 'select', options: ['slow', 'normal', 'fast'], default: 'normal' },
      { key: 'bg', label: 'Background', type: 'color', default: '#000000' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  hero: {
    label: 'Hero',
    hint: 'The big opening block: headline, one line of copy, a button and your banner.',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', max: 90, default: 'Quality you can feel.' },
      { key: 'sub', label: 'Supporting line', type: 'textarea', max: 220, default: 'Browse the collection and order in minutes.' },
      { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: 'Shop Now' },
      { key: 'showStats', label: 'Show product and customer counts', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#f5f3f0' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
      { key: 'ctaBg', label: 'Button colour', type: 'color', default: '#0f172a' },
    ],
  },
  brandStrip: {
    label: 'Brand strip',
    hint: 'A band of names you stock. Purely for reassurance.',
    fields: [
      { key: 'items', label: 'Names, comma separated', type: 'text', max: 200, default: '' },
      { key: 'bg', label: 'Background', type: 'color', default: '#000000' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  productRow: {
    label: 'Product row',
    hint: 'A row of products. Choose newest, or a category.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'New Arrivals' },
      { key: 'source', label: 'Show', type: 'select', options: ['newest', 'category'], default: 'newest' },
      { key: 'category', label: 'Category (if chosen above)', type: 'text', max: 60, default: '' },
      { key: 'limit', label: 'How many', type: 'select', options: ['4', '8', '12'], default: '8' },
      { key: 'showViewAll', label: 'Show a View All button', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  categoryGrid: {
    label: 'Category tiles',
    hint: 'Large tiles for each category, so people can browse by type.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Browse by category' },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  reviews: {
    label: 'Customer reviews',
    hint: 'Your verified reviews. The strongest thing on the page for a first-time buyer.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Our happy customers' },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  ctaBanner: {
    label: 'Message us banner',
    hint: 'A dark band with a WhatsApp button, for people who want to ask first.',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', max: 90, default: "Questions? Message us and we'll help" },
      { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: 'Chat on WhatsApp' },
      { key: 'bg', label: 'Background', type: 'color', default: '#0f172a' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  richFooter: {
    label: 'Footer',
    hint: 'Links, contact details and the payment methods you accept.',
    fields: [
      { key: 'about', label: 'About your store', type: 'textarea', max: 300, default: '' },
      { key: 'showPayments', label: 'Show accepted payment methods', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
}

export const SECTION_ORDER = Object.keys(SECTION_TYPES)

/** A section with every field at its declared default. */
export function makeSection(type) {
  const def = SECTION_TYPES[type]
  if (!def) return null
  const settings = {}
  for (const f of def.fields) settings[f.key] = f.default
  return {
    // Date.now alone collides when two sections are added in the same tick.
    id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    visible: true,
    settings,
  }
}

/**
 * The layout a vendor gets the first time they switch the builder on.
 * Modelled on a working storefront rather than an empty page, because an empty
 * canvas is where most people give up.
 */
export function defaultDesign() {
  return {
    enabled: false,
    theme: {
      fontHeading: 'bricolage',
      fontBody: 'dmsans',
      pageBg: '#ffffff',
    },
    sections: [
      makeSection('announcement'),
      makeSection('hero'),
      makeSection('productRow'),
      makeSection('categoryGrid'),
      makeSection('reviews'),
      makeSection('ctaBanner'),
      makeSection('richFooter'),
    ],
    updatedAt: null,
  }
}

const clampText = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Only #rgb / #rrggbb. This value is written straight into an inline style on a
// public page, so anything else is refused rather than sanitised into something
// that might still be interpreted.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const safeColor = (v, fallback) => (HEX.test(String(v || '')) ? String(v) : fallback)

/**
 * Normalises anything the client sends into exactly the declared shape.
 *
 * Unknown section types, unknown fields and over-long text are dropped rather
 * than stored: this object is rendered on a public storefront and, once the
 * storefront renderer picks it up, into crawlable HTML.
 */
export function sanitizeDesign(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const base = defaultDesign()

  const theme = raw.theme && typeof raw.theme === 'object' ? raw.theme : {}
  const sections = Array.isArray(raw.sections) ? raw.sections : []

  const cleaned = sections
    .map((s) => {
      const def = SECTION_TYPES[s?.type]
      if (!def) return null
      const settings = {}
      for (const f of def.fields) {
        const v = s?.settings?.[f.key]
        if (f.type === 'color') settings[f.key] = safeColor(v, f.default)
        else if (f.type === 'toggle') settings[f.key] = v === undefined ? f.default : v === true
        else if (f.type === 'select') settings[f.key] = f.options.includes(String(v)) ? String(v) : f.default
        else settings[f.key] = clampText(v ?? f.default, f.max || 200)
      }
      return {
        id: clampText(s.id, 60) || makeSection(s.type).id,
        type: s.type,
        visible: s.visible !== false,
        settings,
      }
    })
    .filter(Boolean)
    // A page of 200 sections would be a denial of service on every visitor's
    // browser as much as on ours.
    .slice(0, 30)

  return {
    enabled: raw.enabled === true,
    theme: {
      fontHeading: FONT_OPTIONS.some((f) => f.id === theme.fontHeading) ? theme.fontHeading : base.theme.fontHeading,
      fontBody: FONT_OPTIONS.some((f) => f.id === theme.fontBody) ? theme.fontBody : base.theme.fontBody,
      pageBg: safeColor(theme.pageBg, base.theme.pageBg),
    },
    sections: cleaned.length ? cleaned : base.sections,
    updatedAt: Date.now(),
  }
}

/**
 * The single source of truth for whether a storefront should render the custom
 * design. Both the dashboard and the storefront ask this, so a downgrade can
 * never leave the two disagreeing.
 *
 * Downgrading does NOT delete anything: the design stays on the document and
 * comes back exactly as it was if the vendor upgrades again.
 */
export function isDesignLive(store) {
  const plan = String(store?.plan || 'starter').toLowerCase()
  return plan === 'premium' && store?.storeDesign?.enabled === true
}
