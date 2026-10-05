// storageKeys.js — localStorage keys and readers for character, music, high score.

import { CHARACTERS } from './characterAssets.js'
import { LEVEL2_PLAYER_CARS } from './level2CarAssets.js'

export const STORAGE_KEY_CHARACTER = 'mzansi-escape-character'
export const STORAGE_KEY_LEVEL2_CAR = 'mzansi-escape-level2-car'
export const STORAGE_KEY_HIGHSCORE = 'mzansi-escape-highscore'
export const STORAGE_KEY_MUSIC_MUTED = 'mzansi-escape-music-muted'
export const STORAGE_KEY_AUTO_FORWARD = 'mzansi-escape-auto-forward'
export const STORAGE_KEY_WALLET = 'mzansi-escape-wallet'
export const STORAGE_KEY_UNLOCKS = 'mzansi-escape-unlocks'
export const STORAGE_KEY_PROGRESS_UPDATED_AT = 'mzansi-escape-progress-updated-at'

const FREE_CHARACTER_IDS = ['test-skater-m', 'test-skater-f']
const FREE_CAR_IDS = ['polo']

function readPurchasedIds(kind) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const list = kind === 'characters' ? parsed?.characters : parsed?.cars
    return Array.isArray(list)
      ? list.filter((id) => typeof id === 'string' && id.length > 0)
      : []
  } catch {
    return []
  }
}

function isStoredCharacterUnlocked(id) {
  return FREE_CHARACTER_IDS.includes(id) || readPurchasedIds('characters').includes(id)
}

function isStoredCarUnlocked(id) {
  return FREE_CAR_IDS.includes(id) || readPurchasedIds('cars').includes(id)
}

export function readProgressUpdatedAt() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY_PROGRESS_UPDATED_AT))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function touchProgressUpdatedAt(at = Date.now()) {
  const n = Number(at)
  const value = Number.isFinite(n) && n > 0 ? Math.floor(n) : Date.now()
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS_UPDATED_AT, String(value))
  } catch {
    // ignore
  }
  return value
}

export function writeStoredCharacterId(id) {
  if (!id || !CHARACTERS.some((c) => c.id === id)) return false
  try {
    localStorage.setItem(STORAGE_KEY_CHARACTER, id)
    touchProgressUpdatedAt()
    return true
  } catch {
    return false
  }
}

export function writeStoredLevel2CarId(id) {
  if (!id || !LEVEL2_PLAYER_CARS.some((c) => c.id === id)) return false
  try {
    localStorage.setItem(STORAGE_KEY_LEVEL2_CAR, id)
    touchProgressUpdatedAt()
    return true
  } catch {
    return false
  }
}

export function readStoredMusicMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY_MUSIC_MUTED) === '1'
  } catch {
    return false
  }
}

export function readStoredAutoForward() {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTO_FORWARD) === '1'
  } catch {
    return false
  }
}

export const levelHighScoreKey = (levelId) => `mzansi_highscore_L${levelId}`

export function readStoredCharacterId() {
  try {
    const v = localStorage.getItem(STORAGE_KEY_CHARACTER)
    if (
      v &&
      CHARACTERS.some((c) => c.id === v) &&
      isStoredCharacterUnlocked(v)
    ) {
      return v
    }
  } catch {
    // ignore
  }
  return CHARACTERS[0].id
}

export function readStoredLevel2CarId() {
  try {
    const v = localStorage.getItem(STORAGE_KEY_LEVEL2_CAR)
    if (
      v &&
      LEVEL2_PLAYER_CARS.some((c) => c.id === v) &&
      isStoredCarUnlocked(v)
    ) {
      return v
    }
  } catch {
    // ignore
  }
  return LEVEL2_PLAYER_CARS[0].id
}

export function readStoredHighScore() {
  return readStoredLevelHighScore(1)
}

export function readStoredLevelHighScore(levelId) {
  try {
    const v = localStorage.getItem(levelHighScoreKey(levelId))
    if (v == null) {
      if (levelId === 1) {
        const legacy = localStorage.getItem(STORAGE_KEY_HIGHSCORE)
        if (legacy != null) {
          const legacyScore = Number.parseInt(legacy, 10)
          if (Number.isFinite(legacyScore) && legacyScore >= 0) {
            return legacyScore
          }
        }
      }
      return 0
    }
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}
