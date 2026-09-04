import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const MAX_IMAGES = 6
const MAX_VIDEOS = 2

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, rating, reviewText, images, videos, authorName } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }
  const numRating = Number(rating)
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' })
  }
  if (!reviewText || !reviewText.trim()) {
    return res.status(400).json({ error: 'Review text is required' })
  }
  const imageList = Array.isArray(images) ? images.slice(0, MAX_IMAGES) : []
  const videoList = Array.isArray(videos) ? videos.slice(0, MAX_VIDEOS) : []
  if (Array.isArray(videos) && videos.length > MAX_VIDEOS) {
    return res.status(400).json({ error: `You can attach at most ${MAX_VIDEOS} videos` })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const storeData = storeSnap.data() || {}

    const reviewRef = db.collection('platformReviews').doc()
    const nowIso = new Date().toISOString()

    await reviewRef.set({
      storeId,
      storeName: storeData.businessName || '',
      storeSlug: storeData.storeName || '',
      authorName: (authorName || storeData.businessName || 'A Sellapage vendor').trim(),
      rating: numRating,
      reviewText: reviewText.trim().slice(0, 2000),
      images: imageList,
      videos: videoList,
      status: 'pending',
      featured: false,
      createdAt: nowIso,
      moderatedAt: null,
      moderatedBy: null,
    })

    // Best-effort - lets the dashboard stop showing the review prompt to this
    // vendor without needing a second round-trip to check submission history.
    await db.collection('stores').doc(storeId).update({ hasSubmittedPlatformReview: true }).catch(() => {})

    return res.status(200).json({ id: reviewRef.id, success: true })
  } catch (err) {
    console.error('[platform-review-submit] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
