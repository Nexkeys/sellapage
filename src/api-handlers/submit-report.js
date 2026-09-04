import { getAdminDb } from './_lib/firebase-admin.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'

const VALID_OFFENSES = ['scam', 'fake_products', 'non_delivery', 'identity_theft', 'counterfeit', 'other']
const VALID_WHERE_MET = ['whatsapp', 'instagram', 'facebook', 'twitter', 'in_person', 'phone', 'other']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Unauthenticated endpoint that writes to Firestore - without a cap it can be
  // used to flood a competitor with defamatory reports and to burn the Spark
  // plan's daily write quota, which on a free tier means a full outage.
  if (!memoryRateLimit('submit-report', clientKey(req), 3, 3600000)) {
    return tooManyRequests(res, 'Too many reports submitted. Please try again later.')
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { storeUrl, reporterName, reporterEmail, reporterPhone, whereMet, offenseType, description, screenshotUrls } = body

    if (!storeUrl?.trim()) return res.status(400).json({ error: 'Store URL or name is required.' })
    if (!reporterName?.trim()) return res.status(400).json({ error: 'Your name is required.' })
    if (!reporterEmail?.trim()) return res.status(400).json({ error: 'Your email is required.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail.trim())) return res.status(400).json({ error: 'Please provide a valid email address.' })
    if (!reporterPhone?.trim()) return res.status(400).json({ error: 'Your phone number is required.' })
    if (!VALID_WHERE_MET.includes(whereMet)) return res.status(400).json({ error: 'Please select where you met the vendor.' })
    if (!VALID_OFFENSES.includes(offenseType)) return res.status(400).json({ error: 'Please select a valid offense type.' })
    if (!description?.trim() || description.trim().length < 20) return res.status(400).json({ error: 'Please provide a detailed description (at least 20 characters).' })
    if (!Array.isArray(screenshotUrls) || screenshotUrls.length === 0) return res.status(400).json({ error: 'At least one screenshot is required.' })
    if (screenshotUrls.length > 3) return res.status(400).json({ error: 'Maximum 3 screenshots allowed.' })

    // These were stored as arbitrary strings and later rendered in the admin
    // panel. Require real https URLs so the field can't carry a javascript:
    // or data: payload into an admin's browser.
    const validUrls = screenshotUrls.every((u) => {
      if (typeof u !== 'string' || u.length > 2000) return false
      try {
        return new URL(u).protocol === 'https:'
      } catch {
        return false
      }
    })
    if (!validUrls) return res.status(400).json({ error: 'Screenshots must be valid https image URLs.' })

    const db = getAdminDb()

    const report = {
      storeUrl: storeUrl.trim(),
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim(),
      reporterPhone: reporterPhone.trim(),
      whereMet,
      offenseType,
      description: description.trim(),
      screenshotUrls: screenshotUrls.slice(0, 3),
      status: 'pending',
      adminNotes: '',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: new Date(),
    }

    const docRef = await db.collection('storeReports').add(report)

    return res.status(200).json({ success: true, reportId: docRef.id })
  } catch (err) {
    console.error('[submit-report] Error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
