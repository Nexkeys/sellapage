// src/utils/receiptTemplates.js
// Six named template identities, each a config object rather than a bespoke
// component — one renderer (on-screen) and one PDF document consume this
// same config, so a field/bug fix never needs repeating six times.

export const RECEIPT_TEMPLATES = [
  {
    id: 'template-1',
    name: 'Classic',
    category: 'Standard',
    description: 'Traditional receipt layout — colored header band, table body, totals at the bottom.',
    defaultColors: { primary: '#22c55e', secondary: '#0f172a', background: '#ffffff' },
    defaultFont: 'Helvetica',
    layout: { headerStyle: 'band', itemsStyle: 'table', totalsAlign: 'right', cardStyle: 'square', showSignatureLine: false, thermal: false },
  },
  {
    id: 'template-2',
    name: 'Modern Minimal',
    category: 'Standard',
    description: 'Clean sans-serif, generous whitespace, subtle border lines, monochrome.',
    defaultColors: { primary: '#0f172a', secondary: '#6b7280', background: '#ffffff' },
    defaultFont: 'Helvetica',
    layout: { headerStyle: 'minimal', itemsStyle: 'table', totalsAlign: 'right', cardStyle: 'flat', showSignatureLine: false, thermal: false },
  },
  {
    id: 'template-3',
    name: 'Bold Branded',
    category: 'Branded',
    description: 'Full-color header banner, large logo placement, rounded cards.',
    defaultColors: { primary: '#7c3aed', secondary: '#0f172a', background: '#ffffff' },
    defaultFont: 'Helvetica-Bold',
    layout: { headerStyle: 'banner', itemsStyle: 'cards', totalsAlign: 'right', cardStyle: 'rounded', showSignatureLine: false, thermal: false },
  },
  {
    id: 'template-4',
    name: 'Corporate',
    category: 'Formal',
    description: 'Two-column layout, formal serif font, signature line, terms & conditions footer.',
    defaultColors: { primary: '#1e3a8a', secondary: '#374151', background: '#ffffff' },
    defaultFont: 'Times-Roman',
    layout: { headerStyle: 'twoColumn', itemsStyle: 'table', totalsAlign: 'right', cardStyle: 'square', showSignatureLine: true, thermal: false },
  },
  {
    id: 'template-5',
    name: 'Creative',
    category: 'Playful',
    description: 'Asymmetric layout with decorative accents and a warmer palette.',
    defaultColors: { primary: '#f97316', secondary: '#0f172a', background: '#fff7ed' },
    defaultFont: 'Helvetica-Oblique',
    layout: { headerStyle: 'asymmetric', itemsStyle: 'table', totalsAlign: 'left', cardStyle: 'rounded', showSignatureLine: false, thermal: false },
  },
  {
    id: 'template-6',
    name: 'Compact Thermal',
    category: 'Thermal',
    description: '80mm-style narrow layout optimized for POS/thermal printers — dense, no waste.',
    defaultColors: { primary: '#111827', secondary: '#374151', background: '#ffffff' },
    defaultFont: 'Courier',
    layout: { headerStyle: 'stacked', itemsStyle: 'list', totalsAlign: 'right', cardStyle: 'flat', showSignatureLine: false, thermal: true },
  },
]

// What Free/Starter vendors get — deliberately monochrome, no template
// flourish, matching "Plain white/black simple receipt" in the plan.
export const PLAIN_TEMPLATE = {
  id: null,
  name: 'Plain',
  category: 'Free',
  description: 'A simple black-and-white receipt.',
  defaultColors: { primary: '#111827', secondary: '#374151', background: '#ffffff' },
  defaultFont: 'Helvetica',
  layout: { headerStyle: 'minimal', itemsStyle: 'table', totalsAlign: 'right', cardStyle: 'flat', showSignatureLine: false, thermal: false },
}

export function getTemplateById(id) {
  if (!id) return PLAIN_TEMPLATE
  return RECEIPT_TEMPLATES.find((t) => t.id === id) || RECEIPT_TEMPLATES[0]
}

// react-pdf only ships Helvetica/Times-Roman/Courier natively (with Bold/
// Oblique variants) — registering arbitrary web fonts needs font-file URLs,
// which this codebase doesn't load anywhere today. Font choice is scoped to
// what react-pdf can render out of the box rather than adding that infra.
export const PDF_FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica (Sans)' },
  { value: 'Helvetica-Bold', label: 'Helvetica Bold' },
  { value: 'Helvetica-Oblique', label: 'Helvetica Italic' },
  { value: 'Times-Roman', label: 'Times (Serif)' },
  { value: 'Courier', label: 'Courier (Mono)' },
]

export const STAMP_PRESETS = [
  { id: 'paid', label: 'PAID', color: '#16a34a' },
  { id: 'received', label: 'RECEIVED', color: '#2563eb' },
  { id: 'done', label: 'DONE', color: '#7c3aed' },
  { id: 'original', label: 'ORIGINAL', color: '#111827' },
  { id: 'copy', label: 'COPY', color: '#6b7280' },
  { id: 'thank-you', label: 'THANK YOU', color: '#dc2626' },
]

export const STAMP_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']

// Explicit "NGN" prefix, never the ₦ glyph — some printers/fonts render it
// as a broken box character, which is exactly what this feature was asked
// to avoid.
export function formatNGN(amount) {
  return 'NGN ' + Number(amount || 0).toLocaleString('en-NG')
}

export function calcItemsSubtotal(items) {
  return (items || []).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0), 0)
}

// Single source of truth for subtotal/total/balanceDue — called after every
// items/discount/tax/amountPaid edit so the draft's totals are never stale.
export function recalcTotals(draft) {
  const subtotal = calcItemsSubtotal(draft.items)
  const discount = Number(draft.discount) || 0
  const tax = Number(draft.tax) || 0
  const total = Math.max(0, subtotal - discount + tax)
  const amountPaid = Number(draft.amountPaid) || 0
  const balanceDue = Math.max(0, total - amountPaid)
  return { ...draft, subtotal, total, balanceDue }
}
