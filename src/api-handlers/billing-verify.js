// src/api-handlers/billing-verify.js
//
// GET /api/billing-verify?reference=...
//
// Tells the billing callback page whether a plan payment actually went
// through, so the dashboard can celebrate a real payment and say sorry for a
// failed one instead of welcoming everyone who comes back from Paystack.
//
// Read-only and safe to call without signing in: a Paystack reference is an
// unguessable per-transaction token (the same trust model as
// verify-transaction.js), and the answer only carries the plan, the period
// and the outcome, never the payer's details. It does NOT change the plan.
// The webhook (paystack-webhook.js) stays the only thing that does, so a
// replayed or forged call here cannot grant anything.
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

const PAID = new Set(['success'])
const FAILED = new Set(['failed', 'abandoned', 'reversed'])

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!memoryRateLimit('billing-verify', clientKey(req), 20, 60000)) return tooManyRequests(res)

  const reference = String(req.query.reference || '').trim()
  if (!reference || reference.length > 100 || !/^[A-Za-z0-9_.=-]+$/.test(reference)) {
    return res.status(400).json({ error: 'Invalid reference' })
  }

  try {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const body = await r.json().catch(() => ({}))
    const tx = body?.data
    if (!r.ok || !tx) {
      // Paystack does not know this reference (or is unreachable). Unknown is
      // not the same as failed: the page decides what to show.
      return res.status(200).json({ status: 'unknown' })
    }

    const meta = tx.metadata || {}
    // Only answers for Sellapage plan payments. A storefront checkout
    // reference gets "unknown" rather than details of someone's order.
    if (meta.type !== 'subscription') return res.status(200).json({ status: 'unknown' })

    const raw = String(tx.status || '')
    const status = PAID.has(raw) ? 'success' : FAILED.has(raw) ? 'failed' : 'pending'
    return res.status(200).json({
      status,
      plan: ['growth', 'pro', 'premium'].includes(meta.plan) ? meta.plan : null,
      billingPeriod: meta.billingPeriod || 'monthly',
      // Paystack's own words for a failure ("Declined", "Insufficient Funds"),
      // shown to the vendor so they know whether to try another card.
      reason: status === 'failed' ? String(tx.gateway_response || '').slice(0, 120) : '',
    })
  } catch (err) {
    console.error('[billing-verify]', err)
    return res.status(200).json({ status: 'unknown' })
  }
}
