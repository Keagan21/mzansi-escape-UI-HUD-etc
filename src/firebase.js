// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCYEeBo4_a9BmRWtRMElwqXpZfIlakcbbY',
  authDomain: 'mzantsiescape.firebaseapp.com',
  projectId: 'mzantsiescape',
  storageBucket: 'mzantsiescape.firebasestorage.app',
  messagingSenderId: '806518562225',
  appId: '1:806518562225:web:0a566b581e564ce1ee7190',
  measurementId: 'G-E47JE4R2JD',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

let analytics = null
try {
  analytics = getAnalytics(app)
} catch {
  // Analytics can fail in unsupported or blocked environments.
}

export { app, auth, db, analytics }
