import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { sendEmail } from './_lib/send-email.js'

const PREMBLY_SECRET_KEY = process.env.PREMBLY_SECRET_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // `action=confirm` is the second step of the two-step UX: step 1 verifies
  // against Prembly and stashes the result server-side; this step promotes that
  // stashed result onto the public store doc. The write lives here rather than
  // in the client (it used to be a direct updateDoc in CACVerificationTab) so
  // that `cacVerified` can be locked in firestore.rules — otherwise any vendor
  // could award themselves the CAC Verified badge from the browser console.
  if (req.query.action === 'confirm') {
    return confirmVerification(req, res, idToken)
  }

  const { storeId, rcNumber } = req.body

  if (!storeId || !rcNumber) {
    return res.status(400).json({
      error: 'missing_fields',
      message: 'Please enter your RC or BN number.',
    })
  }

  const prefixMatch = rcNumber.trim().match(/^(RC|BN|IT|LP|LLP)/i)
  const companyType = prefixMatch ? prefixMatch[1].toUpperCase() : 'RC'
  const cleanRC = rcNumber.trim().replace(/^(RC|BN|IT|LP|LLP)/i, '')

  if (!cleanRC || !/^\d+$/.test(cleanRC)) {
    return res.status(400).json({
      error: 'invalid_rc',
      message: 'Please enter a valid RC or BN number — numbers only, e.g. RC1234567 or BN1234567.',
    })
  }

  try {
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

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeSnap.data() || {}
    const retryCount = storeData.cacRetryCount || 0

    if (retryCount >= 3) {
      return res.status(403).json({
        error: 'retries_exhausted',
        message: 'You have used all 3 verification attempts. Please contact support to verify your business manually.',
        retriesLeft: 0,
      })
    }

    const premblyRes = await fetch(
      'https://api.prembly.com/verification/cac',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': PREMBLY_SECRET_KEY,
        },
        body: JSON.stringify({
          rc_number: cleanRC,
          company_type: companyType,
        }),
      }
    )

    const premblyData = await premblyRes.json()

    if (!premblyRes.ok || premblyData?.status === false) {
      console.error('[verify-cac] Prembly error:', premblyData)

      const errMsg = premblyData?.detail || premblyData?.message || ''
      const responseCode = premblyData?.response_code || ''
      const isPendingPayment = premblyData?.pending_payment === true

      const newRetryCount = retryCount + 1
      await db.collection('stores').doc(storeId).update({
        cacRetryCount: newRetryCount,
        cacLastRetryAt: new Date().toISOString(),
      })

      const retriesLeft = Math.max(0, 3 - newRetryCount)
      const vendorEmail = storeData.email

      let errorCode = 'verification_failed'
      let errorMsg = 'CAC verification failed. Please try again or contact support.'
      let emailSubject = 'CAC Verification Failed'
      let emailBody = `Your CAC verification for RC ${cleanRC} was unsuccessful.`

      if (isPendingPayment || responseCode === '04') {
        errorCode = 'insufficient_funds'
        errorMsg = 'Our verification system is temporarily processing your request. Please try again in a few minutes.'
        emailSubject = 'CAC Verification — System Temporarily Unavailable'
        emailBody = 'Our verification system is temporarily processing your request. No retry was deducted. Please try again in a few minutes.'
      } else if (responseCode === '06' || errMsg.toLowerCase().includes('not found')) {
        errorCode = 'rc_not_found'
        errorMsg = 'We couldn\'t find a business registered with that number. Please double-check and try again.'
        emailBody = `We couldn't find a business registered with RC ${cleanRC}. Please double-check your number.`
      } else if (responseCode === '05' || errMsg.toLowerCase().includes('invalid')) {
        errorCode = 'invalid_request'
        errorMsg = 'Invalid request. Please check your number and try again.'
        emailBody = `The RC number ${cleanRC} appears to be invalid. Please check your number.`
      }

      if (vendorEmail && errorCode !== 'insufficient_funds') {
        const failedHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#dc2626;padding:18px;color:#fff;font-weight:700;">${storeData.businessName || 'Sellapage'}</div>
            <div style="padding:20px;background:#fff;color:#111827;">
              <h2 style="margin:0 0 12px 0;">CAC Verification Failed</h2>
              <p style="margin:0 0 8px 0;">${emailBody}</p>
              <p style="margin:0 0 8px 0;color:#6b7280;">You have <strong>${retriesLeft} verification ${retriesLeft === 1 ? 'attempt' : 'attempts'}</strong> remaining.</p>
              ${retriesLeft === 0 ? '<p style="margin:12px 0 0 0;color:#dc2626;font-weight:700;">This was your final attempt. Please contact support to verify your business manually.</p>' : ''}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
              <p style="color:#9ca3af;font-size:12px;">This is an automated message from Sellapage.</p>
            </div>
          </div>
        `
        sendEmail(vendorEmail, emailSubject, failedHtml).catch(() => {})
      }

      return res.status(400).json({
        error: errorCode,
        message: errorMsg,
        retriesLeft,
      })
    }

    const cacData = premblyData?.data || {}
    const cacBusinessName = (
      cacData?.company_name ||
      ''
    ).trim()

    const cacStatus = (
      cacData?.company_status ||
      ''
    ).toLowerCase()

    const registrationDate = (
      cacData?.registrationDate ||
      ''
    )

    if (!cacBusinessName) {
      return res.status(400).json({
        error: 'no_business_name',
        message: 'CAC returned no business name for this RC number. Please contact support.',
      })
    }

    if (cacStatus && cacStatus !== 'active' && cacStatus !== 'approved') {
      return res.status(400).json({
        error: 'inactive_business',
        message: `Your business is registered but has a status of "${cacStatus}". Only active businesses can be verified.`,
        cacBusinessName,
        cacStatus,
      })
    }

    const newRetryCount = retryCount + 1
    await db.collection('stores').doc(storeId).update({
      cacRetryCount: newRetryCount,
      cacLastRetryAt: new Date().toISOString(),
    })

    // Stash the verified result server-side so `action=confirm` can promote it
    // without re-calling Prembly (which costs money and burns a retry). Lives in
    // private/* — never client-readable, never client-writable.
    await db.collection('stores').doc(storeId)
      .collection('private').doc('cacPending')
      .set({
        cacBusinessName,
        cacRcNumber: cleanRC,
        cacStatus: cacStatus || 'active',
        cacRegistrationDate: registrationDate || '',
        verifiedAt: new Date().toISOString(),
      })

    const retriesLeft = Math.max(0, 3 - newRetryCount)
    const vendorEmail = storeData.email

    if (vendorEmail) {
      const successHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#16a34a;padding:18px;color:#fff;font-weight:700;">${storeData.businessName || 'Sellapage'}</div>
          <div style="padding:20px;background:#fff;color:#111827;">
            <h2 style="margin:0 0 12px 0;">Business Verified!</h2>
            <p style="margin:0 0 8px 0;">Congratulations! <strong>${cacBusinessName}</strong> has been verified with the Corporate Affairs Commission.</p>
            <p style="margin:0 0 8px 0;">Your CAC Verified badge is now live on your storefront.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
            <p style="color:#9ca3af;font-size:12px;">This is an automated message from Sellapage.</p>
          </div>
        </div>
      `
      sendEmail(vendorEmail, 'Your Business Is Now Verified!', successHtml).catch(() => {})
    }

    return res.status(200).json({
      success: true,
      cacBusinessName,
      cacStatus: cacStatus || 'active',
      registrationDate,
      rcNumber: cleanRC,
      retriesLeft,
    })
  } catch (err) {
    console.error('[verify-cac] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong. Please try again or contact support.',
    })
  }
}

/**
 * Step 2 of CAC verification. Promotes the result stashed by the verify step
 * onto the public store document. The vendor supplies no CAC data here — the
 * only input that matters is their identity, so nothing they send can influence
 * what gets written.
 */
async function confirmVerification(req, res, idToken) {
  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const storeId = decodedToken.uid
    const pendingRef = db.collection('stores').doc(storeId).collection('private').doc('cacPending')
    const pendingSnap = await pendingRef.get()

    if (!pendingSnap.exists) {
      return res.status(400).json({
        error: 'nothing_to_confirm',
        message: 'Please verify your RC or BN number first.',
      })
    }

    const pending = pendingSnap.data()

    // Re-assert the status gate here too: the verify step already rejects
    // inactive businesses, but a stash could predate a rule change.
    if (pending.cacStatus && pending.cacStatus !== 'active' && pending.cacStatus !== 'approved') {
      return res.status(400).json({
        error: 'inactive_business',
        message: `Only active businesses can be verified (status: "${pending.cacStatus}").`,
      })
    }

    await db.collection('stores').doc(storeId).update({
      cacVerified: true,
      cacBusinessName: pending.cacBusinessName,
      cacRcNumber: pending.cacRcNumber,
      cacStatus: pending.cacStatus,
      cacRegistrationDate: pending.cacRegistrationDate || '',
      cacVerifiedAt: new Date().toISOString(),
    })

    // One-shot: consume the stash so a stale result can't be re-promoted later.
    await pendingRef.delete().catch(() => {})

    return res.status(200).json({
      success: true,
      cacVerified: true,
      cacBusinessName: pending.cacBusinessName,
    })
  } catch (err) {
    console.error('[verify-cac confirm] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Could not save your verification. Please try again.',
    })
  }
}
