#!/usr/bin/env node
// scripts/ops-bootstrap.js
//
// The only way in that does not go through the Ops console itself. Use it to
// create the FIRST super admin, and as the break-glass route if every super
// admin ever loses their authenticator. Every run is written to the Activity
// Log as "bootstrap script".
//
// Usage (needs FIREBASE_SERVICE_ACCOUNT in the environment, same as the API):
//   node scripts/ops-bootstrap.js invite --email you@work.com --name "Ben Pascal" --title "CEO"
//       Creates a super admin invite and prints the join link (valid 48 hours).
//       Open it, choose a password, scan the QR code. Nothing is emailed.
//   node scripts/ops-bootstrap.js reset-authenticator --email you@work.com
//       Clears that person's authenticator and ends their sessions. On their
//       next sign-in they confirm their email, then set up a new one.
//   node scripts/ops-bootstrap.js list
//       Shows every Ops account and its status.
//
// The email must NOT already be a Sellapage store login: staff accounts are
// separate on purpose. Set OPS_URL if the console is not on
// https://ops.sellapage.com.ng (for example http://localhost:5173/ops).
import crypto from 'crypto'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const [, , command, ...rest] = process.argv
const arg = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? String(rest[i + 1] || '').trim() : ''
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set.')
  process.exit(1)
}
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()
const auth = getAuth()
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
const opsUrl = String(process.env.OPS_URL || 'https://ops.sellapage.com.ng').replace(/\/+$/, '')
const MAX_TS = 9999999999999

async function log(entry) {
  const now = Date.now()
  const id = `${String(MAX_TS - now).padStart(13, '0')}_${crypto.randomBytes(5).toString('base64url')}`
  await db.collection('opsAudit').doc(id).set({
    at: now, uid: null, name: 'Bootstrap script', title: '', tab: 'admins', result: 'ok', sessionId: null,
    ip: null, device: 'Command line', target: null, changes: null, ...entry,
  })
}

async function run() {
  if (command === 'invite') {
    const email = arg('email').toLowerCase()
    const name = arg('name')
    const title = arg('title')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || name.length < 2) {
      console.error('Usage: node scripts/ops-bootstrap.js invite --email you@work.com --name "Full Name" --title "Job title"')
      process.exit(1)
    }
    try {
      const existing = await auth.getUserByEmail(email)
      const prior = await db.collection('opsStaff').doc(existing.uid).get()
      if (!(existing.customClaims?.ops && prior.exists && prior.get('status') === 'deleted')) {
        console.error(`${email} already has a Sellapage login${prior.exists ? ' (an Ops account)' : ' (a store)'}. Use a different email for the Ops account.`)
        process.exit(1)
      }
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err
    }
    const token = crypto.randomBytes(32).toString('base64url')
    const now = Date.now()
    await db.collection('opsInvites').doc(sha256(token)).set({
      email, name, title, isSuper: true, tabs: [], template: '', createdAt: now, expiresAt: now + 48 * 3600 * 1000,
      createdBy: 'bootstrap', createdByName: 'Bootstrap script', usedAt: null, cancelledAt: null,
    })
    await log({ action: 'ops.invited', target: { type: 'invite', id: email, label: name }, summary: `Bootstrap: super admin invite for ${name}${title ? ` (${title})` : ''}` })
    console.log(`\nSuper admin invite created for ${name} <${email}>.`)
    console.log('Open this link within 48 hours (it works once). Do not share it:\n')
    console.log(`${opsUrl}/join?token=${token}\n`)
    return
  }

  if (command === 'reset-authenticator') {
    const email = arg('email').toLowerCase()
    const snap = await db.collection('opsStaff').where('email', '==', email).limit(1).get()
    if (snap.empty) { console.error(`No Ops account for ${email}.`); process.exit(1) }
    const doc = snap.docs[0]
    await doc.ref.update({ totpSecretEnc: null, totpEnabled: false, recoveryHashes: [], totpLastStep: 0 })
    const live = await db.collection('opsSessions').where('uid', '==', doc.id).where('endedAt', '==', null).get()
    const batch = db.batch()
    live.docs.forEach((d) => batch.update(d.ref, { endedAt: Date.now(), endReason: 'authenticator_reset', endedBy: 'bootstrap' }))
    await batch.commit()
    await log({ action: 'ops.reset_approved', target: { type: 'staff', id: doc.id, label: doc.get('name') }, summary: `Bootstrap: authenticator reset for ${doc.get('name')} (${live.size} session(s) ended)` })
    console.log(`Authenticator cleared for ${doc.get('name')} <${email}>. ${live.size} session(s) ended.`)
    console.log('On their next sign-in they confirm a code sent to their email, then set up a new authenticator.')
    return
  }

  if (command === 'list') {
    const snap = await db.collection('opsStaff').get()
    if (snap.empty) { console.log('No Ops accounts yet. Run the invite command first.'); return }
    for (const d of snap.docs) {
      const s = d.data()
      console.log(`${s.status.padEnd(8)} ${s.isSuper ? 'SUPER ' : '      '} ${s.name} <${s.email}> ${s.title ? `- ${s.title}` : ''} ${s.totpEnabled ? '' : '(no authenticator yet)'}`)
    }
    return
  }

  console.log('Commands: invite, reset-authenticator, list. See the top of scripts/ops-bootstrap.js.')
}

run().then(() => process.exit(0)).catch((err) => { console.error(err.message); process.exit(1) })
