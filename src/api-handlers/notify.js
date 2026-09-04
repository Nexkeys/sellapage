// sellapage/api/notify.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { sendEmail } from './_lib/send-email.js'
import { sendPush } from './_lib/send-push.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()
const auth = getAuth()

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Unauthorized')
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (err) {
      console.error('Token verification failed:', err)
      return res.status(401).send('Unauthorized')
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const { type } = body
    if (!type || !['welcome', 'login_alert'].includes(type)) {
      return res.status(400).json({ error: 'Invalid or missing notification type' })
    }

    const storeSnap = await db.collection('stores').doc(decodedToken.uid).get()
    if (!storeSnap.exists) {
      return res.status(404).send('Not Found')
    }
    const storeData = storeSnap.data()

    const notifications = []

    if (type === 'welcome') {
      if (storeData.email) {
        notifications.push(
          sendEmail(
            storeData.email,
            `${storeData.businessName || 'Your store'} is live on Sellapage ✅`,
            `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                  body { margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif; }
                  .outer { width: 100%; background-color: #f9fafb; padding: 24px 0; }
                  .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
                  .email-header { background-color: #16a34a; padding: 28px 32px; }
                  .email-header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
                  .email-header p { color: rgba(255,255,255,0.75); font-size: 13px; margin: 0; }
                  .email-body { padding: 32px; }
                  .greeting { color: #111827; font-size: 17px; font-weight: 600; margin: 0 0 14px 0; }
                  .body-text { color: #4b5563; font-size: 14px; line-height: 1.75; margin: 0 0 16px 0; }
                  .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
                  .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin: 0 0 4px 0; }
                  .plan-table { width: 100%; border-collapse: collapse; }
                  .plan-icon-cell { width: 32px; vertical-align: top; padding: 14px 14px 14px 0; font-size: 18px; }
                  .plan-content-cell { vertical-align: top; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
                  .plan-last .plan-content-cell { border-bottom: none; }
                  .plan-name { font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 5px 0; }
                  .plan-badge { display: inline-block; background: #f0fdf4; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid #bbf7d0; margin-left: 6px; vertical-align: middle; }
                  .plan-desc { font-size: 12px; color: #6b7280; line-height: 1.65; margin: 0; }
                  .cta-wrap { text-align: center; margin-top: 28px; }
                  .cta-btn { display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 10px; }
                  .sign-off { color: #4b5563; font-size: 14px; line-height: 1.75; margin: 28px 0 0 0; }
                  .support-line { font-size: 12px; color: #9ca3af; margin: 20px 0 0 0; text-align: center; }
                  .support-line a { color: #16a34a; text-decoration: none; }

                  @media only screen and (max-width: 480px) {
                    .outer { padding: 0 !important; }
                    .card { border-radius: 0 !important; border-left: none !important; border-right: none !important; }
                    .email-header { padding: 22px 20px !important; }
                    .email-header h1 { font-size: 18px !important; }
                    .email-body { padding: 24px 20px !important; }
                    .greeting { font-size: 16px !important; }
                    .body-text { font-size: 13px !important; }
                    .plan-desc { font-size: 12px !important; }
                    .cta-btn { display: block !important; text-align: center !important; padding: 14px 20px !important; }
                    .support-line { font-size: 11px !important; }
                  }
                </style>
              </head>
              <body>
                <div class="outer">
                  <div class="card">

                    <div class="email-header">
                      <h1>Sellapage</h1>
                      <p>Your workspace is ready</p>
                    </div>

                    <div class="email-body">

                      <p class="greeting">Hey ${storeData.businessName || 'there'} 👋</p>

                      <p class="body-text">
                        Welcome to sellapage, Your store is live and your workspace is fully set up. We're genuinely glad you're here, and we want to make sure you actually get value from this. Not just a dashboard you log into once and forget.
                      </p>

                      <p class="body-text">
                        You can start listing products or services right now. When you're ready to share, copy your store link from the dashboard and drop it in your WhatsApp bio, Instagram page, or wherever your customers already find you. That's really it.
                      </p>

                      <hr class="divider" />

                      <p class="section-label">What's available to you</p>

                      <table class="plan-table">
                        <tr>
                          <td class="plan-icon-cell">🌱</td>
                          <td class="plan-content-cell">
                            <p class="plan-name">Starter <span class="plan-badge">Your current plan</span></p>
                            <p class="plan-desc">15 product or service listings, 3 images each, manual order log you can export as PDF or CSV, category sorting, and a fully shareable store page. Free forever, no expiry, no card needed.</p>
                          </td>
                        </tr>
                        <tr>
                          <td class="plan-icon-cell">🚀</td>
                          <td class="plan-content-cell">
                            <p class="plan-name">Growth</p>
                            <p class="plan-desc">50 listings, 10 images each, custom brand colours and logo, store analytics and click tracking, stock control, WhatsApp cart, and 20 daily AI product description credits.</p>
                          </td>
                        </tr>
                        <tr>
                          <td class="plan-icon-cell">✨</td>
                          <td class="plan-content-cell">
                            <p class="plan-name">Pro</p>
                            <p class="plan-desc">Unlimited listings and 50 images each. In-app Paystack checkout, Sendbox delivery automation, discount and promo codes, full customer CRM, 20 premium store themes, custom domain, and 50 daily AI credits.</p>
                          </td>
                        </tr>
                        <tr class="plan-last">
                          <td class="plan-icon-cell">👑</td>
                          <td class="plan-content-cell">
                            <p class="plan-name">Premium</p>
                            <p class="plan-desc">Everything in Pro, and your store runs fully white-label with zero Sellapage branding. Priority support included.</p>
                          </td>
                        </tr>
                      </table>

                      <div class="cta-wrap">
                        <a href="https://sellapage.com.ng/dashboard" class="cta-btn">Open My Dashboard</a>
                      </div>

                      <p class="sign-off">
                        If anything ever looks off or you're not sure of how something works, just reach out. We actually respond. <br /><br />
                        Welcome to Sellapage. 🚀<br />
                        <strong style="color: #111827;">- The Sellapage Team</strong>
                      </p>

                      <p class="support-line">
                        Questions? <a href="mailto:sellapage.ng@gmail.com">sellapage.ng@gmail.com</a> &nbsp;&middot;&nbsp; <a href="https://wa.me/2348120525256">WhatsApp Support</a>
                      </p>

                    </div>
                  </div>
                </div>
              </body>
              </html>
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
            'Your Sellapage commerce workspace was just accessed.',
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

    return res.status(200).json({ success: true, type, channels: notifications.length > 0 ? ['email', 'push'] : [] })
  } catch (err) {
    console.error('Internal server error:', err)
    return res.status(500).send('Internal Server Error')
  }
}