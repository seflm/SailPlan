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

const BOAT_LOGS_COLLECTION = 'boatLogs'

export const boatLogService = {
  /**
   * Create a boat log entry
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @param {object} logData - Log data (date, route, engineHours, distanceTotal, distanceSails, fuel, notes, locations)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createLogEntry(tripId, boatId, logData) {
    try {
      const docRef = await addDoc(collection(db, BOAT_LOGS_COLLECTION), {
        tripId,
        boatId,
        date: logData.date ? Timestamp.fromDate(new Date(logData.date)) : Timestamp.now(),
        route: logData.route || '',
        engineHours: logData.engineHours || null,
        distanceTotal: logData.distanceTotal || null, // in NM
        distanceSails: logData.distanceSails || null, // in NM
        fuel: logData.fuel || null, // percentage
        notes: logData.notes || '',
        locations: logData.locations || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get all log entries for a boat
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @returns {Promise<{entries: array, error: string|null}>}
   */
  async getBoatLogs(tripId, boatId) {
    try {
      const q = query(
        collection(db, BOAT_LOGS_COLLECTION),
        where('tripId', '==', tripId),
        where('boatId', '==', boatId),
        orderBy('date', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const entries = []
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() })
      })
      return { entries, error: null }
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, BOAT_LOGS_COLLECTION),
            where('tripId', '==', tripId),
            where('boatId', '==', boatId)
          )
          const querySnapshot = await getDocs(q)
          const entries = []
          querySnapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          entries.sort((a, b) => {
            const aDate = a.date?.toDate?.() || new Date(0)
            const bDate = b.date?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { entries, error: null }
        } catch (fallbackError) {
          return { entries: [], error: fallbackError.message }
        }
      }
      return { entries: [], error: error.message }
    }
  },

  /**
   * Get all log entries for a trip (organizer view)
   * @param {string} tripId - Trip ID
   * @returns {Promise<{entries: array, error: string|null}>}
   */
  async getTripLogs(tripId) {
    try {
      const q = query(
        collection(db, BOAT_LOGS_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('date', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const entries = []
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() })
      })
      return { entries, error: null }
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, BOAT_LOGS_COLLECTION),
            where('tripId', '==', tripId)
          )
          const querySnapshot = await getDocs(q)
          const entries = []
          querySnapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          entries.sort((a, b) => {
            const aDate = a.date?.toDate?.() || new Date(0)
            const bDate = b.date?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { entries, error: null }
        } catch (fallbackError) {
          return { entries: [], error: fallbackError.message }
        }
      }
      return { entries: [], error: error.message }
    }
  },

  /**
   * Update a log entry
   * @param {string} logId - Log entry ID
   * @param {object} logData - Updated log data
   * @returns {Promise<{error: string|null}>}
   */
  async updateLogEntry(logId, logData) {
    try {
      const docRef = doc(db, BOAT_LOGS_COLLECTION, logId)
      const updateData = {
        ...logData,
        updatedAt: Timestamp.now()
      }
      
      // Convert date to Timestamp if provided
      if (logData.date) {
        updateData.date = Timestamp.fromDate(new Date(logData.date))
      }
      
      await updateDoc(docRef, updateData)
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete a log entry
   * @param {string} logId - Log entry ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteLogEntry(logId) {
    try {
      await deleteDoc(doc(db, BOAT_LOGS_COLLECTION, logId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}



