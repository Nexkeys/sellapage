// src/api-handlers/export-data.js
// Download a store's own data as CSV, Excel or PDF.
//
// POST { storeId, tab, format: 'csv'|'xlsx'|'pdf', from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD', via?: 'tab'|'sella' }
//   200 -> the file itself, with Content-Disposition carrying the filename
//   400 -> { error } bad tab/format/date
//   401 -> { error } missing or expired sign-in
//   403 -> { error } no access to that tab
//
// One endpoint for both the export buttons on each tab and Sella's export
// tool, so the two can never disagree about what a "products export" contains.
// The file is generated on request and streamed back; nothing is stored, so
// there is no public link to a file full of customer phone numbers.
//
// Available on every plan: it is the vendor's own data. Authorised per tab
// through resolveStoreAccess (standing convention), so staff can only export
// tabs their role can already see.

import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { EXPORTS, EXPORT_FORMATS, buildExport, logExport } from './_lib/data-export.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  // The app reads the filename from this header.
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Rows')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const storeId = String(body.storeId || '')
  const tab = String(body.tab || '')
  const format = String(body.format || 'csv').toLowerCase()
  const from = body.from ? String(body.from) : ''
  const to = body.to ? String(body.to) : ''

  if (!storeId) return res.status(400).json({ error: 'storeId is required' })
  if (!EXPORTS[tab]) return res.status(400).json({ error: `Exports are available for: ${Object.keys(EXPORTS).join(', ')}.` })
  if (!EXPORT_FORMATS.includes(format)) return res.status(400).json({ error: 'Format must be csv, xlsx or pdf.' })
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return res.status(400).json({ error: 'Dates must be YYYY-MM-DD.' })

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!idToken) return res.status(401).json({ error: 'Please sign in again.' })

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }

    const access = await resolveStoreAccess(decoded.uid, storeId, tab, false)
    if (!access.allowed) {
      return res.status(403).json({ error: `You do not have access to ${EXPORTS[tab].label}.` })
    }

    const db = getAdminDb()
    const store = (await db.collection('stores').doc(storeId).get()).data() || {}
    const file = await buildExport(db, storeId, { tab, format, from, to, storeName: store.businessName })

    await logExport(db, {
      uid: decoded.uid, storeId, tab, format, rows: file.rows,
      via: body.via === 'sella' ? 'sella' : 'tab',
    })

    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
    res.setHeader('X-Export-Rows', String(file.rows))
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(file.buffer)
  } catch (err) {
    console.error('[export-data]', err?.message || err)
    return res.status(500).json({ error: 'Could not build that export. Please try again.' })
  }
}
