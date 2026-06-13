// src/components/dashboard/ReviewsTab.jsx/
import { useState, useEffect } from 'react'
import { Lock, Star, ChevronDown } from 'lucide-react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
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

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-green-500" />
          </div>
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Reviews — Pro Feature</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto mb-5">Upgrade to Pro to receive customer reviews after confirmed deliveries. Reviews are automatically requested when you mark an order as Delivered in your Orders tab.</p>
          <button onClick={() => navigateTo('billing')} className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Upgrade to Pro</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reviews</h1>
        <p className="text-gray-400 text-sm mt-1">Customer feedback and ratings for your products and services.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviewGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={24} className="text-amber-400" />
          </div>
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">No reviews yet</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">Reviews appear here automatically after customers mark their delivered orders. The review link is sent by email when you mark an order as Delivered in your Orders tab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewGroups.map((g) => (
            <div key={`${g.itemType}-${g.itemId}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 text-sm">{g.itemName}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${g.itemType === 'product' ? 'bg-green-500' : 'bg-teal-500'}`}>{g.itemType === 'product' ? 'Product' : 'Service'}</span>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="flex items-center gap-0.5 text-amber-400">{Array.from({length: Math.round(g.avgRating || 0)}).map((_,i) => <span key={i}>★</span>)}</div>
                      <div className="text-sm font-bold text-gray-800 ml-2">{Number(g.avgRating).toFixed(1)}</div>
                      <div className="text-sm text-gray-400">({g.reviewCount} reviews)</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => {
                  const next = new Set(expanded)
                  const key = `${g.itemType}-${g.itemId}`
                  if (next.has(key)) next.delete(key); else next.add(key)
                  setExpanded(next)
                }} className="text-gray-400 hover:text-gray-600"><ChevronDown /></button>
              </div>

              {expanded.has(`${g.itemType}-${g.itemId}`) && (
                <div className="mt-3 space-y-3">
                  {g.reviews.map(r => (
                    <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-amber-400">{Array.from({length: r.rating || 0}).map((_,i) => <span key={i}>★</span>)}{Array.from({length: 5 - (r.rating || 0)}).map((_,i) => <span key={`e${i}`}>☆</span>)}</div>
                            <div className="font-semibold text-sm text-gray-900 ml-2">{r.customerName || 'Customer'}</div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{r.reviewText || <em className="text-gray-400">No written review</em>}</p>
                        </div>
                        <div className="text-xs text-gray-400">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}