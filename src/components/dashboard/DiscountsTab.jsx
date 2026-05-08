import { Percent, ArrowRight, Info } from 'lucide-react'

export default function DiscountsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Discounts</h1>
        <p className="text-gray-400 text-sm mt-1">Create and manage discount codes for your store.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
          <Percent size={24} className="text-amber-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Discount Codes — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a discount engine so you can run promotions, reward loyal customers, and drive more sales directly from your store.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Create percentage or fixed-amount discount codes',
              'Set usage limits and expiry dates per code',
              'Automatic code application at checkout',
              'Usage analytics — see which codes drive the most orders',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                <ArrowRight size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800 text-sm leading-relaxed">
          <span className="font-semibold">For now,</span> you can offer discounts manually by agreeing a price with customers over WhatsApp before they place their order. Discount codes with automated checkout deduction are on the roadmap.
        </p>
      </div>
    </div>
  )
}