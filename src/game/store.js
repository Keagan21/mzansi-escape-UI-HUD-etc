// store.js — Persistent coin wallet and paid character/car unlocks.

import { LEVEL2_PLAYER_CARS } from './level2CarAssets.js'
import {
  STORAGE_KEY_UNLOCKS,
  STORAGE_KEY_WALLET,
  touchProgressUpdatedAt,
} from './storageKeys.js'

export const UNLOCK_COST = 40

export const FREE_CHARACTER_IDS = ['test-skater-m', 'test-skater-f']
export const FREE_CAR_IDS = ['polo']
export const PAID_CHARACTER_IDS = [
  'test-criminal',
  'test-cyborg-f',
  'athletic-lady',
  'kid',
  'micheale',
  'mousy',
]
export const PAID_CAR_IDS = LEVEL2_PLAYER_CARS.filter((c) => c.price > 0).map(
  (c) => c.id
)

/** @typedef {'character' | 'car'} StoreKind */

function emptyUnlocks() {
  return { characters: [], cars: [] }
}

function sanitizeIdList(value) {
  if (!Array.isArray(value)) return []
  return value.filter((id) => typeof id === 'string' && id.length > 0)
}

export function readWallet() {
  try {
    const n = Number.parseInt(localStorage.getItem(STORAGE_KEY_WALLET) ?? '0', 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function writeWallet(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0))
  try {
    localStorage.setItem(STORAGE_KEY_WALLET, String(value))
    touchProgressUpdatedAt()
  } catch {
    // ignore
  }
  return value
}

export function creditWallet(amount) {
  const n = Math.floor(Number(amount) || 0)
  if (n <= 0) return readWallet()
  return writeWallet(readWallet() + n)
}

export function spendWallet(amount) {
  const cost = Math.floor(Number(amount) || 0)
  if (cost <= 0) return false
  const balance = readWallet()
  if (balance < cost) return false
  writeWallet(balance - cost)
  return true
}

export function readUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKS)
    if (!raw) return emptyUnlocks()
    const parsed = JSON.parse(raw)
    return {
      characters: sanitizeIdList(parsed?.characters),
      cars: sanitizeIdList(parsed?.cars),
    }
  } catch {
    return emptyUnlocks()
  }
}

export function writeUnlocks(unlocks) {
  const next = {
    characters: sanitizeIdList(unlocks?.characters),
    cars: sanitizeIdList(unlocks?.cars),
  }
  try {
    localStorage.setItem(STORAGE_KEY_UNLOCKS, JSON.stringify(next))
    touchProgressUpdatedAt()
  } catch {
    // ignore
  }
  return next
}

/**
 * @param {StoreKind} kind
 * @param {string} id
 */
export function isUnlocked(kind, id) {
  if (!id) return false
  if (kind === 'character') {
    if (FREE_CHARACTER_IDS.includes(id)) return true
    return readUnlocks().characters.includes(id)
  }
  if (kind === 'car') {
    if (FREE_CAR_IDS.includes(id)) return true
    return readUnlocks().cars.includes(id)
  }
  return false
}

function isPaidItem(kind, id) {
  if (kind === 'character') return PAID_CHARACTER_IDS.includes(id)
  if (kind === 'car') return PAID_CAR_IDS.includes(id)
  return false
}

/**
 * @param {StoreKind} kind
 * @param {string} id
 */
export function getItemPrice(kind, id) {
  if (kind === 'character') return UNLOCK_COST
  if (kind === 'car') {
    const car = LEVEL2_PLAYER_CARS.find((c) => c.id === id)
    return car?.price ?? UNLOCK_COST
  }
  return UNLOCK_COST
}

/**
 * @param {StoreKind} kind
 * @param {string} id
 * @returns {{ ok: boolean, reason?: 'owned' | 'invalid' | 'funds', balance: number, unlocks: { characters: string[], cars: string[] }, cost: number }}
 */
export function purchaseUnlock(kind, id) {
  const unlocks = readUnlocks()
  const balance = readWallet()
  const cost = getItemPrice(kind, id)
  if (!isPaidItem(kind, id)) {
    return { ok: false, reason: 'invalid', balance, unlocks, cost }
  }
  if (isUnlocked(kind, id)) {
    return { ok: false, reason: 'owned', balance, unlocks, cost }
  }
  if (balance < cost) {
    return { ok: false, reason: 'funds', balance, unlocks, cost }
  }
  if (!spendWallet(cost)) {
    return { ok: false, reason: 'funds', balance: readWallet(), unlocks, cost }
  }
  const key = kind === 'character' ? 'characters' : 'cars'
  const next = writeUnlocks({
    ...unlocks,
    [key]: [...unlocks[key], id],
  })
  return { ok: true, balance: readWallet(), unlocks: next, cost }
}
