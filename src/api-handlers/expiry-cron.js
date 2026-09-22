import crypto from 'crypto'
import { setStoreCardsFrozen } from './_lib/loyalty.js'

// Constant-time secret comparison - a plain !== leaks how many leading bytes of
// a guess were correct.
function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

//src/api-handlers/expiry-cron.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { sendEmail } from './_lib/send-email.js'
import { notifyStore } from './_lib/notifications.js'
import { endTrial } from './_lib/trials.js'

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

const TRIAL_DAY_MS = 24 * 60 * 60 * 1000

function trialEmailShell(heading, headingColour, storeName, bodyHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
      <h2 style="color: ${headingColour};">${heading}</h2>
      <p>Hello ${storeName},</p>
      ${bodyHtml}
      <div style="margin: 25px 0;">
        <a href="https://sellapage.com.ng/dashboard/billing" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; display: inline-block;">Choose a plan</a>
      </div>
      <p style="font-size: 13px; color: #666666;">The Sellapage Team</p>
    </div>
  `
}

/**
 * One day's work for one store on a free trial.
 *
 * Trials get NO grace period and exactly three messages: five days before the
 * end, one day before, and one when it has actually ended. The two warnings are
 * latched on the trial document so a vendor is never told twice, which matters
 * because this cron runs daily and a 5-day warning would otherwise be sent on
 * day 5, 4, 3 and so on if the window were treated as a range.
 *
 * Writes go straight through (not via the shared batch) because endTrial needs
 * to read the trial's snapshot and restore a whole plan, which is more than a
 * field update.
 */
async function runTrialDay(storeDoc, data) {
  const trial = data.trial || {}
  const storeId = storeDoc.id
  const storeName = data.storeName || 'Vendor'
  const vendorEmail = data.vendorEmail || data.email
  const displayPlan = capitalize(trial.plan || data.plan || '')
  const endsMs = trial.endsAt?.toMillis?.() || 0
  if (!endsMs) return

  const msLeft = endsMs - Date.now()

  // ENDED. Hand back whatever they were on before the trial, which is Starter
  // only if they had nothing paid to return to.
  if (msLeft <= 0) {
    const result = await endTrial(db, storeId, { reason: 'expired' })
    if (!result.ok) return

    const back = result.landedOn === 'starter'
      ? 'Your store is now on the free Starter plan.'
      : `Your store is back on your ${capitalize(result.landedOn)} plan.`

    // plan_downgraded, not a new trial-only type: the app routes and iconifies
    // on data.type, and a value it has never heard of would land a tap nowhere
    // and fall off the 'money' notification channel onto 'default'. `trial`
    // rides along so the app CAN tell the two apart later without a new type.
    await notifyStore(db, storeId, {
      type: 'plan_downgraded',
      title: 'Your free trial has ended',
      body: `Your ${displayPlan} trial is over. ${back}`,
      data: { plan: displayPlan, landedOn: result.landedOn, trial: true },
    })

    if (vendorEmail) {
      try {
        await sendEmail(
          vendorEmail,
          `Your Sellapage ${displayPlan} free trial has ended`,
          trialEmailShell('Your free trial has ended', '#dc2626', storeName, `
            <p>Your <strong>${displayPlan} trial</strong> has finished. ${back}</p>
            <p>Everything you added during the trial is safe. Pick up a plan whenever you are ready and it all comes straight back.</p>
          `),
        )
      } catch (emailErr) {
        console.error(`Trial ended email failed for ${vendorEmail}:`, emailErr.message)
      }
    }
    return
  }

  const daysLeft = Math.ceil(msLeft / TRIAL_DAY_MS)

  // ONE DAY LEFT. Checked before the five-day case so a short trial that was
  // never warned at five days still gets this one.
  if (daysLeft <= 1 && !trial.remindedOne) {
    await storeDoc.ref.update({ 'trial.remindedOne': true })

    await notifyStore(db, storeId, {
      type: 'plan_expiring',
      title: 'Your free trial ends tomorrow',
      body: `Your ${displayPlan} trial ends tomorrow. Pick a plan to keep these features.`,
      data: { plan: displayPlan, daysLeft: 1, trial: true },
    })

    if (vendorEmail) {
      try {
        await sendEmail(
          vendorEmail,
          `Last day: your Sellapage ${displayPlan} trial ends tomorrow`,
          trialEmailShell('Your trial ends tomorrow', '#ea580c', storeName, `
            <p>Your free <strong>${displayPlan} trial</strong> ends tomorrow.</p>
            <p>Choose a plan today and nothing changes for your store or your customers.</p>
          `),
        )
      } catch (emailErr) {
        console.error(`Trial 1-day email failed for ${vendorEmail}:`, emailErr.message)
      }
    }
    return
  }

  // FIVE DAYS LEFT.
  if (daysLeft <= 5 && !trial.remindedFive) {
    await storeDoc.ref.update({ 'trial.remindedFive': true })

    await notifyStore(db, storeId, {
      type: 'plan_expiring',
      title: `Your free trial ends in ${daysLeft} days`,
      body: `Your ${displayPlan} trial ends on ${new Date(endsMs).toDateString()}.`,
      data: { plan: displayPlan, daysLeft, trial: true },
    })

    if (vendorEmail) {
      try {
        await sendEmail(
          vendorEmail,
          `Your Sellapage ${displayPlan} trial ends in ${daysLeft} days`,
          trialEmailShell(`${daysLeft} days left on your free trial`, '#ea580c', storeName, `
            <p>Your free <strong>${displayPlan} trial</strong> ends on ${new Date(endsMs).toDateString()}.</p>
            <p>If it is working for you, pick a plan before then and your store carries on exactly as it is.</p>
          `),
        )
      } catch (emailErr) {
        console.error(`Trial 5-day email failed for ${vendorEmail}:`, emailErr.message)
      }
    }
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed')
    }

    const cronSecret = req.headers['x-cron-secret']
    if (!timingSafeMatch(cronSecret, process.env.CRON_SECRET)) {
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

    const summary = { active: 0, warning: 0, grace: 0, expired: 0, total: 0, trialActive: 0, trialWarned: 0, trialEnded: 0 }
    const batch = db.batch()

    for (const storeDoc of storesSnap.docs) {
      const data = storeDoc.data()
      const plan = data.plan

      // TRIALS FIRST, and they never fall through to the paid logic below.
      // A trial carries graceUntil equal to its end date (see _lib/trials.js),
      // so the paid branch would treat the last day as a grace period and then
      // reset the vendor to Starter, wiping the plan they are owed back.
      if (data.trial?.status === 'active') {
        summary.trialActive++
        await runTrialDay(storeDoc, data)
        continue
      }

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

        // The TODO that used to sit here is now real. Ungated deliberately: a
        // vendor must always be told their own plan is ending, and the whole
        // point of the message is that they are about to lose the paid tier
        // any gate would have tested for.
        await notifyStore(db, storeDoc.id, {
          type: 'plan_expiring',
          title: 'Your plan expires in 3 days ⏰',
          body: `Your ${displayPlan} plan ends on ${planEndDate.toDate().toDateString()}. Renew to keep your paid features.`,
          data: { plan: displayPlan, planEndDate: planEndDate.toDate().toISOString() },
        })

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

        // Sent BEFORE the batch commits the downgrade, but notifyStore reads
        // the plan itself and this type is ungated, so the ordering does not
        // matter. Ungated is correct here for the obvious reason: the vendor is
        // being moved to Starter, and a gate would silence the one message
        // explaining why their features just disappeared.
        await notifyStore(db, storeDoc.id, {
          // Its own type, not plan_expiring. The app routes and iconifies on
          // data.type alone, and a "3 days left" warning and a "you are now on
          // Starter" notice are different events that must be distinguishable
          // without inspecting the payload.
          type: 'plan_downgraded',
          title: 'Your plan has expired',
          body: `Your ${displayPlan} plan has ended and your store is back on Starter. Renew any time to restore your features.`,
          data: { plan: 'starter', previousPlan: displayPlan },
        })

        // Loyalty cards are frozen rather than deleted: the customer did nothing
        // wrong, so their balance is preserved and returns intact if the vendor
        // resubscribes. Frozen means cannot earn, cannot spend.
        // Only runs for stores that actually had loyalty on, since this is a per
        // store fan out and writes are the scarcer resource on the free tier.
        if (data.loyaltyEnabled === true) {
          try {
            await setStoreCardsFrozen(db, storeDoc.id, true)
          } catch (freezeErr) {
            console.error(`Failed to freeze loyalty cards for ${storeDoc.id}:`, freezeErr.message)
          }
        }

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