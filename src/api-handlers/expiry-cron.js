import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend' 

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()
// Initializes Resend using the environment variable from your Vercel setup
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

    // Keep your exact custom header security check that worked in Postman
    const cronSecret = req.headers['x-cron-secret']
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).send('Unauthorized')
    }

    const storesSnap = await db
      .collection('stores')
      .where('plan', '!=', 'starter')
      .get()

    if (storesSnap.empty) {
      return res.status(200).json({ active: 0, grace: 0, expired: 0, total: 0 })
    }

    const now = Timestamp.now()
    const nowMillis = now.toMillis()

    const summary = { active: 0, grace: 0, expired: 0, total: storesSnap.size }
    const batch = db.batch()

    // Upgraded to a for...of loop to ensure all async email sends finish executing safely
    for (const storeDoc of storesSnap.docs) {
      const data = storeDoc.data()
      const planEndDate = data.planEndDate
      const graceUntil = data.graceUntil
      
      // Grabs the vendor's email address from your database
      const vendorEmail = data.vendorEmail || data.email 

      if (!planEndDate || !graceUntil) {
        continue
      }

      const planEndMillis = planEndDate.toMillis()
      const graceUntilMillis = graceUntil.toMillis()

      if (nowMillis < planEndMillis) {
        batch.update(storeDoc.ref, { planStatus: 'active' })
        summary.active++
      } 
      
      else if (nowMillis >= planEndMillis && nowMillis < graceUntilMillis) {
        batch.update(storeDoc.ref, { planStatus: 'grace' })
        summary.grace++

        // 1. Send Grace Period Notification Email
        if (vendorEmail) {
          try {
            await resend.emails.send({
              from: 'Sellapage <notifications@sellapage.com.ng>',
              to: vendorEmail,
              subject: '⚠️ Action Required: Your Sellapage Subscription Has Expired',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #dc2626;">Your plan has expired! ⚠️</h2>
                  <p>Hello ${data.storeName || 'Vendor'},</p>
                  <p>Your subscription plan has reached its end date. Don't worry, your premium features are still fully active under our <strong>2-day grace period</strong>.</p>
                  <p>To avoid any service interruptions or catalog downgrades, please renew your plan as soon as possible.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Renew Subscription</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">Thank you for growing with Sellapage!</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error(`❌ Failed to send grace email to ${vendorEmail}:`, emailErr.message);
          }
        }
      } 
      
      else {
        batch.update(storeDoc.ref, STARTER_RESET)
        summary.expired++

        // 2. Send Plan Downgraded Notification Email
        if (vendorEmail) {
          try {
            await resend.emails.send({
              from: 'Sellapage <notifications@sellapage.com.ng>',
              to: vendorEmail,
              subject: '📉 Notice: Your Sellapage Plan Has Been Downgraded',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
                  <h2 style="color: #4b5563;">Account Downgraded to Starter Plan 📉</h2>
                  <p>Hello ${data.storeName || 'Vendor'},</p>
                  <p>Your subscription grace period has ended, and your account has been automatically shifted to the free <strong>Starter Plan</strong>.</p>
                  <p>Your product allocation and premium tools have been adjusted to match starter limitations. Any products above your current tier limits have been hidden but are safely saved.</p>
                  <div style="margin: 25px 0;">
                    <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Upgrade Account Instantly</a>
                  </div>
                  <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error(`❌ Failed to send downgrade email to ${vendorEmail}:`, emailErr.message);
          }
        }
      }
    }

    // Commit all database updates to Firestore at once
    await batch.commit()
    return res.status(200).json(summary)
    
  } catch (err) {
    console.error('Internal server error:', err)
    return res.status(500).send('Internal server error')
  }
}