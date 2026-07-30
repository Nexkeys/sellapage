import { getAdminDb } from './_lib/firebase-admin.js'

// Public, unauthenticated — powers the public Success Stories page and the
// dashboard's "should I show the review prompt?" check. Only ever exposes
// approved reviews; pending/rejected content never reaches this endpoint.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const limit = Math.min(100, parseInt(req.query.limit) || 50)
      const snap = await db
        .collection('platformReviews')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

      const reviews = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          storeName: d.storeName,
          storeSlug: d.storeSlug,
          authorName: d.authorName,
          rating: d.rating,
          reviewText: d.reviewText,
          images: d.images || [],
          videos: d.videos || [],
          featured: !!d.featured,
          createdAt: d.createdAt,
        }
      })
      // Featured reviews surface first for the public wall's hero section.
      reviews.sort((a, b) => (b.featured === a.featured ? 0 : b.featured ? 1 : -1))

      return res.status(200).json({ reviews })
    }

    if (action === 'prompt-status') {
      const snap = await db.collection('platformSettings').doc('reviewPrompt').get()
      const enabled = snap.exists ? !!snap.data().enabled : false
      return res.status(200).json({ enabled })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[platform-reviews-public] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
