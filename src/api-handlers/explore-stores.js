// src/api-handlers/explore-stores.js
//
// GET /api/explore-stores
//
// The public Explore Stores page. Returns every visible store as a SMALL card
// (name, link, logo, cover, category, listings, rating, verified), already
// sorted, and lets Vercel's edge cache the answer for 5 minutes.
//
// WHY A SERVER ROUTE: the page used to read every active store document in
// every visitor's browser. On Firestore's free daily quota that is one read
// per store per visit. Here it is one read per store per 5 minutes for the
// whole world, and a visitor downloads a few KB instead of full documents.
//
// Visibility is the same rule the storefront uses (utils/storefrontGate.js),
// with the gates read from the same environment switches as public-config.
import { getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { isStorefrontHidden } from '../utils/storefrontGate.js'

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}...` : t
}
const ms = (v) => (v?.toMillis ? v.toMillis() : v?._seconds ? v._seconds * 1000 : v ? new Date(v).getTime() || 0 : 0)

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,OPTIONS' })
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const gates = {
      phone: String(process.env.ENABLE_STOREFRONT_PHONE_GATE || '').toLowerCase() === 'true',
      email: String(process.env.ENABLE_STOREFRONT_EMAIL_GATE || '').toLowerCase() === 'true',
    }
    const snap = await getAdminDb().collection('stores').where('isActive', '==', true).get()

    const stores = []
    for (const doc of snap.docs) {
      const d = doc.data()
      if (!d.storeName || isStorefrontHidden(d, gates)) continue
      const count = Number(d.ratingCount) || 0
      stores.push({
        id: doc.id,
        slug: d.storeName,
        name: clip(d.businessName || d.storeName, 60),
        logo: d.logoUrl || '',
        cover: d.themeMetadata?.heroBannerUrl || d.coverImage || '',
        category: d.businessCategory || '',
        vendorType: d.vendorType || 'products',
        listings: Math.max(0, Number(d.productCount) || 0),
        rating: count ? Math.round(((Number(d.ratingSum) || 0) / count) * 10) / 10 : 0,
        reviews: count,
        verified: d.cacVerified === true,
        about: clip(d.description, 140),
        createdAt: ms(d.createdAt),
      })
    }

    // Stores that look ready come first: a cover and a logo, listings,
    // reviews. Newer stores break ties so the page keeps changing.
    const score = (s) => (s.cover ? 3 : 0) + (s.logo ? 2 : 0) + (s.listings > 0 ? 2 : -4) + Math.min(s.reviews, 20) / 5 + s.rating / 2 + (s.verified ? 1 : 0)
    stores.sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt)

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900')
    return res.status(200).json({ success: true, stores, updatedAt: Date.now() })
  } catch (err) {
    console.error('[explore-stores]', err)
    return res.status(500).json({ success: false, error: 'Could not load stores' })
  }
}
