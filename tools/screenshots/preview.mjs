// tools/screenshots/preview.mjs
//
// Pictures of the dashboard at several screen widths, for checking a layout by
// eye without signing in or spending a single Firestore read (the sandbox
// answers every read from data.js).
//
//   node tools/screenshots/preview.mjs <outDir> [query] [widths]
//   node tools/screenshots/preview.mjs ./out "preview=dashboard&plan=pro" 390,768,1536
//
// Saves <outDir>/<width>.png. Nothing goes into media-src/.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const [outDir = './preview-out', q = 'preview=dashboard', widthArg = '390,1536', heightArg] = process.argv.slice(2)
const widths = widthArg.split(',').map(Number)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const server = await createServer({ configFile: path.join(HERE, 'vite.config.mjs'), logLevel: 'error' })
await server.listen()
const base = `http://localhost:${server.config.server.port}/tools/screenshots/index.html`

const port = 9345
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sellapage-preview-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

let target
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250)
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* starting */ }
}
if (!target) throw new Error('Could not start Chrome')
const ws = new WebSocket(target.webSocketDebuggerUrl)
let nextId = 0
const waiting = new Map()
const errors = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0])
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300))
}
await new Promise((r) => { ws.onopen = r })
const send = (method, params = {}) => new Promise((r) => { const id = ++nextId; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
await send('Runtime.enable')
await send('Page.enable')
fs.mkdirSync(outDir, { recursive: true })

for (const width of widths) {
  const height = Number(heightArg) || (width < 700 ? 3400 : width < 1100 ? 2600 : 1100)
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  await send('Page.navigate', { url: `${base}?${q}` })
  // First load compiles dependencies; later ones are quick.
  for (let i = 0; i < 60; i++) {
    await sleep(1000)
    const r = await send('Runtime.evaluate', { expression: 'document.querySelector("main") ? 1 : 0', returnByValue: true })
    if (r?.result?.value === 1) break
  }
  await sleep(2500)
  const png = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(outDir, `${width}.png`), Buffer.from(png.data, 'base64'))
  console.log(`${width}px saved`)
}
if (errors.length) console.log('Page errors:\n  ' + [...new Set(errors)].slice(0, 8).join('\n  '))
ws.close()
chrome.kill()
await server.close()
await sleep(600)
try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* later */ }
process.exit(0)
