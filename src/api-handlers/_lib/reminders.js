// src/api-handlers/_lib/reminders.js
// Vendor reminders: set by Sella in conversation ("remind me at 2pm to check my
// products"), delivered by push when the time comes, managed from the Reminders
// tab.
//
// WHY A TOP-LEVEL COLLECTION, NOT stores/{id}/reminders:
// The cron has to find due reminders across every store at once. As a
// subcollection that is a collectionGroup query, and a collectionGroup query on
// nextDueAt requires a COLLECTION_GROUP_ASC index that must be deployed
// separately - verified against production, it fails with FAILED_PRECONDITION
// until someone remembers to create it. This codebase has already taken
// outages from exactly that. A top-level collection needs only the automatic
// single-field indexes, so there is nothing to deploy and nothing to forget.
//
// WHY nextDueAt IS DELETED RATHER THAN NULLED:
// A Firestore range query skips documents that do not have the field at all,
// but null SORTS BEFORE NUMBERS and therefore still matches `<= now`. Nulling
// it would leave every fired reminder in the cron's scan forever. Deleting the
// field is the disarm mechanism - verified.

import { FieldValue } from 'firebase-admin/firestore'

export const COLLECTION = 'reminders'

// Nigeria is UTC+1 year round. No DST, so a fixed offset is correct here and
// avoids pulling in a timezone library for one country.
export const WAT_OFFSET_MIN = 60

export const MAX_ACTIVE_PER_STORE = 50
export const MAX_MESSAGE_LEN = 200

export const REPEATS = { none: 0, daily: 86400000, weekly: 604800000 }

/** Current wall-clock time in Lagos, for prompting and for defaults. */
export function nowInWat() {
  return new Date(Date.now() + WAT_OFFSET_MIN * 60000)
}

/** "2026-09-11T14:00" understood as Lagos local time -> epoch ms UTC. */
export function watLocalToEpoch(localIso) {
  const m = String(localIso || '').trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  return Date.UTC(y, mo - 1, d, h, mi) - WAT_OFFSET_MIN * 60000
}

/** Epoch ms -> "Thu 11 Sep, 2:00 PM" in Lagos time, for confirm cards and UI. */
export function formatWat(epochMs) {
  if (!epochMs) return ''
  return new Date(epochMs).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/**
 * Validates a reminder before it is ever shown on a confirm card, so an
 * impossible reminder is refused with a reason the vendor can act on rather
 * than being confirmed and then failing.
 */
export function validateReminder({ message, dueAtLocal, repeat }) {
  const text = String(message || '').trim()
  if (!text) return { ok: false, reason: 'What should the reminder say?' }
  if (text.length > MAX_MESSAGE_LEN) {
    return { ok: false, reason: `Keep the reminder under ${MAX_MESSAGE_LEN} characters.` }
  }

  const rep = String(repeat || 'none').toLowerCase()
  if (!(rep in REPEATS)) {
    return { ok: false, reason: 'A reminder can repeat daily, weekly, or not at all.' }
  }

  const dueAt = watLocalToEpoch(dueAtLocal)
  if (!dueAt) {
    return { ok: false, reason: 'I need the date and time for the reminder, for example 11 September at 2pm.' }
  }
  // 60s of slack so "remind me in a minute" is not rejected by clock skew.
  if (dueAt < Date.now() - 60000) {
    return { ok: false, reason: `${formatWat(dueAt)} has already passed. Give me a time in the future.` }
  }

  return { ok: true, value: { message: text, dueAt, repeat: rep } }
}

export async function createReminder(db, storeId, actor, { message, dueAt, repeat }) {
  const active = await db.collection(COLLECTION)
    .where('storeId', '==', storeId)
    .get()
  const armed = active.docs.filter((d) => d.data().nextDueAt != null).length
  if (armed >= MAX_ACTIVE_PER_STORE) {
    return { ok: false, message: `You already have ${MAX_ACTIVE_PER_STORE} active reminders. Turn some off first.` }
  }

  const ref = db.collection(COLLECTION).doc()
  await ref.set({
    storeId,
    message,
    dueAt,
    nextDueAt: dueAt,          // armed; deleted once it has fired for the last time
    repeat,
    enabled: true,
    status: 'scheduled',
    sentCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: { uid: actor.uid, label: actor.label, viaAi: actor.viaAi === true },
  })

  return {
    ok: true,
    id: ref.id,
    message: repeat === 'none'
      ? `Reminder set for ${formatWat(dueAt)}. It will send once, then switch itself off. You can see it in the Reminders tab.`
      : `Reminder set for ${formatWat(dueAt)}, repeating ${repeat}. You can turn it off any time in the Reminders tab.`,
  }
}

/** Per-store listing. Equality only, sorted in memory - see the index note above. */
export async function listReminders(db, storeId) {
  const snap = await db.collection(COLLECTION).where('storeId', '==', storeId).get()
  const rows = snap.docs.map((d) => {
    const x = d.data()
    return {
      id: d.id,
      message: x.message,
      dueAt: x.dueAt || null,
      nextDueAt: x.nextDueAt ?? null,
      dueAtLabel: formatWat(x.nextDueAt ?? x.dueAt),
      repeat: x.repeat || 'none',
      enabled: x.enabled !== false,
      status: x.status || 'scheduled',
      sentCount: x.sentCount || 0,
      lastSentAt: x.lastSentAt || null,
      createdByLabel: x.createdBy?.label || null,
      viaAi: x.createdBy?.viaAi === true,
    }
  })
  // Armed reminders first, soonest first; finished ones after, newest first.
  rows.sort((a, b) => {
    const aArmed = a.nextDueAt != null, bArmed = b.nextDueAt != null
    if (aArmed !== bArmed) return aArmed ? -1 : 1
    if (aArmed) return a.nextDueAt - b.nextDueAt
    return (b.dueAt || 0) - (a.dueAt || 0)
  })
  return rows
}

/**
 * Turning a reminder off deletes nextDueAt, which is what actually removes it
 * from the cron's scan. Turning it back on re-arms it, rolling a passed
 * one-shot forward so re-enabling never fires instantly.
 */
export async function setReminderEnabled(db, storeId, id, enabled) {
  const ref = db.collection(COLLECTION).doc(String(id))
  const snap = await ref.get()
  if (!snap.exists || snap.data().storeId !== storeId) {
    return { ok: false, message: 'Reminder not found.' }
  }
  const x = snap.data()

  if (!enabled) {
    await ref.update({ enabled: false, nextDueAt: FieldValue.delete(), status: 'paused' })
    return { ok: true, message: 'Reminder turned off.' }
  }

  let next = x.dueAt || Date.now()
  const step = REPEATS[x.repeat] || 0
  if (next <= Date.now()) {
    if (step) {
      // Advance to the next future occurrence rather than firing for every
      // slot that elapsed while it was paused.
      const missed = Math.ceil((Date.now() - next) / step)
      next += missed * step
    } else {
      return { ok: false, message: 'That time has already passed. Set a new reminder instead.' }
    }
  }
  await ref.update({ enabled: true, nextDueAt: next, status: 'scheduled' })
  return { ok: true, message: `Reminder back on for ${formatWat(next)}.` }
}

export async function deleteReminder(db, storeId, id) {
  const ref = db.collection(COLLECTION).doc(String(id))
  const snap = await ref.get()
  if (!snap.exists || snap.data().storeId !== storeId) {
    return { ok: false, message: 'Reminder not found.' }
  }
  await ref.delete()
  return { ok: true, message: 'Reminder deleted.' }
}

/**
 * Marks a reminder as fired. One-shot reminders disarm themselves by having
 * nextDueAt deleted, which is the behaviour asked for: it sends once and stops
 * rather than nagging. Repeating ones roll forward to the next slot.
 */
export async function markFired(db, docRef, data, delivered) {
  const step = REPEATS[data.repeat] || 0
  const patch = {
    lastSentAt: Date.now(),
    sentCount: (data.sentCount || 0) + 1,
    lastDelivery: delivered,
  }
  if (step) {
    let next = (data.nextDueAt || Date.now()) + step
    while (next <= Date.now()) next += step
    patch.nextDueAt = next
    patch.status = 'scheduled'
  } else {
    patch.nextDueAt = FieldValue.delete()
    patch.status = 'sent'
    patch.enabled = false
  }
  await docRef.update(patch)
}
