import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const CREWLIST_TEMPLATES_COLLECTION = 'crewlistTemplates'
const CREWLIST_DATA_COLLECTION = 'crewlistData'

export const crewlistService = {
  /**
   * Create or update crewlist template for a trip
   * @param {string} tripId - Trip ID
   * @param {object} templateData - Template data with fields definition
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async saveTemplate(tripId, templateData) {
    try {
      // Check if template exists
      const q = query(
        collection(db, CREWLIST_TEMPLATES_COLLECTION),
        where('tripId', '==', tripId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        // Update existing template
        const templateDoc = querySnapshot.docs[0]
        await updateDoc(templateDoc.ref, {
          ...templateData,
          updatedAt: Timestamp.now()
        })
        return { id: templateDoc.id, error: null }
      } else {
        // Create new template
        const docRef = await addDoc(collection(db, CREWLIST_TEMPLATES_COLLECTION), {
          tripId,
          ...templateData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        return { id: docRef.id, error: null }
      }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get crewlist template for a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getTemplate(tripId) {
    try {
      const q = query(
        collection(db, CREWLIST_TEMPLATES_COLLECTION),
        where('tripId', '==', tripId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return { data: { id: doc.id, ...doc.data() }, error: null }
      }
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Save crewlist data for a participant
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @param {string} userId - User ID
   * @param {object} data - Crewlist data
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async saveCrewlistData(tripId, boatId, userId, data) {
    try {
      // Check if data exists
      const q = query(
        collection(db, CREWLIST_DATA_COLLECTION),
        where('tripId', '==', tripId),
        where('boatId', '==', boatId),
        where('userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        // Update existing data
        const dataDoc = querySnapshot.docs[0]
        await updateDoc(dataDoc.ref, {
          ...data,
          updatedAt: Timestamp.now()
        })
        return { id: dataDoc.id, error: null }
      } else {
        // Create new data
        const docRef = await addDoc(collection(db, CREWLIST_DATA_COLLECTION), {
          tripId,
          boatId,
          userId,
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        return { id: docRef.id, error: null }
      }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get crewlist data for a user in a boat
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @param {string} userId - User ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getCrewlistData(tripId, boatId, userId) {
    try {
      const q = query(
        collection(db, CREWLIST_DATA_COLLECTION),
        where('tripId', '==', tripId),
        where('boatId', '==', boatId),
        where('userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return { data: { id: doc.id, ...doc.data() }, error: null }
      }
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Get all crewlist data for a boat
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @returns {Promise<{data: array, error: string|null}>}
   */
  async getBoatCrewlistData(tripId, boatId) {
    try {
      const q = query(
        collection(db, CREWLIST_DATA_COLLECTION),
        where('tripId', '==', tripId),
        where('boatId', '==', boatId)
      )
      const querySnapshot = await getDocs(q)
      const data = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() })
      })
      return { data, error: null }
    } catch (error) {
      return { data: [], error: error.message }
    }
  },

  /**
   * Get all crewlist data for a trip (organizer view)
   * @param {string} tripId - Trip ID
   * @returns {Promise<{data: array, error: string|null}>}
   */
  async getTripCrewlistData(tripId) {
    try {
      const q = query(
        collection(db, CREWLIST_DATA_COLLECTION),
        where('tripId', '==', tripId)
      )
      const querySnapshot = await getDocs(q)
      const data = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() })
      })
      return { data, error: null }
    } catch (error) {
      return { data: [], error: error.message }
    }
  }
}



