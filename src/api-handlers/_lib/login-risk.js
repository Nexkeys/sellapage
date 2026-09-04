// src/api-handlers/_lib/login-risk.js
// Risk evaluation for login-time OTP (OTP plan, Phase 2).
//
// POLICY (chosen by Nex): challenge on an unrecognised device, a country
// change, or a verification older than 30 days. NOT on every login - see
// Docs/OTP-Verification-Plan.md Part A for why every-login OTP would tax the
// daily path while adding little.
//
// This reuses the session records sessions.js already writes
// (stores/{storeId}/sessions/{sessionId}: device, browser, ip, city, region,
// country, lastActiveAt), so "is this a known device" is an existing fact
// rather than new infrastructure.
//
// ENFORCEMENT - read this before assuming the gate holds:
// signInWithEmailAndPassword returns a fully valid ID token immediately, so a
// client-side OTP screen proves nothing on its own. The durable part is the
// session record: a session that needs OTP is written with otpPending=true, and
// sessions.js's 45s heartbeat treats that as not-yet-trusted. Server handlers
// can additionally call requireTrustedSession(). Full coverage of the owner's
// DIRECT Firestore writes (products/services/etc.) would need a Firebase custom
// claim consulted from firestore.rules - deliberately not done here, and called
// out as the remaining gap rather than implied to be covered.

export const LOGIN_OTP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const RISK_REASONS = {
  NEW_DEVICE: 'new_device',
  COUNTRY_CHANGE: 'country_change',
  STALE_VERIFICATION: 'stale_verification',
  NONE: null,
}

/**
 * Decides whether this login needs an email OTP.
 * @returns {{challenge: boolean, reason: string|null, existing: boolean}}
 */
export function evaluateLoginRisk({ sessionDoc, currentCountry }) {
  // Unknown device/browser - the primary trigger.
  if (!sessionDoc) {
    return { challenge: true, reason: RISK_REASONS.NEW_DEVICE, existing: false }
  }

  const verifiedAt = sessionDoc.otpVerifiedAt || 0

  // Known sessionId but never OTP-verified (e.g. created before Phase 2
  // shipped, or a challenge that was abandoned).
  if (!verifiedAt) {
    return { challenge: true, reason: RISK_REASONS.NEW_DEVICE, existing: true }
  }

  // Country change on a known device. Only compare when BOTH sides are known -
  // ipapi.co returns '' for private/unresolvable IPs, and treating unknown as a
  // mismatch would challenge people for no reason.
  const known = String(sessionDoc.country || '').trim()
  const now = String(currentCountry || '').trim()
  if (known && now && known.toLowerCase() !== now.toLowerCase()) {
    return { challenge: true, reason: RISK_REASONS.COUNTRY_CHANGE, existing: true }
  }

  if (Date.now() - verifiedAt > LOGIN_OTP_MAX_AGE_MS) {
    return { challenge: true, reason: RISK_REASONS.STALE_VERIFICATION, existing: true }
  }

  return { challenge: false, reason: RISK_REASONS.NONE, existing: true }
}

export function riskReasonMessage(reason) {
  switch (reason) {
    case RISK_REASONS.NEW_DEVICE:
      return "We don't recognise this device, so we've emailed you a code to confirm it's you."
    case RISK_REASONS.COUNTRY_CHANGE:
      return "You're signing in from a new location, so we've emailed you a code to confirm it's you."
    case RISK_REASONS.STALE_VERIFICATION:
      return "It's been a while since we confirmed this device. We've emailed you a code."
    default:
      return 'Enter the code we emailed you.'
  }
}

/**
 * Server-side trust check for handlers that want to require a verified session.
 * Returns true when the session is verified (or when login gating is off, so
 * enabling/disabling the feature never strands existing sessions).
 */
export async function isSessionTrusted(db, storeId, sessionId) {
  if (!isLoginOtpEnabled()) return true
  if (!storeId || !sessionId) return false
  try {
    const snap = await db
      .collection('stores').doc(storeId)
      .collection('sessions').doc(sessionId).get()
    if (!snap.exists) return false
    const s = snap.data()
    if (s.revoked) return false
    if (s.otpPending) return false
    return !!s.otpVerifiedAt && Date.now() - s.otpVerifiedAt <= LOGIN_OTP_MAX_AGE_MS
  } catch {
    // Fail open on infrastructure errors - a Firestore blip must not lock
    // every vendor out of their own dashboard.
    return true
  }
}

/**
 * Login OTP gating is OFF unless explicitly enabled. Turning it on is a
 * deliberate act: it changes the login path for every vendor, and account
 * recovery must be working first (Docs/OTP-Verification-Plan.md Part H).
 */
export function isLoginOtpEnabled() {
  return String(process.env.ENABLE_LOGIN_OTP || '').toLowerCase() === 'true'
}
