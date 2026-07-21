// src/api-handlers/sella-ai.js
// Sella AI — the full-context AI Business Partner (Premium only).
// Entirely self-contained: its own quota, its own chat memory, its own tool loop.
// Shares NO logic or quota with ai-describe.js.
//
// POST body: { storeId, action, ... }
//   action 'send'     -> chat turn. Returns { reply, sources?, pendingAction?, usage }
//   action 'confirm'  -> execute a vendor-confirmed write. Returns { result, ... }
//   action 'usage'    -> { used, limit, remaining }
//   action 'sessions' -> list chat sessions [{ id, title, updatedAt }]
//   action 'session'  -> { messages } for one session
//   action 'rename'   -> save a custom assistant name on the store
//   action 'delete-session'

import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { buildStoreContext } from './_lib/sella-ai-context.js'
import { webSearch, executeWriteAction, describeAction } from './_lib/sella-ai-tools.js'

const MODEL = 'meta/llama-3.3-70b-instruct' // single source of truth — swap here to change the model
const DAILY_LIMIT = 50
const MAX_HISTORY = 50 // messages persisted per session
const MAX_CONTEXT_TURNS = 16 // recent turns sent to the model
const MAX_TOOL_LOOPS = 4

const getTodayKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

// Names the model can call. Writes are intercepted (never auto-run); web_search runs inline.
const WRITE_ACTIONS = new Set([
  'add_ledger_entry', 'add_product', 'add_service', 'create_discount',
  'update_order_status', 'update_delivery_pickup', 'update_store_settings',
])

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the live web for market prices, trends, competitor info, or any general/current question the store data cannot answer.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_ledger_entry',
      description: "Log a manual sale to the vendor's Ledger. Only call when the vendor asks to record a sale.",
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string' }, itemName: { type: 'string' },
          amount: { type: 'number' }, date: { type: 'string', description: 'YYYY-MM-DD' },
          notes: { type: 'string' }, status: { type: 'string', enum: ['Paid', 'Pending', 'Partial'] },
        },
        required: ['customerName', 'itemName', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_product',
      description: 'Add a new product listing. Only when the vendor asks to add a product.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' },
          category: { type: 'string' }, stock: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_service',
      description: 'Add a new service listing. Only when the vendor asks to add a service.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' },
          category: { type: 'string' }, duration: { type: 'string' },
        },
        required: ['name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_discount',
      description: 'Create a promo code. Only when the vendor asks.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' }, type: { type: 'string', enum: ['percentage', 'flat'] },
          value: { type: 'number' }, usageLimit: { type: 'number' },
        },
        required: ['code', 'type', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_order_status',
      description: 'Change an order status. Only when the vendor asks. Use an order id from the store context.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          newStatus: { type: 'string', enum: ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'] },
        },
        required: ['orderId', 'newStatus'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_delivery_pickup',
      description: "Update the store's pickup address in Delivery. Only when the vendor asks.",
      parameters: {
        type: 'object',
        properties: { streetAddress: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_store_settings',
      description: 'Update store profile/settings fields (businessName, storeDescription, whatsapp, phone, instagram, facebook, twitter, tiktok, about, returnPolicy, shippingPolicy). Only when the vendor asks.',
      parameters: {
        type: 'object',
        properties: {
          businessName: { type: 'string' }, storeDescription: { type: 'string' }, whatsapp: { type: 'string' },
          phone: { type: 'string' }, instagram: { type: 'string' }, about: { type: 'string' },
          returnPolicy: { type: 'string' }, shippingPolicy: { type: 'string' },
        },
      },
    },
  },
]

function systemPrompt(assistantName, context) {
  return `You are ${assistantName}, an AI Business Partner built into the Sellapage dashboard for a Nigerian SME vendor. You are warm, sharp, and practical — you can speak plain English and a little Nigerian Pidgin when it fits. You are NOT a command-only bot: chat naturally, give real business advice, and do live web research when useful.

You can SEE this vendor's entire store (below) and you can TAKE ACTIONS on their behalf — but you must follow these rules exactly:
- Only perform a write action (add product/service, log ledger sale, create discount, change order status, edit delivery/settings) when the vendor clearly asks you to.
- When you decide an action is appropriate, CALL THE MATCHING TOOL. The system will pause and ask the vendor to confirm before anything is saved — so you never accidentally change their store.
- Never invent order IDs, product names, prices, or figures. Use the real data below. If you don't have something, say so or use web_search.
- Amounts are in Nigerian Naira (₦). Keep answers concise and mobile-friendly.
- For anything you cannot directly edit, tell the vendor which dashboard tab to use.

CURRENT STORE CONTEXT (live snapshot):
${JSON.stringify(context)}`
}

async function callNim(messages) {
  const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NVIDIA_AI_PARTNER_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 700,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    console.error('[sella-ai] NIM error:', resp.status, text.slice(0, 300))
    const err = new Error('AI provider error')
    err.status = resp.status
    throw err
  }
  return resp.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { storeId, action = 'send' } = body || {}
  if (!storeId) return res.status(400).json({ error: 'storeId is required' })

  try {
    const auth = getAdminAuth()
    const db = getAdminDb()

    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!idToken) return res.status(401).json({ error: 'Please sign in again.' })

    let decoded
    try {
      decoded = await auth.verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' })
    }
    if (decoded.uid !== storeId) return res.status(403).json({ error: 'Forbidden' })

    const storeRef = db.collection('stores').doc(storeId)
    const storeDoc = await storeRef.get()
    if (!storeDoc.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeDoc.data()

    const isPremium = store.hasPremiumFeatures ?? (store.plan === 'premium')
    if (!isPremium) {
      return res.status(403).json({ error: 'Sella AI is a Premium feature. Upgrade to Premium to use it.', premiumRequired: true })
    }

    const assistantName = store.sellaAiName || 'Sella AI'
    const usageRef = storeRef.collection('sellaAiUsage').doc(getTodayKey())

    // ---------- lightweight, non-consuming actions ----------
    if (action === 'usage') {
      const u = await usageRef.get()
      const used = u.exists ? (u.data().count || 0) : 0
      return res.status(200).json({ used, limit: DAILY_LIMIT, remaining: Math.max(DAILY_LIMIT - used, 0), assistantName })
    }

    if (action === 'rename') {
      const name = String(body.name || '').trim().slice(0, 40) || 'Sella AI'
      await storeRef.set({ sellaAiName: name }, { merge: true })
      return res.status(200).json({ assistantName: name })
    }

    if (action === 'sessions') {
      const snap = await storeRef.collection('sellaAiChats').orderBy('updatedAt', 'desc').limit(30).get()
      const sessions = snap.docs.map((d) => ({
        id: d.id, title: d.data().title || 'Chat', updatedAt: d.data().updatedAt || null,
      }))
      return res.status(200).json({ sessions })
    }

    if (action === 'session') {
      const sid = String(body.sessionId || '')
      const snap = await storeRef.collection('sellaAiChats').doc(sid).get()
      return res.status(200).json({ messages: snap.exists ? (snap.data().messages || []) : [] })
    }

    if (action === 'delete-session') {
      const sid = String(body.sessionId || '')
      if (sid) await storeRef.collection('sellaAiChats').doc(sid).delete()
      return res.status(200).json({ ok: true })
    }

    // ---------- confirmed write (does NOT consume a daily request) ----------
    if (action === 'confirm') {
      const pending = body.pendingAction
      if (!pending?.type) return res.status(400).json({ error: 'No action to confirm.' })
      const result = await executeWriteAction(db, storeId, pending)

      // Append the outcome to the session transcript.
      const sid = String(body.sessionId || '')
      if (sid) {
        const chatRef = storeRef.collection('sellaAiChats').doc(sid)
        await chatRef.set({
          messages: FieldValue.arrayUnion({
            role: 'assistant', content: result.message, kind: 'action-result', ok: result.ok,
            at: new Date().toISOString(),
          }),
          updatedAt: new Date().toISOString(),
        }, { merge: true })
      }
      return res.status(200).json({ result })
    }

    // ---------- main chat turn (consumes one daily request) ----------
    if (action !== 'send') return res.status(400).json({ error: 'Unknown action' })

    const userMessage = String(body.message || '').trim()
    if (!userMessage) return res.status(400).json({ error: 'Message is empty.' })
    const sessionId = String(body.sessionId || Date.now().toString())

    // Reserve quota atomically.
    const usage = await db.runTransaction(async (tx) => {
      const doc = await tx.get(usageRef)
      const count = doc.exists ? (doc.data().count || 0) : 0
      if (count >= DAILY_LIMIT) return { allowed: false, used: count }
      tx.set(usageRef, {
        count: count + 1, limit: DAILY_LIMIT, date: usageRef.id,
        lastRequestAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      return { allowed: true, used: count + 1 }
    })
    if (!usage.allowed) {
      return res.status(429).json({
        error: `You've used all ${DAILY_LIMIT} Sella AI requests for today. It resets at midnight (WAT).`,
        used: usage.used, limit: DAILY_LIMIT, remaining: 0,
      })
    }

    // Load prior transcript.
    const chatRef = storeRef.collection('sellaAiChats').doc(sessionId)
    const chatSnap = await chatRef.get()
    const history = chatSnap.exists ? (chatSnap.data().messages || []) : []

    // Build the live store context and the model message stack.
    const context = await buildStoreContext(db, storeId, store)
    const priorTurns = history
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .slice(-MAX_CONTEXT_TURNS)
      .map((m) => ({ role: m.role, content: m.content }))

    const messages = [
      { role: 'system', content: systemPrompt(assistantName, context) },
      ...priorTurns,
      { role: 'user', content: userMessage },
    ]

    // Tool loop: auto-run web_search; intercept write tools as pending confirmations.
    let reply = ''
    let sources = []
    let pendingAction = null

    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      let data
      try {
        data = await callNim(messages)
      } catch (err) {
        // Refund the reserved request on provider failure.
        await usageRef.set({ count: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        return res.status(502).json({ error: 'Sella AI is briefly unavailable. Please try again in a moment.' })
      }

      const choice = data.choices?.[0]
      const msg = choice?.message || {}
      const toolCalls = msg.tool_calls || []

      if (toolCalls.length === 0) {
        reply = (msg.content || '').trim()
        break
      }

      // A write tool -> stop and ask the vendor to confirm (never auto-execute).
      const writeCall = toolCalls.find((t) => WRITE_ACTIONS.has(t.function?.name))
      if (writeCall) {
        let args = {}
        try { args = JSON.parse(writeCall.function.arguments || '{}') } catch { /* keep {} */ }
        pendingAction = { type: writeCall.function.name, args }
        reply = (msg.content || '').trim() || `Here's what I'll do — please confirm:\n\n${describeAction(pendingAction)}`
        break
      }

      // Otherwise: run read/search tools inline and feed results back.
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls })
      for (const call of toolCalls) {
        if (call.function?.name === 'web_search') {
          let q = ''
          try { q = JSON.parse(call.function.arguments || '{}').query } catch { /* */ }
          const searchRes = await webSearch(q)
          if (searchRes.ok) sources = searchRes.results.map((r) => ({ title: r.title, url: r.url }))
          messages.push({
            role: 'tool', tool_call_id: call.id, name: 'web_search',
            content: JSON.stringify(searchRes),
          })
        } else {
          messages.push({
            role: 'tool', tool_call_id: call.id, name: call.function?.name || 'tool',
            content: JSON.stringify({ error: 'unhandled tool' }),
          })
        }
      }
    }

    if (!reply && !pendingAction) {
      reply = "I couldn't quite generate a response there — mind rephrasing?"
    }

    // Persist the turn (rolling window). Store pendingAction alongside the assistant msg
    // so the transcript records that a confirmation was offered.
    const nowIso = new Date().toISOString()
    const newMessages = [
      ...history,
      { role: 'user', content: userMessage, at: nowIso },
      { role: 'assistant', content: reply, at: nowIso, ...(pendingAction ? { pendingAction } : {}), ...(sources.length ? { sources } : {}) },
    ].slice(-MAX_HISTORY)

    const title = chatSnap.exists && chatSnap.data().title
      ? chatSnap.data().title
      : userMessage.slice(0, 42)

    await chatRef.set({
      title, messages: newMessages, updatedAt: nowIso,
      createdAt: chatSnap.exists ? (chatSnap.data().createdAt || nowIso) : nowIso,
    }, { merge: true })

    return res.status(200).json({
      reply,
      sources,
      pendingAction,
      sessionId,
      usage: { used: usage.used, limit: DAILY_LIMIT, remaining: Math.max(DAILY_LIMIT - usage.used, 0) },
    })
  } catch (err) {
    console.error('[sella-ai] handler error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
