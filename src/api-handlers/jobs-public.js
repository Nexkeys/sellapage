//src/api-handlers/jobs-public.js/
// Public, unauthenticated read access for the /jobs and /jobs/:jobId pages.
// Mirrors admin-reports.js's approach: one broad Firestore query, then filter/
// paginate in JS, to avoid needing a wide matrix of composite indexes.
import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const page = parseInt(req.query.page) || 1
      const limit = Math.min(parseInt(req.query.limit) || 20, 50)
      const category = req.query.category || 'all'
      const jobType = req.query.type || 'all'
      const search = (req.query.search || '').trim().toLowerCase()

      const snap = await db.collection('jobListings')
        .where('status', '==', 'approved')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()

      let jobs = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          title: d.title,
          businessName: d.businessName || '',
          storeSlug: d.storeSlug || '',
          location: d.location,
          jobType: d.jobType,
          category: d.category,
          imageUrl: d.imageUrl || '',
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        }
      })

      if (category !== 'all') jobs = jobs.filter(j => j.category === category)
      if (jobType !== 'all') jobs = jobs.filter(j => j.jobType === jobType)
      if (search) {
        jobs = jobs.filter(j =>
          j.title.toLowerCase().includes(search) ||
          j.businessName.toLowerCase().includes(search) ||
          j.location.toLowerCase().includes(search)
        )
      }

      const total = jobs.length
      const offset = (page - 1) * limit
      const paged = jobs.slice(offset, offset + limit)

      return res.status(200).json({ success: true, jobs: paged, total, page, limit })
    }

    if (action === 'get') {
      const jobId = req.query.id
      if (!jobId) return res.status(400).json({ error: 'Missing job id' })

      const jobSnap = await db.collection('jobListings').doc(jobId).get()
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job not found' })
      const job = jobSnap.data()

      if (job.status !== 'approved' || job.isActive === false) {
        return res.status(404).json({ error: 'Job not found' })
      }

      const storeSnap = await db.collection('stores').doc(job.storeId).get()
      const store = storeSnap.exists ? storeSnap.data() : {}

      return res.status(200).json({
        success: true,
        job: {
          id: jobSnap.id,
          title: job.title,
          pay: job.pay,
          mustHaves: job.mustHaves,
          location: job.location,
          availabilityTimeline: job.availabilityTimeline,
          jobType: job.jobType,
          category: job.category,
          description: job.description,
          imageUrl: job.imageUrl || '',
          businessName: job.businessName || '',
          storeSlug: job.storeSlug || '',
          createdAt: job.createdAt?.toDate?.()?.toISOString() || null,
        },
        contact: {
          whatsapp: store.jobContactWhatsapp || '',
          email: store.jobContactEmail || '',
          applicationLink: store.jobApplicationLink || '',
        },
        storeLogoUrl: store.logoUrl || '',
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[jobs-public] Error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
