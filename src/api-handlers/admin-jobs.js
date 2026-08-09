//src/api-handlers/admin-jobs.js/
// Admin moderation for the Jobs & Opportunities module. x-admin-token gated,
// same convention as every other admin-*.js handler. Unlike the existing CAC
// manual-override and referral-withdrawal admin flows (neither of which emails
// the vendor on the admin's action), both approve and reject here email the
// vendor — closing that gap for the first time in this codebase.
import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'jobs')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const statusFilter = req.query.status || 'all'

      const snap = await db.collection('jobListings').orderBy('createdAt', 'desc').limit(500).get()
      let jobs = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          storeId: d.storeId,
          businessName: d.businessName || '',
          storeSlug: d.storeSlug || '',
          title: d.title, pay: d.pay, mustHaves: d.mustHaves, location: d.location,
          availabilityTimeline: d.availabilityTimeline, jobType: d.jobType, category: d.category,
          description: d.description, imageUrl: d.imageUrl || '',
          status: d.status || 'pending', isActive: d.isActive !== false,
          rejectionReason: d.rejectionReason || '',
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        }
      })

      const stats = {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        approved: jobs.filter(j => j.status === 'approved').length,
        rejected: jobs.filter(j => j.status === 'rejected').length,
      }

      if (statusFilter !== 'all') jobs = jobs.filter(j => j.status === statusFilter)

      return res.status(200).json({ success: true, jobs, stats })
    }

    if (action === 'update' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      // adminUid no longer accepted from the body — attribution comes from the
      // verified admin identity so the moderation trail can't be forged.
      const { jobId, status, rejectionReason } = body

      if (!jobId) return res.status(400).json({ error: 'Missing jobId' })
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({ error: 'A rejection reason is required.' })
      }

      const jobRef = db.collection('jobListings').doc(jobId)
      const jobSnap = await jobRef.get()
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job listing not found' })
      const job = jobSnap.data()

      const updateData = {
        status,
        reviewedAt: new Date(),
        reviewedBy: admin.uid,
        reviewedByRole: admin.role,
      }
      updateData.rejectionReason = status === 'rejected' ? rejectionReason.trim() : ''

      await jobRef.update(updateData)

      const storeSnap = await db.collection('stores').doc(job.storeId).get()
      const store = storeSnap.exists ? storeSnap.data() : {}
      const vendorEmail = store.email

      if (vendorEmail) {
        const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'
        const dashboardLink = `${appUrl}/dashboard?tab=job-listings`

        if (status === 'approved') {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#16a34a;padding:18px;color:#fff;font-weight:700;">${store.businessName || 'Sellapage'}</div>
              <div style="padding:20px;background:#fff;color:#111827;">
                <h2 style="margin:0 0 12px 0;">Your Job Listing Is Live!</h2>
                <p style="margin:0 0 8px 0;">Your job post "<strong>${job.title}</strong>" has been approved and is now visible on Sellapage's public Jobs & Opportunities page.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
                <p style="color:#9ca3af;font-size:12px;">This is an automated message from Sellapage.</p>
              </div>
            </div>
          `
          sendEmail(vendorEmail, 'Your Job Listing Is Now Live', html).catch(() => {})
        } else {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#dc2626;padding:18px;color:#fff;font-weight:700;">${store.businessName || 'Sellapage'}</div>
              <div style="padding:20px;background:#fff;color:#111827;">
                <h2 style="margin:0 0 12px 0;">Your Job Listing Needs Changes</h2>
                <p style="margin:0 0 8px 0;">Your job post "<strong>${job.title}</strong>" was not approved for the following reason:</p>
                <p style="margin:0 0 16px 0;padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;">${rejectionReason.trim()}</p>
                <p style="margin:0 0 16px 0;">Please log in, make the needed changes, and resubmit for review.</p>
                <a href="${dashboardLink}" style="background-color:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;font-weight:bold;border-radius:6px;display:inline-block;">Edit Your Job Post</a>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
                <p style="color:#9ca3af;font-size:12px;">This is an automated message from Sellapage.</p>
              </div>
            </div>
          `
          sendEmail(vendorEmail, 'Action Needed: Your Job Listing Was Rejected', html).catch(() => {})
        }
      }

      return res.status(200).json({ success: true, jobId, status })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-jobs] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
