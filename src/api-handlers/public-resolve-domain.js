import { getAdminDb } from './_lib/firebase-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { domain } = req.body

  if (!domain) {
    return res.status(400).json({ error: 'Missing required field: domain' })
  }

  const cleanDomain = domain.trim().toLowerCase()

  try {
    const db = getAdminDb()

    const existingQuery = await db
      .collection('stores')
      .where('customDomain', '==', cleanDomain)
      .limit(1)
      .get()

    if (existingQuery.empty) {
      return res.status(404).json({
        error: 'not_found',
        message: 'No store is connected to this domain.',
      })
    }

    const storeDoc = existingQuery.docs[0]
    const storeData = storeDoc.data()

    return res.status(200).json({
      success: true,
      storeName: storeData.storeName,
      storeId: storeDoc.id,
    })
  } catch (err) {
    console.error('[public-resolve-domain] Error:', err)
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong resolving this domain.',
    })
  }
}
