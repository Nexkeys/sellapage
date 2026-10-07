import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { notifyStore } from './_lib/notifications.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'

// The vendor flow (verify-cac.js) stores dates as ISO strings, older admin
// writes stored Firestore Timestamps. Read both.
const iso = (v) => {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = v?.toDate?.() || (v instanceof Date ? v : null)
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

// Vendors get 3 paid attempts at Prembly (verify-cac.js, cacRetryCount); after
// that the vendor screen tells them to contact support. Those stores are the
// ones that need a person here.
const MAX_ATTEMPTS = 3
const needsHelp = (s) => !s.cacVerified && s.cacRetryCount >= MAX_ATTEMPTS

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'cac')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  try {
    const db = getAdminDb()
    const action = req.query.action || 'list'

    if (action === 'list') {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const statusFilter = req.query.status || 'all'

      const snap = await db.collection('stores').limit(500).get()
      let stores = snap.docs
        .map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            storeName: d.storeName || d.handle || doc.id,
            handle: d.handle || '',
            ownerName: d.ownerName || d.storeName || '',
            cacStatus: d.cacStatus || 'not_submitted',
            cacVerified: d.cacVerified || false,
            cacAttempts: d.cacAttempts || 0,
            // The counter the vendor screen actually uses (verify-cac.js).
            cacRetryCount: Number(d.cacRetryCount) || 0,
            cacLastRetryAt: iso(d.cacLastRetryAt),
            cacBusinessName: d.cacBusinessName || '',
            cacRcNumber: d.cacRcNumber || '',
            cacRegistrationDate: d.cacRegistrationDate || '',
            cacManual: d.cacManual === true,
            cacVerifiedAt: iso(d.cacVerifiedAt),
            cacRejectedAt: iso(d.cacRejectedAt),
            cacRejectionReason: d.cacRejectionReason || '',
            cacDocType: d.cacDocType || '',
            businessName: d.businessName || '',
            email: d.email || d.ownerEmail || '',
            whatsappNumber: d.whatsappNumber || '',
            plan: d.plan || 'starter',
          }
        })

      // Counted before the status filter, so the tiles do not change when a
      // filter is picked.
      const everyone = stores.slice()
      stores = stores
        .filter(s => {
          if (statusFilter === 'all') return true
          if (statusFilter === 'verified') return s.cacVerified === true
          if (statusFilter === 'needs_help') return needsHelp(s)
          if (statusFilter === 'not_submitted') return s.cacStatus === 'not_submitted' || s.cacStatus === 'pending'
          return s.cacStatus === statusFilter
        })
      const search = String(req.query.search || '').trim().toLowerCase()
      if (search) {
        stores = stores.filter((s) => [s.storeName, s.handle, s.businessName, s.cacBusinessName, s.cacRcNumber, s.email]
          .some((v) => String(v || '').toLowerCase().includes(search)))
      }
      stores = stores
        .sort((a, b) => {
          // People who ran out of tries first, then anything waiting, then
          // verified stores (the vendor flow saves the company's status,
          // e.g. "active", so cacVerified decides that, not cacStatus).
          const rank = (s) => (needsHelp(s) ? 0 : s.cacStatus === 'pending' || s.cacStatus === 'submitted' ? 1
            : s.cacVerified ? 2 : s.cacStatus === 'rejected' ? 3 : s.cacRetryCount > 0 ? 4 : 5)
          return rank(a) - rank(b) || String(b.cacLastRetryAt || '').localeCompare(String(a.cacLastRetryAt || ''))
        })

      const total = stores.length
      const offset = (page - 1) * limit
      const paged = stores.slice(offset, offset + limit)

      const stats = {
        total: everyone.length,
        verified: everyone.filter(s => s.cacVerified).length,
        pending: everyone.filter(s => s.cacStatus === 'pending' || s.cacStatus === 'submitted').length,
        rejected: everyone.filter(s => s.cacStatus === 'rejected').length,
        notSubmitted: everyone.filter(s => s.cacStatus === 'not_submitted').length,
        needsHelp: everyone.filter(needsHelp).length,
        tried: everyone.filter(s => !s.cacVerified && s.cacRetryCount > 0).length,
      }

      return res.status(200).json({ success: true, stores: paged, stats, page, limit, total })
    }

    // ---- CAC registration help requests ----
    // Vendors asking us to register a business for them. Separate from the
    // verification flow above: those already HAVE a CAC, these do not.
    if (action === 'requests') {
      const snap = await db.collection('cacRequests').limit(300).get()
      const statusFilter = req.query.status || 'open'

      const all = snap.docs.map((d) => {
        const r = d.data()
        return {
          id: d.id,
          storeId: r.storeId || '',
          storeName: r.storeName || '',
          businessName: r.businessName || '',
          entityType: r.entityType || '',
          proposedName: r.proposedName || '',
          contactEmail: r.contactEmail || '',
          contactPhone: r.contactPhone || '',
          notes: r.notes || '',
          status: r.status || 'new',
          createdAt: r.createdAt?.toDate?.()?.toISOString() || null,
          contactedAt: r.contactedAt?.toDate?.()?.toISOString() || null,
          contactedBy: r.contactedBy || null,
        }
      })

      const filtered = statusFilter === 'all'
        ? all
        : statusFilter === 'open'
          ? all.filter((r) => r.status !== 'closed' && r.status !== 'completed')
          : all.filter((r) => r.status === statusFilter)

      filtered.sort((a2, b2) => (b2.createdAt || '').localeCompare(a2.createdAt || ''))

      return res.status(200).json({
        success: true,
        requests: filtered,
        counts: {
          open: all.filter((r) => r.status !== 'closed' && r.status !== 'completed').length,
          total: all.length,
        },
      })
    }

    if (action === 'request-status' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {} } catch {}
      const { requestId, status } = body
      if (!requestId || !['new', 'contacted', 'completed', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid parameters' })
      }
      // Attribution comes from the verified admin, never the request body.
      await db.collection('cacRequests').doc(requestId).update({
        status,
        ...(status === 'contacted' ? { contactedAt: new Date(), contactedBy: admin.uid } : {}),
      })
      return res.status(200).json({ success: true })
    }

    if (action === 'update' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId, status, reason } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })
      if (!['verified', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const updateData = { cacStatus: status }
      if (status === 'verified') {
        // A manual check by a person (the vendor ran out of automatic tries,
        // or Prembly was down). The registered name and RC/BN number are
        // what the vendor's CAC screen shows, so they are kept when given.
        const rcNumber = String(body.rcNumber || '').trim().toUpperCase().replace(/^(RC|BN|IT|LP|LLP)/, '').replace(/\s+/g, '')
        const businessName = String(body.businessName || '').trim().slice(0, 160)
        if (rcNumber && !/^\d{1,12}$/.test(rcNumber)) {
          return res.status(400).json({ error: 'The RC or BN number should be digits, for example RC1234567.' })
        }
        updateData.cacVerified = true
        // ISO string, the same as the vendor flow, so the vendor's CAC tab
        // can show "Verified on ..." (a Timestamp there read as Invalid Date).
        updateData.cacVerifiedAt = new Date().toISOString()
        updateData.cacRejectionReason = ''
        updateData.cacManual = true
        updateData.cacVerifiedBy = admin.uid
        if (rcNumber) updateData.cacRcNumber = rcNumber
        if (businessName) updateData.cacBusinessName = businessName
      } else if (status === 'rejected') {
        updateData.cacVerified = false
        updateData.cacRejectedAt = new Date()
        updateData.cacRejectionReason = reason || 'Rejected by admin'
      } else {
        updateData.cacVerified = false
        updateData.cacRejectionReason = ''
      }

      await db.collection('stores').doc(storeId).update(updateData)

      // The CAC tab sits in the nav for every plan but paywalls internally on
      // `if (!isPro)` in CACVerificationTab.jsx, so the plan gate inside
      // notifyStore keeps the push in step with what the vendor can open.
      const CAC_MESSAGE = {
        verified: {
          title: 'CAC verified ✅',
          body: 'Your business is verified. The CAC badge now shows on your storefront.',
        },
        rejected: {
          title: 'CAC verification rejected',
          body: `Your CAC submission was not approved. Reason: ${updateData.cacRejectionReason}`,
        },
        pending: {
          title: 'CAC verification pending',
          body: 'Your CAC submission is being reviewed. We will let you know once it is done.',
        },
      }

      await notifyStore(db, storeId, {
        type: 'cac_status',
        title: CAC_MESSAGE[status].title,
        body: CAC_MESSAGE[status].body,
        data: { status },
      })

      return res.status(200).json({ success: true, storeId, updated: updateData })
    }

    if (action === 'retry-verify' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { storeId } = body
      if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

      // cacRetryCount is the counter the vendor screen reads (verify-cac.js).
      // Resetting only cacAttempts, as this used to, gave nobody another try.
      await db.collection('stores').doc(storeId).update({
        cacStatus: 'not_submitted',
        cacVerified: false,
        cacRejectionReason: '',
        cacAttempts: 0,
        cacRetryCount: 0,
      })
      return res.status(200).json({ success: true, message: 'CAC verification reset' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-cac] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
