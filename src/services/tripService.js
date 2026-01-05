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
import { participantService } from './participantService'

const TRIPS_COLLECTION = 'trips'

/**
 * Generate a strong password (8 characters: uppercase, lowercase, digits, special chars)
 */
function generatePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  const allChars = uppercase + lowercase + digits + special
  
  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += digits[Math.floor(Math.random() * digits.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export const tripService = {
  async createTrip(tripData) {
    try {
      // Generate password for joining
      const password = generatePassword()

      const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
        ...tripData,
        password, // Password for joining
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      // Use Firestore document ID as the public trip ID
      return { id: docRef.id, password, error: null }
    } catch (error) {
      return { id: null, password: null, error: error.message }
    }
  },

  async getTrip(tripId) {
    try {
      const docRef = doc(db, TRIPS_COLLECTION, tripId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
      }
      return { data: null, error: 'Plavba nenalezena' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Get trip by public trip ID (Firestore document ID) and password (for joining)
   */
  async getTripByCodeAndPassword(tripId, password) {
    try {
      // First try to get by document ID (new way)
      const docRef = doc(db, TRIPS_COLLECTION, tripId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const tripData = docSnap.data()
        // Check password
        if (tripData.password === password) {
          return { data: { id: docSnap.id, ...tripData }, error: null }
        }
        return { data: null, error: 'Nesprávné heslo' }
      }
      
      // Fallback: try old way with tripId field (for backward compatibility)
      const q = query(
        collection(db, TRIPS_COLLECTION),
        where('tripId', '==', tripId),
        where('password', '==', password)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return { data: { id: doc.id, ...doc.data() }, error: null }
      }
      
      return { data: null, error: 'Nesprávné ID nebo heslo' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },
  
  /**
   * @deprecated Use getTripByCodeAndPassword instead
   */
  async getTripByCode(tripId, password) {
    return this.getTripByCodeAndPassword(tripId, password)
  },

  /**
   * Get trips organized by user
   */
  async getUserOrganizingTrips(userId) {
    try {
      const q = query(
        collection(db, TRIPS_COLLECTION),
        where('organizerId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const trips = []
      querySnapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() })
      })
      return { trips, error: null }
    } catch (error) {
      // If index error, try without orderBy as fallback
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, TRIPS_COLLECTION),
            where('organizerId', '==', userId)
          )
          const querySnapshot = await getDocs(q)
          const trips = []
          querySnapshot.forEach((doc) => {
            trips.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          trips.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { trips, error: null }
        } catch (fallbackError) {
          return { trips: [], error: fallbackError.message }
        }
      }
      return { trips: [], error: error.message }
    }
  },

  /**
   * Get trips user is participating in (as participant or captain)
   */
  async getUserParticipatingTrips(userId) {
    try {
      // Get all participations
      const { participations, error } = await participantService.getUserParticipations(userId)
      if (error) {
        return { trips: [], error }
      }

      if (participations.length === 0) {
        return { trips: [], error: null }
      }

      // Fetch all trip documents in parallel using Promise.all
      // This is much faster than sequential calls
      const tripRefs = participations.map(p => doc(db, TRIPS_COLLECTION, p.tripId))
      const tripPromises = tripRefs.map(ref => getDoc(ref))
      const tripDocs = await Promise.all(tripPromises)
      
      const trips = []
      tripDocs.forEach((tripDoc, index) => {
        if (tripDoc.exists()) {
          const participation = participations[index]
          trips.push({
            id: tripDoc.id,
            ...tripDoc.data(),
            participationRole: participation.role,
            participationId: participation.id,
            boatId: participation.boatId
          })
        }
      })

      // Sort by creation date (most recent first)
      trips.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || new Date(0)
        return bDate - aDate
      })

      return { trips, error: null }
    } catch (error) {
      return { trips: [], error: error.message }
    }
  },

  /**
   * Get all trips for a user (both organizing and participating)
   * @deprecated Use getUserOrganizingTrips or getUserParticipatingTrips instead
   */
  async getUserTrips(userId) {
    return this.getUserOrganizingTrips(userId)
  },

  async updateTrip(tripId, tripData) {
    try {
      const docRef = doc(db, TRIPS_COLLECTION, tripId)
      await updateDoc(docRef, {
        ...tripData,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  async deleteTrip(tripId) {
    try {
      await deleteDoc(doc(db, TRIPS_COLLECTION, tripId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Generate and set password for a trip if it doesn't exist
   */
  async generateAndSetPassword(tripId) {
    try {
      const docRef = doc(db, TRIPS_COLLECTION, tripId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return { password: null, error: 'Plavba nenalezena' }
      }
      
      const tripData = docSnap.data()
      
      // If password already exists, return it
      if (tripData.password) {
        return { password: tripData.password, error: null }
      }
      
      // Generate new password
      const password = generatePassword()
      
      // Save password to database
      await updateDoc(docRef, {
        password,
        updatedAt: Timestamp.now()
      })
      
      return { password, error: null }
    } catch (error) {
      return { password: null, error: error.message }
    }
  }
}

