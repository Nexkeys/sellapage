// src/components/dashboard/marketing/MetaPixelTab.jsx
// Meta Pixel setup: the vendor pastes THEIR OWN Pixel ID and we fire standard
// events from their storefront.
//
// WHY THIS SHAPE, AND NOT A META LOGIN
// Showing ad performance inside this dashboard would need the Meta Marketing
// API, which needs Meta business verification. Sellapage is blocked on exactly
// that. Having each vendor supply their own Pixel ID sidesteps it entirely:
// their pixel belongs to their own Business Manager, so nothing here depends on
// Sellapage's Meta standing. Their numbers appear in their own Ads Manager,
// which is where an advertiser is looking anyway.
//
// A Pixel ID is NOT a secret. It is visible in the page source of every site
// that uses one, which is why it lives on the public store document.
import { useState } from 'react'
import {
  Loader2, Save, CheckCircle2, AlertCircle, ExternalLink, Lock, CreditCard,
  Activity,
} from 'lucide-react'
import { updateStore } from '../../firebase/auth'

// Meta pixel ids are 15 or 16 digits and never start with a zero.
//
// This was originally /^\d{10,20}$/, which was too loose: a mistyped 20 digit
// value saved happily, the dashboard reported "pixel is live", and the only
// symptom was an Events Manager that stayed empty forever with nothing
// explaining why. Validating the real shape turns a silent dead end into an
// error at the moment of pasting.
const PIXEL_ID_RE = /^[1-9]\d{14,15}$/

const EVENTS = [
  ['PageView', 'Someone opens your store'],
  ['ViewContent', 'Someone opens a product'],
  ['AddToCart', 'Someone adds to cart'],
  ['InitiateCheckout', 'Someone starts checkout'],
  ['Purchase', 'An order is paid for, with the amount'],
]

export default function MetaPixelTab({ store, isPremium, navigateTo }) {
  const [pixelId, setPixelId] = useState(store?.metaPixelId || '')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const handleSave = async () => {
    const trimmed = pixelId.trim()
    if (trimmed && !PIXEL_ID_RE.test(trimmed)) {
      setResult({
        kind: 'err',
        text: `That does not look like a Pixel ID. Meta pixel IDs are 15 or 16 digits and do not start with 0. You entered ${trimmed.length} digits.`,
      })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      await updateStore(store.id, { metaPixelId: trimmed })
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
        <h3 className="mb-2 text-base font-bold text-gray-900">Meta Pixel</h3>
        <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
          Track which Facebook and Instagram ads actually lead to sales, so you stop
          paying for the ones that do not.
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

  const connected = !!store?.metaPixelId

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${connected ? 'bg-green-50' : 'bg-gray-100'}`}>
            <Activity size={15} className={connected ? 'text-green-600' : 'text-gray-400'} />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {connected ? 'Pixel is live on your store' : 'No pixel connected yet'}
            </p>
            <p className="text-[11px] text-gray-400">
              {connected
                ? `ID ${store.metaPixelId}. Events are being sent to your Meta account.`
                : 'Follow the steps below to get your Pixel ID from Meta.'}
            </p>
          </div>
        </div>
      </div>

      {/* The guide. Written for someone who has never opened Events Manager,
          because most vendors have not. Every step names exactly what they will
          see on screen, since Meta's own wording changes between accounts. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">How to get your Pixel ID</h3>
        <p className="text-[11px] text-gray-400 mb-4">
          You only do this once. It takes about five minutes and is completely free.
        </p>

        <ol className="space-y-3.5">
          {[
            {
              t: 'Open Meta Events Manager',
              d: (
                <>
                  Go to{' '}
                  <a
                    href="https://business.facebook.com/events_manager2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-600 hover:underline inline-flex items-center gap-1"
                  >
                    business.facebook.com/events_manager2 <ExternalLink size={10} />
                  </a>
                  {' '}and sign in with the Facebook account that runs your business page.
                </>
              ),
            },
            {
              t: 'Create a dataset if you do not have one',
              d: 'Click "Connect data sources", choose "Web", then "Connect". Meta may call this a "Pixel" or a "Dataset". They are the same thing. Give it your business name.',
            },
            {
              t: 'Choose "Install code manually"',
              d: 'If Meta offers a partner integration or asks you to install code, pick the manual option. You do not need to copy any code. We only need the ID number.',
            },
            {
              t: 'Copy the ID number',
              d: 'Your Pixel ID sits under the dataset name in Events Manager, and is around 15 digits, for example 1234567890123456. Copy the numbers only, no letters, no quotes, no code.',
            },
            {
              t: 'Paste it below and save',
              d: 'That is it. Your store starts sending events to Meta straight away.',
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">{step.t}</p>
                <p className="text-[11px] leading-relaxed text-gray-500 mt-0.5">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-800">
            <strong>Do not paste the whole code snippet.</strong> Meta shows a block of
            JavaScript on that page. Ignore it. We only need the number, and pasting
            the code will not work.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Your Meta Pixel ID</label>
          <input
            type="text"
            inputMode="numeric"
            value={pixelId}
            onChange={(e) => { setPixelId(e.target.value.replace(/[^\d]/g, '').slice(0, 20)); setResult(null) }}
            placeholder="1234567890123456"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono text-gray-900 outline-none transition-all placeholder:text-gray-300 placeholder:font-sans focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Numbers only. Leave this empty and save to stop tracking.
          </p>
        </div>

        {result && (
          <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium ${
            result.kind === 'ok'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {result.kind === 'ok'
              ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
              : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{result.text}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save pixel
        </button>
      </div>

      {/* What gets sent. Vendors ask, and it also sets the expectation that the
          numbers appear in Meta rather than here. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2.5">What your store sends to Meta</h3>
        <div className="space-y-1.5">
          {EVENTS.map(([name, desc]) => (
            <div key={name} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-mono font-bold text-gray-700">{name}</span>
              <span className="text-gray-400 text-right">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
          These appear in your own Meta Events Manager and Ads Manager, not here. That is
          where you build audiences and see which ads actually produced sales.
        </p>
      </div>
    </div>
  )
}
