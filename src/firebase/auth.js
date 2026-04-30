import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
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


/**
 * Partially update store document fields.
 * Safe merge — only updates the specified fields, leaves all others untouched.
 */
export const updateStore = async (storeId, data) => {
  await updateDoc(doc(db, 'stores', storeId), data)
}


/**
 * Delete the currently signed-in Firebase Auth user account.
 * May throw auth/requires-recent-login if the session is stale — handle this
 * in the calling code with a friendly re-login prompt.
 */
export const deleteAuthUser = async () => {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('No authenticated user found.')
  await deleteUser(currentUser)
}


export { onAuthStateChanged, auth }