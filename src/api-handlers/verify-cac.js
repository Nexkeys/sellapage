import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

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
      message: 'Please enter a valid RC or BN number — numbers only, e.g. RC1234567 or BN9537181.',
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

      if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('invalid')) {
        return res.status(404).json({
          error: 'rc_not_found',
          message: 'We could not find a business registered with that RC number. Please double-check and try again.',
        })
      }

      return res.status(400).json({
        error: 'verification_failed',
        message: 'CAC verification failed. Please check your RC number and try again.',
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

    return res.status(200).json({
      success: true,
      cacBusinessName,
      cacStatus: cacStatus || 'active',
      registrationDate,
      rcNumber: cleanRC,
    })
  } catch (err) {
    console.error('[verify-cac] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong. Please try again or contact support.',
    })
  }
}
