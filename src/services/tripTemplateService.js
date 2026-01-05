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

const TRIP_TEMPLATES_COLLECTION = 'tripTemplates'

export const tripTemplateService = {
  /**
   * Create a trip template from an existing trip
   * @param {string} organizerId - Organizer user ID
   * @param {string} tripId - Source trip ID
   * @param {object} templateData - Template data (name, description)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createTemplate(organizerId, tripId, templateData) {
    try {
      // Get the trip data to copy
      const tripDoc = await getDoc(doc(db, 'trips', tripId))
      if (!tripDoc.exists()) {
        return { id: null, error: 'Plavba nenalezena' }
      }

      const tripData = tripDoc.data()
      
      // Create template with trip data
      const docRef = await addDoc(collection(db, TRIP_TEMPLATES_COLLECTION), {
        organizerId,
        name: templateData.name || tripData.name || 'Bez názvu',
        description: templateData.description || tripData.description || '',
        // Copy relevant trip fields
        startDate: tripData.startDate || null,
        endDate: tripData.endDate || null,
        location: tripData.location || '',
        maxParticipants: tripData.maxParticipants || null,
        // Store template metadata
        sourceTripId: tripId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Create a trip from a template
   * @param {string} organizerId - Organizer user ID
   * @param {string} templateId - Template ID
   * @param {object} tripData - Override trip data
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createTripFromTemplate(organizerId, templateId, tripData = {}) {
    try {
      const { data: template, error: templateError } = await this.getTemplate(templateId)
      if (templateError || !template) {
        return { id: null, error: templateError || 'Template nenalezen' }
      }

      // Create trip from template
      const tripRef = await addDoc(collection(db, 'trips'), {
        organizerId,
        name: tripData.name || template.name || 'Nová plavba',
        description: tripData.description || template.description || '',
        startDate: tripData.startDate ? Timestamp.fromDate(new Date(tripData.startDate)) : (template.startDate || null),
        endDate: tripData.endDate ? Timestamp.fromDate(new Date(tripData.endDate)) : (template.endDate || null),
        location: tripData.location || template.location || '',
        maxParticipants: tripData.maxParticipants || template.maxParticipants || null,
        status: 'draft',
        sourceTemplateId: templateId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      return { id: tripRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get all templates for an organizer
   * @param {string} organizerId - Organizer user ID
   * @returns {Promise<{templates: array, error: string|null}>}
   */
  async getTemplates(organizerId) {
    try {
      const q = query(
        collection(db, TRIP_TEMPLATES_COLLECTION),
        where('organizerId', '==', organizerId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const templates = []
      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() })
      })
      return { templates, error: null }
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, TRIP_TEMPLATES_COLLECTION),
            where('organizerId', '==', organizerId)
          )
          const querySnapshot = await getDocs(q)
          const templates = []
          querySnapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          templates.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { templates, error: null }
        } catch (fallbackError) {
          return { templates: [], error: fallbackError.message }
        }
      }
      return { templates: [], error: error.message }
    }
  },

  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getTemplate(templateId) {
    try {
      const docRef = doc(db, TRIP_TEMPLATES_COLLECTION, templateId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
      }
      return { data: null, error: 'Template nenalezen' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Update a template
   * @param {string} templateId - Template ID
   * @param {object} templateData - Updated template data
   * @returns {Promise<{error: string|null}>}
   */
  async updateTemplate(templateId, templateData) {
    try {
      const docRef = doc(db, TRIP_TEMPLATES_COLLECTION, templateId)
      await updateDoc(docRef, {
        ...templateData,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteTemplate(templateId) {
    try {
      await deleteDoc(doc(db, TRIP_TEMPLATES_COLLECTION, templateId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}



