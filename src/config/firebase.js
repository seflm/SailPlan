import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyApJWhSahWIITIe_qpfcdsS852xc2jZ9Yc",
  authDomain: "sailplan-5018e.firebaseapp.com",
  projectId: "sailplan-5018e",
  storageBucket: "sailplan-5018e.firebasestorage.app",
  messagingSenderId: "638121403294",
  appId: "1:638121403294:web:7a4961951d112e9f646c8f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app

