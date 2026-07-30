import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'

const DEFAULT_SETTINGS = {
  defaultTemplateId: 'template-1',
  defaultPrimaryColor: '#22c55e',
  defaultSecondaryColor: '#0f172a',
  defaultFontFamily: 'Helvetica',
  defaultStampType: null,
  defaultStampUrl: null,
  logoUrl: null,
  qrCodeEnabled: false,
  customFieldPresets: [],
}

async function authenticate(req) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.replace('Bearer ', '').trim()
  if (!idToken) return { error: { status: 401, message: 'Unauthorized' } }

  const auth = getAdminAuth()
  let decodedToken
  try {
    decodedToken = await auth.verifyIdToken(idToken)
  } catch {
    return { error: { status: 401, message: 'Invalid or expired token' } }
  }
  return { decodedToken }
}

export default async function handler(req, res) {
  const storeId = req.method === 'GET' ? req.query.storeId : req.body?.storeId
  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId' })
  }

  const { decodedToken, error } = await authenticate(req)
  if (error) return res.status(error.status).json({ error: error.message })
  if (decodedToken.uid !== storeId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const db = getAdminDb()
  const settingsRef = db.collection('stores').doc(storeId).collection('meta').doc('receiptSettings')

  if (req.method === 'GET') {
    try {
      const snap = await settingsRef.get()
      return res.status(200).json({ settings: snap.exists ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS })
    } catch (err) {
      console.error('[receipt-settings] GET error', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { settings } = req.body
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Missing settings object' })
      }
      const payload = {}
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (key in settings) payload[key] = settings[key]
      }
      await settingsRef.set(payload, { merge: true })
      const snap = await settingsRef.get()
      return res.status(200).json({ settings: { ...DEFAULT_SETTINGS, ...snap.data() } })
    } catch (err) {
      console.error('[receipt-settings] POST error', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
