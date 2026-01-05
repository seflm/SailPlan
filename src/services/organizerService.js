import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const ORGANIZER_CONTACTS_COLLECTION = 'organizerContacts'

export const organizerService = {
  /**
   * Save organizer contact details
   * @param {string} userId - User ID (organizer)
   * @param {object} contactData - Contact data (name, email, phone, address)
   * @returns {Promise<{error: string|null}>}
   */
  async saveContactDetails(userId, contactData) {
    try {
      const docRef = doc(db, ORGANIZER_CONTACTS_COLLECTION, userId)
      await setDoc(docRef, {
        ...contactData,
        updatedAt: Timestamp.now()
      }, { merge: true })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Get organizer contact details
   * @param {string} userId - User ID (organizer)
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getContactDetails(userId) {
    try {
      const docRef = doc(db, ORGANIZER_CONTACTS_COLLECTION, userId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: docSnap.data(), error: null }
      }
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}


