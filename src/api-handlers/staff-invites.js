// src/api-handlers/staff-invites.js
// Owner-only invite code management. Uses denormalized counters on the store
// doc (staffPendingInviteCount, staffInviteWindowCount/staffInviteWindowStart)
// for rate-limit/cap enforcement instead of range/compound queries - avoids
// needing a new Firestore composite index, consistent with this codebase's
// established counter pattern (referralTotalClicks etc.) and its documented
// history of production issues from missing composite indexes.
import crypto from 'crypto'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'
import { redeemProof, logAudit, otpErrorMessage, OTP_PURPOSES } from './_lib/otp.js'
import { clientKey } from './_lib/rate-limit.js'
import {
  MAX_PENDING_INVITES,
  INVITE_RATE_LIMIT_PER_HOUR,
  INVITE_EXPIRY_MS,
  MAX_ACTIVE_STAFF,
} from '../utils/staffRoles.js'

const RATE_WINDOW_MS = 60 * 60 * 1000

// crypto.randomBytes, not Math.random. Math.random is V8's xorshift128+, whose
// internal state is recoverable from a handful of consecutive outputs - and
// redeeming an invite creates a staff account with real access to a store's
// data, against an unauthenticated endpoint (staff-join.js). Widened from 6 to
// 8 characters at the same time: 32^8 ≈ 1.1e12 instead of 32^6 ≈ 1.1e9.
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  let code = 'ST-'
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i] % chars.length)
  }
  return code
}

async function verifyOwner(req) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return null
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    return decoded.uid
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const ownerUid = await verifyOwner(req)
  if (!ownerUid) return res.status(401).json({ error: 'Unauthorized' })

  const db = getAdminDb()
  const storeRef = db.collection('stores').doc(ownerUid)
  const invitesRef = db.collection('staffInvites')
  const action = req.query.action || 'list'

  try {
    if (action === 'list' && req.method === 'GET') {
      const snap = await invitesRef.where('storeId', '==', ownerUid).get()
      const now = Date.now()
      const pending = snap.docs
        .map((d) => ({ code: d.id, ...d.data() }))
        .filter((inv) => !inv.revoked && !inv.usedByUid && (inv.expiresAt?.toDate?.()?.getTime() || 0) > now)
        .map((inv) => ({
          code: inv.code,
          roleId: inv.roleId,
          createdAt: inv.createdAt?.toDate?.()?.toISOString() || null,
          expiresAt: inv.expiresAt?.toDate?.()?.toISOString() || null,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return res.status(200).json({ success: true, invites: pending })
    }

    if (action === 'create' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { roleId } = body
      if (!roleId) return res.status(400).json({ error: 'roleId is required' })

      // Step-up verification: an invite code grants a stranger access to this
      // store's data, so it needs a freshly verified email OTP bound to this
      // uid and to the staff_invite purpose. Burned here - one code, one invite.
      const proof = await redeemProof(db, { uid: ownerUid, purpose: OTP_PURPOSES.STAFF_INVITE })
      if (!proof.ok) {
        await logAudit(db, {
          uid: ownerUid,
          action: 'staff_invite_create',
          purpose: OTP_PURPOSES.STAFF_INVITE,
          result: 'blocked',
          ip: clientKey(req),
          userAgent: req.headers['user-agent'] || '',
          meta: { reason: proof.error },
        })
        return res.status(403).json({ error: proof.error, message: otpErrorMessage(proof.error) })
      }

      const roleSnap = await storeRef.collection('staffRoles').doc(roleId).get()
      if (!roleSnap.exists) return res.status(404).json({ error: 'Role not found' })

      const storeSnap = await storeRef.get()
      const storeData = storeSnap.data() || {}

      // Active staff seat cap (Premium only feature)
      if (storeData.plan !== 'premium') {
        return res.status(403).json({ error: 'Staff Accounts is a Premium feature.' })
      }
      const staffSnap = await db.collection('staffMemberships').where('storeId', '==', ownerUid).get()
      const activeStaffCount = staffSnap.docs.filter((d) => d.data().active === true).length
      if (activeStaffCount >= MAX_ACTIVE_STAFF) {
        return res.status(400).json({ error: `Maximum of ${MAX_ACTIVE_STAFF} active staff per store.` })
      }

      const pendingCount = storeData.staffPendingInviteCount || 0
      if (pendingCount >= MAX_PENDING_INVITES) {
        return res.status(400).json({ error: `Maximum of ${MAX_PENDING_INVITES} pending invites at once - revoke an unused one first.` })
      }

      const now = Date.now()
      const windowStart = storeData.staffInviteWindowStart?.toDate?.()?.getTime() || 0
      const windowStale = now - windowStart > RATE_WINDOW_MS
      const windowCount = windowStale ? 0 : (storeData.staffInviteWindowCount || 0)
      if (windowCount >= INVITE_RATE_LIMIT_PER_HOUR) {
        return res.status(429).json({ error: `Maximum of ${INVITE_RATE_LIMIT_PER_HOUR} invites per hour - try again shortly.` })
      }

      let code = generateCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await invitesRef.doc(code).get()
        if (!existing.exists) break
        code = generateCode()
        attempts++
      }

      const expiresAt = new Date(now + INVITE_EXPIRY_MS)
      const batch = db.batch()
      batch.set(invitesRef.doc(code), {
        storeId: ownerUid,
        roleId,
        createdAt: new Date(),
        expiresAt,
        revoked: false,
        usedByUid: null,
        usedAt: null,
      })
      batch.update(storeRef, {
        staffPendingInviteCount: FieldValue.increment(1),
        staffInviteWindowCount: windowStale ? 1 : FieldValue.increment(1),
        ...(windowStale ? { staffInviteWindowStart: new Date() } : {}),
      })
      await batch.commit()

      return res.status(200).json({ success: true, code, expiresAt: expiresAt.toISOString() })
    }

    if (action === 'revoke' && req.method === 'POST') {
      let body = {}
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
      const { code } = body
      if (!code) return res.status(400).json({ error: 'code is required' })

      const ref = invitesRef.doc(code)
      const snap = await ref.get()
      if (!snap.exists || snap.data().storeId !== ownerUid) {
        return res.status(404).json({ error: 'Invite not found' })
      }
      const invite = snap.data()
      if (invite.revoked || invite.usedByUid) {
        return res.status(200).json({ success: true }) // already inactive, nothing to do
      }

      const batch = db.batch()
      batch.update(ref, { revoked: true })
      batch.update(storeRef, { staffPendingInviteCount: FieldValue.increment(-1) })
      await batch.commit()

      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[staff-invites] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
