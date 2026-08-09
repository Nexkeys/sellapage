// scripts/revoke-google-ads-tokens.js
//
// Revokes Google Ads OAuth refresh tokens that were exposed on the public
// stores/{storeId} document, and clears the stored connection so the vendor is
// prompted to reconnect.
//
// WHY REVOCATION IS NECESSARY
// Sweeping a token off the public document stops FUTURE disclosure but does
// nothing about disclosure that already happened. A refresh token remains valid
// until explicitly revoked at Google, so anyone who copied one during the
// exposure window retains persistent access to that vendor's Google Ads account
// — able to read campaign data and, via _lib/google-ads-client.js, create
// campaigns and spend their budget. Only revocation closes that.
//
// Run AFTER scripts/sweep-public-secrets.js, passing the store IDs it listed.
//
// USAGE:
//   node --env-file=.env scripts/revoke-google-ads-tokens.js <storeId> [storeId...]
//   node --env-file=.env scripts/revoke-google-ads-tokens.js --all-migrated
//
// `--all-migrated` targets every store whose private/googleAds doc has a
// `migratedAt` field, i.e. exactly those the sweep touched.
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT. Try: node --env-file=.env scripts/revoke-google-ads-tokens.js ...')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}
const db = getFirestore()

const args = process.argv.slice(2)
const ALL_MIGRATED = args.includes('--all-migrated')
const explicitIds = args.filter((a) => !a.startsWith('--'))

if (!ALL_MIGRATED && explicitIds.length === 0) {
  console.error('Pass store IDs, or --all-migrated. See the header of this file.')
  process.exit(1)
}

let storeIds = explicitIds

if (ALL_MIGRATED) {
  const snap = await db.collection('stores').get()
  storeIds = []
  for (const doc of snap.docs) {
    const priv = await doc.ref.collection('private').doc('googleAds').get()
    if (priv.exists && priv.data().migratedAt && priv.data().refreshToken) {
      storeIds.push(doc.id)
    }
  }
  console.log(`Found ${storeIds.length} store(s) with a swept Google Ads token.\n`)
}

let revoked = 0
let failed = 0

for (const storeId of storeIds) {
  const ref = db.collection('stores').doc(storeId).collection('private').doc('googleAds')
  const snap = await ref.get()
  const refreshToken = snap.exists ? snap.data().refreshToken : null

  if (!refreshToken) {
    console.log(`  skip    ${storeId}  (no stored token)`)
    continue
  }

  try {
    // Google's revocation endpoint invalidates the refresh token and every
    // access token derived from it.
    const res = await fetch(
      'https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(refreshToken),
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )

    // 200 = revoked. 400 usually means already invalid, which is also fine.
    if (!res.ok && res.status !== 400) {
      throw new Error(`revoke returned ${res.status}`)
    }

    await ref.set({ refreshToken: null, revokedAt: new Date(), revokedReason: 'public-exposure' }, { merge: true })
    await db.collection('stores').doc(storeId).update({
      googleAdsConnected: false,
      googleAdsDisconnectedAt: new Date().toISOString(),
    })

    console.log(`  revoked ${storeId}`)
    revoked++
  } catch (err) {
    console.error(`  FAILED  ${storeId}: ${err.message}`)
    failed++
  }
}

console.log(`\nRevoked ${revoked}, failed ${failed}.`)
if (revoked) {
  console.log('Affected vendors must reconnect Google Ads from their dashboard.')
  console.log('Consider emailing them — their integration will simply appear disconnected otherwise.')
}

process.exit(failed ? 1 : 0)
