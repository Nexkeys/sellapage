import { getAdminDb } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'

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
    const { getAdminAuth } = await import('./_lib/firebase-admin.js')
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

    await orderRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
      [`statusHistory.${newStatus}`]: new Date().toISOString(),
    })

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
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${customerName}, ${statusMessage}</p>
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Order Summary</h3>
                  <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">${itemsText}</p>
                  <p style="color: #16a34a; font-weight: bold; font-size: 16px; margin: 0;">Total: ₦${grandTotal.toLocaleString('en-NG')}</p>
                </div>
                ${newStatus === 'delivered' && orderData.reviewToken && !orderData.reviewSubmitted ? `
                  <div style="text-align: center; margin-top: 24px; padding: 20px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                    <p style="color: #15803d; font-size: 14px; margin: 0 0 12px 0;">Enjoyed your order? Leave a quick review!</p>
                    <a href="https://sellapage.com.ng/review?token=${orderData.reviewToken}" style="background-color: #16a34a; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Leave a Review</a>
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

    return res.status(200).json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[update-order-status] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
