// src/api-handlers/signup-phone.js
//
// Vendor signup, phone first. Public and unauthenticated, because the account
// does not exist yet.
//
//   GET/POST ?action=check     { phone }                     is this number free?
//   POST     ?action=send      { phone, email, storeName, businessName, recaptchaToken }
//                              -> { token, destinationMasked, resendAfterSeconds }
//   POST     ?action=complete  { token, code, email, password, businessName,
//                                whatsappNumber, storeName, description,
//                                vendorType, referralCode, sessionId,
//                                marketplaceInterest? { supply, dropship } }
//                              -> { customToken, storeId, referrerId }
//
// NOTHING IS CREATED UNTIL THE CODE IS RIGHT. `send` only texts a code; the
// Firebase account and the store document are both created here, by the Admin
// SDK, inside `complete`, after Termii has confirmed the code. An abandoned
// signup leaves no account behind. The client then signs in with the returned
// custom token (the same pattern staff-join.js uses).
//
// WHY `send` CHECKS EVERYTHING FIRST: the number, the email and the store URL
// are all checked before a code goes out, so a form that was always going to
// fail never costs an SMS.
//
// Staff never come through here. They join through staff-join.js, and the
// store owner's verified number covers the store.
//
// The Android app calls these same endpoints; see the 2026-09-18 changelog
// entry for the contract.
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from './_lib/firebase-admin.js'
import { parseJsonBody } from './_lib/http.js'
import { memoryRateLimit, clientKey, tooManyRequests } from './_lib/rate-limit.js'
import { verifyRecaptcha, logAudit } from './_lib/otp.js'
import { getSmsConfigStatus, sendSmsOtp, verifySmsOtp } from './_lib/termii.js'
import { checkPhone, takeSmsQuota, PHONE_TAKEN_MESSAGE } from './_lib/phone-claims.js'
import { maskNgPhone } from '../utils/phone.js'
import { isReservedSlug } from '../utils/reservedSlugs.js'
import { cleanInterest, vendorTypeForInterest } from '../utils/marketplace.js'

const CHALLENGES = 'signupChallenges'
const RESEND_COOLDOWN_MS = 60 * 1000
// After the code is accepted, how long a failed account creation may be
// retried without a new SMS (a dropped connection must not cost a code).
const VERIFIED_GRACE_MS = 15 * 60 * 1000
const MAX_CODE_ATTEMPTS = 3

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,60}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const VENDOR_TYPES = ['products', 'services', 'both']
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const clean = (v, max) => String(v ?? '').trim().slice(0, max)
const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex')

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'hex')
  const y = Buffer.from(String(b || ''), 'hex')
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y)
}

function fail(res, status, error, message, extra = {}) {
  return res.status(status).json({ success: false, error, message, ...extra })
}

/** The fields both `send` and `complete` need, validated identically. */
function readIdentity(body) {
  const email = clean(body.email, 200).toLowerCase()
  const storeName = clean(body.storeName, 61).toLowerCase()
  const businessName = clean(body.businessName, 120)

  if (!businessName) return { error: 'missing_business_name', field: 'businessName', message: 'Please enter your business name.' }
  if (!EMAIL_RE.test(email)) return { error: 'invalid_email', field: 'email', message: 'Please enter a valid email address.' }
  if (!SLUG_RE.test(storeName)) {
    return { error: 'invalid_slug', field: 'storeName', message: 'Store URL must be at least 3 characters: lowercase letters, numbers and hyphens.' }
  }
  if (isReservedSlug(storeName)) return { error: 'reserved_slug', field: 'storeName', message: 'That store name is reserved. Please choose another.' }
  return { email, storeName, businessName }
}

async function slugTaken(db, storeName) {
  const [live, redirected] = await Promise.all([
    db.collection('stores').where('storeName', '==', storeName).limit(1).get(),
    // Another store still 301s from this address; taking it would hijack
    // their old links. Same rule as store-seo.js change-slug.
    db.collection('stores').where('previousSlugs', 'array-contains', storeName).limit(1).get(),
  ])
  return !live.empty || !redirected.empty
}

async function emailTaken(auth, email) {
  try {
    await auth.getUserByEmail(email)
    return true
  } catch (err) {
    if (err.code === 'auth/user-not-found') return false
    throw err
  }
}

export default async function handler(req, res) {
  // Open CORS: the Android app calls this too, and the web form is same-origin.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = String(req.query?.action || '')
  const ip = clientKey(req)
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 300)

  let body
  try {
    body = req.method === 'GET' ? {} : parseJsonBody(req) || {}
  } catch {
    return fail(res, 400, 'invalid_json', 'Invalid request.')
  }

  try {
    const db = getAdminDb()

    // ------------------------------------------------------------- check
    // Runs as the vendor types, so it must be cheap: one document read and a
    // free in-memory limit. Never reveals WHICH store holds a number.
    if (action === 'check') {
      if (!memoryRateLimit('signup_phone_check', ip, 60, 10 * 60 * 1000)) return tooManyRequests(res)
      const result = await checkPhone(db, req.query?.phone ?? body.phone)
      if (!result.ok) return res.status(200).json({ success: true, available: false, error: result.error, message: result.message })
      return res.status(200).json({ success: true, available: true })
    }

    if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Method not allowed.')

    // -------------------------------------------------------------- send
    if (action === 'send') {
      if (!memoryRateLimit('signup_phone_send', ip, 10, 10 * 60 * 1000)) return tooManyRequests(res)

      const sms = getSmsConfigStatus()
      if (!sms.available) {
        return fail(res, 503, 'sms_unavailable', 'Sign up is briefly unavailable while we fix phone verification. Please try again shortly.')
      }

      const id = readIdentity(body)
      if (id.error) return fail(res, 400, id.error, id.message, { field: id.field })

      // The field checks run before reCAPTCHA on purpose: a token is single
      // use, so a vendor fixing a typo in their email must not have to tick
      // the box again. Every error that names a `field` happens before it.
      const phoneCheck = await checkPhone(db, body.phone)
      if (!phoneCheck.ok) return fail(res, phoneCheck.error === 'phone_taken' ? 409 : 400, phoneCheck.error, phoneCheck.message, { field: 'phone' })
      const phone = phoneCheck.phone

      const auth = getAdminAuth()
      if (await emailTaken(auth, id.email)) {
        return fail(res, 409, 'email_taken', 'An account with this email already exists. Sign in instead.', { field: 'email' })
      }
      if (await slugTaken(db, id.storeName)) {
        return fail(res, 409, 'slug_taken', 'That store URL is already taken. Please choose another.', { field: 'storeName' })
      }

      // Optional so the Android app (no web reCAPTCHA) can use this; an
      // INVALID token always fails. The per-number, per-IP and global SMS caps
      // below apply either way.
      const captcha = await verifyRecaptcha(body.recaptchaToken, ip)
      if (!captcha.ok) {
        return fail(res, 400, 'captcha_failed', "We couldn't verify that you're human. Please tick the box again.")
      }

      const ref = db.collection(CHALLENGES).doc(phone)
      const prior = await ref.get()
      if (prior.exists && !prior.data().consumedAt) {
        const wait = RESEND_COOLDOWN_MS - (Date.now() - (prior.data().createdAtMs || 0))
        if (wait > 0) {
          const seconds = Math.ceil(wait / 1000)
          return fail(res, 429, 'cooldown', `Please wait ${seconds}s before requesting another code.`, { retryAfterSeconds: seconds })
        }
      }

      const quota = await takeSmsQuota({ phone, ip })
      if (!quota.ok) {
        await logAudit(db, { uid: null, action: 'signup_sms', result: quota.error, ip, userAgent, meta: { phoneMasked: maskNgPhone(phone) } })
        return fail(res, 429, quota.error, quota.message)
      }

      const sent = await sendSmsOtp({ to: phone, purposeLabel: 'create your store' })
      if (!sent.ok) {
        await logAudit(db, { uid: null, action: 'signup_sms', result: 'failed', ip, userAgent, meta: { reason: sent.error } })
        const down = ['insufficient_balance', 'sender_id_unapproved', 'not_configured'].includes(sent.error) ||
          String(sent.error || '').startsWith('sender_id')
        return fail(res, down ? 503 : 502, sent.error, down
          ? 'Sign up is briefly unavailable while we fix phone verification. Please try again shortly.'
          : sent.message || 'Could not send the code. Please try again.')
      }

      // The token proves "I am the browser the code was sent for". Only its
      // hash is stored. Writing to the number's own document means a resend
      // overwrites, and so invalidates, the previous code.
      const token = crypto.randomBytes(24).toString('hex')
      const now = Date.now()
      await ref.set({
        phone,
        email: id.email,
        storeName: id.storeName,
        tokenHash: sha256(token),
        termiiPinId: sent.pinId,
        expiresAt: now + (sent.ttlMinutes || 5) * 60 * 1000,
        createdAtMs: now,
        attempts: 0,
        maxAttempts: MAX_CODE_ATTEMPTS,
        verifiedAt: null,
        consumedAt: null,
        uid: null,
        ip,
        userAgent,
        createdAt: FieldValue.serverTimestamp(),
      })

      await logAudit(db, { uid: null, action: 'signup_sms', result: 'issued', ip, userAgent, meta: { phoneMasked: maskNgPhone(phone), captcha: captcha.reason } })

      return res.status(200).json({
        success: true,
        token,
        destinationMasked: maskNgPhone(phone),
        expiresAt: now + (sent.ttlMinutes || 5) * 60 * 1000,
        resendAfterSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
      })
    }

    // ---------------------------------------------------------- complete
    if (action === 'complete') {
      if (!memoryRateLimit('signup_phone_complete', ip, 20, 10 * 60 * 1000)) return tooManyRequests(res)

      const id = readIdentity(body)
      if (id.error) return fail(res, 400, id.error, id.message, { field: id.field })

      const password = String(body.password || '')
      if (password.length < 6 || password.length > 128) {
        return fail(res, 400, 'weak_password', 'Password must be at least 6 characters.', { field: 'password' })
      }
      // Dropshipping interest (optional, coming soon). Interest only, grants
      // nothing; a dropshipper sells products, so "services" becomes "both".
      const marketplaceInterest = cleanInterest(body.marketplaceInterest)
      const vendorType = vendorTypeForInterest(
        VENDOR_TYPES.includes(body.vendorType) ? body.vendorType : 'products',
        marketplaceInterest,
      )
      const description = clean(body.description, 1000)
      const whatsappNumber = clean(body.whatsappNumber, 40)

      const phoneCheck = await checkPhone(db, whatsappNumber)
      if (!phoneCheck.ok && phoneCheck.error === 'invalid_phone') return fail(res, 400, 'invalid_phone', phoneCheck.message, { field: 'phone' })
      const phone = phoneCheck.phone

      const ref = db.collection(CHALLENGES).doc(phone)
      const snap = await ref.get()
      const c = snap.exists ? snap.data() : null
      const expiredMsg = 'Your code has expired. Request a new one.'

      if (!c || !safeEqualHex(c.tokenHash, sha256(String(body.token || '')))) {
        return fail(res, 400, 'expired', expiredMsg)
      }
      if (c.consumedAt) return fail(res, 409, 'already_used', 'This store has already been created. Sign in instead.')
      // Bound to the email the code was sent for, so a verified number cannot
      // be carried over to a different account mid-flow.
      if (c.email !== id.email) {
        return fail(res, 400, 'details_changed', 'Your details changed after the code was sent. Request a new code.')
      }
      if (!phoneCheck.ok) return fail(res, 409, 'phone_taken', PHONE_TAKEN_MESSAGE, { field: 'phone' })

      if (!c.verifiedAt) {
        if (Date.now() > (c.expiresAt || 0)) return fail(res, 400, 'expired', expiredMsg)
        if ((c.attempts || 0) >= (c.maxAttempts || MAX_CODE_ATTEMPTS)) {
          return fail(res, 429, 'too_many_attempts', 'Too many incorrect codes. Request a new code.')
        }
        const code = String(body.code || '').trim()
        if (!/^\d{6}$/.test(code)) return fail(res, 400, 'invalid_code', 'Enter the 6-digit code from the SMS.')

        const result = await verifySmsOtp({ pinId: c.termiiPinId, pin: code })
        if (!result.ok) {
          // A Termii outage must not burn one of the vendor's attempts.
          if (result.error === 'unreachable') {
            return fail(res, 503, 'unreachable', 'Could not reach the SMS provider. Try again in a moment.')
          }
          const attempts = (c.attempts || 0) + 1
          const max = c.maxAttempts || MAX_CODE_ATTEMPTS
          await ref.update({ attempts })
          const remaining = Math.max(max - attempts, 0)
          return fail(res, remaining ? 400 : 429, remaining ? 'invalid_code' : 'too_many_attempts',
            remaining ? 'That code is not correct.' : 'Too many incorrect codes. Request a new code.',
            { remainingAttempts: remaining })
        }
        await ref.update({ verifiedAt: Date.now(), attempts: (c.attempts || 0) + 1 })
      } else if (Date.now() - c.verifiedAt > VERIFIED_GRACE_MS) {
        return fail(res, 400, 'expired', expiredMsg)
      }

      // ---- the code is right: now, and only now, create the account ----

      let referredBy = null
      const referralCode = clean(body.referralCode, 40).toUpperCase()
      if (referralCode) {
        const ref2 = await db.collection('stores').where('referralCode', '==', referralCode).limit(1).get()
        if (ref2.empty) {
          return fail(res, 400, 'invalid_referral', "This referral code doesn't exist. Remove it or check the code.", { field: 'referralCode' })
        }
        referredBy = ref2.docs[0].id
      }

      // Checked again here, not only at `send`: minutes have passed.
      const redirected = await db.collection('stores').where('previousSlugs', 'array-contains', id.storeName).limit(1).get()
      if (!redirected.empty) {
        return fail(res, 409, 'slug_taken', 'That store URL is already taken. Go back and choose another.', { field: 'storeName' })
      }

      const auth = getAdminAuth()
      let user
      try {
        user = await auth.createUser({ email: id.email, password, displayName: id.businessName })
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          return fail(res, 409, 'email_taken', 'An account with this email already exists. Sign in instead.', { field: 'email' })
        }
        if (err.code === 'auth/invalid-password') return fail(res, 400, 'weak_password', 'Password must be at least 6 characters.', { field: 'password' })
        if (err.code === 'auth/invalid-email') return fail(res, 400, 'invalid_email', 'Please enter a valid email address.', { field: 'email' })
        throw err
      }
      const uid = user.uid
      const nowIso = new Date().toISOString()

      try {
        await db.runTransaction(async (tx) => {
          const claimRef = db.collection('verifiedPhones').doc(phone)
          const [fresh, claim, clash] = await Promise.all([
            tx.get(ref),
            tx.get(claimRef),
            tx.get(db.collection('stores').where('storeName', '==', id.storeName).limit(1)),
          ])
          if (fresh.data()?.consumedAt) throw new Error('already_used')
          if (claim.exists) throw new Error('phone_taken')
          if (!clash.empty) throw new Error('slug_taken')

          // Same shape the browser used to write at signup, plus the phone
          // fields, which only the server may set (firestore.rules).
          tx.set(db.collection('stores').doc(uid), {
            businessName: id.businessName,
            whatsappNumber,
            storeName: id.storeName,
            description,
            vendorType,
            ...(marketplaceInterest.supply || marketplaceInterest.dropship ? { marketplaceInterest } : {}),
            referredBy,
            email: id.email,
            ownerId: uid,
            isActive: true,
            plan: 'starter',
            planStatus: 'active',
            planStartDate: null,
            planEndDate: null,
            graceUntil: null,
            productCount: 0,
            maxProducts: 15,
            maxImagesPerProduct: 3,
            maxJobListings: 5,
            hasGrowthFeatures: false,
            hasProFeatures: false,
            hasPremiumFeatures: false,
            phoneVerified: true,
            verifiedPhone: phone,
            phoneVerifiedMasked: maskNgPhone(phone),
            phoneVerifiedAt: nowIso,
            createdAt: new Date(),
          })
          tx.set(claimRef, { storeId: uid, claimedAt: nowIso })
          tx.update(ref, { consumedAt: Date.now(), uid })
        })
      } catch (err) {
        // Roll the Firebase account back, so a failed signup can simply be
        // retried and never leaves an account with no store.
        await auth.deleteUser(uid).catch((e) => console.error('[signup-phone] rollback failed:', e.message))
        const known = {
          already_used: [409, 'This store has already been created. Sign in instead.', undefined],
          phone_taken: [409, PHONE_TAKEN_MESSAGE, 'phone'],
          slug_taken: [409, 'That store URL was just taken. Go back and choose another.', 'storeName'],
        }[err.message]
        if (known) return fail(res, known[0], err.message, known[1], known[2] ? { field: known[2] } : {})
        throw err
      }

      // This browser just proved the phone, so its first dashboard session
      // starts trusted. Without this, login OTP would treat it as a new device
      // and email a code seconds after signup. Email codes are for sign-ins.
      const sessionId = String(body.sessionId || '')
      if (SESSION_ID_RE.test(sessionId)) {
        await db.collection('stores').doc(uid).collection('sessions').doc(sessionId).set({
          actorUid: uid,
          actorLabel: 'Vendor',
          revoked: false,
          otpVerifiedAt: Date.now(),
          otpPending: false,
          otpReason: null,
          otpVerifiedBy: 'signup_sms',
          country: '',
          userAgent,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        }).catch((e) => console.error('[signup-phone] session pre-trust failed:', e.message))
      }

      await logAudit(db, { uid, action: 'signup', result: 'completed', ip, userAgent, meta: { phoneMasked: maskNgPhone(phone), storeName: id.storeName } })

      const customToken = await auth.createCustomToken(uid)
      return res.status(200).json({ success: true, customToken, storeId: uid, referrerId: referredBy })
    }

    return fail(res, 400, 'invalid_action', 'Invalid request.')
  } catch (err) {
    console.error('[signup-phone] Error:', err.message)
    return fail(res, 500, 'server_error', 'Something went wrong. Please try again.')
  }
}
