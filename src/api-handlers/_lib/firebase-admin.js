import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
