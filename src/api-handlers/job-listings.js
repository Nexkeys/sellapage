//src/api-handlers/job-listings.js/
// Vendor-authenticated CRUD for the Jobs & Opportunities module. Mirrors the
// storeReports precedent: jobListings is a top-level collection (not a
// stores/{id} subcollection) because admin + the public /jobs page both need
// cross-tenant queries. All access goes through this handler (and jobs-public.js
// / admin-jobs.js) rather than direct client Firestore SDK calls, since this
// repo's live security rules aren't version-controlled/editable here.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { JOB_TYPE_SLUGS, JOB_CATEGORY_SLUGS } from '../utils/jobCategories.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

const JOB_LISTING_LIMITS = { starter: 5, growth: 25, pro: 50, premium: 999999 }

const WHATSAPP_RE = /^\+?[0-9]{7,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidUrl(value) {
  if (!value) return true
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function verifyVendor(req, res, adminAuth, expectedStoreId, needsWrite = true) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) {
    res.status(401).json({ error: 'Please sign in again.' })
    return null
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
    return null
  }
  if (expectedStoreId) {
    const access = await resolveStoreAccess(decoded.uid, expectedStoreId, 'job-listings', needsWrite)
    if (!access.allowed) {
      res.status(403).json({ error: 'You can only manage your own job listings.' })
      return null
    }
  }
  return decoded
}

function validateJobFields(body) {
  const required = ['title', 'pay', 'mustHaves', 'location', 'availabilityTimeline', 'jobType', 'category', 'description']
  for (const field of required) {
    if (!body[field] || !String(body[field]).trim()) {
      return `Please fill in "${field}".`
    }
  }
  if (!JOB_TYPE_SLUGS.includes(body.jobType)) return 'Please choose a valid job type.'
  if (!JOB_CATEGORY_SLUGS.includes(body.category)) return 'Please choose a valid category.'
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const db = getAdminDb()
    const adminAuth = getAdminAuth()
    const action = req.query.action || ''

    // ---- save-contact ----
    if (action === 'save-contact' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { storeId, whatsapp, email, applicationLink } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId)
      if (!decoded) return

      if (!whatsapp || !WHATSAPP_RE.test(whatsapp.trim())) {
        return res.status(400).json({ error: 'Please enter a valid WhatsApp number with country code, e.g. +2348012345678.' })
      }
      if (!email || !EMAIL_RE.test(email.trim())) {
        return res.status(400).json({ error: 'Please enter a valid email address.' })
      }
      if (applicationLink && !isValidUrl(applicationLink.trim())) {
        return res.status(400).json({ error: 'Please enter a valid application link URL.' })
      }

      await db.collection('stores').doc(storeId).update({
        jobContactWhatsapp: whatsapp.trim(),
        jobContactEmail: email.trim(),
        jobApplicationLink: applicationLink ? applicationLink.trim() : '',
        jobContactSavedAt: new Date(),
      })

      return res.status(200).json({ success: true })
    }

    // ---- list (vendor's own jobs) ----
    if (action === 'list' && req.method === 'GET') {
      const storeId = req.query.storeId
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId, false)
      if (!decoded) return

      const snap = await db.collection('jobListings')
        .where('storeId', '==', storeId)
        .orderBy('createdAt', 'desc')
        .get()

      const jobs = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          title: d.title, pay: d.pay, mustHaves: d.mustHaves, location: d.location,
          availabilityTimeline: d.availabilityTimeline, jobType: d.jobType, category: d.category,
          description: d.description, imageUrl: d.imageUrl || '',
          status: d.status, isActive: d.isActive !== false, rejectionReason: d.rejectionReason || '',
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
        }
      })

      return res.status(200).json({ success: true, jobs })
    }

    // ---- create ----
    if (action === 'create' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { storeId } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId)
      if (!decoded) return

      const fieldError = validateJobFields(body)
      if (fieldError) return res.status(400).json({ error: fieldError })

      const storeSnap = await db.collection('stores').doc(storeId).get()
      if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
      const store = storeSnap.data()

      if (!store.jobContactSavedAt) {
        return res.status(400).json({ error: 'Please save your WhatsApp and email contact info before posting a job.' })
      }

      const plan = store.plan || 'starter'
      const limit = store.maxJobListings ?? JOB_LISTING_LIMITS[plan] ?? JOB_LISTING_LIMITS.starter

      const countSnap = await db.collection('jobListings').where('storeId', '==', storeId).get()
      if (countSnap.size >= limit) {
        return res.status(403).json({ error: `You've used all ${limit} job listing slots on your ${plan} plan. Upgrade to post more.` })
      }

      const now = new Date()
      const jobDoc = {
        storeId,
        businessName: store.businessName || '',
        storeSlug: store.storeName || '',
        title: String(body.title).trim(),
        pay: String(body.pay).trim(),
        mustHaves: String(body.mustHaves).trim(),
        location: String(body.location).trim(),
        availabilityTimeline: String(body.availabilityTimeline).trim(),
        jobType: body.jobType,
        category: body.category,
        description: String(body.description).trim(),
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : '',
        status: 'pending',
        isActive: true,
        rejectionReason: '',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await db.collection('jobListings').add(jobDoc)
      return res.status(200).json({ success: true, jobId: docRef.id })
    }

    // ---- update (also handles resubmit-after-rejection) ----
    if (action === 'update' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { storeId, jobId } = body
      if (!storeId || !jobId) return res.status(400).json({ error: 'Missing storeId or jobId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId)
      if (!decoded) return

      const fieldError = validateJobFields(body)
      if (fieldError) return res.status(400).json({ error: fieldError })

      const jobRef = db.collection('jobListings').doc(jobId)
      const jobSnap = await jobRef.get()
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job listing not found' })
      const existing = jobSnap.data()
      if (existing.storeId !== storeId) return res.status(403).json({ error: 'Forbidden' })

      const wasRejected = existing.status === 'rejected'

      const updateData = {
        title: String(body.title).trim(),
        pay: String(body.pay).trim(),
        mustHaves: String(body.mustHaves).trim(),
        location: String(body.location).trim(),
        availabilityTimeline: String(body.availabilityTimeline).trim(),
        jobType: body.jobType,
        category: body.category,
        description: String(body.description).trim(),
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : '',
        updatedAt: new Date(),
      }

      if (wasRejected) {
        updateData.status = 'pending'
        updateData.rejectionReason = ''
        updateData.reviewedAt = null
        updateData.reviewedBy = null
      }

      await jobRef.update(updateData)
      return res.status(200).json({ success: true, resubmitted: wasRejected })
    }

    // ---- toggle active/inactive ----
    if (action === 'toggle' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { storeId, jobId } = body
      if (!storeId || !jobId) return res.status(400).json({ error: 'Missing storeId or jobId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId)
      if (!decoded) return

      const jobRef = db.collection('jobListings').doc(jobId)
      const jobSnap = await jobRef.get()
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job listing not found' })
      const existing = jobSnap.data()
      if (existing.storeId !== storeId) return res.status(403).json({ error: 'Forbidden' })

      const newActive = existing.isActive === false
      await jobRef.update({ isActive: newActive, updatedAt: new Date() })
      return res.status(200).json({ success: true, isActive: newActive })
    }

    // ---- delete ----
    if (action === 'delete' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { storeId, jobId } = body
      if (!storeId || !jobId) return res.status(400).json({ error: 'Missing storeId or jobId' })
      const decoded = await verifyVendor(req, res, adminAuth, storeId)
      if (!decoded) return

      const jobRef = db.collection('jobListings').doc(jobId)
      const jobSnap = await jobRef.get()
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job listing not found' })
      const existing = jobSnap.data()
      if (existing.storeId !== storeId) return res.status(403).json({ error: 'Forbidden' })

      await jobRef.delete()
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[job-listings] Error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
