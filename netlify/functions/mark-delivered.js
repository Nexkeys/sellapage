import crypto from 'crypto'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { sendEmail } from './send-email.js'
import { sendPush } from './send-push.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const authHeader = event.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    await getAuth().verifyIdToken(token)
  } catch (error) {
    console.error('Token verification failed:', error)
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { storeId, orderId } = body
  if (!storeId || !orderId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing storeId or orderId' }) }
  }

  const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const orderSnap = await orderRef.get()

  if (!orderSnap.exists) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) }
  }

  const order = orderSnap.data()
  if (order.status === 'delivered') {
    return { statusCode: 200, body: JSON.stringify({ message: 'Already delivered' }) }
  }

  const reviewToken = crypto.randomUUID()

  await orderRef.set(
    {
      status: 'delivered',
      reviewToken,
      reviewTokenUsed: false,
      reviewSubmitted: false,
      deliveredAt: Timestamp.now(),
    },
    { merge: true }
  )

  try {
    const storeSnap = await db.collection('stores').doc(storeId).get()
    const storeData = storeSnap.data() || {}

    await Promise.all([
      order.customerEmail
        ? sendEmail(
            order.customerEmail,
            `Your order from ${storeData.businessName || 'the store'} has been delivered ✅`,
            `
              <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
                <div style="background-color: #16a34a; padding: 24px;">
                  <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">${storeData.businessName || 'Sellapage'}</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">Your Order Has Been Delivered!</h2>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Hi ${order.customerName || 'there'}, your order has arrived. We hope you love it!</p>
                  
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #374151; font-size: 13px; font-weight: bold; margin: 0 0 16px 0;">Order Summary</h3>
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">${order.items || 'No items'}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">Total Paid</td>
                        <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 16px; text-align: right;">₦${Number(order.total || order.grandTotal || 0).toLocaleString('en-NG')}</td>
                      </tr>
                    </table>
                  </div>
                  
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
                </div>
                <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  This review link is single-use and expires once submitted · Sellapage · sellapage.com.ng
                </div>
              </div>
            `
          )
        : Promise.resolve(),
      storeData.fcmToken
        ? sendPush(
            storeData.fcmToken,
            'Order Delivered ✅',
            `${order.customerName || 'A customer'}'s order has been marked as delivered.`,
            { orderId, type: 'order_delivered' }
          )
        : Promise.resolve(),
    ])
  } catch (error) {
    console.error('Error sending notifications:', error)
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, reviewToken }) }
}
