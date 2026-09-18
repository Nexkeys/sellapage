// src/api-handlers/_lib/phone-claims.js
// One verified number, one store, across the whole platform, and the daily cap
// on SMS codes. Shared by signup (signup-phone.js) and the Settings card
// (otp-send.js / phone-verify.js) so the two can never disagree.
//
// The claim itself is `verifiedPhones/{2348012345678}` -> { storeId }. The
// number is the document id, so "is it taken?" is one document read, fast
// enough to run while the vendor is still typing.
import { durableRateLimit } from './rate-limit.js'
import { normaliseNgMobile } from '../../utils/phone.js'

export const SMS_CODES_PER_DAY = 3
const DAY_MS = 24 * 60 * 60 * 1000

// Signup is unauthenticated, so the IP is the only handle on a script. Kept
// well above 3 because Nigerian mobile carriers put many subscribers behind
// one address (CGNAT); the per-number cap is what does the real work.
const SIGNUP_IP_CODES_PER_DAY = 20

// Last line of defence for the wallet: however the other limits are dodged,
// the platform cannot send more than this many codes in a day.
const GLOBAL_CODES_PER_DAY = Number(process.env.SMS_GLOBAL_DAILY_CAP) || 500

export const INVALID_PHONE_MESSAGE = 'Enter a valid Nigerian mobile number, e.g. 08012345678.'
export const PHONE_TAKEN_MESSAGE =
  'This number is already verified on another Sellapage store. Enter a different number.'

/**
 * @returns {{ok:true, phone:string, ownedBySelf:boolean} | {ok:false, error:string, message:string, phone?:string}}
 */
export async function checkPhone(db, input, uid = null) {
  const phone = normaliseNgMobile(input)
  if (!phone) return { ok: false, error: 'invalid_phone', message: INVALID_PHONE_MESSAGE }

  const snap = await db.collection('verifiedPhones').doc(phone).get()
  if (!snap.exists) return { ok: true, phone, ownedBySelf: false }
  if (uid && snap.data().storeId === uid) return { ok: true, phone, ownedBySelf: true }
  return { ok: false, phone, error: 'phone_taken', message: PHONE_TAKEN_MESSAGE }
}

/**
 * Spends one code from every applicable daily allowance. Called immediately
 * before the SMS goes out, after every check that could still refuse, so a
 * rejected request never costs the vendor one of their 3.
 */
export async function takeSmsQuota({ phone, uid = null, ip = null }) {
  if (uid && !(await durableRateLimit('sms_uid_day', uid, SMS_CODES_PER_DAY, DAY_MS))) {
    return { ok: false, error: 'account_daily_limit', message: "You've used today's 3 verification codes. Try again tomorrow." }
  }
  if (ip && !(await durableRateLimit('sms_ip_day', ip, SIGNUP_IP_CODES_PER_DAY, DAY_MS))) {
    return { ok: false, error: 'ip_daily_limit', message: 'Too many verification codes from this network today. Try again tomorrow.' }
  }
  if (!(await durableRateLimit('sms_phone_day', phone, SMS_CODES_PER_DAY, DAY_MS))) {
    return { ok: false, error: 'phone_daily_limit', message: "This number has used today's 3 verification codes. Try again tomorrow." }
  }
  if (!(await durableRateLimit('sms_global_day', 'all', GLOBAL_CODES_PER_DAY, DAY_MS))) {
    console.error('[phone-claims] global daily SMS cap reached')
    return { ok: false, error: 'global_daily_limit', message: 'Phone verification is busy right now. Please try again in a few hours.' }
  }
  return { ok: true }
}
