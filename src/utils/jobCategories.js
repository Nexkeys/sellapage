//src/utils/jobCategories.js/
// Shared source of truth for job categories/types across the vendor post form,
// admin moderation view, and the public /jobs listing + detail pages, so
// filtering always matches exactly (stored as slugs, not labels).

export const JOB_TYPES = [
  { slug: 'contract', label: 'Contract' },
  { slug: 'part_time', label: 'Part-time' },
  { slug: 'full_time', label: 'Full-time' },
  { slug: 'freelance', label: 'Freelance' },
  { slug: 'side_gig', label: 'Side Gig' },
]

export const JOB_CATEGORIES = [
  { slug: 'tech_it', label: 'Tech & IT' },
  { slug: 'software', label: 'Software & Development' },
  { slug: 'sales', label: 'Sales & Business Dev' },
  { slug: 'marketing', label: 'Marketing & Social Media' },
  { slug: 'design', label: 'Design & Creative' },
  { slug: 'customer_support', label: 'Customer Support' },
  { slug: 'admin_office', label: 'Admin & Office' },
  { slug: 'finance', label: 'Finance & Accounting' },
  { slug: 'writing', label: 'Writing & Content' },
  { slug: 'delivery_logistics', label: 'Delivery & Logistics' },
  { slug: 'fashion_beauty', label: 'Fashion & Beauty' },
  { slug: 'food_catering', label: 'Food & Catering' },
  { slug: 'education', label: 'Education & Training' },
  { slug: 'health', label: 'Health & Wellness' },
  { slug: 'construction', label: 'Construction & Artisan' },
  { slug: 'media', label: 'Media & Photography' },
  { slug: 'legal', label: 'Legal & Compliance' },
  { slug: 'hr', label: 'Human Resources' },
  { slug: 'other', label: 'Other' },
]

export const JOB_TYPE_SLUGS = JOB_TYPES.map(t => t.slug)
export const JOB_CATEGORY_SLUGS = JOB_CATEGORIES.map(c => c.slug)

export function getJobTypeLabel(slug) {
  return JOB_TYPES.find(t => t.slug === slug)?.label || slug
}

export function getCategoryLabel(slug) {
  return JOB_CATEGORIES.find(c => c.slug === slug)?.label || slug
}

// Reuses the site's dominant status-chip formula: bg-{c}-50 text-{c}-600 border-{c}-100
export const JOB_TYPE_BADGE = {
  contract: 'bg-blue-50 text-blue-600 border-blue-100',
  part_time: 'bg-purple-50 text-purple-600 border-purple-100',
  full_time: 'bg-green-50 text-green-600 border-green-100',
  freelance: 'bg-amber-50 text-amber-600 border-amber-100',
  side_gig: 'bg-pink-50 text-pink-600 border-pink-100',
}

export const JOB_STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  approved: 'bg-green-50 text-green-600 border-green-100',
  rejected: 'bg-red-50 text-red-600 border-red-100',
}
