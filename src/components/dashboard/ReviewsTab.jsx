import { Star, ArrowRight, Info } from 'lucide-react'

export default function ReviewsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reviews</h1>
        <p className="text-gray-400 text-sm mt-1">Customer feedback and ratings for your products.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
          <Star size={24} className="text-amber-400" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Product Reviews — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a reviews system so verified buyers can leave ratings on your products, helping future customers shop with confidence.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Automatic review requests sent after confirmed orders',
              'Star ratings and written feedback per product',
              'Reviews displayed publicly on your store page',
              'Reply to reviews directly from your dashboard',
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
          <span className="font-semibold">In the meantime,</span> ask happy customers to send you a voice note or text on WhatsApp after their purchase — you can share these as testimonials in your product descriptions or on social media.
        </p>
      </div>
    </div>
  )
}