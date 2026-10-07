// src/utils/storeShare.js
//
// Counts each time a vendor copies or shares their store link (from
// 2026-10-06). It feeds "Shared the store" in the Ops console's Growth tab:
//   stores/{id}.shareCount, .lastSharedAt, .shareChannels.{channel}
// Fire and forget: a failed count must never get in the way of sharing, and
// staff accounts without write access to the store just do not count.
import { doc, increment, serverTimestamp } from 'firebase/firestore'
import { updateDoc } from '../firebase/metered'
import { db } from '../firebase/config'

const CHANNELS = new Set(['copy', 'whatsapp', 'x', 'qr', 'poster', 'product', 'guide', 'settings', 'celebration'])
let lastAt = 0

export function trackStoreShare(storeId, channel = 'copy') {
  if (!storeId) return
  const now = Date.now()
  if (now - lastAt < 2000) return // a double click is one share
  lastAt = now
  const key = CHANNELS.has(channel) ? channel : 'copy'
  updateDoc(doc(db, 'stores', storeId), {
    shareCount: increment(1),
    lastSharedAt: serverTimestamp(),
    [`shareChannels.${key}`]: increment(1),
  }).catch(() => { /* not counted, sharing still works */ })
}
