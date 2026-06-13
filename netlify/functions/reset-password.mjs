// netlify/functions/reset-password.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { sendEmail } from './send-email.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const auth = getAuth()

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    let body
    try {
      body = JSON.parse(event.body)
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
    }

    const { email } = body
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) }
    }

    // Determine base URL from host header (use http for localhost)
    const host = (event && event.headers && event.headers.host) || ''
    const isLocal = host.includes('localhost')
    const base = isLocal ? `http://${host}` : 'https://sellapage.com.ng'

    // Generate raw password reset link with crash-guard
    let rawLink
    try {
      rawLink = await auth.generatePasswordResetLink(email)
    } catch (err) {
      console.error('Password reset generation error:', err)
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "No active user account matches this email address." }),
      }
    }

    // Extract oobCode from raw link
    const url = new URL(rawLink)
    const oobCode = url.searchParams.get('oobCode')

    if (!oobCode) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to extract reset code' }) }
    }

    // Construct custom branded link
    const customResetLink = `${base}/reset-password?oobCode=${oobCode}`

    // Email template
    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 48px 20px; text-align: center;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <span style="font-weight: 800; font-size: 20px; color: #111827; tracking-tight: -0.025em;">Sellapage</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Reset your password</h2>
    <p style="font-size: 14px; line-height: 24px; color: #4b5563; margin: 0 0 32px 0;">We received a request to change the password for your Sellapage commerce workspace. Click the button below to configure your new secure credentials:</p>
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${customResetLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 12px; transition: background-color 0.2s ease;">Reset My Password</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 12px; line-height: 20px; color: #9ca3af; margin: 0;">
      <strong>Didn't request this change?</strong> You can safely ignore this communication. Your current password configuration remains completely secure, and no adjustments will be performed on your workspace profile.
    </p>
  </div>
</div>`

    // Send email
    await sendEmail(email, 'Reset your Sellapage password', html)

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (err) {
    console.error('Internal server error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send reset email' }) }
  }
}
