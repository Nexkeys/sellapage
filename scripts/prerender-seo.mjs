#!/usr/bin/env node
// scripts/prerender-seo.mjs
//
// Runs after `vite build`. For every public route it writes a static HTML file
// containing the real title, description, canonical, Open Graph tags, JSON-LD
// and a readable prose summary of that page.
//
// WHY THIS EXISTS
// Sellapage is a client-rendered SPA. The HTML actually served is:
//     <body><div id="root"></div><script src="/assets/index-*.js"></script></body>
// Google runs the JavaScript and sees the finished page. Most AI crawlers do
// not: GPTBot, ClaudeBot, PerplexityBot and CCBot read the HTML as delivered.
// react-helmet-async injects every meta tag at runtime, so to those crawlers
// the site has no title, no description and no content at all. That is why
// asking an assistant "what is Sellapage" returns nothing useful today.
//
// HOW IT STAYS SAFE
//  - It never touches the SPA. Each generated file keeps the exact same
//    <div id="root"> and module script as the built index.html, so a browser
//    boots React normally and the user sees no difference.
//  - The prose sits inside <noscript>, so it is in the raw HTML for crawlers
//    but never renders for a human and never flashes before hydration.
//  - Vercel checks the filesystem before applying rewrites, so /about is served
//    from dist/about/index.html and only unmatched paths fall through to the
//    SPA rewrite in vercel.json. Dynamic routes (/:storeName, /blog/:slug) are
//    untouched and keep working exactly as they do now.
//
// Regenerating is idempotent: it reads the freshly built dist/index.html each
// time, so asset hashes are always current.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')

// Imported rather than duplicated, so the static copy and the React copy can
// never drift apart.
const seoModule = await import(pathToFileURL(join(ROOT, 'src/data/seoPages.js')).href)
const { SITE, PAGE_SEO } = seoModule

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('✖ dist/index.html not found. Run `vite build` first.')
  process.exit(1)
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8')

/**
 * Strips the tags we are about to replace, so nothing is emitted twice.
 *
 * `dropJsonLd` matters: index.html carries three hand-written JSON-LD blocks
 * (SoftwareApplication, FAQPage, BreadcrumbList) that describe the HOME page.
 * Every prerendered file starts from that template, so without this /terms and
 * /about would each claim the homepage's breadcrumbs and FAQ. Home keeps them;
 * every other route gets only its own.
 */
function stripHeadTags(html, dropJsonLd) {
  if (dropJsonLd) {
    html = html.replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi, '')
  }
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+name="keywords"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
}

function buildHead(route, seo) {
  const fullTitle = seo.title ? `${seo.title} | ${SITE.name}` : `${SITE.name} - Run Your Entire Business from One Dashboard`
  const canonical = `${SITE.url}${route === '/' ? '' : route}`
  const blocks = Array.isArray(seo.jsonLd) ? seo.jsonLd : seo.jsonLd ? [seo.jsonLd] : []

  return [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(seo.description)}">`,
    seo.keywords ? `<meta name="keywords" content="${esc(seo.keywords)}">` : '',
    `<link rel="canonical" href="${esc(canonical)}">`,
    // Explicitly invite indexing. Three of these pages previously shipped
    // noindex, and a stray one is silent and very hard to notice.
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta property="og:title" content="${esc(fullTitle)}">`,
    `<meta property="og:description" content="${esc(seo.description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(SITE.image)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE.name)}">`,
    `<meta property="og:locale" content="en_NG">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(fullTitle)}">`,
    `<meta name="twitter:description" content="${esc(seo.description)}">`,
    `<meta name="twitter:image" content="${esc(SITE.image)}">`,
    ...blocks.map(
      (b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`,
    ),
  ]
    .filter(Boolean)
    .join('\n    ')
}

/**
 * Human-invisible, crawler-visible. <noscript> is in the delivered HTML, so a
 * non-JS crawler reads it, while a browser with JS never renders it and there
 * is no flash of placeholder text before React mounts.
 */
function buildBody(route, seo) {
  const heading = seo.title || SITE.name
  const paragraphs = (seo.prose || []).map((p) => `<p>${esc(p)}</p>`).join('\n        ')
  return `<noscript>
      <main>
        <h1>${esc(heading)}</h1>
        ${paragraphs}
        <nav aria-label="Sellapage pages">
          <ul>
${Object.entries(PAGE_SEO)
  .filter(([p]) => p !== route)
  .map(([p, s]) => `            <li><a href="${p}">${esc(s.title || SITE.name)}</a></li>`)
  .join('\n')}
          </ul>
        </nav>
      </main>
    </noscript>`
}

let written = 0
for (const [route, seo] of Object.entries(PAGE_SEO)) {
  let html = stripHeadTags(template, route !== '/')
  html = html.replace('</head>', `  ${buildHead(route, seo)}\n  </head>`)
  html = html.replace('<div id="root"></div>', `${buildBody(route, seo)}\n    <div id="root"></div>`)

  const outPath =
    route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html, 'utf8')
  written++
  console.log(`  ✓ ${route.padEnd(32)} -> ${outPath.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`)
}

console.log(`\nPrerendered ${written} public routes with full SEO metadata.`)

// ---------------------------------------------------------------------------
// Drift guard.
//
// A prerendered file is only reachable if vercel.json rewrites the clean path
// to it BEFORE the SPA catch-all. Miss that and the route silently falls back
// to the empty-shell index.html: the page still works for humans, so nothing
// looks broken, while every crawler quietly gets nothing. That is exactly the
// kind of failure nobody notices for months, so fail loudly at build time.
// ---------------------------------------------------------------------------
try {
  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
  const sources = new Set((vercel.rewrites || []).map((r) => r.source))
  const missing = Object.keys(PAGE_SEO).filter((r) => r !== '/' && !sources.has(r))
  if (missing.length) {
    console.error(
      `\n✖ These routes are prerendered but have no vercel.json rewrite, so the static file will never be served:\n  ${missing.join('\n  ')}\n` +
        '  Add { "source": "<route>", "destination": "<route>/index.html" } before the /index.html catch-all.',
    )
    process.exit(1)
  }
  console.log('Rewrite check: every prerendered route is routable.')
} catch (err) {
  console.error('✖ Could not verify vercel.json rewrites:', err.message)
  process.exit(1)
}
