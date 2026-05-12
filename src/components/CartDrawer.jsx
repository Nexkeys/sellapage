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
}) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote]   = useState('')
  const [error, setError] = useState('')

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

    const url = buildCartOrderURL(
      whatsappNumber,
      storeName,
      cartItems,
      { name: name.trim(), phone: phone.trim(), note: note.trim() }
    )
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    /* ── Overlay ── */
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close cart"
      />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-sm md:max-w-md bg-white flex flex-col h-full shadow-2xl">

        {/* ── Section 1: Header (pinned) ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-gray-900 text-base">Your Cart</h2>
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold">
                {totalCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Section 2: Cart items (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={28} className="text-stone-300" />
              </div>
              <p className="text-stone-500 font-semibold text-sm">Your cart is empty.</p>
              <p className="text-stone-400 text-xs text-center max-w-[200px]">
                Tap "Add" on any product to start building your order.
              </p>
            </div>
          ) : (
            cartItems.map(item => {
              const lineTotal = Number(item.price) * item.quantity
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 flex items-start gap-3"
                >
                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-stone-400 text-xs mt-0.5">
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
                        className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:border-green-400 hover:text-green-600 transition-all"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:border-green-400 hover:text-green-600 transition-all"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Right: line total + remove */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-green-600 font-extrabold text-sm">
                      ₦{lineTotal.toLocaleString()}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
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
        <div className="flex-shrink-0 border-t border-stone-100 bg-white px-5 py-4 space-y-3">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-stone-500 text-sm font-medium">Subtotal</span>
            <span className="text-gray-900 font-extrabold text-base">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition-all"
            />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+234 801 234 5678 *"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition-all"
            />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any special instructions, delivery address, etc."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Send order button */}
          <button
            onClick={handleSendOrder}
            disabled={cartItems.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            <MessageCircle size={15} />
            Send Order on WhatsApp
          </button>

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