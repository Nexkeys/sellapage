//src/api-handlers/blog-public.js/
// Public, unauthenticated reads + comment submission for /blog and /blog/:slug.
// Mirrors jobs-public.js's approach: one broad indexed query, then filter/
// paginate in JS, to keep composite-index needs minimal.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const COMMENT_MAX_LENGTH = 2000

// Scheduled posts publish lazily on the next public read at/after their time,
// rather than via new cron infrastructure (see plan). Cheap, indexed, bounded.
async function flipDueScheduledPosts(db) {
  const now = new Date()
  const snap = await db.collection('blogPosts')
    .where('status', '==', 'scheduled')
    .where('publishedAt', '<=', now)
    .limit(50)
    .get()
  if (snap.empty) return
  const batch = db.batch()
  snap.docs.forEach(doc => batch.update(doc.ref, { status: 'published', updatedAt: now }))
  await batch.commit()
}

function projectCard(doc) {
  const d = doc.data()
  return {
    id: doc.id, title: d.title, slug: d.slug, excerpt: d.excerpt || '',
    featuredImageUrl: d.featuredImageUrl || '', category: d.category, tags: d.tags || [],
    readTimeMinutes: d.readTimeMinutes || 1, authorName: d.authorName || 'Sellapage Team',
    publishedAt: d.publishedAt?.toDate?.()?.toISOString() || null,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list' && req.method === 'GET') {
      await flipDueScheduledPosts(db)

      const page = parseInt(req.query.page) || 1
      const limit = Math.min(parseInt(req.query.limit) || 20, 50)
      const category = req.query.category || 'all'
      const tag = req.query.tag || 'all'
      const search = (req.query.search || '').trim().toLowerCase()

      const snap = await db.collection('blogPosts')
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')
        .limit(500)
        .get()

      let posts = snap.docs.map(projectCard)

      if (category !== 'all') posts = posts.filter(p => p.category === category)
      if (tag !== 'all') posts = posts.filter(p => (p.tags || []).includes(tag))
      if (search) {
        posts = posts.filter(p =>
          p.title.toLowerCase().includes(search) ||
          p.excerpt.toLowerCase().includes(search)
        )
      }

      const total = posts.length
      const offset = (page - 1) * limit
      const paged = posts.slice(offset, offset + limit)

      return res.status(200).json({ success: true, posts: paged, total, page, limit })
    }

    if (action === 'get' && req.method === 'GET') {
      await flipDueScheduledPosts(db)

      const slug = req.query.slug
      if (!slug) return res.status(400).json({ error: 'Missing slug' })

      const snap = await db.collection('blogPosts').where('slug', '==', slug).limit(1).get()
      if (snap.empty) return res.status(404).json({ error: 'Post not found' })
      const doc = snap.docs[0]
      const d = doc.data()
      if (d.status !== 'published') return res.status(404).json({ error: 'Post not found' })

      let related = []
      try {
        const relSnap = await db.collection('blogPosts')
          .where('status', '==', 'published')
          .where('category', '==', d.category)
          .orderBy('publishedAt', 'desc')
          .limit(4)
          .get()
        related = relSnap.docs.filter(rd => rd.id !== doc.id).slice(0, 3).map(projectCard)
      } catch (err) {
        console.error('[blog-public] related posts query failed:', err)
      }

      let categoryName = d.category
      try {
        const catDoc = await db.collection('blogCategories').doc(d.category).get()
        if (catDoc.exists) categoryName = catDoc.data().name
      } catch (err) {
        console.error('[blog-public] category lookup failed:', err)
      }

      return res.status(200).json({
        success: true,
        post: {
          id: doc.id, title: d.title, slug: d.slug, excerpt: d.excerpt || '',
          contentHtml: d.contentHtml || '', featuredImageUrl: d.featuredImageUrl || '',
          category: d.category, categoryName, tags: d.tags || [], readTimeMinutes: d.readTimeMinutes || 1,
          authorName: d.authorName || 'Sellapage Team', metaTitle: d.metaTitle || '',
          metaDescription: d.metaDescription || '', commentsEnabled: d.commentsEnabled !== false,
          commentCount: d.commentCount || 0,
          publishedAt: d.publishedAt?.toDate?.()?.toISOString() || null,
        },
        related,
      })
    }

    if (action === 'list-categories' && req.method === 'GET') {
      const snap = await db.collection('blogCategories').orderBy('name', 'asc').get()
      const categories = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name, slug: doc.data().slug }))
      return res.status(200).json({ success: true, categories })
    }

    if (action === 'submit-comment' && req.method === 'POST') {
      const postId = req.query.postId
      if (!postId) return res.status(400).json({ error: 'Missing postId' })

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const text = (body.body || '').trim()
      if (!text) return res.status(400).json({ error: 'Please write a comment.' })
      if (text.length > COMMENT_MAX_LENGTH) return res.status(400).json({ error: `Comments are limited to ${COMMENT_MAX_LENGTH} characters.` })

      const postRef = db.collection('blogPosts').doc(postId)
      const postSnap = await postRef.get()
      if (!postSnap.exists || postSnap.data().status !== 'published') {
        return res.status(404).json({ error: 'Post not found' })
      }
      if (postSnap.data().commentsEnabled === false) {
        return res.status(403).json({ error: 'Comments are disabled for this post.' })
      }

      // Optional authorship: never reject on a missing/invalid token — fail open to Anonymous.
      let authorName = 'Anonymous'
      let authorStoreId = null
      let isAnonymous = true
      const authHeader = req.headers.authorization || req.headers.Authorization || ''
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (idToken) {
        try {
          const decoded = await getAdminAuth().verifyIdToken(idToken)
          const storeSnap = await db.collection('stores').doc(decoded.uid).get()
          if (storeSnap.exists) {
            const store = storeSnap.data()
            authorName = store.businessName || store.storeName || 'Anonymous'
            authorStoreId = decoded.uid
            isAnonymous = false
          }
        } catch {
          // invalid/expired token — fall through to Anonymous
        }
      }

      const commentDoc = { body: text, authorName, authorStoreId, isAnonymous, createdAt: new Date() }
      const commentRef = await postRef.collection('comments').add(commentDoc)
      await postRef.update({ commentCount: (postSnap.data().commentCount || 0) + 1 })

      return res.status(200).json({
        success: true,
        comment: { id: commentRef.id, ...commentDoc, createdAt: commentDoc.createdAt.toISOString() },
      })
    }

    if (action === 'list-comments' && req.method === 'GET') {
      const postId = req.query.postId
      if (!postId) return res.status(400).json({ error: 'Missing postId' })
      const page = parseInt(req.query.page) || 1
      const limit = Math.min(parseInt(req.query.limit) || 10, 50)

      const postSnap = await db.collection('blogPosts').doc(postId).get()
      if (!postSnap.exists) return res.status(404).json({ error: 'Post not found' })
      if (postSnap.data().commentsEnabled === false) {
        return res.status(200).json({ success: true, commentsDisabled: true, comments: [], total: 0 })
      }

      const snap = await db.collection('blogPosts').doc(postId).collection('comments').orderBy('createdAt', 'desc').limit(500).get()
      const all = snap.docs.map(doc => {
        const d = doc.data()
        return { id: doc.id, body: d.body, authorName: d.authorName, isAnonymous: d.isAnonymous !== false, createdAt: d.createdAt?.toDate?.()?.toISOString() || null }
      })
      const total = all.length
      const offset = (page - 1) * limit
      const paged = all.slice(offset, offset + limit)

      return res.status(200).json({ success: true, comments: paged, total, page, limit })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[blog-public] Error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
