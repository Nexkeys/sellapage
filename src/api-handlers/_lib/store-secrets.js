// src/api-handlers/_lib/store-secrets.js
// Credentials and full bank details must never live on stores/{storeId} —
// that document is world-readable (`allow read: if true` in firestore.rules,
// required by public store pages), and Firestore has no field-level security,
// so anything on it is public. These live in stores/{storeId}/private/* which
// has `allow read, write: if false` — reachable only via the Admin SDK.
//
// Each getter lazily migrates any legacy value still sitting on the public
// store doc: it copies the value into the private doc and deletes it from the
// public one, then returns it. Idempotent, no migration script needed —
// matches the lazy-sweep pattern already used for referral pending balances.
import { FieldValue } from 'firebase-admin/firestore'

const GOOGLE_ADS_DOC = 'googleAds'
const REFERRAL_BANK_DOC = 'referralBank'

function privateDoc(db, storeId, docId) {
  return db.collection('stores').doc(storeId).collection('private').doc(docId)
}

export function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '')
  if (value.length < 4) return ''
  return '******' + value.slice(-4)
}

// ---------------------------------------------------------------- Google Ads

export async function getGoogleAdsRefreshToken(db, storeId) {
  const ref = privateDoc(db, storeId, GOOGLE_ADS_DOC)
  const snap = await ref.get()
  if (snap.exists && snap.data().refreshToken) return snap.data().refreshToken

  // Legacy fallback: still on the public store doc — migrate it off.
  const storeRef = db.collection('stores').doc(storeId)
  const storeSnap = await storeRef.get()
  const legacy = storeSnap.exists ? storeSnap.data().googleAdsRefreshToken : null
  if (!legacy) return null

  await ref.set({ refreshToken: legacy, migratedAt: new Date() }, { merge: true })
  await storeRef.update({ googleAdsRefreshToken: FieldValue.delete() })
  return legacy
}

export async function setGoogleAdsRefreshToken(db, storeId, refreshToken) {
  await privateDoc(db, storeId, GOOGLE_ADS_DOC).set(
    { refreshToken, updatedAt: new Date() },
    { merge: true },
  )
}

export async function clearGoogleAdsRefreshToken(db, storeId) {
  await privateDoc(db, storeId, GOOGLE_ADS_DOC).set(
    { refreshToken: null, updatedAt: new Date() },
    { merge: true },
  )
  // Belt-and-braces: also strip any legacy copy off the public doc.
  await db.collection('stores').doc(storeId).update({
    googleAdsRefreshToken: FieldValue.delete(),
  }).catch(() => {})
}

// -------------------------------------------------------------- Referral bank

/**
 * Returns { bankName, bankCode, accountNumber, accountName, verified } with the
 * FULL account number — server-side callers only (e.g. denormalizing onto a
 * withdrawal request so an admin can actually pay it).
 */
export async function getReferralBank(db, storeId) {
  const ref = privateDoc(db, storeId, REFERRAL_BANK_DOC)
  const snap = await ref.get()
  const storeRef = db.collection('stores').doc(storeId)
  const storeSnap = await storeRef.get()
  const store = storeSnap.exists ? storeSnap.data() : {}

  if (snap.exists && snap.data().accountNumber) {
    const d = snap.data()
    return {
      bankName: d.bankName || store.referralBankName || '',
      bankCode: d.bankCode || '',
      accountNumber: d.accountNumber,
      accountName: d.accountName || store.referralBankAccountName || '',
      verified: store.referralBankVerified === true,
    }
  }

  // Legacy fallback: full number still on the public store doc — migrate it off.
  const legacyNumber = store.referralBankAccount
  if (!legacyNumber) {
    return {
      bankName: store.referralBankName || '',
      bankCode: '',
      accountNumber: '',
      accountName: store.referralBankAccountName || '',
      verified: store.referralBankVerified === true,
    }
  }

  const migrated = {
    bankName: store.referralBankName || '',
    bankCode: store.referralBankCode || '',
    accountNumber: legacyNumber,
    accountName: store.referralBankAccountName || '',
  }
  await ref.set({ ...migrated, migratedAt: new Date() }, { merge: true })
  await storeRef.update({
    referralBankAccount: FieldValue.delete(),
    referralBankCode: FieldValue.delete(),
    referralBankAccountMasked: maskAccountNumber(legacyNumber),
  })
  return { ...migrated, verified: store.referralBankVerified === true }
}

/**
 * Writes the full bank details privately and returns the public-safe subset the
 * caller should write onto stores/{storeId} for display.
 */
export async function setReferralBank(db, storeId, { bankName, bankCode, accountNumber, accountName }) {
  await privateDoc(db, storeId, REFERRAL_BANK_DOC).set(
    { bankName, bankCode, accountNumber, accountName, updatedAt: new Date() },
    { merge: true },
  )
  return {
    referralBankName: bankName,
    referralBankAccountName: accountName,
    referralBankAccountMasked: maskAccountNumber(accountNumber),
    referralBankVerified: true,
    // Ensure any legacy plaintext copies are removed from the public doc.
    referralBankAccount: FieldValue.delete(),
    referralBankCode: FieldValue.delete(),
  }
}
