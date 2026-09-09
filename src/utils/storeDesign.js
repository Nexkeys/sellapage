// src/utils/storeDesign.js
//
// Schema, defaults and sanitiser for the Store Design builder.
//
// Shared by the dashboard editor, the storefront renderer and the server
// handler on purpose: one definition of what a section is means the preview a
// vendor sees and the page a customer gets cannot drift apart.
//
// THE MODEL
// This is the Shopify model: global theme settings, plus an ordered list of
// sections each with its own settings, that the vendor reorders, shows, hides
// and restyles. Card styling lives in the THEME rather than per section, the
// way Shopify does it, so a vendor sets their card look once instead of
// re-setting it on every row.
//
// PRODUCTS AND SERVICES ARE DIFFERENT STOREFRONTS.
// A product store sells a thing from a grid; a service store sells time from a
// booking card. They need different sections and different card settings, so
// every section declares `appliesTo` and the editor only offers what the
// vendor's own vendorType supports. A "both" vendor gets both sets.
//
// NOTHING HERE TOUCHES COMMERCE. Sections describe presentation only. Ordering,
// booking, checkout, delivery and payments run through exactly the same code
// whether the design is on or off.

/**
 * Fonts. `google` is the Google Fonts family spec; `preloaded` marks the two
 * already in index.html.
 *
 * These are NOT all loaded up front. A storefront loads only the families it
 * actually uses, via fontHref() below. Twenty families on a 1GB Android phone
 * on Nigerian mobile data would cost more than the rest of the page put
 * together.
 */
export const FONT_OPTIONS = [
  { id: 'system', label: 'System default', stack: 'system-ui, -apple-system, sans-serif' },
  { id: 'bricolage', label: 'Bricolage Grotesque', stack: "'Bricolage Grotesque', system-ui, sans-serif", google: 'Bricolage Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800', preloaded: true },
  { id: 'dmsans', label: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif", google: 'DM Sans:opsz,wght@9..40,400;9..40,500;9..40,700', preloaded: true },
  { id: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;700;900' },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', system-ui, sans-serif", google: 'Poppins:wght@400;500;700;800' },
  { id: 'montserrat', label: 'Montserrat', stack: "'Montserrat', system-ui, sans-serif", google: 'Montserrat:wght@400;600;800;900' },
  { id: 'raleway', label: 'Raleway', stack: "'Raleway', system-ui, sans-serif", google: 'Raleway:wght@400;600;800' },
  { id: 'nunito', label: 'Nunito', stack: "'Nunito', system-ui, sans-serif", google: 'Nunito:wght@400;600;800;900' },
  { id: 'worksans', label: 'Work Sans', stack: "'Work Sans', system-ui, sans-serif", google: 'Work Sans:wght@400;600;800' },
  { id: 'outfit', label: 'Outfit', stack: "'Outfit', system-ui, sans-serif", google: 'Outfit:wght@400;600;800;900' },
  { id: 'manrope', label: 'Manrope', stack: "'Manrope', system-ui, sans-serif", google: 'Manrope:wght@400;600;800' },
  { id: 'sora', label: 'Sora', stack: "'Sora', system-ui, sans-serif", google: 'Sora:wght@400;600;800' },
  { id: 'spacegrotesk', label: 'Space Grotesk', stack: "'Space Grotesk', system-ui, sans-serif", google: 'Space Grotesk:wght@400;600;700' },
  { id: 'archivo', label: 'Archivo Black', stack: "'Archivo Black', system-ui, sans-serif", google: 'Archivo Black' },
  { id: 'oswald', label: 'Oswald', stack: "'Oswald', system-ui, sans-serif", google: 'Oswald:wght@400;600;700' },
  { id: 'bebas', label: 'Bebas Neue', stack: "'Bebas Neue', Impact, sans-serif", google: 'Bebas Neue' },
  { id: 'playfair', label: 'Playfair Display', stack: "'Playfair Display', Georgia, serif", google: 'Playfair Display:wght@400;600;800' },
  { id: 'lora', label: 'Lora', stack: "'Lora', Georgia, serif", google: 'Lora:wght@400;600;700' },
  { id: 'cormorant', label: 'Cormorant Garamond', stack: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant Garamond:wght@400;600;700' },
  { id: 'dmserif', label: 'DM Serif Display', stack: "'DM Serif Display', Georgia, serif", google: 'DM Serif Display' },
  { id: 'fraunces', label: 'Fraunces', stack: "'Fraunces', Georgia, serif", google: 'Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900' },
  { id: 'spacemono', label: 'Space Mono', stack: "'Space Mono', ui-monospace, monospace", google: 'Space Mono:wght@400;700' },
]

const FONT_BY_ID = Object.fromEntries(FONT_OPTIONS.map((f) => [f.id, f]))

export const fontStack = (id) => (FONT_BY_ID[id] || FONT_OPTIONS[1]).stack

/**
 * Google Fonts href for just the families a design uses, or null when both are
 * already in index.html. Two families maximum, by construction.
 *
 * Google's css2 endpoint needs its `:`, `,`, `;`, `@` and `.` literal, so the
 * family spec is passed through with only spaces encoded.
 */
export function fontHref(theme) {
  const families = [...new Set(
    [theme?.fontHeading, theme?.fontBody]
      .map((id) => FONT_BY_ID[id])
      .filter((f) => f && f.google && !f.preloaded)
      .map((f) => f.google)
  )]
  if (!families.length) return null
  const q = families.map((f) => `family=${f.replace(/ /g, '+')}`).join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

/** Corner rounding, applied to cards, images and buttons together. */
export const RADIUS = { sharp: '0px', soft: '10px', round: '18px', pill: '28px' }
export const radiusValue = (k) => RADIUS[k] || RADIUS.soft

export const SHADOWS = {
  none: 'none',
  subtle: '0 1px 3px rgba(0,0,0,0.08)',
  soft: '0 4px 14px rgba(0,0,0,0.08)',
  strong: '0 10px 30px rgba(0,0,0,0.14)',
}
export const shadowValue = (k) => SHADOWS[k] ?? SHADOWS.subtle

export const IMAGE_RATIOS = { square: '1 / 1', portrait: '3 / 4', tall: '2 / 3', landscape: '4 / 3', wide: '16 / 9' }
export const ratioValue = (k) => IMAGE_RATIOS[k] || IMAGE_RATIOS.square

export const MAX_WIDTHS = { narrow: '48rem', normal: '72rem', wide: '84rem', full: '100%' }
export const widthValue = (k) => MAX_WIDTHS[k] || MAX_WIDTHS.normal

/**
 * Global theme fields. Declarative for the same reason sections are: the editor
 * builds its panel from this list, so a new setting needs no new UI code.
 */
export const THEME_FIELDS = [
  { key: 'fontHeading', label: 'Heading font', type: 'font', default: 'bricolage' },
  { key: 'fontBody', label: 'Body font', type: 'font', default: 'dmsans' },
  { key: 'pageBg', label: 'Page background', type: 'color', default: '#ffffff' },
  { key: 'textColor', label: 'Body text', type: 'color', default: '#0f172a' },
  { key: 'primary', label: 'Primary (buttons)', type: 'color', default: '#0f172a' },
  { key: 'onPrimary', label: 'Text on buttons', type: 'color', default: '#ffffff' },
  { key: 'accent', label: 'Accent (prices, highlights)', type: 'color', default: '#0f766e' },
  { key: 'border', label: 'Borders and lines', type: 'color', default: '#e2e8f0' },
  { key: 'radius', label: 'Corner style', type: 'select', options: ['sharp', 'soft', 'round', 'pill'], default: 'soft' },
  { key: 'headingCase', label: 'Heading case', type: 'select', options: ['normal', 'uppercase'], default: 'uppercase' },
  { key: 'headingAlign', label: 'Heading alignment', type: 'select', options: ['left', 'center'], default: 'center' },
  { key: 'width', label: 'Content width', type: 'select', options: ['narrow', 'normal', 'wide', 'full'], default: 'normal' },
]

/** Product card look. Applies to every product card on the designed page. */
export const PRODUCT_CARD_FIELDS = [
  { key: 'imageRatio', label: 'Image shape', type: 'select', options: ['square', 'portrait', 'tall', 'landscape', 'wide'], default: 'square' },
  { key: 'imageFit', label: 'Image fill', type: 'select', options: ['cover', 'contain'], default: 'cover' },
  { key: 'cardBg', label: 'Card background', type: 'color', default: '#ffffff' },
  { key: 'showBorder', label: 'Card border', type: 'toggle', default: false },
  { key: 'shadow', label: 'Card shadow', type: 'select', options: ['none', 'subtle', 'soft', 'strong'], default: 'none' },
  { key: 'hover', label: 'Hover effect', type: 'select', options: ['none', 'lift', 'zoom', 'both'], default: 'zoom' },
  { key: 'align', label: 'Text alignment', type: 'select', options: ['left', 'center'], default: 'left' },
  { key: 'showPrice', label: 'Show price', type: 'toggle', default: true },
  { key: 'showCategory', label: 'Show category', type: 'toggle', default: false },
  { key: 'showButton', label: 'Show add to cart button', type: 'toggle', default: true },
  { key: 'buttonLabel', label: 'Button text', type: 'text', max: 24, default: 'Add to cart' },
  { key: 'buttonStyle', label: 'Button style', type: 'select', options: ['solid', 'outline', 'soft'], default: 'solid' },
]

/** Service booking card look. A different product, so a different card. */
export const SERVICE_CARD_FIELDS = [
  { key: 'layout', label: 'Card layout', type: 'select', options: ['stacked', 'horizontal'], default: 'stacked' },
  { key: 'imageRatio', label: 'Image shape', type: 'select', options: ['square', 'portrait', 'landscape', 'wide'], default: 'landscape' },
  { key: 'cardBg', label: 'Card background', type: 'color', default: '#ffffff' },
  { key: 'showBorder', label: 'Card border', type: 'toggle', default: true },
  { key: 'shadow', label: 'Card shadow', type: 'select', options: ['none', 'subtle', 'soft', 'strong'], default: 'subtle' },
  { key: 'hover', label: 'Hover effect', type: 'select', options: ['none', 'lift', 'zoom', 'both'], default: 'lift' },
  { key: 'align', label: 'Text alignment', type: 'select', options: ['left', 'center'], default: 'left' },
  { key: 'showDuration', label: 'Show duration', type: 'toggle', default: true },
  { key: 'showPrice', label: 'Show price', type: 'toggle', default: true },
  { key: 'pricePrefix', label: 'Price prefix', type: 'select', options: ['none', 'From', 'Starting at'], default: 'From' },
  { key: 'showDescription', label: 'Show short description', type: 'toggle', default: true },
  { key: 'buttonLabel', label: 'Booking button text', type: 'text', max: 24, default: 'Book now' },
  { key: 'buttonStyle', label: 'Button style', type: 'select', options: ['solid', 'outline', 'soft'], default: 'solid' },
]

/**
 * A single popup, shown once per visitor by default.
 *
 * Deliberately one popup and not a builder: a vendor who can stack popups will,
 * and a storefront that greets a first-time buyer with three modals loses them.
 */
export const POPUP_FIELDS = [
  { key: 'enabled', label: 'Show a popup', type: 'toggle', default: false },
  { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Get 10% off your first order' },
  { key: 'body', label: 'Message', type: 'textarea', max: 240, default: 'Message us on WhatsApp to claim it before you order.' },
  { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: 'Claim on WhatsApp' },
  { key: 'ctaAction', label: 'Button does', type: 'select', options: ['whatsapp', 'enquiry', 'close'], default: 'whatsapp' },
  { key: 'delay', label: 'Show after (seconds)', type: 'select', options: ['3', '6', '10', '20'], default: '6' },
  { key: 'frequency', label: 'How often', type: 'select', options: ['once', 'everyVisit'], default: 'once' },
  { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
  { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
]

/**
 * Every section type the builder can place.
 *
 * `appliesTo` gates which vendors are offered it:
 *   'any'      both product and service stores
 *   'products' product stores (and "both" vendors)
 *   'services' service stores (and "both" vendors)
 */
export const SECTION_TYPES = {
  announcement: {
    label: 'Announcement bar',
    hint: 'Scrolling strip across the very top. Good for free delivery or a sale.',
    appliesTo: 'any',
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
    appliesTo: 'any',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', max: 90, default: 'Quality you can feel.' },
      { key: 'sub', label: 'Supporting line', type: 'textarea', max: 220, default: 'Browse the collection and order in minutes.' },
      { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: 'Shop Now' },
      { key: 'ctaAction', label: 'Button goes to', type: 'select', options: ['catalogue', 'enquiry', 'whatsapp'], default: 'catalogue' },
      { key: 'layout', label: 'Layout', type: 'select', options: ['split', 'centered', 'imageBehind'], default: 'split' },
      { key: 'height', label: 'Height', type: 'select', options: ['compact', 'normal', 'tall'], default: 'normal' },
      { key: 'showStats', label: 'Show counts', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#f5f3f0' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
      { key: 'ctaBg', label: 'Button colour', type: 'color', default: '#0f172a' },
      { key: 'ctaFg', label: 'Button text colour', type: 'color', default: '#ffffff' },
    ],
  },
  brandStrip: {
    label: 'Brand strip',
    hint: 'A band of names you stock or work with. Purely for reassurance.',
    appliesTo: 'any',
    fields: [
      { key: 'items', label: 'Names, comma separated', type: 'text', max: 200, default: '' },
      { key: 'size', label: 'Text size', type: 'select', options: ['small', 'normal', 'large'], default: 'normal' },
      { key: 'bg', label: 'Background', type: 'color', default: '#000000' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  productRow: {
    label: 'Product row',
    hint: 'A row of products. Choose newest, a category, or your discounted items.',
    appliesTo: 'products',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'New Arrivals' },
      { key: 'sub', label: 'Sub heading', type: 'text', max: 120, default: '' },
      { key: 'source', label: 'Show', type: 'select', options: ['newest', 'category', 'discounted'], default: 'newest' },
      { key: 'category', label: 'Category (if chosen above)', type: 'category', max: 60, default: '' },
      { key: 'limit', label: 'How many', type: 'select', options: ['2', '4', '6', '8', '12'], default: '8' },
      { key: 'columns', label: 'Columns on desktop', type: 'select', options: ['2', '3', '4', '5'], default: '4' },
      { key: 'mobileColumns', label: 'Columns on mobile', type: 'select', options: ['1', '2'], default: '2' },
      { key: 'showViewAll', label: 'Show a View All button', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  serviceRow: {
    label: 'Service list',
    hint: 'Your bookable services, as booking cards customers can act on.',
    appliesTo: 'services',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Our Services' },
      { key: 'sub', label: 'Sub heading', type: 'text', max: 120, default: 'Pick what you need and book a time.' },
      { key: 'source', label: 'Show', type: 'select', options: ['all', 'category'], default: 'all' },
      { key: 'category', label: 'Category (if chosen above)', type: 'category', max: 60, default: '' },
      { key: 'limit', label: 'How many', type: 'select', options: ['3', '6', '9', '12'], default: '6' },
      { key: 'columns', label: 'Columns on desktop', type: 'select', options: ['1', '2', '3'], default: '3' },
      { key: 'showViewAll', label: 'Show a View All button', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  categoryGrid: {
    label: 'Category tiles',
    hint: 'Tiles for each category, so people can browse by type. Clicking one filters the store.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Browse by category' },
      { key: 'style', label: 'Tile style', type: 'select', options: ['bar', 'tile', 'pill'], default: 'bar' },
      { key: 'columns', label: 'Columns on desktop', type: 'select', options: ['2', '3', '4'], default: '2' },
      { key: 'tileBg', label: 'Tile colour', type: 'color', default: '#e2e8f0' },
      { key: 'tileFg', label: 'Tile text colour', type: 'color', default: '#0f172a' },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  textBlock: {
    label: 'Text block',
    hint: 'A headline and a paragraph. Your story, your promise, your terms.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 80, default: 'Why shop with us' },
      { key: 'body', label: 'Text', type: 'textarea', max: 900, default: '' },
      { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center'], default: 'center' },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
  trustBadges: {
    label: 'Trust badges',
    hint: 'Short promises with icons. Strong for a first-time buyer who does not know you.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading (optional)', type: 'text', max: 60, default: '' },
      { key: 'item1', label: 'Badge 1', type: 'text', max: 40, default: 'Fast delivery' },
      { key: 'item2', label: 'Badge 2', type: 'text', max: 40, default: 'Secure payment' },
      { key: 'item3', label: 'Badge 3', type: 'text', max: 40, default: 'Real customer support' },
      { key: 'item4', label: 'Badge 4', type: 'text', max: 40, default: '' },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
  faq: {
    label: 'Questions and answers',
    hint: 'Answer what people ask before buying. Also read by Google and AI assistants.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Questions people ask' },
      { key: 'q1', label: 'Question 1', type: 'text', max: 120, default: 'How long does delivery take?' },
      { key: 'a1', label: 'Answer 1', type: 'textarea', max: 400, default: '' },
      { key: 'q2', label: 'Question 2', type: 'text', max: 120, default: 'Can I pay on delivery?' },
      { key: 'a2', label: 'Answer 2', type: 'textarea', max: 400, default: '' },
      { key: 'q3', label: 'Question 3', type: 'text', max: 120, default: '' },
      { key: 'a3', label: 'Answer 3', type: 'textarea', max: 400, default: '' },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
  reviews: {
    label: 'Customer reviews',
    hint: 'Your verified reviews. The strongest thing on the page for a first-time buyer.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Our happy customers' },
      { key: 'columns', label: 'Columns on desktop', type: 'select', options: ['2', '3'], default: '3' },
      { key: 'cardBg', label: 'Card background', type: 'color', default: '#ffffff' },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Heading colour', type: 'color', default: '#0f172a' },
    ],
  },
  enquiry: {
    label: 'Enquiry form',
    hint: 'A contact form on the page. Every message becomes a lead in your dashboard.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Send us a message' },
      { key: 'sub', label: 'Supporting line', type: 'textarea', max: 200, default: 'Tell us what you need and we will get back to you.' },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
  ctaBanner: {
    label: 'Message us banner',
    hint: 'A band with a WhatsApp button, for people who want to ask before they buy.',
    appliesTo: 'any',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', max: 90, default: "Questions? Message us and we'll help" },
      { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: 'Chat on WhatsApp' },
      { key: 'full', label: 'Full width band', type: 'toggle', default: false },
      { key: 'bg', label: 'Background', type: 'color', default: '#0f172a' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  countdown: {
    label: 'Countdown timer',
    hint: 'Counts down to a date. Real urgency, for a sale that genuinely ends.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Sale ends in' },
      { key: 'endsAt', label: 'Ends on', type: 'date', default: '' },
      { key: 'expiredText', label: 'Text once it ends', type: 'text', max: 60, default: 'This offer has ended' },
      { key: 'bg', label: 'Background', type: 'color', default: '#111827' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  imageBanner: {
    label: 'Image banner',
    hint: 'A wide promotional image with optional text over it.',
    appliesTo: 'any',
    fields: [
      { key: 'imageUrl', label: 'Image link', type: 'url', max: 500, default: '' },
      { key: 'headline', label: 'Text over the image', type: 'text', max: 80, default: '' },
      { key: 'ctaLabel', label: 'Button text', type: 'text', max: 30, default: '' },
      { key: 'height', label: 'Height', type: 'select', options: ['short', 'normal', 'tall'], default: 'normal' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#ffffff' },
    ],
  },
  socialLinks: {
    label: 'Social links',
    hint: 'Send people to your Instagram, TikTok and WhatsApp, where Nigerian customers already are.',
    appliesTo: 'any',
    fields: [
      { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Follow us' },
      { key: 'sub', label: 'Supporting line', type: 'text', max: 120, default: '' },
      { key: 'instagram', label: 'Instagram username', type: 'handle', max: 40, default: '' },
      { key: 'tiktok', label: 'TikTok username', type: 'handle', max: 40, default: '' },
      { key: 'facebook', label: 'Facebook username or page', type: 'handle', max: 60, default: '' },
      { key: 'x', label: 'X username', type: 'handle', max: 40, default: '' },
      { key: 'bg', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
  richFooter: {
    label: 'Footer',
    hint: 'Links, contact details and the payment methods you accept.',
    appliesTo: 'any',
    fields: [
      { key: 'about', label: 'About your store', type: 'textarea', max: 300, default: '' },
      { key: 'shopHeading', label: 'First column heading', type: 'text', max: 30, default: 'Shop' },
      { key: 'showPayments', label: 'Show accepted payment methods', type: 'toggle', default: true },
      { key: 'bg', label: 'Background', type: 'color', default: '#f8fafc' },
      { key: 'fg', label: 'Text colour', type: 'color', default: '#0f172a' },
    ],
  },
}

export const SECTION_ORDER = Object.keys(SECTION_TYPES)

export const vendorHasProducts = (t) => t === 'products' || t === 'both'
export const vendorHasServices = (t) => t === 'services' || t === 'both'

/** Section types a given vendorType is allowed to place. */
export function sectionsForVendor(vendorType) {
  const t = String(vendorType || 'products').toLowerCase()
  return SECTION_ORDER.filter((k) => {
    const a = SECTION_TYPES[k].appliesTo
    if (a === 'any') return true
    if (a === 'products') return vendorHasProducts(t)
    return vendorHasServices(t)
  })
}

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
    hideOnMobile: false,
    scheduleStart: '',
    scheduleEnd: '',
    settings,
  }
}

/**
 * Whether a scheduled section should be on screen right now.
 *
 * Dates are compared as local calendar days, not timestamps: a vendor who sets
 * a banner to end on the 25th means the end of the 25th in Lagos, not midnight
 * UTC, which would switch it off an hour before they expect.
 */
export function isSectionLiveNow(section, now = new Date()) {
  if (section?.visible === false) return false
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (section?.scheduleStart && today < section.scheduleStart) return false
  if (section?.scheduleEnd && today > section.scheduleEnd) return false
  return true
}

const fieldDefaults = (fields) => Object.fromEntries(fields.map((f) => [f.key, f.default]))

/**
 * The layout a vendor gets the first time they switch the builder on. Modelled
 * on a working storefront rather than an empty page, because an empty canvas is
 * where most people give up. Seeded from vendorType so a service vendor never
 * opens the builder onto a product grid they cannot fill.
 */
export function defaultDesign(vendorType = 'products') {
  const t = String(vendorType || 'products').toLowerCase()
  const rows = []
  if (vendorHasProducts(t)) rows.push(makeSection('productRow'))
  if (vendorHasServices(t)) rows.push(makeSection('serviceRow'))

  return {
    enabled: false,
    theme: { ...fieldDefaults(THEME_FIELDS) },
    productCard: { ...fieldDefaults(PRODUCT_CARD_FIELDS) },
    serviceCard: { ...fieldDefaults(SERVICE_CARD_FIELDS) },
    popup: { ...fieldDefaults(POPUP_FIELDS) },
    pages: defaultPages(),
    tracking: defaultTracking(),
    sections: [
      makeSection('announcement'),
      makeSection('hero'),
      ...rows,
      makeSection('categoryGrid'),
      makeSection('trustBadges'),
      makeSection('reviews'),
      makeSection('faq'),
      makeSection('ctaBanner'),
      makeSection('richFooter'),
    ],
    updatedAt: null,
  }
}

// Single-line text is collapsed; multi-line text keeps its paragraph breaks.
// Collapsing both with one function was silently destroying paragraphs.
const clampText = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const clampMultiline = (v, max) =>
  String(v ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)

// Only #rgb / #rrggbb. This value is written straight into an inline style on a
// public page, so anything else is refused rather than sanitised into something
// that might still be interpreted.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const safeColor = (v, fallback) => (HEX.test(String(v || '')) ? String(v) : fallback)

// Same reasoning as colours: this ends up in an href or a src on a public page.
// Only absolute http(s) survives, so javascript:, data: and vbscript: cannot.
function safeUrl(v, max = 500) {
  const raw = String(v || '').trim().slice(0, max)
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
}

// A social username, not a URL. Strips @, any pasted profile link and anything
// that is not a legal handle character, so the renderer can build the link.
function safeHandle(v, max = 40) {
  let s = String(v || '').trim()
  if (!s) return ''
  if (s.includes('/')) s = s.split('/').filter(Boolean).pop() || ''
  return s.replace(/^@+/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, max)
}

// YYYY-MM-DD only, and it must be a real date. "2026-02-31" is refused rather
// than silently rolling over into March.
function safeDate(v) {
  const s = String(v || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''
  const d = new Date(`${s}T00:00:00`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : ''
}

/** Applies one declared field list to one untrusted object. */
function cleanFields(fields, raw) {
  const out = {}
  const src = raw && typeof raw === 'object' ? raw : {}
  for (const f of fields) {
    const v = src[f.key]
    if (f.type === 'color') out[f.key] = safeColor(v, f.default)
    else if (f.type === 'toggle') out[f.key] = v === undefined ? f.default : v === true
    else if (f.type === 'select') out[f.key] = f.options.includes(String(v)) ? String(v) : f.default
    else if (f.type === 'font') out[f.key] = FONT_BY_ID[v] ? v : f.default
    else if (f.type === 'url') out[f.key] = safeUrl(v, f.max || 500)
    else if (f.type === 'handle') out[f.key] = safeHandle(v, f.max || 40)
    else if (f.type === 'date') out[f.key] = safeDate(v)
    else if (f.type === 'textarea') out[f.key] = clampMultiline(v ?? f.default, f.max || 400)
    else out[f.key] = clampText(v ?? f.default, f.max || 200)
  }
  return out
}

/**
 * Cleans one ordered list of sections. Shared by the home layout and every
 * custom page, so a section behaves identically wherever it is placed.
 *
 * A page of 200 sections would be a denial of service on every visitor's
 * browser as much as on ours, hence the cap.
 */
function cleanSections(list) {
  return (Array.isArray(list) ? list : [])
    .map((s) => {
      const def = SECTION_TYPES[s?.type]
      if (!def) return null
      return {
        id: clampText(s.id, 60) || makeSection(s.type).id,
        type: s.type,
        visible: s.visible !== false,
        hideOnMobile: s.hideOnMobile === true,
        scheduleStart: safeDate(s?.scheduleStart),
        scheduleEnd: safeDate(s?.scheduleEnd),
        settings: cleanFields(def.fields, s?.settings),
      }
    })
    .filter(Boolean)
    .slice(0, 40)
}

/**
 * Normalises anything the client sends into exactly the declared shape.
 *
 * Unknown section types, unknown fields and over-long text are dropped rather
 * than stored: this object is rendered on a public storefront and, once the
 * storefront renderer picks it up, into crawlable HTML.
 */
export function sanitizeDesign(input, vendorType = 'products') {
  const raw = input && typeof input === 'object' ? input : {}
  const base = defaultDesign(vendorType)

  const cleaned = cleanSections(raw.sections)

  return {
    enabled: raw.enabled === true,
    theme: cleanFields(THEME_FIELDS, raw.theme),
    productCard: cleanFields(PRODUCT_CARD_FIELDS, raw.productCard),
    serviceCard: cleanFields(SERVICE_CARD_FIELDS, raw.serviceCard),
    popup: cleanFields(POPUP_FIELDS, raw.popup),
    pages: cleanPages(raw.pages),
    tracking: cleanTracking(raw.tracking),
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

/**
 * Ready-made store looks.
 *
 * The single most useful thing in this builder. A vendor who cannot design is
 * not helped by twelve colour pickers; they are helped by picking "Luxury" and
 * getting a coherent store in one tap, which they can then adjust.
 *
 * Each preset carries a small palette as well as the theme, because a preset
 * that changed only the global theme would leave every section on its old
 * background and look broken. applyPreset() repaints the sections too.
 */
export const PRESETS = [
  {
    id: 'clean',
    label: 'Clean',
    hint: 'White, simple, gets out of the way. Works for anything.',
    swatch: ['#ffffff', '#0f172a', '#0f766e'],
    theme: { fontHeading: 'inter', fontBody: 'dmsans', pageBg: '#ffffff', textColor: '#0f172a', primary: '#0f172a', onPrimary: '#ffffff', accent: '#0f766e', border: '#e2e8f0', radius: 'soft', headingCase: 'normal', headingAlign: 'center', width: 'normal' },
    palette: { dark: '#0f172a', onDark: '#ffffff', page: '#ffffff', alt: '#f8fafc', text: '#0f172a', tile: '#e2e8f0', onTile: '#0f172a', hero: '#f5f3f0' },
    productCard: { imageRatio: 'square', shadow: 'none', showBorder: false, hover: 'zoom', buttonStyle: 'solid', align: 'left', cardBg: '#ffffff' },
    serviceCard: { layout: 'stacked', shadow: 'subtle', showBorder: true, hover: 'lift', buttonStyle: 'solid', cardBg: '#ffffff' },
  },
  {
    id: 'bold',
    label: 'Bold Street',
    hint: 'Black and yellow, heavy type. Sneakers, streetwear, gadgets.',
    swatch: ['#000000', '#facc15', '#ffffff'],
    theme: { fontHeading: 'archivo', fontBody: 'worksans', pageBg: '#ffffff', textColor: '#000000', primary: '#000000', onPrimary: '#facc15', accent: '#ca8a04', border: '#000000', radius: 'sharp', headingCase: 'uppercase', headingAlign: 'left', width: 'wide' },
    palette: { dark: '#000000', onDark: '#facc15', page: '#ffffff', alt: '#fefce8', text: '#000000', tile: '#facc15', onTile: '#000000', hero: '#facc15' },
    productCard: { imageRatio: 'square', shadow: 'none', showBorder: true, hover: 'lift', buttonStyle: 'solid', align: 'left', cardBg: '#ffffff' },
    serviceCard: { layout: 'horizontal', shadow: 'none', showBorder: true, hover: 'lift', buttonStyle: 'solid', cardBg: '#ffffff' },
  },
  {
    id: 'luxury',
    label: 'Luxury',
    hint: 'Cream and gold, serif type. Jewellery, perfume, aso ebi, bridal.',
    swatch: ['#faf7f2', '#7c6a4f', '#1c1917'],
    theme: { fontHeading: 'playfair', fontBody: 'lora', pageBg: '#faf7f2', textColor: '#1c1917', primary: '#7c6a4f', onPrimary: '#ffffff', accent: '#a8894f', border: '#e7ded0', radius: 'round', headingCase: 'normal', headingAlign: 'center', width: 'narrow' },
    palette: { dark: '#1c1917', onDark: '#faf7f2', page: '#faf7f2', alt: '#f2ece1', text: '#1c1917', tile: '#e7ded0', onTile: '#1c1917', hero: '#f2ece1' },
    productCard: { imageRatio: 'portrait', shadow: 'none', showBorder: false, hover: 'zoom', buttonStyle: 'outline', align: 'center', cardBg: '#faf7f2' },
    serviceCard: { layout: 'stacked', shadow: 'none', showBorder: true, hover: 'zoom', buttonStyle: 'outline', align: 'center', cardBg: '#faf7f2' },
  },
  {
    id: 'fresh',
    label: 'Fresh',
    hint: 'Green and airy. Food, groceries, farm produce, drinks.',
    swatch: ['#f0fdf4', '#15803d', '#052e16'],
    theme: { fontHeading: 'nunito', fontBody: 'nunito', pageBg: '#ffffff', textColor: '#052e16', primary: '#15803d', onPrimary: '#ffffff', accent: '#15803d', border: '#dcfce7', radius: 'round', headingCase: 'normal', headingAlign: 'center', width: 'normal' },
    palette: { dark: '#14532d', onDark: '#ffffff', page: '#ffffff', alt: '#f0fdf4', text: '#052e16', tile: '#dcfce7', onTile: '#14532d', hero: '#f0fdf4' },
    productCard: { imageRatio: 'square', shadow: 'soft', showBorder: false, hover: 'lift', buttonStyle: 'solid', align: 'center', cardBg: '#ffffff' },
    serviceCard: { layout: 'stacked', shadow: 'soft', showBorder: false, hover: 'lift', buttonStyle: 'solid', cardBg: '#ffffff' },
  },
  {
    id: 'beauty',
    label: 'Beauty',
    hint: 'Soft rose, elegant type. Salon, makeup, spa, nails, lashes.',
    swatch: ['#fff1f2', '#be185d', '#500724'],
    theme: { fontHeading: 'cormorant', fontBody: 'dmsans', pageBg: '#ffffff', textColor: '#500724', primary: '#be185d', onPrimary: '#ffffff', accent: '#be185d', border: '#fce7f3', radius: 'pill', headingCase: 'normal', headingAlign: 'center', width: 'normal' },
    palette: { dark: '#500724', onDark: '#fff1f2', page: '#ffffff', alt: '#fff1f2', text: '#500724', tile: '#fce7f3', onTile: '#831843', hero: '#fff1f2' },
    productCard: { imageRatio: 'portrait', shadow: 'soft', showBorder: false, hover: 'both', buttonStyle: 'soft', align: 'center', cardBg: '#ffffff' },
    serviceCard: { layout: 'stacked', shadow: 'soft', showBorder: false, hover: 'lift', buttonStyle: 'solid', align: 'center', cardBg: '#ffffff' },
  },
  {
    id: 'tech',
    label: 'Tech',
    hint: 'Dark and sharp. Phones, laptops, accessories, repairs.',
    swatch: ['#0b1220', '#38bdf8', '#e2e8f0'],
    theme: { fontHeading: 'spacegrotesk', fontBody: 'inter', pageBg: '#0b1220', textColor: '#e2e8f0', primary: '#38bdf8', onPrimary: '#0b1220', accent: '#38bdf8', border: '#1e293b', radius: 'sharp', headingCase: 'uppercase', headingAlign: 'left', width: 'wide' },
    palette: { dark: '#020617', onDark: '#e2e8f0', page: '#0b1220', alt: '#0f172a', text: '#e2e8f0', tile: '#1e293b', onTile: '#e2e8f0', hero: '#0f172a' },
    productCard: { imageRatio: 'square', cardBg: '#0f172a', shadow: 'none', showBorder: true, hover: 'lift', buttonStyle: 'solid', align: 'left' },
    serviceCard: { layout: 'horizontal', cardBg: '#0f172a', shadow: 'none', showBorder: true, hover: 'lift', buttonStyle: 'solid' },
  },
  {
    id: 'studio',
    label: 'Studio',
    hint: 'Navy and teal, calm and professional. Built for services.',
    swatch: ['#f8fafc', '#0f766e', '#0f172a'],
    theme: { fontHeading: 'manrope', fontBody: 'manrope', pageBg: '#ffffff', textColor: '#0f172a', primary: '#0f766e', onPrimary: '#ffffff', accent: '#0f766e', border: '#e2e8f0', radius: 'soft', headingCase: 'normal', headingAlign: 'left', width: 'normal' },
    palette: { dark: '#0f172a', onDark: '#ffffff', page: '#ffffff', alt: '#f8fafc', text: '#0f172a', tile: '#ccfbf1', onTile: '#134e4a', hero: '#f0fdfa' },
    productCard: { imageRatio: 'landscape', shadow: 'subtle', showBorder: true, hover: 'lift', buttonStyle: 'solid', align: 'left', cardBg: '#ffffff' },
    serviceCard: { layout: 'horizontal', shadow: 'subtle', showBorder: true, hover: 'lift', buttonStyle: 'solid', showDescription: true, cardBg: '#ffffff' },
  },
  {
    id: 'market',
    label: 'Market',
    hint: 'Warm orange, busy and friendly. General store, mall, mixed stock.',
    swatch: ['#fff7ed', '#ea580c', '#431407'],
    theme: { fontHeading: 'outfit', fontBody: 'dmsans', pageBg: '#ffffff', textColor: '#431407', primary: '#ea580c', onPrimary: '#ffffff', accent: '#c2410c', border: '#fed7aa', radius: 'soft', headingCase: 'uppercase', headingAlign: 'center', width: 'wide' },
    palette: { dark: '#7c2d12', onDark: '#ffffff', page: '#ffffff', alt: '#fff7ed', text: '#431407', tile: '#fed7aa', onTile: '#7c2d12', hero: '#fff7ed' },
    productCard: { imageRatio: 'square', shadow: 'subtle', showBorder: false, hover: 'zoom', buttonStyle: 'solid', align: 'left', cardBg: '#ffffff' },
    serviceCard: { layout: 'stacked', shadow: 'subtle', showBorder: false, hover: 'lift', buttonStyle: 'solid', cardBg: '#ffffff' },
  },
]

/** Which palette colour each section type paints itself with. */
const SECTION_PAINT = {
  announcement: (p) => ({ bg: p.dark, fg: p.onDark }),
  hero: (p) => ({ bg: p.hero, fg: p.text, ctaBg: p.dark, ctaFg: p.onDark }),
  brandStrip: (p) => ({ bg: p.dark, fg: p.onDark }),
  productRow: (p) => ({ bg: p.page, fg: p.text }),
  serviceRow: (p) => ({ bg: p.page, fg: p.text }),
  categoryGrid: (p) => ({ bg: p.alt, fg: p.text, tileBg: p.tile, tileFg: p.onTile }),
  textBlock: (p) => ({ bg: p.page, fg: p.text }),
  trustBadges: (p) => ({ bg: p.alt, fg: p.text }),
  faq: (p) => ({ bg: p.page, fg: p.text }),
  reviews: (p) => ({ bg: p.alt, fg: p.text, cardBg: p.page }),
  enquiry: (p) => ({ bg: p.alt, fg: p.text }),
  countdown: (p) => ({ bg: p.dark, fg: p.onDark }),
  imageBanner: (p) => ({ fg: p.onDark }),
  socialLinks: (p) => ({ bg: p.page, fg: p.text }),
  ctaBanner: (p) => ({ bg: p.dark, fg: p.onDark }),
  richFooter: (p) => ({ bg: p.alt, fg: p.text }),
}

/**
 * Applies a preset without touching which sections exist or their order.
 *
 * The vendor's own words stay theirs: headlines, body copy, questions and
 * answers are never overwritten. Only colour, type and card styling change, so
 * trying a preset can never cost someone the text they wrote.
 */
export function applyPreset(design, presetId) {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) return design
  const pal = preset.palette

  return {
    ...design,
    theme: { ...design.theme, ...preset.theme },
    productCard: { ...design.productCard, ...preset.productCard },
    serviceCard: { ...design.serviceCard, ...preset.serviceCard },
    popup: { ...design.popup, bg: pal.page, fg: pal.text },
    sections: (design.sections || []).map((s) => {
      const paint = SECTION_PAINT[s.type]
      return paint ? { ...s, settings: { ...s.settings, ...paint(pal) } } : s
    }),
  }
}

/**
 * Extra pages a vendor can build and publish alongside their storefront.
 *
 * These are REAL URLs, not tabs, because the whole point is that Google and an
 * AI assistant can read them: /<store>/about is a page about that business, and
 * a tab inside a single-page app is not.
 *
 * `path` is the literal URL segment and is registered explicitly in App.jsx, so
 * a custom page can never shadow /services or any future reserved route.
 */
export const CUSTOM_PAGES = [
  {
    key: 'about',
    path: 'about',
    label: 'About us',
    hint: 'Who you are and why someone should trust you with their money.',
  },
  {
    key: 'contact',
    path: 'contact',
    label: 'Contact',
    hint: 'How to reach you, plus a form that files every message as a lead.',
  },
  {
    key: 'policies',
    path: 'policies',
    label: 'Delivery and returns',
    hint: 'Delivery times, returns and refunds. The questions that stop a sale.',
  },
]

const PAGE_TEMPLATES = {
  about: ['hero', 'textBlock', 'trustBadges', 'reviews', 'ctaBanner', 'richFooter'],
  contact: ['hero', 'enquiry', 'socialLinks', 'richFooter'],
  policies: ['hero', 'textBlock', 'faq', 'ctaBanner', 'richFooter'],
}

const PAGE_INTRO = {
  about: {
    heroHeadline: 'About us',
    heroSub: 'A little about who we are and how we work.',
    blockTitle: 'Our story',
  },
  contact: {
    heroHeadline: 'Get in touch',
    heroSub: 'Send a message and we will reply as soon as we can.',
    blockTitle: '',
  },
  policies: {
    heroHeadline: 'Delivery and returns',
    heroSub: 'What to expect after you order.',
    blockTitle: 'Delivery',
  },
}

/** A starting layout for one custom page. Compact hero, since it is not a shop front. */
export function defaultPage(key) {
  const intro = PAGE_INTRO[key] || PAGE_INTRO.about
  const sections = (PAGE_TEMPLATES[key] || PAGE_TEMPLATES.about).map((type) => {
    const sec = makeSection(type)
    if (type === 'hero') {
      sec.settings = {
        ...sec.settings,
        headline: intro.heroHeadline,
        sub: intro.heroSub,
        layout: 'centered',
        height: 'compact',
        ctaLabel: '',
        showStats: false,
      }
    }
    if (type === 'textBlock' && intro.blockTitle) {
      sec.settings = { ...sec.settings, title: intro.blockTitle, body: '' }
    }
    return sec
  })
  return { enabled: false, sections }
}

function defaultPages() {
  const out = {}
  for (const p of CUSTOM_PAGES) out[p.key] = defaultPage(p.key)
  return out
}

function cleanPages(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const p of CUSTOM_PAGES) {
    const page = src[p.key] && typeof src[p.key] === 'object' ? src[p.key] : {}
    const sections = cleanSections(page.sections)
    out[p.key] = {
      enabled: page.enabled === true,
      sections: sections.length ? sections : defaultPage(p.key).sections,
    }
  }
  return out
}

/**
 * Whether a custom page should be served to the public.
 *
 * Same two-key rule as the storefront: the plan must allow it AND the vendor
 * must have switched that specific page on. A page a vendor never enabled must
 * 404 rather than show an empty template with their business name on it.
 */
export function isPageLive(store, key) {
  if (!isDesignLive(store)) return false
  const page = store?.storeDesign?.pages?.[key]
  return !!page?.enabled && Array.isArray(page.sections) && page.sections.length > 0
}

/** Enabled custom pages, for building footer and nav links. */
export function livePages(store) {
  return CUSTOM_PAGES.filter((p) => isPageLive(store, p.key))
}

/**
 * The public order tracking page.
 *
 * A customer pastes the order id from their receipt and sees where their order
 * is, in the vendor's own words, on the vendor's own design.
 *
 * ID ONLY, AND THAT IS SAFE. Order ids are Firestore auto ids: 20 random
 * characters, around 119 bits. That is not a guessable reference number, it is
 * effectively a secret token, so possession of it is the authorisation. Asking
 * for a phone number as well would only punish the customer who ordered three
 * times from the same shop.
 *
 * The lookup still runs server side through the Admin SDK (api/order-track),
 * because orders are owner-read-only in firestore.rules and must stay that way.
 * That handler returns tracking fields only, never the payment reference or the
 * vendor's internal notes.
 */

/** Every status either an order or a booking can be in, with default wording. */
export const TRACKING_STATUSES = [
  { key: 'pending', label: 'Order received', kind: 'both', default: 'We have your order and we are getting it ready.' },
  { key: 'confirmed', label: 'Confirmed', kind: 'both', default: 'Your order is confirmed and being prepared.' },
  { key: 'dispatched', label: 'Dispatched', kind: 'order', default: 'Your order has left us and is on its way.' },
  { key: 'in_transit', label: 'In transit', kind: 'order', default: 'Your order is with the courier and moving.' },
  { key: 'delivered', label: 'Delivered', kind: 'order', default: 'Delivered. Thank you for shopping with us.' },
  { key: 'in_progress', label: 'In progress', kind: 'booking', default: 'We are working on your booking right now.' },
  { key: 'rescheduled', label: 'Rescheduled', kind: 'booking', default: 'Your booking has been moved. Check your messages for the new time.' },
  { key: 'completed', label: 'Completed', kind: 'booking', default: 'All done. Thank you for choosing us.' },
  { key: 'no_show', label: 'Missed', kind: 'booking', default: 'This booking was marked as missed. Message us to rebook.' },
  { key: 'cancelled', label: 'Cancelled', kind: 'both', default: 'This order was cancelled. Message us if that looks wrong.' },
  { key: 'refunded', label: 'Refunded', kind: 'booking', default: 'This booking was refunded.' },
]

/** Page level copy the vendor can change. Wording only, never the logic. */
export const TRACKING_FIELDS = [
  { key: 'enabled', label: 'Publish the tracking page', type: 'toggle', default: false },
  { key: 'title', label: 'Heading', type: 'text', max: 60, default: 'Track your order' },
  { key: 'sub', label: 'Supporting line', type: 'textarea', max: 200, default: 'Paste the order ID from your receipt to see where your order is.' },
  { key: 'placeholder', label: 'Box placeholder', type: 'text', max: 60, default: 'Paste your order ID' },
  { key: 'buttonLabel', label: 'Button text', type: 'text', max: 30, default: 'Track order' },
  { key: 'notFound', label: 'When the ID is not found', type: 'textarea', max: 200, default: 'We could not find that order ID. Check it and try again, or message us and we will look it up.' },
  { key: 'helpText', label: 'Help line under the box', type: 'text', max: 120, default: 'Your order ID is on the receipt we sent you.' },
  { key: 'showItems', label: 'Show what was ordered', type: 'toggle', default: true },
  { key: 'showTotal', label: 'Show the amount paid', type: 'toggle', default: true },
]

function defaultTracking() {
  const out = {}
  for (const f of TRACKING_FIELDS) out[f.key] = f.default
  out.messages = {}
  for (const s of TRACKING_STATUSES) out.messages[s.key] = s.default
  return out
}

function cleanTracking(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = cleanFields(TRACKING_FIELDS, src)
  const msgs = src.messages && typeof src.messages === 'object' ? src.messages : {}
  out.messages = {}
  for (const s of TRACKING_STATUSES) {
    out.messages[s.key] = clampText(msgs[s.key] ?? s.default, 200)
  }
  return out
}

/**
 * Whether the public tracking page should be served.
 *
 * Same two keys as everything else: the plan must allow the design, and the
 * vendor must have switched this page on.
 */
export function isTrackingLive(store) {
  return isDesignLive(store) && store?.storeDesign?.tracking?.enabled === true
}

/** The vendor's wording for a status, falling back to the shipped default. */
export function trackingMessage(tracking, status) {
  const key = String(status || 'pending').toLowerCase()
  const known = TRACKING_STATUSES.find((s) => s.key === key)
  return tracking?.messages?.[key] || known?.default || 'We are working on your order.'
}

/** The label for a status, for the badge and the timeline. */
export function trackingLabel(status) {
  const key = String(status || 'pending').toLowerCase()
  return TRACKING_STATUSES.find((s) => s.key === key)?.label || 'Received'
}

/**
 * Progress through the normal happy path, for the stepper. Terminal states that
 * are not "finished" return -1 so the page shows a plain message instead of a
 * progress bar implying the order is still moving.
 */
export const ORDER_STEPS = ['pending', 'confirmed', 'dispatched', 'delivered']
export const BOOKING_STEPS = ['pending', 'confirmed', 'in_progress', 'completed']

export function trackingStep(status, kind) {
  const key = String(status || 'pending').toLowerCase()
  if (key === 'cancelled' || key === 'refunded' || key === 'no_show') return -1
  const steps = kind === 'booking' ? BOOKING_STEPS : ORDER_STEPS
  // in_transit sits between dispatched and delivered on the courier's path.
  if (key === 'in_transit') return steps.indexOf('dispatched')
  if (key === 'rescheduled') return steps.indexOf('confirmed')
  const i = steps.indexOf(key)
  return i === -1 ? 0 : i
}
