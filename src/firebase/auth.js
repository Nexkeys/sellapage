// src/firebase/auth.js/
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './config'
import { clearSessionId } from '../utils/sessionTracking'
import { isReservedSlug } from '../utils/reservedSlugs'

export const registerSeller = async (email, password, storeData) => {
  if (isReservedSlug(storeData.storeName)) {
    throw new Error('That store name is reserved. Please choose another.')
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await setDoc(doc(db, 'stores', user.uid), {
    ...storeData,
    email,
    ownerId: user.uid,
    isActive: true,
    vendorType: storeData.vendorType || 'products',
    plan: 'starter',
    planStatus: 'active',
    planStartDate: null,
    planEndDate: null,
    graceUntil: null,
    productCount: 0,
    maxProducts: 15,
    maxImagesPerProduct: 3,
    maxJobListings: 5,
    hasGrowthFeatures: false,
    hasProFeatures: false,
    hasPremiumFeatures: false,
    referredBy: storeData.referredBy || null,
    createdAt: new Date(),
  })

  // Send welcome notification
  try {
    const token = await user.getIdToken()
    await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'welcome' }),
    })
  } catch (err) {
    console.error('Error sending welcome notification:', err)
  }

  return { user, referredBy: storeData.referredBy || null }
}

export const loginSeller = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password)
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
