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

const BOATS_COLLECTION = 'boats'

export const boatService = {
  /**
   * Create a boat for a trip
   * @param {string} tripId - Trip ID
   * @param {object} boatData - Boat data (name, capacity, etc.)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createBoat(tripId, boatData) {
    try {
      const docRef = await addDoc(collection(db, BOATS_COLLECTION), {
        tripId,
        ...boatData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get a boat by ID
   * @param {string} boatId - Boat ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getBoat(boatId) {
    try {
      const docRef = doc(db, BOATS_COLLECTION, boatId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
      }
      return { data: null, error: 'Loď nenalezena' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Get all boats for a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<{boats: array, error: string|null}>}
   */
  async getTripBoats(tripId) {
    try {
      // Try with orderBy first
      try {
        const q = query(
          collection(db, BOATS_COLLECTION),
          where('tripId', '==', tripId),
          orderBy('createdAt', 'asc')
        )
        const querySnapshot = await getDocs(q)
        const boats = []
        querySnapshot.forEach((doc) => {
          boats.push({ id: doc.id, ...doc.data() })
        })
        return { boats, error: null }
      } catch (orderByError) {
        // If orderBy fails (missing index), try without it
        if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
          const q = query(
            collection(db, BOATS_COLLECTION),
            where('tripId', '==', tripId)
          )
          const querySnapshot = await getDocs(q)
          const boats = []
          querySnapshot.forEach((doc) => {
            boats.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory by createdAt if available
          boats.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return aDate - bDate
          })
          return { boats, error: null }
        }
        throw orderByError
      }
    } catch (error) {
      console.error('Error loading boats:', error)
      return { boats: [], error: error.message }
    }
  },

  /**
   * Update a boat
   * @param {string} boatId - Boat ID
   * @param {object} boatData - Updated boat data
   * @returns {Promise<{error: string|null}>}
   */
  async updateBoat(boatId, boatData) {
    try {
      const docRef = doc(db, BOATS_COLLECTION, boatId)
      await updateDoc(docRef, {
        ...boatData,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete a boat
   * @param {string} boatId - Boat ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteBoat(boatId) {
    try {
      await deleteDoc(doc(db, BOATS_COLLECTION, boatId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Assign captain to boat
   * @param {string} boatId - Boat ID
   * @param {string|null} captainId - Captain user ID or null to unassign
   * @returns {Promise<{error: string|null}>}
   */
  async assignCaptain(boatId, captainId) {
    try {
      const docRef = doc(db, BOATS_COLLECTION, boatId)
      await updateDoc(docRef, {
        captainId: captainId || null,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}


