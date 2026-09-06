// src/api-handlers/_lib/openrouter.js
// Sella AI's model layer. See Docs/Sella-AI-Rework-Plan.md Part B.
//
// WHY: Sella previously spoke to a single NVIDIA NIM endpoint, so any provider
// outage took the whole assistant down with a 502. OpenRouter is
// OpenAI-API-compatible, so this is a base-URL + model-id change rather than a
// rewrite, and it lets one request fall through several providers.
//
// NVIDIA is NOT removed from the codebase — ai-describe.js still uses it for
// product/service/job descriptions. This module governs Sella only.
//
// FAILOVER is silent and per-request: on a 5xx, timeout or rate-limit we try
// the next model in the tier. The vendor sees an answer, not an error. Only
// when every model in a tier fails does the caller get a clean error, so quota
// can be refunded exactly as before.
//
// IDs below were read from OpenRouter's live /api/v1/models catalogue (431
// models) and each confirmed to support `tools` — tool calling is the whole
// point of Sella, and not every model offers it. They still drift, which is
// what assertModelsExist() is for.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODELS_URL = 'https://openrouter.ai/api/v1/models'

// Ordered by preference. Position 0 is tried first; the rest are fallbacks.
export const TIERS = {
  // Greetings, simple lookups, formatting.
  fast: [
    'deepseek/deepseek-v4-flash',
    'qwen/qwen3.7-flash',
    'openai/gpt-5-nano',
  ],
  // The common path: normal chat that may call tools.
  standard: [
    'google/gemini-2.5-flash',
    'openai/gpt-5-mini',
    'moonshotai/kimi-k2.5',
  ],
  // Multi-step reasoning, analysis, and anything touching money or a write
  // decision — worth paying more to get right.
  heavy: [
    'anthropic/claude-sonnet-5',
    'openai/gpt-5',
    'google/gemini-2.5-pro',
  ],
}

// A tier that exhausts itself drops down to this one rather than failing
// outright. 'fast' has nowhere to fall, which is fine — it handles trivia.
const TIER_FALLBACK = { heavy: 'standard', standard: 'fast', fast: null }

export const DEFAULT_TIER = 'standard'

function apiKey() {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPEN_ROUTER_API_KEY is not configured')
  return key
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey()}`,
    // OpenRouter attribution - shows up on their dashboard and helps rate limits.
    // ASCII ONLY: HTTP headers are ByteString (latin-1). A non-ASCII character
    // here (an em-dash cost us exactly this) makes fetch throw a TypeError
    // BEFORE the request leaves the process, so every model in every tier
    // "fails" and failover cannot save it - it looks like a total provider
    // outage when the bug is entirely local.
    'HTTP-Referer': process.env.APP_URL || 'https://www.sellapage.com.ng',
    'X-Title': 'Sellapage Sella AI',
  }
}

/**
 * Whether to advance to the next model in the tier.
 *
 * 400 and 404 are included deliberately. OpenRouter answers **400** for an
 * unknown or currently-unavailable model id, and that is precisely the case
 * failover exists for - a retired or renamed id must fall through to the next
 * provider, not hard-fail the assistant. Excluding 400 (the intuitive choice)
 * meant a single stale id took Sella down completely, which a live test caught.
 *
 * The trade-off: a genuinely malformed request now retries across the tier
 * before surfacing. That costs a little latency in a case we would catch in
 * testing anyway, and buys resilience against a stale id, which is a silent
 * production surprise. Worth it.
 */
function isRetryable(status) {
  return status === 400 || status === 404 || status === 408 ||
         status === 409 || status === 429 || status >= 500
}

/**
 * Resolves a tier name to its ordered model list, appending the fallback
 * tier's models so a total outage of three providers still has somewhere to go.
 */
export function modelsForTier(tier) {
  const primary = TIERS[tier] || TIERS[DEFAULT_TIER]
  const next = TIER_FALLBACK[tier]
  return next ? [...primary, ...TIERS[next]] : [...primary]
}

/**
 * Non-streaming completion with failover. Mirrors the old callNim() contract:
 * resolves to the raw OpenAI-shaped JSON, or throws an Error carrying .status.
 *
 * @returns {Promise<object>} completion JSON, with `_model` noting who answered
 */
export async function callModel({ messages, tools, tier = DEFAULT_TIER, maxTokens = 500, temperature = 0.6, timeoutMs = 28000 }) {
  const models = modelsForTier(tier)
  let lastErr = null

  for (const model of models) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
        }),
        signal: controller.signal,
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error(`[openrouter] ${model} -> ${resp.status}: ${text.slice(0, 200)}`)
        if (isRetryable(resp.status)) {
          lastErr = Object.assign(new Error('AI provider error'), { status: resp.status })
          continue // try the next model
        }
        // 4xx that isn't rate-limiting means OUR request is malformed; trying
        // another model would fail identically and just burn latency.
        throw Object.assign(new Error('AI provider error'), { status: resp.status })
      }

      const json = await resp.json()
      json._model = model
      return json
    } catch (e) {
      if (e?.status && !isRetryable(e.status)) throw e
      console.error(`[openrouter] ${model} failed:`, e?.name || e?.message || e)
      lastErr = Object.assign(
        new Error(e?.name === 'AbortError' ? 'AI provider timed out' : 'AI provider unreachable'),
        { status: e?.name === 'AbortError' ? 504 : 502 },
      )
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastErr || Object.assign(new Error('AI provider unreachable'), { status: 502 })
}

/**
 * Streaming completion with failover. Forwards text deltas to onToken() and
 * assembles tool_calls, matching the old streamNim() contract.
 *
 * Failover here is deliberately limited to failures BEFORE the first token: once
 * bytes have reached the vendor's screen, silently restarting on another model
 * would duplicate or contradict what they are already reading. After first
 * token, a mid-stream failure returns what was received.
 *
 * @returns {Promise<{content: string, toolCalls: Array, model: string}>}
 */
export async function streamModel({ messages, tools, onToken, tier = DEFAULT_TIER, maxTokens = 700, temperature = 0.6, timeoutMs = 28000 }) {
  const models = modelsForTier(tier)
  let lastErr = null

  for (const model of models) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let started = false

    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error(`[openrouter] stream ${model} -> ${resp.status}: ${text.slice(0, 200)}`)
        if (isRetryable(resp.status)) {
          lastErr = Object.assign(new Error('AI provider error'), { status: resp.status })
          continue
        }
        throw Object.assign(new Error('AI provider error'), { status: resp.status })
      }

      let content = ''
      const toolAcc = [] // [{ id, name, arguments }] assembled by index
      let buffer = ''
      const decoder = new TextDecoder()
      const reader = resp.body.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          let parsed
          try { parsed = JSON.parse(payload) } catch { continue }

          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue

          if (delta.content) {
            content += delta.content
            started = true
            onToken?.(delta.content)
          }

          for (const tc of delta.tool_calls || []) {
            const idx = tc.index ?? 0
            if (!toolAcc[idx]) toolAcc[idx] = { id: tc.id || `call_${idx}`, name: '', arguments: '' }
            if (tc.id) toolAcc[idx].id = tc.id
            if (tc.function?.name) toolAcc[idx].name += tc.function.name
            if (tc.function?.arguments) toolAcc[idx].arguments += tc.function.arguments
          }
        }
      }

      return { content, toolCalls: toolAcc.filter(Boolean), model }
    } catch (e) {
      if (e?.status && !isRetryable(e.status)) throw e
      console.error(`[openrouter] stream ${model} failed:`, e?.name || e?.message || e)
      lastErr = Object.assign(
        new Error(e?.name === 'AbortError' ? 'AI provider timed out' : 'AI provider unreachable'),
        { status: e?.name === 'AbortError' ? 504 : 502 },
      )
      // Already streaming to the browser — do not restart on another model.
      if (started) throw lastErr
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastErr || Object.assign(new Error('AI provider unreachable'), { status: 502 })
}

/**
 * Verifies every configured model id still exists on OpenRouter and still
 * supports tool calling.
 *
 * Not decorative: OpenRouter listed 431 models and the catalogue moves
 * constantly. A renamed or retired id fails at RUNTIME, mid-conversation, with
 * a 400 that failover will not rescue — the same silent-until-production
 * failure mode as the ERR_REQUIRE_ESM outages. Run from scripts/check-ai-models.js.
 *
 * @returns {Promise<{ok: boolean, missing: string[], noTools: string[]}>}
 */
export async function assertModelsExist() {
  const resp = await fetch(MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(20000),
  })
  if (!resp.ok) throw new Error(`OpenRouter models endpoint returned ${resp.status}`)

  const catalogue = (await resp.json()).data || []
  const byId = new Map(catalogue.map(m => [m.id, m]))

  const configured = [...new Set(Object.values(TIERS).flat())]
  const missing = []
  const noTools = []

  for (const id of configured) {
    const m = byId.get(id)
    if (!m) { missing.push(id); continue }
    if (!(m.supported_parameters || []).includes('tools')) noTools.push(id)
  }

  return { ok: missing.length === 0 && noTools.length === 0, missing, noTools, checked: configured.length }
}
