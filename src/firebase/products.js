//src/firebase/products.js/
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  writeBatch,
  increment,
} from 'firebase/firestore'
import { db } from './config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor, writeStoreDocAsStaff } from '../utils/staffDataFetch'
import { isStorefrontHidden, filterVisibleStores, isStorefrontGateEnabled } from '../utils/storefrontGate'


const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET


export const FREE_PLAN_LIMIT = 15


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


const uploadMultipleImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) return []
  const uploads = imageFiles.map(file => uploadToCloudinary(file, 'sellapage/products'))
  return await Promise.all(uploads)
}


export const uploadSingleImage = async (imageFile, folder = 'sellapage/logos') => {
  return await uploadToCloudinary(imageFile, folder)
}

// Videos need Cloudinary's /video/upload endpoint - /image/upload (used
// above) rejects video files outright. Same unsigned preset/cloud name;
// the Cloudinary preset must have video allowed as a resource type for
// this to succeed (an account/dashboard-side setting, not something this
// code can control).
export const MAX_VIDEO_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB

export const uploadVideo = async (videoFile, folder = 'sellapage/reviews/videos') => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Please check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    )
  }
  if (videoFile.size > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error('Video is too large - each video must be 10MB or smaller.')
  }

  const formData = new FormData()
  formData.append('file', videoFile)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(
      errData?.error?.message ||
      `Video upload failed (${response.status}). Check your Cloudinary upload preset allows video uploads.`
    )
  }

  const data = await response.json()
  return data.secure_url
}


export const checkProductLimit = async (storeId) => {
  const storeSnap = await getDoc(doc(db, 'stores', storeId))
  const storeData = storeSnap.exists() ? storeSnap.data() : {}
  const existingPlan = storeData.plan || 'starter'
  const effectiveLimit = storeData.maxProducts ?? (
    existingPlan === 'premium' ? 999999 : existingPlan === 'pro' ? 999999 : existingPlan === 'growth' ? 50 : FREE_PLAN_LIMIT
  )

  const [productsSnap, servicesSnap] = await Promise.all([
    getCountFromServer(collection(db, 'stores', storeId, 'products')),
    getCountFromServer(collection(db, 'stores', storeId, 'services')),
  ])
  const count = productsSnap.data().count + servicesSnap.data().count
  return { count, limitReached: count >= effectiveLimit }
}


export const addProduct = async (storeId, productData, imageFiles = []) => {
  const storeSnap = await getDoc(doc(db, 'stores', storeId))
  const storeData = storeSnap.exists() ? storeSnap.data() : {}
  const existingPlan = storeData.plan || 'starter'
  const effectiveLimit = storeData.maxProducts ?? (
    existingPlan === 'premium' ? 999999 : existingPlan === 'pro' ? 999999 : existingPlan === 'growth' ? 50 : FREE_PLAN_LIMIT
  )
  const maxImages = storeData.maxImagesPerProduct ?? (
    existingPlan === 'premium' ? 50 : existingPlan === 'pro' ? 50 : existingPlan === 'growth' ? 10 : 3
  )

  // Staff: Cloudinary upload still runs client-side (unaffected by Firestore
  // rules); only the Firestore write goes through the server proxy, which
  // re-checks the plan limit itself.
  if (isActingAsStaffFor(storeId)) {
    const imageUrls = await uploadMultipleImages(imageFiles.slice(0, maxImages))
    const payload = { ...productData, imageUrls, imageUrl: imageUrls[0] || '', createdAt: new Date().toISOString() }
    const { id } = await writeStoreDocAsStaff({ type: 'products', storeId, op: 'create', data: payload })
    return { id, ...productData, imageUrls, imageUrl: imageUrls[0] || '' }
  }

  const [productsSnap, servicesSnap] = await Promise.all([
    getCountFromServer(collection(db, 'stores', storeId, 'products')),
    getCountFromServer(collection(db, 'stores', storeId, 'services')),
  ])
  const count = productsSnap.data().count + servicesSnap.data().count
  if (count >= effectiveLimit) throw new Error('FREE_PLAN_LIMIT_REACHED')

  const imageUrls = await uploadMultipleImages(imageFiles.slice(0, maxImages))

  const batch = writeBatch(db)
  const productRef = doc(collection(db, 'stores', storeId, 'products'))
  batch.set(productRef, {
    ...productData,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    createdAt: new Date(),
  })
  batch.update(doc(db, 'stores', storeId), { productCount: increment(1) })
  await batch.commit()

  return { id: productRef.id, ...productData, imageUrls, imageUrl: imageUrls[0] || '' }
}


const shapeProduct = (id, data) => {
  const imageUrls = data.imageUrls?.length
    ? data.imageUrls
    : data.imageUrl ? [data.imageUrl] : []
  return { id, ...data, type: data.type || 'physical', imageUrls, imageUrl: imageUrls[0] || '' }
}

export const getProducts = async (storeId, maxProducts = null) => {
  if (isActingAsStaffFor(storeId)) {
    const items = await fetchStoreCollectionAsStaff('products', storeId)
    items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    const limited = maxProducts && maxProducts < 999999 ? items.slice(0, maxProducts) : items
    return limited.map(({ id, ...data }) => shapeProduct(id, data))
  }
  const constraints = [orderBy('createdAt', 'desc')]
  if (maxProducts && maxProducts < 999999) {
    constraints.push(limit(maxProducts))
  }
  const q = query(
    collection(db, 'stores', storeId, 'products'),
    ...constraints
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => shapeProduct(d.id, d.data()))
}


export const updateProduct = async (storeId, productId, updates, newImageFiles = []) => {
  const storeSnap = await getDoc(doc(db, 'stores', storeId))
  const storeData = storeSnap.exists() ? storeSnap.data() : {}
  const maxImages = storeData.maxImagesPerProduct ?? (
    storeData.plan === 'premium' ? 50 : storeData.plan === 'pro' ? 50 : storeData.plan === 'growth' ? 10 : 3
  )

  let imageUrls = updates.imageUrls || []

  if (newImageFiles.length > 0) {
    const newUrls = await uploadMultipleImages(newImageFiles)
    imageUrls = [...imageUrls, ...newUrls].slice(0, maxImages)
  }

  const finalData = {
    ...updates,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    updatedAt: new Date(),
  }

  if (isActingAsStaffFor(storeId)) {
    await writeStoreDocAsStaff({
      type: 'products',
      storeId,
      op: 'update',
      docId: productId,
      data: { ...finalData, updatedAt: finalData.updatedAt.toISOString() },
    })
    return finalData
  }

  await updateDoc(doc(db, 'stores', storeId, 'products', productId), finalData)
  return finalData
}


export const removeProductImage = async (storeId, productId, imageUrl, currentImageUrls) => {
  const imageUrls = currentImageUrls.filter(url => url !== imageUrl)
  const patch = { imageUrls, imageUrl: imageUrls[0] || '' }
  if (isActingAsStaffFor(storeId)) {
    await writeStoreDocAsStaff({ type: 'products', storeId, op: 'update', docId: productId, data: patch })
    return imageUrls
  }
  await updateDoc(doc(db, 'stores', storeId, 'products', productId), patch)
  return imageUrls
}


export const deleteProduct = async (storeId, productId) => {
  if (isActingAsStaffFor(storeId)) {
    await writeStoreDocAsStaff({ type: 'products', storeId, op: 'delete', docId: productId })
    return
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'stores', storeId, 'products', productId))
  batch.update(doc(db, 'stores', storeId), { productCount: increment(-1) })
  await batch.commit()
}


export const deleteAllStoreProducts = async (storeId) => {
  const snap = await getDocs(collection(db, 'stores', storeId, 'products'))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}


export const getStoreBySlug = async (storeName) => {
  const q = query(collection(db, 'stores'), where('storeName', '==', storeName))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    const store = { id: d.id, ...d.data() }
    // Storefront gates - returns null (renders as "store not found") for an
    // unverified store once a gate is on. Two independent gates: phone
    // (waits on Termii) and email (does not). Both off by default, so this is
    // a no-op until deliberately enabled. See utils/storefrontGate.js.
    const gate = await isStorefrontGateEnabled()
    if (isStorefrontHidden(store, gate)) return null
    return store
  }
  return null
}


export const saveCustomCategory = async (storeId, categoryName) => {
  const normalized = categoryName.trim()
  if (!normalized) return null

  if (isActingAsStaffFor(storeId)) {
    const existing = await fetchStoreCollectionAsStaff('categories', storeId)
    const match = existing.find(c => c.name === normalized)
    if (match) return match.id
    const { id } = await writeStoreDocAsStaff({
      type: 'categories',
      storeId,
      op: 'create',
      data: { name: normalized, createdAt: new Date().toISOString() },
    })
    return id
  }

  const q = query(
    collection(db, 'stores', storeId, 'categories'),
    where('name', '==', normalized)
  )
  const existing = await getDocs(q)
  if (!existing.empty) return existing.docs[0].id
  const ref = await addDoc(collection(db, 'stores', storeId, 'categories'), {
    name: normalized,
    createdAt: new Date(),
  })
  return ref.id
}


export const getCustomCategories = async (storeId) => {
  if (isActingAsStaffFor(storeId)) {
    return fetchStoreCollectionAsStaff('categories', storeId)
  }
  const snap = await getDocs(collection(db, 'stores', storeId, 'categories'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


export const getActiveStores = async () => {
  const q = query(collection(db, 'stores'), where('isActive', '==', true))
  const snap = await getDocs(q)
  const gate = await isStorefrontGateEnabled()
  const stores = filterVisibleStores(
    snap.docs.map(d => ({ id: d.id, ...d.data() })),
    gate,
  )
  stores.sort((a, b) => {
    const ta = a.createdAt?.seconds || a.createdAt?._seconds || 0
    const tb = b.createdAt?.seconds || b.createdAt?._seconds || 0
    return tb - ta
  })
  return stores
}
