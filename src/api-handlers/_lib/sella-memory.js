// src/api-handlers/_lib/sella-memory.js
// What Sella remembers about a store between chats, and the prompts a vendor
// saved for reuse.
//
// MEMORY is what makes the assistant feel like it knows the business: "my
// brand voice is playful", "never discount more than 20%", "my supplier is in
// Onitsha". Claude and ChatGPT both save these on their own and say so; Sella
// does the same, and the vendor can see, edit and delete every item from the
// Memory panel. Nothing is hidden.
//
// Deliberate limits:
//   - OWNER ONLY. Memory steers every future answer on the store, including
//     answers the owner gets. A staff member able to write it could plant a
//     standing instruction in the owner's assistant.
//   - Never saved in a turn that read the web. A web page must not be able to
//     get itself remembered (the same rule that blocks writes after a search).
//   - Short and few. 60 items of up to 300 characters keeps the prompt cheap
//     and stops memory becoming a second copy of the store.
//
// Both live in server-only subcollections (firestore.rules).

import { FieldValue } from 'firebase-admin/firestore'

export const MAX_MEMORIES = 60
export const MAX_MEMORY_CHARS = 300
export const MAX_PROMPTS = 40
export const MAX_PROMPT_CHARS = 1000

const memCol = (db, storeId) => db.collection('stores').doc(storeId).collection('sellaMemory')
const promptCol = (db, storeId) => db.collection('stores').doc(storeId).collection('sellaPrompts')

const clean = (s, n) => String(s || '').replace(/[–—]/g, ',').replace(/\s+/g, ' ').trim().slice(0, n)

export async function listMemories(db, storeId) {
  const snap = await memCol(db, storeId).orderBy('createdAt', 'asc').limit(MAX_MEMORIES).get()
  return snap.docs.map((d) => ({
    id: d.id,
    text: d.data().text,
    source: d.data().source || 'sella',
    createdAt: d.data().createdAt?.toMillis?.() || null,
  }))
}

export async function addMemory(db, storeId, text, source = 'sella') {
  const t = clean(text, MAX_MEMORY_CHARS)
  if (!t) return { ok: false, message: 'There was nothing to remember.' }
  const existing = await listMemories(db, storeId)
  if (existing.some((m) => m.text.toLowerCase() === t.toLowerCase())) {
    return { ok: true, message: 'I already remember that.', duplicate: true }
  }
  if (existing.length >= MAX_MEMORIES) {
    return { ok: false, message: `Memory is full (${MAX_MEMORIES} items). Delete some from the Memory panel first.` }
  }
  const ref = memCol(db, storeId).doc()
  await ref.set({ text: t, source, createdAt: FieldValue.serverTimestamp() })
  return { ok: true, id: ref.id, text: t, message: 'Saved to memory.' }
}

export async function updateMemory(db, storeId, id, text) {
  const t = clean(text, MAX_MEMORY_CHARS)
  if (!t) return { ok: false, message: 'Memory text cannot be empty.' }
  const ref = memCol(db, storeId).doc(String(id || ''))
  if (!(await ref.get()).exists) return { ok: false, message: 'That memory was not found.' }
  await ref.update({ text: t, updatedAt: FieldValue.serverTimestamp() })
  return { ok: true, message: 'Memory updated.' }
}

export async function deleteMemory(db, storeId, id) {
  const ref = memCol(db, storeId).doc(String(id || ''))
  if (!(await ref.get()).exists) return { ok: false, message: 'That memory was not found.' }
  await ref.delete()
  return { ok: true, message: 'Forgotten.' }
}

/** Memory block for the system prompt. Ids ride along so forget_memory can name one. */
export function memoriesForPrompt(memories = []) {
  if (!memories.length) {
    return '\n\nWHAT YOU REMEMBER ABOUT THIS STORE: nothing yet. When the vendor tells you a lasting preference or fact about their business, save it with save_memory.'
  }
  return '\n\nWHAT YOU REMEMBER ABOUT THIS STORE (saved by or for the vendor; use it, it is how you know them):\n' +
    memories.map((m) => `- [${m.id}] ${m.text}`).join('\n')
}

// ------------------------------------------------------------------ prompts
export async function listPrompts(db, storeId) {
  const snap = await promptCol(db, storeId).orderBy('createdAt', 'desc').limit(MAX_PROMPTS).get()
  return snap.docs.map((d) => ({ id: d.id, title: d.data().title, text: d.data().text }))
}

export async function savePrompt(db, storeId, { title, text }) {
  const body = String(text || '').trim().slice(0, MAX_PROMPT_CHARS)
  if (!body) return { ok: false, message: 'The prompt is empty.' }
  const count = (await promptCol(db, storeId).count().get()).data().count
  if (count >= MAX_PROMPTS) return { ok: false, message: `You can save up to ${MAX_PROMPTS} prompts. Delete one first.` }
  const ref = promptCol(db, storeId).doc()
  const t = clean(title, 60) || clean(body, 40)
  await ref.set({ title: t, text: body, createdAt: FieldValue.serverTimestamp() })
  return { ok: true, prompt: { id: ref.id, title: t, text: body } }
}

export async function deletePrompt(db, storeId, id) {
  const ref = promptCol(db, storeId).doc(String(id || ''))
  if (!(await ref.get()).exists) return { ok: false, message: 'That prompt was not found.' }
  await ref.delete()
  return { ok: true }
}
