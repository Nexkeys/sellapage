import { getAdminDb } from './_lib/firebase-admin.js'

const SITE_URL = 'https://sellapage.com.ng'

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/live-stores', changefreq: 'weekly', priority: '0.7' },
  { path: '/jobs', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/success-stories', changefreq: 'weekly', priority: '0.7' },
  { path: '/report-store', changefreq: 'yearly', priority: '0.4' },
  { path: '/tools/offer-name-lab', changefreq: 'monthly', priority: '0.6' },
  { path: '/tools/policy-generator', changefreq: 'monthly', priority: '0.6' },
  { path: '/compare/vs-shopify', changefreq: 'monthly', priority: '0.7' },
  { path: '/compare/vs-linktree', changefreq: 'monthly', priority: '0.7' },
  { path: '/compare/vs-whatsapp-business', changefreq: 'monthly', priority: '0.7' },
  { path: '/compare/vs-instagram-bio', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.5' },
]

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0]
  const d = date.toDate ? date.toDate() : new Date(date)
  return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Content-Type', 'text/plain').send('Method not allowed')
  }

  try {
    const db = getAdminDb()
    const now = new Date().toISOString().split('T')[0]

    const urlEntries = STATIC_PAGES.map(page => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)

    // Fetch published blog posts
    try {
      const blogSnapshot = await db.collection('blogPosts')
        .where('status', '==', 'published')
        .limit(500)
        .get()

      blogSnapshot.forEach(doc => {
        const data = doc.data()
        const slug = data.slug || doc.id
        const lastmod = formatDate(data.updatedAt || data.publishedAt || data.createdAt)
        urlEntries.push(`  <url>
    <loc>${SITE_URL}/blog/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)
      })
    } catch (err) {
      console.error('[sitemap] blog fetch error:', err.message)
    }

    // Fetch approved, active job listings
    // NOTE: collection is `jobListings`, not `jobs` - the previous version of
    // this query targeted a nonexistent collection and always returned zero
    // results silently (no error), so individual job URLs were never actually
    // in the sitemap despite the code appearing to handle them.
    try {
      const jobsSnapshot = await db.collection('jobListings')
        .where('status', '==', 'approved')
        .where('isActive', '==', true)
        .limit(500)
        .get()

      jobsSnapshot.forEach(doc => {
        const data = doc.data()
        const lastmod = formatDate(data.updatedAt || data.createdAt)
        urlEntries.push(`  <url>
    <loc>${SITE_URL}/jobs/${escapeXml(doc.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`)
      })
    } catch (err) {
      console.error('[sitemap] jobs fetch error:', err.message)
    }

    // Fetch live merchant storefronts - previously entirely absent from the
    // sitemap despite being the highest-volume public pages on the site.
    try {
      const storesSnapshot = await db.collection('stores')
        .where('isActive', '==', true)
        .limit(1000)
        .get()

      storesSnapshot.forEach(doc => {
        const data = doc.data()
        if (!data.storeName) return
        const lastmod = formatDate(data.updatedAt || data.createdAt)
        urlEntries.push(`  <url>
    <loc>${SITE_URL}/${escapeXml(data.storeName)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`)
        if (data.vendorType === 'services' || data.vendorType === 'both') {
          urlEntries.push(`  <url>
    <loc>${SITE_URL}/${escapeXml(data.storeName)}/services</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`)
        }
      })
    } catch (err) {
      console.error('[sitemap] stores fetch error:', err.message)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    return res.status(200).send(xml)
  } catch (err) {
    console.error('[sitemap] error:', err)
    return res.status(500).setHeader('Content-Type', 'text/plain').send('Internal server error')
  }
}
