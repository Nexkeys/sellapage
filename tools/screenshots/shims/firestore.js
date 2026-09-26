// tools/screenshots/shims/firestore.js
//
// Stands in for 'firebase/firestore' inside the screenshot sandbox ONLY. The
// sandbox's Vite config swaps the real package for this file, so the real
// dashboard components run unchanged but every read is answered from
// ../data.js and every write goes nowhere.
//
// That is the whole safety property: no code path in the sandbox can reach
// the live database, spend a Firestore read, or touch a real vendor's data.
import { DATA } from '../data.js'

export class Timestamp {
  constructor(ms) { this._ms = ms }
  static fromDate(d) { return new Timestamp(new Date(d).getTime()) }
  static fromMillis(ms) { return new Timestamp(ms) }
  static now() { return new Timestamp(Date.now()) }
  toDate() { return new Date(this._ms) }
  toMillis() { return this._ms }
  get seconds() { return Math.floor(this._ms / 1000) }
  get nanoseconds() { return 0 }
  valueOf() { return this._ms }
}

export const getFirestore = () => ({ __fake: true })

const join = (base, segs) => [base, ...segs].filter(Boolean).join('/')

export function collection(parent, ...segs) {
  const base = parent && parent.path ? parent.path : ''
  const path = join(base, segs)
  return { type: 'collection', path, id: path.split('/').pop() }
}

let autoId = 0
export function doc(parent, ...segs) {
  const base = parent && parent.path ? parent.path : ''
  const path = segs.length ? join(base, segs) : `${base}/auto-${++autoId}`
  return { type: 'document', path, id: path.split('/').pop() }
}

export const where = (field, op, value) => ({ kind: 'where', field, op, value })
export const orderBy = (field, dir = 'asc') => ({ kind: 'orderBy', field, dir })
export const limit = (n) => ({ kind: 'limit', n })
export const startAfter = (...v) => ({ kind: 'startAfter', v })
export function query(ref, ...constraints) {
  return { type: 'query', path: ref.path, id: ref.id, constraints: [...(ref.constraints || []), ...constraints] }
}

const get = (obj, field) => field.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
const cmp = (a, b) => {
  const x = a?.toMillis ? a.toMillis() : a
  const y = b?.toMillis ? b.toMillis() : b
  return x < y ? -1 : x > y ? 1 : 0
}

function rowsFor(path) {
  if (DATA[path]) return DATA[path]
  // Any store id reads the demo store, so a component that builds its path
  // from store.id cannot miss the data by a typo in the harness.
  const generic = path.replace(/^stores\/[^/]+/, 'stores/demo')
  return DATA[generic] || []
}

function docSnap(path, row) {
  const id = row ? row.id : path.split('/').pop()
  const { id: _omit, ...fields } = row || {}
  return {
    id,
    ref: { type: 'document', path: row ? `${path}/${id}` : path, id },
    exists: () => Boolean(row),
    data: () => (row ? fields : undefined),
    get: (f) => get(fields, f),
  }
}

function run(q) {
  let rows = [...rowsFor(q.path)]
  for (const c of q.constraints || []) {
    if (c.kind === 'where') {
      rows = rows.filter((r) => {
        const v = get(r, c.field)
        switch (c.op) {
          case '==': return cmp(v, c.value) === 0
          case '!=': return cmp(v, c.value) !== 0
          case '>': return cmp(v, c.value) > 0
          case '>=': return cmp(v, c.value) >= 0
          case '<': return cmp(v, c.value) < 0
          case '<=': return cmp(v, c.value) <= 0
          case 'in': return (c.value || []).includes(v)
          case 'array-contains': return Array.isArray(v) && v.includes(c.value)
          default: return true
        }
      })
    }
  }
  for (const c of (q.constraints || []).filter((c) => c.kind === 'orderBy').reverse()) {
    rows.sort((a, b) => (c.dir === 'desc' ? -1 : 1) * cmp(get(a, c.field), get(b, c.field)))
  }
  const lim = (q.constraints || []).find((c) => c.kind === 'limit')
  if (lim) rows = rows.slice(0, lim.n)
  const docs = rows.map((r) => docSnap(q.path, r))
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) }
}

export async function getDocs(q) { return run(q) }

export async function getDoc(ref) {
  const parts = ref.path.split('/')
  const id = parts.pop()
  const rows = rowsFor(parts.join('/'))
  const row = rows.find((r) => r.id === id) || (DATA.__docs && DATA.__docs[ref.path.replace(/^stores\/[^/]+/, 'stores/demo')])
  return docSnap(parts.join('/'), row ? { id, ...row } : null)
}

export function onSnapshot(ref, ...rest) {
  const next = typeof rest[0] === 'function' ? rest[0] : typeof rest[1] === 'function' ? rest[1] : rest[0]?.next
  Promise.resolve().then(async () => {
    const snap = ref.type === 'document' ? await getDoc(ref) : run(ref)
    next && next(snap)
  })
  return () => {}
}

export async function getCountFromServer(q) {
  const n = run(q).size
  return { data: () => ({ count: n }) }
}

// Writes do nothing. A screenshot must never change anything, anywhere.
export async function setDoc() {}
export async function updateDoc() {}
export async function deleteDoc() {}
export async function addDoc(ref) { return doc(ref) }
export function writeBatch() {
  return { set() {}, update() {}, delete() {}, commit: async () => {} }
}
export const increment = (n) => ({ __increment: n })
export const serverTimestamp = () => Timestamp.now()
export const arrayUnion = (...v) => v
export const arrayRemove = () => []
export const deleteField = () => undefined
export const documentId = () => '__name__'
