import { Star, MessageSquare } from 'lucide-react'

const REVIEWS = [
  { name: 'Chioma Okafor', product: 'Black Crop Top',       rating: 5, date: 'May 20, 2025', comment: 'Absolutely love this! The quality is amazing and it fits perfectly. Will definitely order again.' },
  { name: 'Bola Ibrahim',  product: 'High-waist Jeans',     rating: 4, date: 'May 18, 2025', comment: 'Good quality, fast delivery. The colour was exactly as shown in the photo. Very happy!' },
  { name: 'Tunde Adebayo', product: 'Floral Maxi Dress',    rating: 5, date: 'May 15, 2025', comment: 'This dress is stunning! Got so many compliments. Great packaging too.' },
  { name: 'Amaka Eze',     product: 'Oversized Hoodie',     rating: 3, date: 'May 10, 2025', comment: 'Decent product but delivery took a little longer than expected. Quality is alright.' },
  { name: 'Kola Adeyemi',  product: 'Ankara Print Blouse',  rating: 5, date: 'May 5, 2025',  comment: 'Beautiful piece! The fabric is premium and the stitching is clean. Highly recommended.' },
]

const Stars = ({ count }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={13} className={i<=count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
    ))}
  </div>
)

const avg = (REVIEWS.reduce((a,r)=>a+r.rating,0)/REVIEWS.length).toFixed(1)

export default function ReviewsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reviews</h1>
        <p className="text-gray-400 text-sm mt-1">Customer feedback and ratings for your products.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center flex-shrink-0">
          <p className="text-5xl font-extrabold text-gray-900">{avg}</p>
          <Stars count={Math.round(avg)} />
          <p className="text-gray-400 text-xs mt-1">{REVIEWS.length} reviews</p>
        </div>
        <div className="flex-1 space-y-2 w-full">
          {[5,4,3,2,1].map(star => {
            const count = REVIEWS.filter(r=>r.rating===star).length
            return (
              <div key={star} className="flex items-center gap-2.5">
                <span className="text-xs text-gray-500 font-medium w-3">{star}</span>
                <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count/REVIEWS.length)*100}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        {REVIEWS.map((r,i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{r.name[0]}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                  <p className="text-gray-400 text-xs">{r.product}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Stars count={r.rating} />
                <p className="text-gray-400 text-xs mt-1">{r.date}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">{r.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700">
        <MessageSquare size={15} className="flex-shrink-0" />
        <p><span className="font-bold">Automated review collection</span> after orders is coming in a future update.</p>
      </div>
    </div>
  )
}
