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
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'


const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET


export const FREE_PLAN_LIMIT = 10


/**
 * Internal: upload a single file to Cloudinary.
 * @param {File}   imageFile
 * @param {string} folder - Cloudinary destination folder
 */
const uploadToCloudinary = async (imageFile, folder = 'sellapage/products') => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Please check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    )
  }

  const formData = new FormData()
  formData.append('file', imageFile)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(
      errData?.error?.message ||
      `Image upload failed (${response.status}). Check your Cloudinary upload preset is set to Unsigned.`
    )
  }

  const data = await response.json()
  return data.secure_url
}


/**
 * Upload multiple image files in parallel.
 * Returns an array of secure URLs.
 */
const uploadMultipleImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) return []
  const uploads = imageFiles.map(file => uploadToCloudinary(file, 'sellapage/products'))
  return await Promise.all(uploads)
}


/**
 * Upload a single image file (e.g. store logo).
 * @param {File}   imageFile
 * @param {string} folder - defaults to 'sellapage/logos'
 * @returns {Promise<string>} secure URL
 */
export const uploadSingleImage = async (imageFile, folder = 'sellapage/logos') => {
  return await uploadToCloudinary(imageFile, folder)
}


/**
 * Check if a store has reached the free plan product limit.
 */
export const checkProductLimit = async (storeId) => {
  const snap = await getCountFromServer(
    collection(db, 'stores', storeId, 'products')
  )
  const count = snap.data().count
  return { count, limitReached: count >= FREE_PLAN_LIMIT }
}


/**
 * Add a new product. Supports up to 3 images.
 */
export const addProduct = async (storeId, productData, imageFiles = []) => {
  const { limitReached } = await checkProductLimit(storeId)
  if (limitReached) throw new Error('FREE_PLAN_LIMIT_REACHED')

  const imageUrls = await uploadMultipleImages(imageFiles.slice(0, 3))

  const docRef = await addDoc(collection(db, 'stores', storeId, 'products'), {
    ...productData,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    createdAt: new Date(),
  })

  return { id: docRef.id, ...productData, imageUrls, imageUrl: imageUrls[0] || '' }
}


/**
 * Fetch all products for a store, newest first.
 */
export const getProducts = async (storeId) => {
  const q = query(
    collection(db, 'stores', storeId, 'products'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    const imageUrls = data.imageUrls?.length
      ? data.imageUrls
      : data.imageUrl ? [data.imageUrl] : []
    return { id: d.id, ...data, imageUrls, imageUrl: imageUrls[0] || '' }
  })
}


/**
 * Update a product. Optionally adds new images on top of existing ones.
 */
export const updateProduct = async (storeId, productId, updates, newImageFiles = []) => {
  let imageUrls = updates.imageUrls || []

  if (newImageFiles.length > 0) {
    const newUrls = await uploadMultipleImages(newImageFiles)
    imageUrls = [...imageUrls, ...newUrls].slice(0, 3)
  }

  const finalData = {
    ...updates,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    updatedAt: new Date(),
  }

  await updateDoc(doc(db, 'stores', storeId, 'products', productId), finalData)
  return finalData
}


/**
 * Remove a specific image URL from a product's imageUrls array.
 */
export const removeProductImage = async (storeId, productId, imageUrl, currentImageUrls) => {
  const imageUrls = currentImageUrls.filter(url => url !== imageUrl)
  await updateDoc(doc(db, 'stores', storeId, 'products', productId), {
    imageUrls,
    imageUrl: imageUrls[0] || '',
  })
  return imageUrls
}


/**
 * Delete a single product from Firestore.
 */
export const deleteProduct = async (storeId, productId) => {
  await deleteDoc(doc(db, 'stores', storeId, 'products', productId))
}


/**
 * Delete ALL products for a store using a batched write.
 * Used during account deletion.
 */
export const deleteAllStoreProducts = async (storeId) => {
  const snap = await getDocs(collection(db, 'stores', storeId, 'products'))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}


/**
 * Fetch a store document by its public URL slug.
 */
export const getStoreBySlug = async (storeName) => {
  const q = query(collection(db, 'stores'), where('storeName', '==', storeName))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  }
  return null
}