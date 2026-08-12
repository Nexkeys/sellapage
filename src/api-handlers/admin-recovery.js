// src/api-handlers/admin-recovery.js
// Admin review of account-recovery requests. Approving one issues a single-use
// token that can change an account's email AND password — this is the most
// privileged action in the Operations Console, so it is super_admin only and
// every decision is attributed to the acting admin in auditLogs.
//
// Admin auth is UNCHANGED by this work: it reuses verifyAdmin() exactly as
// every other admin-*.js handler does. No MFA changes (explicitly out of scope).
import { getAdminDb } from './_lib/firebase-admin.js'
import { applyCors, parseJsonBody } from './_lib/http.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { logAudit } from './_lib/otp.js'
import {
  RECOVERY_COLLECTION,
  RECOVERY_STATUS,
  RECOVERY_TOKEN_TTL_MS,
  generateRecoveryToken,
  hashRecoveryToken,
  maskEmail,
} from './_lib/recovery.js'
import { FieldValue } from 'firebase-admin/firestore'

// Matches the fallback every other handler uses (paystack-webhook.js:149 etc).
// The www host matters: the recovery link must land on the same origin the app
// is actually served from.
const APP_URL = process.env.APP_URL || 'https://www.sellapage.com.ng'

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,POST,OPTIONS' })) return

  // Account takeover capability — super_admin only, never a support role.
  const admin = await verifyAdmin(req, 'recovery')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const action = req.query.action || 'list'
  const db = getAdminDb()

  try {
    if (action === 'list' && req.method === 'GET') {
      const status = req.query.status
      // Single-field equality only — no composite index.
      let query = db.collection(RECOVERY_COLLECTION)
      if (status && status !== 'all') query = query.where('status', '==', status)

      const snap = await query.limit(100).get()
      const requests = snap.docs
        .map(d => {
          const x = d.data()
          return {
            id: d.id,
            storeId: x.storeId,
            storeName: x.storeName,
            businessName: x.businessName,
            currentEmailMasked: x.currentEmailMasked,
            contactEmail: x.contactEmail,
            contactPhone: x.contactPhone,
            reason: x.reason,
            status: x.status,
            cacVerified: x.cacVerified,
            plan: x.plan,
            requestIp: x.requestIp,
            createdAtMs: x.createdAtMs || 0,
            decidedBy: x.decidedBy || null,
            decidedAtMs: x.decidedAtMs || null,
            adminNote: x.adminNote || '',
          }
        })
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))

      return res.status(200).json({ success: true, requests })
    }

    if (action === 'approve' && req.method === 'POST') {
      const { requestId, note } = parseJsonBody(req) || {}
      if (!requestId) return res.status(400).json({ error: 'requestId is required' })

      const ref = db.collection(RECOVERY_COLLECTION).doc(requestId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Request not found' })

      const data = snap.data()
      if (data.status !== RECOVERY_STATUS.PENDING) {
        return res.status(400).json({ error: 'already_decided', message: 'This request has already been decided.' })
      }

      const token = generateRecoveryToken()
      await ref.update({
        status: RECOVERY_STATUS.APPROVED,
        // Only the hash is stored; the raw token exists solely in the email.
        tokenHash: hashRecoveryToken(token),
        tokenExpiresAt: Date.now() + RECOVERY_TOKEN_TTL_MS,
        tokenUsedAt: null,
        decidedBy: admin.uid,
        decidedAtMs: Date.now(),
        decidedAt: FieldValue.serverTimestamp(),
        adminNote: String(note || '').slice(0, 500),
      })

      const link = `${APP_URL}/account-recovery/redeem?token=${encodeURIComponent(token)}`

      await sendEmail(
        data.contactEmail,
        'Recover your Sellapage account',
        `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#16a34a;margin:0 0 12px;font-size:18px;">Recover your account</h2>
          <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px;">
            Your recovery request for <strong>${escapeHtml(data.businessName || data.storeName || 'your store')}</strong> was approved. Use the link below to set a new email address and password.
          </p>
          <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Recover my account</a>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            This link expires in 30 minutes and can be used once. All devices will be signed out.
          </p>
          <p style="font-size:12px;color:#9ca3af;margin:12px 0 0;">If you did not request this, ignore this email and contact support.</p>
        </div>`,
      )

      // Second tripwire on the ORIGINAL address — the real owner gets a chance
      // to object during the 30-minute window.
      if (data.currentEmail) {
        try {
          await sendEmail(
            data.currentEmail,
            'Action required: account recovery approved for your store',
            `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px;">Account recovery approved</h2>
              <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px;">
                A recovery request for <strong>${escapeHtml(data.businessName || data.storeName || 'your store')}</strong> was approved. Within the next 30 minutes the account email and password may be changed to <strong>${escapeHtml(maskEmail(data.contactEmail))}</strong>.
              </p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;">
                <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
                  <strong>If this was not you, reply to this email immediately.</strong>
                </p>
              </div>
            </div>`,
          )
        } catch (err) {
          console.error('[admin-recovery] owner alert failed:', err.message)
        }
      }

      await logAudit(db, {
        uid: data.storeId,
        action: 'account_recovery_approve',
        result: 'approved',
        meta: { adminUid: admin.uid, requestId, contactEmail: maskEmail(data.contactEmail) },
      })

      // The raw token is never returned to the browser — it only ever exists in
      // the email to the vendor, so an admin cannot capture it from a response.
      return res.status(200).json({ success: true, message: 'Approved. Recovery link emailed to the vendor.' })
    }

    if (action === 'reject' && req.method === 'POST') {
      const { requestId, note } = parseJsonBody(req) || {}
      if (!requestId) return res.status(400).json({ error: 'requestId is required' })

      const ref = db.collection(RECOVERY_COLLECTION).doc(requestId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Request not found' })

      await ref.update({
        status: RECOVERY_STATUS.REJECTED,
        tokenHash: null,
        tokenExpiresAt: null,
        decidedBy: admin.uid,
        decidedAtMs: Date.now(),
        decidedAt: FieldValue.serverTimestamp(),
        adminNote: String(note || '').slice(0, 500),
      })

      await logAudit(db, {
        uid: snap.data().storeId,
        action: 'account_recovery_reject',
        result: 'rejected',
        meta: { adminUid: admin.uid, requestId, note: String(note || '').slice(0, 200) },
      })

      return res.status(200).json({ success: true, message: 'Request rejected.' })
    }

    return res.status(400).json({ error: 'invalid_action' })
  } catch (err) {
    console.error('[admin-recovery] Error:', err.message)
    return res.status(500).json({ error: 'server_error' })
  }
}
