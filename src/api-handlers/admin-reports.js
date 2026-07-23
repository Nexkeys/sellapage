import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const adminToken = req.headers['x-admin-token']
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const statusFilter = req.query.status || 'all'
      const offenseFilter = req.query.offense || 'all'

      const snap = await db.collection('storeReports').orderBy('createdAt', 'desc').limit(500).get()
      let reports = snap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          storeUrl: d.storeUrl || '',
          reporterName: d.reporterName || '',
          reporterEmail: d.reporterEmail || '',
          reporterPhone: d.reporterPhone || '',
          whereMet: d.whereMet || '',
          offenseType: d.offenseType || '',
          description: d.description || '',
          screenshotUrls: d.screenshotUrls || [],
          status: d.status || 'pending',
          adminNotes: d.adminNotes || '',
          reviewedBy: d.reviewedBy || '',
          reviewedAt: d.reviewedAt?.toDate?.()?.toISOString() || null,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        }
      })

      if (statusFilter !== 'all') {
        reports = reports.filter(r => r.status === statusFilter)
      }
      if (offenseFilter !== 'all') {
        reports = reports.filter(r => r.offenseType === offenseFilter)
      }

      const total = reports.length
      const offset = (page - 1) * limit
      const paged = reports.slice(offset, offset + limit)

      const allReports = snap.docs.map(doc => {
        const d = doc.data()
        return { status: d.status || 'pending', offenseType: d.offenseType || '' }
      })

      const stats = {
        total: allReports.length,
        pending: allReports.filter(r => r.status === 'pending').length,
        reviewed: allReports.filter(r => r.status === 'reviewed').length,
        resolved: allReports.filter(r => r.status === 'resolved').length,
        dismissed: allReports.filter(r => r.status === 'dismissed').length,
        scam: allReports.filter(r => r.offenseType === 'scam').length,
        fake_products: allReports.filter(r => r.offenseType === 'fake_products').length,
        non_delivery: allReports.filter(r => r.offenseType === 'non_delivery').length,
        identity_theft: allReports.filter(r => r.offenseType === 'identity_theft').length,
        counterfeit: allReports.filter(r => r.offenseType === 'counterfeit').length,
        other: allReports.filter(r => r.offenseType === 'other').length,
      }

      return res.status(200).json({ success: true, reports: paged, stats, page, limit, total })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { reportId, status, adminNotes } = body
      if (!reportId) return res.status(400).json({ error: 'Missing reportId' })
      if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const updateData = {
        status,
        reviewedAt: new Date(),
      }
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes

      await db.collection('storeReports').doc(reportId).update(updateData)
      return res.status(200).json({ success: true, reportId, updated: updateData })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-reports] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
