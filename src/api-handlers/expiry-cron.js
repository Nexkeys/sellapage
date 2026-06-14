import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend' 

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()
const resend = new Resend(process.env.RESEND_API_KEY) 

const STARTER_RESET = {
  plan: 'starter',
  planStatus: 'expired',
  maxProducts: 15,
  maxImagesPerProduct: 3,
  hasGrowthFeatures: false,
  hasProFeatures: false,
  hasPremiumFeatures: false,
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed')
    }

    const cronSecret = req.headers['x-cron-secret']
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).send('Unauthorized')
    }

    // Fetch all stores to evaluate statuses safely
    const storesSnap = await db.collection('stores').get()

    if (storesSnap.empty) {
      return res.status(200).json({ active: 0, warning: 0, grace: 0, expired: 0, total: 0 })
    }

    const now = Timestamp.now()
    const nowMillis = now.toMillis()
    
    // Define timing constants (in milliseconds)
    const ONE_DAY = 24 * 60 * 60 * 1000
    const THREE_DAYS = 3 * ONE_DAY

    const summary = { active: 0, warning: 0, grace: 0, expired: 0, total: 0 }
    const batch = db.batch()

    for (const storeDoc of storesSnap.docs) {
      const data = storeDoc.data()
      const plan = data.plan

      // Skip stores that are already on base free tiers
      if (plan === 'starter' || plan === 'free') {
        continue
      }

      summary.total++

      const planEndDate = data.planEndDate
      const graceUntil = data.graceUntil
      const vendorEmail = data.vendorEmail || data.email 
      const storeName = data.storeName || 'Vendor'

      if (!planEndDate || !graceUntil) {
        continue
      }

      const planEndMillis = planEndDate.toMillis()
      const graceUntilMillis = graceUntil.toMillis()

      // CASE 1: Plan is active and far from expiration
      if (nowMillis < (planEndMillis - THREE_DAYS)) {
        batch.update(storeDoc.ref, { planStatus: 'active' })
        summary.active++
      } 
      
      // CASE 2: Plan is expiring soon (Inside the 3-day window before expiration)
      else if (nowMillis >= (planEndMillis - THREE_DAYS) && nowMillis < planEndMillis) {
        batch.update(storeDoc.ref, { planStatus: 'active' })
        summary.warning++

        if (vendorEmail) {
          try {
            await resend.emails.send({
              from: 'Sellapage <notifications@sellapage.com.ng>',
              to: vendorEmail,
              subject: '⏰ Notice: Your Sellapage Subscription Expires in 3 Days',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #ea580c;">Subscription Expiring Soon! ⏰</h2>
                  <p>Hello ${storeName},</p>
                  <p>This is a quick reminder that your premium Sellapage plan will expire in <strong>3 days</strong> on ${planEndDate.toDate().toDateString()}.</p>
                  <p>Keep your advanced catalog features, layout settings, and ordering flows running smoothly by renewing your plan early.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Renew Now</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`❌ Failed to send warning email to ${vendorEmail}:`, emailErr.message)
          }
        }
      }
      
      // CASE 3: Expired but inside the 2-day Grace Period
      else if (nowMillis >= planEndMillis && nowMillis < graceUntilMillis) {
        batch.update(storeDoc.ref, { planStatus: 'grace' })
        summary.grace++

        if (vendorEmail) {
          try {
            await resend.emails.send({
              from: 'Sellapage <notifications@sellapage.com.ng>',
              to: vendorEmail,
              subject: '⚠️ Action Required: Your Sellapage Subscription Has Expired',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #dc2626;">Your plan has expired! ⚠️</h2>
                  <p>Hello ${storeName},</p>
                  <p>Your subscription plan has reached its end date. Don't worry, your premium features are still active under our <strong>2-day grace period</strong>.</p>
                  <p>To avoid service interruptions or catalog downgrades, please renew your plan as soon as possible.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Renew Subscription</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">Thank you for growing with Sellapage!</p>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`❌ Failed to send grace email to ${vendorEmail}:`, emailErr.message)
          }
        }
      } 
      
      // CASE 4: Grace period over, downgrade account completely
      else {
        batch.update(storeDoc.ref, STARTER_RESET)
        summary.expired++

        if (vendorEmail) {
          try {
            await resend.emails.send({
              from: 'Sellapage <notifications@sellapage.com.ng>',
              to: vendorEmail,
              subject: '📉 Notice: Your Sellapage Plan Has Been Downgraded',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #4b5563;">Account Downgraded to Starter Plan 📉</h2>
                  <p>Hello ${storeName},</p>
                  <p>Your subscription grace period has ended, and your account has been shifted to the free <strong>Starter Plan</strong>.</p>
                  <p>Your product allocation and premium tools have been adjusted to match starter limits. Any products above your tier limits have been hidden but are safely saved.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Upgrade Account Instantly</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error(`❌ Failed to send downgrade email to ${vendorEmail}:`, emailErr.message)
          }
        }
      }
    }

    await batch.commit()
    return res.status(200).json(summary)
    
  } catch (err) {
    console.error('Internal server error:', err)
    return res.status(500).send('Internal server error')
  }
}