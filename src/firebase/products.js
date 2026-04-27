import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Uploads an image file to Cloudinary and returns the secure URL.
 * No API key required — uses an unsigned upload preset.
 */
const uploadToCloudinary = async (imageFile) => {
  const formData = new FormData()
  formData.append('file', imageFile)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'sellapage/products')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) throw new Error('Image upload failed. Please try again.')

  const data = await response.json()
  return data.secure_url
}

/** Add a new product. Uploads image to Cloudinary if provided. */
export const addProduct = async (storeId, productData, imageFile) => {
  let imageUrl = ''

  if (imageFile) {
    imageUrl = await uploadToCloudinary(imageFile)
  }

  const docRef = await addDoc(collection(db, 'stores', storeId, 'products'), {
    ...productData,
    imageUrl,
    createdAt: new Date(),
  })

  return { id: docRef.id, ...productData, imageUrl }
}

/** Fetch all products for a store, newest first. */
export const getProducts = async (storeId) => {
  const q = query(
    collection(db, 'stores', storeId, 'products'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Update a product. Replaces image via Cloudinary if a new file is provided. */
export const updateProduct = async (storeId, productId, updates, newImageFile) => {
  let imageUrl = updates.imageUrl

  if (newImageFile) {
    imageUrl = await uploadToCloudinary(newImageFile)
  }

  const finalData = { ...updates, imageUrl, updatedAt: new Date() }
  await updateDoc(doc(db, 'stores', storeId, 'products', productId), finalData)
  return finalData
}

/** Delete a product from Firestore.
 *  Note: Cloudinary images are not deleted here to keep the logic simple.
 *  You can manage unused images periodically from the Cloudinary dashboard.
 */
export const deleteProduct = async (storeId, productId) => {
  await deleteDoc(doc(db, 'stores', storeId, 'products', productId))
}

/** Fetch a store document by its public URL slug. */
export const getStoreBySlug = async (storeName) => {
  const q = query(collection(db, 'stores'), where('storeName', '==', storeName))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  }
  return null
}