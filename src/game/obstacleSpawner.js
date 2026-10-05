// obstacleSpawner.js — Spawn random oncoming Level 2 hazard cars ahead of the player.

import {
  HAZARD_CAR_MAX_CONSECUTIVE,
  HAZARD_CAR_SPAWN_WEIGHTS,
  LANES,
  TAXI_SPAWN_AHEAD_MAX,
  TAXI_SPAWN_AHEAD_MIN,
} from './gameConstants.js'
import { LEVEL2_HAZARD_CARS } from './level2ObstacleAssets.js'
import { cloneObstacleInstance } from './modelPrep.js'

/** Gap along the road between one car and the next so a lane-change can fit. */
const FOLLOW_GAP_MIN = 24
const FOLLOW_GAP_JITTER = 10
/** Cars this close in Z count as one wall; never fill the last open lane there. */
const WALL_Z = 14

let lastSpawnedCarId = null
let consecutiveCount = 0

/**
 * Weighted pick among cars that have actually loaded.
 * @param {Set<string>} availableIds
 */
function selectWeightedCarId(availableIds) {
  const weightedPool = []
  for (const car of LEVEL2_HAZARD_CARS) {
    if (!availableIds.has(car.id)) continue
    const weight = HAZARD_CAR_SPAWN_WEIGHTS[car.id] ?? 1
    for (let i = 0; i < weight; i++) weightedPool.push(car.id)
  }
  if (!weightedPool.length) return null

  let selectedId
  let attempts = 0
  do {
    selectedId = weightedPool[(Math.random() * weightedPool.length) | 0]
    attempts++
  } while (
    selectedId === lastSpawnedCarId &&
    consecutiveCount >= HAZARD_CAR_MAX_CONSECUTIVE &&
    attempts < 10
  )

  if (selectedId === lastSpawnedCarId) consecutiveCount++
  else {
    consecutiveCount = 1
    lastSpawnedCarId = selectedId
  }
  return selectedId
}

/**
 * @param {{ group: { position: { z: number } }, lane: number }[]} existing
 */
function furthestAheadZ(existing, playerZ) {
  let z = playerZ - TAXI_SPAWN_AHEAD_MIN
  for (const entry of existing) {
    if (entry.group.position.z < z) z = entry.group.position.z
  }
  return z
}

/**
 * @param {{ group: { position: { z: number } }, lane: number }[]} existing
 * @returns {Set<number>}
 */
function lanesNear(existing, z, window) {
  const lanes = new Set()
  for (const entry of existing) {
    if (Math.abs(entry.group.position.z - z) < window) lanes.add(entry.lane)
  }
  return lanes
}

/**
 * Pick a lane that leaves a slide-in gap: not the car we are following, and
 * never the last open lane in a tight pack.
 * @param {Set<number>} blocked
 * @param {number | null} followLane
 */
function pickOpenLane(blocked, followLane) {
  const all = [0, 1, 2]
  const open = all.filter((lane) => !blocked.has(lane))
  const staggered = open.filter((lane) => lane !== followLane)
  const pool =
    staggered.length > 0 ? staggered : open.length > 0 ? open : all
  return pool[(Math.random() * pool.length) | 0]
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} templates
 * @param {number} playerZ
 * @param {{ group: THREE.Object3D, lane: number, passed: boolean }[]} existing
 */
export function spawnObstacle(scene, templates, playerZ, existing) {
  if (!templates.length) return null

  let z =
    furthestAheadZ(existing, playerZ) -
    FOLLOW_GAP_MIN -
    Math.random() * FOLLOW_GAP_JITTER
  const minAhead = playerZ - TAXI_SPAWN_AHEAD_MIN
  if (z > minAhead) {
    z =
      playerZ -
      TAXI_SPAWN_AHEAD_MIN -
      Math.random() * (TAXI_SPAWN_AHEAD_MAX - TAXI_SPAWN_AHEAD_MIN)
  }

  let blocked = lanesNear(existing, z, WALL_Z)
  if (blocked.size >= 2) {
    z -= FOLLOW_GAP_MIN
    blocked = lanesNear(existing, z, WALL_Z)
  }

  let followLane = null
  let followZ = Infinity
  for (const entry of existing) {
    if (entry.group.position.z < followZ) {
      followZ = entry.group.position.z
      followLane = entry.lane
    }
  }

  const lane = pickOpenLane(blocked, followLane)
  const byId = new Map()
  for (const template of templates) {
    const id = template?.userData?.level2CarId
    if (id) byId.set(id, template)
  }
  const carId = selectWeightedCarId(new Set(byId.keys()))
  const template = (carId && byId.get(carId)) || templates.find(Boolean)
  if (!template) return null

  const inst = cloneObstacleInstance(template)
  inst.position.set(LANES[lane], 0, z)
  scene.add(inst)
  return { group: inst, lane, passed: false, carId: carId ?? template.userData?.level2CarId ?? null }
}
