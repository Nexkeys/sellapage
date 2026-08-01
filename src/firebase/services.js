// src/firebase/services.js
import {
  collection,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  getCountFromServer,
  writeBatch,
  increment,
} from 'firebase/firestore'
import { db } from './config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor } from '../utils/staffDataFetch'


const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const FREE_PLAN_LIMIT = 15


const uploadToCloudinary = async (imageFile, folder = 'sellapage/services') => {
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


const uploadMultipleImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) return []
  const uploads = imageFiles.map(file => uploadToCloudinary(file, 'sellapage/services'))
  return await Promise.all(uploads)
}


const getPlanLimits = (storeData = {}) => {
  const existingPlan = storeData.plan || 'starter'
  return {
    maxProducts: storeData.maxProducts ?? (
      existingPlan === 'premium' ? 999999 : existingPlan === 'pro' ? 999999 : existingPlan === 'growth' ? 50 : FREE_PLAN_LIMIT
    ),
    maxImagesPerProduct: storeData.maxImagesPerProduct ?? (
      existingPlan === 'premium' ? 50 : existingPlan === 'pro' ? 50 : existingPlan === 'growth' ? 10 : 3
    ),
  }
}


const getCombinedListingCount = async (storeId) => {
  const [productsSnap, servicesSnap] = await Promise.all([
    getCountFromServer(collection(db, 'stores', storeId, 'products')),
    getCountFromServer(collection(db, 'stores', storeId, 'services')),
  ])

  return productsSnap.data().count + servicesSnap.data().count
}


export const addService = async (storeId, serviceData, imageFiles = []) => {
  const storeSnap = await getDoc(doc(db, 'stores', storeId))
  const storeData = storeSnap.exists() ? storeSnap.data() : {}
  const { maxProducts, maxImagesPerProduct } = getPlanLimits(storeData)

  const count = await getCombinedListingCount(storeId)
  if (count >= maxProducts) throw new Error('FREE_PLAN_LIMIT_REACHED')

  const imageUrls = await uploadMultipleImages(imageFiles.slice(0, maxImagesPerProduct))
  const now = new Date()

  const batch = writeBatch(db)
  const serviceRef = doc(collection(db, 'stores', storeId, 'services'))
  const finalData = {
    name: serviceData.name,
    price: serviceData.price,
    description: serviceData.description || '',
    category: serviceData.category || '',
    duration: serviceData.duration || '',
    locationType: serviceData.locationType || '',
    bookingNote: serviceData.bookingNote || '',
    imageUrls,
    imageUrl: imageUrls[0] || '',
    isActive: serviceData.isActive ?? true,
    bookingRequests: serviceData.bookingRequests ?? 0,
    aiGenerated: serviceData.aiGenerated ?? false,
    createdAt: now,
    updatedAt: now,
  }

  batch.set(serviceRef, finalData)
  batch.update(doc(db, 'stores', storeId), { productCount: increment(1) })
  await batch.commit()

  return { id: serviceRef.id, ...finalData }
}


const shapeService = (id, data) => {
  const imageUrls = data.imageUrls?.length
    ? data.imageUrls
    : data.imageUrl ? [data.imageUrl] : []
  return { id, ...data, imageUrls, imageUrl: imageUrls[0] || '' }
}

export const getServices = async (storeId, maxProducts = null) => {
  if (isActingAsStaffFor(storeId)) {
    const items = await fetchStoreCollectionAsStaff('services', storeId)
    items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    const limited = maxProducts && maxProducts < 999999 ? items.slice(0, maxProducts) : items
    return limited.map(({ id, ...data }) => shapeService(id, data))
  }
  const constraints = [orderBy('createdAt', 'desc')]
  if (maxProducts && maxProducts < 999999) {
    constraints.push(limit(maxProducts))
  }
  const q = query(
    collection(db, 'stores', storeId, 'services'),
    ...constraints
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => shapeService(d.id, d.data()))
}


export const updateService = async (storeId, serviceId, updates, newImageFiles = []) => {
  const storeSnap = await getDoc(doc(db, 'stores', storeId))
  const storeData = storeSnap.exists() ? storeSnap.data() : {}
  const { maxImagesPerProduct } = getPlanLimits(storeData)

  let imageUrls = updates.imageUrls || []

  if (newImageFiles.length > 0) {
    const newUrls = await uploadMultipleImages(newImageFiles)
    imageUrls = [...imageUrls, ...newUrls].slice(0, maxImagesPerProduct)
  }

  const finalData = {
    ...updates,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    updatedAt: new Date(),
  }

  await updateDoc(doc(db, 'stores', storeId, 'services', serviceId), finalData)
  return finalData
}


export const deleteService = async (storeId, serviceId) => {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'stores', storeId, 'services', serviceId))
  batch.update(doc(db, 'stores', storeId), { productCount: increment(-1) })
  await batch.commit()
}


export const deleteAllStoreServices = async (storeId) => {
  const snap = await getDocs(collection(db, 'stores', storeId, 'services'))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}


export const toggleServiceActive = async (storeId, serviceId, isActive) => {
  await updateDoc(doc(db, 'stores', storeId, 'services', serviceId), { isActive })
}
