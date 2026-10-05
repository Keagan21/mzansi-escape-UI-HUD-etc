// levels.js — Per-level player and hazard configuration.

import { createLevel1TaxiAssetLoader } from './level1TaxiHazards.js'
import { createLevel2ObstacleAssetLoader } from './level2ObstacleHazards.js'

/** @typedef {'runner' | 'car' | 'openworld'} PlayerKind */
/** @typedef {'taxi' | 'obstacle' | 'thug' | 'looter' | 'threat' | 'none'} HazardKind */
/** @typedef {'soweto' | 'industrial' | 'mall' | 'suburban'} BuildingTheme */

/**
 * @typedef {{
 *   cancel?: () => void
 *   dispose: () => void
 *   ensureLoaded?: () => void
 *   getTemplate?: () => import('three').Object3D | null
 *   getTemplates?: () => import('three').Object3D[]
 * }} HazardLoader
 */

/**
 * @typedef {{
 *   id: number
 *   label: string
 *   playerKind: PlayerKind
 *   hazardKind: HazardKind
 *   jumpEnabled: boolean
 *   rollEnabled: boolean
 *   potholesEnabled: boolean
 *   scoreLabel: string
 *   hazardPastLabel: string
 *   buildingTheme?: BuildingTheme
 *   hazardLoaderFactory?: (
 *     handlers: { onReady?: () => void, onError?: () => void }
 *   ) => HazardLoader
 *   moveSpeed?: number
 *   hazardSpeed?: number
 *   spawnMin?: number
 *   spawnMax?: number
 *   hitRx?: number
 *   hitRz?: number
 *   fogColor?: number
 *   fogNear?: number
 *   fogFar?: number
 *   fogDensity?: number
 *   backgroundColor?: number
 *   collectibleVariant?: 'coin' | 'coke-bottle'
 *   collectibleLabel?: string
 *   scoreKind?: 'points' | 'time'
 *   maxHp?: number
 * }} LevelConfig
 */

/** @type {LevelConfig} */
export const LEVEL_1 = {
  id: 1,
  label: 'Street run',
  playerKind: 'runner',
  hazardKind: 'taxi',
  jumpEnabled: true,
  rollEnabled: true,
  potholesEnabled: true,
  scoreLabel: 'Dodged',
  hazardPastLabel: 'Taxis dodged',
  buildingTheme: 'soweto',
  hazardLoaderFactory: createLevel1TaxiAssetLoader,
  moveSpeed: 22,
  hazardSpeed: 28,
  spawnMin: 0.8,
  spawnMax: 1.6,
  hitRx: 1.3,
  hitRz: 3.2,
  fogColor: 0x7a9ebc,
  fogNear: 18,
  fogFar: 620,
}

/** @type {LevelConfig} */
export const LEVEL_2 = {
  id: 2,
  label: 'City drive',
  playerKind: 'car',
  hazardKind: 'obstacle',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Avoided',
  hazardPastLabel: 'Cars avoided',
  buildingTheme: 'industrial',
  hazardLoaderFactory: () => createLevel2ObstacleAssetLoader(),
  moveSpeed: 22,
  hazardSpeed: 28,
  spawnMin: 0.8,
  spawnMax: 1.6,
  hitRx: 1.3,
  hitRz: 3.2,
  fogColor: 0x7a9ebc,
  fogNear: 18,
  fogFar: 620,
  collectibleVariant: 'coke-bottle',
  collectibleLabel: 'Coke',
}

/** @type {LevelConfig} */
export const LEVEL_3 = {
  id: 3,
  label: 'Joburg CBD',
  playerKind: 'openworld',
  hazardKind: 'thug',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Time',
  hazardPastLabel: 'Time',
  fogColor: 0xd9925c,
  fogNear: 8,
    fogFar: 800,
  maxHp: 100,
  collectibleLabel: 'Coins',
  scoreKind: 'time',
}

/** @type {LevelConfig} */
export const LEVEL_4 = {
  id: 4,
  label: 'Cape Town Day Zero',
  playerKind: 'openworld',
  hazardKind: 'none',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Time',
  hazardPastLabel: 'Time',
  fogColor: 0xc9a06a,
  fogNear: 8,
  fogFar: 700,
  fogDensity: 0.0028,
  backgroundColor: 0xe8c48a,
  collectibleLabel: 'Bottles',
  scoreKind: 'time',
}

/** @type {LevelConfig} */
export const LEVEL_5 = {
  id: 5,
  label: 'Cape Town: Lights Out',
  playerKind: 'openworld',
  hazardKind: 'looter',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Time',
  hazardPastLabel: 'Time',
  fogColor: 0x0a1020,
  fogNear: 4,
  fogFar: 200,
  fogDensity: 0.018,
  backgroundColor: 0x050a14,
  maxHp: 100,
  collectibleLabel: 'Batteries',
  scoreKind: 'time',
}

/** @type {LevelConfig} */
export const LEVEL_6 = {
  id: 6,
  label: 'Cape Flats: Stay Hidden',
  playerKind: 'openworld',
  hazardKind: 'threat',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Time',
  hazardPastLabel: 'Time',
  fogColor: 0x0c1018,
  fogNear: 4,
  fogFar: 180,
  fogDensity: 0.022,
  backgroundColor: 0x080c14,
  collectibleLabel: 'Tips',
  scoreKind: 'time',
}

/** @type {LevelConfig} */
export const LEVEL_7 = {
  id: 7,
  label: 'Level 7',
  playerKind: 'runner',
  hazardKind: 'none',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Coming soon',
  hazardPastLabel: 'Coming soon',
}

/** @type {LevelConfig} */
export const LEVEL_8 = {
  id: 8,
  label: 'Soweto Homecoming',
  playerKind: 'openworld',
  hazardKind: 'none',
  jumpEnabled: false,
  rollEnabled: false,
  potholesEnabled: false,
  scoreLabel: 'Time',
  hazardPastLabel: 'Time',
  fogColor: 0x6a7a88,
  fogNear: 8,
  fogFar: 420,
  fogDensity: 0.006,
  backgroundColor: 0x8aa0b4,
  collectibleLabel: 'Notes',
  scoreKind: 'time',
}

const LEVELS = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  LEVEL_4,
  LEVEL_5,
  LEVEL_6,
  LEVEL_7,
  LEVEL_8,
]

/** Total level slots shown in the main-menu picker. */
export const TOTAL_LEVEL_COUNT = 8

/** Levels that can be started from the menu while the rest are still in progress. */
export const PLAYABLE_LEVELS = new Set([1, 2, 3, 4, 5, 6, 8])

/** @param {number} levelNumber */
export function isLevelPlayable(levelNumber) {
  return PLAYABLE_LEVELS.has(levelNumber)
}

/** @param {number} levelNumber */
export function getLevelConfig(levelNumber) {
  return LEVELS[levelNumber - 1] ?? LEVEL_1
}

/** Timed levels store milliseconds; lower is better. */
export function levelUsesTimeScore(levelNumber) {
  return getLevelConfig(levelNumber).scoreKind === 'time'
}
