// Termii delivery reports (and inbound messages, if that is ever enabled).
//
// Sending an SMS only proves Termii accepted it. Whether it reached the handset
// arrives later, here. That matters most for one status in particular: Termii
// reports "DND Active on Phone Number" for a number registered on Do Not
// Disturb, which is the single biggest reason a Nigerian promotional campaign
// under-delivers. Counting those per campaign turns a guess into a figure.
//
// Payload and statuses: Docs/TERMII_API_DOCS.md, "Outbound Message (Delivery
// Report)". Termii signs events with X-Termii-Signature, an HMAC SHA512 of the
// payload using the account secret key.
import crypto from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebase-admin.js'
import { normaliseNgMobile } from '../utils/phone.js'

export const SMS_MESSAGES = 'smsMessages'
export const SMS_CAMPAIGNS = 'smsCampaigns'

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Termii's wording, mapped to the three things worth counting. Anything not
// listed is stored verbatim and counted as pending, rather than guessed at.
const OUTCOME = {
  delivered: 'delivered',
  'message sent': 'pending',
  'message failed': 'failed',
  rejected: 'dnd',
  'dnd active on phone number': 'dnd',
  expired: 'failed',
}
export const classify = (status) => OUTCOME[String(status || '').trim().toLowerCase()] || 'pending'

const COUNTER = { delivered: 'delivered', dnd: 'dndBlocked', failed: 'undelivered' }

// Words a person actually texts when they want out.
const STOP_WORDS = new Set(['stop', 'stopall', 'unsubscribe', 'quit', 'end', 'cancel', 'optout', 'opt-out'])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  let raw
  try {
    raw = (await getRawBody(req)).toString('utf8')
  } catch {
    return res.status(400).send('Could not read body')
  }
  // Vercel may have parsed and consumed the stream already.
  if (!raw && req.body) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

  const signature = req.headers['x-termii-signature']

  // Termii's dashboard hands out a webhook secret when an endpoint is
  // registered, and the docs describe the signature as being signed "with your
  // secret key". Which of the two that means is not stated, so both are tried:
  // the dedicated webhook secret first, then the API key. Each comparison is
  // constant-time, and an unset variable is skipped rather than compared
  // against an empty string.
  const candidates = [process.env.TERMII_WEBHOOK_SECRET, process.env.TERMII_API_KEY].filter(Boolean)

  if (signature) {
    const sigBuf = Buffer.from(String(signature), 'utf8')
    const matches = candidates.some((secret) => {
      const expBuf = Buffer.from(crypto.createHmac('sha512', secret).update(raw).digest('hex'), 'utf8')
      // Length is checked first because timingSafeEqual throws on a mismatch.
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
    })
    if (!matches) {
      console.warn('[termii-webhook] signature did not match any configured secret')
      return res.status(401).send('Invalid signature')
    }
  } else if (req.query.key !== undefined) {
    // Some setups put the secret in the URL instead of signing. Only checked
    // when a key was actually supplied, so an unsigned report is not refused
    // for lacking one.
    const given = Buffer.from(String(req.query.key), 'utf8')
    const ok = candidates.some((secret) => {
      const want = Buffer.from(secret, 'utf8')
      return given.length === want.length && crypto.timingSafeEqual(given, want)
    })
    if (!ok) return res.status(401).send('Invalid key')
  }
  // An unsigned report with no key is still accepted, because it can only ever
  // update a message id we ourselves recorded: the worst a forged call can do
  // is mark our own message delivered.

  let payload
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    return res.status(400).send('Invalid JSON')
  }

  try {
    const db = getAdminDb()
    const type = String(payload.type || '').toLowerCase()

    // ---------------------------------------------------------- inbound
    // Only reachable if Termii enables inbound on this account. Honouring a
    // texted STOP costs nothing and is what a person expects to work.
    if (type === 'inbound') {
      const word = String(payload.message || '').trim().toLowerCase().replace(/[^a-z-]/g, '')
      if (!STOP_WORDS.has(word)) return res.status(200).send('OK')

      const phone = normaliseNgMobile(payload.sender)
      if (!phone) return res.status(200).send('OK')

      const bare = phone.replace(/^234/, '0')
      const snap = await db.collection('stores').select('verifiedPhone', 'whatsappNumber').get()
      const matches = snap.docs.filter((doc) => {
        const d = doc.data()
        return [d.verifiedPhone, d.whatsappNumber]
          .filter(Boolean)
          .some((n) => normaliseNgMobile(n) === phone || String(n).trim() === bare)
      })
      await Promise.all(matches.map((doc) => doc.ref.set({
        smsOptOut: true,
        smsOptOutAt: FieldValue.serverTimestamp(),
        smsOptOutSource: 'sms_reply',
      }, { merge: true })))
      console.log(`[termii-webhook] STOP honoured for ${matches.length} store(s)`)
      return res.status(200).send('OK')
    }

    // ---------------------------------------------------- delivery report
    const messageId = String(payload.message_id || payload.id || '').trim()
    if (!messageId) return res.status(200).send('OK')

    const ref = db.collection(SMS_MESSAGES).doc(messageId)
    const doc = await ref.get()
    if (!doc.exists) {
      // A report for something we did not send, or one that arrived before the
      // send finished writing. Nothing to attribute it to.
      return res.status(200).send('OK')
    }

    const existing = doc.data()
    const outcome = classify(payload.status)
    const previous = existing.outcome || 'pending'

    await ref.set({
      status: String(payload.status || ''),
      outcome,
      cost: payload.cost ?? existing.cost ?? null,
      channel: payload.channel || existing.channel || '',
      reportedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // Campaign counters move only when the outcome actually changes, so a
    // repeated report cannot inflate them.
    if (existing.campaignId && existing.campaignId !== 'test' && outcome !== previous) {
      const update = {}
      if (COUNTER[outcome]) update[COUNTER[outcome]] = FieldValue.increment(1)
      if (COUNTER[previous]) update[COUNTER[previous]] = FieldValue.increment(-1)
      if (Object.keys(update).length) {
        await db.collection(SMS_CAMPAIGNS).doc(existing.campaignId).update(update).catch(() => {})
      }
    }

    return res.status(200).send('OK')
  } catch (err) {
    // A 500 makes Termii retry. Nothing here is worth retrying, and the report
    // is already logged, so this always acknowledges.
    console.error('[termii-webhook] error:', err?.message)
    return res.status(200).send('OK')
  }
}
