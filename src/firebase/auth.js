// src/firebase/auth.js/
import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './config'
import { clearSessionId } from '../utils/sessionTracking'

// Vendor signup is no longer done from the browser. The account and store are
// created by /api/signup-phone after the SMS code is verified, and the page
// signs in with the custom token it returns (loginWithCustomToken below).

export const loginSeller = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const loginWithCustomToken = async (customToken) => {
  return await signInWithCustomToken(auth, customToken)
}

export const logoutSeller = async () => {
  clearSessionId()
  return await signOut(auth)
}

export const resetPassword = async (email) => {
  const res = await fetch('/api/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send reset email');
  }

  return true;
};

export const getSellerStore = async (uid) => {
  const snap = await getDoc(doc(db, 'stores', uid))
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export const updateStore = async (storeId, data) => {
  await updateDoc(doc(db, 'stores', storeId), data)
}

export const deleteAuthUser = async () => {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('No authenticated user found.')
  await deleteUser(currentUser)
}

export { onAuthStateChanged, auth }
