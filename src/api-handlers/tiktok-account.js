// src/api-handlers/tiktok-account.js
//
//   GET  ?action=status      is an account connected, and what does it show
//   POST ?action=sync        refresh profile, counts and videos from TikTok
//   POST ?action=disconnect  drop the credential and clear the public fields
//
// WHY VIDEOS ARE CACHED ON THE STORE DOCUMENT
// The storefront section renders from `store.tiktokVideos`, which is already
// loaded with the store. Calling TikTok on every storefront visit would put a
// third-party round trip on the critical path of a page a Nigerian shopper may
// be opening on a slow connection, and would burn TikTok rate limit on traffic
// that has nothing to do with the vendor. The vendor syncs when they post
// something new; visitors pay nothing.
//
// Only the fields the storefront actually renders are stored. TikTok returns
// more; keeping the rest would be storing someone's data for no reason.
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { applyCors } from './_lib/http.js'
import { resolveStoreAccess } from './_lib/verify-store-access.js'
import { getTikTokAuth, setTikTokAuth, clearTikTokAuth } from './_lib/store-secrets.js'
import { refreshAccessToken, getUserInfo, listVideos, isTikTokConfigured, getTikTokEnv } from './_lib/tiktok-client.js'

const TIKTOK_PLANS = new Set(['premium'])
const TAB_ID = 'tiktok-pixel'
const MAX_STORED_VIDEOS = 12

/** Keeps only what the storefront renders. */
function shapeVideo(v) {
  return {
    id: String(v.id || ''),
    cover: String(v.cover_image_url || ''),
    url: String(v.share_url || ''),
    title: String(v.title || v.video_description || '').slice(0, 150),
    views: Number(v.view_count) || 0,
    likes: Number(v.like_count) || 0,
  }
}

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'GET,POST,OPTIONS' })
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = req.query.action || 'status'

  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(header.slice(7).trim())
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    let body = {}
    if (req.method === 'POST') {
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }

    const storeId = String(body.storeId || req.query.storeId || decoded.uid)
    const needsWrite = action !== 'status'
    const access = await resolveStoreAccess(decoded.uid, storeId, TAB_ID, needsWrite)
    if (!access.allowed) {
      return res.status(403).json({
        error: 'forbidden',
        message: access.reason === 'read_only'
          ? 'Your role has view-only access to this section.'
          : 'You do not have access to this store.',
      })
    }

    const db = getAdminDb()
    const ref = db.collection('stores').doc(storeId)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Store not found' })

    const store = snap.data()
    const plan = String(store.plan || 'starter').toLowerCase()
    const eligible = TIKTOK_PLANS.has(plan)

    if (action === 'status') {
      return res.status(200).json({
        success: true,
        plan,
        eligible,
        configured: isTikTokConfigured(),
        // Surfaced so a sandbox connection is never mistaken for a real one
        // while the app is still going through TikTok's review.
        env: getTikTokEnv(),
        connected: store.tiktokConnected === true,
        profile: store.tiktokConnected
          ? {
              username: store.tiktokUsername || null,
              avatarUrl: store.tiktokAvatarUrl || null,
              profileLink: store.tiktokProfileLink || null,
              isVerified: store.tiktokIsVerified === true,
              followerCount: Number(store.tiktokFollowerCount) || 0,
              likesCount: Number(store.tiktokLikesCount) || 0,
              videoCount: Number(store.tiktokVideoCount) || 0,
              syncedAt: store.tiktokStatsSyncedAt || null,
            }
          : null,
        videos: Array.isArray(store.tiktokVideos) ? store.tiktokVideos : [],
        videosSyncedAt: store.tiktokVideosSyncedAt || null,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (action === 'disconnect') {
      await clearTikTokAuth(db, storeId)
      await ref.update({
        tiktokConnected: false,
        tiktokUsername: null,
        tiktokAvatarUrl: null,
        tiktokProfileLink: null,
        tiktokIsVerified: false,
        tiktokFollowerCount: 0,
        tiktokLikesCount: 0,
        tiktokVideoCount: 0,
        tiktokVideos: [],
        tiktokVideosSyncedAt: null,
        tiktokStatsSyncedAt: null,
      })
      return res.status(200).json({ success: true, connected: false, message: 'TikTok account disconnected.' })
    }

    if (action === 'sync') {
      if (!eligible) {
        return res.status(403).json({ error: 'plan_required', message: 'This is a Premium feature.' })
      }

      const auth = await getTikTokAuth(db, storeId)
      if (!auth?.refreshToken) {
        return res.status(400).json({
          error: 'not_connected',
          message: 'No TikTok account is connected. Connect one first.',
        })
      }

      let tokens
      try {
        tokens = await refreshAccessToken(auth.refreshToken)
      } catch (err) {
        // An expired or revoked refresh token is a real state, not a glitch:
        // the vendor revoked access in TikTok, or left it unused past its
        // lifetime. Mark it disconnected so the UI stops claiming a live
        // connection that cannot actually read anything.
        console.warn('[tiktok-account] refresh failed, marking disconnected:', err.message)
        await clearTikTokAuth(db, storeId)
        await ref.update({ tiktokConnected: false })
        return res.status(400).json({
          error: 'reconnect_required',
          message: 'Your TikTok connection has expired. Please connect again.',
        })
      }

      // TikTok ROTATES the refresh token. Persisting the new one is not
      // optional: skip it and the connection dies silently in about a day.
      if (tokens.refresh_token) {
        await setTikTokAuth(db, storeId, {
          refreshToken: tokens.refresh_token,
          openId: tokens.open_id || auth.openId,
        })
      }

      const update = { tiktokConnected: true }

      // Profile and videos are fetched independently: one failing should not
      // cost the vendor the other.
      try {
        const profile = await getUserInfo(tokens.access_token)
        if (profile) {
          update.tiktokUsername = profile.display_name || null
          update.tiktokAvatarUrl = profile.avatar_url || null
          update.tiktokProfileLink = profile.profile_deep_link || null
          update.tiktokIsVerified = profile.is_verified === true
          update.tiktokFollowerCount = Number(profile.follower_count) || 0
          update.tiktokLikesCount = Number(profile.likes_count) || 0
          update.tiktokVideoCount = Number(profile.video_count) || 0
          update.tiktokStatsSyncedAt = new Date().toISOString()
        }
      } catch (err) {
        console.warn('[tiktok-account] getUserInfo failed:', err.message)
      }

      let videoError = null
      try {
        const videos = await listVideos(tokens.access_token, MAX_STORED_VIDEOS)
        update.tiktokVideos = videos.slice(0, MAX_STORED_VIDEOS).map(shapeVideo).filter((v) => v.id && v.cover)
        update.tiktokVideosSyncedAt = new Date().toISOString()
      } catch (err) {
        console.warn('[tiktok-account] listVideos failed:', err.message)
        videoError = 'Could not load your videos this time. Your profile details are up to date.'
      }

      await ref.update(update)

      return res.status(200).json({
        success: true,
        connected: true,
        warning: videoError,
        profile: {
          username: update.tiktokUsername ?? store.tiktokUsername ?? null,
          avatarUrl: update.tiktokAvatarUrl ?? store.tiktokAvatarUrl ?? null,
          profileLink: update.tiktokProfileLink ?? store.tiktokProfileLink ?? null,
          isVerified: update.tiktokIsVerified ?? store.tiktokIsVerified ?? false,
          followerCount: update.tiktokFollowerCount ?? store.tiktokFollowerCount ?? 0,
          likesCount: update.tiktokLikesCount ?? store.tiktokLikesCount ?? 0,
          videoCount: update.tiktokVideoCount ?? store.tiktokVideoCount ?? 0,
          syncedAt: update.tiktokStatsSyncedAt || store.tiktokStatsSyncedAt || null,
        },
        videos: update.tiktokVideos ?? (Array.isArray(store.tiktokVideos) ? store.tiktokVideos : []),
      })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('[tiktok-account] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
