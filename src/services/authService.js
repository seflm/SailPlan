import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth } from '../config/firebase'

export const authService = {
  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) {
        await updateProfile(userCredential.user, { displayName })
      }
      return { user: userCredential.user, error: null }
    } catch (error) {
      return { user: null, error: error.message }
    }
  },

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { user: userCredential.user, error: null }
    } catch (error) {
      return { user: null, error: error.message }
    }
  },

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const user = userCredential.user
      
      // Return user data including profile information
      return { 
        user: user, 
        userData: {
          email: user.email || '',
          displayName: user.displayName || '',
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || ''
        },
        error: null 
      }
    } catch (error) {
      // Cross-Origin-Opener-Policy warning doesn't affect functionality
      // If authentication succeeded despite the warning, get current user
      if (auth.currentUser && error.code === 'auth/popup-closed-by-user') {
        const user = auth.currentUser
        return { 
          user: user, 
          userData: {
            email: user.email || '',
            displayName: user.displayName || '',
            phoneNumber: user.phoneNumber || '',
            photoURL: user.photoURL || ''
          },
          error: null 
        }
      }
      return { user: null, userData: null, error: error.message }
    }
  },

  async signOut() {
    try {
      await signOut(auth)
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }
}

