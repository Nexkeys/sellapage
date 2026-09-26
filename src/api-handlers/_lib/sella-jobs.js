// src/api-handlers/_lib/sella-jobs.js
// Background jobs for Sella: work too big for one request.
//
// THE PROBLEM THIS SOLVES
// A chat reply has to finish inside one serverless invocation. "Add these 200
// products and write a description for each" cannot: 200 writes plus 20 model
// calls for descriptions is minutes of work. Before this, Sella could only take
// on what fit in a single reply, which is exactly the "limit" vendors noticed.
//
// HOW IT WORKS
// A job is a document in the top-level `sellaJobs` collection holding its own
// input and a cursor. Anyone may advance it with tickJob(), which:
//   1. takes a short LEASE in a transaction, so two tickers never process the
//      same rows at once,
//   2. works in small chunks until its time budget runs out,
//   3. saves the cursor after every chunk and releases the lease.
// Two things tick jobs:
//   - the Sella chat, while the vendor watches the progress card (fast), and
//   - the reminders cron every minute (so a job finishes even if the vendor
//     closes the app, and they get a push when it is done).
//
// IDEMPOTENT BY CONSTRUCTION
// Every row is written under the id `${jobId}_${index}`. If a tick dies after
// writing but before saving its cursor, the next tick re-reads those ids, sees
// they exist, and skips them. A crash can never create duplicates.
//
// WHY TOP-LEVEL, NOT A SUBCOLLECTION: the cron has to find due jobs across all
// stores. See the note at the top of _lib/reminders.js, the same reasoning.

import { FieldValue } from 'firebase-admin/firestore'
import { IMPORT_TARGETS, cleanRow, describeImport } from './sella-import.js'
import { callModel } from './openrouter.js'
import { charge } from './sella-credits.js'
import { sendPushToStore } from './push-devices.js'

export const JOBS = 'sellaJobs'
const CHUNK = 10
const LEASE_SLACK_MS = 15000

const nowMs = () => Date.now()

/** Creates a queued import job. Called only after the vendor confirmed. */
export async function createImportJob(db, storeId, actor, { target, rows, writeDescriptions, sessionId }) {
  const spec = IMPORT_TARGETS[target]
  if (!spec) return { ok: false, message: 'That import target is not supported.' }

  // Rows came back from the client (the vendor may have edited them in the
  // review table), so they are re-validated here exactly as at proposal time.
  const clean = []
  for (const raw of (Array.isArray(rows) ? rows : []).slice(0, 500)) {
    const c = cleanRow(target, raw)
    if (c.row) clean.push(c.row)
  }
  if (!clean.length) return { ok: false, message: 'There were no valid rows left to import.' }

  const ref = db.collection(JOBS).doc()
  await ref.set({
    storeId,
    type: 'import_records',
    target,
    rows: clean,
    writeDescriptions: writeDescriptions !== false && spec.describable,
    total: clean.length,
    cursor: 0,
    created: 0,
    skipped: 0,
    status: 'queued',
    nextRunAt: nowMs(),          // armed; deleted when the job finishes
    leaseUntil: 0,
    sessionId: sessionId ? String(sessionId) : null,
    createdBy: { uid: actor.uid, label: actor.label, role: actor.role },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const noun = target === 'ledger' ? 'sales' : spec.label.toLowerCase()
  return {
    ok: true,
    jobId: ref.id,
    message: `Adding ${clean.length} ${noun} to your ${spec.label} now. You can watch it here, or leave and I will notify you when it is done.`,
  }
}

/** Public, client-safe view of a job. Never includes the row data. */
export function jobView(id, j) {
  return {
    id,
    type: j.type,
    target: j.target,
    status: j.status,
    total: j.total || 0,
    done: j.cursor || 0,
    created: j.created || 0,
    skipped: j.skipped || 0,
    message: j.resultMessage || null,
  }
}

export async function getJob(db, storeId, jobId) {
  const snap = await db.collection(JOBS).doc(String(jobId || '')).get()
  if (!snap.exists || snap.data().storeId !== storeId) return null
  return { ref: snap.ref, data: snap.data() }
}

async function claim(db, ref, leaseMs) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const j = snap.data()
    if (j.status === 'done' || j.status === 'failed') return null
    if ((j.leaseUntil || 0) > nowMs()) return null // someone else is on it
    tx.update(ref, { leaseUntil: nowMs() + leaseMs, status: 'running', updatedAt: FieldValue.serverTimestamp() })
    return j
  })
}

/**
 * Writes descriptions for rows that have none. One model call per chunk.
 * Best effort: if the model fails, the rows import without a description
 * rather than the job failing, because the products themselves matter more.
 */
async function fillDescriptions(db, storeId, target, rows, storeName, deadline) {
  const need = rows.map((r, i) => ({ r, i })).filter(({ r }) => !r.description)
  if (!need.length) return rows
  const list = need.map(({ r }, k) => `${k + 1}. ${r.name}${r.category ? ` (${r.category})` : ''}, ${r.price} naira`).join('\n')
  try {
    const json = await callModel({
      tier: 'standard',
      maxTokens: 2500,
      temperature: 0.7,
      // Bounded by the tick deadline so a slow model cannot hold the lease
      // long past it and let a second ticker start on the same rows.
      timeoutMs: Math.min(40000, Math.max(deadline - Date.now() - 3000, 15000)),
      messages: [
        {
          role: 'system',
          content:
            `You write short, persuasive ${target === 'services' ? 'service' : 'product'} descriptions for "${storeName}", ` +
            'a Nigerian online store. 2 to 3 sentences each, plain text, no emojis, no markdown, no em dashes or en dashes. ' +
            'Never invent specifications you were not given (sizes, materials, warranties). ' +
            'Reply with ONLY a JSON array of strings, one per item, in the same order.',
        },
        { role: 'user', content: list },
      ],
    })
    await charge(db, storeId, { usd: json?.usage?.cost || 0, minimum: 0, kind: 'import' })
    const text = String(json?.choices?.[0]?.message?.content || '')
    const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1))
    const out = rows.map((r) => ({ ...r }))
    need.forEach(({ i }, k) => {
      if (typeof arr[k] === 'string' && arr[k].trim()) out[i].description = arr[k].trim().replace(/[–—]/g, ',').slice(0, 3000)
    })
    return out
  } catch (err) {
    console.error('[sella-jobs] descriptions failed:', err?.message || err)
    return rows
  }
}

function docFor(target, row, createdByLabel) {
  const base = { createdVia: 'sella_import', createdByLabel: createdByLabel || null }
  if (target === 'ledger') {
    return { ...base, ...row, createdAt: new Date().toISOString() }
  }
  const { imageUrl, ...rest } = row
  const doc = {
    ...base,
    ...rest,
    isActive: true,
    visible: true,
    imageUrls: imageUrl ? [imageUrl] : [],
    imageUrl: imageUrl || '',
    createdAt: new Date(),
  }
  if (target === 'products') doc.type = 'physical'
  return doc
}

async function writeChunk(db, storeId, jobId, target, rows, startIndex, label) {
  const spec = IMPORT_TARGETS[target]
  const storeRef = db.collection('stores').doc(storeId)
  const coll = storeRef.collection(spec.collection)
  const refs = rows.map((_, k) => coll.doc(`${jobId}_${startIndex + k}`))
  const existing = await db.getAll(...refs)
  const batch = db.batch()
  let created = 0
  existing.forEach((snap, k) => {
    if (snap.exists) return // written by an earlier tick that died before saving its cursor
    batch.set(refs[k], docFor(target, rows[k], label))
    created++
  })
  if (created && target === 'products') batch.set(storeRef, { productCount: FieldValue.increment(created) }, { merge: true })
  if (created) await batch.commit()
  return created
}

/** How many more listings the plan allows (products and services share it). */
async function listingRoom(db, storeId) {
  const storeRef = db.collection('stores').doc(storeId)
  const store = (await storeRef.get()).data() || {}
  const plan = store.plan || 'starter'
  const limit = store.maxProducts ?? (plan === 'premium' || plan === 'pro' ? 999999 : plan === 'growth' ? 50 : 15)
  const [p, s] = await Promise.all([
    storeRef.collection('products').count().get(),
    storeRef.collection('services').count().get(),
  ])
  return { room: Math.max(limit - p.data().count - s.data().count, 0), storeName: store.businessName || 'the store' }
}

async function finish(db, ref, j, extra = {}) {
  const spec = IMPORT_TARGETS[j.target]
  const created = extra.created ?? j.created
  const skipped = extra.skipped ?? j.skipped
  const noun = j.target === 'ledger' ? 'sales' : spec.label.toLowerCase()
  const msg = `Done. Added ${created} ${noun} to your ${spec.label}` +
    (skipped ? `. ${skipped} were skipped${extra.limitHit ? ' because your plan listing limit was reached' : ''}` : '') + '.'
  await ref.update({
    ...extra,
    status: 'done',
    resultMessage: msg,
    nextRunAt: FieldValue.delete(),
    leaseUntil: 0,
    rows: FieldValue.delete(),   // the payload is no longer needed once written
    finishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Leave the result in the chat, so it is there when the vendor comes back.
  if (j.sessionId) {
    try {
      await db.collection('stores').doc(j.storeId).collection('sellaAiChats').doc(j.sessionId).set({
        messages: FieldValue.arrayUnion({
          role: 'assistant', content: msg, kind: 'action-result', ok: true, jobId: ref.id,
          at: new Date().toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      }, { merge: true })
    } catch (err) {
      console.error('[sella-jobs] could not append result to chat:', err.message)
    }
  }
  // Push only the person who asked for it, as with Sella replies.
  try {
    await sendPushToStore(j.storeId, {
      title: 'Import finished',
      body: msg,
      data: { type: 'sella_job', jobId: ref.id, sessionId: j.sessionId || '' },
    }, { onlyUids: [j.createdBy?.uid].filter(Boolean) })
  } catch (err) {
    console.error('[sella-jobs] push failed:', err?.message || err)
  }
  return msg
}

/**
 * Advances one job until `deadline` (epoch ms). Safe to call from anywhere and
 * as often as you like: the lease makes concurrent calls no-ops.
 * @returns {Promise<object|null>} the job view after this tick, or null
 */
export async function tickJob(db, ref, deadline) {
  const leaseMs = Math.max(deadline - nowMs(), 1000) + LEASE_SLACK_MS
  const j = await claim(db, ref, leaseMs)
  if (!j) {
    const snap = await ref.get()
    return snap.exists ? jobView(ref.id, snap.data()) : null
  }

  let cursor = j.cursor || 0
  let created = j.created || 0
  let skipped = j.skipped || 0
  const rows = Array.isArray(j.rows) ? j.rows : []

  try {
    // Plan limit is checked once per tick for listings. Ledger has no limit.
    let room = Infinity
    let storeName = 'the store'
    if (j.target !== 'ledger') ({ room, storeName } = await listingRoom(db, j.storeId))

    let limitHit = false
    while (cursor < rows.length && nowMs() < deadline - 5000) {
      if (room <= 0) {
        // Plan limit reached: the rest are skipped and reported, not queued
        // forever waiting for room that will never appear.
        skipped += rows.length - cursor
        cursor = rows.length
        limitHit = true
        break
      }
      let chunk = rows.slice(cursor, cursor + Math.min(CHUNK, room))
      if (j.writeDescriptions) chunk = await fillDescriptions(db, j.storeId, j.target, chunk, storeName, deadline)
      const n = await writeChunk(db, j.storeId, ref.id, j.target, chunk, cursor, j.createdBy?.label)
      created += n
      room -= n
      cursor += chunk.length
      await ref.update({ cursor, created, skipped, updatedAt: FieldValue.serverTimestamp() })
    }

    if (cursor >= rows.length) {
      await finish(db, ref, j, { cursor, created, skipped, limitHit })
    } else {
      await ref.update({ leaseUntil: 0, nextRunAt: nowMs(), updatedAt: FieldValue.serverTimestamp() })
    }
  } catch (err) {
    console.error('[sella-jobs] tick failed:', err?.message || err)
    // Release the lease so the next tick retries from the saved cursor.
    await ref.update({ leaseUntil: 0, lastError: String(err?.message || err).slice(0, 300), updatedAt: FieldValue.serverTimestamp() }).catch(() => {})
  }
  const after = await ref.get()
  return after.exists ? jobView(ref.id, after.data()) : null
}

/** Advances any due jobs across all stores. Used by the minute cron. */
export async function tickDueJobs(db, deadline, max = 3) {
  const due = await db.collection(JOBS).where('nextRunAt', '<=', nowMs()).orderBy('nextRunAt').limit(max).get()
  let ticked = 0
  for (const doc of due.docs) {
    if (nowMs() > deadline - 6000) break
    await tickJob(db, doc.ref, deadline)
    ticked++
  }
  return { due: due.size, ticked }
}

export { describeImport }
