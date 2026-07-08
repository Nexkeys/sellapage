//src/api-handlers/expiry-cron.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { sendEmail } from './_lib/send-email.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()

const STARTER_RESET = {
  plan: 'starter',
  planStatus: 'expired',
  maxProducts: 15,
  maxImagesPerProduct: 3,
  hasGrowthFeatures: false,
  hasProFeatures: false,
  hasPremiumFeatures: false,
}

// Helper to make the plan name look beautiful in the email template
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
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

    const storesSnap = await db.collection('stores').get()

    if (storesSnap.empty) {
      return res.status(200).json({ active: 0, warning: 0, grace: 0, expired: 0, total: 0 })
    }

    const now = Timestamp.now()
    const nowMillis = now.toMillis()
    
    const ONE_DAY = 24 * 60 * 60 * 1000
    const THREE_DAYS = 3 * ONE_DAY

    const summary = { active: 0, warning: 0, grace: 0, expired: 0, total: 0 }
    const batch = db.batch()

    for (const storeDoc of storesSnap.docs) {
      const data = storeDoc.data()
      const plan = data.plan

      if (plan === 'starter' || plan === 'free') {
        continue
      }

      summary.total++

      const planEndDate = data.planEndDate
      const graceUntil = data.graceUntil
      const vendorEmail = data.vendorEmail || data.email 
      const storeName = data.storeName || 'Vendor'
      
      // Dynamic clean string (e.g., "Growth", "Pro")
      const displayPlan = capitalize(plan) 

      if (!planEndDate || !graceUntil) {
        continue
      }

      const planEndMillis = planEndDate.toMillis()
      const graceUntilMillis = graceUntil.toMillis()

      // CASE 1: Active and safe
      if (nowMillis < (planEndMillis - THREE_DAYS)) {
        batch.update(storeDoc.ref, { planStatus: 'active' })
        summary.active++
      } 
      
      // CASE 2: Expiring in 3 Days
      else if (nowMillis >= (planEndMillis - THREE_DAYS) && nowMillis < planEndMillis) {
        batch.update(storeDoc.ref, { planStatus: 'active' })
        summary.warning++

        // 👉 [OPTIONAL] TRIGGER PUSH NOTIFICATION HERE IF YOU WANT IT
        // await db.collection('notifications').add({ userId: storeDoc.id, message: "Your plan expires in 3 days!" })

        if (vendorEmail) {
          try {
            await sendEmail(
              vendorEmail,
              `⏰ Notice: Your Sellapage ${displayPlan} Plan Expires in 3 Days`,
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #ea580c;">Subscription Expiring Soon! ⏰</h2>
                  <p>Hello ${storeName},</p>
                  <p>This is a quick reminder that your <strong>${displayPlan} plan</strong> subscription will expire in <strong>3 days</strong> on ${planEndDate.toDate().toDateString()}.</p>
                  <p>Keep your advanced catalog features, layout settings, and ordering flows running smoothly by renewing your plan early.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Renew Now</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
                </div>
              `,
            )
          } catch (emailErr) {
            console.error(`❌ Failed to send warning email to ${vendorEmail}:`, emailErr.message)
          }
        }
      }
      
      // CASE 3: Inside 2-Day Grace Period
      else if (nowMillis >= planEndMillis && nowMillis < graceUntilMillis) {
        batch.update(storeDoc.ref, { planStatus: 'grace' })
        summary.grace++

        if (vendorEmail) {
          try {
            await sendEmail(
              vendorEmail,
              '⚠️ Action Required: Your Sellapage Subscription Has Expired',
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #dc2626;">Your plan has expired! ⚠️</h2>
                  <p>Hello ${storeName},</p>
                  <p>Your subscription plan has reached its end date. Don't worry, your <strong>${displayPlan} plan features</strong> are still active under our <strong>2-day grace period</strong>.</p>
                  <p>To avoid service interruptions or catalog downgrades, please renew your plan as soon as possible.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Renew Subscription</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">Thank you for growing with Sellapage!</p>
                </div>
              `,
            )
          } catch (emailErr) {
            console.error(`❌ Failed to send grace email to ${vendorEmail}:`, emailErr.message)
          }
        }
      } 
      
      // CASE 4: Fully Downgraded
      else {
        batch.update(storeDoc.ref, STARTER_RESET)
        summary.expired++

        if (vendorEmail) {
          try {
            await sendEmail(
              vendorEmail,
              '📉 Notice: Your Sellapage Plan Has Been Downgraded',
              `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #4b5563;">Account Downgraded to Starter Plan 📉</h2>
                  <p>Hello ${storeName},</p>
                  <p>Your subscription grace period has ended, and your account has been shifted to the free <strong>Starter Plan</strong>.</p>
                  <p>Your product allocation and premium tools have been adjusted to match starter limitations. Any products above your tier limits have been hidden but are safely saved.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Upgrade Account Instantly</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
                </div>
              `,
            )
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
    return res.status(500).json({ error: 'Internal server error' })
  }
}