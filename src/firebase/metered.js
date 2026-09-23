// src/firebase/metered.js
//
// Drop-in replacements for getDocs, getDoc and onSnapshot that count what they
// read before handing the result back unchanged.
//
// WHY
// Most of this platform's Firestore reads happen in the visitor's browser, not
// on the server: every storefront view and every dashboard tab. The server-side
// meter (api-handlers/_lib/usage-meter.js) cannot see any of it, so a count
// without this half would report a fraction of the day's usage and read as
// "plenty of quota left" on the afternoon the platform runs out.
//
// HOW TO USE
// Change the import, nothing else:
//   -import { getDocs, collection } from 'firebase/firestore'
//   +import { collection } from 'firebase/firestore'
//   +import { getDocs } from './metered'
// The signatures, return values and errors are identical.
//
// COST
// Counting is a number in memory. Reporting is one small POST per page, sent
// with sendBeacon when the page is hidden, so it never blocks anything and
// never costs a Firestore operation of its own. See utils/usageClient.js.
import {
  getDocs as fsGetDocs,
  getDoc as fsGetDoc,
  onSnapshot as fsOnSnapshot,
} from 'firebase/firestore'
import { countReads } from '../utils/usageClient'

export async function getDocs(query) {
  const snap = await fsGetDocs(query)
  // Firestore bills one read per document returned, and one for a query that
  // matches nothing, so an empty result is not free.
  countReads(Math.max(1, snap.size))
  return snap
}

export async function getDoc(ref) {
  const snap = await fsGetDoc(ref)
  countReads(1)
  return snap
}

/**
 * A listener bills for the whole result the first time, then for each document
 * that changes afterwards. Counting every delivered document matches that
 * closely enough, and errs high rather than low, which is the safer direction
 * for a quota warning.
 */
export function onSnapshot(ref, ...rest) {
  const wrap = (handler) =>
    typeof handler === 'function'
      ? (snap) => {
          countReads(Math.max(1, snap?.size ?? 1))
          return handler(snap)
        }
      : handler

  if (typeof rest[0] === 'function') {
    return fsOnSnapshot(ref, wrap(rest[0]), ...rest.slice(1))
  }
  // Options-object form: onSnapshot(ref, options, onNext, ...)
  if (rest[0] && typeof rest[1] === 'function') {
    return fsOnSnapshot(ref, rest[0], wrap(rest[1]), ...rest.slice(2))
  }
  // Observer form: onSnapshot(ref, { next, error, complete })
  if (rest[0] && typeof rest[0] === 'object' && typeof rest[0].next === 'function') {
    return fsOnSnapshot(ref, { ...rest[0], next: wrap(rest[0].next) }, ...rest.slice(1))
  }
  return fsOnSnapshot(ref, ...rest)
}
