// src/api-handlers/email-unsubscribe.js
//
// Public. The "Unsubscribe" link in every broadcast email, and the one-click
// unsubscribe Gmail and Yahoo show next to the sender (RFC 8058).
//
//   GET   shows a confirm page. It does NOT unsubscribe: mail scanners and
//         link previewers open links automatically, and a GET that
//         unsubscribed would quietly remove people who never clicked.
//   POST  unsubscribes. From our confirm button, or from the mail app's
//         one-click button, which POSTs "List-Unsubscribe=One-Click".
//
// The link carries a signed token naming the address, so nobody can
// unsubscribe someone else by editing it.
//
// Unsubscribing stops BROADCASTS only (Admin > Email Broadcast). Login codes,
// order, payout and billing emails are unaffected, and the page says so.
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { escapeHtml } from './_lib/send-email.js'
import { SUPPRESSIONS, emailKey, verifyUnsubscribeToken } from './_lib/email-broadcast.js'

const page = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} | Sellapage</title></head>
<body style="margin:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
<div style="max-width:440px;margin:64px auto;padding:32px 28px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;text-align:center;">
<div style="font-weight:800;font-size:18px;color:#16a34a;margin-bottom:16px;">Sellapage</div>
${bodyHtml}
</div></body></html>`

function send(res, status, title, bodyHtml) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).send(page(title, bodyHtml))
}

export default async function handler(req, res) {
  const token = String(req.query.t || '')
  const email = verifyUnsubscribeToken(token)

  if (!email) {
    return send(res, 400, 'Link not valid',
      '<h1 style="font-size:20px;margin:0 0 8px;">This link is not valid</h1><p style="color:#6b7280;font-size:14px;line-height:1.6;">It may have been cut short when it was copied. Use the unsubscribe link in the email itself.</p>')
  }

  if (req.method === 'GET') {
    return send(res, 200, 'Unsubscribe',
      `<h1 style="font-size:20px;margin:0 0 8px;">Stop update emails?</h1>
<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;"><strong style="color:#111827;">${escapeHtml(email)}</strong> will no longer receive Sellapage newsletters and update emails.</p>
<form method="POST" action="/api/email-unsubscribe?t=${escapeHtml(encodeURIComponent(token))}">
<button type="submit" style="background:#16a34a;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;">Unsubscribe</button>
</form>
<p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:20px 0 0;">Login codes, order and payout emails are not affected.</p>`)
  }

  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  try {
    const db = getAdminDb()
    const key = emailKey(email)
    await db.collection(SUPPRESSIONS).doc(key).set({
      email,
      reason: 'unsubscribed',
      at: FieldValue.serverTimestamp(),
    }, { merge: true })

    // Footer newsletter sign-ups are keyed the same way (newsletter-subscribe.js
    // uses the address as the id), so their status is updated too and the admin
    // Newsletter tab shows them as unsubscribed.
    const subRef = db.collection('newsletterSubscribers').doc(key)
    const sub = await subRef.get()
    if (sub.exists) await subRef.set({ status: 'unsubscribed', unsubscribedAt: new Date() }, { merge: true })

    return send(res, 200, 'Unsubscribed',
      `<h1 style="font-size:20px;margin:0 0 8px;">You are unsubscribed</h1>
<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;"><strong style="color:#111827;">${escapeHtml(email)}</strong> will not receive Sellapage newsletters or update emails again. Login codes, order and payout emails still arrive as normal.</p>`)
  } catch (err) {
    console.error('[email-unsubscribe] error', err)
    return send(res, 500, 'Something went wrong', '<h1 style="font-size:20px;margin:0 0 8px;">Something went wrong</h1><p style="color:#6b7280;font-size:14px;">Please try the link again in a moment.</p>')
  }
}
