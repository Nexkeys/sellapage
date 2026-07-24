//sellapage/api/ai-describe.js/
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

// Bumped from {growth:20, pro:50, premium:50}: job description generations now
// share this same daily counter and cost far more tokens per call (~350 vs ~40),
// so the ceiling was raised to give vendors room for both without starving
// product/service description usage.
const DAILY_LIMITS = {
  growth: 30,
  pro: 65,
  premium: 65,
}

const GENERATION_COOLDOWN_MS = 15000
const GLOBAL_GENERATION_COOLDOWN_MS = 5000

const getTodayKey = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const getAdminServices = () => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    })
  }

  return {
    db: getFirestore(),
    adminAuth: getAuth(),
  }
}

export default async function handler(req, res) {
  try {
    // Standardize CORS headers for Vercel execution context
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const { storeId, productName, category, price, mode, jobTitle, notes } = body
    const isJobMode = mode === 'job'

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' })
    }

    if (isJobMode) {
      if (!jobTitle || !String(jobTitle).trim()) {
        return res.status(400).json({ error: 'Job title is required' })
      }
      const sentenceCount = String(notes || '').split(/[.!?]+/).filter(s => s.trim().length > 3).length
      if (!notes || sentenceCount < 10) {
        return res.status(400).json({ error: 'Please write at least 10 sentences of rough notes about the job first, then generate.' })
      }
    } else if (!productName || !String(productName).trim()) {
      return res.status(400).json({ error: 'Product name is required' })
    }

    let usageRef
    let usageReserved = false

    try {
      if (!process.env.NVIDIA_API_KEY) {
        throw new Error('Missing NVIDIA_API_KEY')
      }

      const { db, adminAuth } = getAdminServices()

      const authHeader = req.headers.authorization || req.headers.Authorization || ''
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

      if (!idToken) {
        return res.status(401).json({ error: 'Please sign in again to generate descriptions.' })
      }

      const decodedToken = await adminAuth.verifyIdToken(idToken)

      if (decodedToken.uid !== storeId) {
        return res.status(403).json({ error: 'You can only generate descriptions for your own store.' })
      }

      const storeRef = db.collection('stores').doc(storeId)
      const storeDoc = await storeRef.get()

      if (!storeDoc.exists) {
        return res.status(404).json({ error: 'Store not found' })
      }

      const store = storeDoc.data()
      const plan = store.plan || 'starter'
      const limit = DAILY_LIMITS[plan] || 0
      const now = Date.now()

      if (limit <= 0) {
        return res.status(403).json({ error: 'AI descriptions are available on Growth and Pro plans.' })
      }

      usageRef = storeRef.collection('aiUsage').doc(getTodayKey())
      const globalQuotaRef = db.collection('system').doc('aiDescribeQuota')

      const usage = await db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef)
        const globalQuotaDoc = await transaction.get(globalQuotaRef)
        const usageData = usageDoc.exists ? usageDoc.data() : {}
        const globalQuotaData = globalQuotaDoc.exists ? globalQuotaDoc.data() : {}
        const currentCount = usageData.count || 0
        const lastGeneratedAt = usageData.lastGeneratedAt?.toMillis?.() || 0
        const msSinceLastGeneration = now - lastGeneratedAt
        const globalBlockedUntil = globalQuotaData.blockedUntil?.toMillis?.() || 0
        const globalLastRequestAt = globalQuotaData.lastRequestAt?.toMillis?.() || 0
        const msSinceGlobalRequest = now - globalLastRequestAt

        if (globalBlockedUntil && now < globalBlockedUntil) {
          return {
            allowed: false,
            reason: 'global-quota',
            retryAfter: Math.ceil((globalBlockedUntil - now) / 1000),
            used: currentCount,
            limit,
          }
        }

        if (globalLastRequestAt && msSinceGlobalRequest < GLOBAL_GENERATION_COOLDOWN_MS) {
          return {
            allowed: false,
            reason: 'global-cooldown',
            retryAfter: Math.ceil((GLOBAL_GENERATION_COOLDOWN_MS - msSinceGlobalRequest) / 1000),
            used: currentCount,
            limit,
          }
        }

        if (lastGeneratedAt && msSinceLastGeneration < GENERATION_COOLDOWN_MS) {
          return {
            allowed: false,
            reason: 'cooldown',
            retryAfter: Math.ceil((GENERATION_COOLDOWN_MS - msSinceLastGeneration) / 1000),
            used: currentCount,
            limit,
          }
        }

        if (currentCount >= limit) {
          return {
            allowed: false,
            reason: 'daily-limit',
            used: currentCount,
            limit,
          }
        }

        transaction.set(usageRef, {
          count: currentCount + 1,
          limit,
          plan,
          date: usageRef.id,
          lastGeneratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        transaction.set(globalQuotaRef, {
          lastRequestAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })

        return {
          allowed: true,
          used: currentCount + 1,
          limit,
        }
      })

      if (!usage.allowed) {
        if (usage.reason === 'global-quota') {
          return res.status(429).json({
            error: `AI is cooling down. Please wait ${usage.retryAfter} seconds and try again.`,
            retryAfter: usage.retryAfter,
          })
        }

        if (usage.reason === 'global-cooldown') {
          return res.status(429).json({
            error: `Please wait ${usage.retryAfter} seconds before generating another description.`,
            retryAfter: usage.retryAfter,
          })
        }

        if (usage.reason === 'cooldown') {
          return res.status(429).json({
            error: `Please wait ${usage.retryAfter} seconds before generating another description.`,
            limit: usage.limit,
            used: usage.used,
            retryAfter: usage.retryAfter,
          })
        }

        return res.status(429).json({
          error: `You've used all ${usage.limit} AI descriptions for today. Try again tomorrow.`,
          limit: usage.limit,
          used: usage.used,
        })
      }

      usageReserved = true

      const prompt = isJobMode
        ? [
            'You are a job-post copywriter for Nigerian small business employers. Expand the rough notes below into a polished, well-structured job description for a job listing. Include what the role involves and what is expected of the candidate, written in 2-4 short paragraphs. Use plain, professional, friendly English. Do not invent a salary or pay figure. Do not use markdown formatting or bullet points — plain paragraphs only.',
            '',
            `Job title: ${String(jobTitle).trim()}`,
            `Employer's rough notes: ${String(notes).trim()}`,
            '',
            'Write only the finished job description. No preamble, no label, no quotation marks.',
          ].join('\n')
        : [
            'You are a product copywriter for Nigerian small business sellers and service providers. Write one short, cool, attractive product/service description line for the following item. Keep it simple and natural, maximum 12 words. Use plain friendly English. Do not exaggerate, do not sound robotic, and do not make it long. Do not include the price. Do not use bullet points. Write only one flowing sentence fragment or sentence.',
            '',
            `Product name: ${String(productName).trim()}`,
            category ? `Category: ${String(category).trim()}` : null,
            price !== undefined && price !== null && String(price).trim() ? `Price: NGN ${String(price).trim()}` : null,
            '',
            'Write only the description. No preamble, no label, no quotation marks.',
          ].filter(line => line !== null).join('\n')

      const aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          max_tokens: isJobMode ? 350 : 40,
          temperature: isJobMode ? 0.6 : 0.5,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      })

      if (!aiResponse.ok) {
        // Read raw body first (may be HTML or plain text when errors occur)
        const errorText = await aiResponse.text()
        console.error('NVIDIA API Error Raw Body:', errorText)

        if (aiResponse.status === 429) {
          // Try to parse a retry window defensively from JSON error body, else default
          let retryAfter = 15
          try {
            const parsed = JSON.parse(errorText)
            const msg = parsed?.error?.message || parsed?.message || ''
            const retryMatch = msg.match(/retry in ([\d.]+)s/i)
            retryAfter = retryMatch ? Math.ceil(Number(retryMatch[1])) : 15
          } catch (parseErr) {
            // Non-JSON error body (HTML or text) — fall back to default retryAfter
          }

          if (usageReserved && usageRef) {
            usageReserved = false
            try {
              await usageRef.set({
                count: FieldValue.increment(-1),
                updatedAt: FieldValue.serverTimestamp(),
              }, { merge: true })
              await globalQuotaRef.set({
                blockedUntil: Timestamp.fromMillis(Date.now() + retryAfter * 1000),
                updatedAt: FieldValue.serverTimestamp(),
              }, { merge: true })
            } catch (refundErr) {
              console.error('Failed to refund AI usage count', refundErr)
            }
          }

          return res.status(429).json({
            error: `AI is a little busy. Please wait ${retryAfter} seconds and try again.`,
            retryAfter,
          })
        }

        // Non-429 error — include short snippet for debugging in logs, but return specific provider error to frontend
        let errorDetail = 'Unknown API error'
        try {
          const parsedError = JSON.parse(errorText)
          errorDetail = parsedError.detail || parsedError.title || parsedError.error?.message || parsedError.message || errorText
        } catch (e) {
          errorDetail = String(errorText).substring(0, 100)
        }

        // Refund usage if we reserved it, since the request failed
        if (usageReserved && usageRef) {
          usageReserved = false
          try {
            await usageRef.set({
              count: FieldValue.increment(-1),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true })
          } catch (refundErr) {
            console.error('Failed to refund AI usage count', refundErr)
          }
        }

        // Return the specific NVIDIA status code to the frontend instead of throwing a 500
        return res.status(aiResponse.status).json({
          error: `AI Provider Error: ${errorDetail}`,
          isProviderError: true
        })
      }

      // Only parse JSON when response is OK
      const aiData = await aiResponse.json()
      const description = aiData.choices?.[0]?.message?.content?.trim()

      if (!description) {
        throw new Error('NVIDIA API returned no description')
      }

      return res.status(200).json({
        description,
        limit: usage.limit,
        used: usage.used,
        remaining: Math.max(usage.limit - usage.used, 0),
      })
    } catch (err) {
      console.error('AI description generation failed', err)

      if (usageReserved && usageRef) {
        try {
          await usageRef.set({
            count: FieldValue.increment(-1),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })
        } catch (refundErr) {
          console.error('Failed to refund AI usage count', refundErr)
        }
      }

      return res.status(500).json({ error: 'Failed to generate description. Please try again.' })
    }
  } catch (err) {
    console.error('Handler error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
