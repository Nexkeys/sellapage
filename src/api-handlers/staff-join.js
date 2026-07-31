// src/api-handlers/staff-join.js
// Public (no auth required going in) invite-redemption endpoint — creates a
// brand-new, independent Firebase Auth identity for the staff member and
// links it to the inviting store. Mirrors admin-manage.js's createUser
// precedent for server-side account provisioning.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.action === 'check') {
    const code = (req.query.code || '').trim()
    if (!code) return res.status(400).json({ error: 'code is required' })
    try {
      const db = getAdminDb()
      const snap = await db.collection('staffInvites').doc(code).get()
      if (!snap.exists) return res.status(404).json({ error: 'Invite code not found.' })
      const invite = snap.data()
      if (invite.revoked) return res.status(400).json({ error: 'This invite has been revoked.' })
      if (invite.usedByUid) return res.status(400).json({ error: 'This invite has already been used.' })
      if ((invite.expiresAt?.toDate?.()?.getTime() || 0) < Date.now()) {
        return res.status(400).json({ error: 'This invite has expired — ask the store owner for a new code.' })
      }
      const roleSnap = await db.collection('stores').doc(invite.storeId).collection('staffRoles').doc(invite.roleId).get()
      const storeSnap = await db.collection('stores').doc(invite.storeId).get()
      return res.status(200).json({
        success: true,
        storeName: storeSnap.exists ? (storeSnap.data().storeName || storeSnap.data().businessName || '') : '',
        roleName: roleSnap.exists ? roleSnap.data().name : '',
      })
    } catch (err) {
      console.error('[staff-join check] Error:', err)
      return res.status(500).json({ error: 'Server error' })
    }
  }

  if (req.method !== 'POST' || req.query.action !== 'redeem') {
    return res.status(400).json({ error: 'Invalid request' })
  }

  let body = {}
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body } catch {}
  const { code, name, email, password } = body
  if (!code) return res.status(400).json({ error: 'code is required' })
  if (!name || !name.trim()) return res.status(400).json({ error: 'Your name is required' })
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  try {
    const db = getAdminDb()
    const auth = getAdminAuth()
    const inviteRef = db.collection('staffInvites').doc(code)

    // Validate + claim the invite atomically so two concurrent redemptions
    // of the same code can't both succeed.
    let invite
    try {
      invite = await db.runTransaction(async (tx) => {
        const snap = await tx.get(inviteRef)
        if (!snap.exists) throw new Error('not_found')
        const data = snap.data()
        if (data.revoked) throw new Error('revoked')
        if (data.usedByUid) throw new Error('already_used')
        if ((data.expiresAt?.toDate?.()?.getTime() || 0) < Date.now()) throw new Error('expired')
        tx.update(inviteRef, { usedAt: new Date(), claiming: true })
        return data
      })
    } catch (txErr) {
      const messages = {
        not_found: 'Invite code not found.',
        revoked: 'This invite has been revoked.',
        already_used: 'This invite has already been used.',
        expired: 'This invite has expired — ask the store owner for a new code.',
      }
      return res.status(400).json({ error: messages[txErr.message] || 'Could not redeem invite.' })
    }

    let userRecord
    try {
      userRecord = await auth.createUser({ email: email.trim(), password, displayName: name.trim() })
    } catch (authErr) {
      // Release the claim so the code can still be used if account creation failed.
      await inviteRef.update({ usedAt: null, claiming: false })
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'An account with this email already exists.' })
      }
      return res.status(500).json({ error: `Failed to create account: ${authErr.message}` })
    }

    const uid = userRecord.uid
    const membershipRef = db.collection('staffMemberships').doc(`${invite.storeId}_${uid}`)
    const storeRef = db.collection('stores').doc(invite.storeId)

    const batch = db.batch()
    batch.set(membershipRef, {
      storeId: invite.storeId,
      staffUid: uid,
      roleId: invite.roleId,
      name: name.trim(),
      email: email.trim(),
      active: true,
      invitedBy: invite.storeId,
      createdAt: new Date(),
      deactivatedAt: null,
    })
    batch.update(inviteRef, { usedByUid: uid, claiming: false })
    batch.update(storeRef, { staffPendingInviteCount: FieldValue.increment(-1) })
    await batch.commit()

    const customToken = await auth.createCustomToken(uid)
    return res.status(200).json({ success: true, customToken })
  } catch (err) {
    console.error('[staff-join redeem] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
