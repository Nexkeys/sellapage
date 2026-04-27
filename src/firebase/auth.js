import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'

/**
 * Register a new seller and create their store document in Firestore.
 * storeData should include: businessName, whatsappNumber, storeName, description
 */
export const registerSeller = async (email, password, storeData) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await setDoc(doc(db, 'stores', user.uid), {
    ...storeData,
    email,
    ownerId: user.uid,
    isActive: true,
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

export const getSellerStore = async (uid) => {
  const snap = await getDoc(doc(db, 'stores', uid))
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export { onAuthStateChanged, auth }