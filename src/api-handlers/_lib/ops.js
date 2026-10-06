// src/api-handlers/_lib/ops.js
//
// The security core of the Sellapage Ops console (staff accounts).
//
// WHAT CHANGED (2026-10-06)
// Admin access used to sit on vendor logins: an admins/{uid} document next to
// a store, checked with nothing but a Firebase ID token. Staff are now their
// own accounts (custom claim `staff: true`, never a store), and every console
// request needs THREE things:
//   1. a Firebase ID token for that staff account,
//   2. a live server session (X-Ops-Session: "<id>.<secret>"), created only
//      after the password AND an authenticator code were both right,
//   3. the tab being used, on that person's list (or super admin).
// Sessions end after 30 idle minutes or 12 hours at most, on sign-out, and
// the moment a super admin pauses or removes someone. Risky actions also need
// the authenticator code again in the last 15 minutes ("sudo mode").
//
// Everything here is server-only: the staff* collections are closed to the
// browser in firestore.rules and are read and written with the Admin SDK.
//
// Secrets: authenticator seeds are stored AES-256-GCM encrypted with
// OPS_SECRET_KEY (32 random bytes, base64 or hex, set in Vercel). Session
// secrets, invite tokens, recovery codes and email codes are stored only as
// SHA-256 hashes. If OPS_SECRET_KEY is missing the console refuses to sign
// anyone in rather than storing seeds in the clear.
import crypto from 'crypto'
import { getAdminAuth, getAdminDb } from './firebase-admin.js'
import { opsCanOpen, needsStepUp } from '../../utils/opsAccess.js'

export const COL = {
  staff: 'opsStaff',
  sessions: 'opsSessions',
  audit: 'opsAudit',
  invites: 'opsInvites',
  challenges: 'opsChallenges',
  guards: 'opsLoginGuards',
  resets: 'opsResetRequests',
}

export const IDLE_MS = 30 * 60 * 1000
export const ABSOLUTE_MS = 12 * 60 * 60 * 1000
export const STEP_UP_MS = 15 * 60 * 1000
export const CHALLENGE_MS = 10 * 60 * 1000
export const INVITE_MS = 48 * 60 * 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
export const MAX_PASSWORD_FAILS = 5
export const LOCK_MS = 15 * 60 * 1000
const SEEN_WRITE_MS = 60 * 1000 // lastSeenAt is written at most once a minute
const STAFF_CACHE_MS = 10 * 1000 // a pause or a revoked tab bites within 10s

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url')

export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y)
}

// ── Encryption of authenticator seeds ──────────────────────────────────────
// Accepted forms (fixed 2026-10-06, BEFORE any seed was encrypted; never
// change how a given value maps to a key, or saved authenticators break):
//   - exactly 32 bytes as hex (64 chars) or base64 (44 chars): used as is;
//   - any other random string of 32+ characters: SHA-256 of it is the key.
// Surrounding quotes and spaces (easy to paste into Vercel) are ignored.
function rawSecret() {
  return String(process.env.OPS_SECRET_KEY || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim()
}

function secretKey() {
  const raw = rawSecret()
  if (!raw) {
    const err = new Error('OPS_SECRET_KEY is not set.')
    err.code = 'ops_not_configured'
    err.reason = 'missing'
    throw err
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  if (/^[A-Za-z0-9+/]{43}=$/.test(raw)) return Buffer.from(raw, 'base64')
  if (raw.length >= 32) return crypto.createHash('sha256').update(raw, 'utf8').digest()
  const err = new Error('OPS_SECRET_KEY is too short (needs 32+ random characters).')
  err.code = 'ops_not_configured'
  err.reason = 'too_short'
  throw err
}

/** 'ok' | 'missing' | 'too_short' (never the value itself). */
export function opsKeyStatus() {
  try { secretKey(); return 'ok' } catch (err) { return err.reason || 'missing' }
}

export function opsConfigured() {
  return opsKeyStatus() === 'ok'
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', secretKey(), iv)
  const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function decrypt(blob) {
  const [v, iv, tag, ct] = String(blob || '').split('.')
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('bad ciphertext')
  const d = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8')
}

// ── Authenticator codes (TOTP, RFC 6238: SHA-1, 6 digits, 30 seconds) ──────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export const newTotpSecret = () => base32Encode(crypto.randomBytes(20))

export function hotp(secretBuf, counter, digits = 6) {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', secretBuf).update(msg).digest()
  const o = h[h.length - 1] & 0xf
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 10 ** digits).padStart(digits, '0')
}

/**
 * Accepts the current 30s step and one either side (clock drift), but never a
 * step at or before `lastStep`, so a code cannot be replayed.
 */
export function verifyTotp(secretB32, code, lastStep = 0, now = Date.now()) {
  const c = String(code || '').replace(/\D/g, '')
  if (c.length !== 6) return { ok: false }
  const secret = base32Decode(secretB32)
  const step = Math.floor(now / 1000 / 30)
  for (const d of [-1, 0, 1]) {
    const s = step + d
    if (s <= lastStep) continue
    if (safeEqual(hotp(secret, s), c)) return { ok: true, step: s }
  }
  return { ok: false }
}

export function otpauthUri(secret, email) {
  const label = encodeURIComponent(`Sellapage Ops:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('Sellapage Ops')}&algorithm=SHA1&digits=6&period=30`
}

// ── Recovery codes (8 one-time codes, shown once) ───────────────────────────
export const normalizeRecovery = (code) => String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function newRecoveryCodes(n = 8) {
  const codes = Array.from({ length: n }, () => {
    const raw = base32Encode(crypto.randomBytes(5)).toLowerCase().slice(0, 8)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
  })
  return { codes, hashes: codes.map((c) => sha256(normalizeRecovery(c))) }
}

export const isRecoveryShaped = (code) => /^[a-z2-7]{8}$/.test(normalizeRecovery(code))

// ── Request details ─────────────────────────────────────────────────────────
// Vercel sets x-real-ip itself, so it is the one to trust for the log.
export function requestIp(req) {
  const real = req.headers['x-real-ip']
  if (real) return String(real).trim()
  const fwd = req.headers['x-forwarded-for']
  return fwd ? String(fwd).split(',')[0].trim() : req.socket?.remoteAddress || 'unknown'
}

export function deviceLabel(ua) {
  const s = String(ua || '')
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(s) ? 'iPhone/iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS X/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : 'Unknown'
  return `${browser} on ${os}`
}

export function requestMeta(req) {
  const ua = String(req.headers['user-agent'] || '').slice(0, 300)
  return { ip: requestIp(req), ua, device: deviceLabel(ua) }
}

// ── Staff records ───────────────────────────────────────────────────────────
const staffCache = new Map()

export async function loadStaff(db, uid, { fresh = false } = {}) {
  const hit = staffCache.get(uid)
  if (!fresh && hit && Date.now() - hit.at < STAFF_CACHE_MS) return hit.data
  const snap = await db.collection(COL.staff).doc(uid).get()
  const data = snap.exists ? { uid, ...snap.data() } : null
  staffCache.set(uid, { at: Date.now(), data })
  return data
}

export const forgetStaff = (uid) => staffCache.delete(uid)

/** What the browser may see about a staff member. Never secrets. */
export function publicStaff(s) {
  if (!s) return null
  return {
    uid: s.uid,
    name: s.name || '',
    title: s.title || '',
    email: s.email || '',
    status: s.status || 'active',
    isSuper: s.isSuper === true,
    tabs: Array.isArray(s.tabs) ? s.tabs : [],
    template: s.template || '',
    totpEnabled: s.totpEnabled === true,
    recoveryLeft: Array.isArray(s.recoveryHashes) ? s.recoveryHashes.length : 0,
    createdAt: s.createdAt || null,
    createdByName: s.createdByName || '',
    lastLoginAt: s.lastLoginAt || null,
    lastSeenAt: s.lastSeenAt || null,
    pausedReason: s.pausedReason || '',
    statusChangedAt: s.statusChangedAt || null,
  }
}

// ── Sessions ────────────────────────────────────────────────────────────────
export async function createSession(db, staff, req) {
  const id = randomToken(16)
  const secret = randomToken(32)
  const now = Date.now()
  const meta = requestMeta(req)
  await db.collection(COL.sessions).doc(id).set({
    uid: staff.uid,
    name: staff.name || '',
    secretHash: sha256(secret),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + ABSOLUTE_MS,
    // The login itself just checked the authenticator.
    stepUpAt: now,
    ip: meta.ip,
    ua: meta.ua,
    device: meta.device,
    endedAt: null,
    endReason: null,
  })
  return { token: `${id}.${secret}`, id, expiresAt: now + ABSOLUTE_MS, idleMs: IDLE_MS }
}

export async function endSession(db, id, reason, endedBy = null) {
  await db.collection(COL.sessions).doc(id).update({ endedAt: Date.now(), endReason: reason, endedBy })
}

export async function endAllSessions(db, uid, reason, endedBy = null) {
  const snap = await db.collection(COL.sessions).where('uid', '==', uid).where('endedAt', '==', null).get()
  if (snap.empty) return 0
  const batch = db.batch()
  const now = Date.now()
  snap.docs.forEach((d) => batch.update(d.ref, { endedAt: now, endReason: reason, endedBy }))
  await batch.commit()
  return snap.size
}

/**
 * The gate every console request goes through (via verifyAdmin).
 * @returns {{ok:true, staff, session, sessionId} | {ok:false, reason, uid?, staff?}}
 */
export async function verifyOpsRequest(req, requiredTab = null) {
  const header = String(req.headers['x-ops-session'] || '')
  const [sessionId, secret] = header.split('.')
  if (!sessionId || !secret) return { ok: false, reason: 'no_session' }

  const auth = String(req.headers.authorization || '')
  if (!auth.startsWith('Bearer ')) return { ok: false, reason: 'no_token' }
  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(auth.slice(7).trim())
  } catch {
    return { ok: false, reason: 'bad_token' }
  }

  const db = getAdminDb()
  const ref = db.collection(COL.sessions).doc(sessionId)
  const snap = await ref.get()
  if (!snap.exists) return { ok: false, reason: 'session_unknown', uid: decoded.uid }
  const s = snap.data()
  if (s.uid !== decoded.uid || !safeEqual(s.secretHash, sha256(secret))) return { ok: false, reason: 'session_mismatch', uid: decoded.uid }
  if (s.endedAt) return { ok: false, reason: 'session_ended', uid: s.uid, quiet: true, endReason: s.endReason }

  const now = Date.now()
  if (now > s.expiresAt) {
    await ref.update({ endedAt: now, endReason: 'expired' }).catch(() => {})
    return { ok: false, reason: 'session_expired', uid: s.uid }
  }
  if (now - s.lastSeenAt > IDLE_MS) {
    await ref.update({ endedAt: now, endReason: 'idle' }).catch(() => {})
    return { ok: false, reason: 'session_idle', uid: s.uid }
  }

  const staff = await loadStaff(db, s.uid)
  if (!staff || staff.status !== 'active') {
    await ref.update({ endedAt: now, endReason: staff?.status || 'removed' }).catch(() => {})
    return { ok: false, reason: `staff_${staff?.status || 'missing'}`, uid: s.uid, staff }
  }

  if (requiredTab && !opsCanOpen(staff, requiredTab)) return { ok: false, reason: 'tab_not_allowed', uid: s.uid, staff }

  const action = String(req.query?.action || '')
  const method = String(req.method || 'GET').toUpperCase()
  if (requiredTab && method !== 'GET' && needsStepUp(requiredTab, action) && now - (s.stepUpAt || 0) > STEP_UP_MS) {
    return { ok: false, reason: 'step_up_required', uid: s.uid, staff }
  }

  if (now - s.lastSeenAt > SEEN_WRITE_MS) {
    await ref.update({ lastSeenAt: now }).catch(() => {})
    db.collection(COL.staff).doc(s.uid).update({ lastSeenAt: now }).catch(() => {})
  }
  return { ok: true, staff, session: { id: sessionId, ...s }, sessionId }
}

// ── Activity log ────────────────────────────────────────────────────────────
// Document ids sort newest first (inverted time), so the log can be read in
// order, filtered by person or action, with Firestore's built-in indexes and
// no composite index to create.
const MAX_TS = 9999999999999
export const auditIdFor = (ms) => `${String(MAX_TS - ms).padStart(13, '0')}_${randomToken(5)}`
export const auditIdBound = (ms) => String(MAX_TS - ms).padStart(13, '0')

/**
 * entry: { uid, name, title, action, tab?, target?: {type,id,label}, summary?,
 *          changes?, result?: 'ok'|'denied'|'failed', sessionId?, req? }
 * Never throws: a log write must not break the action it records.
 */
export async function writeAudit(db, entry) {
  try {
    const now = Date.now()
    const { req, ...rest } = entry
    const meta = req ? requestMeta(req) : {}
    await db.collection(COL.audit).doc(auditIdFor(now)).set({
      at: now,
      uid: rest.uid || null,
      name: rest.name || '',
      title: rest.title || '',
      action: rest.action,
      tab: rest.tab || null,
      target: rest.target || null,
      summary: String(rest.summary || '').slice(0, 300),
      changes: rest.changes || null,
      result: rest.result || 'ok',
      sessionId: rest.sessionId || null,
      ip: meta.ip || null,
      device: meta.device || null,
    })
  } catch (err) {
    console.error('[ops] audit write failed:', err.message)
  }
}
