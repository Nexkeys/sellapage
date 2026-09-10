// src/components/dashboard/TikTokAccountPanel.jsx
// Connect a TikTok account, see its stats, and pull the vendor's videos so the
// storefront can show them.
//
// This uses the four scopes Sellapage's TikTok app actually holds
// (user.info.basic, user.info.profile, user.info.stats, video.list). It is
// read-only and has nothing to do with advertising: ad spend and campaign
// reporting need the TikTok API for Business, a separate approved app. The
// copy in here says so plainly rather than implying otherwise, because a vendor
// who connects expecting to see ad results and finds follower counts will
// reasonably think the feature is broken.
import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, RefreshCw, Link2, Unlink, CheckCircle2, AlertCircle, ExternalLink,
  BadgeCheck,
} from 'lucide-react'
import { auth } from '../../firebase/auth'
import { SkeletonRows } from '../Skeleton'

// Matches compactCount in DesignedStorefront so the dashboard and the public
// storefront never quote a vendor two different follower counts.
function compact(n) {
  const v = Number(n) || 0
  if (v >= 1000000) return `${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace(/\.0$/, '')}m`
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(v)
}

export default function TikTokAccountPanel({ store }) {
  const [state, setState] = useState({ loading: true })
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(null)

  const load = useCallback(async () => {
    if (!store?.id) return
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch(`/api/tiktok-account?action=status&storeId=${encodeURIComponent(store.id)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const d = await r.json()
      setState({ loading: false, ...d })
    } catch {
      setState({ loading: false, loadError: true })
    }
  }, [store?.id])

  useEffect(() => { load() }, [load])

  // The OAuth callback lands back on the dashboard with ?tiktok=connected or
  // ?tiktok=error&message=..., so the result of a redirect the vendor started
  // several seconds ago is surfaced rather than silently swallowed. The params
  // are stripped afterwards so a refresh does not replay the message.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('tiktok')
    if (!outcome) return
    if (outcome === 'connected') setNote({ kind: 'ok', text: 'TikTok account connected.' })
    else setNote({ kind: 'err', text: params.get('message') || 'Could not connect TikTok. Please try again.' })
    params.delete('tiktok')
    params.delete('message')
    const q = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
  }, [])

  const call = async (action, label) => {
    setBusy(label)
    setNote(null)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch(`/api/tiktok-account?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ storeId: store.id }),
      })
      const d = await r.json()
      if (!r.ok || !d?.success) {
        setNote({ kind: 'err', text: d?.message || 'That did not work. Please try again.' })
        return
      }
      setNote({ kind: d.warning ? 'err' : 'ok', text: d.warning || d.message || 'Updated.' })
      await load()
    } catch {
      setNote({ kind: 'err', text: 'Network error. Check your connection and try again.' })
    } finally {
      setBusy('')
    }
  }

  const handleConnect = async () => {
    setBusy('connect')
    setNote(null)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch(`/api/tiktok-auth?storeId=${encodeURIComponent(store.id)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const d = await r.json()
      if (!r.ok || !d?.authUrl) {
        setNote({ kind: 'err', text: d?.message || 'Could not start the TikTok connection.' })
        setBusy('')
        return
      }
      window.location.assign(d.authUrl)
    } catch {
      setNote({ kind: 'err', text: 'Network error. Check your connection and try again.' })
      setBusy('')
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect TikTok? Your videos will stop showing on your store.')) return
    await call('disconnect', 'disconnect')
  }

  const p = state.profile
  const videos = state.videos || []

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Link2 size={15} className="flex-shrink-0 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-900">Your TikTok account</h3>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
        Connect your account to show your real TikTok videos on your store page. Shoppers
        who have never bought from you trust a page with your actual posts on it more than
        one without. This reads your public profile and videos only, and cannot post
        anything or touch your ads.
      </p>

      {state.loading ? (
        <SkeletonRows count={2} />
      ) : state.configured === false ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3">
          <p className="text-[11px] leading-relaxed text-amber-800">
            TikTok connection is not switched on for Sellapage yet. It will appear here
            automatically once it is, with nothing for you to do.
          </p>
        </div>
      ) : state.connected && p ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt=""
                loading="lazy"
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
                TT
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-900">
                <span className="break-all">@{p.username || 'your account'}</span>
                {p.isVerified ? <BadgeCheck size={13} className="flex-shrink-0 text-sky-500" /> : null}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                <span><strong className="text-gray-700">{compact(p.followerCount)}</strong> followers</span>
                <span><strong className="text-gray-700">{compact(p.likesCount)}</strong> likes</span>
                <span><strong className="text-gray-700">{compact(p.videoCount)}</strong> videos</span>
              </div>
              {p.profileLink ? (
                <a
                  href={p.profileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 hover:underline"
                >
                  Open profile <ExternalLink size={9} />
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 px-3.5 py-2.5">
            <p className="text-[11px] leading-relaxed text-gray-500">
              <strong className="text-gray-700">{videos.length} video{videos.length === 1 ? '' : 's'}</strong>{' '}
              ready to show on your store.
              {videos.length === 0
                ? ' Tap Refresh to pull them in.'
                : ' Add the "TikTok videos" section in Store Design to put them on your page.'}
              {' '}Tap Refresh after you post something new; we do not pull automatically,
              so your store page stays fast.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => call('sync', 'sync')}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh videos
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-[11px] font-bold text-gray-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            >
              {busy === 'disconnect' ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {busy === 'connect' ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
          Connect TikTok account
        </button>
      )}

      {note && (
        <div
          role="status"
          className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium ${
            note.kind === 'ok'
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-red-100 bg-red-50 text-red-600'
          }`}
        >
          {note.kind === 'ok'
            ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
            : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
          <span className="leading-relaxed">{note.text}</span>
        </div>
      )}
    </div>
  )
}
