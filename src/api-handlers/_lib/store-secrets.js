// src/api-handlers/_lib/store-secrets.js
// Credentials and full bank details must never live on stores/{storeId} -
// that document is world-readable (`allow read: if true` in firestore.rules,
// required by public store pages), and Firestore has no field-level security,
// so anything on it is public. These live in stores/{storeId}/private/* which
// has `allow read, write: if false` - reachable only via the Admin SDK.
//
// Each getter lazily migrates any legacy value still sitting on the public
// store doc: it copies the value into the private doc and deletes it from the
// public one, then returns it. Idempotent, no migration script needed -
// matches the lazy-sweep pattern already used for referral pending balances.
import { FieldValue } from 'firebase-admin/firestore'

const GOOGLE_ADS_DOC = 'googleAds'
const REFERRAL_BANK_DOC = 'referralBank'
const CONTACT_DOC = 'contact'

function privateDoc(db, storeId, docId) {
  return db.collection('stores').doc(storeId).collection('private').doc(docId)
}

export function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '')
  if (value.length < 4) return ''
  return '******' + value.slice(-4)
}

// ------------------------------------------------------------------- Contact
// GROUNDWORK for the vendor-PII relocation (security review H-02). NOT YET
// WIRED - see the migration note below before using these.
//
// stores/{storeId} is world-readable AND listable: getStoreBySlug()
// (src/firebase/products.js:270) and getActiveStores() (:321) are collection
// queries every public storefront depends on, so `list` cannot be denied in
// firestore.rules. That means anyone can page the whole collection and harvest
// every vendor's email, phone, whatsappNumber, address and rcNumber. Because
// the rules layer cannot fix it, the only real fix is moving those fields off
// the public document - which is what these helpers are for.
//
// MIGRATION SEQUENCE (do not collapse into one deploy):
//   1. Write to both: call setStoreContact() alongside the existing public
//      write. Nothing breaks; both sources agree.
//   2. Switch readers: server handlers use getStoreContact(); any client code
//      reading store.email/phone/etc. moves to an authenticated endpoint.
//      Find them with:
//        grep -rn "store\.\(email\|phone\|whatsappNumber\|address\|rcNumber\)" src/
//   3. Delete the public copies with a sweep like scripts/sweep-public-secrets.js.
//
// Note step 2 is the real work: signup (src/firebase/auth.js:23) and settings
// updates write these fields from the browser, and clients cannot write to
// private/* (rules deny it), so those writes need a server endpoint first.

/** Vendor contact + KYC details. Server-side callers only. */
export async function getStoreContact(db, storeId) {
  const snap = await privateDoc(db, storeId, CONTACT_DOC).get()
  if (snap.exists) return snap.data()

  // Fallback to the public doc while the migration is incomplete, so callers
  // switched to this helper keep working for un-migrated stores.
  const storeSnap = await db.collection('stores').doc(storeId).get()
  const s = storeSnap.exists ? storeSnap.data() : {}
  return {
    email: s.email || '',
    phone: s.phone || '',
    whatsappNumber: s.whatsappNumber || '',
    address: s.address || '',
    rcNumber: s.rcNumber || '',
  }
}

/** Writes contact details privately. Returns nothing to put on the public doc. */
export async function setStoreContact(db, storeId, { email, phone, whatsappNumber, address, rcNumber }) {
  await privateDoc(db, storeId, CONTACT_DOC).set(
    { email, phone, whatsappNumber, address, rcNumber, updatedAt: new Date() },
    { merge: true },
  )
}

// ---------------------------------------------------------------- Google Ads

export async function getGoogleAdsRefreshToken(db, storeId) {
  const ref = privateDoc(db, storeId, GOOGLE_ADS_DOC)
  const snap = await ref.get()
  if (snap.exists && snap.data().refreshToken) return snap.data().refreshToken

  // Legacy fallback: still on the public store doc - migrate it off.
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
 * FULL account number - server-side callers only (e.g. denormalizing onto a
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

  // Legacy fallback: full number still on the public store doc - migrate it off.
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
