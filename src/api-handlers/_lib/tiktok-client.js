// src/api-handlers/_lib/tiktok-client.js
// TikTok Display API v2 client (Login Kit).
//
// WHAT THIS CAN AND CANNOT DO, STATED UP FRONT
// Sellapage's TikTok app holds exactly four scopes:
//   user.info.basic    open_id, union_id, avatar, display name
//   user.info.profile  bio, profile link, is_verified
//   user.info.stats    follower / following / likes / video counts
//   video.list         a vendor's own public videos
//
// It has NO advertising permission. Campaign creation and ads reporting live on
// the TikTok API for Business (business-api.tiktok.com), which is a separate
// developer app needing Business Center onboarding, app review and a
// data-security audit. Nothing in this file can read a vendor's ad spend, and
// no amount of wiring here will change that - it needs a different application
// to TikTok. Conversion tracking is handled instead by the vendor's own pixel
// (_lib/tiktok-events.js), which needs no approval at all.
//
// Everything here is READ-ONLY against the vendor's own account.
import crypto from 'crypto'

const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
const VIDEO_LIST_URL = 'https://open.tiktokapis.com/v2/video/list/'

const CALL_TIMEOUT_MS = 10000

// The exact four scopes the app is approved for. Requesting one we do not hold
// makes TikTok reject the whole authorization, so this list is the source of
// truth rather than something assembled per call site.
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
].join(',')

const USER_FIELDS = [
  'open_id', 'union_id', 'avatar_url', 'display_name',
  'bio_description', 'profile_deep_link', 'is_verified',
  'follower_count', 'following_count', 'likes_count', 'video_count',
].join(',')

const VIDEO_FIELDS = [
  'id', 'title', 'video_description', 'duration', 'cover_image_url',
  'share_url', 'embed_link', 'create_time',
  'like_count', 'comment_count', 'share_count', 'view_count',
].join(',')

/**
 * Sandbox and production are SEPARATE TikTok apps with separate credentials, and
 * TikTok requires an unapproved app to demonstrate the integration in sandbox
 * before it will review it for production. So both sets of keys have to coexist
 * and the switch has to be one variable, not a code change.
 *
 * Same shape as TOPSHIP_ENV in _lib/topship-booking.js, which has already been
 * through exactly this staging-then-production cycle in production.
 *
 * Defaults to 'sandbox'. That direction is deliberate: an unset variable should
 * fail toward the environment that cannot touch a real vendor's account.
 *
 * SANDBOX_ variables fall back to the bare ones, so a deployment that only ever
 * had one set of keys keeps working rather than silently resolving to nothing.
 */
export function getTikTokEnv() {
  return String(process.env.TIKTOK_ENV || 'sandbox').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox'
}

export function getTikTokConfig() {
  const sandbox = getTikTokEnv() === 'sandbox'
  return {
    env: sandbox ? 'sandbox' : 'production',
    clientKey: (sandbox
      ? process.env.TIKTOK_SANDBOX_CLIENT_KEY || process.env.TIKTOK_CLIENT_KEY
      : process.env.TIKTOK_CLIENT_KEY) || '',
    clientSecret: (sandbox
      ? process.env.TIKTOK_SANDBOX_CLIENT_SECRET || process.env.TIKTOK_CLIENT_SECRET
      : process.env.TIKTOK_CLIENT_SECRET) || '',
    redirectUri: (sandbox
      ? process.env.TIKTOK_SANDBOX_REDIRECT_URI || process.env.TIKTOK_REDIRECT_URI
      : process.env.TIKTOK_REDIRECT_URI) || '',
  }
}

/** True when all three values resolve, so callers can fail with a clear message. */
export function isTikTokConfigured() {
  const c = getTikTokConfig()
  return !!(c.clientKey && c.clientSecret && c.redirectUri)
}

/**
 * Names what is missing, for the vendor-facing error. Never returns values.
 *
 * Reports the variable names for the ENVIRONMENT actually in use, so an admin
 * chasing a misconfiguration is told to set TIKTOK_SANDBOX_CLIENT_KEY rather
 * than being sent to the production one that is already set.
 */
export function missingTikTokConfig() {
  const c = getTikTokConfig()
  const p = c.env === 'sandbox' ? 'TIKTOK_SANDBOX_' : 'TIKTOK_'
  return [
    !c.clientKey && `${p}CLIENT_KEY`,
    !c.clientSecret && `${p}CLIENT_SECRET`,
    !c.redirectUri && `${p}REDIRECT_URI`,
  ].filter(Boolean)
}

/**
 * The consent URL the vendor is sent to.
 *
 * `state` must be an unguessable nonce bound server-side to the store, never
 * the store id itself. That was finding C-04 in Docs/Security-Reviews.MD: the
 * Google Ads flow used a raw storeId here, and store ids are public, so a
 * crafted link made a victim hand their token to an attacker's store.
 */
export function buildAuthorizeUrl({ state }) {
  const { clientKey, redirectUri } = getTikTokConfig()
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_key', clientKey)
  url.searchParams.set('scope', TIKTOK_SCOPES)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

/** A 32-byte nonce. crypto.randomBytes, never Math.random (finding M-02). */
export function newState() {
  return crypto.randomBytes(32).toString('hex')
}

async function postForm(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json || json.error) {
    // TikTok returns { error, error_description }. Logged without the payload,
    // which carries the client secret on the token calls.
    const detail = json?.error_description || json?.error || `HTTP ${res.status}`
    throw new Error(`TikTok token request failed: ${detail}`)
  }
  return json
}

/** Exchanges the one-time code from the callback for tokens. */
export async function exchangeCode(code) {
  const { clientKey, clientSecret, redirectUri } = getTikTokConfig()
  return postForm(TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
}

/**
 * TikTok access tokens live about 24 hours, so unlike the Google Ads
 * integration, a stored refresh token is exchanged on nearly every read.
 * The refresh token itself lasts about a year and rotates on each use, so the
 * caller MUST persist the new one that comes back or the connection dies
 * quietly a day later.
 */
export async function refreshAccessToken(refreshToken) {
  const { clientKey, clientSecret } = getTikTokConfig()
  return postForm(TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

async function getJson(url, accessToken, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  })
  const json = await res.json().catch(() => null)
  const err = json?.error
  // TikTok answers 200 with error.code === 'ok' on success, so the status alone
  // is not the signal.
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    throw new Error(`TikTok API failed: ${err?.message || err?.code || `HTTP ${res.status}`}`)
  }
  return json
}

/** Profile plus the follower/like counts, per user.info.* scopes. */
export async function getUserInfo(accessToken) {
  const json = await getJson(`${USER_INFO_URL}?fields=${encodeURIComponent(USER_FIELDS)}`, accessToken)
  return json?.data?.user || null
}

/**
 * The vendor's own public videos, newest first.
 *
 * Capped deliberately: a storefront section shows a handful, and every extra
 * video is payload a Nigerian shopper on a slow connection pays for.
 */
export async function listVideos(accessToken, maxCount = 12) {
  const json = await getJson(
    `${VIDEO_LIST_URL}?fields=${encodeURIComponent(VIDEO_FIELDS)}`,
    accessToken,
    { method: 'POST', body: JSON.stringify({ max_count: Math.min(Math.max(1, maxCount), 20) }) },
  )
  return json?.data?.videos || []
}
