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
import { userService } from './userService'

const PARTICIPANTS_COLLECTION = 'participants'

export const participantService = {
  /**
   * Add a participant to a trip
   * @param {string} tripId - Trip ID
   * @param {string} userId - User ID
   * @param {string} role - 'participant' or 'captain'
   * @param {string|null} boatId - Optional boat ID
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async addParticipant(tripId, userId, role, boatId = null) {
    try {
      // Check if participant already exists
      const existing = await this.getParticipant(tripId, userId)
      if (existing.data) {
        return { id: null, error: 'Uživatel je již účastníkem této plavby' }
      }

      // Check if user has a name in their profile
      const { data: profile, error: profileError } = await userService.getProfile(userId)
      if (profileError) {
        return { id: null, error: 'Chyba při načítání profilu uživatele' }
      }
      
      if (!profile || !profile.name || profile.name.trim().length < 2) {
        return { 
          id: null, 
          error: 'Uživatel nemá vyplněné jméno v profilu. Prosím, vyplňte jméno v sekci "Můj profil" před přidáním do plavby.' 
        }
      }

      const docRef = await addDoc(collection(db, PARTICIPANTS_COLLECTION), {
        tripId,
        userId,
        role,
        boatId: boatId || null,
        status: 'confirmed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get a specific participant record
   * @param {string} tripId - Trip ID
   * @param {string} userId - User ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getParticipant(tripId, userId) {
    try {
      const q = query(
        collection(db, PARTICIPANTS_COLLECTION),
        where('tripId', '==', tripId),
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
   * Get a participant by document ID
   * @param {string} participantId - Participant document ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getParticipantById(participantId) {
    try {
      const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
      }
      return { data: null, error: 'Účastník nenalezen' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Get all participants for a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<{participants: array, error: string|null}>}
   */
  async getTripParticipants(tripId) {
    try {
      const q = query(
        collection(db, PARTICIPANTS_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const participants = []
      querySnapshot.forEach((doc) => {
        participants.push({ id: doc.id, ...doc.data() })
      })
      return { participants, error: null }
    } catch (error) {
      // If index error, try without orderBy as fallback
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, PARTICIPANTS_COLLECTION),
            where('tripId', '==', tripId)
          )
          const querySnapshot = await getDocs(q)
          const participants = []
          querySnapshot.forEach((doc) => {
            participants.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          participants.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { participants, error: null }
        } catch (fallbackError) {
          return { participants: [], error: fallbackError.message }
        }
      }
      return { participants: [], error: error.message }
    }
  },

  /**
   * Get all trips a user is participating in
   * @param {string} userId - User ID
   * @returns {Promise<{participations: array, error: string|null}>}
   */
  async getUserParticipations(userId) {
    try {
      const q = query(
        collection(db, PARTICIPANTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const participations = []
      querySnapshot.forEach((doc) => {
        participations.push({ id: doc.id, ...doc.data() })
      })
      return { participations, error: null }
    } catch (error) {
      // If index error, try without orderBy as fallback
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, PARTICIPANTS_COLLECTION),
            where('userId', '==', userId)
          )
          const querySnapshot = await getDocs(q)
          const participations = []
          querySnapshot.forEach((doc) => {
            participations.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          participations.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { participations, error: null }
        } catch (fallbackError) {
          return { participations: [], error: fallbackError.message }
        }
      }
      return { participations: [], error: error.message }
    }
  },

  /**
   * Get user's role in a trip (organizer, captain, participant, or null)
   * @param {string} tripId - Trip ID
   * @param {string} userId - User ID
   * @param {string} organizerId - Trip organizer ID
   * @returns {Promise<string|null>} - Returns 'organizer', 'captain', 'participant', or null
   */
  async getUserRoleInTrip(tripId, userId, organizerId) {
    // Check if user is organizer
    if (userId === organizerId) {
      // Check if organizer is also a participant
      const participant = await this.getParticipant(tripId, userId)
      if (participant.data) {
        // Organizer is also participant/captain - return their participant role
        return participant.data.role === 'captain' ? 'captain' : 'participant'
      }
      return 'organizer'
    }

    // Check participant role
    const participant = await this.getParticipant(tripId, userId)
    if (participant.data) {
      return participant.data.role
    }

    return null
  },

  /**
   * Update participant role
   * @param {string} participantId - Participant document ID
   * @param {string} role - New role
   * @returns {Promise<{error: string|null}>}
   */
  async updateParticipantRole(participantId, role) {
    try {
      const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
      await updateDoc(docRef, {
        role,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Assign participant to a boat
   * @param {string} participantId - Participant document ID
   * @param {string|null} boatId - Boat ID or null to unassign
   * @returns {Promise<{error: string|null}>}
   */
  async assignToBoat(participantId, boatId) {
    try {
      const docRef = doc(db, PARTICIPANTS_COLLECTION, participantId)
      await updateDoc(docRef, {
        boatId: boatId || null,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Remove participant from trip
   * @param {string} participantId - Participant document ID
   * @returns {Promise<{error: string|null}>}
   */
  async removeParticipant(participantId) {
    try {
      await deleteDoc(doc(db, PARTICIPANTS_COLLECTION, participantId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Get participants by boat
   * @param {string} tripId - Trip ID
   * @param {string} boatId - Boat ID
   * @returns {Promise<{participants: array, error: string|null}>}
   */
  async getBoatParticipants(tripId, boatId) {
    try {
      const q = query(
        collection(db, PARTICIPANTS_COLLECTION),
        where('tripId', '==', tripId),
        where('boatId', '==', boatId)
      )
      const querySnapshot = await getDocs(q)
      const participants = []
      querySnapshot.forEach((doc) => {
        participants.push({ id: doc.id, ...doc.data() })
      })
      return { participants, error: null }
    } catch (error) {
      return { participants: [], error: error.message }
    }
  }
}

