// src/api-handlers/ops-auth.js
//
// Signing in to the Sellapage Ops console. Staff accounts only; vendor
// logins are refused with the same message as a wrong password.
//
//   POST ?action=password       { email, password }            -> { challengeId, next }
//   POST ?action=verify         { challengeId, code }          -> next step, or the session
//   POST ?action=resend-email   { challengeId }
//   GET  ?action=invite&token=  -> who the invite is for
//   POST ?action=accept-invite  { token, password }            -> { challengeId, next:'enroll', ... }
//   POST ?action=reset-request  { email }                      (lost authenticator; a super admin approves)
//   GET  ?action=me             (session) -> the signed-in staff member + session timers
//   POST ?action=step-up        (session) { code }             -> "sudo mode" for 15 minutes
//   POST ?action=logout         (session)
//
// The password is checked HERE, against Firebase Auth's REST API, not in the
// browser, so failed attempts are counted and locked out (5 tries, then 15
// minutes), and no usable Firebase session exists until the second step is
// done: the browser only receives a custom token once the authenticator code
// (or a recovery code) is right.
//
// `next` steps: 'email' (6-digit code by email: first sign-in after a reset or
// for an account that never set up an authenticator), 'enroll' (scan the QR,
// enter a code), 'totp' (enter the authenticator code), then the session.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { parseJsonBody } from './_lib/http.js'
import { memoryRateLimit, durableRateLimit, tooManyRequests } from './_lib/rate-limit.js'
import {
  COL, CHALLENGE_MS, MAX_CODE_ATTEMPTS, MAX_PASSWORD_FAILS, LOCK_MS, STEP_UP_MS,
  sha256, randomToken, safeEqual, opsConfigured, opsKeyStatus, encrypt, decrypt, newTotpSecret, verifyTotp,
  otpauthUri, newRecoveryCodes, normalizeRecovery, isRecoveryShaped, requestIp, requestMeta,
  loadStaff, forgetStaff, publicStaff, createSession, endSession, verifyOpsRequest, writeAudit,
} from './_lib/ops.js'
import { sendLoginCodeEmail, sendNewDeviceEmail, sendResetRequestedEmail } from './_lib/ops-mail.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const BAD_LOGIN = 'Email or password is incorrect.'
const maskEmail = (e) => {
  const [n, d] = String(e || '').split('@')
  return d ? `${n.slice(0, 2)}***@${d}` : ''
}
const fail = (res, status, error, message, extra = {}) => res.status(status).json({ success: false, error, message, ...extra })

async function checkPassword(email, password) {
  const key = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY
  if (!key) return { ok: false, error: 'no_api_key' }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  })
  const d = await r.json().catch(() => ({}))
  if (r.ok && d.localId) return { ok: true, uid: d.localId }
  return { ok: false, error: String(d?.error?.message || 'INVALID_LOGIN_CREDENTIALS') }
}

const sixDigits = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0')
const codeHash = (challengeId, code) => sha256(`${challengeId}:${code}`)

async function newChallenge(db, staff, stage, extra = {}) {
  const id = randomToken(18)
  const now = Date.now()
  await db.collection(COL.challenges).doc(id).set({
    uid: staff.uid, stage, attempts: 0, createdAt: now, expiresAt: now + CHALLENGE_MS, ...extra,
  })
  return id
}

async function sendEmailStage(db, staff, challengeId) {
  const code = sixDigits()
  await db.collection(COL.challenges).doc(challengeId).update({
    emailCodeHash: codeHash(challengeId, code), emailSentAt: Date.now(), emailSends: FieldValue.increment(1),
  })
  await sendLoginCodeEmail({ to: staff.email, name: staff.name, code })
}

function enrollPayload(staff, secret) {
  return { next: 'enroll', otpauth: otpauthUri(secret, staff.email), secret, email: staff.email }
}

/** The second step is done: session, Firebase custom token, alerts, log. */
async function finishLogin(db, staff, req, { recoveryCodes = null, via = 'authenticator' } = {}) {
  const session = await createSession(db, staff, req)
  const customToken = await getAdminAuth().createCustomToken(staff.uid, { ops: true })
  const meta = requestMeta(req)
  const deviceKey = sha256(`${meta.device}|${meta.ip.split('.').slice(0, 3).join('.')}`).slice(0, 24)
  const known = Array.isArray(staff.knownDevices) ? staff.knownDevices : []
  const isNew = known.length > 0 && !known.includes(deviceKey)
  await db.collection(COL.staff).doc(staff.uid).update({
    lastLoginAt: Date.now(),
    lastSeenAt: Date.now(),
    knownDevices: [deviceKey, ...known.filter((k) => k !== deviceKey)].slice(0, 10),
  })
  forgetStaff(staff.uid)
  if (isNew) {
    await sendNewDeviceEmail({
      to: staff.email, name: staff.name, device: meta.device, ip: meta.ip,
      when: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }),
    })
  }
  await writeAudit(db, {
    uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.login', sessionId: session.id, req,
    summary: `Signed in with ${via}${isNew ? ' (new device)' : ''}`,
  })
  return {
    success: true,
    customToken,
    session: session.token,
    expiresAt: session.expiresAt,
    idleMs: session.idleMs,
    staff: publicStaff({ ...staff, recoveryHashes: recoveryCodes ? recoveryCodes.hashes : staff.recoveryHashes }),
    ...(recoveryCodes ? { recoveryCodes: recoveryCodes.codes } : {}),
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const action = String(req.query?.action || '')
  const ip = requestIp(req)
  const db = getAdminDb()
  let body = {}
  if (req.method === 'POST') {
    try { body = parseJsonBody(req) || {} } catch { return fail(res, 400, 'invalid_json', 'Invalid request.') }
  }

  try {
    // ── me / logout / step-up: need a live session ───────────────────────
    if (action === 'me') {
      const v = await verifyOpsRequest(req, null)
      if (!v.ok) return fail(res, 401, v.reason, 'Your session has ended. Sign in again.', { endReason: v.endReason || null })
      return res.status(200).json({
        success: true,
        staff: publicStaff(v.staff),
        session: {
          id: v.sessionId,
          createdAt: v.session.createdAt,
          expiresAt: v.session.expiresAt,
          idleMs: 30 * 60 * 1000,
          stepUpUntil: (v.session.stepUpAt || 0) + STEP_UP_MS,
          device: v.session.device,
        },
      })
    }

    if (action === 'logout' && req.method === 'POST') {
      const v = await verifyOpsRequest(req, null)
      if (v.ok) {
        await endSession(db, v.sessionId, 'logout', v.staff.uid)
        await writeAudit(db, { uid: v.staff.uid, name: v.staff.name, title: v.staff.title, action: 'ops.logout', sessionId: v.sessionId, req, summary: 'Signed out' })
      }
      return res.status(200).json({ success: true })
    }

    if (action === 'step-up' && req.method === 'POST') {
      const v = await verifyOpsRequest(req, null)
      if (!v.ok) return fail(res, 401, v.reason, 'Your session has ended. Sign in again.')
      if (!memoryRateLimit('ops_step_up', v.sessionId, 5, 5 * 60 * 1000)) return tooManyRequests(res, 'Too many tries. Wait a few minutes.')
      const staff = await loadStaff(db, v.staff.uid, { fresh: true })
      const ok = await checkSecondFactor(db, staff, body.code)
      if (!ok.ok) {
        await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.step_up_failed', result: 'failed', sessionId: v.sessionId, req, summary: 'Wrong code while confirming a sensitive action' })
        return fail(res, 400, 'wrong_code', 'That code is not right. Check your authenticator and try again.')
      }
      const now = Date.now()
      await db.collection(COL.sessions).doc(v.sessionId).update({ stepUpAt: now })
      await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.step_up', sessionId: v.sessionId, req, summary: ok.via === 'recovery' ? 'Confirmed with a recovery code' : 'Confirmed with authenticator' })
      return res.status(200).json({ success: true, stepUpUntil: now + STEP_UP_MS })
    }

    // ── public steps ──────────────────────────────────────────────────────
    if (!memoryRateLimit('ops_auth_ip', ip, 40, 10 * 60 * 1000)) return tooManyRequests(res)

    if (action === 'invite' && req.method === 'GET') {
      const token = String(req.query?.token || '')
      const snap = token ? await db.collection(COL.invites).doc(sha256(token)).get() : null
      if (!snap?.exists) return res.status(200).json({ success: true, valid: false, reason: 'unknown' })
      const inv = snap.data()
      const reason = inv.cancelledAt ? 'cancelled' : inv.usedAt ? 'used' : Date.now() > inv.expiresAt ? 'expired' : null
      return res.status(200).json({
        success: true, valid: !reason, reason,
        email: inv.email, name: inv.name, title: inv.title, isSuper: inv.isSuper === true, invitedByName: inv.createdByName || '',
      })
    }

    if (!opsConfigured()) {
      const why = opsKeyStatus() === 'too_short'
        ? 'OPS_SECRET_KEY is set but too short. Use 32 or more random characters, then redeploy.'
        : 'OPS_SECRET_KEY is not set for this deployment. Add it in Vercel, then redeploy.'
      return fail(res, 503, 'ops_not_configured', `Ops sign-in is not set up on this server yet. ${why}`)
    }

    if (action === 'password' && req.method === 'POST') {
      if (!(await durableRateLimit('ops_login_ip', ip, 30, 60 * 60 * 1000))) return tooManyRequests(res, 'Too many sign-in attempts from this network. Try again later.')
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!EMAIL_RE.test(email) || !password) return fail(res, 400, 'invalid_input', 'Enter your work email and password.')

      const guardRef = db.collection(COL.guards).doc(sha256(`ops-guard:${email}`))
      const guard = (await guardRef.get()).data() || {}
      const now = Date.now()
      if (guard.lockedUntil && guard.lockedUntil > now) {
        const mins = Math.ceil((guard.lockedUntil - now) / 60000)
        return fail(res, 429, 'locked', `Too many wrong attempts. This account is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`)
      }

      const check = await checkPassword(email, password)
      if (check.error === 'no_api_key') return fail(res, 503, 'ops_not_configured', 'Ops sign-in is not set up on this server yet (Firebase web API key missing).')
      const staff = check.ok ? await loadStaff(db, check.uid, { fresh: true }) : null

      if (!check.ok || !staff || staff.status === 'deleted') {
        const failures = (guard.failures || 0) + 1
        const locked = failures >= MAX_PASSWORD_FAILS
        await guardRef.set({ failures: locked ? 0 : failures, lockedUntil: locked ? now + LOCK_MS : null, lastFailAt: now }, { merge: true })
        await writeAudit(db, {
          uid: staff?.uid || null, name: staff?.name || maskEmail(email), action: 'ops.login_failed', result: 'failed', req,
          summary: !check.ok ? `Wrong password for ${maskEmail(email)}${locked ? ' (locked for 15 minutes)' : ''}` : `Not a staff account: ${maskEmail(email)}`,
        })
        if (locked) return fail(res, 429, 'locked', 'Too many wrong attempts. This account is locked for 15 minutes.')
        const left = MAX_PASSWORD_FAILS - failures
        return fail(res, 401, 'bad_login', `${BAD_LOGIN}${left <= 2 ? ` ${left} attempt${left === 1 ? '' : 's'} left before a 15-minute lock.` : ''}`)
      }
      await guardRef.set({ failures: 0, lockedUntil: null }, { merge: true })

      if (staff.status === 'paused') {
        await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.login_failed', result: 'denied', req, summary: 'Tried to sign in while paused' })
        return fail(res, 403, 'paused', 'Your access is paused for now. Speak to a super admin.')
      }
      if (staff.status !== 'active') return fail(res, 401, 'bad_login', BAD_LOGIN)

      if (staff.totpEnabled && staff.totpSecretEnc) {
        const challengeId = await newChallenge(db, staff, 'totp')
        return res.status(200).json({ success: true, challengeId, next: 'totp', name: staff.name })
      }
      // No authenticator yet (first sign-in after a reset, or a bootstrap
      // account): prove the inbox first, so a stolen password alone cannot
      // enrol the thief's phone.
      const challengeId = await newChallenge(db, staff, 'email', { emailSends: 0 })
      await sendEmailStage(db, staff, challengeId)
      return res.status(200).json({ success: true, challengeId, next: 'email', emailMasked: maskEmail(staff.email), name: staff.name })
    }

    if (action === 'resend-email' && req.method === 'POST') {
      const ref = db.collection(COL.challenges).doc(String(body.challengeId || ''))
      const snap = await ref.get()
      if (!snap.exists || snap.get('stage') !== 'email' || Date.now() > snap.get('expiresAt')) return fail(res, 400, 'expired', 'This sign-in took too long. Start again.')
      const c = snap.data()
      if ((c.emailSends || 0) >= 3) return fail(res, 429, 'too_many', 'You have asked for 3 codes. Start the sign-in again.')
      if (Date.now() - (c.emailSentAt || 0) < 60 * 1000) return fail(res, 429, 'cooldown', 'Wait a minute before asking for another code.')
      const staff = await loadStaff(db, c.uid, { fresh: true })
      if (!staff || staff.status !== 'active') return fail(res, 400, 'expired', 'This sign-in took too long. Start again.')
      await sendEmailStage(db, staff, ref.id)
      return res.status(200).json({ success: true })
    }

    if (action === 'verify' && req.method === 'POST') {
      const ref = db.collection(COL.challenges).doc(String(body.challengeId || ''))
      const snap = await ref.get()
      if (!snap.exists) return fail(res, 400, 'expired', 'This sign-in took too long. Start again.')
      const c = snap.data()
      if (Date.now() > c.expiresAt) { await ref.delete(); return fail(res, 400, 'expired', 'This sign-in took too long. Start again.') }
      if ((c.attempts || 0) >= MAX_CODE_ATTEMPTS) { await ref.delete(); return fail(res, 429, 'too_many', 'Too many wrong codes. Start the sign-in again.') }

      const staff = await loadStaff(db, c.uid, { fresh: true })
      if (!staff || staff.status !== 'active') { await ref.delete(); return fail(res, 403, 'not_active', 'This account cannot sign in right now. Speak to a super admin.') }
      const code = String(body.code || '').trim()
      const wrong = async (msg) => {
        const attempts = (c.attempts || 0) + 1
        await ref.update({ attempts })
        if (attempts >= MAX_CODE_ATTEMPTS) {
          await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.login_failed', result: 'failed', req, summary: `Too many wrong codes at the ${c.stage} step` })
        }
        const left = MAX_CODE_ATTEMPTS - attempts
        return fail(res, 400, 'wrong_code', left > 0 ? `${msg} ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong codes. Start the sign-in again.', { remainingAttempts: left })
      }

      if (c.stage === 'email') {
        if (!c.emailCodeHash || !safeEqual(c.emailCodeHash, codeHash(ref.id, code.replace(/\D/g, '')))) return wrong('That code is not right.')
        const secret = newTotpSecret()
        await ref.update({ stage: 'enroll', pendingSecretEnc: encrypt(secret), attempts: 0, expiresAt: Date.now() + CHALLENGE_MS, emailCodeHash: null })
        return res.status(200).json({ success: true, challengeId: ref.id, ...enrollPayload(staff, secret) })
      }

      if (c.stage === 'enroll') {
        const secret = decrypt(c.pendingSecretEnc)
        const t = verifyTotp(secret, code)
        if (!t.ok) return wrong('That code does not match. Make sure you scanned the new QR code.')
        const recovery = newRecoveryCodes()
        await db.collection(COL.staff).doc(staff.uid).update({
          totpSecretEnc: c.pendingSecretEnc, totpEnabled: true, totpLastStep: t.step, enrolledAt: Date.now(), recoveryHashes: recovery.hashes,
        })
        await ref.delete()
        await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.enrolled', req, summary: 'Set up an authenticator app and got 8 recovery codes' })
        return res.status(200).json(await finishLogin(db, { ...staff, totpEnabled: true }, req, { recoveryCodes: recovery, via: 'a new authenticator' }))
      }

      if (c.stage === 'totp') {
        const ok = await checkSecondFactor(db, staff, code)
        if (!ok.ok) return wrong(isRecoveryShaped(code) ? 'That recovery code is not valid or was already used.' : 'That code is not right.')
        await ref.delete()
        if (ok.via === 'recovery') {
          await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.recovery_code_used', req, summary: `Used a recovery code (${ok.left} left)` })
        }
        return res.status(200).json(await finishLogin(db, staff, req, { via: ok.via === 'recovery' ? 'a recovery code' : 'authenticator' }))
      }
      return fail(res, 400, 'expired', 'This sign-in took too long. Start again.')
    }

    if (action === 'accept-invite' && req.method === 'POST') {
      if (!(await durableRateLimit('ops_invite_accept', ip, 10, 60 * 60 * 1000))) return tooManyRequests(res)
      const token = String(body.token || '')
      const password = String(body.password || '')
      const ref = db.collection(COL.invites).doc(sha256(token))
      const snap = token ? await ref.get() : null
      if (!snap?.exists) return fail(res, 400, 'invalid', 'This invite link is not valid.')
      const inv = snap.data()
      if (inv.cancelledAt) return fail(res, 400, 'cancelled', 'This invite was cancelled. Ask for a new one.')
      if (inv.usedAt) return fail(res, 400, 'used', 'This invite was already used. Sign in instead.')
      if (Date.now() > inv.expiresAt) return fail(res, 400, 'expired', 'This invite has expired. Ask for a new one.')
      if (password.length < 10 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
        return fail(res, 400, 'weak_password', 'Use at least 10 characters with a letter and a number.')
      }

      const auth = getAdminAuth()
      let user = null
      try {
        const existing = await auth.getUserByEmail(inv.email)
        // Only a staff member who was removed earlier may come back on the
        // same email. A vendor login is never turned into a staff account.
        const prior = await loadStaff(db, existing.uid, { fresh: true })
        if (!(existing.customClaims?.ops && prior?.status === 'deleted')) {
          return fail(res, 409, 'email_in_use', 'This email already has a Sellapage login. Staff accounts must use their own email: ask for an invite to a different address.')
        }
        user = await auth.updateUser(existing.uid, { password, displayName: inv.name, disabled: false, emailVerified: true })
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err
      }
      if (!user) user = await auth.createUser({ email: inv.email, password, displayName: inv.name, emailVerified: true })
      await auth.setCustomUserClaims(user.uid, { ops: true })
      forgetStaff(user.uid)
      const now = Date.now()
      const staff = {
        uid: user.uid, name: inv.name, title: inv.title || '', email: inv.email, status: 'active',
        isSuper: inv.isSuper === true, tabs: inv.isSuper ? [] : inv.tabs || [], template: inv.template || '',
        totpEnabled: false, createdAt: now, createdBy: inv.createdBy || null, createdByName: inv.createdByName || '', inviteId: ref.id,
        statusChangedAt: now,
      }
      await db.collection(COL.staff).doc(user.uid).set(staff)
      await ref.update({ usedAt: now, uid: user.uid })
      await writeAudit(db, { uid: user.uid, name: staff.name, title: staff.title, action: 'ops.invite_accepted', req, summary: `Accepted the invite from ${inv.createdByName || 'a super admin'}` })

      // The link itself proved the inbox, so go straight to the authenticator.
      const secret = newTotpSecret()
      const challengeId = await newChallenge(db, staff, 'enroll', { pendingSecretEnc: encrypt(secret) })
      return res.status(200).json({ success: true, challengeId, ...enrollPayload(staff, secret) })
    }

    if (action === 'reset-request' && req.method === 'POST') {
      if (!(await durableRateLimit('ops_reset_req', ip, 5, 60 * 60 * 1000))) return tooManyRequests(res)
      const email = String(body.email || '').trim().toLowerCase()
      const generic = { success: true, message: 'If that is a staff email, a super admin has been asked to approve a reset. They will contact you.' }
      if (!EMAIL_RE.test(email)) return res.status(200).json(generic)
      const found = await db.collection(COL.staff).where('email', '==', email).limit(1).get()
      const staff = found.empty ? null : { uid: found.docs[0].id, ...found.docs[0].data() }
      if (!staff || staff.status !== 'active') return res.status(200).json(generic)
      const pending = await db.collection(COL.resets).where('uid', '==', staff.uid).where('status', '==', 'pending').limit(1).get()
      if (pending.empty) {
        const meta = requestMeta(req)
        await db.collection(COL.resets).add({ uid: staff.uid, name: staff.name, title: staff.title || '', email: staff.email, status: 'pending', createdAt: Date.now(), ip: meta.ip, device: meta.device })
        await writeAudit(db, { uid: staff.uid, name: staff.name, title: staff.title, action: 'ops.reset_requested', req, summary: 'Asked for an authenticator reset' })
        const supers = await db.collection(COL.staff).where('isSuper', '==', true).where('status', '==', 'active').limit(10).get()
        await Promise.all(supers.docs.filter((d) => d.id !== staff.uid).map((d) => sendResetRequestedEmail({ to: d.get('email'), staffName: staff.name, staffEmail: staff.email })))
      }
      return res.status(200).json(generic)
    }

    return fail(res, 400, 'invalid_action', 'Invalid request.')
  } catch (err) {
    console.error('[ops-auth]', err.code || '', err.message)
    if (err.code === 'ops_not_configured') return fail(res, 503, 'ops_not_configured', 'Ops sign-in is not set up on this server yet.')
    return fail(res, 500, 'server_error', 'Something went wrong. Please try again.')
  }
}

/** Authenticator code, or one of the 8 recovery codes (each works once). */
async function checkSecondFactor(db, staff, rawCode) {
  if (!staff?.totpSecretEnc) return { ok: false }
  const code = String(rawCode || '').trim()
  if (isRecoveryShaped(code) && !/^\d+$/.test(code)) {
    const hash = sha256(normalizeRecovery(code))
    const hashes = Array.isArray(staff.recoveryHashes) ? staff.recoveryHashes : []
    if (!hashes.includes(hash)) return { ok: false }
    const left = hashes.filter((h) => h !== hash)
    await db.collection(COL.staff).doc(staff.uid).update({ recoveryHashes: left })
    forgetStaff(staff.uid)
    return { ok: true, via: 'recovery', left: left.length }
  }
  const t = verifyTotp(decrypt(staff.totpSecretEnc), code, staff.totpLastStep || 0)
  if (!t.ok) return { ok: false }
  await db.collection(COL.staff).doc(staff.uid).update({ totpLastStep: t.step })
  forgetStaff(staff.uid)
  return { ok: true, via: 'authenticator' }
}
