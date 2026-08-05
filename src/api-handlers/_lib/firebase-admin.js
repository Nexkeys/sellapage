//src/api-handlers/_lib/firebase-admin.js/
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Shared Firebase Admin accessors. Most handlers use these; a few older ones
// (google-ads-*, and others predating this module) still initialize inline.
// Both are safe to mix — the getApps() guard below means whichever runs first
// wins and the other reuses the same app, so there's no double-init.

let initialized = false;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  }

  return JSON.parse(raw);
}

export function getFirebaseAdminApp() {
  if (!initialized && !getApps().length) {
    initializeApp({
      credential: cert(parseServiceAccount()),
    });
    initialized = true;
  } else if (getApps().length) {
    initialized = true;
  }

  return getApps()[0];
}

export function getAdminDb() {
  getFirebaseAdminApp();
  return getFirestore();
}

export function getAdminAuth() {
  getFirebaseAdminApp();
  return getAuth();
}
