// src/components/dashboard/WhatsAppReminderModal.jsx
// Composes a WhatsApp recovery message and hands it to the vendor's own
// WhatsApp via a wa.me link.
//
// WHY A DEEP LINK AND NOT AN API
// The WhatsApp Business API needs Meta approval, which Sellapage does not
// currently have. A wa.me link needs nothing: no API, no approval, no cost, no
// per-message billing. The message is sent by the vendor, from their own number,
// which is also what a customer expects to receive.
//
// The honest limits, reflected in the UI rather than hidden:
//   - We cannot confirm the message was actually sent, only that WhatsApp opened.
//   - We cannot enforce the 24 hour throttle that protects customers on the email
//     path, because nothing passes through our server.
import { useState, useMemo } from 'react'
import { X, MessageCircle, Copy, Check } from 'lucide-react'

/**
 * Nigerian numbers arrive in several shapes. wa.me needs an international
 * number with no plus and no separators.
 */
function toWaNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('234') && digits.length === 13) return digits
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  // Already international for some other country, or unusable. Long enough to
  // be worth trying; anything shorter is not a phone number.
  return digits.length >= 11 ? digits : null
}

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`

/**
 * Three tones rather than one. Vendors freeze on wording, and "what do I even
 * say" is the actual reason a reminder never gets sent.
 */
function buildTemplates({ firstName, storeName, items, total, points }) {
  const itemLine = items || 'your order'
  const incentive = points > 0
    ? ` You will also earn ${points} loyalty point${points === 1 ? '' : 's'} on it.`
    : ''

  return [
    {
      id: 'friendly',
      label: 'Friendly',
      text: `Hi ${firstName}, this is ${storeName}. I noticed you started an order for ${itemLine} (${total}) but did not finish checking out. Is there anything I can help with?${incentive}`,
    },
    {
      id: 'short',
      label: 'Short',
      text: `Hi ${firstName}, your order for ${itemLine} (${total}) is still waiting at ${storeName}. Would you like to complete it?`,
    },
    {
      id: 'helpful',
      label: 'Offer help',
      text: `Hello ${firstName}, ${storeName} here. Your ${itemLine} order (${total}) did not go through. If you had trouble with payment or delivery, let me know and I will sort it out for you.${incentive}`,
    },
  ]
}

export default function WhatsAppReminderModal({ checkout, store, onClose, onSent }) {
  const waNumber = toWaNumber(checkout?.customerPhone)

  const templates = useMemo(() => buildTemplates({
    firstName: (checkout?.customerName || '').split(' ')[0] || 'there',
    storeName: store?.businessName || store?.storeName || 'our store',
    items: checkout?.itemSummary,
    total: naira(checkout?.grandTotal),
    // Only mentioned when the store actually runs loyalty. Promising points a
    // vendor never configured would be inventing an offer on their behalf.
    points: store?.loyaltyEnabled === true
      ? Math.floor((Number(checkout?.grandTotal) || 0) / (Number(store?.loyaltyEarnRate) || 100))
      : 0,
  }), [checkout, store])

  const [selected, setSelected] = useState(templates[0].id)
  const [message, setMessage] = useState(templates[0].text)
  const [copied, setCopied] = useState(false)

  const pickTemplate = (t) => {
    setSelected(t.id)
    setMessage(t.text)
  }

  const handleOpen = () => {
    if (!waNumber) return
    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    )
    onSent?.()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked. The textarea is selectable, so this is not fatal.
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-[#25D366]" />
            <p className="text-sm font-bold text-gray-900">Message on WhatsApp</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {checkout?.customerName || 'Customer'}
            </p>
            <p className="text-xs text-gray-400">{checkout?.customerPhone || 'No phone number'}</p>
          </div>

          {!waNumber ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
              This customer did not leave a usable phone number, so WhatsApp is not
              available for them. You can still send the email reminder.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Pick a tone, then edit freely</p>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                        selected === t.id
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">{message.length} characters</p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-green-600"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy text'}
                  </button>
                </div>
              </div>

              {/* Stated plainly rather than buried. A vendor who thinks this is
                  tracked and throttled like the email will misjudge how often
                  they are contacting someone. */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5">
                <p className="text-[11px] leading-relaxed text-gray-500">
                  This opens WhatsApp with the message ready. You still press send there.
                  We cannot confirm delivery, and unlike the email reminder there is no
                  24 hour limit, so please do not message the same person repeatedly.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleOpen}
            disabled={!waNumber}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-all hover:bg-[#1fba5a] disabled:bg-gray-200 disabled:text-gray-400"
          >
            <MessageCircle size={15} />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
