// auth.js — Firebase Auth helpers (Google + email/password).

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase.js'

const googleProvider = new GoogleAuthProvider()

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export async function signUpWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const name = displayName?.trim()
  if (name) {
    await updateProfile(cred.user, { displayName: name })
  }
  return cred
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOutUser() {
  return signOut(auth)
}

export function getAuthErrorMessage(error) {
  const code = error?.code ?? ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'Pop-up blocked. Allow pop-ups for this site and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    default:
      return error?.message || 'Sign-in failed. Try again.'
  }
}

export function getUserLabel(user) {
  if (!user) return ''
  return user.displayName || user.email || 'Player'
}
