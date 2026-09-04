import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// An announcement's CTA url is rendered as an href on every vendor dashboard, so
// a `javascript:` or `data:` url stored here would be XSS across the whole
// merchant base. Only these schemes are ever accepted. WhatsApp, Instagram and
// Telegram links are all ordinary https, so nothing real is lost.
// The client re-checks this in src/utils/announcementLink.js, because the
// `active` read is public and older documents predate this validation.
const ALLOWED_CTA_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']

const DISPLAY_MODES = ['banner', 'modal']

// { ok: false } means the admin typed something we refuse to store.
// { ok: true, url: null } means they simply left it blank.
function normalizeCtaUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { ok: true, url: null }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false }
  }
  if (!ALLOWED_CTA_SCHEMES.includes(parsed.protocol.toLowerCase())) return { ok: false }
  return { ok: true, url: parsed.toString() }
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = req.query.action || 'list'
  // `active` stays public: AnnouncementBanner.jsx fetches it unauthenticated on
  // every dashboard load to show live banners. Preserved deliberately.
  const isPublicActiveRead = action === 'active' && req.method === 'GET'

  if (!isPublicActiveRead) {
    const admin = await verifyAdmin(req, 'announcements')
    if (!admin) return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()

    if (action === 'list') {
      const snap = await db.collection('announcements').limit(100).get()
      const announcements = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || null,
      })).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      return res.status(200).json({ success: true, announcements })
    }

    if (action === 'active') {
      const now = new Date()
      const snap = await db.collection('announcements')
        .where('active', '==', true)
        .limit(10)
        .get()

      const announcements = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
          expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || null,
        }))
        .filter(a => {
          if (a.expiresAt && new Date(a.expiresAt) < now) return false
          return true
        })

      return res.status(200).json({ success: true, announcements })
    }

    if (action === 'create' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { title, message, type, expiresAt, displayMode, ctaLabel, ctaUrl } = body
      if (!title || !message) return res.status(400).json({ error: 'Title and message required' })

      const cta = normalizeCtaUrl(ctaUrl)
      if (!cta.ok) {
        return res.status(400).json({
          error: 'Link must start with https://, http://, mailto: or tel:',
        })
      }

      const docData = {
        title: clean(title, 120),
        message: clean(message, 400),
        type: type || 'info',
        displayMode: DISPLAY_MODES.includes(displayMode) ? displayMode : 'banner',
        active: true,
        createdAt: new Date(),
      }

      // A button with no destination is pointless, and a destination with no
      // label would render a nameless button, so they are stored as a pair.
      if (cta.url) {
        docData.ctaUrl = cta.url
        docData.ctaLabel = clean(ctaLabel, 32) || 'Learn More'
      }

      if (expiresAt) docData.expiresAt = new Date(expiresAt)

      const ref = await db.collection('announcements').add(docData)
      return res.status(200).json({ success: true, id: ref.id })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const {
        announcementId, active, title, message, type, expiresAt,
        displayMode, ctaLabel, ctaUrl,
      } = body
      if (!announcementId) return res.status(400).json({ error: 'Missing announcementId' })

      const updateData = {}
      if (active !== undefined) updateData.active = active === true
      if (title !== undefined) updateData.title = clean(title, 120)
      if (message !== undefined) updateData.message = clean(message, 400)
      if (type !== undefined) updateData.type = type
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

      if (displayMode !== undefined) {
        updateData.displayMode = DISPLAY_MODES.includes(displayMode) ? displayMode : 'banner'
      }

      if (ctaUrl !== undefined) {
        const cta = normalizeCtaUrl(ctaUrl)
        if (!cta.ok) {
          return res.status(400).json({
            error: 'Link must start with https://, http://, mailto: or tel:',
          })
        }
        // Clearing the url clears the label too, so no nameless button is left.
        updateData.ctaUrl = cta.url
        updateData.ctaLabel = cta.url ? (clean(ctaLabel, 32) || 'Learn More') : null
      } else if (ctaLabel !== undefined) {
        updateData.ctaLabel = clean(ctaLabel, 32) || null
      }

      await db.collection('announcements').doc(announcementId).update(updateData)
      return res.status(200).json({ success: true, updated: updateData })
    }

    if (action === 'delete' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { announcementId } = body
      if (!announcementId) return res.status(400).json({ error: 'Missing announcementId' })

      await db.collection('announcements').doc(announcementId).delete()
      return res.status(200).json({ success: true, message: 'Announcement deleted' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-announcements] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
