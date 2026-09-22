// One record per AI description attempt, successes and failures alike.
//
// Before this, the only trace a generation left was a per store, per day
// counter (stores/{id}/aiUsage/{date}), which cannot answer any of the
// questions the admin panel needs to answer: which model actually replied,
// which API key it was billed to, how long vendors waited, and what was failing
// when vendors said the button "wasn't working".
//
// Written with the admin SDK only, so it needs no Firestore rules change, and
// never from the browser.
import { FieldValue } from 'firebase-admin/firestore'

export const AI_DESCRIBE_LOGS = 'aiDescribeLogs'

const LAGOS = 'Africa/Lagos'
export const lagosDayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: LAGOS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

const trim = (v, max) => String(v ?? '').trim().slice(0, max)

/**
 * Never throws and is never awaited on the vendor's path: a logging failure
 * must not cost a vendor their description.
 */
export function logAiDescribe(db, entry) {
  try {
    const now = new Date()
    const doc = {
      storeId: trim(entry.storeId, 64),
      storeName: trim(entry.storeName, 80),
      plan: trim(entry.plan, 20) || 'starter',
      // 'description' for a product or service line, 'job' for a job post.
      mode: entry.mode === 'job' ? 'job' : 'description',
      // What it was asked about, short: enough to recognise a bad generation
      // when a vendor reports one, without copying their catalogue here.
      subject: trim(entry.subject, 60),
      status: trim(entry.status, 24) || 'error',
      model: trim(entry.model, 80),
      keyLabel: trim(entry.keyLabel, 40),
      keyHint: trim(entry.keyHint, 16),
      durationMs: Number.isFinite(Number(entry.durationMs)) ? Math.round(Number(entry.durationMs)) : null,
      promptTokens: Number(entry.promptTokens) || 0,
      completionTokens: Number(entry.completionTokens) || 0,
      totalTokens: Number(entry.totalTokens) || 0,
      // Every model/key pair tried before the one that answered, so a slow
      // success and a silent failover are both visible afterwards.
      attempts: Array.isArray(entry.attempts)
        ? entry.attempts.slice(0, 12).map((a) => ({
          model: trim(a.model, 80),
          keyLabel: trim(a.keyLabel, 40),
          status: Number(a.status) || 0,
          outcome: trim(a.outcome, 24),
          ms: Number.isFinite(Number(a.ms)) ? Math.round(Number(a.ms)) : null,
        }))
        : [],
      errorCode: trim(entry.errorCode, 40),
      errorMessage: trim(entry.errorMessage, 200),
      dayKey: lagosDayKey(now),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: now.getTime(),
    }
    return db.collection(AI_DESCRIBE_LOGS).add(doc).catch((err) => {
      console.error('[ai-describe-log] write failed:', err?.message)
    })
  } catch (err) {
    console.error('[ai-describe-log] build failed:', err?.message)
    return Promise.resolve()
  }
}
