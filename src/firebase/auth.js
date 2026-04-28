import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'

/**
 * Register a new seller and create their store document in Firestore.
 */
export const registerSeller = async (email, password, storeData) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await setDoc(doc(db, 'stores', user.uid), {
    ...storeData,
    email,
    ownerId: user.uid,
    isActive: true,
    plan: 'free',
    createdAt: new Date(),
  })

  return user
}

export const loginSeller = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const logoutSeller = async () => {
  return await signOut(auth)
}

/**
 * Sends a password reset email via Firebase Auth.
 * The user receives a link to reset their password.
 */
export const resetPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email)
}

export const getSellerStore = async (uid) => {
  const snap = await getDoc(doc(db, 'stores', uid))
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export { onAuthStateChanged, auth }