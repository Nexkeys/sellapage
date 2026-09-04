import crypto from 'crypto'

// Constant-time secret comparison - a plain !== leaks how many leading bytes of
// a guess were correct.
function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'

// Triggered by an external cron-job.org job (same pattern as expiry-cron.js -
// this project has no Vercel Cron, so scheduling lives outside the codebase).
// Sends the vendor one email per booking that's starting within the next
// REMINDER_WINDOW_MS - deliberately one email per booking, not a digest, so a
// vendor with 3 bookings coming up gets 3 separate emails, each with that
// booking's own details.
const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours, fixed platform-wide

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'no_show', 'refunded'])

function formatScheduled(bookingDate, bookingTime) {
  const d = new Date(`${bookingDate}T${bookingTime || '00:00'}`)
  if (Number.isNaN(d.getTime())) return `${bookingDate} ${bookingTime || ''}`.trim()
  return `${d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })} at ${bookingTime || d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed')
  }

  const cronSecret = req.headers['x-cron-secret']
  if (!timingSafeMatch(cronSecret, process.env.CRON_SECRET)) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const db = getAdminDb()
    const now = Date.now()

    // Single-field collection-group query - only needs a collection-group
    // index on `reminderSent`, not a composite one. Status/time-window
    // filtering happens in-memory below. Capped well under Firestore's
    // 500-write batch limit since we also mark docs processed in this run.
    const snap = await db
      .collectionGroup('bookings')
      .where('reminderSent', '==', false)
      .limit(450)
      .get()

    const summary = { scanned: snap.size, reminded: 0, skipped: 0, errors: 0 }

    if (snap.empty) {
      return res.status(200).json(summary)
    }

    const storeCache = new Map()
    const getStore = async (storeId) => {
      if (storeCache.has(storeId)) return storeCache.get(storeId)
      const storeSnap = await db.collection('stores').doc(storeId).get()
      const data = storeSnap.exists ? storeSnap.data() : null
      storeCache.set(storeId, data)
      return data
    }

    const batch = db.batch()
    let batchHasWrites = false

    for (const doc of snap.docs) {
      const booking = doc.data()
      const storeId = doc.ref.parent.parent?.id

      if (!storeId || !booking.bookingDate) {
        batch.update(doc.ref, { reminderSent: true })
        batchHasWrites = true
        summary.skipped++
        continue
      }

      if (TERMINAL_STATUSES.has(booking.status)) {
        batch.update(doc.ref, { reminderSent: true })
        batchHasWrites = true
        summary.skipped++
        continue
      }

      const bookingStart = new Date(`${booking.bookingDate}T${booking.bookingTime || '00:00'}`)
      if (Number.isNaN(bookingStart.getTime()) || bookingStart.getTime() < now) {
        // Malformed date, or the window already passed - too late to remind.
        batch.update(doc.ref, { reminderSent: true })
        batchHasWrites = true
        summary.skipped++
        continue
      }

      if (bookingStart.getTime() - now > REMINDER_WINDOW_MS) {
        // Still further than 2 hours out - leave reminderSent:false, a later
        // cron run will pick it up once it enters the window.
        continue
      }

      try {
        const storeData = await getStore(storeId)
        if (storeData?.email) {
          await sendEmail(
            storeData.email,
            `⏰ Upcoming booking: ${booking.customerName || 'A customer'} - ${formatScheduled(booking.bookingDate, booking.bookingTime)}`,
            `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                <h2 style="color: #16a34a;">Upcoming Booking Reminder ⏰</h2>
                <p>Hello ${storeData.businessName || 'there'},</p>
                <p>You have a booking coming up in the next 2 hours:</p>
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Customer</td>
                      <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right; font-weight: bold;">${booking.customerName || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Service</td>
                      <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${booking.serviceName || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Scheduled for</td>
                      <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${formatScheduled(booking.bookingDate, booking.bookingTime)}</td>
                    </tr>
                    ${
                      booking.locationPref
                        ? `<tr>
                      <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Location</td>
                      <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${booking.locationPref}</td>
                    </tr>`
                        : ''
                    }
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Phone</td>
                      <td style="padding: 6px 0; color: #111827; font-size: 14px; text-align: right;">${booking.customerPhone || '-'}</td>
                    </tr>
                  </table>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="https://sellapage.com.ng/dashboard" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">View in Dashboard</a>
                </div>
                <p style="font-size: 13px; color: #666666; margin-top: 20px;">The Sellapage Team</p>
              </div>
            `,
          )
          summary.reminded++
        } else {
          summary.skipped++
        }
      } catch (emailErr) {
        console.error(`[booking-reminder-cron] failed to email store ${storeId}:`, emailErr.message)
        summary.errors++
      }

      batch.update(doc.ref, { reminderSent: true })
      batchHasWrites = true
    }

    if (batchHasWrites) {
      await batch.commit()
    }

    return res.status(200).json(summary)
  } catch (err) {
    console.error('[booking-reminder-cron] Internal server error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
