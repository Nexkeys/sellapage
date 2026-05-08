import { ShoppingCart, ArrowRight, Info, MessageCircle } from 'lucide-react'

export default function OrdersTab({ store, whatsappNumber }) {
  const waNumber = whatsappNumber || store?.whatsappNumber || ''
  const waLink = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, '')}?text=Hi%2C%20I%20have%20a%20question%20about%20an%20order`
    : null

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Orders</h1>
        <p className="text-gray-400 text-sm mt-1">Track and manage all customer orders.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
          <ShoppingCart size={24} className="text-green-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Order Management — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a full order tracking system so every purchase made through your store is logged, organised, and actionable in one place.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Automatic order creation when customers place orders',
              'Order status tracking — pending, confirmed, delivered',
              'Per-order revenue and product breakdown',
              'Export orders to CSV for your records',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                <ArrowRight size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* WhatsApp current orders note */}
        <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <MessageCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 text-sm leading-relaxed">
              <span className="font-semibold">Right now, all orders come through WhatsApp.</span> When a customer taps the order button on your store, they are sent directly to your WhatsApp to complete the purchase.
            </p>
          </div>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              <MessageCircle size={14} />
              Open WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">Tip:</span> Check the <span className="font-semibold">Leads</span> tab to see customers who have clicked your order button — this is your current best view of purchase intent until full order tracking launches.
        </p>
      </div>
    </div>
  )
}