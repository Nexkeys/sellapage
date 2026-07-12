//sellapage/middleware.js
// Edge middleware for custom domain routing
// When a vendor connects a custom domain, this middleware intercepts requests
// and rewrites them to the correct store path.

import { NextResponse } from 'next/server'

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

// In-memory cache (resets on cold start, acceptable for small number of custom domains)
const domainCache = new Map()
const CACHE_TTL = 60 * 1000 // 60 seconds

let cachedAccessToken = null
let tokenExpiry = 0

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const base64url = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsignedToken = `${base64url(header)}.${base64url(payload)}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(FIREBASE_PRIVATE_KEY)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsignedToken))
  const jwt = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  cachedAccessToken = tokenData.access_token
  tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000
  return cachedAccessToken
}

async function getStoreByDomain(domain) {
  const cached = domainCache.get(domain)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.storeName
  }

  try {
    const token = await getAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'stores' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'customDomain' },
              op: 'EQUAL',
              value: { stringValue: domain },
            },
          },
          limit: 1,
        },
      }),
    })

    const data = await res.json()

    if (data.length > 0 && data[0]?.document?.fields?.storeName?.stringValue) {
      const storeName = data[0].document.fields.storeName.stringValue
      domainCache.set(domain, { storeName, ts: Date.now() })
      return storeName
    }

    return null
  } catch (err) {
    console.error('[middleware] Firestore lookup failed:', err)
    return null
  }
}

export const config = {
  matcher: ['/((?!api/|assets/|.*\\..*).*)'],
}

export async function middleware(request) {
  const host = request.headers.get('host') || ''

  // Skip for main domain and localhost
  if (
    host === 'sellapage.com.ng' ||
    host === 'www.sellapage.com.ng' ||
    host === 'localhost' ||
    host.startsWith('localhost:')
  ) {
    return NextResponse.next()
  }

  const storeName = await getStoreByDomain(host)

  if (!storeName) {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Domain Not Found — Sellapage</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
          .card { background: white; border-radius: 16px; padding: 48px; text-align: center; max-width: 420px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          h1 { color: #111827; font-size: 20px; margin: 0 0 12px; }
          p { color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; }
          a { color: #16a34a; text-decoration: none; font-weight: 600; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Domain Not Configured</h1>
          <p>This domain is not connected to any Sellapage store. If you're the store owner, check your custom domain settings in the dashboard.</p>
          <p style="margin-top: 20px;"><a href="https://sellapage.com.ng">Go to Sellapage</a></p>
        </div>
      </body>
      </html>`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${storeName}`
  return NextResponse.rewrite(url)
}
