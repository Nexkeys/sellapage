//src/api-handlers/blog-admin.js/
// Admin-only Blog CRUD (Super Admin / Marketing Admin, gated client-side via
// adminRoles.js TAB_ACCESS). x-admin-token gated like every other admin-*.js
// handler. blogPosts/blogCategories are top-level collections (consistent with
// how every other admin-managed collection in this codebase is structured);
// comments are a subcollection of their post since they're always queried
// scoped to one post.
import { getAdminDb } from './_lib/firebase-admin.js'
import { slugify } from '../utils/slugify.js'
import { estimateReadTime, getExcerpt } from '../utils/blogHelpers.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import sanitizeHtml from 'sanitize-html'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// Blog HTML is stored raw and rendered with dangerouslySetInnerHTML in
// BlogPostPage.jsx, so anything persisted here executes in every visitor's
// browser on the sellapage.com.ng origin - where vendor and admin Firebase
// sessions live. Sanitizing on write makes the stored value the safe one.
//
// The allowlist matches what the TipTap editor can actually produce
// (@tiptap/starter-kit + extension-image + extension-link). If a post loses
// formatting after this change, add the missing tag here - never re-allow
// script/iframe/style or on* handlers.
//
// Uses `sanitize-html` (htmlparser2-based, pure JS) rather than DOMPurify.
// DOMPurify needs a DOM, so on the server it pulls in jsdom - whose
// transitive dep @exodus/bytes is ESM-only and cannot be require()d by
// Vercel's CommonJS serverless bundle. That threw ERR_REQUIRE_ESM at import
// time and took down the ENTIRE catch-all router, not just this handler.
// Any server-side sanitizer here must be jsdom-free.
//
// sanitize-html is allowlist-by-default: anything not named below is dropped,
// so the old FORBID_TAGS/FORBID_ATTR lists are implicit (script, style,
// iframe, form and every on* handler are all excluded by omission).
const SANITIZE_CONFIG = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'hr', 'span',
    'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption',
  ],
  allowedAttributes: {
    '*': ['title', 'class'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  // Equivalent of the old ALLOWED_URI_REGEXP: no javascript:, no data:.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false, // blocks //evil.com
  disallowedTagsMode: 'discard',
}

function sanitizeContent(html) {
  return sanitizeHtml(String(html || ''), SANITIZE_CONFIG)
}

async function uniqueSlug(db, baseSlug, excludePostId) {
  let candidate = baseSlug || 'post'
  let suffix = 1
  while (true) {
    const snap = await db.collection('blogPosts').where('slug', '==', candidate).limit(2).get()
    const collides = snap.docs.some(doc => doc.id !== excludePostId)
    if (!collides) return candidate
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }
}

function buildStatusFields(body) {
  const status = body.status
  if (!['draft', 'scheduled', 'published'].includes(status)) {
    throw new Error('Invalid status')
  }
  if (status === 'draft') {
    return { status: 'draft', publishedAt: null }
  }
  if (status === 'scheduled') {
    const when = new Date(body.publishedAt)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      throw new Error('Please choose a future date/time to schedule this post.')
    }
    return { status: 'scheduled', publishedAt: when }
  }
  // published
  return { status: 'published', publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date() }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'blog')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || ''

    // ---- Posts ----

    if (action === 'list-posts' && req.method === 'GET') {
      const statusFilter = req.query.status || 'all'
      const snap = await db.collection('blogPosts').orderBy('updatedAt', 'desc').limit(500).get()
      let posts = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id, title: d.title, slug: d.slug, category: d.category,
          status: d.status, commentCount: d.commentCount || 0, commentsEnabled: d.commentsEnabled !== false,
          featuredImageUrl: d.featuredImageUrl || '',
          publishedAt: d.publishedAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
        }
      })
      const stats = {
        total: posts.length,
        draft: posts.filter(p => p.status === 'draft').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
      }
      if (statusFilter !== 'all') posts = posts.filter(p => p.status === statusFilter)
      return res.status(200).json({ success: true, posts, stats })
    }

    if (action === 'get-post' && req.method === 'GET') {
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'Missing id' })
      const doc = await db.collection('blogPosts').doc(id).get()
      if (!doc.exists) return res.status(404).json({ error: 'Post not found' })
      const d = doc.data()
      return res.status(200).json({
        success: true,
        post: {
          id: doc.id, title: d.title, slug: d.slug, excerpt: d.excerpt || '',
          contentHtml: d.contentHtml || '', featuredImageUrl: d.featuredImageUrl || '',
          category: d.category || '', tags: d.tags || [], status: d.status,
          publishedAt: d.publishedAt?.toDate?.()?.toISOString() || null,
          metaTitle: d.metaTitle || '', metaDescription: d.metaDescription || '',
          commentsEnabled: d.commentsEnabled !== false, authorName: d.authorName || 'Sellapage Team',
        },
      })
    }

    if (action === 'create-post' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      if (!body.title || !body.title.trim()) return res.status(400).json({ error: 'Title is required' })
      if (!body.contentHtml || !body.contentHtml.trim()) return res.status(400).json({ error: 'Post content is required' })
      if (!body.category) return res.status(400).json({ error: 'Please choose a category' })

      let statusFields
      try { statusFields = buildStatusFields(body) } catch (err) { return res.status(400).json({ error: err.message }) }

      const baseSlug = slugify(body.slug || body.title)
      const slug = await uniqueSlug(db, baseSlug || 'post', null)

      const now = new Date()
      const docData = {
        title: body.title.trim(),
        slug,
        excerpt: (body.excerpt || '').trim(),
        contentHtml: sanitizeContent(body.contentHtml),
        featuredImageUrl: body.featuredImageUrl ? String(body.featuredImageUrl).trim() : '',
        category: body.category,
        tags: Array.isArray(body.tags) ? body.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean) : [],
        metaTitle: (body.metaTitle || '').trim(),
        metaDescription: (body.metaDescription || '').trim(),
        commentsEnabled: body.commentsEnabled !== false,
        commentCount: 0,
        readTimeMinutes: estimateReadTime(sanitizeContent(body.contentHtml)),
        authorAdminUid: admin.uid,
        authorName: (body.authorName || 'Sellapage Team').trim(),
        createdAt: now,
        updatedAt: now,
        ...statusFields,
      }
      if (!docData.excerpt) docData.excerpt = getExcerpt(docData)

      const docRef = await db.collection('blogPosts').add(docData)
      return res.status(200).json({ success: true, postId: docRef.id, slug })
    }

    if (action === 'update-post' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Missing id' })
      if (!body.title || !body.title.trim()) return res.status(400).json({ error: 'Title is required' })
      if (!body.contentHtml || !body.contentHtml.trim()) return res.status(400).json({ error: 'Post content is required' })
      if (!body.category) return res.status(400).json({ error: 'Please choose a category' })

      const docRef = db.collection('blogPosts').doc(id)
      const existing = await docRef.get()
      if (!existing.exists) return res.status(404).json({ error: 'Post not found' })

      let statusFields
      try { statusFields = buildStatusFields(body) } catch (err) { return res.status(400).json({ error: err.message }) }

      const baseSlug = slugify(body.slug || body.title)
      const slug = await uniqueSlug(db, baseSlug || 'post', id)

      const updateData = {
        title: body.title.trim(),
        slug,
        excerpt: (body.excerpt || '').trim(),
        contentHtml: sanitizeContent(body.contentHtml),
        featuredImageUrl: body.featuredImageUrl ? String(body.featuredImageUrl).trim() : '',
        category: body.category,
        tags: Array.isArray(body.tags) ? body.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean) : [],
        metaTitle: (body.metaTitle || '').trim(),
        metaDescription: (body.metaDescription || '').trim(),
        commentsEnabled: body.commentsEnabled !== false,
        readTimeMinutes: estimateReadTime(sanitizeContent(body.contentHtml)),
        authorName: (body.authorName || 'Sellapage Team').trim(),
        updatedAt: new Date(),
        ...statusFields,
      }
      if (!updateData.excerpt) updateData.excerpt = getExcerpt(updateData)

      await docRef.update(updateData)
      return res.status(200).json({ success: true, postId: id, slug })
    }

    if (action === 'delete-post' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Missing id' })

      const commentsSnap = await db.collection('blogPosts').doc(id).collection('comments').get()
      const batch = db.batch()
      commentsSnap.docs.forEach(doc => batch.delete(doc.ref))
      batch.delete(db.collection('blogPosts').doc(id))
      await batch.commit()

      return res.status(200).json({ success: true })
    }

    // ---- Categories ----

    if (action === 'list-categories' && req.method === 'GET') {
      const snap = await db.collection('blogCategories').orderBy('name', 'asc').get()
      const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: undefined }))
      return res.status(200).json({ success: true, categories })
    }

    if (action === 'create-category' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const name = (body.name || '').trim()
      if (!name) return res.status(400).json({ error: 'Category name is required' })
      const slug = slugify(name)
      if (!slug) return res.status(400).json({ error: 'Invalid category name' })

      const ref = db.collection('blogCategories').doc(slug)
      const existing = await ref.get()
      if (existing.exists) return res.status(400).json({ error: 'That category already exists' })

      await ref.set({ name, slug, createdAt: new Date() })
      return res.status(200).json({ success: true, category: { id: slug, name, slug } })
    }

    if (action === 'delete-category' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await db.collection('blogCategories').doc(id).delete()
      return res.status(200).json({ success: true })
    }

    // ---- Comments (moderation) ----

    if (action === 'list-comments' && req.method === 'GET') {
      const postId = req.query.postId
      if (!postId) return res.status(400).json({ error: 'Missing postId' })
      const snap = await db.collection('blogPosts').doc(postId).collection('comments').orderBy('createdAt', 'desc').limit(500).get()
      const comments = snap.docs.map(doc => {
        const d = doc.data()
        return { id: doc.id, body: d.body, authorName: d.authorName, isAnonymous: d.isAnonymous !== false, createdAt: d.createdAt?.toDate?.()?.toISOString() || null }
      })
      return res.status(200).json({ success: true, comments })
    }

    if (action === 'delete-comment' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { postId, commentId } = body
      if (!postId || !commentId) return res.status(400).json({ error: 'Missing postId or commentId' })

      const postRef = db.collection('blogPosts').doc(postId)
      await postRef.collection('comments').doc(commentId).delete()
      await postRef.update({ commentCount: (await postRef.collection('comments').get()).size })
      return res.status(200).json({ success: true })
    }

    if (action === 'toggle-comments' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { postId, enabled } = body
      if (!postId) return res.status(400).json({ error: 'Missing postId' })
      await db.collection('blogPosts').doc(postId).update({ commentsEnabled: !!enabled })
      return res.status(200).json({ success: true, commentsEnabled: !!enabled })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[blog-admin] Error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
