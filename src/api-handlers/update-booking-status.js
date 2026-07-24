import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'
import { sendPush } from './_lib/send-push.js'
import { generateWhatsAppLink } from '../utils/whatsapp.js'

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  refunded: 'Refunded',
}

const STATUS_COLORS = {
  pending: '#6b7280',
  confirmed: '#2563eb',
  in_progress: '#d97706',
  rescheduled: '#7c3aed',
  completed: '#16a34a',
  cancelled: '#dc2626',
  no_show: '#dc2626',
  refunded: '#6b7280',
}

const STATUS_MESSAGES = {
  pending: 'Your booking is pending and will be confirmed shortly.',
  confirmed: 'Great news! Your booking has been confirmed.',
  in_progress: 'Your service is currently in progress.',
  rescheduled: 'Your booking has been rescheduled.',
  completed: 'Your booking has been completed. We hope you enjoyed it!',
  cancelled: 'Your booking has been cancelled.',
  no_show: 'This booking was marked as a no-show.',
  refunded: 'This booking has been marked as refunded by the vendor.',
}

const VALID_BOOKING_STATUSES = Object.keys(STATUS_LABELS)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, bookingId, newStatus, newBookingDate, newBookingTime } = req.body

  if (!storeId || !bookingId || !newStatus) {
    return res.status(400).json({ error: 'Missing required fields: storeId, bookingId, newStatus' })
  }

  if (!VALID_BOOKING_STATUSES.includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status value' })
  }

  if (newStatus === 'rescheduled' && (!newBookingDate || !newBookingTime)) {
    return res.status(400).json({ error: 'Missing required fields: newBookingDate, newBookingTime' })
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (decodedToken.uid !== storeId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const bookingRef = db
      .collection('stores')
      .doc(storeId)
      .collection('bookings')
      .doc(bookingId)

    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const bookingData = bookingSnap.data()

    // No hard status lock, unlike orders' delivered-lock — service businesses need
    // to correct a mis-click (e.g. cancelled -> refunded) after the fact.

    const changedAtIso = new Date().toISOString()
    const statusLogEntry = {
      status: newStatus,
      changedAt: changedAtIso,
      changedBy: decodedToken.uid,
      changedByLabel: 'Vendor',
    }

    const updatePayload = {
      status: newStatus,
      updatedAt: changedAtIso,
    }

    if (newStatus === 'rescheduled') {
      statusLogEntry.previousDate = bookingData.bookingDate || ''
      statusLogEntry.previousTime = bookingData.bookingTime || ''
      statusLogEntry.newDate = newBookingDate
      statusLogEntry.newTime = newBookingTime
      updatePayload.bookingDate = newBookingDate
      updatePayload.bookingTime = newBookingTime
      // A reminder may already have fired for the old time — reset so the
      // booking-reminder-cron job reminds again ahead of the new time.
      updatePayload.reminderSent = false
    }

    // Booking is no longer happening (or already happened) — stop the
    // reminder cron from ever considering it, regardless of reminderSent.
    if (['cancelled', 'completed', 'no_show', 'refunded'].includes(newStatus)) {
      updatePayload.reminderSent = true
    }

    updatePayload.statusLog = FieldValue.arrayUnion(statusLogEntry)

    let reviewToken = bookingData.reviewToken || null

    if (newStatus === 'completed') {
      reviewToken = crypto.randomUUID()
      updatePayload.reviewToken = reviewToken
      updatePayload.reviewTokenUsed = false
      updatePayload.reviewSubmitted = false
      updatePayload.completedAt = changedAtIso
    }

    await bookingRef.update(updatePayload)

    const storeSnap = await db.collection('stores').doc(storeId).get()
    const storeData = storeSnap.data() || {}

    if (newStatus === 'completed') {
      try {
        const fcmToken = storeData.fcmToken
        if (fcmToken) {
          await sendPush(
            fcmToken,
            'Booking Completed ✅',
            `${bookingData.customerName || 'A customer'}'s booking has been marked as completed.`,
            { bookingId, type: 'booking_completed' }
          )
        }
      } catch (pushErr) {
        console.error('[update-booking-status] Push notification failed:', pushErr)
      }
    }

    const customerEmail = bookingData.customerEmail
    const customerName = bookingData.customerName || 'Customer'
    const storeName = storeData.businessName || 'the store'
    const statusLabel = STATUS_LABELS[newStatus] || newStatus
    const statusColor = STATUS_COLORS[newStatus] || '#16a34a'
    const statusMessage = STATUS_MESSAGES[newStatus] || ''
    const serviceName = bookingData.serviceName || 'Your booking'
    const grandTotal = Number(bookingData.grandTotal || 0)
    const scheduleLine = newStatus === 'rescheduled'
      ? [newBookingDate, newBookingTime].filter(Boolean).join(' at ')
      : [bookingData.bookingDate, bookingData.bookingTime].filter(Boolean).join(' at ')

    let whatsappCta = ''
    if (newStatus === 'cancelled' && storeData.whatsappNumber) {
      const waMessage = `Hi, my booking (${serviceName}) with ${storeName} was cancelled. I'd like to follow up about a refund. My payment reference: ${bookingData.paystackReference || bookingId}.`
      const waUrl = generateWhatsAppLink(storeData.whatsappNumber, waMessage)
      whatsappCta = `
        <div style="border: 2px solid #dc2626; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <h4 style="color: #111827; font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Already paid?</h4>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">Contact the vendor directly on WhatsApp for a refund.</p>
          <a
            href="${waUrl}"
            style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;"
          >
            Contact Vendor for Refund
          </a>
        </div>
      `
    }

    if (customerEmail) {
      try {
        await sendEmail(
          customerEmail,
          `Update on your booking with ${storeName} — ${statusLabel}`,
          `
            <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
              <div style="background-color: ${statusColor}; padding: 24px;">
                <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeName}</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">${statusLabel}</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${customerName}, ${statusMessage}</p>
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Booking Summary</h3>
                  <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">${serviceName}</p>
                  ${scheduleLine ? `<p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">Scheduled for: ${scheduleLine}</p>` : ''}
                  <p style="color: #16a34a; font-weight: bold; font-size: 16px; margin: 0;">Total: ₦${grandTotal.toLocaleString('en-NG')}</p>
                </div>
                ${newStatus === 'completed' && reviewToken ? `
                  <div style="border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                    <h4 style="color: #111827; font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Enjoyed the service?</h4>
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">Leave a quick review and help other customers.</p>
                    <a
                      href="https://sellapage.com.ng/review?token=${reviewToken}"
                      style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;"
                    >
                      Leave a Review
                    </a>
                  </div>
                ` : ''}
                ${whatsappCta}
                <div style="text-align: center; margin-top: 28px;">
                  <a href="https://sellapage.com.ng" style="color: #6b7280; font-size: 12px; text-decoration: none;">Powered by Sellapage</a>
                </div>
              </div>
              <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                This update was sent by ${storeName} via Sellapage · sellapage.com.ng
              </div>
            </div>
          `
        )
      } catch (emailErr) {
        console.error('[update-booking-status] Email send failed:', emailErr)
      }
    }

    return res.status(200).json({ success: true, status: newStatus, reviewToken })
  } catch (err) {
    console.error('[update-booking-status] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
