// src/components/dashboard/MobileAppTab.jsx
//
// The Sellapage Android app is live on Google Play, so this tab leads with the
// real download instead of the old "add this website to your home screen"
// instructions.
//
// THE PWA SECTION STAYS, deliberately. There is no iPhone app yet, and telling
// an iPhone vendor "coming soon" and nothing else would take away the only way
// they currently have to get Sellapage onto their home screen.
//
// The QR code is generated in the browser from the store URL constant, so a
// vendor reading this on a laptop can install on their phone without typing a
// link. Same `qrcode` dynamic import OnlineStoreTab already uses: it stays out
// of the main bundle until someone actually asks for a code.
import { useState } from 'react'
import {
  Smartphone, QrCode, Loader2, Copy, Check, Apple, Bell, Receipt, Wallet, ClipboardList,
} from 'lucide-react'
import SellaLogo from '../SellaLogo'
import PlayStoreBadge, { PLAY_STORE_URL } from '../PlayStoreBadge'

const FEATURES = [
  { Icon: Wallet, title: "Today's sales at a glance", body: 'What came in today, and what customers still owe you.' },
  { Icon: ClipboardList, title: 'Orders in your pocket', body: 'Confirm, track and update orders while you are out.' },
  { Icon: Receipt, title: 'Record a sale, send a receipt', body: 'Log a walk in sale and send the receipt on WhatsApp.' },
  { Icon: Bell, title: 'Know the moment an order lands', body: 'A push alert the second a customer pays.' },
  { Icon: SellaLogo, title: 'Ask Sella', body: 'Your business partner, in the app with your store data.' },
]

export default function MobileAppTab() {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [qrGenerating, setQrGenerating] = useState(false)
  const [qrError, setQrError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateQr = async () => {
    setQrGenerating(true)
    setQrError('')
    try {
      const QRCode = await import('qrcode')
      const dataUrl = await QRCode.toDataURL(PLAY_STORE_URL, {
        width: 256,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      setQrError('Could not generate the QR code. Please try again.')
    } finally {
      setQrGenerating(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(PLAY_STORE_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setQrError('Could not copy the link. Long press it instead.')
    }
  }

  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Mobile App</h1>
        <p className="text-gray-400 text-xs mt-0.5">Run your business from your phone.</p>
      </div>

      {/* ── Download ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-100">
            <Smartphone size={28} className="text-white" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">The Sellapage app is out on Android</h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                Live
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Install it free from Google Play and your whole dashboard travels with you.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <PlayStoreBadge />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>

        {/* QR: for a vendor reading this on a laptop. */}
        <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
          {qrDataUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={qrDataUrl}
                alt="QR code linking to the Sellapage app on Google Play"
                className="w-32 h-32 rounded-xl border border-gray-100 flex-shrink-0 mx-auto sm:mx-0"
              />
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-sm font-bold text-gray-900">Scan with your phone camera</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  It opens the Sellapage listing on Google Play. Android phones only for now.
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateQr}
              disabled={qrGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 px-4 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
            >
              {qrGenerating ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
              {qrGenerating ? 'Making the code...' : 'Show a QR code to scan'}
            </button>
          )}
          {qrError && <p className="text-red-600 text-xs mt-2">{qrError}</p>}
        </div>
      </div>

      {/* ── What it does ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-xs">What you can do in the app</p>
        </div>
        <div className="divide-y divide-gray-50">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">{title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── iPhone ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Apple size={16} className="text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900">On iOS? The app is coming</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            The iOS version is not out yet. Until it is, add Sellapage to your home screen with the
            steps below and it opens fullscreen like an app.
          </p>
        </div>
      </div>

      {/* ── Home screen fallback ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-xs">Add the dashboard to your home screen</p>
          <p className="text-gray-400 text-[11px] mt-0.5">Works on any phone, no download needed.</p>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-gray-900">iOS, in Safari</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Tap Share at the bottom, scroll down, then tap Add to Home Screen.
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-gray-900">Android, in Chrome</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Tap the three dots at the top right, then tap Add to Home screen. The Play Store app above
              gives you more, including push alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
