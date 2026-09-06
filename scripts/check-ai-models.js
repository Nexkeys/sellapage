#!/usr/bin/env node
// scripts/check-ai-models.js
//
// Verifies every model id configured in _lib/openrouter.js still exists on
// OpenRouter AND still supports tool calling.
//
// WHY THIS EXISTS: OpenRouter listed 431 models and the catalogue moves
// constantly — ids get renamed, deprecated and retired. A stale id does not
// fail at build time; it fails at RUNTIME, mid-conversation, with a 400 that
// failover cannot rescue (a 400 is not retryable, by design — retrying a
// malformed request just burns latency). That is the same
// silent-until-production shape as the ERR_REQUIRE_ESM outages, so it gets the
// same treatment: check it, loudly, before shipping.
//
// Tool support matters as much as existence: Sella's entire value is tool
// calling, and a model without it would answer plausibly while silently never
// reading or writing anything.
//
// Usage:  npm run check:ai        (needs OPEN_ROUTER_API_KEY)
//
// Exits 0 and SKIPS when the key is absent, so CI or a fresh clone without
// secrets is not blocked by it.
import { readFileSync, existsSync } from 'node:fs'

// Load .env for local runs; on Vercel the vars are already in the environment.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
}

if (!process.env.OPEN_ROUTER_API_KEY && !process.env.OPENROUTER_API_KEY) {
  console.log('· OPEN_ROUTER_API_KEY not set — skipping AI model check.')
  process.exit(0)
}

const { assertModelsExist, TIERS } = await import('../src/api-handlers/_lib/openrouter.js')

try {
  const result = await assertModelsExist()

  for (const [tier, models] of Object.entries(TIERS)) {
    console.log(`  ${tier.padEnd(9)} ${models.join('  ->  ')}`)
  }

  if (result.ok) {
    console.log(`\n✓ All ${result.checked} Sella AI models exist and support tool calling.`)
    process.exit(0)
  }

  console.error('\n✖ Sella AI model configuration is stale:')
  if (result.missing.length) {
    console.error(`  NOT FOUND on OpenRouter: ${result.missing.join(', ')}`)
  }
  if (result.noTools.length) {
    console.error(`  NO TOOL-CALLING SUPPORT: ${result.noTools.join(', ')}`)
  }
  console.error('\n  Fix the ids in src/api-handlers/_lib/openrouter.js.')
  console.error('  Browse the live catalogue: https://openrouter.ai/models\n')
  process.exit(1)
} catch (err) {
  // A network blip must not block a deploy — the ids were valid last time and
  // a failed lookup is not evidence they changed.
  console.warn(`· AI model check could not run (${err.message}) — continuing.`)
  process.exit(0)
}
