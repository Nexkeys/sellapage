// scripts/audit-public-secrets.js
//
// READ-ONLY. Reports how many store documents still carry secrets on the
// world-readable stores/{storeId} document.
//
// WHY THIS EXISTS
// _lib/store-secrets.js relocates googleAdsRefreshToken and referralBankAccount
// into stores/{id}/private/*, but it migrates LAZILY — only when the relevant
// getter runs. getGoogleAdsRefreshToken() runs only when that store makes a
// Google Ads API call; getReferralBank() only when it requests a withdrawal.
// So the exposure persists exactly for the stores that are least active, and
// never self-heals for a dormant or disconnected vendor. Meanwhile
// `allow read: if true` on /stores means anyone can page the whole collection.
//
// Run this first to size the problem, then scripts/sweep-public-secrets.js.
//
// USAGE:  node scripts/audit-public-secrets.js
// Requires FIREBASE_SERVICE_ACCOUNT in the environment (as in Vercel).
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT. Load your .env first, e.g.:')
  console.error('  node --env-file=.env scripts/audit-public-secrets.js')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}
const db = getFirestore()

const EXPOSED_FIELDS = [
  'googleAdsRefreshToken',  // live OAuth credential
  'referralBankAccount',    // full bank account number
  'referralBankCode',
]

const snap = await db.collection('stores').get()

const findings = []
for (const doc of snap.docs) {
  const data = doc.data()
  const present = EXPOSED_FIELDS.filter((f) => data[f])
  if (present.length) findings.push({ id: doc.id, name: data.storeName || data.businessName || '', fields: present })
}

console.log(`\nScanned ${snap.size} store documents.\n`)

if (!findings.length) {
  console.log('No exposed secrets found on public store documents.')
} else {
  for (const f of findings) {
    console.log(`  ${f.id}  ${f.name.padEnd(28)}  ${f.fields.join(', ')}`)
  }
  const adsCount = findings.filter((f) => f.fields.includes('googleAdsRefreshToken')).length
  const bankCount = findings.filter((f) => f.fields.includes('referralBankAccount')).length
  console.log(`\n  ${findings.length} store(s) affected`)
  console.log(`    ${adsCount} exposed Google Ads refresh token(s)  <-- treat as COMPROMISED, must be revoked`)
  console.log(`    ${bankCount} exposed bank account number(s)      <-- cannot be rotated; notify those vendors`)
  console.log('\nNext: node --env-file=.env scripts/sweep-public-secrets.js')
}

process.exit(0)
