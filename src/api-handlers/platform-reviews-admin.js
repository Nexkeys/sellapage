import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'reviews')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const db = getAdminDb()
  const action = req.query.action

  try {
    if (action === 'list' && req.method === 'GET') {
      const status = req.query.status || 'all'
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(50, parseInt(req.query.limit) || 20)

      // No `where` + `orderBy` on different fields - that combination needs
      // a composite index Firestore doesn't have here (this exact query
      // shape was throwing FAILED_PRECONDITION / error 9 in production).
      // Collection is small enough to fetch unfiltered and do
      // filter/sort/paginate/count all in memory - same approach already
      // used elsewhere in this codebase (e.g. admin-referrals.js) to avoid
      // needing new indexes.
      const snap = await db.collection('platformReviews').limit(500).get()
      const all = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      const counts = { all: all.length, pending: 0, approved: 0, rejected: 0 }
      for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1

      const filtered = status === 'all' ? all : all.filter((r) => r.status === status)
      const total = filtered.length
      const start = (page - 1) * limit
      const pageItems = filtered.slice(start, start + limit)

      return res.status(200).json({ reviews: pageItems, total, page, limit, counts })
    }

    if (action === 'moderate' && req.method === 'POST') {
      const { reviewId, status } = req.body
      if (!reviewId || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Missing/invalid reviewId or status' })
      }
      const ref = db.collection('platformReviews').doc(reviewId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Review not found' })

      await ref.update({
        status,
        moderatedAt: new Date().toISOString(),
        moderatedBy: req.headers['x-admin-uid'] || 'admin',
      })
      return res.status(200).json({ success: true })
    }

    if (action === 'toggle-featured' && req.method === 'POST') {
      const { reviewId, featured } = req.body
      if (!reviewId) return res.status(400).json({ error: 'Missing reviewId' })
      const ref = db.collection('platformReviews').doc(reviewId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Review not found' })
      await ref.update({ featured: !!featured })
      return res.status(200).json({ success: true })
    }

    if (action === 'delete' && req.method === 'POST') {
      const { reviewId } = req.body
      if (!reviewId) return res.status(400).json({ error: 'Missing reviewId' })
      await db.collection('platformReviews').doc(reviewId).delete()
      return res.status(200).json({ success: true })
    }

    if (action === 'get-prompt-settings' && req.method === 'GET') {
      const snap = await db.collection('platformSettings').doc('reviewPrompt').get()
      const enabled = snap.exists ? !!snap.data().enabled : false
      return res.status(200).json({ enabled })
    }

    if (action === 'set-prompt-settings' && req.method === 'POST') {
      const { enabled } = req.body
      await db.collection('platformSettings').doc('reviewPrompt').set(
        { enabled: !!enabled, updatedAt: new Date().toISOString() },
        { merge: true },
      )
      return res.status(200).json({ success: true, enabled: !!enabled })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[platform-reviews-admin] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
