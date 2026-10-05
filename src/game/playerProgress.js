// playerProgress.js — Sync wallet, unlocks, and loadout to the signed-in account.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { CHARACTERS } from './characterAssets.js'
import { LEVEL2_PLAYER_CARS } from './level2CarAssets.js'
import {
  readProgressUpdatedAt,
  readStoredCharacterId,
  readStoredLevel2CarId,
  writeStoredCharacterId,
  writeStoredLevel2CarId,
} from './storageKeys.js'
import {
  FREE_CAR_IDS,
  FREE_CHARACTER_IDS,
  readUnlocks,
  readWallet,
  writeUnlocks,
  writeWallet,
} from './store.js'

const PLAYERS_COLLECTION = 'players'
const SAVE_DEBOUNCE_MS = 1600
const KNOWN_CHARACTER_IDS = new Set(CHARACTERS.map((c) => c.id))
const KNOWN_CAR_IDS = new Set(LEVEL2_PLAYER_CARS.map((c) => c.id))

/** @typedef {{
 *   wallet: number
 *   unlocks: { characters: string[], cars: string[] }
 *   selectedCharacterId: string
 *   selectedLevel2CarId: string
 *   clientUpdatedAt: number
 * }} PlayerProgress
 */

let saveTimer = 0

function uniqIds(list, known) {
  const out = []
  const seen = new Set()
  for (const id of Array.isArray(list) ? list : []) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function sanitizeUnlocks(unlocks) {
  return {
    characters: uniqIds(unlocks?.characters, KNOWN_CHARACTER_IDS),
    cars: uniqIds(unlocks?.cars, KNOWN_CAR_IDS),
  }
}

function sanitizeWallet(value) {
  const n = Math.floor(Number(value) || 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 1_000_000_000)
}

function sanitizeTimestamp(value) {
  const n = Math.floor(Number(value) || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function sanitizeCharacterId(id, unlocks) {
  if (
    typeof id === 'string' &&
    KNOWN_CHARACTER_IDS.has(id) &&
    (FREE_CHARACTER_IDS.includes(id) || unlocks.characters.includes(id))
  ) {
    return id
  }
  return CHARACTERS[0].id
}

function sanitizeCarId(id, unlocks) {
  if (
    typeof id === 'string' &&
    KNOWN_CAR_IDS.has(id) &&
    (FREE_CAR_IDS.includes(id) || unlocks.cars.includes(id))
  ) {
    return id
  }
  return LEVEL2_PLAYER_CARS[0].id
}

/** Snapshot of this browser's wallet / unlocks / loadout. */
export function readLocalProgress() {
  const unlocks = sanitizeUnlocks(readUnlocks())
  return {
    wallet: sanitizeWallet(readWallet()),
    unlocks,
    selectedCharacterId: sanitizeCharacterId(readStoredCharacterId(), unlocks),
    selectedLevel2CarId: sanitizeCarId(readStoredLevel2CarId(), unlocks),
    clientUpdatedAt: readProgressUpdatedAt(),
  }
}

/** @param {PlayerProgress} progress */
export function applyProgressLocally(progress) {
  const unlocks = sanitizeUnlocks(progress.unlocks)
  const wallet = sanitizeWallet(progress.wallet)
  const selectedCharacterId = sanitizeCharacterId(
    progress.selectedCharacterId,
    unlocks
  )
  const selectedLevel2CarId = sanitizeCarId(
    progress.selectedLevel2CarId,
    unlocks
  )
  writeUnlocks(unlocks)
  writeWallet(wallet)
  writeStoredCharacterId(selectedCharacterId)
  writeStoredLevel2CarId(selectedLevel2CarId)
  return {
    wallet,
    unlocks,
    selectedCharacterId,
    selectedLevel2CarId,
    clientUpdatedAt: readProgressUpdatedAt(),
  }
}

/**
 * Keep the higher wallet, every unlock, and the newer loadout pick.
 * @param {PlayerProgress} local
 * @param {PlayerProgress | null} cloud
 */
export function mergeProgress(local, cloud) {
  if (!cloud) return local
  const unlocks = sanitizeUnlocks({
    characters: [...local.unlocks.characters, ...cloud.unlocks.characters],
    cars: [...local.unlocks.cars, ...cloud.unlocks.cars],
  })
  const useCloudLoadout = (cloud.clientUpdatedAt || 0) > (local.clientUpdatedAt || 0)
  const source = useCloudLoadout ? cloud : local
  return {
    wallet: Math.max(sanitizeWallet(local.wallet), sanitizeWallet(cloud.wallet)),
    unlocks,
    selectedCharacterId: sanitizeCharacterId(source.selectedCharacterId, unlocks),
    selectedLevel2CarId: sanitizeCarId(source.selectedLevel2CarId, unlocks),
    clientUpdatedAt: Math.max(local.clientUpdatedAt || 0, cloud.clientUpdatedAt || 0),
  }
}

function progressFromCloudData(data) {
  if (!data || typeof data !== 'object') return null
  const unlocks = sanitizeUnlocks(data.unlocks)
  return {
    wallet: sanitizeWallet(data.wallet),
    unlocks,
    selectedCharacterId: sanitizeCharacterId(data.selectedCharacterId, unlocks),
    selectedLevel2CarId: sanitizeCarId(data.selectedLevel2CarId, unlocks),
    clientUpdatedAt: sanitizeTimestamp(data.clientUpdatedAt),
  }
}

function playerDoc(uid) {
  return doc(db, PLAYERS_COLLECTION, uid)
}

function cloudPayload(progress) {
  return {
    wallet: progress.wallet,
    unlocks: {
      characters: [...progress.unlocks.characters],
      cars: [...progress.unlocks.cars],
    },
    selectedCharacterId: progress.selectedCharacterId,
    selectedLevel2CarId: progress.selectedLevel2CarId,
    clientUpdatedAt: progress.clientUpdatedAt || Date.now(),
    updatedAt: serverTimestamp(),
  }
}

/** @param {string} uid */
export async function fetchCloudProgress(uid) {
  if (!uid) return null
  const snap = await getDoc(playerDoc(uid))
  if (!snap.exists()) return null
  return progressFromCloudData(snap.data())
}

/** @param {string} uid @param {PlayerProgress} progress */
export async function saveCloudProgress(uid, progress) {
  if (!uid || !progress) return
  await setDoc(playerDoc(uid), cloudPayload(progress), { merge: true })
}

/**
 * Merge this browser with the signed-in account, then write both ways.
 * @param {string} uid
 */
export async function syncAccountProgress(uid) {
  if (!uid) return readLocalProgress()
  const local = readLocalProgress()
  const cloud = await fetchCloudProgress(uid)
  const merged = mergeProgress(local, cloud)
  const applied = applyProgressLocally(merged)
  await saveCloudProgress(uid, applied)
  return applied
}

function clearSaveTimer() {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
    saveTimer = 0
  }
}

/** Debounced cloud write from the latest local snapshot. */
export function queueAccountProgressSave() {
  if (!auth.currentUser) return
  clearSaveTimer()
  saveTimer = window.setTimeout(() => {
    saveTimer = 0
    void flushAccountProgressSave()
  }, SAVE_DEBOUNCE_MS)
}

/** Immediate cloud write. Safe to call while signed out. */
export function flushAccountProgressSave() {
  clearSaveTimer()
  const user = auth.currentUser
  if (!user) return Promise.resolve()
  return saveCloudProgress(user.uid, readLocalProgress()).catch(() => {
    // Rules or network can fail; localStorage still holds the latest values.
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAccountProgressSave()
  })
  window.addEventListener('pagehide', () => {
    void flushAccountProgressSave()
  })
}
