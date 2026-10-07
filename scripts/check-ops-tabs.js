#!/usr/bin/env node
// scripts/check-ops-tabs.js
//
// Build guard (runs in `prebuild`). Every admin endpoint names the tab it
// belongs to, e.g. verifyAdmin(req, 'tickets'). If that tab is missing from
// src/utils/opsAccess.js, nobody using the Ops console could ever be given it:
// it would not appear in Team & Access or in Sella's guide. This stops the
// build with the file and the tab name instead of letting that slip through.
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { OPS_TAB_IDS } = await import(pathToFileURL(path.join(ROOT, 'src/utils/opsAccess.js')).href)
const known = new Set(OPS_TAB_IDS)
const dir = path.join(ROOT, 'src/api-handlers')
const problems = []

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js')) continue
  const text = fs.readFileSync(path.join(dir, file), 'utf8')
  for (const m of text.matchAll(/verify(?:Admin|OpsRequest)\(\s*req\s*,\s*['"]([a-z0-9-]+)['"]/g)) {
    // 'flags' is a legacy-only tab with no console screen of its own.
    if (!known.has(m[1]) && m[1] !== 'flags') problems.push(`${file}: tab "${m[1]}" is not in src/utils/opsAccess.js OPS_TABS`)
  }
}

if (problems.length) {
  console.error('\nOps tab check failed. Add these tabs to OPS_TABS (with label, group, icon, about, can):\n')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('')
  process.exit(1)
}
console.log(`ops tabs: ${known.size} tabs, every admin endpoint accounted for`)
