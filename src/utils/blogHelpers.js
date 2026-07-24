//src/utils/blogHelpers.js/
export function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function estimateReadTime(html) {
  const text = stripHtml(html)
  const words = text ? text.split(' ').filter(Boolean).length : 0
  return Math.max(1, Math.round(words / 200))
}

export function getExcerpt(post) {
  if (post?.excerpt && post.excerpt.trim()) return post.excerpt.trim()
  return stripHtml(post?.contentHtml).slice(0, 160)
}

export function formatBlogDate(value) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date?.getTime?.())) return ''
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const BADGE_COLORS = [
  'bg-brand-50 text-brand-700 border-brand-100',
  'bg-blue-50 text-blue-600 border-blue-100',
  'bg-purple-50 text-purple-600 border-purple-100',
  'bg-amber-50 text-amber-600 border-amber-100',
  'bg-pink-50 text-pink-600 border-pink-100',
  'bg-teal-50 text-teal-600 border-teal-100',
]

export function getCategoryBadgeClass(slug) {
  const str = String(slug || '')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return BADGE_COLORS[hash % BADGE_COLORS.length]
}
