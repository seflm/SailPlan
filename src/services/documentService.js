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
import { storage } from '../config/firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const DOCUMENTS_COLLECTION = 'tripDocuments'

export const documentService = {
  /**
   * Upload a document for a trip
   * @param {string} tripId - Trip ID
   * @param {File} file - File to upload
   * @param {object} metadata - Document metadata (name, description, category)
   * @returns {Promise<{id: string|null, error: string|null}>}
   */
  async uploadDocument(tripId, file, metadata = {}) {
    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `trips/${tripId}/documents/${Date.now()}_${file.name}`)
      const uploadResult = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(uploadResult.ref)

      // Create document record in Firestore
      const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
        tripId,
        name: metadata.name || file.name,
        description: metadata.description || '',
        category: metadata.category || 'other',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath: uploadResult.ref.fullPath,
        downloadURL,
        uploadedBy: metadata.uploadedBy || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      return { id: docRef.id, error: null }
    } catch (error) {
      return { id: null, error: error.message }
    }
  },

  /**
   * Get all documents for a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<{documents: array, error: string|null}>}
   */
  async getTripDocuments(tripId) {
    try {
      const q = query(
        collection(db, DOCUMENTS_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const documents = []
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() })
      })
      return { documents, error: null }
    } catch (error) {
      // If index error, try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        try {
          const q = query(
            collection(db, DOCUMENTS_COLLECTION),
            where('tripId', '==', tripId)
          )
          const querySnapshot = await getDocs(q)
          const documents = []
          querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() })
          })
          // Sort in memory
          documents.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate - aDate
          })
          return { documents, error: null }
        } catch (fallbackError) {
          return { documents: [], error: fallbackError.message }
        }
      }
      return { documents: [], error: error.message }
    }
  },

  /**
   * Get a document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getDocument(documentId) {
    try {
      const docRef = doc(db, DOCUMENTS_COLLECTION, documentId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
      }
      return { data: null, error: 'Dokument nenalezen' }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  /**
   * Update document metadata
   * @param {string} documentId - Document ID
   * @param {object} metadata - Updated metadata
   * @returns {Promise<{error: string|null}>}
   */
  async updateDocument(documentId, metadata) {
    try {
      const docRef = doc(db, DOCUMENTS_COLLECTION, documentId)
      await updateDoc(docRef, {
        ...metadata,
        updatedAt: Timestamp.now()
      })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Delete a document
   * @param {string} documentId - Document ID
   * @returns {Promise<{error: string|null}>}
   */
  async deleteDocument(documentId) {
    try {
      // Get document to find storage path
      const { data: document } = await this.getDocument(documentId)
      if (!document) {
        return { error: 'Dokument nenalezen' }
      }

      // Delete from Storage
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath)
        await deleteObject(storageRef)
      }

      // Delete from Firestore
      await deleteDoc(doc(db, DOCUMENTS_COLLECTION, documentId))

      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  },

  /**
   * Get download URL for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<{url: string|null, error: string|null}>}
   */
  async getDownloadURL(documentId) {
    try {
      const { data: document } = await this.getDocument(documentId)
      if (!document) {
        return { url: null, error: 'Dokument nenalezen' }
      }
      return { url: document.downloadURL, error: null }
    } catch (error) {
      return { url: null, error: error.message }
    }
  }
}



