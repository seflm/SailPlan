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

const CHECKLIST_TEMPLATES_COLLECTION = 'checklistTemplates'
const CHECKLIST_INSTANCES_COLLECTION = 'checklistInstances'

export const checklistService = {
  /**
   * Create a checklist template
   * @param {string} organizerId - Organizer user ID
   * @param {object} templateData - Template data (name, description, categories, items)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async createTemplate(organizerId, templateData) {
    try {
      const docRef = await addDoc(collection(db, CHECKLIST_TEMPLATES_COLLECTION), {
        organizerId,
        name: templateData.name || '',
        description: templateData.description || '',
        categories: templateData.categories || [],
        items: templateData.items || [],
        isDefault: templateData.isDefault || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get all checklist templates for an organizer
   * @param {string} organizerId - Organizer user ID
   * @returns {Promise<{templates: array, error: string|null}>}
   */
  async getTemplates(organizerId) {
    try {
      const q = query(
        collection(db, CHECKLIST_TEMPLATES_COLLECTION),
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
            collection(db, CHECKLIST_TEMPLATES_COLLECTION),
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
   * Get a checklist template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getTemplate(templateId) {
    try {
      const docRef = doc(db, CHECKLIST_TEMPLATES_COLLECTION, templateId)
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
   * Update a checklist template
   * @param {string} templateId - Template ID
   * @param {object} templateData - Updated template data
   * @returns {Promise<{error: string|null}>}
   */
  async updateTemplate(templateId, templateData) {
    try {
      const docRef = doc(db, CHECKLIST_TEMPLATES_COLLECTION, templateId)
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
   * Delete a checklist template
   * @param {string} templateId - Template ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteTemplate(templateId) {
    try {
      await deleteDoc(doc(db, CHECKLIST_TEMPLATES_COLLECTION, templateId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Create a checklist instance (assign template to trip/boat/role)
   * @param {string} tripId - Trip ID
   * @param {string} templateId - Template ID
   * @param {object} assignmentData - Assignment data (boatId, role, userId)
   * @returns {Promise<{id: string|null, error: string|null, duplicate: boolean}>}
   */
  async createInstance(tripId, templateId, assignmentData) {
    try {
      // First, check if instance already exists to prevent duplicates
      // This is a critical check to prevent race conditions
      // Firestore doesn't support null in where clauses, so we need to query and filter in memory
      let checkQuery = query(
        collection(db, CHECKLIST_INSTANCES_COLLECTION),
        where('tripId', '==', tripId),
        where('templateId', '==', templateId)
      )

      // Add filters for non-null values
      if (assignmentData.boatId) {
        checkQuery = query(checkQuery, where('boatId', '==', assignmentData.boatId))
      }
      if (assignmentData.userId) {
        checkQuery = query(checkQuery, where('userId', '==', assignmentData.userId))
      }
      if (assignmentData.role) {
        checkQuery = query(checkQuery, where('role', '==', assignmentData.role))
      }

      const existingSnapshot = await getDocs(checkQuery)
      
      // Filter in memory to handle null values (Firestore limitation)
      const matching = existingSnapshot.docs.filter(doc => {
        const data = doc.data()
        const boatMatch = assignmentData.boatId 
          ? data.boatId === assignmentData.boatId 
          : !data.boatId
        const userMatch = assignmentData.userId 
          ? data.userId === assignmentData.userId 
          : !data.userId
        const roleMatch = assignmentData.role 
          ? data.role === assignmentData.role 
          : !data.role
        return boatMatch && userMatch && roleMatch
      })

      if (matching.length > 0) {
        // Instance already exists, return the existing one
        return { id: matching[0].id, error: null, duplicate: true }
      }

      // Get template to copy items
      const { data: template } = await this.getTemplate(templateId)
      if (!template) {
        return { id: null, error: 'Template nenalezen', duplicate: false }
      }

      const docRef = await addDoc(collection(db, CHECKLIST_INSTANCES_COLLECTION), {
        tripId,
        templateId,
        name: template.name || 'Checklist',
        boatId: assignmentData.boatId || null,
        role: assignmentData.role || null,
        userId: assignmentData.userId || null,
        items: template.items.map(item => ({
          ...item,
          completed: false,
          note: ''
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return { id: docRef.id, error: null, duplicate: false }
    } catch (error) {
      // If error is due to index not existing, try without specific null checks
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          // Fallback: check without null filters (Firestore doesn't support null in where clauses well)
          let fallbackQuery = query(
            collection(db, CHECKLIST_INSTANCES_COLLECTION),
            where('tripId', '==', tripId),
            where('templateId', '==', templateId)
          )
          
          const fallbackSnapshot = await getDocs(fallbackQuery)
          // Filter in memory
          const matching = fallbackSnapshot.docs.filter(doc => {
            const data = doc.data()
            const boatMatch = (assignmentData.boatId && data.boatId === assignmentData.boatId) || (!assignmentData.boatId && !data.boatId)
            const userMatch = (assignmentData.userId && data.userId === assignmentData.userId) || (!assignmentData.userId && !data.userId)
            const roleMatch = (assignmentData.role && data.role === assignmentData.role) || (!assignmentData.role && !data.role)
            return boatMatch && userMatch && roleMatch
          })

          if (matching.length > 0) {
            return { id: matching[0].id, error: null, duplicate: true }
          }

          // If no match found, proceed with creation
          const { data: template } = await this.getTemplate(templateId)
          if (!template) {
            return { id: null, error: 'Template nenalezen', duplicate: false }
          }

          const docRef = await addDoc(collection(db, CHECKLIST_INSTANCES_COLLECTION), {
            tripId,
            templateId,
            name: template.name || 'Checklist',
            boatId: assignmentData.boatId || null,
            role: assignmentData.role || null,
            userId: assignmentData.userId || null,
            items: template.items.map(item => ({
              ...item,
              completed: false,
              note: ''
            })),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          })
          return { id: docRef.id, error: null, duplicate: false }
        } catch (fallbackError) {
          return { id: null, error: fallbackError.message, duplicate: false }
        }
      }
      return { id: null, error: error.message, duplicate: false }
    }
  },

  /**
   * Get checklist instances for a trip
   * @param {string} tripId - Trip ID
   * @param {object} filters - Optional filters (boatId, role, userId)
   * @returns {Promise<{instances: array, error: string|null}>}
   */
  async getTripInstances(tripId, filters = {}) {
    try {
      let q = query(
        collection(db, CHECKLIST_INSTANCES_COLLECTION),
        where('tripId', '==', tripId)
      )

      if (filters.boatId) {
        q = query(q, where('boatId', '==', filters.boatId))
      }
      if (filters.role) {
        q = query(q, where('role', '==', filters.role))
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId))
      }

      const querySnapshot = await getDocs(q)
      const instances = []
      querySnapshot.forEach((doc) => {
        instances.push({ id: doc.id, ...doc.data() })
      })
      return { instances, error: null }
    } catch (error) {
      return { instances: [], error: error.message }
    }
  },

  /**
   * Update checklist item completion/note
   * @param {string} instanceId - Instance ID
   * @param {string} itemId - Item ID
   * @param {object} updateData - Update data (completed, note)
   * @returns {Promise<{error: string|null}>}
   */
  async updateItem(instanceId, itemId, updateData) {
    try {
      const instanceRef = doc(db, CHECKLIST_INSTANCES_COLLECTION, instanceId)
      const instanceDoc = await getDoc(instanceRef)
      
      if (!instanceDoc.exists()) {
        return { error: 'Instance nenalezena' }
      }

      const instance = instanceDoc.data()
      const items = instance.items.map(item => {
        if (item.id === itemId || item.itemId === itemId) {
          return { ...item, ...updateData }
        }
        return item
      })

      await updateDoc(instanceRef, {
        items,
        updatedAt: Timestamp.now()
      })

      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Sync all instances of a template with the updated template
   * @param {string} templateId - Template ID
   * @returns {Promise<{updated: number, error: string|null}>}
   */
  async syncInstancesFromTemplate(templateId) {
    try {
      // Get the updated template
      const { data: template } = await this.getTemplate(templateId)
      if (!template) {
        return { updated: 0, error: 'Template nenalezen' }
      }

      // Get all instances using this template
      const q = query(
        collection(db, CHECKLIST_INSTANCES_COLLECTION),
        where('templateId', '==', templateId)
      )
      const querySnapshot = await getDocs(q)
      
      let updatedCount = 0
      const updatePromises = []

      querySnapshot.forEach((docSnap) => {
        const instance = docSnap.data()
        const existingItems = instance.items || []
        
        // Create a map of existing items by id for quick lookup
        const existingItemsMap = new Map()
        existingItems.forEach(item => {
          const itemId = item.id || item.itemId
          if (itemId) {
            existingItemsMap.set(itemId, item)
          }
        })

        // Merge template items with existing items, preserving completion status and notes
        const mergedItems = template.items.map(templateItem => {
          const existingItem = existingItemsMap.get(templateItem.id || templateItem.itemId)
          if (existingItem) {
            // Preserve existing completion status, value, and note
            return {
              ...templateItem,
              completed: existingItem.completed || false,
              value: existingItem.value || '',
              note: existingItem.note || ''
            }
          } else {
            // New item from template
            return {
              ...templateItem,
              completed: false,
              value: '',
              note: ''
            }
          }
        })

        // Update instance with merged items
        updatePromises.push(
          updateDoc(doc(db, CHECKLIST_INSTANCES_COLLECTION, docSnap.id), {
            name: template.name || instance.name,
            items: mergedItems,
            updatedAt: Timestamp.now()
          })
        )
        updatedCount++
      })

      await Promise.all(updatePromises)
      return { updated: updatedCount, error: null }
    } catch (error) {
      return { updated: 0, error: error.message }
    }
  },

  /**
   * Delete a checklist instance
   * @param {string} instanceId - Instance ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteInstance(instanceId) {
    try {
      await deleteDoc(doc(db, CHECKLIST_INSTANCES_COLLECTION, instanceId))
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete multiple checklist instances
   * @param {array} instanceIds - Array of instance IDs
   * @returns {Promise<{deleted: number, error: string|null}>}
   */
  async deleteInstances(instanceIds) {
    try {
      const deletePromises = instanceIds.map(instanceId => 
        deleteDoc(doc(db, CHECKLIST_INSTANCES_COLLECTION, instanceId))
      )
      await Promise.all(deletePromises)
      return { deleted: instanceIds.length, error: null }
    } catch (error) {
      return { deleted: 0, error: error.message }
    }
  }
}


