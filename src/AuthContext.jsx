// AuthContext.jsx — React auth state for Google + email sign-in.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getAuthErrorMessage,
  getUserLabel,
  signInWithEmail as emailSignIn,
  signInWithGoogle as googleSignIn,
  signOutUser,
  signUpWithEmail as emailSignUp,
  subscribeToAuth,
} from './game/auth.js'
import { flushAccountProgressSave } from './game/playerProgress.js'
import { hydrateAccountScores } from './game/scores.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [scoresReady, setScoresReady] = useState(false)

  useEffect(() => {
    const unsub = subscribeToAuth((nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
    return unsub
  }, [])

  // Every signed-in session: restore cloud bests into localStorage + account cache.
  useEffect(() => {
    if (!authReady) return undefined
    if (!user) {
      setScoresReady(true)
      return undefined
    }
    let cancelled = false
    setScoresReady(false)
    ;(async () => {
      try {
        await hydrateAccountScores(user.uid)
      } catch {
        // Cache/local still used by scoreboards and HUD.
      } finally {
        if (!cancelled) setScoresReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  const runAuth = useCallback(async (fn) => {
    setAuthBusy(true)
    setAuthError('')
    try {
      await fn()
      return true
    } catch (err) {
      setAuthError(getAuthErrorMessage(err))
      return false
    } finally {
      setAuthBusy(false)
    }
  }, [])

  const clearAuthError = useCallback(() => setAuthError(''), [])

  const value = useMemo(
    () => ({
      user,
      authReady,
      scoresReady,
      authBusy,
      authError,
      userLabel: getUserLabel(user),
      clearAuthError,
      signInWithGoogle: () => runAuth(() => googleSignIn()),
      signInWithEmail: (email, password) =>
        runAuth(() => emailSignIn(email, password)),
      signUpWithEmail: (email, password, displayName) =>
        runAuth(() => emailSignUp(email, password, displayName)),
      signOut: () =>
        runAuth(async () => {
          await flushAccountProgressSave()
          await signOutUser()
        }),
    }),
    [user, authReady, scoresReady, authBusy, authError, clearAuthError, runAuth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
