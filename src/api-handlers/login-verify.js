// src/api-handlers/login-verify.js
// Completes a login-time OTP challenge (Phase 2) by marking THIS session
// trusted. Called after /api/otp-verify succeeds for the `login` purpose.
//
// Marking is per-session, not per-account: verifying on your laptop must not
// silently trust a different device that is mid-challenge.
//
// See _lib/login-risk.js for the policy and the honest limits of enforcement.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, getBearerToken, parseJsonBody } from './_lib/http.js'
import { clientKey } from './_lib/rate-limit.js'
import { resolveCallerStoreId } from './_lib/verify-store-access.js'
import { redeemProof, logAudit, otpErrorMessage, OTP_PURPOSES } from './_lib/otp.js'
import { isLoginOtpEnabled } from './_lib/login-risk.js'
import { getLockState } from './_lib/login-lockout.js'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'POST,OPTIONS' })) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const idToken = getBearerToken(req)
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''
  const { sessionId } = parseJsonBody(req) || {}
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

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

    // Works for owners and staff alike - staff sessions live under the store
    // they act on, not under their own uid.
    const access = await resolveCallerStoreId(uid)
    if (!access?.storeId) return res.status(403).json({ error: 'Forbidden' })

    // A locked account must not be able to trust a device by clearing an email
    // OTP. Without this, the OTP screen becomes an alternative way in for
    // someone who has the password but is locked out.
    if (decoded.email) {
      const lock = await getLockState(db, decoded.email)
      if (lock.locked) {
        return res.status(423).json({
          error: 'account_locked',
          message: 'This account is locked. Use account recovery to regain access.',
        })
      }
    }

    // Burn the verified challenge. Bound to uid + the `login` purpose, so a
    // code issued for any other action cannot trust a device.
    const proof = await redeemProof(db, { uid, purpose: OTP_PURPOSES.LOGIN })
    if (!proof.ok) {
      await logAudit(db, {
        uid,
        action: 'login_otp',
        purpose: OTP_PURPOSES.LOGIN,
        result: 'blocked',
        ip,
        userAgent,
        meta: { reason: proof.error, sessionId },
      })
      return res.status(403).json({ error: proof.error, message: otpErrorMessage(proof.error) })
    }

    const ref = db.collection('stores').doc(access.storeId).collection('sessions').doc(sessionId)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' })

    await ref.update({
      otpVerifiedAt: Date.now(),
      otpPending: false,
      otpReason: null,
    })

    // Receiving the emailed code proves control of the account's email address,
    // so record that on the store document itself. The storefront email gate
    // reads this to decide whether a store may appear publicly.
    //
    // Owner only, deliberately: a staff member clearing their own device
    // challenge says nothing about who owns the store's email, and
    // resolveCallerStoreId returns a storeId for staff too.
    if (access.role === 'owner' && access.storeId === uid) {
      try {
        await db.collection('stores').doc(access.storeId).set(
          { emailVerifiedAt: Date.now() },
          { merge: true },
        )
      } catch (err) {
        // Never fail the sign-in over this; the gate simply keeps the store
        // hidden until a later verification writes the field.
        console.error('[login-verify] could not mark email verified:', err)
      }
    }

    await logAudit(db, {
      uid,
      action: 'login_otp',
      purpose: OTP_PURPOSES.LOGIN,
      result: 'verified',
      ip,
      userAgent,
      meta: { sessionId, storeId: access.storeId, enabled: isLoginOtpEnabled() },
    })

    return res.status(200).json({ success: true, trusted: true })
  } catch (err) {
    console.error('[login-verify] Error:', err.message)
    return res.status(500).json({ error: 'server_error', message: 'Verification failed. Please try again.' })
  }
}
