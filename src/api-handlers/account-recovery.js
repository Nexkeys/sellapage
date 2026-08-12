// src/api-handlers/account-recovery.js
// PUBLIC endpoints for a vendor locked out of their account email. Both are
// unauthenticated by necessity — a locked-out user cannot sign in — so both are
// rate limited and neither ever confirms whether an account exists.
//
// A request grants nothing on its own. Only an admin, after out-of-band
// identity checks, can approve one (see admin-recovery.js). See _lib/recovery.js
// for the full threat model.
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { applyCors, parseJsonBody } from './_lib/http.js'
import { durableRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { logAudit, verifyRecaptcha } from './_lib/otp.js'
import { clearAttempts } from './_lib/login-lockout.js'
import {
  RECOVERY_COLLECTION,
  RECOVERY_STATUS,
  findStoreForRecovery,
  consumeRecoveryToken,
  recoveryErrorMessage,
  isValidEmail,
  maskEmail,
} from './_lib/recovery.js'
import { FieldValue } from 'firebase-admin/firestore'

// Identical for every request, whether or not the account exists. Do not make
// this conditional — the wording IS the anti-enumeration control.
const GENERIC_REQUEST_RESPONSE = {
  success: true,
  message:
    'If an account matches those details, our team will review your request and contact you. This usually takes 1–2 business days.',
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'POST,OPTIONS' })) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.query.action || 'request'
  const ip = clientKey(req)
  const userAgent = req.headers['user-agent'] || ''
  const body = parseJsonBody(req) || {}

  try {
    const db = getAdminDb()

    // ---------------------------------------------------------------- request
    if (action === 'request') {
      // Tight limits: this is unauthenticated and creates documents.
      const [perIp, global] = await Promise.all([
        durableRateLimit('recovery_req_ip', ip, 3, 60 * 60 * 1000),
        durableRateLimit('recovery_req_global', 'all', 60, 60 * 60 * 1000),
      ])
      if (!perIp || !global) {
        return tooManyRequests(res, 'Too many recovery requests. Please try again later.')
      }

      const { identifier, contactEmail, contactPhone, reason, recaptchaToken } = body

      // Validate shape, but ALWAYS return the generic response below regardless
      // of whether the account exists.
      if (!identifier || !isValidEmail(contactEmail)) {
        return res.status(400).json({
          error: 'invalid_input',
          message: 'Please provide your store link or account email, plus a valid email we can reach you on.',
        })
      }

      // This is the one genuinely unauthenticated, document-creating endpoint,
      // so it's the surface bot protection actually matters on. An INVALID
      // token fails closed; a MISSING token is allowed and recorded, because a
      // blocked/unreachable reCAPTCHA must not lock a stranded vendor out of
      // the only route back to their account.
      const captcha = await verifyRecaptcha(recaptchaToken, ip)
      if (!captcha.ok) {
        await logAudit(db, {
          uid: null,
          action: 'account_recovery_request',
          result: 'captcha_failed',
          ip,
          userAgent,
        })
        // Generic wording — still no confirmation of whether the account exists.
        return res.status(400).json({
          error: 'captcha_failed',
          message: 'We could not verify that request. Please try again.',
        })
      }

      const store = await findStoreForRecovery(db, { identifier })

      if (store) {
        // One open request at a time, keyed deterministically — no composite
        // index, and a repeat submission updates rather than piling up.
        const ref = db.collection(RECOVERY_COLLECTION).doc(store.id)
        const existing = await ref.get()
        const alreadyOpen =
          existing.exists &&
          [RECOVERY_STATUS.PENDING, RECOVERY_STATUS.APPROVED].includes(existing.data().status)

        if (!alreadyOpen) {
          await ref.set({
            storeId: store.id,
            storeName: store.storeName || '',
            businessName: store.businessName || '',
            currentEmailMasked: maskEmail(store.email || ''),
            // Full current email kept for the admin to compare against; this
            // collection is deny-by-default and Admin-SDK only.
            currentEmail: store.email || '',
            contactEmail: String(contactEmail).trim().toLowerCase(),
            contactPhone: String(contactPhone || '').trim().slice(0, 40),
            reason: String(reason || '').trim().slice(0, 1000),
            status: RECOVERY_STATUS.PENDING,
            // Signals that help an admin judge legitimacy.
            cacVerified: store.cacVerified === true,
            plan: store.plan || 'starter',
            requestIp: ip,
            requestUserAgent: userAgent.slice(0, 300),
            tokenHash: null,
            tokenExpiresAt: null,
            tokenUsedAt: null,
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs: Date.now(),
          })

          await logAudit(db, {
            uid: store.id,
            action: 'account_recovery_request',
            result: 'submitted',
            ip,
            userAgent,
            meta: { contactEmail: maskEmail(contactEmail) },
          })

          // Tell the CURRENT address immediately. If this request is an attack,
          // the real owner finds out before an admin ever sees it.
          if (store.email) {
            try {
              await sendEmail(
                store.email,
                'Someone requested account recovery for your Sellapage store',
                `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                  <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px;">Account recovery requested</h2>
                  <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px;">
                    We received a request to recover access to <strong>${escapeHtml(store.businessName || store.storeName || 'your store')}</strong>,
                    asking us to contact <strong>${escapeHtml(maskEmail(contactEmail))}</strong>.
                  </p>
                  <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px;">
                    <strong>If this was you</strong>, no action is needed — our team will review it.
                  </p>
                  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin:0 0 12px;">
                    <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
                      <strong>If this was NOT you</strong>, reply to this email immediately and change your password.
                      Nothing changes on your account unless our team approves this request.
                    </p>
                  </div>
                </div>`,
              )
            } catch (err) {
              console.error('[account-recovery] owner notice failed:', err.message)
            }
          }
        }
      } else {
        // Log the miss (no uid) so brute-force patterns are still visible.
        await logAudit(db, {
          uid: null,
          action: 'account_recovery_request',
          result: 'no_match',
          ip,
          userAgent,
        })
      }

      return res.status(200).json(GENERIC_REQUEST_RESPONSE)
    }

    // ----------------------------------------------------------------- redeem
    if (action === 'redeem') {
      const perIp = await durableRateLimit('recovery_redeem_ip', ip, 10, 60 * 60 * 1000)
      if (!perIp) return tooManyRequests(res, 'Too many attempts. Please try again later.')

      const { token, newEmail, newPassword } = body

      if (!token || !isValidEmail(newEmail) || !newPassword || String(newPassword).length < 8) {
        return res.status(400).json({
          error: 'invalid_input',
          message: 'Provide a valid new email and a password of at least 8 characters.',
        })
      }

      const result = await consumeRecoveryToken(db, token)
      if (!result.ok) {
        await logAudit(db, {
          uid: null,
          action: 'account_recovery_redeem',
          result: 'failed',
          ip,
          userAgent,
          meta: { reason: result.error },
        })
        return res.status(400).json({ error: result.error, message: recoveryErrorMessage(result.error) })
      }

      const request = result.request
      const auth = getAdminAuth()
      const previousEmail = request.currentEmail || ''

      // Admin SDK: set the new credentials directly. The token was single-use
      // and has already been burned inside consumeRecoveryToken's transaction.
      await auth.updateUser(request.storeId, {
        email: String(newEmail).trim().toLowerCase(),
        password: String(newPassword),
        emailVerified: false,
      })

      await db.collection('stores').doc(request.storeId).update({
        email: String(newEmail).trim().toLowerCase(),
      })

      // Recovery is the documented way back from a lockout, so clear it for
      // BOTH addresses — the old one (which was being attacked) and the new
      // one. Without this the vendor would recover and still be locked out.
      await clearAttempts(db, previousEmail)
      await clearAttempts(db, String(newEmail).trim())

      // Kill every existing session — if the lockout was caused by a hijack,
      // the attacker's sessions must not survive the recovery.
      try {
        await auth.revokeRefreshTokens(request.storeId)
        const sessions = await db
          .collection('stores').doc(request.storeId).collection('sessions').get()
        if (!sessions.empty) {
          const batch = db.batch()
          sessions.docs.forEach(d => batch.update(d.ref, { revoked: true }))
          await batch.commit()
        }
      } catch (err) {
        console.error('[account-recovery] session revoke failed:', err.message)
      }

      await logAudit(db, {
        uid: request.storeId,
        action: 'account_recovery_redeem',
        result: 'completed',
        ip,
        userAgent,
        meta: { previousEmail: maskEmail(previousEmail), newEmail: maskEmail(newEmail) },
      })

      // Notify BOTH addresses. The old one is the tripwire.
      const notice = (heading, colour) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:${colour};margin:0 0 12px;font-size:18px;">${heading}</h2>
        <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px;">
          The email address and password for <strong>${escapeHtml(request.businessName || request.storeName || 'your Sellapage store')}</strong> were just changed through our account recovery process, and all devices were signed out.
        </p>
        <p style="font-size:13px;color:#991b1b;line-height:1.6;margin:0;">
          If you did not expect this, contact support immediately.
        </p>
      </div>`

      for (const [addr, heading, colour] of [
        [previousEmail, 'Your store account was recovered', '#dc2626'],
        [String(newEmail).trim(), 'Account recovery complete', '#16a34a'],
      ]) {
        if (!addr) continue
        try {
          await sendEmail(addr, 'Sellapage account recovery completed', notice(heading, colour))
        } catch (err) {
          console.error('[account-recovery] completion notice failed:', err.message)
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Your account has been recovered. Please sign in with your new email and password.',
      })
    }

    return res.status(400).json({ error: 'invalid_action' })
  } catch (err) {
    console.error('[account-recovery] Error:', err.message)
    return res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please contact support.' })
  }
}
