// netlify/functions/notify.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { sendEmail } from './send-email.js'
import { sendPush } from './send-push.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()
const auth = getAuth()

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Unauthorized' }
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (err) {
      console.error('Token verification failed:', err)
      return { statusCode: 401, body: 'Unauthorized' }
    }

    let body
    try {
      body = JSON.parse(event.body)
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
    }

    const { type } = body
    if (!type || !['welcome', 'login_alert'].includes(type)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing notification type' }) }
    }

    const storeSnap = await db.collection('stores').doc(decodedToken.uid).get()
    if (!storeSnap.exists) {
      return { statusCode: 404, body: 'Not Found' }
    }
    const storeData = storeSnap.data()

    const notifications = []

    if (type === 'welcome') {
      if (storeData.email) {
        notifications.push(
          sendEmail(
            storeData.email,
            'Welcome to Sellapage! Let\'s get your store live 🚀',
            `
              <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
                <div style="background-color: #16a34a; padding: 24px;">
                  <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">Sellapage Workspace Created</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">Welcome, ${storeData.businessName || 'Merchant'}!</h2>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Let's get your store up and running in three simple steps:</p>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; color: #16a34a; font-size: 18px; font-weight: bold;">1.</td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Add Your First Product:</strong> Populate pricing structures and media.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; color: #16a34a; font-size: 18px; font-weight: bold;">2.</td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Connect Paystack Settlement:</strong> Configure your wallet routing rules.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; color: #16a34a; font-size: 18px; font-weight: bold;">3.</td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Launch Your URL Workspace:</strong> Go live on your custom web directory.
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div style="text-align: center; margin-top: 32px;">
                    <a
                      href="https://sellapage.com.ng/dashboard"
                      style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;"
                    >
                      Open My Dashboard
                    </a>
                  </div>
                </div>
              </div>
            `
          )
        )
      }
    } else if (type === 'login_alert') {
      if (storeData.email) {
        notifications.push(
          sendEmail(
            storeData.email,
            'Security Alert: New sign-in detected on your Sellapage workspace',
            `
              <div style="max-width: 600px; margin: 0 auto; background: white; font-family: Arial, sans-serif;">
                <div style="background-color: #16a34a; padding: 24px;">
                  <h1 style="color: white; font-size: 22px; margin: 0; font-weight: bold;">Security Alert</h1>
                </div>
                <div style="padding: 32px;">
                  <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">Hi ${storeData.businessName || 'Merchant'},</p>
                  <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      A new sign-in was detected on your Sellapage commerce workspace.
                    </p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
                    If this was you, you can ignore this email. If you didn't sign in, please reset your password immediately.
                  </p>
                </div>
                <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  Sellapage · sellapage.com.ng
                </div>
              </div>
            `
          )
        )
      }
      if (storeData.fcmToken) {
        notifications.push(
          sendPush(
            storeData.fcmToken,
            'New Login Detected 🔐',
            'Your Sellapage commerce workspace was just accessed via a browser terminal.',
            { type: 'security_alert' }
          )
        )
      }
    }

    try {
      await Promise.all(notifications)
    } catch (err) {
      console.error('Error sending notifications:', err)
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (err) {
    console.error('Internal server error:', err)
    return { statusCode: 500, body: 'Internal Server Error' }
  }
}
