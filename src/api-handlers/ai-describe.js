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

// NVIDIA NIM models, tried in order. This stays on NVIDIA deliberately -
// OpenRouter (_lib/openrouter.js) is Sella AI's provider, this endpoint is
// NVIDIA's, and the two are kept separate on purpose.
//
// WHY A LIST AND NOT ONE ID: 'meta/llama-3.1-8b-instruct' was hardcoded here
// and NVIDIA retired it on 2026-08-26T09:00:00Z. Every vendor's "Generate with
// AI" button returned the provider's own end-of-life sentence from that day
// until this fix. One id with no fallback is a single point of failure with a
// retirement date attached, so there is a second model behind the first now.
//
// ORDER IS FROM MEASUREMENT, not preference. Each was called with the real
// production prompt against ten live Nigerian listings:
//
//   nemotron-3-super-120b-a12b    10/10 answered, avg 1147ms, max 1594ms, best copy
//   llama-3.2-11b-vision-instruct 10/10 answered, avg 4003ms, max 10234ms
//   deepseek-v4-flash-0731         6/10 answered, avg 823ms when warm
//
// deepseek is fastest when it answers but is LAST on purpose: its failure mode
// is a silent hang until the timeout, whereas nemotron refuses in under a
// second with a 503. A model that fails fast belongs in front of one that fails
// slow, otherwise a bad minute costs the vendor twenty seconds of spinner.
// llama-3.2-11b sits in the middle as the one that never failed a single call.
//
// Models that were tested and REJECTED, so nobody re-adds them:
//   nemotron-3-ultra-550b-a55b   503 overloaded on every attempt, 25s
//   moonshotai/kimi-k3           hard 429 rate limit, 7/8 calls refused
//   meta/muse-glimmer-30b        returns empty content even with thinking off
//   google/gemma-4-31b-it        timed out at 30s and 60s
//   ising-calibration-1.5-31b    11s and writes generic marketing copy
//   nemotron-3.5-lightning-30b   echoes the prompt back instead of answering
//
// Verified callable on this account by scripts/check-ai-models.js, which pings
// these ids at prebuild so the next retirement fails the DEPLOY, not the vendor.
export const NVIDIA_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'meta/llama-3.2-11b-vision-instruct',
  'deepseek-ai/deepseek-v4-flash-0731',
]

// Worth moving to the next model. A 404 is the retired/renamed-id signature,
// 503 is the overload NVIDIA returns under load, 429 is rate limiting.
const NVIDIA_RETRYABLE = new Set([404, 408, 409, 429, 500, 502, 503, 504])

// Per-attempt ceiling, plus a hard budget for the whole chain. Three attempts
// at a flat 20s would be 60s, exactly the function's maxDuration in vercel.json,
// so a slow chain would be killed mid-flight and the vendor would get a blank
// gateway error instead of a message. The loop below spends whichever is
// smaller, so the last model always gets a real chance and the handler always
// returns something it chose to return.
const NVIDIA_TIMEOUT_MS = 15000
const NVIDIA_TOTAL_BUDGET_MS = 42000

// Deterministic cleanup applied to every generation before it reaches the
// vendor. The prompt ASKS for these rules; this ENFORCES them. A prompt is a
// request a model may ignore, and this text is saved straight onto a public
// storefront, so the guarantee has to live in code.
//
// The dash rules are the point. Em dash (U+2014), en dash (U+2013), figure dash,
// horizontal bar and the Unicode minus all get replaced with a comma, which is
// what the sentence wanted anyway. Ordinary hyphens in real compound words
// ("18-inch", "shock-proof") are deliberately left alone.
export function sanitizeOutput(raw, itemName = '') {
  let out = String(raw || '').trim()

  // Some models wrap the answer in a fence or restate the item as a label:
  // "Ankara Gown: Bright cotton fabric, ..." was observed in live testing.
  out = out.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '')
  out = out.replace(/^(description|answer|output|line|item)\s*:\s*/i, '')
  const name = String(itemName || '').trim()
  if (name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`^${escaped}\\s*:\\s*`, 'i'), '')
  }

  // Markdown emphasis, which renders as literal asterisks on a storefront.
  out = out.replace(/\*\*|__|\*/g, '')

  // The dash rule, enforced rather than requested.
  out = out.replace(/\s*[‒–—―−]\s*/g, ', ')

  // Wrapping quotes, straight or curly, which models add despite being told not to.
  out = out.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')

  // Whitespace is collapsed WITHOUT flattening newlines: job mode returns 2-4
  // paragraphs and a blanket \s+ would run them into one wall of text.
  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +([,.;:])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim()
}

// The banned-word list is the whole reason this reads like a person now.
// The previous prompt asked for copy that was "cool" and "attractive",
// which is an instruction to write advertising, and every model obliged
// with "Elevate your style with this stunning, timeless gown, perfect for
// any occasion." Asking instead for something CONCRETE and naming the
// cliches as forbidden took measured slop from frequent to zero in ten of
// ten live generations.
//
// The worked examples are deliberately odd items (a charcoal grill stand,
// car AC regassing) rather than common ones. An earlier draft used Ankara
// gowns and jollof rice as examples and the models handed those exact
// sentences back verbatim whenever a vendor listed something similar,
// which across a thousand vendors means many identical storefronts.
const STYLE_RULES = [
  '- Plain everyday English, the way a real shop owner talks to a customer. Not advertising language.',
  '- Never use an em dash or en dash. Use a comma instead.',
  '- No exclamation marks, no quotation marks, no emoji, no markdown, no labels, no preamble.',
  '- Never use these words or anything like them: elevate, unleash, embrace, discover, indulge, seamless, effortless, flawless, crafted, curated, premium quality, top-notch, must-have, perfect for, ideal for, timeless, versatile, stunning, gorgeous, luxurious, transform, unlock, next level, whether you, look no further.',
]

export function buildJobPrompt({ jobTitle, notes }) {
  return [
      'You write job posts for Nigerian small business employers. Turn the rough notes below into a finished job description of 2 to 4 short paragraphs.',
      '',
      'Rules:',
      '- Cover what the work actually involves day to day, and what the employer expects from the person.',
      '- Use only facts from the notes. Never invent a salary, a benefit or a requirement that is not there.',
      ...STYLE_RULES,
      '- Plain paragraphs only. No bullet points, no headings.',
    '- Separate each paragraph with a blank line. Do not return one long block of text.',
      '',
      `Job title: ${String(jobTitle).trim()}`,
      `Employer's rough notes: ${String(notes).trim()}`,
      '',
      'Write only the finished job description.',
    ].join('\n')
}

export function buildDescriptionPrompt({ productName, category }) {
  return [
      'You write one-line descriptions for Nigerian small business sellers and service providers.',
      '',
      'Write ONE line describing the item below.',
      '',
      'Rules:',
      '- Between 6 and 14 words. One line only.',
      '- Say something concrete about it: what it is, what it is made of, or when someone would use it.',
      '- Never mention the price.',
      ...STYLE_RULES,
      '- Do not copy the examples. They only show the tone.',
      '',
      'Examples of the right tone:',
      'Charcoal Grill Stand: Heavy iron stand that sits steady over hot coals and folds flat after use.',
      'Car AC Regassing: We flush the old gas, check for leaks, then refill so the cabin cools fast.',
      'Bucket Water Filter: Clips onto your bucket and traps sand and dirt before the water pours out.',
      'Beginner Piano Lessons: One hour at your home, from reading notes to playing simple songs.',
      '',
      'Wrong tone, never write anything like this:',
      'Elevate your style with this stunning, timeless piece, perfect for any occasion.',
      'Experience the seamless journey with our premium quality product.',
      '',
      `Item: ${String(productName).trim()}`,
      category ? `Category: ${String(category).trim()}` : null,
      '',
      'Write only the line.',
    ].filter(line => line !== null).join('\n')
}

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
        ? buildJobPrompt({ jobTitle, notes })
        : buildDescriptionPrompt({ productName, category })

      let aiResponse = null
      let answeredBy = null
      const chainStartedAt = Date.now()

      for (const model of NVIDIA_MODELS) {
        // Spend whichever is smaller: this attempt's ceiling, or whatever is
        // left of the whole chain's budget. A model reached with almost no time
        // left is skipped rather than started and aborted a moment later.
        const remaining = NVIDIA_TOTAL_BUDGET_MS - (Date.now() - chainStartedAt)
        if (remaining < 2000) {
          console.error(`[ai-describe] budget exhausted before ${model}`)
          break
        }

        try {
          aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              // 60 rather than 40: nemotron writes slightly fuller lines than
              // the retired 8B did, and 40 clipped them mid-sentence.
              max_tokens: isJobMode ? 350 : 60,
              // 0.8 for descriptions, up from 0.5. Two vendors listing the same
              // common item must not get the same sentence, and at 0.5 the
              // wording repeated. Measured at 0.8: four distinct lines out of
              // five generations for an identical input.
              temperature: isJobMode ? 0.6 : 0.8,
              // MANDATORY for the nemotron models. They are reasoning models:
              // without this they stream their chain of thought into
              // message.content and the vendor's description box fills up with
              // "We need a short description line for a pencil, max 12 words...".
              // Harmless on models that don't reason, so it is sent to all.
              chat_template_kwargs: { thinking: false },
              messages: [
                { role: 'user', content: prompt }
              ],
            }),
            signal: AbortSignal.timeout(Math.min(NVIDIA_TIMEOUT_MS, remaining)),
          })
        } catch (fetchErr) {
          // Timeout or transport failure. Not fatal on its own - the next model
          // may well answer, and only an empty aiResponse after the whole loop
          // is a real outage.
          console.error(`[ai-describe] ${model} unreachable:`, fetchErr?.name || fetchErr?.message)
          aiResponse = null
          continue
        }

        if (aiResponse.ok) {
          answeredBy = model
          break
        }

        if (!NVIDIA_RETRYABLE.has(aiResponse.status)) break

        // The body is deliberately NOT read here - the handler below needs it
        // intact to build the error response for the final failure.
        console.error(`[ai-describe] ${model} -> ${aiResponse.status}, trying next model`)
      }

      if (!aiResponse) {
        throw new Error('NVIDIA API unreachable for every configured model')
      }

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
            // Non-JSON error body (HTML or text) - fall back to default retryAfter
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

        // Non-429 error - include short snippet for debugging in logs, but return specific provider error to frontend
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

        // The provider's own wording is for the Vercel log, never for the
        // vendor. A boutique owner was being shown "the model
        // 'meta/llama-3.1-8b-instruct' has reached its end of life", which
        // tells them nothing, names our vendor stack, and reads like the app
        // is broken rather than the feature being briefly unavailable.
        console.error(`[ai-describe] all models failed (${aiResponse.status}): ${errorDetail}`)

        return res.status(aiResponse.status).json({
          error: 'AI is unavailable right now. Please try again in a moment, or write the description yourself.',
          isProviderError: true
        })
      }

      // Only parse JSON when response is OK
      const aiData = await aiResponse.json()
      const description = sanitizeOutput(
        aiData.choices?.[0]?.message?.content,
        isJobMode ? '' : productName,
      )

      // An empty body after sanitising is a real failure, not a description.
      // Some models return a 200 with nothing in `content` (muse-glimmer does
      // exactly this), and without the check the vendor's box would be wiped.
      if (!description) {
        throw new Error(`NVIDIA API returned no description (model: ${answeredBy})`)
      }

      console.log(`[ai-describe] ${answeredBy} answered in ${Date.now() - chainStartedAt}ms`)

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
