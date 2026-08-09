#!/usr/bin/env node
// scripts/check-cjs-safe.js
//
// Guards against the ERR_REQUIRE_ESM class of production outage.
//
// Vercel's Node runtime loads our serverless functions through the CommonJS
// loader. Many npm packages are still CJS themselves but have quietly moved
// their own dependencies to ESM-only builds — and a CJS package `require()`ing
// an ESM-only dependency throws ERR_REQUIRE_ESM *at module load time*. Because
// every endpoint is dispatched through the single catch-all api/[...route].js,
// that throw takes down the ENTIRE API, not just the handler that imported it.
//
// This has bitten production twice:
//   isomorphic-dompurify -> jsdom -> html-encoding-sniffer -> @exodus/bytes
//   sanitize-html@2.17   -> htmlparser2@12
//
// Newer Node (>=22.12) can require() ESM, which is why these bugs pass locally
// and only fail on deploy. We therefore run with --no-experimental-require-module
// to reproduce the stricter runtime regardless of the local Node version.
//
// Usage:  npm run check:cjs
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const HANDLER_DIRS = ['src/api-handlers', 'src/api-handlers/_lib']
const IMPORT_RE = /(?:^|\n)\s*import\s+(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g

function collectBareImports() {
  const specifiers = new Set()
  for (const dir of HANDLER_DIRS) {
    let entries = []
    try { entries = readdirSync(dir) } catch { continue }
    for (const file of entries.filter(f => f.endsWith('.js'))) {
      const src = readFileSync(join(dir, file), 'utf8')
      for (const [, spec] of src.matchAll(IMPORT_RE)) {
        // Skip relative paths and node: builtins — only third-party matters.
        if (spec.startsWith('.') || spec.startsWith('node:')) continue
        specifiers.add(spec)
      }
    }
  }
  return [...specifiers].sort()
}

const specifiers = collectBareImports()
if (!specifiers.length) {
  console.log('No third-party imports found in API handlers.')
  process.exit(0)
}

const probe = specifiers
  .map(s => `try{require(${JSON.stringify(s)});console.log("  OK   ${s}")}` +
            `catch(e){if(e.code==="ERR_REQUIRE_ESM"){console.log("  FAIL ${s} -> "+e.code);process.exitCode=1}` +
            `else{console.log("  skip ${s} ("+(e.code||"load error")+")")}}`)
  .join('\n')

console.log(`Checking ${specifiers.length} third-party API-handler imports under the strict CommonJS loader:\n`)

let failed = false
try {
  const out = execFileSync(
    process.execPath,
    ['--no-experimental-require-module', '-e', probe],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  process.stdout.write(out)
  if (out.includes('FAIL')) failed = true
} catch (err) {
  process.stdout.write(err.stdout || '')
  process.stderr.write(err.stderr || '')
  failed = true
}

if (failed) {
  console.error(
    '\n✖ An API-handler dependency cannot be require()d as CommonJS.\n' +
    '  On Vercel this throws ERR_REQUIRE_ESM at load time and 500s the ENTIRE API.\n' +
    '  Fix: pin the package (exact version, no caret) to a release whose own\n' +
    '  dependencies still ship a CommonJS build — see scripts/check-cjs-safe.js header.\n',
  )
  process.exit(1)
}

console.log('\n✓ All API-handler dependencies are CommonJS-safe.')
