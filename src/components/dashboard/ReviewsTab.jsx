// src/components/dashboard/ReviewsTab.jsx
import { useState, useEffect } from 'react'
import { Lock, Star, ChevronDown, MessageSquare, Calendar, ShieldCheck, Layers, Loader2 } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function ReviewsTab({ store, orders, isPro, navigateTo }) {
  const [loading, setLoading] = useState(true)
  const [reviewGroups, setReviewGroups] = useState([])
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    if (!isPro) { setLoading(false); return }
    if (!store?.id) { setReviewGroups([]); setLoading(false); return }

    const load = async () => {
      setLoading(true)
      try {
        const groups = []
        // Fetch products with reviewCount > 0
        const prodQ = query(collection(db, 'stores', store.id, 'products'), where('reviewCount', '>', 0))
        const prodSnap = await getDocs(prodQ)
        for (const docItem of prodSnap.docs) {
          const data = docItem.data()
          const reviewsSnap = await getDocs(collection(db, 'stores', store.id, 'products', docItem.id, 'reviews'))
          const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
          groups.push({ itemId: docItem.id, itemName: data.name || '', itemType: 'product', avgRating: data.avgRating || 0, reviewCount: data.reviewCount || reviews.length, reviews })
        }
        // Fetch services
        const servQ = query(collection(db, 'stores', store.id, 'services'), where('reviewCount', '>', 0))
        const servSnap = await getDocs(servQ)
        for (const docItem of servSnap.docs) {
          const data = docItem.data()
          const reviewsSnap = await getDocs(collection(db, 'stores', store.id, 'services', docItem.id, 'reviews'))
          const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
          groups.push({ itemId: docItem.id, itemName: data.name || '', itemType: 'service', avgRating: data.avgRating || 0, reviewCount: data.reviewCount || reviews.length, reviews })
        }

        // Sort by reviewCount desc
        groups.sort((a,b) => (b.reviewCount || 0) - (a.reviewCount || 0))
        setReviewGroups(groups)
      } catch (err) {
        console.error('[ReviewsTab] failed to load', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [store?.id, isPro])

  // Paywall Interface - Premium Upgrade Card Block
  if (!isPro) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40 p-6 sm:p-10 text-center relative">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100/60 text-green-600 shadow-sm shadow-green-50">
            <Lock size={24} />
          </div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600 mb-1">Premium Storefront Add-on</p>
          <h2 className="font-black text-gray-900 text-xl tracking-tight mb-2">Reviews & Social Proof</h2>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-6 font-medium">
            Upgrade to Pro to receive customer reviews after confirmed deliveries. Feedback streams are automatically generated when you toggle an order to <span className="font-bold text-gray-700">Delivered</span>.
          </p>
          <button 
            onClick={() => navigateTo('billing')} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.99]"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      
      {/* Header Profile Frame */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Social Proof Channels</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Reviews</h1>
        <p className="text-xs text-gray-400 sm:text-sm">Manage user sentiment metrics and feedback workflows for your catalog.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
          <p className="text-xs font-semibold text-gray-400">Compiling customer feedback...</p>
        </div>
      ) : reviewGroups.length === 0 ? (
        /* Clean Empty Feedback State */
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 sm:p-10 text-center shadow-sm shadow-gray-100/40">
          <div className="w-14 h-14 bg-amber-50/70 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100/40 text-amber-500 shadow-sm">
            <Star size={24} fill="currentColor" />
          </div>
          <h2 className="font-black text-gray-900 text-lg tracking-tight mb-1.5">No Reviews Yet</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium">
            System channels generate evaluation loops immediately after fulfillment. Custom parameters populate once customer orders match delivery confirmations.
          </p>
        </div>
      ) : (
        /* Group Collection Node Parent Elements */
        <div className="space-y-4">
          {reviewGroups.map((g) => {
            const isGroupExpanded = expanded.has(`${g.itemType}-${g.itemId}`)
            return (
              <div 
                key={`${g.itemType}-${g.itemId}`} 
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm shadow-gray-100/40 transition-all ${
                  isGroupExpanded ? 'border-gray-200 ring-4 ring-gray-500/5' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Accordion Context Trigger Frame - Responsive Stack Split */}
                <div 
                  onClick={() => {
                    const next = new Set(expanded)
                    const key = `${g.itemType}-${g.itemId}`
                    if (next.has(key)) next.delete(key); else next.add(key)
                    setExpanded(next)
                  }}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none active:bg-gray-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Catalog metadata badge and name text parameters */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-gray-900 text-sm tracking-tight truncate max-w-[200px] sm:max-w-xs">{g.itemName}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider border whitespace-nowrap ${
                        g.itemType === 'product' 
                          ? 'bg-green-50 border-green-100 text-green-700' 
                          : 'bg-teal-50 border-teal-100 text-teal-700'
                      }`}>
                        {g.itemType === 'product' ? 'Product' : 'Service'}
                      </span>
                    </div>

                    {/* Numerical Star Cluster Line - Prevents overflow formatting breaks */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-0.5 text-amber-400 font-serif text-sm leading-none bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/40">
                        {Array.from({length: Math.round(g.avgRating || 0)}).map((_,i) => (
                          <span key={i} className="leading-none">★</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                        <span className="text-gray-800 font-black">{Number(g.avgRating).toFixed(1)}</span>
                        <span className="text-[10px] font-medium text-gray-300">|</span>
                        <span className="font-medium">({g.reviewCount} {g.reviewCount === 1 ? 'review' : 'reviews'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Arrow Chevron Node */}
                  <button 
                    type="button"
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-transform duration-200 ${
                      isGroupExpanded ? 'rotate-180 border-gray-200 text-gray-700 bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <ChevronDown size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Sub-item review records stack container */}
                {isGroupExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-4 sm:p-5 space-y-3">
                    {g.reviews.map(r => (
                      <div 
                        key={r.id} 
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5 transition-all hover:border-gray-200/80"
                      >
                        {/* Feed Review Header */}
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Nested review dynamic validation display matrix */}
                            <div className="flex items-center text-amber-400 text-xs font-serif bg-amber-50/30 px-1 py-0.5 rounded border border-amber-100/20">
                              {Array.from({length: r.rating || 0}).map((_,i) => <span key={i}>★</span>)}
                              {Array.from({length: 5 - (r.rating || 0)}).map((_,i) => <span key={`e${i}`} className="text-gray-200">☆</span>)}
                            </div>
                            <div className="font-black text-xs text-gray-900 flex items-center gap-1">
                              <span>{r.customerName || 'Customer'}</span>
                              <ShieldCheck size={12} className="text-blue-500" strokeWidth={2.5} />
                            </div>
                          </div>
                          
                          {/* Calendar evaluation timestamp node */}
                          <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 sm:self-center self-start" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            <Calendar size={11} className="text-gray-300" />
                            {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          </div>
                        </div>

                        {/* Customer feedback block statement row */}
                        <div className="bg-gray-50/60 rounded-lg p-3 border border-gray-100/50">
                          <p className="text-xs leading-relaxed text-gray-700 font-medium whitespace-pre-wrap break-words">
                            {r.reviewText || <em className="text-gray-400 font-normal">No written review provided.</em>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}