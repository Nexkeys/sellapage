// src/api-handlers/loyalty-vendor.js
// Authenticated loyalty endpoints for the vendor's own dashboard tab.
//
// Read only by design. There is no action here that edits a balance or issues
// points by hand. That keeps a vendor out of a position where they can quietly
// mint discounts for themselves, and keeps the earned/redeemed figures a true
// record of what actually happened at checkout.
//
// Kept separate from loyalty-public.js so the authenticated and unauthenticated
// paths cannot drift into one file and lose a check.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { isPremiumStore, readLoyaltyConfig, formatCode } from './_lib/loyalty.js'

const PAGE_SIZE = 20

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const storeId = req.query.storeId
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Owner or staff with the loyalty tab. Read only, so needsWrite is false.
    const access = await resolveStoreAccess(decoded.uid, storeId, 'loyalty', false)
    if (!access.allowed) return res.status(403).json({ error: 'Forbidden' })

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })

    const storeData = storeSnap.data() || {}
    if (!isPremiumStore(storeData)) {
      return res.status(403).json({ error: 'premium_required' })
    }

    const config = readLoyaltyConfig(storeData)

    // Fetched whole then sorted and paged in memory, matching the approach
    // admin-referrals.js already uses. It avoids needing a composite index, and
    // a single store's card count stays small enough that this is cheaper than
    // maintaining an index for it.
    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection('loyalty')
      .get()

    const all = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        code: formatCode(doc.id),
        customerName: d.customerName || '',
        customerEmail: d.customerEmail || '',
        customerPhone: d.customerPhone || '',
        points: Number(d.points) || 0,
        lifetimeEarned: Number(d.lifetimeEarned) || 0,
        lifetimeRedeemed: Number(d.lifetimeRedeemed) || 0,
        frozen: d.frozen === true,
        lastActivity:
          d.lastRedeemedAt?.toDate?.()?.toISOString() ||
          d.lastEarnedAt?.toDate?.()?.toISOString() ||
          d.createdAt?.toDate?.()?.toISOString() ||
          null,
      }
    })

    const search = String(req.query.search || '').trim().toLowerCase()
    const filtered = search
      ? all.filter(
          (c) =>
            c.customerName.toLowerCase().includes(search) ||
            c.customerEmail.toLowerCase().includes(search) ||
            c.code.toLowerCase().includes(search),
        )
      : all

    filtered.sort((a, b) => b.points - a.points)

    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const start = (page - 1) * PAGE_SIZE
    const cards = filtered.slice(start, start + PAGE_SIZE)

    const totals = all.reduce(
      (acc, c) => {
        acc.outstanding += c.points
        acc.earned += c.lifetimeEarned
        acc.redeemed += c.lifetimeRedeemed
        return acc
      },
      { outstanding: 0, earned: 0, redeemed: 0 },
    )

    return res.status(200).json({
      success: true,
      config,
      cards,
      total: filtered.length,
      page,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
      totals: {
        ...totals,
        // What the outstanding balance would cost the vendor if every customer
        // spent everything today. The number they actually care about.
        outstandingValue: Math.floor(totals.outstanding * config.redeemValue),
      },
    })
  } catch (err) {
    console.error('[loyalty-vendor] error', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
