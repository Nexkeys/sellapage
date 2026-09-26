// tools/screenshots/shoot.mjs
//
// Captures real dashboard screens into media-src/<slot>/screenshot.png, ready
// for `npm run media`.
//
//   node tools/screenshots/shoot.mjs                 every shot
//   node tools/screenshots/shoot.mjs feature-loyalty just one
//
// Uses the Chrome already installed on this machine over its DevTools
// protocol, so no browser package is added to the project.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

// The feature cards are small and 16:10, so the screen is captured at a
// modest width (text stays legible once shrunk into a card) and at 2x for
// sharpness. The media tool then scales it to its standard sizes.
// Narrow on purpose. These go into cards about 260px wide, and a full desktop
// screen shrunk that far is unreadable grey. At this width the dashboard uses
// its larger phone layout, and the crop below frames one telling detail, so
// names and naira amounts stay legible in the card.
const VIEW = { width: 560, height: 350, scale: 2 }
const SETTLE_MS = 2500

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// What to do on the page before the picture is taken, so each shot shows the
// part of the screen worth seeing rather than whatever happens to be on top.
// Each is plain page JavaScript, run after the screen has loaded.
// Returns the page-coordinate top of the first element whose text contains
// `text` (case-insensitive, since some labels are uppercased by CSS). The
// capture then crops from there, which works even when the page's own layout
// stops the window from scrolling.
const topOfText = (text, above = 28) => `(() => {
  const want = ${JSON.stringify(text)}.toLowerCase()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    if (w.currentNode.textContent.toLowerCase().includes(want)) {
      const r = w.currentNode.parentElement.getBoundingClientRect()
      return Math.max(0, Math.round(r.top + window.scrollY) - ${above})
    }
  }
  return 0
})()`
const PREPARE = {
  'feature-customers': topOfText('Chioma Okafor', 40),
  'feature-discounts': topOfText('GLOWFRIDAY', 36),
  'feature-delivery': topOfText('Lekki & Ajah', 24),
  'feature-abandoned': topOfText('Recovered value', 34),
  'feature-loyalty': topOfText('Cards issued', 24),
  'feature-analytics': topOfText('from midnight', 60),
  // Open the first product, then frame it, so real written reviews with
  // stars are what shows.
  'feature-reviews': `(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerHTML.includes('chevron-down'))
    if (b) b.click()
    return ${topOfText('Black Soap Gentle Cleanser', 24)}
  })()`,
}

const server = await createServer({ configFile: path.join(HERE, 'vite.config.mjs'), logLevel: 'error' })
await server.listen()
const base = `http://localhost:${server.config.server.port}/tools/screenshots/index.html`

const port = 9344
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sellapage-shots-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

let target
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250)
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')
  } catch { /* chrome still starting */ }
}
if (!target) throw new Error('Could not start Chrome. Set CHROME_PATH if it is installed elsewhere.')

const ws = new WebSocket(target.webSocketDebuggerUrl)
let nextId = 0
const waiting = new Map()
const errors = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0])
  }
}
await new Promise((r) => { ws.onopen = r })
const send = (method, params = {}) =>
  new Promise((r) => { const id = ++nextId; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })) })

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.scale, mobile: false,
})

// Which shots exist is decided by main.jsx; ask the page rather than keep a
// second list here that could drift.
// The first load compiles every dependency, which can take a while on a cold
// machine, so wait for the page to say it is ready rather than guessing.
await send('Page.navigate', { url: `${base}?shot=__list__` })
let all = []
for (let i = 0; i < 90 && !all.length; i++) {
  await sleep(1000)
  const listed = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__SHOTS__ || [])', returnByValue: true })
  all = JSON.parse(listed?.result?.value || '[]')
}
if (!all.length) {
  console.error('The sandbox page never loaded.', errors[0] || '')
  ws.close(); chrome.kill(); await server.close(); process.exit(1)
}
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : all

const results = []
for (const shot of wanted) {
  if (!all.includes(shot)) { results.push([shot, 'unknown shot']); continue }
  errors.length = 0
  await send('Page.navigate', { url: `${base}?shot=${shot}` })
  await sleep(SETTLE_MS)
  let clipTop = 0
  if (PREPARE[shot]) {
    const r = await send('Runtime.evaluate', { expression: PREPARE[shot], returnByValue: true })
    // A number means "crop from here"; anything else was an action like a click.
    if (typeof r?.result?.value === 'number') clipTop = r.result.value
    await sleep(900)
  }
  const png = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: clipTop, width: VIEW.width, height: VIEW.height, scale: 1 },
  })
  const dir = path.join(ROOT, 'media-src', shot)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'screenshot.png')
  fs.writeFileSync(file, Buffer.from(png.data, 'base64'))
  results.push([shot, errors.length ? `saved, but the page threw: ${errors[0]}` : `saved ${Math.round(fs.statSync(file).size / 1024)} KB`])
}

ws.close()
chrome.kill()
await server.close()
// Chrome releases its profile a moment after being killed. A leftover temp
// folder is harmless; crashing before printing the results is not.
await sleep(800)
try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* cleaned by the OS later */ }

for (const [shot, status] of results) console.log(`${shot.padEnd(20)} ${status}`)
console.log('\nNow run: npm run media')
process.exit(0)
