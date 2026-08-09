import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { sendEmail, escapeHtml } from './_lib/send-email.js'
import { sendPush } from './_lib/send-push.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Order Confirmed',
  dispatched: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLORS = {
  pending: '#6b7280',
  confirmed: '#2563eb',
  dispatched: '#d97706',
  delivered: '#16a34a',
  cancelled: '#dc2626',
}

const STATUS_MESSAGES = {
  pending: 'Your order is pending and will be confirmed shortly.',
  confirmed: 'Great news! Your order has been confirmed and is being prepared.',
  dispatched: 'Your order is on its way! The vendor has dispatched your package.',
  delivered: 'Your order has been delivered. We hope you love it!',
  cancelled: 'Unfortunately, your order has been cancelled. Please contact the store for more information.',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { storeId, orderId, newStatus } = req.body

  if (!storeId || !orderId || !newStatus) {
    return res.status(400).json({ error: 'Missing required fields: storeId, orderId, newStatus' })
  }

  const validStatuses = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status value' })
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

    const access = await resolveStoreAccess(decodedToken.uid, storeId, 'orders', true)
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const actorLabel = access.role === 'owner' ? 'Vendor' : `Staff: ${access.staffName || 'Unknown'}`

    const orderRef = db
      .collection('stores')
      .doc(storeId)
      .collection('orders')
      .doc(orderId)

    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const orderData = orderSnap.data()

    if (orderData.status === 'delivered' && newStatus !== 'delivered') {
      return res.status(400).json({ error: 'Cannot change status of a delivered order' })
    }

    const changedAtIso = new Date().toISOString()
    const updatePayload = {
      status: newStatus,
      updatedAt: changedAtIso,
      [`statusHistory.${newStatus}`]: changedAtIso,
      statusLog: FieldValue.arrayUnion({
        status: newStatus,
        changedAt: changedAtIso,
        changedBy: decodedToken.uid,
        changedByLabel: actorLabel,
      }),
      lastUpdatedBy: { uid: decodedToken.uid, label: actorLabel },
    }

    let reviewToken = orderData.reviewToken || null

    if (newStatus === 'delivered') {
      reviewToken = crypto.randomUUID()
      updatePayload.reviewToken = reviewToken
      updatePayload.reviewTokenUsed = false
      updatePayload.reviewSubmitted = false
      updatePayload.deliveredAt = changedAtIso
    }

    await orderRef.update(updatePayload)

    if (newStatus === 'delivered') {
      try {
        const storeSnapForPush = await db.collection('stores').doc(storeId).get()
        const fcmToken = storeSnapForPush.data()?.fcmToken
        if (fcmToken) {
          await sendPush(
            fcmToken,
            'Order Delivered ✅',
            `${orderData.customerName || 'A customer'}'s order has been marked as delivered.`,
            { orderId, type: 'order_delivered' }
          )
        }
      } catch (pushErr) {
        console.error('[update-order-status] Push notification failed:', pushErr)
      }
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    const storeData = storeSnap.data() || {}
    const customerEmail = orderData.customerEmail
    const customerName = orderData.customerName || 'Customer'
    const storeName = storeData.businessName || 'the store'
    const statusLabel = STATUS_LABELS[newStatus] || newStatus
    const statusColor = STATUS_COLORS[newStatus] || '#16a34a'
    const statusMessage = STATUS_MESSAGES[newStatus] || ''
    const itemsText = orderData.items || 'Your order'
    const grandTotal = Number(orderData.grandTotal || orderData.total || 0)

    if (customerEmail) {
      try {
        await sendEmail(
          customerEmail,
          `Update on your order from ${storeName} — ${statusLabel}`,
          `
            <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
              <div style="background-color: ${statusColor}; padding: 24px;">
                <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeName}</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">${statusLabel}</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${escapeHtml(customerName)}, ${statusMessage}</p>
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Order Summary</h3>
                  <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">${itemsText}</p>
                  <p style="color: #16a34a; font-weight: bold; font-size: 16px; margin: 0;">Total: ₦${grandTotal.toLocaleString('en-NG')}</p>
                </div>
                ${newStatus === 'delivered' && reviewToken ? `
                  <div style="border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                    <h4 style="color: #111827; font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Enjoyed your order?</h4>
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">Leave a quick review and help other shoppers.</p>
                    <a 
                      href="https://sellapage.com.ng/review?token=${reviewToken}"
                      style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;"
                    >
                      Leave a Review
                    </a>
                  </div>
                ` : ''}
                ${newStatus === 'dispatched' && orderData.sendboxTrackingUrl ? `
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${orderData.sendboxTrackingUrl}" style="background-color: #d97706; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Track Your Order</a>
                  </div>
                ` : ''}
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
        console.error('[update-order-status] Email send failed:', emailErr)
      }
    }

    return res.status(200).json({ success: true, status: newStatus, reviewToken })
  } catch (err) {
    console.error('[update-order-status] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
