// The two links that appear inside a promotional SMS.
//
//   /r/<code>  a tracked link: records the tap, then redirects to the real page
//   /x/<token> the opt-out: marks the vendor as opted out of promotional SMS
//
// Both are PUBLIC and unauthenticated, because they are opened from a text
// message on a phone with no session. Both are therefore written to be
// harmless: the worst a forged code can do is add a click that did not happen,
// or opt a number out of marketing, which is a thing anyone is entitled to do.
import { getAdminDb } from './_lib/firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'
import {
  splitTrackingCode, recipientCode, readOptOutToken, publicBase,
} from './_lib/sms-campaign.js'
import { toLocalNgPhone } from '../utils/phone.js'

export const SMS_CAMPAIGNS = 'smsCampaigns'
export const SMS_CLICKS = 'smsClicks'
export const SMS_OPT_OUTS = 'smsOptOuts'

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

function page(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#f8fafc; color:#0f172a; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:28px 24px; max-width:420px; width:100%; text-align:center;
          box-shadow:0 1px 3px rgba(15,23,42,.06); }
  h1 { font-size:18px; margin:0 0 8px; }
  p { font-size:14px; line-height:1.55; color:#475569; margin:0 0 6px; }
  a { display:inline-block; margin-top:18px; background:#16a34a; color:#fff; text-decoration:none; font-weight:700;
      font-size:14px; padding:11px 18px; border-radius:10px; }
  @media (prefers-color-scheme: dark) {
    body { background:#0b1120; color:#e2e8f0; }
    .card { background:#111827; border-color:#1f2937; }
    p { color:#94a3b8; }
  }
</style></head>
<body><div class="card">${body}</div></body></html>`)
}

export default async function handler(req, res) {
  const mode = req.query.mode === 'optout' ? 'optout' : 'redirect'

  // ------------------------------------------------------------ opt out
  if (mode === 'optout') {
    const phone = readOptOutToken(req.query.token)
    if (!phone) {
      return page(res, 400, 'Link not recognised', `
        <h1>This link is not valid</h1>
        <p>Check the full link from the message, or reply to the WhatsApp number on your dashboard and we will take you off.</p>
        <a href="${publicBase()}">Go to Sellapage</a>`)
    }

    try {
      // Keyed by the number, not by a store id.
      //
      // The number is the thing a person owns, and it is what every later send
      // is checked against, so one tap silences that handset whichever account
      // it belongs to, or none at all. Writing to a store id instead would
      // create an empty store document for a number we do not know, which is
      // exactly what a test send is.
      const db = getAdminDb()
      await db.collection(SMS_OPT_OUTS).doc(phone).set({
        phone,
        local: toLocalNgPhone(phone),
        optedOut: true,
        at: FieldValue.serverTimestamp(),
        atMs: Date.now(),
        source: 'link',
      }, { merge: true })
    } catch (err) {
      console.error('[sms-link] opt-out write failed:', err?.message)
      return page(res, 500, 'Something went wrong', `
        <h1>We could not save that</h1>
        <p>Please try the link again in a moment.</p>`)
    }

    return page(res, 200, 'You are unsubscribed', `
      <h1>Done, no more promotional texts</h1>
      <p>You will not get marketing messages from Sellapage on this number again.</p>
      <p>You will still get important account messages, like your sign-in code, because those are not marketing.</p>
      <a href="${publicBase()}">Go to Sellapage</a>`)
  }

  // ------------------------------------------------------------ tracked link
  const { campaignPart, recipientPart } = splitTrackingCode(req.query.code)
  if (!campaignPart) {
    return page(res, 400, 'Link not recognised', `
      <h1>This link is not valid</h1>
      <p>Check the full link from the message.</p>
      <a href="${publicBase()}">Go to Sellapage</a>`)
  }

  let destination = ''
  try {
    const db = getAdminDb()
    const snap = await db.collection(SMS_CAMPAIGNS).where('code', '==', campaignPart).limit(1).get()
    const doc = snap.docs[0]

    if (doc) {
      const data = doc.data()
      destination = data.linkUrl || destination

      // Which recipient tapped, worked out by recomputing their code rather
      // than storing one document per recipient at send time.
      const storeId = (data.recipientIds || [])
        .find((id) => recipientCode(doc.id, id) === recipientPart) || ''

      // Counting and the click record are best effort: a logging failure must
      // never stop someone reaching the page they tapped.
      await Promise.all([
        doc.ref.update({
          clicks: FieldValue.increment(1),
          ...(storeId ? { clickedBy: FieldValue.arrayUnion(storeId) } : {}),
        }).catch(() => {}),
        db.collection(SMS_CLICKS).add({
          campaignId: doc.id,
          storeId,
          at: FieldValue.serverTimestamp(),
          atMs: Date.now(),
        }).catch(() => {}),
      ])
    }
  } catch (err) {
    console.error('[sms-link] click tracking failed:', err?.message)
  }

  // No silent fall back to the home page. A link that cannot find its
  // campaign is broken, and sending people to the home page instead hides
  // that: it looks identical to a link that ignored the URL it was given.
  if (!destination) {
    return page(res, 404, 'Link not recognised', `
      <h1>This link has expired</h1>
      <p>The campaign behind it is no longer available.</p>
      <a href="${publicBase()}">Go to Sellapage</a>`)
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.redirect(302, destination)
}
