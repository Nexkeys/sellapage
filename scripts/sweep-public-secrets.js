// scripts/sweep-public-secrets.js
//
// One-off, idempotent, re-runnable. Moves any secret still sitting on the
// world-readable stores/{storeId} document into stores/{storeId}/private/*,
// then deletes it from the public document.
//
// Companion to scripts/audit-public-secrets.js — run that first.
//
// SAFETY
//  - Writes the private copy BEFORE deleting the public one, so an interrupted
//    run can never lose data. Re-running is harmless.
//  - Mirrors exactly what _lib/store-secrets.js writes, so the existing lazy
//    getters keep working unchanged afterwards (they check private/* first).
//  - Batched at 400 operations (Firestore's limit is 500).
//
// FREE-TIER COST (Firebase Spark: 50k reads / 20k writes per day)
//  - 1 read per store, plus ~2 writes per AFFECTED store. Fine for hundreds of
//    stores. If you have thousands, run with --limit and repeat across days.
//
// USAGE:
//   node --env-file=.env scripts/sweep-public-secrets.js --dry-run
//   node --env-file=.env scripts/sweep-public-secrets.js
//   node --env-file=.env scripts/sweep-public-secrets.js --limit 500
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT. Try: node --env-file=.env scripts/sweep-public-secrets.js')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}
const db = getFirestore()

// Same masking rule as _lib/store-secrets.js.
function maskAccountNumber(accountNumber) {
  const value = String(accountNumber || '')
  if (value.length < 4) return ''
  return '******' + value.slice(-4)
}

const snap = await db.collection('stores').get()
console.log(`Scanned ${snap.size} stores.${DRY_RUN ? '  (DRY RUN — nothing will be written)' : ''}\n`)

let batch = db.batch()
let opsInBatch = 0
let swept = 0
const revokeList = []

async function flush() {
  if (opsInBatch === 0) return
  if (!DRY_RUN) await batch.commit()
  batch = db.batch()
  opsInBatch = 0
}

for (const doc of snap.docs) {
  if (swept >= LIMIT) break

  const d = doc.data()
  const hasAds = !!d.googleAdsRefreshToken
  const hasBank = !!d.referralBankAccount
  if (!hasAds && !hasBank) continue

  const strip = {}

  if (hasAds) {
    batch.set(
      doc.ref.collection('private').doc('googleAds'),
      { refreshToken: d.googleAdsRefreshToken, migratedAt: new Date() },
      { merge: true },
    )
    strip.googleAdsRefreshToken = FieldValue.delete()
    revokeList.push(doc.id)
    opsInBatch++
  }

  if (hasBank) {
    batch.set(
      doc.ref.collection('private').doc('referralBank'),
      {
        bankName: d.referralBankName || '',
        bankCode: d.referralBankCode || '',
        accountNumber: d.referralBankAccount,
        accountName: d.referralBankAccountName || '',
        migratedAt: new Date(),
      },
      { merge: true },
    )
    strip.referralBankAccount = FieldValue.delete()
    strip.referralBankCode = FieldValue.delete()
    // Keep a masked copy for display, matching setReferralBank().
    strip.referralBankAccountMasked = maskAccountNumber(d.referralBankAccount)
    opsInBatch++
  }

  batch.update(doc.ref, strip)
  opsInBatch++
  swept++

  console.log(`  ${DRY_RUN ? 'would sweep' : 'swept'}  ${doc.id}  ${Object.keys(strip).join(', ')}`)

  if (opsInBatch >= 400) await flush()
}

await flush()

console.log(`\n${DRY_RUN ? 'Would sweep' : 'Swept'} ${swept} store(s).`)

if (revokeList.length) {
  console.log(`\n=== ACTION REQUIRED: ${revokeList.length} Google Ads refresh token(s) were publicly readable ===`)
  console.log('Removing them from the public document does NOT invalidate them — anyone who')
  console.log('already copied one still has working access to that vendor\'s Google Ads account.')
  console.log('Revoke each and have the vendor reconnect:\n')
  for (const id of revokeList) console.log(`  ${id}`)
  console.log('\nRun: node --env-file=.env scripts/revoke-google-ads-tokens.js')
}

process.exit(0)
