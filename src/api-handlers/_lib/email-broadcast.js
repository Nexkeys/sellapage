// src/api-handlers/_lib/email-broadcast.js
//
// The engine behind Admin > Email Broadcast: who receives a campaign, how it
// is personalised, the unsubscribe link, the daily Resend quota, and the
// chunked "send the next N" that does the work. Used by admin-email.js
// (manual sends, tests) and email-broadcast-cron.js (scheduled sends).
//
// AUDIENCE, deduplicated by address, sorted by address so "the next N" is
// always the same N:
//   users       every store owner (stores.email) and every ACTIVE staff member
//               (staffMemberships.email). Plan and vendor-type filters apply,
//               a staff member judged by their store's plan.
//   newsletter  footer sign-ups with status 'subscribed'. They have no plan, so
//               a plan or vendor-type filter leaves them out on purpose: a
//               message aimed at Pro vendors is not for a stranger's inbox.
//   all         both.
// Anyone in emailSuppressions (they clicked unsubscribe) is never included.
//
// UNSUBSCRIBE stops BROADCASTS ONLY. Login codes, order, payout and billing
// emails go through sendEmail elsewhere and never consult this list, because
// cutting those would lock a vendor out of their own account.
//
// QUOTA. Resend's free plan allows 100 emails per UTC day across EVERYTHING,
// and it resets at midnight UTC (01:00 Lagos). 25 are always held back so a
// vendor can still receive a login code after a broadcast.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { countEmailsSentTodayUtc, escapeHtml, sendEmail, sendEmailBatch } from './send-email.js'

export const CAMPAIGNS = 'emailCampaigns'
export const SUPPRESSIONS = 'emailSuppressions'
const QUOTA_LEDGER = 'emailQuota'
const SITE = 'https://www.sellapage.com.ng'

export const LOGIN_RESERVE = 25
export const BATCH_SIZE = 100
const BATCH_PAUSE_MS = 1000
const LOCK_MS = 2 * 60 * 1000
export const BROADCAST_SENDERS = ['info', 'hello']
const PLANS = ['starter', 'growth', 'pro', 'premium']
const VENDOR_TYPES = ['products', 'services', 'both']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** One Firestore id per address, so "has this person had it" is one lookup. */
export const emailKey = (email) =>
  String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '_').slice(0, 200)

export function normaliseAudience(raw = {}) {
  const source = ['users', 'newsletter', 'all'].includes(raw.source) ? raw.source : 'users'
  const plans = Array.isArray(raw.plans) ? raw.plans.filter((p) => PLANS.includes(p)) : []
  const vendorType = VENDOR_TYPES.includes(raw.vendorType) ? raw.vendorType : ''
  return {
    source,
    plans,
    vendorType,
    includeStaff: raw.includeStaff !== false,
    activeOnly: raw.activeOnly === true,
  }
}

const storeLinkOf = (store) => (store?.storeName ? `${SITE}/${store.storeName}` : SITE)

function storeMatches(store, audience) {
  if (!store) return false
  if (audience.activeOnly && store.isActive === false) return false
  if (audience.plans.length && !audience.plans.includes(store.plan || 'starter')) return false
  if (audience.vendorType && (store.vendorType || 'products') !== audience.vendorType) return false
  return true
}

/**
 * Everyone a campaign's audience covers, suppressions removed.
 * @returns {{ recipients: Array<{email,key,name,storeLink,kind}>, suppressed: number }}
 */
export async function resolveAudience(db, rawAudience) {
  const audience = normaliseAudience(rawAudience)
  const byKey = new Map()
  const add = (r) => {
    if (!EMAIL_RE.test(r.email)) return
    const key = emailKey(r.email)
    if (!byKey.has(key)) byKey.set(key, { ...r, key })
  }

  const wantUsers = audience.source !== 'newsletter'
  const wantNewsletter = audience.source !== 'users' && !audience.plans.length && !audience.vendorType

  if (wantUsers) {
    const storeSnap = await db.collection('stores')
      .select('email', 'businessName', 'storeName', 'plan', 'vendorType', 'isActive')
      .get()
    const stores = new Map(storeSnap.docs.map((d) => [d.id, d.data()]))

    for (const store of stores.values()) {
      if (!storeMatches(store, audience)) continue
      add({ email: String(store.email || '').trim(), name: store.businessName || '', storeLink: storeLinkOf(store), kind: 'owner' })
    }

    if (audience.includeStaff) {
      const staffSnap = await db.collection('staffMemberships').where('active', '==', true).get()
      for (const d of staffSnap.docs) {
        const m = d.data()
        const store = stores.get(m.storeId)
        if (!storeMatches(store, audience)) continue
        add({ email: String(m.email || '').trim(), name: m.name || store.businessName || '', storeLink: storeLinkOf(store), kind: 'staff' })
      }
    }
  }

  if (wantNewsletter) {
    const subSnap = await db.collection('newsletterSubscribers').where('status', '==', 'subscribed').get()
    for (const d of subSnap.docs) {
      add({ email: String(d.data().email || '').trim(), name: '', storeLink: SITE, kind: 'newsletter' })
    }
  }

  const supSnap = await db.collection(SUPPRESSIONS).select().get()
  const suppressedKeys = new Set(supSnap.docs.map((d) => d.id))
  let suppressed = 0
  const recipients = []
  for (const r of byKey.values()) {
    if (suppressedKeys.has(r.key)) { suppressed++; continue }
    recipients.push(r)
  }
  recipients.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  return { recipients, suppressed }
}

// ------------------------------------------------------------- unsubscribe

function unsubscribeSecret() {
  if (process.env.EMAIL_UNSUBSCRIBE_SECRET) return process.env.EMAIL_UNSUBSCRIBE_SECRET
  // Derived rather than a new required variable, so this works with the
  // environment that already exists. Never the raw cron secret itself.
  if (process.env.CRON_SECRET) {
    return crypto.createHash('sha256').update(`email-unsubscribe:${process.env.CRON_SECRET}`).digest('hex')
  }
  throw new Error('No secret available to sign unsubscribe links')
}

const signEmail = (email) =>
  crypto.createHmac('sha256', unsubscribeSecret()).update(email).digest('base64url').slice(0, 32)

/** A link token that names the address and cannot be forged for another one. */
export function unsubscribeToken(email) {
  const e = String(email).trim().toLowerCase()
  return `${Buffer.from(e).toString('base64url')}.${signEmail(e)}`
}

export function verifyUnsubscribeToken(token) {
  const [encoded, sig] = String(token || '').split('.')
  if (!encoded || !sig) return null
  let email
  try { email = Buffer.from(encoded, 'base64url').toString('utf8') } catch { return null }
  if (!EMAIL_RE.test(email)) return null
  const expected = Buffer.from(signEmail(email))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
  return email
}

export const unsubscribeUrl = (email) => `${SITE}/api/email-unsubscribe?t=${unsubscribeToken(email)}`

// ------------------------------------------------------------- rendering

const MERGE_RE = /\{\{\s*(businessName|storeLink|email|unsubscribeUrl)\s*\}\}/g

function mergeValues(recipient) {
  return {
    businessName: recipient.name || 'there',
    storeLink: recipient.storeLink || SITE,
    email: recipient.email,
    unsubscribeUrl: unsubscribeUrl(recipient.email),
  }
}

const FOOTER = (url) => `
<div style="text-align:center;padding:24px 16px;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;">
  You are receiving this because you have a Sellapage account or subscribed to Sellapage updates.<br>
  <a href="${escapeHtml(url)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from these emails</a>
</div>`

/**
 * One recipient's copy of a campaign. Merge tags are filled (values escaped),
 * and an unsubscribe footer is added unless the design already places
 * {{unsubscribeUrl}} itself.
 */
export function renderFor(campaign, recipient) {
  const vals = mergeValues(recipient)
  const fill = (s) => String(s || '').replace(MERGE_RE, (_, k) => escapeHtml(vals[k]))
  let html = fill(campaign.html)
  if (!/\{\{\s*unsubscribeUrl\s*\}\}/.test(campaign.html || '')) {
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${FOOTER(vals.unsubscribeUrl)}</body>`) : html + FOOTER(vals.unsubscribeUrl)
  }
  return {
    to: recipient.email,
    // Subjects are plain text, not HTML, so values go in unescaped.
    subject: String(campaign.subject || '').replace(MERGE_RE, (_, k) => vals[k]),
    html,
    headers: {
      // RFC 8058 one-click unsubscribe: Gmail and Yahoo show an "Unsubscribe"
      // button next to the sender and POST to this URL when it is pressed.
      'List-Unsubscribe': `<${vals.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

// ------------------------------------------------------------------ quota

const utcDay = () => new Date().toISOString().slice(0, 10)

/**
 * What can be sent right now without eating the logins' share.
 *
 * Counted from Resend itself when the API key can list emails. If it cannot
 * (a "sending access" key cannot read), falls back to what OUR broadcasts sent
 * today and says so, because in that mode OTP and order mail is not counted.
 */
export async function quotaStatus(db) {
  const limit = Number(process.env.RESEND_DAILY_LIMIT ?? 100)
  const resetsAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()
  if (limit === 0) return { unlimited: true, limit: null, reserve: LOGIN_RESERVE, used: null, available: 500, resetsAt, source: 'unlimited' }

  const counted = await countEmailsSentTodayUtc()
  if (!counted.error) {
    return {
      unlimited: false, limit, reserve: LOGIN_RESERVE, used: counted.used,
      available: Math.max(0, limit - counted.used - LOGIN_RESERVE), resetsAt, source: 'resend',
    }
  }

  const ledger = await db.collection(QUOTA_LEDGER).doc(utcDay()).get()
  const ours = Number(ledger.data()?.broadcastSent || 0)
  return {
    unlimited: false, limit, reserve: LOGIN_RESERVE, used: ours,
    available: Math.max(0, limit - ours - LOGIN_RESERVE), resetsAt, source: 'ledger',
    warning: `Could not read today's usage from Resend (${counted.error}). Showing broadcasts only; login and order emails sent today are NOT included.`,
  }
}

async function recordQuotaUse(db, count) {
  if (!count) return
  await db.collection(QUOTA_LEDGER).doc(utcDay()).set(
    { broadcastSent: FieldValue.increment(count), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
}

// ------------------------------------------------------------------ sending

/** Which of the audience have not had this campaign yet, in send order. */
export async function pendingRecipients(db, campaignRef, audience) {
  const [{ recipients, suppressed }, sentSnap] = await Promise.all([
    resolveAudience(db, audience),
    campaignRef.collection('recipients').where('status', '==', 'sent').select().get(),
  ])
  const done = new Set(sentSnap.docs.map((d) => d.id))
  const pending = recipients.filter((r) => !done.has(r.key))
  return { eligible: recipients.length, suppressed, alreadySent: recipients.length - pending.length, pending }
}

/**
 * Sends a campaign to the next `requested` people who have not had it, capped
 * by today's quota. Locked, so a double click or a cron tick landing during a
 * manual send cannot send anything twice.
 */
export async function sendNextChunk(db, campaignId, requested, { trigger = 'manual', actor = null } = {}) {
  const ref = db.collection(CAMPAIGNS).doc(campaignId)

  const locked = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return 'missing'
    const lockAt = Number(snap.data().sendingLockAt || 0)
    if (lockAt && Date.now() - lockAt < LOCK_MS) return 'busy'
    tx.update(ref, { sendingLockAt: Date.now() })
    return 'ok'
  })
  if (locked === 'missing') return { ok: false, error: 'Campaign not found.' }
  if (locked === 'busy') return { ok: false, error: 'This campaign is already sending. Wait a moment and refresh.' }

  let sent = 0
  let failed = 0
  try {
    const campaign = (await ref.get()).data()
    if (!campaign.subject || !campaign.html) return { ok: false, error: 'Add a subject and content before sending.' }

    const { pending } = await pendingRecipients(db, ref, campaign.audience)
    const quota = await quotaStatus(db)
    const n = Math.max(0, Math.min(Number(requested) || 0, pending.length, quota.available))
    if (!n) {
      const reason = !pending.length ? 'Everyone in this audience has already received it.' : 'No quota left today.'
      const updates = {}
      if (!pending.length) updates.status = 'sent'
      if (campaign.status === 'scheduled') {
        // A schedule that could not send anything goes back to what it was
        // before it was scheduled, with the reason, so it can be rescheduled.
        updates.scheduledAt = null
        updates.lastScheduleNote = reason
        if (pending.length) updates.status = campaign.statusBeforeSchedule || 'draft'
      }
      if (Object.keys(updates).length) await ref.update(updates)
      return { ok: true, sent: 0, failed: 0, pendingAfter: pending.length, reason, quota }
    }

    const slice = pending.slice(0, n)
    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      const chunk = slice.slice(i, i + BATCH_SIZE)
      const result = await sendEmailBatch(chunk.map((r) => renderFor(campaign, r)), { sender: campaign.sender })

      const writes = db.batch()
      const at = new Date().toISOString()
      chunk.forEach((r, idx) => {
        writes.set(ref.collection('recipients').doc(r.key), result.ok
          ? { email: r.email, kind: r.kind, status: 'sent', resendId: result.ids[idx] || null, at }
          : { email: r.email, kind: r.kind, status: 'failed', error: String(result.error || 'send failed').slice(0, 200), at })
      })
      await writes.commit()

      if (result.ok) sent += chunk.length
      else failed += chunk.length
      // A failed batch is usually the quota or the key; stop rather than burn
      // through more failures.
      if (!result.ok) break
      if (i + BATCH_SIZE < slice.length) await sleep(BATCH_PAUSE_MS)
    }

    await recordQuotaUse(db, sent)
    const pendingAfter = pending.length - sent
    await ref.update({
      status: pendingAfter <= 0 ? 'sent' : 'partial',
      scheduledAt: null,
      'counts.sent': FieldValue.increment(sent),
      'counts.failed': FieldValue.increment(failed),
      lastSentAt: new Date().toISOString(),
      history: FieldValue.arrayUnion({ at: new Date().toISOString(), trigger, requested: Number(requested) || 0, sent, failed, by: actor || trigger }),
    })
    return { ok: failed === 0, sent, failed, pendingAfter, quota, ...(failed ? { error: 'Some emails failed to send. They can be retried with the next send.' } : {}) }
  } finally {
    await ref.update({ sendingLockAt: null }).catch(() => {})
  }
}

/** A test copy to a handful of addresses, filled with sample values. */
export async function sendTest(db, campaign, addresses) {
  const results = []
  for (const to of addresses) {
    const copy = renderFor({ ...campaign, subject: `[Test] ${campaign.subject}` }, { email: to, name: 'Sample Store', storeLink: SITE })
    const ok = await sendEmail(copy.to, copy.subject, copy.html, { sender: campaign.sender, headers: copy.headers })
    results.push({ to, ok })
  }
  await recordQuotaUse(db, results.filter((r) => r.ok).length)
  return results
}
