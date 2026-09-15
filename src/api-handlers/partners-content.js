// src/api-handlers/partners-content.js
//
// Public, unauthenticated, read only. Serves the traction figures shown on
// /partners, which the admin edits in Investors & Partners > Page traction.
//
// Cached at the edge for a minute. That keeps a traffic spike from turning into
// one Firestore read per visitor on the Spark plan, while an edit still reaches
// the live page about a minute after it is saved.

import { getAdminDb } from './_lib/firebase-admin.js'
import { DEFAULT_TRACTION, validateTraction, hasTractionErrors } from '../utils/partnersContent.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const snap = await getAdminDb().collection('platformSettings').doc('partnersPage').get()
    let traction = DEFAULT_TRACTION

    if (snap.exists && snap.data()?.traction) {
      // Saved data was validated on the way in. Re-checked on the way out so
      // a hand-edited document in the console can never break the page.
      const { value, errors } = validateTraction(snap.data().traction)
      if (hasTractionErrors(errors)) {
        console.warn('[partners-content] saved traction failed validation, serving defaults', errors)
      } else {
        traction = value
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ success: true, traction })
  } catch (err) {
    console.error('[partners-content] error', err)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: 'server_error' })
  }
}
