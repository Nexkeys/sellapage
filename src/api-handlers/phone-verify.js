// src/api-handlers/phone-verify.js
// Completes phone verification (Phase 3). Called after /api/otp-verify has
// succeeded for the phone_verify purpose.
//
// The number written to the store is read from the CHALLENGE (`pendingPhone`,
// recorded server-side when the SMS was sent), never from this request - so a
// caller cannot verify one number and then attach a different one.
//
// `action=status` lets the UI ask whether SMS is usable at all, so it can show
// an honest "not available yet" state while Termii sender-ID approval is
// outstanding rather than offering a button that always fails.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, getBearerToken } from './_lib/http.js'
import { clientKey } from './_lib/rate-limit.js'
import { redeemProofWithData, logAudit, otpErrorMessage, OTP_PURPOSES } from './_lib/otp.js'
import { getSmsConfigStatus, maskPhone } from './_lib/termii.js'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,POST,OPTIONS' })) return

  const idToken = getBearerToken(req)
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''
  const action = req.query.action || 'complete'

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
    }
    const uid = decoded.uid

    // ---- status: is phone verification usable right now? ----------------
    if (action === 'status') {
      const sms = getSmsConfigStatus()
      const storeSnap = await db.collection('stores').doc(uid).get()
      const s = storeSnap.exists ? storeSnap.data() : {}
      return res.status(200).json({
        success: true,
        available: sms.available,
        // Config-level reason only - never leaks the key or the sender value.
        unavailableReason: sms.available ? null : sms.reason,
        phoneVerified: s.phoneVerified === true,
        phoneVerifiedMasked: s.phoneVerifiedMasked || null,
      })
    }

    // ---- complete: burn the verified challenge and attach the number -----
    if (action === 'complete' && req.method === 'POST') {
      const proof = await redeemProofWithData(db, { uid, purpose: OTP_PURPOSES.PHONE_VERIFY })
      if (!proof.ok) {
        await logAudit(db, {
          uid,
          action: 'phone_verify',
          purpose: OTP_PURPOSES.PHONE_VERIFY,
          result: 'blocked',
          ip,
          userAgent,
          meta: { reason: proof.error },
        })
        return res.status(403).json({ error: proof.error, message: otpErrorMessage(proof.error) })
      }

      const phone = proof.data?.pendingPhone
      if (!phone) {
        return res.status(400).json({ error: 'no_phone', message: 'Verification incomplete. Please start again.' })
      }

      // ONE NUMBER, ONE ACCOUNT - enforced atomically.
      //
      // A "query first, then write" check would race: two signups verifying the
      // same number at the same moment would both see it free and both claim
      // it. Instead the number itself is the document id in `verifiedPhones`,
      // so the claim either succeeds or collides inside a transaction. No
      // composite index, no race, and it doubles as a reverse lookup.
      const claimRef = db.collection('verifiedPhones').doc(phone)
      const storeRef = db.collection('stores').doc(uid)

      try {
        await db.runTransaction(async (tx) => {
          const claim = await tx.get(claimRef)
          if (claim.exists && claim.data().storeId !== uid) {
            throw new Error('phone_taken')
          }

          // Release a different number this store previously held, so a vendor
          // changing their number doesn't permanently squat the old one.
          const storeSnap = await tx.get(storeRef)
          const previous = storeSnap.exists ? storeSnap.data().verifiedPhone : null

          tx.set(claimRef, {
            storeId: uid,
            claimedAt: new Date().toISOString(),
          })

          tx.update(storeRef, {
            verifiedPhone: phone,
            phoneVerifiedMasked: maskPhone(phone),
            phoneVerified: true,
            phoneVerifiedAt: new Date().toISOString(),
          })

          if (previous && previous !== phone) {
            tx.delete(db.collection('verifiedPhones').doc(previous))
          }
        })
      } catch (err) {
        if (err.message === 'phone_taken') {
          await logAudit(db, {
            uid,
            action: 'phone_verify',
            purpose: OTP_PURPOSES.PHONE_VERIFY,
            result: 'duplicate_number',
            ip,
            userAgent,
            meta: { phoneMasked: maskPhone(phone) },
          })
          return res.status(409).json({
            error: 'phone_taken',
            message: 'That phone number is already linked to another Sellapage account.',
          })
        }
        throw err
      }

      await logAudit(db, {
        uid,
        action: 'phone_verify',
        purpose: OTP_PURPOSES.PHONE_VERIFY,
        result: 'completed',
        ip,
        userAgent,
        meta: { phoneMasked: maskPhone(phone) },
      })

      return res.status(200).json({
        success: true,
        phoneVerified: true,
        phoneVerifiedMasked: maskPhone(phone),
      })
    }

    return res.status(400).json({ error: 'invalid_action' })
  } catch (err) {
    console.error('[phone-verify] Error:', err.message)
    return res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' })
  }
}
