// scores.js — Firestore personal bests + global leaderboards.

import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { getUserLabel } from './auth.js'
import { readLocalProgress } from './playerProgress.js'
import { levelHighScoreKey } from './storageKeys.js'
import {
  isLevelPlayable,
  levelUsesTimeScore,
  TOTAL_LEVEL_COUNT,
} from './levels.js'

const accountScoresCacheKey = (uid) => `mzansi_account_scores_${uid}`

/** @type {{ uid: string | null, rows: Array<{ levelId: number, bestScore: number }>, at: number }} */
let memoryScores = { uid: null, rows: [], at: 0 }

/** @typedef {'diamond' | 'gold' | 'silver' | 'bronze'} ScoreTier */

/** Rank 1 diamond, 2–4 gold, 5–10 silver, 11+ bronze. */
export function rankTier(rank) {
  const n = Number(rank)
  if (n === 1) return 'diamond'
  if (n >= 2 && n <= 4) return 'gold'
  if (n >= 5 && n <= 10) return 'silver'
  return 'bronze'
}

/** @param {ScoreTier} tier */
export function rankTierLabel(tier) {
  if (tier === 'diamond') return 'Diamond'
  if (tier === 'gold') return 'Gold'
  if (tier === 'silver') return 'Silver'
  return 'Bronze'
}

/**
 * Format a stored best: points as a number, Level 3 times as m:ss.t
 * @param {number} levelId
 * @param {number} value
 */
export function formatScoreValue(levelId, value) {
  const n = sanitizeStoredBest(levelId, value)
  if (levelUsesTimeScore(levelId)) return formatRunTime(n)
  return Number.isFinite(n) && n > 0 ? String(n) : '0'
}

/** Timed levels store ms; leftover thug-count saves are ignored. */
export function sanitizeStoredBest(levelId, value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  if (levelUsesTimeScore(levelId) && n > 0 && n < 1000) return 0
  return n
}

/**
 * @param {number} ms
 */
export function formatRunTime(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const totalSec = n / 1000
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  const tenth = Math.floor((n % 1000) / 100)
  if (m <= 0) return `${s}.${tenth}s`
  return `${m}:${String(s).padStart(2, '0')}.${tenth}`
}

function mergeTimeBest(localMs, cloudMs) {
  const times = [localMs, cloudMs].filter((t) => Number.isFinite(t) && t > 0)
  return times.length ? Math.min(...times) : 0
}

function playerProfileRef(uid) {
  return doc(db, 'players', uid)
}

function newProfilePayload(levelBests) {
  const progress = readLocalProgress()
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
    levelBests,
  }
}

function pickBest(levelId, a, b) {
  return levelUsesTimeScore(levelId) ? mergeTimeBest(a, b) : Math.max(a || 0, b || 0)
}

function bestsFromMap(map) {
  if (!map || typeof map !== 'object') return []
  const rows = []
  for (const [id, value] of Object.entries(map)) {
    const levelId = Number(id)
    if (!Number.isFinite(levelId) || levelId < 1) continue
    const bestScore = sanitizeStoredBest(levelId, value?.bestScore)
    if (bestScore <= 0) continue
    if (typeof value?.displayName !== 'string' || value.displayName.length === 0) continue
    rows.push({
      levelId,
      bestScore,
      displayName: typeof value?.displayName === 'string' ? value.displayName : '',
    })
  }
  return rows
}

/** Personal bests stored on the account profile. This write is allowed today. */
export async function fetchProfileBests(uid) {
  if (!uid) return []
  const snap = await getDocFromServer(playerProfileRef(uid))
  if (!snap.exists()) return []
  return bestsFromMap(snap.data().levelBests)
}

/**
 * Replace the account's per-level bests. Other profile fields stay put.
 * @param {string} uid
 * @param {Array<{ levelId: number, bestScore: number }>} rows
 * @param {string} displayName
 */
async function writeProfileBests(uid, rows, displayName) {
  const ref = playerProfileRef(uid)
  const levelBests = {}
  for (const row of rows) {
    const levelId = Number(row.levelId)
    const bestScore = sanitizeStoredBest(levelId, row.bestScore)
    if (levelId < 1 || bestScore <= 0) continue
    levelBests[String(levelId)] = {
      bestScore,
      scoreKind: levelUsesTimeScore(levelId) ? 'time' : 'points',
      displayName: displayName || 'Player',
    }
  }
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) {
      tx.set(ref, newProfilePayload(levelBests))
      return
    }
    // update replaces the map. set+merge would keep old level keys.
    tx.update(ref, { levelBests })
  })
}

/**
 * Keep the better of the stored profile best and this run.
 * @returns {Promise<number>} best now stored, or 0 if the profile is not created yet
 */
async function upsertProfileBest(uid, level, incoming, displayName) {
  const ref = playerProfileRef(uid)
  let stored = 0
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const map = snap.exists() ? { ...(snap.data().levelBests || {}) } : {}
    const prev = sanitizeStoredBest(level, map[String(level)]?.bestScore)
    const next = pickBest(level, prev, sanitizeStoredBest(level, incoming))
    if (next <= 0) return
    map[String(level)] = {
      bestScore: next,
      scoreKind: levelUsesTimeScore(level) ? 'time' : 'points',
      displayName: displayName || 'Player',
    }
    if (!snap.exists()) tx.set(ref, newProfilePayload(map))
    else tx.update(ref, { levelBests: map })
    stored = next
  })
  return stored
}

/**
 * Save a personal best if it beats the cloud record.
 * Timed levels store milliseconds and lower is better.
 * The account profile is the record that follows the player between devices.
 * The public leaderboard is updated as well when rules allow that write.
 * No-op when signed out.
 *
 * @param {number} levelId
 * @param {number} score
 * @param {{ lowerIsBetter?: boolean }} [options]
 */
export async function submitBestScore(levelId, score, options = {}) {
  const user = auth.currentUser
  if (!user) return { updated: false }
  const level = Number(levelId)
  const nextScore = Number(score)
  if (!Number.isFinite(level) || level < 1) return { updated: false }
  if (!Number.isFinite(nextScore) || nextScore < 0) return { updated: false }

  const lowerIsBetter =
    options.lowerIsBetter === true || levelUsesTimeScore(level)
  const scoreKind = lowerIsBetter ? 'time' : 'points'

  const uid = user.uid
  const displayName = getUserLabel(user) || 'Player'
  const personalRef = doc(db, 'scores', uid, 'levels', String(level))
  const boardRef = doc(db, 'leaderboards', String(level), 'entries', uid)

  let profileBest = 0
  try {
    profileBest = await upsertProfileBest(uid, level, nextScore, displayName)
  } catch {
    profileBest = 0
  }

  let updated = false
  let savedBest = 0
  let boardError = null
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(personalRef)
      const boardSnap = await tx.get(boardRef)
      const prevRaw = snap.exists() ? Number(snap.data().bestScore) || 0 : 0
      const prevKind = snap.exists() ? snap.data().scoreKind : undefined
      const prev = lowerIsBetter
        ? prevKind === 'time' || prevRaw >= 1000
          ? prevRaw
          : 0
        : prevRaw
      const incoming = sanitizeStoredBest(level, nextScore)
      const best = lowerIsBetter
        ? mergeTimeBest(incoming, prev)
        : Math.max(incoming, prev)
      if (best <= 0) return

      const boardRaw = boardSnap.exists()
        ? Number(boardSnap.data().bestScore) || 0
        : 0
      const boardBest = sanitizeStoredBest(level, boardRaw)
      const personalStale =
        !snap.exists() ||
        (lowerIsBetter ? prev <= 0 || best < prev : best > prev)
      const boardStale =
        !boardSnap.exists() ||
        boardBest <= 0 ||
        boardSnap.data()?.uid !== uid ||
        (lowerIsBetter ? best < boardBest : best > boardBest)
      if (!personalStale && !boardStale) {
        savedBest = best
        return
      }

      const payload = {
        bestScore: best,
        scoreKind,
        levelId: level,
        displayName,
        updatedAt: serverTimestamp(),
      }
      tx.set(personalRef, payload, { merge: true })
      tx.set(
        boardRef,
        {
          uid,
          ...payload,
        },
        { merge: true }
      )
      savedBest = best
      updated = true
    })
  } catch (err) {
    boardError = err
  }

  const bestNow = pickBest(level, profileBest, savedBest)
  if (bestNow > 0) {
    try {
      localStorage.setItem(levelHighScoreKey(level), String(bestNow))
    } catch {
      // ignore
    }
    bumpAccountCacheScore(uid, level, bestNow)
  }

  if (bestNow <= 0) {
    return {
      updated: false,
      error: boardError?.code || 'unknown',
      message: boardError?.message || 'Could not save this score.',
    }
  }
  return { updated: updated || profileBest > 0 }
}

/**
 * @param {string} uid
 * @returns {Promise<Array<{ levelId: number, bestScore: number, displayName?: string }>>}
 */
export async function fetchPersonalScores(uid) {
  if (!uid) return []
  const snap = await getDocs(collection(db, 'scores', uid, 'levels'))
  const rows = snap.docs.map((d) => {
    const data = d.data()
    const levelId = Number(data.levelId) || Number(d.id) || 0
    return {
      levelId,
      bestScore: sanitizeStoredBest(levelId, data.bestScore),
      displayName: data.displayName || '',
    }
  })
  rows.sort((a, b) => a.levelId - b.levelId)
  return rows
}

function readLocalBest(levelId) {
  try {
    const raw = localStorage.getItem(levelHighScoreKey(levelId))
    return sanitizeStoredBest(
      levelId,
      raw != null ? Number.parseInt(raw, 10) || 0 : 0
    )
  } catch {
    return 0
  }
}

/** @param {string} uid */
function readAccountScoreCache(uid) {
  if (!uid) return []
  try {
    const raw = localStorage.getItem(accountScoresCacheKey(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const levels = parsed?.levels
    if (!levels || typeof levels !== 'object') return []
    return Object.entries(levels)
      .map(([id, score]) => {
        const levelId = Number(id)
        return {
          levelId,
          bestScore: sanitizeStoredBest(levelId, score),
        }
      })
      .filter((row) => row.levelId >= 1)
      .sort((a, b) => a.levelId - b.levelId)
  } catch {
    return []
  }
}

/**
 * @param {string} uid
 * @param {Array<{ levelId: number, bestScore: number }>} rows
 */
function writeAccountScoreCache(uid, rows) {
  if (!uid) return
  const levels = {}
  for (const row of rows) {
    const levelId = Number(row.levelId)
    const best = sanitizeStoredBest(levelId, row.bestScore)
    if (levelId >= 1 && best > 0) levels[levelId] = best
  }
  try {
    localStorage.setItem(
      accountScoresCacheKey(uid),
      JSON.stringify({ updatedAt: Date.now(), levels })
    )
  } catch {
    // ignore
  }
  memoryScores = { uid, rows: buildMergedPersonalRows(rows), at: Date.now() }
}

/**
 * @param {string} uid
 * @param {number} levelId
 * @param {number} bestScore
 */
function bumpAccountCacheScore(uid, levelId, bestScore) {
  const byLevel = new Map(
    readAccountScoreCache(uid).map((row) => [row.levelId, row.bestScore])
  )
  const prev = byLevel.get(levelId) ?? 0
  const next = levelUsesTimeScore(levelId)
    ? mergeTimeBest(prev, bestScore)
    : Math.max(prev, bestScore)
  byLevel.set(levelId, next)
  writeAccountScoreCache(
    uid,
    [...byLevel.entries()].map(([id, score]) => ({
      levelId: id,
      bestScore: score,
    }))
  )
}

/**
 * Merge cloud (or cached) bests with device localStorage for every level slot.
 * @param {Array<{ levelId: number, bestScore: number }>} cloudRows
 */
export function buildMergedPersonalRows(cloudRows = []) {
  const byLevel = new Map(
    (cloudRows || []).map((row) => [
      row.levelId,
      sanitizeStoredBest(row.levelId, row.bestScore),
    ])
  )
  return Array.from({ length: TOTAL_LEVEL_COUNT }, (_, i) => {
    const levelId = i + 1
    const local = readLocalBest(levelId)
    const cloud = sanitizeStoredBest(levelId, byLevel.get(levelId) ?? 0)
    const best = levelUsesTimeScore(levelId)
      ? mergeTimeBest(local, cloud)
      : Math.max(local, cloud)
    return { levelId, bestScore: best }
  })
}

/** Last hydrated personal rows for the signed-in account (sync, may be stale). */
export function getCachedPersonalRows(uid) {
  if (uid && memoryScores.uid === uid && memoryScores.rows.length) {
    return memoryScores.rows
  }
  if (uid) {
    const cached = readAccountScoreCache(uid)
    if (cached.length) return buildMergedPersonalRows(cached)
  }
  return buildMergedPersonalRows([])
}

/**
 * Sort and assign competition rank + medal tier.
 * @param {Array<{ uid: string, displayName: string, bestScore: number }>} rows
 * @param {number} levelId
 * @returns {Array<{ uid: string, displayName: string, bestScore: number, rank: number, tier: ScoreTier }>}
 */
export function rankLeaderboardRows(rows, levelId) {
  const timed = levelUsesTimeScore(levelId)
  const filtered = rows.filter(
    (row) => row && row.bestScore > 0 && typeof row.uid === 'string'
  )
  filtered.sort((a, b) =>
    timed ? a.bestScore - b.bestScore : b.bestScore - a.bestScore
  )
  let rank = 0
  let prev = null
  return filtered.map((row, index) => {
    if (prev === null || row.bestScore !== prev) rank = index + 1
    prev = row.bestScore
    return { ...row, rank, tier: rankTier(rank) }
  })
}

/**
 * If the signed-in player has a best that is not on the public board yet,
 * splice them in so Global matches My Scores.
 */
export function mergePlayerIntoLeaderboard(rows, levelId, player) {
  if (!player?.uid || !(player.bestScore > 0)) {
    return rankLeaderboardRows(rows, levelId)
  }
  const existing = rows.find((row) => row.uid === player.uid)
  const best = levelUsesTimeScore(levelId)
    ? mergeTimeBest(existing?.bestScore ?? 0, player.bestScore)
    : Math.max(existing?.bestScore ?? 0, player.bestScore)
  const next = rows.filter((row) => row.uid !== player.uid)
  next.push({
    uid: player.uid,
    displayName: player.displayName || existing?.displayName || 'Player',
    bestScore: best,
  })
  return rankLeaderboardRows(next, levelId)
}

/**
 * Pull cloud bests into localStorage so HUD matches the account,
 * and copy those bests onto the public leaderboard.
 * @param {string} uid
 */
export async function syncPersonalScoresToLocal(uid) {
  const result = await hydrateAccountScores(uid)
  return result.cloudRows
}

/**
 * Full signed-in hydrate: cloud ↔ local ↔ account cache ↔ leaderboard publish.
 * Safe to call on every page load; falls back to cache/local if Firestore fails.
 *
 * @param {string} uid
 * @returns {Promise<{
 *   rows: Array<{ levelId: number, bestScore: number }>
 *   cloudRows: Array<{ levelId: number, bestScore: number, displayName?: string }>
 *   error: string | null
 * }>}
 */
export async function hydrateAccountScores(uid) {
  if (!uid) {
    return { rows: buildMergedPersonalRows([]), cloudRows: [], error: null }
  }

  const cachedRows = readAccountScoreCache(uid)
  let cloudRows = []
  let profileRows = []
  let error = null

  try {
    cloudRows = await fetchPersonalScores(uid)
  } catch (err) {
    error =
      err?.message ||
      'Could not load cloud scores. Showing saved scores from this device.'
    cloudRows = cachedRows
  }

  try {
    profileRows = await fetchProfileBests(uid)
  } catch (err) {
    if (!cloudRows.length) {
      error =
        err?.message ||
        'Could not load cloud scores. Showing saved scores from this device.'
    }
  }

  const mergedSources = [...cachedRows, ...cloudRows, ...profileRows]
  const byCloud = new Map()
  for (const row of mergedSources) {
    const levelId = Number(row.levelId)
    if (!levelId) continue
    const score = sanitizeStoredBest(levelId, row.bestScore)
    const prev = byCloud.get(levelId) ?? 0
    byCloud.set(
      levelId,
      levelUsesTimeScore(levelId) ? mergeTimeBest(prev, score) : Math.max(prev, score)
    )
  }

  const publishes = []
  for (let level = 1; level <= TOTAL_LEVEL_COUNT; level++) {
    const key = levelHighScoreKey(level)
    const local = readLocalBest(level)
    const cloud = sanitizeStoredBest(level, byCloud.get(level) ?? 0)
    const best = levelUsesTimeScore(level)
      ? mergeTimeBest(local, cloud)
      : Math.max(local, cloud)
    try {
      localStorage.setItem(key, String(best))
    } catch {
      // ignore
    }
    byCloud.set(level, best)
    if (best > 0 && isLevelPlayable(level)) {
      publishes.push(submitBestScore(level, best))
    }
  }

  try {
    await writeProfileBests(
      uid,
      [...byCloud.entries()].map(([levelId, bestScore]) => ({ levelId, bestScore })),
      getUserLabel(auth.currentUser) || 'Player'
    )
  } catch (err) {
    if (!error) {
      error = err?.message || 'Could not save scores to your account.'
    }
  }

  await Promise.allSettled(publishes)

  const cloudForCache = [...byCloud.entries()].map(([levelId, bestScore]) => ({
    levelId,
    bestScore,
  }))
  writeAccountScoreCache(uid, cloudForCache)
  const rows = buildMergedPersonalRows(cloudForCache)

  return { rows, cloudRows, error }
}

/**
 * Every signed-in player's best for a level, ranked.
 * Timed levels: lower is better. Point levels: higher is better.
 *
 * @param {number} levelId
 * @returns {Promise<Array<{ uid: string, displayName: string, bestScore: number, rank: number, tier: ScoreTier }>>}
 */
export async function fetchGlobalLeaderboard(levelId) {
  const level = Number(levelId)
  if (!Number.isFinite(level) || level < 1) return []

  const snap = await getDocs(
    collection(db, 'leaderboards', String(level), 'entries')
  )
  const rows = snap.docs.map((d) => {
    const data = d.data()
    return {
      uid: data.uid || d.id,
      displayName: data.displayName || 'Player',
      bestScore: sanitizeStoredBest(level, data.bestScore),
    }
  })
  return rankLeaderboardRows(rows, level)
}

/**
 * Public boards for every playable level.
 * @returns {Promise<Array<{ levelId: number, rows: Array<{ uid: string, displayName: string, bestScore: number, rank: number, tier: ScoreTier }> }>>}
 */
export async function fetchAllGlobalLeaderboards() {
  const ids = Array.from({ length: TOTAL_LEVEL_COUNT }, (_, i) => i + 1).filter(
    (id) => isLevelPlayable(id)
  )
  return Promise.all(
    ids.map(async (levelId) => ({
      levelId,
      rows: await fetchGlobalLeaderboard(levelId),
    }))
  )
}
