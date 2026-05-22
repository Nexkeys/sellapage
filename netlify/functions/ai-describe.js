import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DAILY_LIMITS = {
  growth: 20,
  pro: 50,
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

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { storeId, productName, category, price } = body

  if (!storeId) {
    return jsonResponse(400, { error: 'Store ID is required' })
  }

  if (!productName || !String(productName).trim()) {
    return jsonResponse(400, { error: 'Product name is required' })
  }

  let usageRef
  let usageReserved = false

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY')
    }

    const { db, adminAuth } = getAdminServices()

    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!idToken) {
      return jsonResponse(401, { error: 'Please sign in again to generate descriptions.' })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    if (decodedToken.uid !== storeId) {
      return jsonResponse(403, { error: 'You can only generate descriptions for your own store.' })
    }

    const storeRef = db.collection('stores').doc(storeId)
    const storeDoc = await storeRef.get()

    if (!storeDoc.exists) {
      return jsonResponse(404, { error: 'Store not found' })
    }

    const store = storeDoc.data()
    const plan = store.plan || 'starter'
    const limit = DAILY_LIMITS[plan] || 0
    const now = Date.now()

    if (limit <= 0) {
      return jsonResponse(403, { error: 'AI descriptions are available on Growth and Pro plans.' })
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
        return jsonResponse(429, {
          error: `AI is cooling down. Please wait ${usage.retryAfter} seconds and try again.`,
          retryAfter: usage.retryAfter,
        })
      }

      if (usage.reason === 'global-cooldown') {
        return jsonResponse(429, {
          error: `Please wait ${usage.retryAfter} seconds before generating another description.`,
          retryAfter: usage.retryAfter,
        })
      }

      if (usage.reason === 'cooldown') {
        return jsonResponse(429, {
          error: `Please wait ${usage.retryAfter} seconds before generating another description.`,
          limit: usage.limit,
          used: usage.used,
          retryAfter: usage.retryAfter,
        })
      }

      return jsonResponse(429, {
        error: `You've used all ${usage.limit} AI descriptions for today. Try again tomorrow.`,
        limit: usage.limit,
        used: usage.used,
      })
    }

    usageReserved = true

    const prompt = [
      'You are a product copywriter for Nigerian small business sellers. Write one short, cool, attractive product description line for the following item. Keep it simple and natural, maximum 12 words. Use plain friendly English. Do not exaggerate, do not sound robotic, and do not make it long. Do not include the price. Do not use bullet points. Write only one flowing sentence fragment or sentence.',
      '',
      `Product name: ${String(productName).trim()}`,
      category ? `Category: ${String(category).trim()}` : null,
      price !== undefined && price !== null && String(price).trim() ? `Price: NGN ${String(price).trim()}` : null,
      '',
      'Write only the description. No preamble, no label, no quotation marks.',
    ].filter(line => line !== null).join('\n')

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 40,
          temperature: 0.5,
        },
      }),
    })

    const data = await geminiResponse.json()

    if (!geminiResponse.ok) {
      console.error('Gemini API error', data)
      if (geminiResponse.status === 429) {
        const retryMatch = data.error?.message?.match(/retry in ([\d.]+)s/i)
        const retryAfter = retryMatch ? Math.ceil(Number(retryMatch[1])) : 15

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

        return jsonResponse(429, {
          error: `AI is a little busy. Please wait ${retryAfter} seconds and try again.`,
          retryAfter,
        })
      }
      throw new Error('Gemini API request failed')
    }

    const description = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim()

    if (!description) {
      throw new Error('Gemini API returned no description')
    }

    return jsonResponse(200, {
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

    return jsonResponse(500, { error: 'Failed to generate description. Please try again.' })
  }
}
