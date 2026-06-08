import { addDoc, collection } from 'firebase/firestore'
import { db } from './config'

/**
 * Save a lead/enquiry to Firestore.
 * Saved to: /leads/{autoId}
 * Fields: name, phone, interest, storeId, storeName, createdAt
 */
export const saveLead = async (storeId, storeName, leadData) => {
  await addDoc(collection(db, 'leads'), {
    ...leadData,
    storeId,
    storeName,
    createdAt: new Date(),
  })
}

