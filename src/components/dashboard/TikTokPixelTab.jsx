// src/components/dashboard/TikTokPixelTab.jsx
// TikTok Pixel setup: the vendor pastes THEIR OWN Pixel ID and we fire standard
// events from their storefront.
//
// WHY THIS SHAPE, AND NOT A TIKTOK LOGIN
// Showing ad performance inside this dashboard would need the TikTok Marketing
// API (business-api.tiktok.com), which is a different developer app from the
// one Sellapage holds, and needs Business Center onboarding, app review and a
// data-security compliance audit. Sellapage's TikTok app currently carries
// Login Kit scopes only (user.info.basic, user.info.profile, user.info.stats,
// video.list) and cannot touch ads at all.
//
// Having each vendor supply their own Pixel ID sidesteps that entirely: the
// pixel belongs to their own TikTok Ads Manager, so nothing here depends on
// Sellapage's TikTok standing. Their numbers appear in their own Events Manager
// and Ads Manager, which is where an advertiser is looking anyway. This is the
// same reasoning MetaPixelTab.jsx already runs on, for the same reason.
//
// TikTok Ads Manager is live in Nigeria and bills in Naira, so every vendor on
// this platform can actually use this today. That is not true of TikTok Shop,
// which has no Nigerian market.
//
// A Pixel ID is NOT a secret. It is visible in the page source of every site
// that uses one, which is why it lives on the public store document, exactly
// like metaPixelId. The Events API access token is a different matter entirely
// and never goes here.
import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Save, CheckCircle2, AlertCircle, ExternalLink, Lock, CreditCard,
  Activity, ShieldCheck, Trash2,
} from 'lucide-react'
import { updateStore, auth } from '../../firebase/auth'
import { isValidTikTokPixelId } from '../../utils/tiktokPixel'
import { SkeletonRows } from '../Skeleton'
import TikTokAccountPanel from './TikTokAccountPanel'

// What the storefront actually sends. CompletePayment is TikTok's purchase
// event: without it TikTok cannot optimise a campaign for sales at all, which
// is worth stating plainly to a vendor deciding whether this is worth doing.
const EVENTS = [
  ['PageView', 'Someone opens your store'],
  ['ViewContent', 'Someone opens a product'],
  ['AddToCart', 'Someone adds to cart'],
  ['InitiateCheckout', 'Someone starts checkout'],
  ['CompletePayment', 'An order is paid for, with the amount'],
]

export default function TikTokPixelTab({ store, isPremium, navigateTo }) {
  const [pixelId, setPixelId] = useState(store?.tiktokPixelId || '')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  // Server-side Events API. Its own state, because the token never round-trips:
  // the server only ever tells us whether one is set.
  const [tokenStatus, setTokenStatus] = useState({ loading: true, hasToken: false })
  const [tokenInput, setTokenInput] = useState('')
  const [tokenSaving, setTokenSaving] = useState(false)
  const [tokenResult, setTokenResult] = useState(null)

  const loadTokenStatus = useCallback(async () => {
    if (!isPremium || !store?.id) {
      setTokenStatus({ loading: false, hasToken: false })
      return
    }
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch(`/api/tiktok-events-config?action=get&storeId=${encodeURIComponent(store.id)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const d = await r.json()
      setTokenStatus({ loading: false, hasToken: !!d?.hasToken })
    } catch {
      // Showing "not connected" is the honest fallback: it never claims tracking
      // is live when we could not confirm it.
      setTokenStatus({ loading: false, hasToken: false })
    }
  }, [isPremium, store?.id])

  useEffect(() => { loadTokenStatus() }, [loadTokenStatus])

  const handleTokenSave = async () => {
    setTokenSaving(true)
    setTokenResult(null)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch('/api/tiktok-events-config?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ storeId: store.id, eventsToken: tokenInput }),
      })
      const d = await r.json()
      if (!r.ok || !d?.success) {
        setTokenResult({ kind: 'err', text: d?.message || 'Could not save. Please try again.' })
        return
      }
      setTokenInput('')
      setTokenStatus({ loading: false, hasToken: true })
      setTokenResult({ kind: 'ok', text: d.message })
    } catch {
      setTokenResult({ kind: 'err', text: 'Network error. Check your connection and try again.' })
    } finally {
      setTokenSaving(false)
    }
  }

  const handleTokenClear = async () => {
    if (!window.confirm('Remove the server-side token? Only the browser pixel will send events after this.')) return
    setTokenSaving(true)
    setTokenResult(null)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const r = await fetch('/api/tiktok-events-config?action=clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ storeId: store.id }),
      })
      const d = await r.json()
      if (!r.ok || !d?.success) {
        setTokenResult({ kind: 'err', text: d?.message || 'Could not remove. Please try again.' })
        return
      }
      setTokenStatus({ loading: false, hasToken: false })
      setTokenResult({ kind: 'ok', text: d.message })
    } catch {
      setTokenResult({ kind: 'err', text: 'Network error. Check your connection and try again.' })
    } finally {
      setTokenSaving(false)
    }
  }

  const handleSave = async () => {
    const trimmed = pixelId.trim().toUpperCase()
    if (trimmed && !isValidTikTokPixelId(trimmed)) {
      setResult({
        kind: 'err',
        text: `That does not look like a Pixel ID. TikTok pixel IDs are exactly 20 letters and numbers, like CQVQ8SRC77U1TC4TQD5G. You entered ${trimmed.length} character${trimmed.length === 1 ? '' : 's'}.`,
      })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      await updateStore(store.id, { tiktokPixelId: trimmed })
      setResult({
        kind: 'ok',
        text: trimmed
          ? 'Saved. Your pixel is now live on your store.'
          : 'Pixel removed. Nothing is being tracked.',
      })
    } catch {
      setResult({ kind: 'err', text: 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <Lock size={20} className="text-gray-400" />
        </div>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Premium Only</p>
        <h3 className="mb-2 text-base font-bold text-gray-900">TikTok Pixel</h3>
        <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
          Track which TikTok ads actually lead to sales, so you stop paying for
          the ones that do not.
        </p>
        <button
          type="button"
          onClick={() => navigateTo?.('billing')}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-700"
        >
          <CreditCard size={13} /> Upgrade to Premium
        </button>
      </div>
    )
  }

  const connected = !!store?.tiktokPixelId

  return (
    <div className="space-y-4">
      {/* Account connection. First because it is the part a vendor recognises:
          "show my TikTok on my store" needs no explanation, whereas a pixel
          does. The tracking below is the part that actually makes their ad
          money work, but it is not the part that gets them to read the page. */}
      <TikTokAccountPanel store={store} />

      {/* Status */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${connected ? 'bg-green-50' : 'bg-gray-100'}`}>
            <Activity size={15} className={connected ? 'text-green-600' : 'text-gray-400'} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {connected ? 'Pixel is live on your store' : 'No pixel connected yet'}
            </p>
            <p className="break-words text-[11px] text-gray-400">
              {connected
                ? `ID ${store.tiktokPixelId}. Events are being sent to your TikTok account.`
                : 'Follow the steps below to get your Pixel ID from TikTok.'}
            </p>
          </div>
        </div>
      </div>

      {/* The guide. Written for someone who has never opened TikTok Events
          Manager, because most vendors have not. Every step names exactly what
          they will see on screen, since TikTok's own wording shifts between
          account types and regions. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="mb-1 text-sm font-bold text-gray-900">How to get your Pixel ID</h3>
        <p className="mb-4 text-[11px] text-gray-400">
          You only do this once. It takes about five minutes and is completely free.
        </p>

        <ol className="space-y-3.5">
          {[
            {
              t: 'Open TikTok Ads Manager',
              d: (
                <>
                  Go to{' '}
                  <a
                    href="https://ads.tiktok.com/i18n/events_manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-green-600 hover:underline"
                  >
                    ads.tiktok.com <ExternalLink size={10} />
                  </a>
                  {' '}and sign in. If you have never run a TikTok ad before, it will ask
                  you to create an advertiser account first. That is free, and Nigeria is
                  supported, so you can pay for ads in Naira later.
                </>
              ),
            },
            {
              t: 'Open Events Manager',
              d: 'In the top menu choose Tools, then Events. TikTok may call this "Events Manager" or "Web Events" depending on your account.',
            },
            {
              t: 'Create a web event set',
              d: 'Click "Connect Data Source", choose "Web", then "TikTok Pixel". Give it your business name.',
            },
            {
              t: 'Choose "Manually install pixel code"',
              d: 'TikTok will offer a partner integration and a manual option. Pick manual. You do not need to copy any code. We only need the ID.',
            },
            {
              t: 'Copy the Pixel ID',
              d: 'It sits at the top of the pixel’s page and is exactly 20 letters and numbers, for example CQVQ8SRC77U1TC4TQD5G. Copy that only, no quotes, no code.',
            },
            {
              t: 'Paste it below and save',
              d: 'That is it. Your store starts sending events to TikTok straight away.',
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">{step.t}</p>
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-gray-500">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-800">
            <strong>Do not paste the whole code snippet.</strong> TikTok shows a block of
            JavaScript on that page. Ignore it. We only need the ID, and pasting
            the code will not work.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div>
          <label htmlFor="tiktok-pixel-id" className="mb-1.5 block text-xs font-bold text-gray-700">
            Your TikTok Pixel ID
          </label>
          <input
            id="tiktok-pixel-id"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            value={pixelId}
            onChange={(e) => {
              setPixelId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))
              setResult(null)
            }}
            placeholder="CQVQ8SRC77U1TC4TQD5G"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 outline-none transition-all placeholder:font-sans placeholder:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Letters and numbers only, 20 characters. Leave this empty and save to stop tracking.
          </p>
        </div>

        {result && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium ${
              result.kind === 'ok'
                ? 'border-green-100 bg-green-50 text-green-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {result.kind === 'ok'
              ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
              : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
            <span className="leading-relaxed">{result.text}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save pixel
        </button>
      </div>

      {/* Server-side tracking. Optional, and clearly framed as the thing that
          makes the numbers accurate rather than another mandatory setup step. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck size={15} className="flex-shrink-0 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Server-side tracking</h3>
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
            Optional
          </span>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
          The pixel above runs in your customer&apos;s browser, so ad blockers, the
          in-app browsers inside TikTok and Instagram, and anyone who closes the tab
          after paying all cost you a sale TikTok never hears about. Adding this token
          means we also confirm every paid order from our own server, where nothing can
          block it. Same order, counted once, not twice.
        </p>

        {tokenStatus.loading ? (
          <SkeletonRows count={2} />
        ) : !connected ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
            <p className="text-[11px] leading-relaxed text-gray-500">
              Add your Pixel ID above first. This token attaches to that pixel, so it has
              nothing to send to on its own.
            </p>
          </div>
        ) : tokenStatus.hasToken ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50 px-3.5 py-3">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-800">Server-side tracking is on</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-green-700">
                  Paid orders are confirmed to TikTok from our server as well as the browser.
                  Your token is stored privately and is never shown again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTokenClear}
              disabled={tokenSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            >
              {tokenSaving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Remove token
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="space-y-2">
              {[
                'In TikTok Events Manager, open the same pixel you used above.',
                'Go to the Settings tab and scroll to "Events API".',
                'Click "Generate Access Token" and copy it straight away. TikTok hides it once you refresh the page.',
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-600">
                    {i + 1}
                  </span>
                  <p className="min-w-0 break-words text-[11px] leading-relaxed text-gray-500">{step}</p>
                </li>
              ))}
            </ol>

            <div>
              <label htmlFor="tiktok-events-token" className="mb-1.5 block text-xs font-bold text-gray-700">
                Events API access token
              </label>
              <input
                id="tiktok-events-token"
                type="password"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setTokenResult(null) }}
                placeholder="Paste the token from TikTok"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 outline-none transition-all placeholder:font-sans placeholder:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Stored privately on our server. It is never sent back to this page or shown again.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTokenSave}
              disabled={tokenSaving || !tokenInput.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-40"
            >
              {tokenSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save token
            </button>
          </div>
        )}

        {tokenResult && (
          <div
            role="status"
            className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium ${
              tokenResult.kind === 'ok'
                ? 'border-green-100 bg-green-50 text-green-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {tokenResult.kind === 'ok'
              ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
              : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
            <span className="leading-relaxed">{tokenResult.text}</span>
          </div>
        )}
      </div>

      {/* What gets sent. Vendors ask, and it also sets the expectation that the
          numbers appear in TikTok rather than here. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="mb-2.5 text-sm font-bold text-gray-900">What your store sends to TikTok</h3>
        <div className="space-y-1.5">
          {EVENTS.map(([name, desc]) => (
            <div key={name} className="flex items-start justify-between gap-3 text-[11px]">
              <span className="font-mono font-bold text-gray-700">{name}</span>
              <span className="text-right text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
          These appear in your own TikTok Events Manager and Ads Manager, not here. That is
          where you build audiences and see which ads actually produced sales.
          <span className="mt-1.5 block">
            <strong className="text-gray-500">CompletePayment</strong> is the important one:
            without it TikTok cannot learn which people are likely to buy, so your ads keep
            showing to people who only scroll.
          </span>
        </p>
      </div>
    </div>
  )
}
