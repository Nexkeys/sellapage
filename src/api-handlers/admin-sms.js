// Promotional SMS campaigns to vendors' phones.
//
// This spends real money and cannot be recalled, so every guard here is
// deliberate:
//   - the promotional sender ID and route are separate from the transactional
//     ones, because marketing on the OTP sender ID is how a sender ID gets
//     blocked, which would take phone signup down with it;
//   - vendors who opted out are removed inside selectRecipients, where no
//     filter combination can reach them;
//   - a send is refused between 8pm and 8am Lagos time, because MTN drops
//     promotional traffic then and the money would buy nothing;
//   - the cost is estimated and checked against the Termii wallet first;
//   - a test send to one number is available, and encouraged before a campaign.
import { getAdminDb } from './_lib/firebase-admin.js'
import { verifyAdmin } from './_lib/verify-admin.js'
import { applyCors as applyCorsOrigin } from './_lib/http.js'
import { getPromoConfigStatus, sendPromotionalSms, getWalletBalance } from './_lib/termii.js'
import { FieldValue } from 'firebase-admin/firestore'
import {
  countSms, estimateCost, DEFAULT_PAGE_RATE, selectRecipients, sendWindow,
  buildMessage, previewMessage, campaignCode, LINK_PLACEHOLDER, publicBase,
} from './_lib/sms-campaign.js'
import { normaliseNgMobile, maskNgPhone, toLocalNgPhone } from '../utils/phone.js'

const CAMPAIGNS = 'smsCampaigns'
const CLICKS = 'smsClicks'
const MESSAGES = 'smsMessages'
const OPT_OUTS = 'smsOptOuts'
// Restoring consent is recorded rather than silently deleted, so there is
// always an answer to "why is this number getting our texts again".
const OPT_OUT_LOG = 'smsOptOutLog'
// A test send has no store behind it, but the tracked link still needs a
// recipient part, so it gets a fixed one.
const TEST_STORE_ID = 'test-send'
const MAX_MESSAGES = 2000
const MAX_BODY = 480
const MAX_RECIPIENTS = 5000

const clean = (v, max) => String(v ?? '').trim().slice(0, max)
const iso = (v) => v?.toDate?.()?.toISOString() || (typeof v === 'string' ? v : null)

function parseFilters(raw = {}) {
  const out = {}
  if (Array.isArray(raw.plans) && raw.plans.length) {
    out.plans = raw.plans.map((p) => String(p).toLowerCase()).filter(Boolean).slice(0, 6)
  }
  if (raw.vendorType && ['products', 'services', 'both'].includes(String(raw.vendorType))) {
    out.vendorType = String(raw.vendorType)
  }
  if (raw.paidOnly === true) out.paidOnly = true
  if (raw.freeOnly === true) out.freeOnly = true
  if (raw.verifiedOnly === true) out.verifiedOnly = true
  return out
}

async function readStores(db) {
  const snap = await db.collection('stores')
    .select('storeName', 'handle', 'plan', 'vendorType', 'verifiedPhone', 'whatsappNumber', 'smsOptOut')
    .get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

async function readOptOutPhones(db) {
  const snap = await db.collection(OPT_OUTS).get()
  const phones = new Set()
  snap.docs.forEach((doc) => {
    if (doc.data().optedOut === false) return
    const phone = normaliseNgMobile(doc.data().phone || doc.id)
    if (phone) phones.add(phone)
  })
  return phones
}

function costing({ body, includeLink, linkUrl, recipients }) {
  const preview = previewMessage({ body, includeLink: includeLink && Boolean(linkUrl) })
  const counts = countSms(preview)
  return {
    preview,
    ...counts,
    recipients,
    cost: estimateCost(counts.pages, recipients),
    rate: DEFAULT_PAGE_RATE,
  }
}

export default async function handler(req, res) {
  applyCorsOrigin(req, res)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const admin = await verifyAdmin(req, 'sms')
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  let body = {}
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}) } catch {}
  const action = req.query.action || body.action || 'overview'

  try {
    const db = getAdminDb()

    // Everything the tab needs to open: config state, wallet, history, chart.
    if (action === 'overview') {
      const config = getPromoConfigStatus()
      const [wallet, campaignsSnap, clicksSnap] = await Promise.all([
        getWalletBalance(),
        db.collection(CAMPAIGNS).orderBy('createdAtMs', 'desc').limit(100).get(),
        db.collection(CLICKS).orderBy('atMs', 'desc').limit(2000).get(),
      ])

      const campaigns = campaignsSnap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          name: d.name || '',
          body: d.body || '',
          status: d.status || 'draft',
          includeLink: Boolean(d.includeLink),
          linkUrl: d.linkUrl || '',
          filters: d.filters || {},
          audience: Number(d.audience) || 0,
          sent: Number(d.sent) || 0,
          failed: Number(d.failed) || 0,
          // From Termii's delivery reports (termii-webhook.js), not from us.
          delivered: Number(d.delivered) || 0,
          dndBlocked: Number(d.dndBlocked) || 0,
          undelivered: Number(d.undelivered) || 0,
          pages: Number(d.pages) || 0,
          cost: Number(d.cost) || 0,
          clicks: Number(d.clicks) || 0,
          clickedBy: Array.isArray(d.clickedBy) ? d.clickedBy.length : 0,
          error: d.error || '',
          createdAt: iso(d.createdAt) || null,
          sentAt: iso(d.sentAt) || null,
          createdAtMs: Number(d.createdAtMs) || 0,
        }
      })

      // Sends and clicks per day, for the chart.
      const byDay = {}
      campaigns.forEach((c) => {
        if (c.status !== 'sent' || !c.sentAt) return
        const key = c.sentAt.slice(0, 10)
        const row = (byDay[key] ||= { date: key, sent: 0, clicks: 0 })
        row.sent += c.sent
      })
      clicksSnap.docs.forEach((doc) => {
        const at = doc.data().atMs
        if (!at) return
        const key = new Date(at).toISOString().slice(0, 10)
        const row = (byDay[key] ||= { date: key, sent: 0, clicks: 0 })
        row.clicks += 1
      })

      const sentCampaigns = campaigns.filter((c) => c.status === 'sent')
      const totals = {
        campaigns: sentCampaigns.length,
        // Accepted by Termii.
        sentMessages: sentCampaigns.reduce((n, c) => n + c.sent, 0),
        failed: sentCampaigns.reduce((n, c) => n + c.failed, 0),
        clicks: sentCampaigns.reduce((n, c) => n + c.clicks, 0),
        // Confirmed on a handset by a delivery report.
        delivered: sentCampaigns.reduce((n, c) => n + c.delivered, 0),
        dndBlocked: sentCampaigns.reduce((n, c) => n + c.dndBlocked, 0),
        undelivered: sentCampaigns.reduce((n, c) => n + c.undelivered, 0),
        spend: Math.round(sentCampaigns.reduce((n, c) => n + c.cost, 0) * 100) / 100,
      }
      // Against messages sent, not against confirmed deliveries: reports
      // trickle in, and dividing by a number that is still filling would show a
      // tap rate above 100%.
      totals.clickRate = totals.sentMessages > 0 ? Math.round((totals.clicks / totals.sentMessages) * 1000) / 10 : 0

      return res.status(200).json({
        success: true,
        config: {
          ready: config.available,
          reason: config.reason || '',
          message: config.message || '',
          senderId: config.senderId || '',
          rate: DEFAULT_PAGE_RATE,
          linkPlaceholder: LINK_PLACEHOLDER,
          publicBase: publicBase(),
        },
        wallet: wallet.ok ? { balance: wallet.balance, currency: wallet.currency } : { error: wallet.error },
        window: sendWindow(),
        campaigns,
        totals,
        series: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      })
    }

    // Who would receive this, and what it would cost.
    if (action === 'audience') {
      const filters = parseFilters(body.filters)
      const [stores, optedOut] = await Promise.all([readStores(db), readOptOutPhones(db)])
      const { recipients, skipped } = selectRecipients(stores, filters, optedOut)
      const wallet = await getWalletBalance()
      const quote = costing({
        body: body.body,
        includeLink: body.includeLink,
        linkUrl: body.linkUrl,
        recipients: recipients.length,
      })

      return res.status(200).json({
        success: true,
        filters,
        count: recipients.length,
        skipped,
        bySource: {
          verified: recipients.filter((r) => r.source === 'verified').length,
          whatsapp: recipients.filter((r) => r.source === 'whatsapp').length,
        },
        sample: recipients.slice(0, 5).map((r) => ({ storeName: r.storeName, plan: r.plan, source: r.source })),
        quote,
        wallet: wallet.ok ? { balance: wallet.balance } : null,
        affordable: wallet.ok ? wallet.balance >= quote.cost : null,
        window: sendWindow(),
      })
    }

    // Drafts: compose now, send later, edit in between.
    if (action === 'save' && req.method === 'POST') {
      const name = clean(body.name, 80) || 'Untitled campaign'
      const text = clean(body.body, MAX_BODY)
      if (!text) return res.status(400).json({ error: 'Write the message first.' })
      const linkUrl = clean(body.linkUrl, 400)
      if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
        return res.status(400).json({ error: 'The link must start with https://' })
      }

      const payload = {
        name,
        body: text,
        linkUrl,
        includeLink: Boolean(body.includeLink) && Boolean(linkUrl),
        filters: parseFilters(body.filters),
        status: 'draft',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid || admin.email || 'admin',
      }

      if (body.id) {
        const ref = db.collection(CAMPAIGNS).doc(String(body.id))
        const existing = await ref.get()
        if (!existing.exists) return res.status(404).json({ error: 'That campaign no longer exists.' })
        if (existing.data().status === 'sent') {
          return res.status(400).json({ error: 'A campaign that has been sent cannot be edited. Duplicate it instead.' })
        }
        await ref.update(payload)
        return res.status(200).json({ success: true, id: ref.id })
      }

      const ref = await db.collection(CAMPAIGNS).add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        clicks: 0,
      })
      // The short code lives on the document so a tapped link can find it
      // without scanning every campaign.
      await ref.update({ code: campaignCode(ref.id) })
      return res.status(200).json({ success: true, id: ref.id })
    }

    if (action === 'delete' && req.method === 'POST') {
      const id = String(body.id || '')
      if (!id) return res.status(400).json({ error: 'Missing campaign id' })
      const ref = db.collection(CAMPAIGNS).doc(id)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'That campaign no longer exists.' })
      if (doc.data().status === 'sent') {
        return res.status(400).json({ error: 'A sent campaign is kept as a record and cannot be deleted.' })
      }
      await ref.delete()
      return res.status(200).json({ success: true })
    }

    // One message to one number, so the wording can be seen on a real phone
    // before it goes to everybody.
    if (action === 'test' && req.method === 'POST') {
      const config = getPromoConfigStatus()
      if (!config.available) return res.status(400).json({ error: config.message })

      const phone = normaliseNgMobile(body.phone)
      if (!phone) return res.status(400).json({ error: 'Enter a valid Nigerian mobile number.' })

      const text = clean(body.body, MAX_BODY)
      if (!text) return res.status(400).json({ error: 'Write the message first.' })

      // A test that ignores the opt-out list is not a test of what we send.
      const optedOut = await readOptOutPhones(db)
      if (optedOut.has(phone)) {
        return res.status(400).json({
          error: `${toLocalNgPhone(phone)} has opted out of promotional SMS. Put it back on the list below if it was a test.`,
        })
      }

      // The tracked link is built from a SAVED campaign, because /r/<code>
      // finds the destination URL on the campaign document. Testing against an
      // unsaved draft used to send a code that matched nothing, and the link
      // then landed on the home page instead of the URL that was typed in,
      // which reads as "it ignores my link".
      const wantsLink = Boolean(body.includeLink) && Boolean(body.linkUrl)
      const campaignId = String(body.id || '')
      if (wantsLink && !campaignId) {
        return res.status(400).json({ error: 'Save the campaign first, so the tracked link knows where to send people.' })
      }
      if (wantsLink) {
        const draft = await db.collection(CAMPAIGNS).doc(campaignId).get()
        if (!draft.exists) return res.status(404).json({ error: 'That campaign no longer exists. Save it again.' })
        if (!draft.data().linkUrl) {
          return res.status(400).json({ error: 'Save the campaign first: the link on the saved version is what the tracked link points at.' })
        }
      }

      const message = buildMessage({
        body: text,
        campaignId: campaignId || 'test-campaign',
        storeId: TEST_STORE_ID,
        phone,
        includeLink: wantsLink,
        includeOptOut: true,
      })

      const result = await sendPromotionalSms({ to: [phone], sms: message })
      if (!result.ok) return res.status(502).json({ error: result.message || 'Termii refused the test send.' })

      // A test costs money and lands on a real handset, so it belongs in the
      // log like any other message. Keyed by Termii's message id, so its
      // delivery report finds it.
      const counts = countSms(message)
      if (result.messageId) {
        await db.collection(MESSAGES).doc(String(result.messageId)).set({
          campaignId: '',
          isTest: true,
          storeId: '',
          storeName: 'Test send',
          phone,
          status: 'Message Sent',
          outcome: 'pending',
          pages: counts.pages,
          sentAt: FieldValue.serverTimestamp(),
          sentAtMs: Date.now(),
        }).catch((err) => console.error('[admin-sms] test record failed:', err?.message))
      }

      // Termii's send response does not always carry the balance, and showing
      // "NGN 0" after a successful send reads as an empty wallet. Ask for it.
      const wallet = await getWalletBalance()
      return res.status(200).json({
        success: true,
        balance: wallet.ok ? wallet.balance : (Number.isFinite(result.balance) ? result.balance : null),
        pages: counts.pages,
        sentText: message,
      })
    }

    // The real thing.
    if (action === 'send' && req.method === 'POST') {
      const config = getPromoConfigStatus()
      if (!config.available) return res.status(400).json({ error: config.message })

      const window = sendWindow()
      if (!window.open) return res.status(400).json({ error: window.reason })

      const id = String(body.id || '')
      if (!id) return res.status(400).json({ error: 'Save the campaign first.' })

      const ref = db.collection(CAMPAIGNS).doc(id)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'That campaign no longer exists.' })
      const campaign = doc.data()
      // Guards against a double tap and against a retry after a partial send.
      if (campaign.status === 'sent' || campaign.status === 'sending') {
        return res.status(400).json({ error: 'This campaign has already been sent.' })
      }

      const [stores, optedOut] = await Promise.all([readStores(db), readOptOutPhones(db)])
      const { recipients } = selectRecipients(stores, campaign.filters || {}, optedOut)
      if (!recipients.length) return res.status(400).json({ error: 'Nobody matches this audience.' })
      if (recipients.length > MAX_RECIPIENTS) {
        return res.status(400).json({ error: `That is ${recipients.length} recipients, above the ${MAX_RECIPIENTS} safety limit.` })
      }

      const quote = costing({
        body: campaign.body,
        includeLink: campaign.includeLink,
        linkUrl: campaign.linkUrl,
        recipients: recipients.length,
      })

      const wallet = await getWalletBalance()
      if (wallet.ok && wallet.balance < quote.cost) {
        return res.status(400).json({
          error: `Not enough Termii credit. This needs about NGN ${quote.cost.toLocaleString('en-NG')} and the wallet has NGN ${wallet.balance.toLocaleString('en-NG')}.`,
        })
      }

      await ref.update({
        status: 'sending',
        audience: recipients.length,
        pages: quote.pages,
        cost: quote.cost,
        recipientIds: recipients.map((r) => r.storeId).slice(0, MAX_RECIPIENTS),
        startedAt: FieldValue.serverTimestamp(),
      })

      let sent = 0
      let failed = 0
      let lastBalance = wallet.ok ? wallet.balance : null
      const errors = []

      // One request per recipient, deliberately.
      //
      // Termii's bulk endpoint takes 100 numbers but sends them all the SAME
      // text, and every message here differs: each vendor gets their own
      // opt-out link, and their own tracked link when one is used. Batching
      // would mean one shared opt-out link, which cannot identify who asked to
      // be removed, so it is not an option while opt-out is per vendor.
      const insufficient = 'insufficient_balance'
      for (const r of recipients) {
        const message = buildMessage({
          body: campaign.body,
          campaignId: id,
          storeId: r.storeId,
          phone: r.phone,
          includeLink: Boolean(campaign.includeLink && campaign.linkUrl),
        })
        const result = await sendPromotionalSms({ to: [r.phone], sms: message })
        if (result.ok) {
          sent += 1
          if (Number.isFinite(result.balance)) lastBalance = result.balance
          // Keyed by Termii's message id, which is what the delivery report
          // carries. Never awaited: a bookkeeping write must not slow a send.
          if (result.messageId) {
            db.collection(MESSAGES).doc(String(result.messageId)).set({
              campaignId: id,
              storeId: r.storeId,
              storeName: r.storeName,
              phone: r.phone,
              status: 'Message Sent',
              outcome: 'pending',
              sentAt: FieldValue.serverTimestamp(),
              sentAtMs: Date.now(),
            }).catch((err) => console.error('[admin-sms] message record failed:', err?.message))
          }
          continue
        }
        failed += 1
        if (errors.length < 5) errors.push(result.message || result.error)
        // Out of credit stops the run: every further request would fail too,
        // and the campaign records how far it got.
        if (result.error === insufficient) break
      }

      await ref.update({
        status: 'sent',
        sent,
        failed,
        delivered: 0,
        dndBlocked: 0,
        undelivered: 0,
        sentAt: FieldValue.serverTimestamp(),
        balanceAfter: lastBalance,
        error: errors[0] || '',
        errors,
      })

      return res.status(200).json({
        success: true,
        sent,
        failed,
        audience: recipients.length,
        cost: quote.cost,
        balance: lastBalance,
        errors,
      })
    }

    // Every individual message, with whatever Termii has reported about it.
    //
    // The campaign list answers "what did we send". This answers "what happened
    // to each one": delivered, blocked by DND, failed, or still waiting on a
    // report. Ordered newest first in the QUERY, so paging past the window
    // cannot start showing an arbitrary slice.
    if (action === 'messages') {
      const rawLimit = parseInt(req.query.limit)
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50
      const page = Math.max(parseInt(req.query.page) || 1, 1)
      const outcome = String(req.query.outcome || '').trim()
      const campaignId = String(req.query.campaignId || '').trim()
      const search = String(req.query.search || '').trim().toLowerCase()

      const snap = await db.collection(MESSAGES)
        .orderBy('sentAtMs', 'desc')
        .limit(MAX_MESSAGES)
        .get()

      let rows = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          messageId: doc.id,
          campaignId: d.campaignId || '',
          storeId: d.storeId || '',
          storeName: d.storeName || '',
          phone: maskNgPhone(d.phone || ''),
          status: d.status || '',
          outcome: d.outcome || 'pending',
          pages: Number(d.pages) || null,
          cost: d.cost ?? null,
          channel: d.channel || '',
          sentAt: iso(d.sentAt) || null,
          sentAtMs: Number(d.sentAtMs) || 0,
          deliveredAt: d.deliveredAt || null,
          reportedAt: iso(d.reportedAt) || null,
        }
      })

      if (outcome) rows = rows.filter((r) => r.outcome === outcome)
      if (campaignId) rows = rows.filter((r) => r.campaignId === campaignId)
      if (search) {
        rows = rows.filter((r) =>
          r.storeName.toLowerCase().includes(search) ||
          r.phone.includes(search) ||
          r.messageId.includes(search))
      }

      const counts = { delivered: 0, dnd: 0, failed: 0, pending: 0 }
      snap.docs.forEach((doc) => {
        const o = doc.data().outcome || 'pending'
        if (counts[o] !== undefined) counts[o] += 1
      })

      const total = rows.length
      const offset = (page - 1) * limit
      return res.status(200).json({
        success: true,
        messages: rows.slice(offset, offset + limit),
        counts,
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        truncated: snap.size >= MAX_MESSAGES,
      })
    }

    // Who opted out, so the number is visible rather than the audience
    // silently shrinking with no explanation.
    if (action === 'opt-outs') {
      const [snap, stores] = await Promise.all([
        db.collection(OPT_OUTS).get(),
        readStores(db),
      ])

      // Which store, if any, that number belongs to. Opt-out is by number, so
      // a number with no store (a test send) is listed on its own.
      const byPhone = new Map()
      stores.forEach((s) => {
        const phone = normaliseNgMobile(s.verifiedPhone || s.whatsappNumber || '')
        if (phone && !byPhone.has(phone)) byPhone.set(phone, s.storeName || s.handle || '')
      })

      const rows = snap.docs
        .map((doc) => {
          const d = doc.data()
          const phone = normaliseNgMobile(d.phone || doc.id) || ''
          return {
            phone,
            local: toLocalNgPhone(phone) || String(doc.id),
            storeName: byPhone.get(phone) || '',
            source: d.source || 'link',
            at: iso(d.at) || null,
            atMs: Number(d.atMs) || 0,
          }
        })
        .filter((r) => r.phone)
        .sort((a, b) => b.atMs - a.atMs)

      return res.status(200).json({ success: true, optOuts: rows, total: rows.length })
    }

    // Putting a number back on the list.
    //
    // Only ever done by hand, from the admin panel, for a number that opted out
    // by mistake or during testing. Consent is the vendor's to give, so this
    // records who did it rather than quietly deleting the evidence.
    if (action === 'opt-in' && req.method === 'POST') {
      const phone = normaliseNgMobile(body.phone)
      if (!phone) return res.status(400).json({ error: 'Enter a valid Nigerian mobile number.' })

      const ref = db.collection(OPT_OUTS).doc(phone)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'That number is not on the opt-out list.' })

      // Read before deleting: the record of when they opted out is the part
      // worth keeping, and it is gone once the document is.
      const was = doc.data() || {}
      await ref.delete()
      await db.collection(OPT_OUT_LOG).add({
        phone,
        local: toLocalNgPhone(phone),
        optedOut: false,
        restoredAt: FieldValue.serverTimestamp(),
        restoredBy: admin.uid || admin.email || 'admin',
        at: was.at || null,
        atMs: Number(was.atMs) || 0,
        source: 'restored',
      }).catch((err) => console.error('[admin-sms] opt-in log failed:', err?.message))

      return res.status(200).json({ success: true, phone, local: toLocalNgPhone(phone) })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-sms] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
