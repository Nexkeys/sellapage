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
import { normaliseNgMobile } from '../utils/phone.js'

const CAMPAIGNS = 'smsCampaigns'
const CLICKS = 'smsClicks'
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
        delivered: sentCampaigns.reduce((n, c) => n + c.sent, 0),
        failed: sentCampaigns.reduce((n, c) => n + c.failed, 0),
        clicks: sentCampaigns.reduce((n, c) => n + c.clicks, 0),
        spend: Math.round(sentCampaigns.reduce((n, c) => n + c.cost, 0) * 100) / 100,
      }
      totals.clickRate = totals.delivered > 0 ? Math.round((totals.clicks / totals.delivered) * 1000) / 10 : 0

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
      const stores = await readStores(db)
      const { recipients, skipped } = selectRecipients(stores, filters)
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

      const message = buildMessage({
        body: text,
        campaignId: 'test-campaign',
        storeId: 'test-store',
        includeLink: Boolean(body.includeLink) && Boolean(body.linkUrl),
        includeOptOut: true,
      })

      const result = await sendPromotionalSms({ to: [phone], sms: message })
      if (!result.ok) return res.status(502).json({ error: result.message || 'Termii refused the test send.' })
      return res.status(200).json({ success: true, balance: result.balance, sentText: message })
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

      const stores = await readStores(db)
      const { recipients } = selectRecipients(stores, campaign.filters || {})
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
          includeLink: Boolean(campaign.includeLink && campaign.linkUrl),
        })
        const result = await sendPromotionalSms({ to: [r.phone], sms: message })
        if (result.ok) {
          sent += 1
          if (Number.isFinite(result.balance)) lastBalance = result.balance
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

    // Who opted out, so the number is visible rather than silently shrinking.
    if (action === 'opt-outs') {
      const snap = await db.collection('stores')
        .select('storeName', 'handle', 'smsOptOut', 'smsOptOutAt')
        .get()
      const rows = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.smsOptOut === true)
        .map((s) => ({ id: s.id, storeName: s.storeName || s.handle || '', at: iso(s.smsOptOutAt) }))
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      return res.status(200).json({ success: true, optOuts: rows, total: rows.length })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[admin-sms] Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
