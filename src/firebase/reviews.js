// src/firebase/reviews.js
//
// Reads a store's customer reviews for the storefront.
//
// WHY THIS IS AWKWARD
// A review lives at stores/{store}/products/{product}/reviews/{review}, one
// subcollection per item, and the documents carry no storeId of their own. That
// is fine for "show me this product's reviews" and useless for "show me this
// store's reviews", which is what the designed storefront's Reviews section
// needs. A collectionGroup query cannot be filtered to one store without that
// field, so it would read every vendor's reviews on the platform.
//
// So this fans out instead, and keeps the fan-out small by using the aggregate
// the items already carry: `reviewCount` is maintained by api/submit-review on
// every write, so items with nothing to show are never read at all. A store
// with no reviews costs zero queries.

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from './config'

const MAX_ITEMS = 8
const PER_ITEM = 5

const millis = (v) => {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * The store's most recent reviews across products and services.
 *
 * `items` are the product and service documents the page already loaded, so
 * working out where to look costs no extra reads. Pass services with
 * `kind: 'service'` so the right subcollection is used.
 */
export async function fetchStoreReviews(storeId, items = [], max = 6) {
  if (!storeId) return []

  const withReviews = (items || [])
    .filter((i) => i && i.id && Number(i.reviewCount) > 0)
    .sort((a, b) => Number(b.reviewCount || 0) - Number(a.reviewCount || 0))
    .slice(0, MAX_ITEMS)

  if (!withReviews.length) return []

  const perItem = await Promise.all(
    withReviews.map(async (item) => {
      const path = item.kind === 'service' ? 'services' : 'products'
      try {
        const snap = await getDocs(
          query(
            collection(db, 'stores', storeId, path, item.id, 'reviews'),
            orderBy('createdAt', 'desc'),
            limit(PER_ITEM),
          ),
        )
        return snap.docs.map((d) => ({ id: d.id, itemName: item.name || '', ...d.data() }))
      } catch {
        // One item's reviews failing must not empty the whole section.
        return []
      }
    }),
  )

  return perItem
    .flat()
    .filter((r) => Number(r.rating) > 0)
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    .slice(0, max)
}
