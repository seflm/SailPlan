import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const USER_PROFILES_COLLECTION = 'userProfiles'

export const userService = {
  /**
   * Save user profile contact details
   * @param {string} userId - User ID
   * @param {object} contactData - Contact data (name, email, phone, address)
   * @returns {Promise<{error: string|null}>}
   */
  async saveProfile(userId, contactData) {
    try {
      const docRef = doc(db, USER_PROFILES_COLLECTION, userId)
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
   * Get user profile contact details
   * @param {string} userId - User ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getProfile(userId) {
    try {
      const docRef = doc(db, USER_PROFILES_COLLECTION, userId)
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


