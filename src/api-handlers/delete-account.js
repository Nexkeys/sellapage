//src/api-handlers/delete-account.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { sendEmail } from './_lib/send-email.js'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  })
}

const db = getFirestore()
const auth = getAuth()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    // Validate Bearer token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Unauthorized')
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      // 2-pass retry logic for unstable network
      let attempts = 0
      const maxAttempts = 2
      while (attempts < maxAttempts) {
        try {
          decodedToken = await auth.verifyIdToken(token)
          break
        } catch (retryErr) {
          attempts++
          if (attempts >= maxAttempts) {
            throw retryErr
          }
          // Optional small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      return res.status(401).send('Unauthorized')
    }

    const uid = decodedToken.uid

    // Get store data
    const storeSnap = await db.collection('stores').doc(uid).get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const storeData = storeSnap.data()
    const businessName = storeData.businessName || 'Merchant'
    const email = storeData.email

    // Start cleanup
    const batch = db.batch()

    // Delete all products
    const productsSnap = await db.collection('stores').doc(uid).collection('products').get()
    productsSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete all services
    const servicesSnap = await db.collection('stores').doc(uid).collection('services').get()
    servicesSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete all orders
    const ordersSnap = await db.collection('stores').doc(uid).collection('orders').get()
    ordersSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete analytics
    const analyticsSnap = await db.collection('stores').doc(uid).collection('analytics').get()
    analyticsSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete store document
    batch.delete(db.collection('stores').doc(uid))

    // Commit batch
    await batch.commit()

    // Delete leads
    const leadsSnap = await db.collection('leads').where('storeId', '==', uid).get()
    const leadBatch = db.batch()
    leadsSnap.docs.forEach(doc => {
      leadBatch.delete(doc.ref)
    })
    await leadBatch.commit()

    // Delete auth user
    await auth.deleteUser(uid)

    // Send goodbye email
    if (email) {
      const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 48px 20px; text-align: center;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <span style="font-weight: 800; font-size: 20px; color: #111827;">Sellapage</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Your workspace has been closed</h2>
    <p style="font-size: 14px; line-height: 24px; color: #4b5563; margin: 0 0 16px 0;">Hi ${businessName},</p>
    <p style="font-size: 14px; line-height: 24px; color: #4b5563; margin: 0 0 24px 0;">This email confirms that your Sellapage store directory, listing data, and profile records have been completely and permanently removed as requested.</p>
    <p style="font-size: 14px; line-height: 24px; color: #4b5563; margin: 0 0 32px 0;">We are truly sorry to see you go. If our tool didn't fully solve your DM sales tracking workflow, or if there is something we could do to improve, we would value your insights. Reply directly to this email to let us know.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;"/>
    <p style="font-size: 12px; line-height: 20px; color: #9ca3af; margin: 0; text-align: center;">
      Thank you for building with us. Our doors are always open if you decide to launch a new product pipeline in the future.
    </p>
  </div>
</div>`

      await sendEmail(email, 'Your Sellapage workspace has been closed', html)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Internal server error:', err)
    return res.status(500).json({ error: 'Failed to delete account' })
  }
}
