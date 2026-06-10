// src/components/CartDrawer.jsx
import { useState } from 'react'
import { X, Trash2, ShoppingBag, MessageCircle, Plus, Minus } from 'lucide-react'
import { buildCartOrderURL } from '../utils/whatsapp'

export default function CartDrawer({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClose,
  whatsappNumber,
  storeName,
  activeThemeObj = null,
  onProceedToCheckout,
}) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote]   = useState('')
  const [error, setError] = useState('')

  const allServices = cartItems.length > 0 && cartItems.every(item => item.type === 'service')
  const hasServices = cartItems.some(item => item.type === 'service')

  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  )

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleSendOrder = () => {
    if (!name.trim() || !phone.trim()) {
      setError('Please enter your name and phone number before sending.')
      return
    }
    setError('')

    const bookingNote = allServices && (bookingDate || bookingTime)
      ? `Preferred booking: ${bookingDate || 'Date TBD'} at ${bookingTime || 'Time TBD'}`
      : note.trim()

    const url = buildCartOrderURL(
      whatsappNumber,
      storeName,
      cartItems,
      { name: name.trim(), phone: phone.trim(), note: bookingNote }
    )
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const cardBg = activeThemeObj?.defaultColors?.card || '#ffffff'
  const bgCol = activeThemeObj?.defaultColors?.background || '#f9fafb'
  const textCol = activeThemeObj?.defaultColors?.text || '#111827'
  const primaryCol = activeThemeObj?.defaultColors?.primary || '#16a34a'
  const fontFam = activeThemeObj?.typography?.bodyFontFamily

  return (
    /* ── Overlay ── */
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close cart"
      />

      {/* Drawer panel */}
      <div 
        className="relative z-10 w-full max-w-sm md:max-w-md flex flex-col h-full shadow-2xl transition-all"
        style={{ backgroundColor: bgCol, color: textCol, fontFamily: fontFam }}
      >

        {/* ── Section 1: Header (pinned) ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-base" style={{ fontFamily: activeThemeObj?.typography?.headerFontFamily }}>Your Cart</h2>
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: primaryCol }}>
                {totalCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 opacity-60 hover:opacity-100 rounded-xl transition-all"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Section 2: Cart items (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 opacity-70">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <ShoppingBag size={28} />
              </div>
              <p className="font-semibold text-sm">Your cart is empty.</p>
              <p className="text-xs text-center max-w-[200px] opacity-75">
                Tap "Add" on any product to start building your order.
              </p>
            </div>
          ) : (
            cartItems.map(item => {
              const lineTotal = Number(item.price) * item.quantity
              return (
                <div
                  key={item.id}
                  className={`p-3 flex items-start gap-3 ${activeThemeObj?.internalTabShellStyle?.cardClasses || 'bg-white rounded-2xl border border-stone-100 shadow-sm'}`}
                  style={activeThemeObj?.internalTabShellStyle?.cardClasses ? {} : { backgroundColor: cardBg }}
                >
                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-xs mt-0.5 opacity-60">
                      ₦{Number(item.price).toLocaleString()} each
                    </p>
                    {/* Quantity adjuster */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (item.quantity - 1 < 1) {
                            onRemoveItem(item.id)
                          } else {
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                        }}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center opacity-60 hover:opacity-100 transition-all"
                        style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center opacity-60 hover:opacity-100 transition-all"
                        style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Right: line total + remove */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="font-extrabold text-sm" style={{ color: primaryCol }}>
                      ₦{lineTotal.toLocaleString()}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Section 3: Checkout form + order button (pinned bottom) ── */}
        <div className="flex-shrink-0 border-t px-5 py-4 space-y-3" style={{ borderColor: 'rgba(0,0,0,0.05)', backgroundColor: bgCol }}>
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-70">Subtotal</span>
            <span className="font-extrabold text-base">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>

          {/* Customer details form */}
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name *"
              className="w-full px-3.5 py-2.5 rounded-xl border border-transparent outline-none transition-all"
              style={{ backgroundColor: cardBg, color: textCol }}
            />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+234 801 234 5678 *"
              className="w-full px-3.5 py-2.5 rounded-xl border border-transparent outline-none transition-all"
              style={{ backgroundColor: cardBg, color: textCol }}
            />
            {allServices ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold opacity-60">Preferred Date & Time</p>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-transparent outline-none transition-all text-sm"
                  style={{ backgroundColor: cardBg, color: textCol }}
                />
                <input
                  type="time"
                  value={bookingTime}
                  onChange={e => setBookingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-transparent outline-none transition-all text-sm"
                  style={{ backgroundColor: cardBg, color: textCol }}
                />
              </div>
            ) : (
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={hasServices ? "Delivery address or booking notes..." : "Any special instructions..."}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-transparent outline-none transition-all resize-none"
                style={{ backgroundColor: cardBg, color: textCol }}
              />
            )}
          </div>

          {/* Checkout / WhatsApp CTA */}
          {onProceedToCheckout ? (
            <button
              onClick={onProceedToCheckout}
              disabled={cartItems.length === 0}
              className={`w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm transition-all shadow-sm ${activeThemeObj?.structuralStyle?.buttonClasses || 'bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold'}`}
            >
              Proceed to Checkout
            </button>
          ) : (
            <button
              onClick={handleSendOrder}
              disabled={cartItems.length === 0}
              className={`w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm transition-all shadow-sm ${activeThemeObj?.structuralStyle?.buttonClasses || 'bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold'}`}
            >
              <MessageCircle size={15} />
              Send Order on WhatsApp
            </button>
          )}

          {/* Validation error */}
          {error && (
            <p className="text-red-500 text-xs font-medium text-center -mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
