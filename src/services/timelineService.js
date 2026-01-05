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

const TIMELINE_EVENTS_COLLECTION = 'timelineEvents'
const TIMELINE_COMPLETIONS_COLLECTION = 'timelineCompletions'

export const timelineService = {
  /**
   * Create a timeline event for a trip
   * @param {string} tripId - Trip ID
   * @param {object} eventData - Event data (name, description, type, date, roles, checkable)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createEvent(tripId, eventData) {
    try {
      const docRef = await addDoc(collection(db, TIMELINE_EVENTS_COLLECTION), {
        tripId,
        name: eventData.name || '',
        description: eventData.description || '',
        type: eventData.type || 'custom', // 'custom', 'crewlist', 'payment'
        date: eventData.date ? Timestamp.fromDate(new Date(eventData.date)) : null,
        roles: eventData.roles || [], // ['organizer', 'captain', 'participant']
        checkable: eventData.checkable !== false, // default true
        order: eventData.order || 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get all timeline events for a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<{events: array, error: string|null}>}
   */
  async getTripEvents(tripId) {
    try {
      const q = query(
        collection(db, TIMELINE_EVENTS_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('order', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const events = []
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() })
      })
      return { events, error: null }
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, TIMELINE_EVENTS_COLLECTION),
            where('tripId', '==', tripId)
          )
          const querySnapshot = await getDocs(q)
          const events = []
          querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          events.sort((a, b) => (a.order || 0) - (b.order || 0))
          return { events, error: null }
        } catch (fallbackError) {
          return { events: [], error: fallbackError.message }
        }
      }
      return { events: [], error: error.message }
    }
  },

  /**
   * Update a timeline event
   * @param {string} eventId - Event ID
   * @param {object} eventData - Updated event data
   * @returns {Promise<{error: string|null}>}
   */
  async updateEvent(eventId, eventData) {
    try {
      const docRef = doc(db, TIMELINE_EVENTS_COLLECTION, eventId)
      const updateData = {
        ...eventData,
        updatedAt: Timestamp.now()
      }
      
      // Convert date to Timestamp if provided
      if (eventData.date) {
        updateData.date = Timestamp.fromDate(new Date(eventData.date))
      }
      
      await updateDoc(docRef, updateData)
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete a timeline event
   * @param {string} eventId - Event ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteEvent(eventId) {
    try {
      // Also delete all completions for this event
      const completionsQuery = query(
        collection(db, TIMELINE_COMPLETIONS_COLLECTION),
        where('eventId', '==', eventId)
      )
      const completionsSnapshot = await getDocs(completionsQuery)
      const deletePromises = completionsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      // Delete the event
      await deleteDoc(doc(db, TIMELINE_EVENTS_COLLECTION, eventId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Mark an event as completed for a participant
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {boolean} completed - Completion status
   * @returns {Promise<{error: string|null}>}
   */
  async setEventCompletion(eventId, userId, completed) {
    try {
      // Check if completion record exists
      const q = query(
        collection(db, TIMELINE_COMPLETIONS_COLLECTION),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        // Update existing completion
        const completionDoc = querySnapshot.docs[0]
        await updateDoc(completionDoc.ref, {
          completed,
          updatedAt: Timestamp.now()
        })
      } else if (completed) {
        // Create new completion only if marking as completed
        await addDoc(collection(db, TIMELINE_COMPLETIONS_COLLECTION), {
          eventId,
          userId,
          completed: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Get completion status for an event and user
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<{completed: boolean, error: string|null}>}
   */
  async getEventCompletion(eventId, userId) {
    try {
      const q = query(
        collection(db, TIMELINE_COMPLETIONS_COLLECTION),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const completion = querySnapshot.docs[0].data()
        return { completed: completion.completed === true, error: null }
      }
      
      return { completed: false, error: null }
    } catch (error) {
      return { completed: false, error: error.message }
    }
  },

  /**
   * Get all completions for a trip (for organizer view)
   * @param {string} tripId - Trip ID
   * @returns {Promise<{completions: array, error: string|null}>}
   */
  async getTripCompletions(tripId) {
    try {
      // Get all events for the trip
      const { events, error: eventsError } = await this.getTripEvents(tripId)
      if (eventsError) {
        return { completions: [], error: eventsError }
      }
      
      // Get all completions for these events
      const eventIds = events.map(e => e.id)
      if (eventIds.length === 0) {
        return { completions: [], error: null }
      }
      
      // Firestore doesn't support 'in' queries with more than 10 items
      // So we'll fetch all completions and filter
      const allCompletionsQuery = query(
        collection(db, TIMELINE_COMPLETIONS_COLLECTION)
      )
      const querySnapshot = await getDocs(allCompletionsQuery)
      
      const completions = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (eventIds.includes(data.eventId)) {
          completions.push({
            id: doc.id,
            eventId: data.eventId,
            userId: data.userId,
            completed: data.completed === true
          })
        }
      })
      
      return { completions, error: null }
    } catch (error) {
      return { completions: [], error: error.message }
    }
  }
}



