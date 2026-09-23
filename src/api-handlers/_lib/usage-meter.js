// src/api-handlers/_lib/usage-meter.js
//
// Sellapage's own count of the Firestore reads and writes it performs, kept
// per day and broken down by which job did them.
//
// WHY THIS EXISTS
// Firestore publishes no usage API, and the Cloud Monitoring counters that the
// Firebase console reads are refused to API callers on the Spark plan:
// "This API method requires billing to be enabled", confirmed against this
// project on 2026-09-23 with the Monitoring Viewer role already granted. So on
// the free plan there is no way to ask Google how much quota is left. This
// counts it here instead.
//
// WHAT IT IS AND IS NOT
// It counts what OUR SERVER does, at the call sites that opt in. It cannot see
// reads made by the browser SDK on vendor dashboards and storefronts, or work
// done in the Firebase console. So it is a floor, not a total, and it is worth
// most for exactly what it does cover: the crons and the admin scans, which is
// where a runaway shows up first.
//
// The Cloud Monitoring path in admin-firestore-usage.js is deliberately left in
// place. The day this project moves to Blaze, that becomes the source and these
// counters become the second opinion, with no rewrite.
//
// WRITE COST
// Metering that costs many writes would be self-defeating on a 20k daily write
// budget. Counts accumulate in memory and are flushed as ONE incrementing write
// per flush, and a flush only happens when a caller asks for it (crons, at the
// end of a run) or when enough has piled up to be worth recording.
import { FieldValue } from 'firebase-admin/firestore'

const COLLECTION = 'platform'
const DOC = 'usageDays'

// Flush when this much is pending, so a long run cannot lose a big count if the
// instance dies, while a quiet request never writes at all.
const AUTO_FLUSH_AT = 500

const pending = {
  reads: 0,
  writes: 0,
  deletes: 0,
  byLabel: {},
}

/** The Lagos-independent day key. Firebase resets Spark quotas at midnight US
 *  Pacific, so a counter keyed on any other day boundary would disagree with
 *  the console by hours of traffic. */
/** Which 15-minute slot of the Pacific quota day we are in, 0 to 95. Fifteen
 *  minutes is the coarsest bucket that can still answer "the last 30 minutes",
 *  and 96 numbers a day is nothing next to Firestore's 1MB document limit. */
export function quotaSlot(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  return Math.floor((get('hour') * 60 + get('minute')) / 15)
}

export function quotaDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function bump(label, kind, n) {
  const count = Number(n)
  if (!Number.isFinite(count) || count <= 0) return
  pending[kind] += count
  const key = String(label || 'unlabelled').slice(0, 60)
  pending.byLabel[key] = pending.byLabel[key] || { reads: 0, writes: 0, deletes: 0 }
  pending.byLabel[key][kind] += count
}

/**
 * Records operations. `label` says WHO, which is the part that makes this
 * worth having: a daily total says the platform is in trouble, a breakdown
 * says which job to go and look at.
 *
 * Counting is deliberately explicit at each call site rather than hidden in a
 * proxy around the Firestore client. A proxy would catch everything, including
 * the 130-odd files not touched here, but it would also sit in the path of
 * every payment webhook and every storefront render on a live platform. Wrong
 * trade for a counter.
 */
export const meter = {
  reads: (label, n = 1) => bump(label, 'reads', n),
  writes: (label, n = 1) => bump(label, 'writes', n),
  deletes: (label, n = 1) => bump(label, 'deletes', n),

  /** Counts a query result: one read per document returned. An empty result
   *  still costs one read, which is what Firestore bills. */
  snapshot: (label, snap) => bump(label, 'reads', Math.max(1, snap?.size ?? (snap?.exists === undefined ? 1 : 1))),

  pendingTotal: () => pending.reads + pending.writes + pending.deletes,
}

/**
 * Writes what has accumulated onto today's document and clears the buffer.
 *
 * Never throws: metering must not be able to fail a cron that is doing real
 * work. A lost flush loses a number, which matters far less than the job.
 */
export async function flushUsage(db, { force = false } = {}) {
  const total = meter.pendingTotal()
  if (!total) return { flushed: 0 }
  if (!force && total < AUTO_FLUSH_AT) return { flushed: 0, deferred: total }

  const day = quotaDayKey()
  const payload = {
    reads: FieldValue.increment(pending.reads),
    writes: FieldValue.increment(pending.writes + 1), // +1: this flush itself
    deletes: FieldValue.increment(pending.deletes),
    updatedAt: FieldValue.serverTimestamp(),
  }
  // Same write, one more field: the time series costs nothing extra.
  const slot = quotaSlot()
  payload[`slots.s${slot}.reads`] = FieldValue.increment(pending.reads)
  payload[`slots.s${slot}.writes`] = FieldValue.increment(pending.writes + 1)
  payload[`slots.s${slot}.deletes`] = FieldValue.increment(pending.deletes)

  for (const [label, counts] of Object.entries(pending.byLabel)) {
    // Dots would be read as a path, and a label can contain one.
    const safe = label.replace(/[.[\]/*~`]/g, '_')
    payload[`byLabel.${safe}.reads`] = FieldValue.increment(counts.reads)
    payload[`byLabel.${safe}.writes`] = FieldValue.increment(counts.writes)
    payload[`byLabel.${safe}.deletes`] = FieldValue.increment(counts.deletes)
  }

  const snapshotOfPending = { ...pending, byLabel: { ...pending.byLabel } }
  pending.reads = 0
  pending.writes = 0
  pending.deletes = 0
  pending.byLabel = {}

  try {
    await db.collection(COLLECTION).doc(DOC).collection('days').doc(day).set(payload, { merge: true })
    return { flushed: total, day }
  } catch (err) {
    // Put it back, so the next flush still reports it rather than losing it.
    pending.reads += snapshotOfPending.reads
    pending.writes += snapshotOfPending.writes
    pending.deletes += snapshotOfPending.deletes
    for (const [label, counts] of Object.entries(snapshotOfPending.byLabel)) {
      pending.byLabel[label] = pending.byLabel[label] || { reads: 0, writes: 0, deletes: 0 }
      pending.byLabel[label].reads += counts.reads
      pending.byLabel[label].writes += counts.writes
      pending.byLabel[label].deletes += counts.deletes
    }
    console.error('[usage-meter] flush failed:', err?.message || err)
    return { flushed: 0, error: true }
  }
}

/** Today's recorded totals, for the admin card. One read. */
export async function readUsageDay(db, day = quotaDayKey()) {
  const snap = await db.collection(COLLECTION).doc(DOC).collection('days').doc(day).get()
  if (!snap.exists) return { day, reads: 0, writes: 0, deletes: 0, byLabel: {}, slots: {}, baseline: null }
  const d = snap.data() || {}
  return {
    day,
    reads: Number(d.reads || 0),
    writes: Number(d.writes || 0),
    deletes: Number(d.deletes || 0),
    byLabel: d.byLabel || {},
    slots: d.slots || {},
    baseline: d.baseline || null,
    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : null,
  }
}

/**
 * Anchors today's figures to what Firebase actually reports.
 *
 * WHY THIS IS NEEDED
 * Cloud Monitoring will not serve these numbers on the Spark plan, so the only
 * source of truth is the number a human can read in the Firebase console. This
 * records that number, and everything counted AFTER it is added on top.
 *
 * WHY IT SUBTRACTS WHAT WAS ALREADY COUNTED
 * Firebase's figure already includes the operations this meter recorded earlier
 * today. Adding our running total to it would count those twice. So the
 * counter's value at the moment of the sync is stored too, and the display is:
 *
 *     shown = baseline + (counted now - counted at the moment of the sync)
 *
 * which is exactly "Firebase's number, plus everything since".
 */
export async function setUsageBaseline(db, { reads, writes, deletes, by }) {
  const day = quotaDayKey()
  // Flush first, so `countedAt` includes everything this instance is holding
  // and nothing falls into the gap between the sync and the next flush.
  await flushUsage(db, { force: true })
  const current = await readUsageDay(db, day)

  const clean = (v) => Math.max(0, Math.floor(Number(v) || 0))
  const baseline = {
    reads: clean(reads),
    writes: clean(writes),
    deletes: clean(deletes),
    at: new Date().toISOString(),
    by: String(by || 'admin').slice(0, 120),
    // What this meter had counted when the human read that number off Firebase.
    countedReadsAt: current.reads,
    countedWritesAt: current.writes,
    countedDeletesAt: current.deletes,
  }

  await db.collection(COLLECTION).doc(DOC).collection('days').doc(day).set({ baseline }, { merge: true })
  return baseline
}

/** Applies a baseline to a day's raw counts. Without one, the raw count IS the
 *  answer, which is the correct behaviour for a day nobody has synced. */
export function applyBaseline(day) {
  const b = day?.baseline
  if (!b) {
    return {
      reads: day.reads, writes: day.writes, deletes: day.deletes, synced: false,
    }
  }
  const since = (total, at) => Math.max(0, Number(total || 0) - Number(at || 0))
  return {
    reads: Number(b.reads || 0) + since(day.reads, b.countedReadsAt),
    writes: Number(b.writes || 0) + since(day.writes, b.countedWritesAt),
    deletes: Number(b.deletes || 0) + since(day.deletes, b.countedDeletesAt),
    synced: true,
    syncedAt: b.at,
    syncedBy: b.by,
    baseline: { reads: Number(b.reads || 0), writes: Number(b.writes || 0), deletes: Number(b.deletes || 0) },
  }
}

/** The last `count` quota days, newest first. One read per day. */
export async function readUsageHistory(db, count = 14) {
  const days = []
  const now = Date.now()
  for (let i = 0; i < Math.min(60, Math.max(1, count)); i++) {
    days.push(quotaDayKey(new Date(now - i * 24 * 60 * 60 * 1000)))
  }
  const snaps = await db.getAll(
    ...days.map((d) => db.collection(COLLECTION).doc(DOC).collection('days').doc(d)),
  )
  return snaps.map((snap, i) => {
    const d = snap.exists ? snap.data() || {} : {}
    const raw = {
      day: days[i],
      reads: Number(d.reads || 0),
      writes: Number(d.writes || 0),
      deletes: Number(d.deletes || 0),
      baseline: d.baseline || null,
    }
    const applied = applyBaseline(raw)
    return { day: days[i], ...applied, recorded: snap.exists }
  })
}
