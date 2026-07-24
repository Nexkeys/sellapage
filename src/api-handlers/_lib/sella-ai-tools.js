// src/api-handlers/_lib/sella-ai-tools.js
// Tool implementations for the Sella AI Business Partner:
//  - webSearch(): live research via Tavily (read-only, safe to auto-run)
//  - executeWriteAction(): performs a vendor-confirmed write against the real collections
//
// SAFETY MODEL: writes NEVER run automatically. The handler only reaches
// executeWriteAction() after the vendor has explicitly confirmed the pending action
// in the chat UI. Unknown/unsupported action types fail closed with a helpful message.

import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { sendEmail } from './send-email.js'

const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

// ---------------------------------------------------------------------------
// Live web research (Tavily) — its own key, separate from every other feature.
// ---------------------------------------------------------------------------
export async function webSearch(query) {
  if (!process.env.TAVILY_API_KEY) {
    return { ok: false, error: 'Web search is not configured.', results: [] }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000) // never let a slow search hang the tool loop
  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: String(query || '').slice(0, 400),
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
      signal: controller.signal,
    })
    if (!resp.ok) {
      const text = await resp.text()
      console.error('[sella-ai] Tavily error:', resp.status, text.slice(0, 200))
      return { ok: false, error: 'Web search failed.', results: [] }
    }
    const data = await resp.json()
    return {
      ok: true,
      answer: data.answer || '',
      results: (data.results || []).slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.content || '').slice(0, 500),
      })),
    }
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'Web search timed out.' : 'Web search failed.'
    console.error('[sella-ai] Tavily exception:', err?.name || err?.message || err)
    return { ok: false, error: reason, results: [] }
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Write executor — one case per supported dashboard surface.
// Add a new `case` here to let Sella AI write to a newly added tab.
// ---------------------------------------------------------------------------
const SAFE_SETTINGS_FIELDS = [
  'businessName', 'storeDescription', 'whatsapp', 'phone', 'instagram',
  'facebook', 'twitter', 'tiktok', 'about', 'returnPolicy', 'shippingPolicy',
]

const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']
const VALID_BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'rescheduled', 'completed', 'cancelled', 'no_show', 'refunded']

export async function executeWriteAction(db, storeId, action) {
  const type = action?.type
  const args = action?.args || {}
  const storeRef = db.collection('stores').doc(storeId)

  switch (type) {
    // ------------------------------------------------------------- LEDGER
    case 'add_ledger_entry': {
      if (!args.customerName || !args.itemName || args.amount == null) {
        return { ok: false, message: 'Missing customer name, item, or amount.' }
      }
      const id = Date.now().toString()
      await storeRef.collection('ledger').doc(id).set({
        customerName: String(args.customerName).trim(),
        itemName: String(args.itemName).trim(),
        amount: Number(args.amount),
        date: args.date || new Date().toISOString().slice(0, 10),
        notes: String(args.notes || '').trim(),
        status: args.status || 'Paid',
        createdAt: new Date().toISOString(),
      })
      return { ok: true, message: `Logged ${money(args.amount)} sale to ${args.customerName} in your Ledger.` }
    }

    // ------------------------------------------------------------- PRODUCTS
    case 'add_product': {
      if (!args.name || args.price == null) {
        return { ok: false, message: 'A product needs at least a name and a price.' }
      }
      const ref = storeRef.collection('products').doc()
      await ref.set({
        name: String(args.name).trim(),
        price: Number(args.price),
        description: String(args.description || '').trim(),
        category: args.category ? String(args.category).trim() : '',
        stock: args.stock != null ? Number(args.stock) : null,
        type: args.type || 'physical',
        visible: true,
        imageUrls: [],
        imageUrl: '',
        createdAt: new Date(),
      })
      await storeRef.set({ productCount: FieldValue.increment(1) }, { merge: true })
      return {
        ok: true,
        message: `Added "${args.name}" (${money(args.price)}) to your Products. Want to add a photo? Upload it right here.`,
        imageTarget: { collection: 'products', id: ref.id, name: String(args.name).trim() },
      }
    }

    // ------------------------------------------------------------- SERVICES
    case 'add_service': {
      if (!args.name || args.price == null) {
        return { ok: false, message: 'A service needs at least a name and a price.' }
      }
      const ref = storeRef.collection('services').doc()
      await ref.set({
        name: String(args.name).trim(),
        price: Number(args.price),
        description: String(args.description || '').trim(),
        category: args.category ? String(args.category).trim() : '',
        duration: args.duration || '',
        visible: true,
        imageUrls: [],
        imageUrl: '',
        createdAt: new Date(),
      })
      return {
        ok: true,
        message: `Added service "${args.name}" (${money(args.price)}) to your Services. Want to add a photo? Upload it right here.`,
        imageTarget: { collection: 'services', id: ref.id, name: String(args.name).trim() },
      }
    }

    // ------------------------------------------------------------- DISCOUNTS
    case 'create_discount': {
      const code = String(args.code || '').trim().toUpperCase()
      const dtype = args.type === 'flat' ? 'flat' : 'percentage'
      const value = Number(args.value)
      if (!code || !value) return { ok: false, message: 'A discount needs a code and a value.' }
      if (dtype === 'percentage' && (value < 1 || value > 100)) {
        return { ok: false, message: 'Percentage discount must be between 1 and 100.' }
      }
      const dupe = await storeRef.collection('discounts').where('code', '==', code).limit(1).get()
      if (!dupe.empty) return { ok: false, message: `A discount code "${code}" already exists.` }
      const ref = storeRef.collection('discounts').doc()
      await ref.set({
        code,
        type: dtype,
        value,
        usageLimit: args.usageLimit != null ? Number(args.usageLimit) : null,
        usageCount: 0,
        active: true,
        createdAt: new Date().toISOString(),
      })
      const label = dtype === 'percentage' ? `${value}% off` : `${money(value)} off`
      return { ok: true, message: `Created promo code ${code} — ${label}.` }
    }

    // ------------------------------------------------------------- ORDER STATUS
    case 'update_order_status': {
      const { orderId, newStatus } = args
      if (!orderId || !VALID_ORDER_STATUSES.includes(newStatus)) {
        return { ok: false, message: 'Provide a valid order and status.' }
      }
      const orderRef = storeRef.collection('orders').doc(String(orderId))
      const snap = await orderRef.get()
      if (!snap.exists) return { ok: false, message: 'That order was not found.' }
      const order = snap.data()
      if (order.status === 'delivered' && newStatus !== 'delivered') {
        return { ok: false, message: 'A delivered order cannot be changed.' }
      }
      const changedAtIso = new Date().toISOString()
      const payload = {
        status: newStatus,
        updatedAt: changedAtIso,
        [`statusHistory.${newStatus}`]: changedAtIso,
        statusLog: FieldValue.arrayUnion({
          status: newStatus, changedAt: changedAtIso, changedBy: storeId, changedByLabel: 'Sella AI',
        }),
      }
      let reviewToken = order.reviewToken || null
      if (newStatus === 'delivered') {
        reviewToken = crypto.randomUUID()
        payload.reviewToken = reviewToken
        payload.reviewTokenUsed = false
        payload.reviewSubmitted = false
        payload.deliveredAt = changedAtIso
      }
      await orderRef.update(payload)
      // Best-effort customer notification (never blocks the write).
      if (order.customerEmail) {
        try {
          const storeSnap = await storeRef.get()
          const storeName = storeSnap.data()?.businessName || 'the store'
          await sendEmail(
            order.customerEmail,
            `Update on your order from ${storeName}`,
            `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#111827">Order update</h2>
              <p style="color:#374151">Hi ${order.customerName || 'there'}, your order status is now <strong>${newStatus}</strong>.</p>
              ${newStatus === 'delivered' && reviewToken ? `<p><a href="https://sellapage.com.ng/review?token=${reviewToken}" style="background:#16a34a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Leave a Review</a></p>` : ''}
              <p style="color:#9ca3af;font-size:12px">Powered by Sellapage</p>
            </div>`
          )
        } catch (e) {
          console.error('[sella-ai] order status email failed:', e?.message || e)
        }
      }
      return { ok: true, message: `Order marked as ${newStatus}.` }
    }

    // ------------------------------------------------------------- BOOKING STATUS
    case 'update_booking_status': {
      const { bookingId, newStatus, newBookingDate, newBookingTime } = args
      if (!bookingId || !VALID_BOOKING_STATUSES.includes(newStatus)) {
        return { ok: false, message: 'Provide a valid booking and status.' }
      }
      if (newStatus === 'rescheduled' && (!newBookingDate || !newBookingTime)) {
        return { ok: false, message: 'Rescheduling needs a new date and time.' }
      }
      const bookingRef = storeRef.collection('bookings').doc(String(bookingId))
      const snap = await bookingRef.get()
      if (!snap.exists) return { ok: false, message: 'That booking was not found.' }
      const booking = snap.data()
      // No hard status lock, unlike orders — service bookings allow post-hoc correction.
      const changedAtIso = new Date().toISOString()
      const statusLogEntry = {
        status: newStatus, changedAt: changedAtIso, changedBy: storeId, changedByLabel: 'Sella AI',
      }
      const payload = { status: newStatus, updatedAt: changedAtIso }
      if (newStatus === 'rescheduled') {
        statusLogEntry.previousDate = booking.bookingDate || ''
        statusLogEntry.previousTime = booking.bookingTime || ''
        statusLogEntry.newDate = newBookingDate
        statusLogEntry.newTime = newBookingTime
        payload.bookingDate = newBookingDate
        payload.bookingTime = newBookingTime
        payload.reminderSent = false
      }
      if (['cancelled', 'completed', 'no_show', 'refunded'].includes(newStatus)) {
        payload.reminderSent = true
      }
      payload.statusLog = FieldValue.arrayUnion(statusLogEntry)
      let reviewToken = booking.reviewToken || null
      if (newStatus === 'completed') {
        reviewToken = crypto.randomUUID()
        payload.reviewToken = reviewToken
        payload.reviewTokenUsed = false
        payload.reviewSubmitted = false
        payload.completedAt = changedAtIso
      }
      await bookingRef.update(payload)
      // Best-effort customer notification (never blocks the write).
      if (booking.customerEmail) {
        try {
          const storeSnap = await storeRef.get()
          const storeName = storeSnap.data()?.businessName || 'the store'
          await sendEmail(
            booking.customerEmail,
            `Update on your booking with ${storeName}`,
            `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#111827">Booking update</h2>
              <p style="color:#374151">Hi ${booking.customerName || 'there'}, your booking status is now <strong>${newStatus}</strong>.</p>
              ${newStatus === 'completed' && reviewToken ? `<p><a href="https://sellapage.com.ng/review?token=${reviewToken}" style="background:#16a34a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Leave a Review</a></p>` : ''}
              <p style="color:#9ca3af;font-size:12px">Powered by Sellapage</p>
            </div>`
          )
        } catch (e) {
          console.error('[sella-ai] booking status email failed:', e?.message || e)
        }
      }
      return { ok: true, message: `Booking marked as ${newStatus}.` }
    }

    // ------------------------------------------------------------- DELIVERY (pickup address)
    case 'update_delivery_pickup': {
      const { streetAddress, city, state } = args
      if (!streetAddress && !city && !state) {
        return { ok: false, message: 'Provide at least one pickup address field to update.' }
      }
      const current = (await storeRef.get()).data()?.pickupAddress || {}
      await storeRef.set({
        pickupAddress: {
          streetAddress: streetAddress ?? current.streetAddress ?? '',
          city: city ?? current.city ?? '',
          state: state ?? current.state ?? '',
        },
      }, { merge: true })
      return { ok: true, message: 'Updated your pickup address in Delivery.' }
    }

    // ------------------------------------------------------------- SETTINGS (whitelisted)
    case 'update_store_settings': {
      const updates = {}
      for (const key of SAFE_SETTINGS_FIELDS) {
        if (args[key] != null) updates[key] = String(args[key]).trim()
      }
      if (!Object.keys(updates).length) {
        return { ok: false, message: 'No supported settings field was provided.' }
      }
      await storeRef.set(updates, { merge: true })
      return { ok: true, message: `Updated: ${Object.keys(updates).join(', ')}.` }
    }

    // ------------------------------------------------------------- UNSUPPORTED / NEW TABS
    default:
      return {
        ok: false,
        message: `I can't directly edit that yet. I've noted what you want — please make this change from the ${action?.tabHint || 'relevant'} tab, and I can guide you through it.`,
      }
  }
}

// Human-readable one-liner describing a pending write, shown on the confirm card.
export function describeAction(action) {
  const a = action?.args || {}
  const money2 = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`
  switch (action?.type) {
    case 'add_ledger_entry':
      return `Log a ${money2(a.amount)} sale to ${a.customerName} (${a.itemName}) in your Ledger.`
    case 'add_product':
      return `Add product "${a.name}" priced ${money2(a.price)} to your store.`
    case 'add_service':
      return `Add service "${a.name}" priced ${money2(a.price)} to your store.`
    case 'create_discount':
      return `Create promo code ${String(a.code || '').toUpperCase()} (${a.type === 'flat' ? money2(a.value) + ' off' : a.value + '% off'}).`
    case 'update_order_status':
      return `Change order ${a.orderId} status to "${a.newStatus}".`
    case 'update_booking_status':
      return a.newStatus === 'rescheduled'
        ? `Reschedule booking ${a.bookingId} to ${a.newBookingDate} at ${a.newBookingTime}.`
        : `Change booking ${a.bookingId} status to "${a.newStatus}".`
    case 'update_delivery_pickup':
      return `Update pickup address to ${[a.streetAddress, a.city, a.state].filter(Boolean).join(', ')}.`
    case 'update_store_settings':
      return `Update store settings: ${Object.keys(a).join(', ')}.`
    default:
      return 'Make the requested change to your store.'
  }
}
