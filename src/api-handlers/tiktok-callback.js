// src/api-handlers/tiktok-callback.js
// Completes the TikTok Login Kit OAuth flow.
//
// The nonce issued by tiktok-auth.js is consumed inside a Firestore transaction,
// which does two jobs at once: it proves this callback belongs to a flow that a
// real authenticated vendor started, and it makes the code single-use so a
// replayed callback cannot rebind the account.
//
// This endpoint is necessarily unauthenticated - the browser arrives here from
// tiktok.com carrying no Firebase session - so the nonce IS the authentication.
import { getAdminDb } from './_lib/firebase-admin.js'
import { exchangeCode, getUserInfo } from './_lib/tiktok-client.js'
import { setTikTokAuth } from './_lib/store-secrets.js'

function backTo(res, params) {
  const appUrl = process.env.APP_URL || 'https://www.sellapage.com.ng'
  const q = new URLSearchParams({ tab: 'tiktok-pixel', ...params }).toString()
  return res.redirect(`${appUrl}/dashboard?${q}`)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state, error: authError, error_description: authErrorDesc } = req.query

  if (authError) {
    return backTo(res, {
      tiktok: 'error',
      message: authErrorDesc || 'TikTok did not grant access. Please try again.',
    })
  }
  if (!code || !state) {
    return backTo(res, {
      tiktok: 'error',
      message: 'Missing authorization code. Please try connecting again.',
    })
  }

  const db = getAdminDb()

  // Consume the nonce atomically. Anything unexpected here is treated as a
  // failed connection rather than investigated, because a caller who cannot
  // present a valid unconsumed nonce has no business reaching the rest of this.
  let storeId
  try {
    storeId = await db.runTransaction(async (tx) => {
      const ref = db.collection('oauthStates').doc(String(state))
      const snap = await tx.get(ref)
      if (!snap.exists) throw new Error('invalid_state')

      const s = snap.data()
      if (s.consumed || s.provider !== 'tiktok' || (s.expiresAt || 0) < Date.now()) {
        throw new Error('invalid_state')
      }

      tx.update(ref, { consumed: true, consumedAt: Date.now() })
      return s.storeId
    })
  } catch {
    return backTo(res, {
      tiktok: 'error',
      message: 'This connection link is invalid or has expired. Please try connecting again.',
    })
  }

  try {
    const tokens = await exchangeCode(String(code))
    if (!tokens?.refresh_token || !tokens?.access_token) {
      return backTo(res, {
        tiktok: 'error',
        message: 'TikTok did not return an access token. Please try connecting again.',
      })
    }

    // The credential goes to private/*, never the world-readable store doc.
    await setTikTokAuth(db, storeId, {
      refreshToken: tokens.refresh_token,
      openId: tokens.open_id || null,
    })

    // Profile and counts are public-safe display data. Fetched here so the
    // dashboard has something to show the moment the vendor lands back, rather
    // than an empty card that fills in on some later request.
    //
    // Non-fatal: a profile fetch that fails must not undo a connection that
    // genuinely succeeded. The account tab refetches on demand.
    let profile = null
    try {
      profile = await getUserInfo(tokens.access_token)
    } catch (infoErr) {
      console.warn('[tiktok-callback] getUserInfo failed, connection kept:', infoErr.message)
    }

    await db.collection('stores').doc(storeId).update({
      tiktokConnected: true,
      tiktokConnectedAt: new Date().toISOString(),
      tiktokUsername: profile?.display_name || null,
      tiktokAvatarUrl: profile?.avatar_url || null,
      tiktokProfileLink: profile?.profile_deep_link || null,
      tiktokIsVerified: profile?.is_verified === true,
      tiktokFollowerCount: Number(profile?.follower_count) || 0,
      tiktokLikesCount: Number(profile?.likes_count) || 0,
      tiktokVideoCount: Number(profile?.video_count) || 0,
      tiktokStatsSyncedAt: new Date().toISOString(),
    })

    return backTo(res, { tiktok: 'connected' })
  } catch (err) {
    console.error('[tiktok-callback] Unexpected error:', err.message)
    return backTo(res, {
      tiktok: 'error',
      message: 'Something went wrong connecting TikTok. Please try again.',
    })
  }
}
